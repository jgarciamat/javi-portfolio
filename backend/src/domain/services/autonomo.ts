import {
  HARD_TO_JUSTIFY_MAX,
  LOW_INCOME_REDUCTIONS,
  RETA_GENERAL_EXPENSES,
  type RetaBracket,
  retaTableOf,
} from './autonomo-data';
import { ManualData } from './autonomo-expenses';
import { draft349, type Draft349 } from './autonomo-349';
import { draft390, type Draft390 } from './autonomo-390';
import {
  addMovement,
  type Box,
  type Draft303,
  emptyBucket,
  type VatBucket,
  type VatMovement,
  vatYear,
} from './autonomo-vat';
import type { QuarterVat, VatOptions } from './autonomo-vat-data';
import { businessDay, filingDeadline, lastDayOf } from './working-days';
import {
  type ActivityTerritory,
  hardToJustifyRate,
  instalmentRates,
  percentLabel,
} from './autonomo-territory';

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
  /**
   * Worked out by the app from the assets and grants of the activity (frontend depreciation.ts and
   * subsidies.ts): depreciation of the quarter (art. 30.1.ª RIRPF), provisions (normal modality),
   * current grants, capital grants imputed by depreciation and REAGP compensations received (art.
   * 130 LIVA), all income or expenses of box 01 or 02.
   */
  depreciation?: number;
  provisions?: number;
  subsidies?: number;
  capitalSubsidies?: number;
  compensations?: number;
}

export interface DraftInputs {
  /** Extras of the four quarters; only the ones up to the viewed quarter matter. */
  quarters: [QuarterExtras, QuarterExtras, QuarterExtras, QuarterExtras];
  /** Simplified direct estimation: 5 % of hard-to-justify expenses (up to 2,000 euros a year). */
  hardToJustify: boolean;
  /** The normal modality has no hard-to-justify expenses (art. 30.2.4.ª RIRPF is for the simplified). */
  modality?: 'simplified' | 'normal';
  /** Farming, livestock, forestry or fishing: section II of the 130 (2 % of the quarter's income). */
  agrarian?: boolean;
  /**
   * Net income of last year, for the low-income reduction (null: unknown, none applied). With no
   * activity last year it is 0 (instructions of the 130, box 13), so the 100 € apply.
   */
  priorYearNet: number | null;
  /** Professional whose clients withheld at least 70 % of last year's income: no modelo 130. */
  exempt130: boolean;
  /**
   * Where the activity is carried out (autonomo-territory.ts): Ceuta, Melilla and some quarters of
   * La Palma pay 8 % instead of 20 % (art. 110.2 RIRPF). Unset (older apps): the general rate.
   */
  territory?: ActivityTerritory;
  /**
   * VAT to offset from earlier periods (modelo 303, box 110) of the viewed quarter, as older data
   * gives it; `vat.offsetStart` (the amount left at the start of the year) replaces it.
   */
  vatToOffset: number;
  /** The VAT of the year: prorrata, investment goods, what is left to offset, refund. */
  vat?: VatOptions | null;
  /** Income and expenses typed by hand: they replace the movements. */
  manual?: ManualData | null;
  /**
   * Totals up to the quarter before the viewed one, so the earlier quarters need not be typed again:
   * the real cumulative income, expenses and withholdings (boxes 01, 02 and 06, corrected if that 130
   * had an error) and the payments as filed (box 05 of the viewed quarter: 05 + 07 of the last 130).
   */
  prior?: PriorTotals | null;
  /**
   * The modelo 130 of each quarter as it was filed (null: not given). Only the payments carried to the
   * next quarters come from it; boxes 01 and 02 always follow the real figures (C1-C2 of
   * docs/fiscalidad/corregir-un-modelo.md).
   */
  filed130?: (Filed130 | null)[] | null;
}

/** Boxes 07 and 19 of a modelo 130 as filed, in euros. */
export interface Filed130 {
  box07: number;
  box19?: number | null;
}

