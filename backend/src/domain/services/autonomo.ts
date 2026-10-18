import { VatRate } from '@domain/ports/repositories';
import {
  HARD_TO_JUSTIFY_MAX,
  HARD_TO_JUSTIFY_RATE,
  IRPF_ADVANCE,
  LOW_INCOME_REDUCTIONS,
  RETA_BRACKETS_2026,
  RETA_GENERAL_EXPENSES,
  type RetaBracket,
  RETA_RATE_2026,
} from './autonomo-data';
import { ManualData } from './autonomo-expenses';
import { BusinessMovement, splitVat } from './tax';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const euros = (cents: number): number => round2(cents / 100);
const quarterOf = (date: string): 1 | 2 | 3 | 4 =>
  (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1) as 1 | 2 | 3 | 4;

/** What the person adds by hand for one quarter (euros): things the movements cannot say. */
export interface QuarterExtras {
  /** Withholdings suffered in the quarter on invoices to companies (15 % / 7 %). */
  withheld: number;
  /** Contribution to the self-employed scheme paid in the quarter (deductible expense). */
  socialSecurity: number;
  /** VAT paid on expenses that cannot be deducted (meals, gifts, mixed-use car...). */
  vatNotDeductible: number;
}

export interface DraftInputs {
  /** Extras of the four quarters; only the ones up to the viewed quarter matter. */
  quarters: [QuarterExtras, QuarterExtras, QuarterExtras, QuarterExtras];
  /** Simplified direct estimation: 5 % of hard-to-justify expenses (up to 2,000 euros a year). */
  hardToJustify: boolean;
  /** Net income of last year, for the low-income reduction (null: unknown, none applied). */
  priorYearNet: number | null;
  /** Professional whose clients withheld at least 70 % of last year's income: no modelo 130. */
  exempt130: boolean;
  /** VAT to offset from earlier periods that is still pending (modelo 303, box 110). */
  vatToOffset: number;
  /** Income and expenses typed by hand: they replace the movements. */
  manual?: ManualData | null;
  /**
   * Totals of the modelo 130 already filed for the quarters before the viewed one (boxes 01, 02, 05 and
   * 06 of the last one), so the earlier quarters need not be typed again.
   */
  prior?: PriorTotals | null;
}

export interface PriorTotals {
  income: number;
  expenses: number;
  previousPayments: number;
  withheld: number;
}

export interface Box {
  /** Box number of the official form ("07", "46"...). */
  box: string;
  label: string;
  amount: number;
}

export interface Draft303 {
  /** To pay, to offset, zero or no activity. */
  result: 'pay' | 'offset' | 'zero' | 'noActivity';
  amountDue: number;
  accrued: Box[];
  deductible: Box[];
  settlement: Box[];
}

export interface Draft130 {
  /** Not required of whoever is a professional with 70 % of income withheld. */
  required: boolean;
  result: 'pay' | 'negative' | 'zero' | 'notRequired';
  amountDue: number;
  boxes: Box[];
}

export interface RetaEstimate {
  /** Monthly net income expected from what has happened so far this year, after the 7 % deduction. */
  monthlyNet: number;
  bracket: string;
  baseMin: number;
  baseMax: number;
  feeMin: number;
  feeMax: number;
  rate: number;
}

export interface Deadline {
  model: string;
  label: string;
  /** ISO date of the last day (moved to the next working day when it falls on a weekend). */
  date: string;
}

export interface DraftResult {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  vat: Draft303;
  irpf: Draft130;
  reta: RetaEstimate;
  deadlines: Deadline[];
}

interface Quarter {
  income: Record<VatRate, { base: number; vat: number }>;
  /** Base of the expenses whose VAT can be deducted. */
  expenseBase: number;
  /** VAT of the expenses that can be deducted. */
  expenseVat: number;
  /** What the expenses count for the income tax (base plus the VAT that cannot be deducted, by share). */
  expenseIrpf: number;
}

const emptyRates = (): Quarter['income'] => ({
  0: { base: 0, vat: 0 },
  4: { base: 0, vat: 0 },
  10: { base: 0, vat: 0 },
  21: { base: 0, vat: 0 },
});