export interface PriorTotals {
  income: number;
  expenses: number;
  previousPayments: number;
  withheld: number;
}

export type { Box, Draft303 };

export interface Draft130 {
  /** Not required of whoever is a professional with 70 % of income withheld. */
  required: boolean;
  result: 'pay' | 'negative' | 'zero' | 'notRequired';
  amountDue: number;
  boxes: Box[];
  /** Rate of box 04 (or of box 09 in farming) of the viewed quarter: 0.2, 0.08, 0.02 or 0.008. */
  rate: number;
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
  /** The year of the table used, and false when that year has no order yet (the latest one is used). */
  year: number;
  known: boolean;
}

export interface Deadline {
  model: string;
  label: string;
  /** ISO date of the last day (moved past weekends and national holidays: working-days.ts). */
  date: string;
}

export interface DraftResult {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  vat: Draft303;
  /** Intra-EU operations of the quarter (null when there are none). */
  m349: Draft349 | null;
  /** The annual summary, with the fourth quarter (null for the others). */
  m390: Draft390 | null;
  irpf: Draft130;
  reta: RetaEstimate;
  deadlines: Deadline[];
}

interface Quarter {
  /** Income base for the income tax (every sale, with VAT or without), cents. */
  incomeBase: number;
  /** What the expenses count for the income tax (base plus the VAT that cannot be deducted, by share). */
  expenseIrpf: number;
  vat: VatBucket;
}

function bucket(year: number, movements: VatMovement[]): Quarter[] {
  const quarters: Quarter[] = [0, 1, 2, 3].map(() => ({
    incomeBase: 0,
    expenseIrpf: 0,
    vat: emptyBucket(),
  }));
  for (const m of movements) {
    if (!m.date.startsWith(`${year}-`)) continue;
    const q = quarters[quarterOf(m.date) - 1];
    const counted = addMovement(q.vat, m);
    q.incomeBase += counted.income;
    q.expenseIrpf += counted.expense;
  }
  return quarters;
}

/** The VAT that the person says cannot be deducted, taken off the domestic purchases (older field). */
function withoutNotDeductible(q: Quarter, extras: QuarterExtras): VatBucket {
  const cap = Math.round(extras.vatNotDeductible * 100);
  if (cap <= 0) return q.vat;
  let left = cap;
  const items = q.vat.items.map((item) => {
    if (item.channel !== 'interior' || left <= 0) return item;
    const taken = Math.min(left, item.vat);
    left -= taken;
    // The base follows the share of VAT that can be deducted.
    return {
      ...item,
      base: Math.round(item.base * ((item.vat - taken) / item.vat)),
      vat: item.vat - taken,
    };
  });
  return { ...q.vat, items: items.filter((i) => i.vat > 0) };
}

/** Box 13 (art. 110.3.c RIRPF): by last year's net income; no activity then counts as 0 €. */
const lowIncomeReduction = (priorYearNet: number | null): number => {
  if (priorYearNet === null) return 0;
  return LOW_INCOME_REDUCTIONS.find((r) => priorYearNet <= r.upTo)?.amount ?? 0;
};

/** Where the cumulative figures start: the first quarter, or the quarter after the prior totals. */
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

const cents = (amount: number): number => Math.round(amount * 100);
/** What the activity adds to the income of a quarter beyond the invoices (euros). */
const extraIncome = (e: QuarterExtras): number =>
  (e.subsidies ?? 0) + (e.capitalSubsidies ?? 0) + (e.compensations ?? 0);
/** What it adds to the expenses: the fees, the VAT not deducted, depreciation and provisions. */
const extraExpenses = (e: QuarterExtras): number =>
  e.socialSecurity + e.vatNotDeductible + (e.depreciation ?? 0) + (e.provisions ?? 0);

/** Section I of the 130 (boxes 01-07), cumulative from January; amounts in cents but 04-07. */
function section1Of(s: {
  income: number;
  expenses: number;
  net: number;
  rate: number;
  fourth: number;
  previousPayments: number;
  withheld: number;
  box07: number;
}): Box[] {
  return [
    { box: '01', label: 'Ingresos íntegros acumulados', amount: euros(s.income) },
    { box: '02', label: 'Gastos fiscalmente deducibles acumulados', amount: euros(s.expenses) },
    { box: '03', label: 'Rendimiento neto (01 − 02)', amount: euros(s.net) },
    {
      box: '04',
      label: `${percentLabel(s.rate)} del rendimiento neto`,
      amount: round2(s.fourth),
    },
    { box: '05', label: 'Pagos de trimestres anteriores', amount: round2(s.previousPayments) },
    { box: '06', label: 'Retenciones soportadas acumuladas', amount: round2(s.withheld) },
    { box: '07', label: 'Resultado (04 − 05 − 06)', amount: s.box07 },
  ];
}

/**
 * Section II of the 130 (boxes 08-11): 2 % of the income of the quarter alone, with the current
 * grants and without the capital ones and compensations for damage, less the withholdings of the
 * quarter (art. 110.1.c and 110.3.b RIRPF; instructions of the modelo 130, box 08).
 */
function agrarianSection(
  q: Quarter,
  e: QuarterExtras,
  rate: number
): { box11: number; boxes: Box[] } {
  // Whether the REAGP compensations go here is NOT CONFIRMED (the instructions do not say): left out.
  const volume = euros(q.incomeBase + cents(e.subsidies ?? 0));
  const box09 = round2(volume * rate);
  const box11 = round2(box09 - e.withheld);
  return {
    box11,
    boxes: [
      { box: '08', label: 'Volumen de ingresos del trimestre', amount: volume },
      { box: '09', label: `${percentLabel(rate)} del volumen de ingresos`, amount: box09 },
      {
        box: '10',
        label: 'Retenciones e ingresos a cuenta del trimestre',
        amount: round2(e.withheld),
      },
      { box: '11', label: 'Resultado (09 − 10)', amount: box11 },
    ],
  };
}

/**
 * Box 05 adds the positive boxes 07 «consignadas» in the 130 filed this year, less their boxes 16
 * (instructions of the modelo 130, box 05, AEAT, checked 2026-10-21). A quarter whose filed 130 was
 * typed carries what was filed, so a correction made later in the app does not take off payments that
 * were never made; the others carry the box 07 worked out here. A negative box 19 («a deducir», only
 * after the low-income reduction) goes to box 15 of the next quarters.
 */
function carryOf(
  filed: Filed130 | null | undefined,
  worked: { box07: number; box14: number; box15: number },
  carried: number
): { payment: number; carried: number } {
  const box07 = filed ? filed.box07 : worked.box07;
  const box19 = filed?.box19 ?? null;
  const negative = box19 === null ? worked.box14 : box19;
  return {
    payment: Math.max(0, round2(box07)),
    carried: negative < 0 ? carried + -negative : Math.max(0, carried - worked.box15),
  };
}