function bucket(year: number, movements: BusinessMovement[]): Quarter[] {
  const quarters: Quarter[] = [0, 1, 2, 3].map(() => ({
    income: emptyRates(),
    expenseBase: 0,
    expenseVat: 0,
    expenseIrpf: 0,
  }));
  for (const m of movements) {
    if (!m.date.startsWith(`${year}-`)) continue;
    const q = quarters[quarterOf(m.date) - 1];
    const { baseCents, vatCents } = splitVat(m.amountCents, m.vatRate);
    if (m.type === 'INCOME') {
      q.income[m.vatRate].base += baseCents;
      q.income[m.vatRate].vat += vatCents;
    } else {
      const vatShare = m.vatShare ?? 1;
      const deductibleVat = Math.round(vatCents * vatShare);
      q.expenseBase += Math.round(baseCents * vatShare);
      q.expenseVat += deductibleVat;
      // The VAT that cannot be deducted is part of the expense for the share that does count.
      const irpf = m.irpfShare ?? 1;
      q.expenseIrpf += Math.round(baseCents * irpf + vatCents * Math.max(0, irpf - vatShare));
    }
  }
  return quarters;
}

/** Modelo 303 of a quarter: boxes of the 2026 design of the official form. */
function draft303(q: Quarter, extras: QuarterExtras, offsetPending: number): Draft303 {
  const rate = (r: 4 | 10 | 21, base: string, rateBox: string, fee: string): Box[] => [
    { box: base, label: `Base imponible al ${r} %`, amount: euros(q.income[r].base) },
    { box: rateBox, label: `Tipo ${r} %`, amount: r },
    { box: fee, label: `Cuota al ${r} %`, amount: euros(q.income[r].vat) },
  ];
  const accrued: Box[] = [
    { box: '150', label: 'Base de operaciones a tipo 0 %', amount: euros(q.income[0].base) },
    ...rate(4, '01', '02', '03'),
    ...rate(10, '04', '05', '06'),
    ...rate(21, '07', '08', '09'),
  ];
  const totalAccrued = [4, 10, 21].reduce((s, r) => s + q.income[r as VatRate].vat, 0);
  accrued.push({ box: '27', label: 'Total cuota devengada', amount: euros(totalAccrued) });

  const notDeductible = Math.min(q.expenseVat, Math.round(extras.vatNotDeductible * 100));
  const deductibleVat = q.expenseVat - notDeductible;
  // The base follows the share of VAT that can be deducted.
  const deductibleBase =
    q.expenseVat > 0 ? q.expenseBase * (deductibleVat / q.expenseVat) : q.expenseBase;
  const deductible: Box[] = [
    {
      box: '28',
      label: 'Base de cuotas soportadas en operaciones interiores corrientes',
      amount: euros(deductibleBase),
    },
    {
      box: '29',
      label: 'Cuotas soportadas en operaciones interiores corrientes',
      amount: euros(deductibleVat),
    },
    { box: '45', label: 'Total a deducir', amount: euros(deductibleVat) },
  ];

  const result46 = euros(totalAccrued - deductibleVat);
  const pending = round2(Math.max(0, offsetPending));
  const applied = round2(Math.min(pending, Math.max(0, result46)));
  const settlement: Box[] = [
    { box: '46', label: 'Resultado régimen general (27 − 45)', amount: result46 },
    { box: '64', label: 'Suma de resultados', amount: result46 },
    { box: '66', label: 'Atribuible a la Administración del Estado (100 %)', amount: result46 },
    { box: '110', label: 'Cuotas a compensar pendientes de periodos anteriores', amount: pending },
    { box: '78', label: 'Cuotas a compensar aplicadas en este periodo', amount: applied },
    {
      box: '87',
      label: 'Cuotas a compensar pendientes para periodos posteriores',
      amount: round2(pending - applied),
    },
    { box: '69', label: 'Resultado de la autoliquidación', amount: round2(result46 - applied) },
    { box: '71', label: 'Resultado de la liquidación', amount: round2(result46 - applied) },
  ];
  const amountDue = round2(result46 - applied);
  const noActivity =
    totalAccrued === 0 &&
    q.expenseVat === 0 &&
    q.expenseBase === 0 &&
    q.expenseIrpf === 0 &&
    q.income[0].base === 0;
  const result: Draft303['result'] = noActivity
    ? 'noActivity'
    : amountDue > 0
    ? 'pay'
    : amountDue < 0
    ? 'offset'
    : 'zero';
  return { result, amountDue, accrued, deductible, settlement };
}

const lowIncomeReduction = (priorYearNet: number | null): number => {
  if (priorYearNet === null) return 0;
  return LOW_INCOME_REDUCTIONS.find((r) => priorYearNet <= r.upTo)?.amount ?? 0;
};

/** Modelo 130 up to a quarter: cumulative figures, with the payments of the earlier quarters. */
/** Where the cumulative figures start: the first quarter, or the quarter after the filed totals. */
interface CumulativeWindow {
  prior: NonNullable<DraftInputs['prior']> | null;
  start: number;
  income: number;
  expenses: number;
  payments: number;
  withheld: number;
}

function windowOf(inputs: DraftInputs, upTo: number): CumulativeWindow {
  const prior = inputs.prior && upTo > 1 ? inputs.prior : null;
  return {
    prior,
    start: prior ? upTo - 1 : 0,
    income: Math.round((prior?.income ?? 0) * 100),
    expenses: Math.round((prior?.expenses ?? 0) * 100),
    payments: prior?.previousPayments ?? 0,
    withheld: prior?.withheld ?? 0,
  };
}

function draft130(quarters: Quarter[], inputs: DraftInputs, upTo: 1 | 2 | 3 | 4): Draft130 {
  if (inputs.exempt130) return { required: false, result: 'notRequired', amountDue: 0, boxes: [] };
  const reduction = lowIncomeReduction(inputs.priorYearNet);
  const window = windowOf(inputs, upTo);
  let previousPayments = window.payments;
  let carriedNegative = 0;
  let last: Box[] = [];
  let amountDue = 0;
  for (let n = window.start + 1; n <= upTo; n++) {
    const sel = quarters.slice(window.start, n);
    const extras = inputs.quarters.slice(window.start, n);
    const income =
      window.income +
      sel.reduce(
        (s, q) => s + [0, 4, 10, 21].reduce((t, r) => t + q.income[r as VatRate].base, 0),
        0
      );
    const baseExpenses =
      window.expenses +
      sel.reduce((s, q) => s + q.expenseIrpf, 0) +
      extras.reduce((s, e) => s + Math.round((e.socialSecurity + e.vatNotDeductible) * 100), 0);
    const preNet = income - baseExpenses;
    // The filed total of box 02 already counts the hard-to-justify expenses of the earlier quarters.
    const hard =
      inputs.hardToJustify && !window.prior
        ? Math.min(
            Math.round(Math.max(0, preNet) * HARD_TO_JUSTIFY_RATE),
            HARD_TO_JUSTIFY_MAX * 100
          )
        : 0;
    const expenses = baseExpenses + hard;
    const net = income - expenses;
    const fourth = Math.max(0, euros(net)) * IRPF_ADVANCE;
    const withheld = window.withheld + extras.reduce((s, e) => s + e.withheld, 0);
    const box07 = round2(round2(fourth) - previousPayments - withheld);
    const box12 = Math.max(0, box07);
    const box14 = round2(box12 - reduction);
    const box15 = round2(box14 > 0 ? Math.min(box14, carriedNegative) : 0);
    const box17 = round2(box14 - box15);
    last = [
      { box: '01', label: 'Ingresos íntegros acumulados', amount: euros(income) },
      { box: '02', label: 'Gastos fiscalmente deducibles acumulados', amount: euros(expenses) },
      { box: '03', label: 'Rendimiento neto (01 − 02)', amount: euros(net) },
      { box: '04', label: '20 % del rendimiento neto', amount: round2(fourth) },
      { box: '05', label: 'Pagos de trimestres anteriores', amount: round2(previousPayments) },
      { box: '06', label: 'Retenciones soportadas acumuladas', amount: round2(withheld) },
      { box: '07', label: 'Resultado (04 − 05 − 06)', amount: box07 },
      { box: '12', label: 'Suma de 07 y 11 (si es negativa, 0)', amount: round2(box12) },
      { box: '13', label: 'Minoración por rentas bajas del ejercicio anterior', amount: reduction },
      { box: '14', label: 'Resultado tras la minoración (12 − 13)', amount: box14 },
      { box: '15', label: 'Resultados negativos de trimestres anteriores', amount: box15 },
      { box: '17', label: 'Total (14 − 15 − 16)', amount: box17 },
      { box: '19', label: 'Resultado de la autoliquidación', amount: box17 },
    ];
    amountDue = box17;
    previousPayments += box07 > 0 ? box07 : 0;
    carriedNegative = box14 < 0 ? carriedNegative + -box14 : Math.max(0, carriedNegative - box15);
  }
  const result: Draft130['result'] = amountDue > 0 ? 'pay' : amountDue < 0 ? 'negative' : 'zero';
  return { required: true, result, amountDue, boxes: last };
}