/** Modelo 130 up to a quarter: real cumulative figures, with the payments of the earlier quarters. */
function draft130(
  year: number,
  quarters: Quarter[],
  inputs: DraftInputs,
  upTo: 1 | 2 | 3 | 4
): Draft130 {
  const agrarian = Boolean(inputs.agrarian);
  const rateOf = (n: number): number => {
    const rates = instalmentRates(inputs.territory, year, n);
    return agrarian ? rates.agrarian : rates.direct;
  };
  if (inputs.exempt130) {
    return { required: false, result: 'notRequired', amountDue: 0, boxes: [], rate: rateOf(upTo) };
  }
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
      sel.reduce((s, q) => s + q.incomeBase, 0) +
      extras.reduce((s, e) => s + cents(extraIncome(e)), 0);
    const baseExpenses =
      window.expenses +
      sel.reduce((s, q) => s + q.expenseIrpf, 0) +
      extras.reduce((s, e) => s + cents(extraExpenses(e)), 0);
    const preNet = income - baseExpenses;
    // The filed total of box 02 already counts the hard-to-justify expenses of the earlier quarters.
    const hard =
      inputs.hardToJustify && inputs.modality !== 'normal' && !window.prior
        ? Math.min(
            Math.round(Math.max(0, preNet) * hardToJustifyRate(inputs.territory, year, n)),
            HARD_TO_JUSTIFY_MAX * 100
          )
        : 0;
    const expenses = baseExpenses + hard;
    const net = income - expenses;
    // 20 %, or 8 % where art. 110.2 RIRPF applies, of the cumulative net income of the year.
    const rate = rateOf(n);
    const fourth = Math.max(0, euros(net)) * rate;
    const withheld = window.withheld + extras.reduce((s, e) => s + e.withheld, 0);
    // A farming activity fills in section II only: 2 % (0.8 %) of the income of the quarter.
    const box07 = agrarian ? 0 : round2(round2(fourth) - previousPayments - withheld);
    const section2 = agrarian
      ? agrarianSection(quarters[n - 1], inputs.quarters[n - 1], rate)
      : { box11: 0, boxes: [] };
    const box12 = Math.max(0, round2(box07 + section2.box11));
    const box14 = round2(box12 - reduction);
    const box15 = round2(box14 > 0 ? Math.min(box14, carriedNegative) : 0);
    const box17 = round2(box14 - box15);
    last = [
      ...(agrarian
        ? []
        : section1Of({ income, expenses, net, rate, fourth, previousPayments, withheld, box07 })),
      ...section2.boxes,
      { box: '12', label: 'Suma de 07 y 11 (si es negativa, 0)', amount: round2(box12) },
      { box: '13', label: 'Minoración por rentas bajas del ejercicio anterior', amount: reduction },
      { box: '14', label: 'Resultado tras la minoración (12 − 13)', amount: box14 },
      { box: '15', label: 'Resultados negativos de trimestres anteriores', amount: box15 },
      { box: '17', label: 'Total (14 − 15 − 16)', amount: box17 },
      { box: '19', label: 'Resultado de la autoliquidación', amount: box17 },
    ];
    amountDue = box17;
    // The viewed quarter carries nothing; the earlier ones carry what was filed when it is known.
    const filed = n < upTo ? inputs.filed130?.[n - 1] : null;
    const carry = carryOf(filed, { box07, box14, box15 }, carriedNegative);
    previousPayments = round2(previousPayments + carry.payment);
    carriedNegative = carry.carried;
  }
  const result: Draft130['result'] = amountDue > 0 ? 'pay' : amountDue < 0 ? 'negative' : 'zero';
  return { required: true, result, amountDue, boxes: last, rate: rateOf(upTo) };
}

/** The contribution bracket for a monthly net income (after the 7 % general expenses) in a year. */
export function retaFor(monthlyNet: number, year = 2026): RetaEstimate {
  const { table, known } = retaTableOf(year);
  const bracket = table.brackets.find(
    (b) => b.to === null || (b.toExclusive ? monthlyNet < b.to : monthlyNet <= b.to)
  ) as RetaBracket; // the last bracket has no upper limit
  return {
    monthlyNet: round2(monthlyNet),
    bracket: bracket.id,
    baseMin: bracket.baseMin,
    baseMax: bracket.baseMax,
    feeMin: round2(bracket.baseMin * table.rate),
    feeMax: round2(bracket.baseMax * table.rate),
    rate: table.rate,
    year,
    known,
  };
}

/** The contribution a year-to-date result points to: annualised, plus the fees paid, minus 7 %. */
function retaEstimate(
  year: number,
  quarters: Quarter[],
  inputs: DraftInputs,
  upTo: 1 | 2 | 3 | 4
): RetaEstimate {
  const window = windowOf(inputs, upTo);
  const sel = quarters.slice(window.start, upTo);
  const extras = inputs.quarters.slice(window.start, upTo);
  const income =
    window.income +
    sel.reduce((s, q) => s + q.incomeBase, 0) +
    extras.reduce((s, e) => s + cents(extraIncome(e)), 0);
  const expenses =
    window.expenses +
    sel.reduce((s, q) => s + q.expenseIrpf, 0) +
    extras.reduce((s, e) => s + cents(extraExpenses(e) - e.socialSecurity), 0);
  // The fees paid are added back: the contribution is worked out on the net income before them.
  const net = euros(income - expenses);
  const monthly = (Math.max(0, net) / (upTo * 3)) * (1 - RETA_GENERAL_EXPENSES);
  return retaFor(monthly, year);
}