/** The contribution bracket for a monthly net income (after the 7 % general expenses). */
export function retaFor(monthlyNet: number): RetaEstimate {
  const bracket = RETA_BRACKETS_2026.find(
    (b) => b.to === null || (b.toExclusive ? monthlyNet < b.to : monthlyNet <= b.to)
  ) as RetaBracket; // the last bracket has no upper limit
  return {
    monthlyNet: round2(monthlyNet),
    bracket: bracket.id,
    baseMin: bracket.baseMin,
    baseMax: bracket.baseMax,
    feeMin: round2(bracket.baseMin * RETA_RATE_2026),
    feeMax: round2(bracket.baseMax * RETA_RATE_2026),
    rate: RETA_RATE_2026,
  };
}

/** The contribution a year-to-date result points to: annualised, plus the fees paid, minus 7 %. */
function retaEstimate(quarters: Quarter[], inputs: DraftInputs, upTo: 1 | 2 | 3 | 4): RetaEstimate {
  const window = windowOf(inputs, upTo);
  const sel = quarters.slice(window.start, upTo);
  const income =
    window.income +
    sel.reduce(
      (s, q) => s + [0, 4, 10, 21].reduce((t, r) => t + q.income[r as VatRate].base, 0),
      0
    );
  const expenses =
    window.expenses +
    sel.reduce((s, q) => s + q.expenseIrpf, 0) +
    inputs.quarters
      .slice(window.start, upTo)
      .reduce((s, e) => s + Math.round(e.vatNotDeductible * 100), 0);
  // The fees paid are added back: the contribution is worked out on the net income before them.
  const net = euros(income - expenses);
  const monthly = (Math.max(0, net) / (upTo * 3)) * (1 - RETA_GENERAL_EXPENSES);
  return retaFor(monthly);
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** A deadline date; a weekend moves to the next Monday (public holidays are not known here). */
export function businessDay(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day));
  while (d.getUTCDay() === 6 || d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}

/** The deadlines of the quarter and, at the year end, the annual summaries. */
export function deadlinesFor(year: number, quarter: 1 | 2 | 3 | 4): Deadline[] {
  const [y, month, day] = quarter === 4 ? [year + 1, 1, 30] : [year, quarter * 3 + 1, 20];
  const retention =
    quarter === 4 ? businessDay(year + 1, 1, 20) : businessDay(year, quarter * 3 + 1, 20);
  const list: Deadline[] = [
    { model: '303', label: 'IVA trimestral', date: businessDay(y, month, day) },
    { model: '130', label: 'Pago fraccionado del IRPF', date: businessDay(y, month, day) },
    {
      model: '111',
      label: 'Retenciones de trabajadores o profesionales (si has pagado alguna)',
      date: retention,
    },
    { model: '115', label: 'Retenciones de alquiler del local (si lo alquilas)', date: retention },
  ];
  if (quarter === 4) {
    list.push(
      { model: '390', label: 'Resumen anual de IVA', date: businessDay(year + 1, 1, 30) },
      { model: '190', label: 'Resumen anual de retenciones', date: businessDay(year + 1, 1, 31) },
      {
        model: '347',
        label: 'Operaciones con terceros de más de 3.005,06 €',
        date: businessDay(year + 1, 2, 28),
      }
    );
  }
  return list;
}

/** Everything the draft of a quarter shows. */
export function prepareDraft(
  year: number,
  quarter: 1 | 2 | 3 | 4,
  movements: BusinessMovement[],
  inputs: DraftInputs
): DraftResult {
  const quarters = bucket(year, movements);
  return {
    year,
    quarter,
    vat: draft303(quarters[quarter - 1], inputs.quarters[quarter - 1], inputs.vatToOffset),
    irpf: draft130(quarters, inputs, quarter),
    reta: retaEstimate(quarters, inputs, quarter),
    deadlines: deadlinesFor(year, quarter),
  };
}