/** The deadlines of the quarter and, at the year end, the annual summaries. */
export function deadlinesFor(year: number, quarter: 1 | 2 | 3 | 4, intraEU = false): Deadline[] {
  const quarterly = filingDeadline(year, quarter);
  const retention =
    quarter === 4 ? businessDay(year + 1, 1, 20) : businessDay(year, quarter * 3 + 1, 20);
  const list: Deadline[] = [
    { model: '303', label: 'IVA trimestral', date: quarterly },
    { model: '130', label: 'Pago fraccionado del IRPF', date: quarterly },
    {
      model: '111',
      label: 'Retenciones de trabajadores o profesionales (si has pagado alguna)',
      date: retention,
    },
    { model: '115', label: 'Retenciones de alquiler del local (si lo alquilas)', date: retention },
  ];
  // Quarterly 349: the first 20 days of the next month; the fourth quarter, until 30 January [I349].
  if (intraEU) {
    list.push({
      model: '349',
      label: 'Operaciones intracomunitarias',
      date: quarterly,
    });
  }
  if (quarter === 4) {
    list.push(
      { model: '390', label: 'Resumen anual de IVA', date: businessDay(year + 1, 1, 30) },
      { model: '190', label: 'Resumen anual de retenciones', date: businessDay(year + 1, 1, 31) },
      // «Durante el mes de febrero» (Orden EHA/3012/2008, art. 10, BOE-A-2008-16973): its last day.
      {
        model: '347',
        label: 'Operaciones con terceros de más de 3.005,06 €',
        date: businessDay(year + 1, 2, lastDayOf(year + 1, 2)),
      }
    );
  }
  return list;
}

/** The VAT extras of each quarter typed by hand (none with the movements). */
const vatExtras = (inputs: DraftInputs): QuarterVat[] =>
  [0, 1, 2, 3].map((i) => inputs.manual?.quarters[i]?.vat ?? {});

/** Everything the draft of a quarter shows. */
export function prepareDraft(
  year: number,
  quarter: 1 | 2 | 3 | 4,
  movements: VatMovement[],
  inputs: DraftInputs
): DraftResult {
  const quarters = bucket(year, movements);
  const options = inputs.vat ?? {};
  const extras = vatExtras(inputs);
  // Older data said what was left to offset in the viewed quarter, not at the start of the year.
  const legacy =
    options.offsetStart === undefined || options.offsetStart === null
      ? { quarter: quarter - 1, pending: inputs.vatToOffset }
      : null;
  const buckets = quarters.map((q, i) => withoutNotDeductible(q, inputs.quarters[i]));
  const year303 = vatYear(year, buckets, extras, options, legacy);
  const viewed = year303.quarters[quarter - 1];
  const amountOf = (code: string): number =>
    [...viewed.draft.info, ...viewed.draft.accrued].find((b) => b.box === code)?.amount ?? 0;
  const intra = [...buckets[quarter - 1].intra, ...(extras[quarter - 1].intra ?? [])];
  const m349 = intra.length > 0 ? draft349(intra, amountOf('59'), amountOf('10')) : null;
  return {
    year,
    quarter,
    vat: viewed.draft,
    m349,
    m390: quarter === 4 ? draft390(year303, options) : null,
    irpf: draft130(year, quarters, inputs, quarter),
    reta: retaEstimate(year, quarters, inputs, quarter),
    deadlines: deadlinesFor(year, quarter, m349 !== null),
  };
}
