/**
 * Modelo 303 of a quarter with every box a sole trader in the general regime can need, worked out in
 * cents from the operations of the year. Boxes, formulas and sources: autonomo-vat-data.ts.
 */
import { VatRate } from '@domain/ports/repositories';
import {
  CASH_RATES,
  type CashRate,
  type DeductionUse,
  INVESTMENT_THRESHOLD,
  INVESTMENT_YEARS,
  type IntraOp,
  type Key349,
  type PurchaseOp,
  type QuarterVat,
  RATES,
  RE_RATES,
  RE_TOBACCO,
  REAL_ESTATE_YEARS,
  type SaleOp,
  SPECIAL_PRORRATA_EXCESS,
  type VatOptions,
} from './autonomo-vat-data';
import { BusinessMovement, splitVat } from './tax';

export interface Box {
  /** Box number of the official form ("07", "46"...). */
  box: string;
  label: string;
  amount: number;
}

/** A movement of the business with what it is for VAT (the plain ones are domestic). */
export interface VatMovement extends BusinessMovement {
  op?: SaleOp | PurchaseOp;
  /** An investment good (art. 108 LIVA): boxes 30-31, 34-35 or 38-39. */
  investment?: boolean;
  /** For the special prorrata: used only in taxed or only in exempt operations. */
  use?: DeductionUse;
  /** The other party of an intra-EU operation, for the 349. */
  intra?: { key: Key349; vatId: string; name: string };
}

type Money = { base: number; vat: number };
type ByRate = Record<VatRate, Money>;
type Channel = 'interior' | 'import' | 'intraGoods' | 'intraServices';
/** Sales without VAT on the invoice, by the box they go to (bases in cents). */
type OtherSales = Record<Exclude<SaleOp, 'domestic' | 're'>, number>;

/** A purchase whose VAT can be deducted (cents, after the art. 95-96 shares, before the prorrata). */
interface Item {
  channel: Channel;
  investment: boolean;
  rate: VatRate;
  base: number;
  vat: number;
  use: DeductionUse;
}

/** The operations of a quarter as the VAT sees them (cents). */
export interface VatBucket {
  sales: ByRate;
  /** Bases sold to retailers in the surcharge, by VAT rate. */
  re: Record<21 | 10 | 4, number>;
  other: OtherSales;
  /** Self-assessed VAT: intra-EU goods, intra-EU services and other reverse charge. */
  intraGoods: ByRate;
  intraServices: ByRate;
  reverse: ByRate;
  items: Item[];
  /** Bases of the VAT that cannot be deducted (arts. 95-96 LIVA), for box 232 of the 390. */
  nonDeductibleBase: number;
  intra: IntraOp[];
}

const byRate = (): ByRate => ({
  0: { base: 0, vat: 0 },
  4: { base: 0, vat: 0 },
  10: { base: 0, vat: 0 },
  21: { base: 0, vat: 0 },
});

export const emptyBucket = (): VatBucket => ({
  sales: byRate(),
  re: { 21: 0, 10: 0, 4: 0 },
  other: {
    intraEU: 0,
    export: 0,
    notSubject: 0,
    oss: 0,
    ossSubject: 0,
    reverse: 0,
    exempt: 0,
    exemptOccasional: 0,
    nonVat: 0,
  },
  intraGoods: byRate(),
  intraServices: byRate(),
  reverse: byRate(),
  items: [],
  nonDeductibleBase: 0,
  intra: [],
});

const CHANNEL: Record<PurchaseOp, Channel> = {
  domestic: 'interior',
  // Reverse-charge purchases are domestic operations: their VAT goes with the domestic ones (28-31).
  reverse: 'interior',
  import: 'import',
  intraGoods: 'intraGoods',
  intraServices: 'intraServices',
};

/** Base and VAT of a movement: VAT included when charged, the base alone when the invoice has none. */
function partsOf(m: VatMovement): Money {
  const op = m.op ?? 'domestic';
  if (op === 'domestic' || op === 're') {
    const { baseCents, vatCents } = splitVat(m.amountCents, m.vatRate);
    return { base: baseCents, vat: vatCents };
  }
  const selfAssessed = m.type === 'EXPENSE';
  return {
    base: m.amountCents,
    vat: selfAssessed ? Math.round((m.amountCents * m.vatRate) / 100) : 0,
  };
}

/**
 * Adds a movement to its quarter; returns what it counts for the income tax (income base or
 * deductible expense, cents), which the modelo 130 adds up.
 */
export function addMovement(b: VatBucket, m: VatMovement): { income: number; expense: number } {
  const { base, vat } = partsOf(m);
  if (m.intra) b.intra.push({ ...m.intra, base: base / 100 });
  if (m.type === 'INCOME') {
    const op = (m.op ?? 'domestic') as SaleOp;
    if (op === 'domestic' || op === 're') {
      b.sales[m.vatRate].base += base;
      b.sales[m.vatRate].vat += vat;
      if (op === 're' && m.vatRate !== 0) b.re[m.vatRate] += base;
    } else {
      b.other[op] += base;
    }
    return { income: base, expense: 0 };
  }
  const op = (m.op ?? 'domestic') as PurchaseOp;
  const share = m.vatShare ?? 1;
  if (op === 'intraGoods' || op === 'intraServices' || op === 'reverse') {
    // The buyer charges itself the whole VAT, deductible or not (art. 84 LIVA).
    b[op][m.vatRate].base += base;
    b[op][m.vatRate].vat += vat;
  }
  if (vat > 0) {
    const item: Item = {
      channel: CHANNEL[op],
      investment: Boolean(m.investment) && op !== 'intraServices',
      rate: m.vatRate,
      base: Math.round(base * share),
      vat: Math.round(vat * share),
      use: m.use ?? 'common',
    };
    if (item.vat > 0) b.items.push(item);
    b.nonDeductibleBase += base - item.base;
  }
  // The VAT that cannot be deducted is part of the expense for the share that does count.
  const irpf = m.irpfShare ?? 1;
  return { income: 0, expense: Math.round(base * irpf + vat * Math.max(0, irpf - share)) };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const euros = (cents: number): number => round2(cents / 100);
const cents = (amount: number | undefined | null): number => Math.round((amount ?? 0) * 100);
const sum = (list: number[]): number => list.reduce((s, n) => s + n, 0);
const box = (code: string, label: string, amountCents: number): Box => ({
  box: code,
  label,
  amount: euros(amountCents),
});
const rate = (code: string, label: string, pct: number): Box => ({ box: code, label, amount: pct });

/** Prorrata percentage: with the right to deduct over all, rounded up (art. 104.Dos LIVA). */
export function prorrataOf(withRight: number, total: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.ceil((withRight * 100) / total - 1e-9));
}

/** What brings the prorrata: operations with the right to deduct and all of them (cents). */
export function prorrataBase(
  buckets: VatBucket[],
  extras: QuarterVat[]
): { withRight: number; total: number } {
  let withRight = 0;
  let exempt = 0;
  buckets.forEach((b, i) => {
    const o = b.other;
    // Operations outside Spain count when they would give the right to deduct (art. 94.Uno.2.º).
    withRight +=
      sum(RATES.map((r) => b.sales[r].base)) +
      o.intraEU +
      o.export +
      o.notSubject +
      o.oss +
      o.ossSubject +
      o.reverse +
      cents(extras[i]?.salesFix?.base) -
      cents(extras[i]?.salesFix?.priorYear);
    // Occasional property and financial operations stay out of both terms (art. 104.Tres.4.º).
    exempt += o.exempt;
  });
  return { withRight: Math.max(0, withRight), total: Math.max(0, withRight) + exempt };
}

export type VatWarning =
  | 'prorrataMissing'
  | 'prorrataApplied'
  | 'specialMandatory'
  | 'importDeferred'
  | 'refundNotLast'
  | 'offsetNotApplied'
  | 'simplified'
  | 'reagp'
  | 'reverseIssued'
  | 'exemptNoProrrata';

/** The 303 of a quarter: the boxes as the form groups them, and what the 390 needs of it. */
export interface Draft303 {
  /** To pay, to carry to the next quarters, to be refunded, zero or no activity. */
  result: 'pay' | 'offset' | 'refund' | 'zero' | 'noActivity';
  amountDue: number;
  accrued: Box[];
  deductible: Box[];
  /** «Información adicional»: operations without VAT and cash accounting. */
  info: Box[];
  settlement: Box[];
  /** Percentage of the VAT borne that was deducted (100 without exempt sales). */
  prorrata: number;
  warnings: VatWarning[];
}

/** The figures of a quarter the 390 adds up (cents). */
export interface QuarterDetail {
  ordinary: ByRate;
  cash: Record<CashRate, Money>;
  cashInvoiced: Money;
  intraGoods: ByRate;
  intraServices: ByRate;
  reverse: Money;
  salesFix: Money;
  salesFixPriorYear: number;
  re: { r52: number; r14: number; r05: number; r175: number };
  reFix: Money;
  /** Deducted, by channel, use and rate (after the prorrata). */
  deducted: Record<
    'interior' | 'import' | 'intraGoods' | 'intraServices',
    Record<'current' | 'investment', ByRate>
  >;
  deductionFix: Money;
  intraFix: Money;
  reagp: number;
  box43: number;
  box44: number;
  art80: number;
  importDeferred: number;
  other: OtherSales;
  nonDeductibleBase: number;
  result71: number;
  box72: number;
  box73: number;
  box78: number;
  /** Of box 78, the part that came from the years before. */
  fromPriorYears: number;
  /** Generated in this quarter and still pending at the end of the year. */
  pendingAtYearEnd: number;
}

export interface VatYear {
  quarters: { draft: Draft303; detail: QuarterDetail }[];
  /** Definitive prorrata of the year (art. 105.Cuatro LIVA), 100 without exempt sales. */
  definitive: number;
  prorrataBase: { withRight: number; total: number };
}

const money = (base = 0, vat = 0): Money => ({ base, vat });
const fix = (f: { base: number; vat: number } | null | undefined): Money =>
  money(cents(f?.base), cents(f?.vat));

/**
 * Deducted VAT of a quarter after the prorrata, by channel, investment or not, and rate. With the
 * special prorrata, what is used only in taxed operations is deducted in full and what is used only in
 * exempt ones not at all (art. 106 LIVA); with the general one, everything at the percentage (art. 104).
 */
interface Deductions {
  out: QuarterDetail['deducted'];
  /** VAT the prorrata applies to (all of it with the general one, the common part with the special one). */
  prorrated: number;
  general: number;
  special: number;
}

function deductions(items: Item[], pct: number, special: boolean): Deductions {
  const out = {
    interior: { current: byRate(), investment: byRate() },
    import: { current: byRate(), investment: byRate() },
    intraGoods: { current: byRate(), investment: byRate() },
    intraServices: { current: byRate(), investment: byRate() },
  };
  let prorrated = 0;
  let general = 0;
  let specialTotal = 0;
  for (const item of items) {
    const own = item.use === 'taxed' ? 100 : item.use === 'exempt' ? 0 : pct;
    const share = special ? own : pct;
    const vat = Math.round((item.vat * share) / 100);
    if (!special || item.use === 'common') prorrated += item.vat;
    general += Math.round((item.vat * pct) / 100);
    specialTotal += Math.round((item.vat * own) / 100);
    // Bases are shown without the prorrata, but only for VAT that can be deducted at all [I303].
    if (vat === 0) continue;
    const cell = out[item.channel][item.investment ? 'investment' : 'current'][item.rate];
    cell.base += item.base;
    cell.vat += vat;
  }
  return { out, prorrated, general, special: specialTotal };
}

const total = (r: ByRate): Money => ({
  base: sum(RATES.map((x) => r[x].base)),
  vat: sum(RATES.map((x) => r[x].vat)),
});
const add = (a: Money, b: Money): Money => money(a.base + b.base, a.vat + b.vat);

/** Cash accounting: bases by rate as VAT money. */
const cashMoney = (
  r: { r21: number; r10: number; r4: number } | undefined,
  at: CashRate
): Money => {
  const base = cents(r?.[`r${at}`]);
  return money(base, Math.round((base * at) / 100));
};

interface QuarterContext {
  q: number;
  bucket: VatBucket;
  extras: QuarterVat;
  pct: number;
  pending: { prior: number; year: number[] };
  options: VatOptions;
  /** Fourth quarter: the definitive prorrata and the regularisations of the year. */
  annual: { box43: number; box44: number } | null;
}

/** The accrued VAT: sales by rate (cash accounting included), self-assessed VAT and surcharge. */
interface Accrued {
  accrued: Box[];
  c27: number;
  ordinary: ByRate;
  cash: Record<CashRate, Money>;
  cashInvoiced: Money;
  re: QuarterDetail['re'];
  salesFix: Money;
  reFix: Money;
  reverse: Money;
}

function accruedOf(c: QuarterContext): Accrued {
  const { bucket: b, extras: x } = c;
  const ordinary = byRate();
  const cash = { 21: money(), 10: money(), 4: money() } as Record<CashRate, Money>;
  let cashInvoiced = money();
  for (const r of RATES) ordinary[r] = { ...b.sales[r] };
  if (x.cash) {
    for (const r of CASH_RATES) {
      const invoiced = cashMoney(x.cash.invoiced, r);
      // Under cash accounting the VAT is due when collected (art. 163 terdecies.Uno LIVA).
      ordinary[r] = money(ordinary[r].base - invoiced.base, ordinary[r].vat - invoiced.vat);
      cash[r] = cashMoney(x.cash.collected, r);
      cashInvoiced = add(cashInvoiced, invoiced);
    }
  }
  const sales = (r: VatRate): Money =>
    r === 0 ? ordinary[0] : add(ordinary[r], cash[r as CashRate]);
  const tobacco = cents(x.re?.tobacco);
  const reBase = (r: 21 | 10 | 4): number =>
    b.re[r] + cents(x.re?.[`r${r}`]) - (r === 21 ? tobacco : 0);
  const re = {
    r52: reBase(21),
    r14: reBase(10),
    r05: reBase(4),
    r175: tobacco,
  };
  const fee = (base: number, pct: number): number => Math.round((base * pct) / 100);
  const intra = add(total(b.intraGoods), total(b.intraServices));
  const reverse = total(b.reverse);
  const salesFix = fix(x.salesFix);
  const reFix = money(cents(x.reFix?.base), cents(x.reFix?.fee));
  const lines = {
    '152': 0,
    '03': sales(4).vat,
    '06': sales(10).vat,
    '09': sales(21).vat,
    '11': intra.vat,
    '13': reverse.vat,
    '15': salesFix.vat,
    '158': fee(re.r175, RE_TOBACCO),
    '170': fee(re.r05, 0.5),
    '21': fee(re.r14, 1.4),
    '24': fee(re.r52, 5.2),
    '26': reFix.vat,
  };
  // Box 27 = 152 + 167 + 03 + 155 + 06 + 09 + 11 + 13 + 15 + 158 + 170 + 18 + 21 + 24 + 26 [DR303].
  const c27 = sum(Object.values(lines));
  const reBoxes = RE_RATES.flatMap(({ vat, rate: pct, boxes }) => {
    const base = vat === 21 ? re.r52 : vat === 10 ? re.r14 : re.r05;
    return [
      box(boxes[0], `Recargo de equivalencia al ${pct} %: base`, base),
      rate(boxes[1], `Tipo del recargo ${pct} %`, pct),
      box(boxes[2], `Recargo de equivalencia al ${pct} %: cuota`, fee(base, pct)),
    ];
  });
  const accrued: Box[] = [
    box('150', 'Base de operaciones al tipo 0 %', sales(0).base),
    rate('151', 'Tipo 0 %', 0),
    box('152', 'Cuota al tipo 0 %', 0),
    ...([4, 10, 21] as const).flatMap((r, i) => [
      box(['01', '04', '07'][i], `Base imponible al ${r} %`, sales(r).base),
      rate(['02', '05', '08'][i], `Tipo ${r} %`, r),
      box(['03', '06', '09'][i], `Cuota al ${r} %`, sales(r).vat),
    ]),
    box('10', 'Adquisiciones intracomunitarias de bienes y servicios: base', intra.base),
    box('11', 'Adquisiciones intracomunitarias de bienes y servicios: cuota', intra.vat),
    box('12', 'Otras operaciones con inversión del sujeto pasivo: base', reverse.base),
    box('13', 'Otras operaciones con inversión del sujeto pasivo: cuota', reverse.vat),
    box('14', 'Modificación de bases', salesFix.base),
    box('15', 'Modificación de cuotas', salesFix.vat),
    box('156', `Recargo de equivalencia al ${RE_TOBACCO} %: base`, re.r175),
    rate('157', `Tipo del recargo ${RE_TOBACCO} %`, RE_TOBACCO),
    box('158', `Recargo de equivalencia al ${RE_TOBACCO} %: cuota`, lines['158']),
    // The 2026 design lists 168-170 (0.5 %) before 19-21 (1.4 %) and 22-24 (5.2 %).
    ...reBoxes.slice(6),
    ...reBoxes.slice(3, 6),
    ...reBoxes.slice(0, 3),
    box('25', 'Modificación de bases del recargo de equivalencia', reFix.base),
    box('26', 'Modificación de cuotas del recargo de equivalencia', reFix.vat),
    box('27', 'Total cuota devengada', c27),
  ];
  return { accrued, c27, ordinary, cash, cashInvoiced, re, salesFix, reFix, reverse };
}

/** The deductible VAT: by channel after the prorrata, corrections and regularisations. */
interface Deductible {
  deductible: Box[];
  c45: number;
  d: Deductions;
  deductionFix: Money;
  intraFix: Money;
  box42: number;
  box43: number;
  box44: number;
}

function deductibleOf(c: QuarterContext): Deductible {
  const { bucket: b, extras: x } = c;
  const d = deductions(b.items, c.pct, Boolean(c.options.prorrata?.special));
  const interior = d.out.interior;
  if (x.cash) {
    for (const r of CASH_RATES) {
      // The deduction of a purchase under cash accounting waits for the payment (art. 163 terdecies.Tres).
      const invoiced = cashMoney(x.cash.purchasesInvoiced, r);
      const paid = cashMoney(x.cash.purchasesPaid, r);
      interior.current[r].base += paid.base - invoiced.base;
      interior.current[r].vat += Math.round(((paid.vat - invoiced.vat) * c.pct) / 100);
    }
  }
  const pair = (r: ByRate): Money => total(r);
  const intraCurrent = add(pair(d.out.intraGoods.current), pair(d.out.intraServices.current));
  const deductionFix = fix(x.deductionFix);
  const intraFix = fix(x.intraFix);
  const fix40 = add(deductionFix, intraFix);
  const box42 = cents(x.reagp);
  const box43 = cents(x.investmentAdjust) + (c.annual?.box43 ?? 0);
  const box44 = c.annual?.box44 ?? 0;
  const groups: [string, string, string, Money][] = [
    ['28', '29', 'operaciones interiores corrientes', pair(interior.current)],
    ['30', '31', 'operaciones interiores con bienes de inversión', pair(interior.investment)],
    ['32', '33', 'importaciones de bienes corrientes', pair(d.out.import.current)],
    ['34', '35', 'importaciones de bienes de inversión', pair(d.out.import.investment)],
    ['36', '37', 'adquisiciones intracomunitarias de bienes y servicios corrientes', intraCurrent],
    [
      '38',
      '39',
      'adquisiciones intracomunitarias de bienes de inversión',
      pair(d.out.intraGoods.investment),
    ],
  ];
  // Box 45 = 29 + 31 + 33 + 35 + 37 + 39 + 41 + 42 + 43 + 44 [DR303].
  const c45 = sum(groups.map((g) => g[3].vat)) + fix40.vat + box42 + box43 + box44;
  const deductible: Box[] = [
    ...groups.flatMap(([base, fee, what, m]) => [
      box(base, `Base de las cuotas soportadas en ${what}`, m.base),
      box(fee, `Cuotas deducibles en ${what}`, m.vat),
    ]),
    box('40', 'Rectificación de deducciones: base', fix40.base),
    box('41', 'Rectificación de deducciones: cuota', fix40.vat),
    box('42', 'Compensaciones del régimen especial de agricultura, ganadería y pesca', box42),
    box('43', 'Regularización de bienes de inversión', box43),
    box('44', 'Regularización por aplicación del porcentaje definitivo de prorrata', box44),
    box('45', 'Total a deducir', c45),
  ];
  return { deductible, c45, d, deductionFix, intraFix, box42, box43, box44 };
}

/** One quarter: the four parts of the form and what the next quarter and the 390 take from it. */
function quarter303(c: QuarterContext): { draft: Draft303; detail: QuarterDetail } {
  const { bucket: b, extras: x, options: o } = c;
  const a = accruedOf(c);
  const dd = deductibleOf(c);
  const c46 = a.c27 - dd.c45;
  const cash62 = a.cashInvoiced;
  const cash74 = CASH_RATES.reduce(
    (m, r) => add(m, cashMoney(x.cash?.purchasesInvoiced, r)),
    money()
  );
  const info: Box[] = [
    box('59', 'Entregas intracomunitarias de bienes y servicios', b.other.intraEU),
    box('60', 'Exportaciones y operaciones asimiladas', b.other.export),
    box(
      '120',
      'Operaciones no sujetas por reglas de localización (salvo las de la 123)',
      b.other.notSubject
    ),
    box('122', 'Operaciones sujetas con inversión del sujeto pasivo', b.other.reverse),
    box(
      '123',
      'Operaciones no sujetas por reglas de localización acogidas a la ventanilla única',
      b.other.oss
    ),
    box('124', 'Operaciones sujetas y acogidas a la ventanilla única', b.other.ossSubject),
    box(
      '62',
      'Criterio de caja: base de las entregas devengadas por la regla general',
      cash62.base
    ),
    box(
      '63',
      'Criterio de caja: cuota de las entregas devengadas por la regla general',
      cash62.vat
    ),
    box('74', 'Criterio de caja: base de las adquisiciones', cash74.base),
    box('75', 'Criterio de caja: cuota soportada de las adquisiciones', cash74.vat),
  ];
  const box76 = cents(x.art80);
  // 64 = 46 + 58 + 76; the simplified regime (58) is not worked out here.
  const c64 = c46 + box76;
  const c66 = c64;
  const box77 = cents(x.importDeferred);
  const carried = c.pending.prior + sum(c.pending.year);
  const c110 = carried;
  const last = c.q === 3;
  const refund = Boolean(o.refund) && last;
  const skip = (o.skipOffset ?? []).includes(c.q);
  // To be refunded, all the VAT to offset goes in; otherwise as much as the result takes [I303 (6), (8)].
  const c78 = refund ? c110 : skip ? 0 : Math.min(c110, Math.max(0, c66 + box77));
  const c87 = c110 - c78;
  const c69 = c66 + box77 - c78;
  const c71 = c69;
  const box72 = c71 < 0 && !refund ? -c71 : 0;
  const box73 = c71 < 0 && refund ? -c71 : 0;
  const settlement: Box[] = [
    box('46', 'Resultado régimen general (27 − 45)', c46),
    box('76', 'Regularización de cuotas del art. 80.Cinco.5.ª LIVA', box76),
    box('64', 'Suma de resultados (46 + 58 + 76)', c64),
    rate('65', '% atribuible a la Administración del Estado', 100),
    box('66', 'Atribuible a la Administración del Estado', c66),
    box('77', 'IVA a la importación liquidado por la Aduana pendiente de ingreso', box77),
    box('110', 'Cuotas a compensar pendientes de periodos anteriores', c110),
    box('78', 'Cuotas a compensar de periodos anteriores aplicadas en este periodo', c78),
    box('87', 'Cuotas a compensar pendientes para periodos posteriores (110 − 78)', c87),
    box('69', 'Resultado de la autoliquidación (66 + 77 − 78)', c69),
    box('71', 'Resultado de la liquidación', c71),
    box('72', 'A compensar', box72),
    box('73', 'A devolver', box73),
  ];
  const all = [...a.accrued, ...dd.deductible, ...info, ...settlement];
  const noActivity =
    all.every(
      (bx) =>
        bx.amount === 0 ||
        ['151', '02', '05', '08', '157', '169', '20', '23', '65'].includes(bx.box)
    ) && c110 === 0;
  const result: Draft303['result'] = noActivity
    ? 'noActivity'
    : c71 > 0
    ? 'pay'
    : box73 > 0
    ? 'refund'
    : box72 > 0
    ? 'offset'
    : 'zero';
  // What was applied comes first from the oldest VAT to offset (the years before).
  const fromPrior = Math.min(c.pending.prior, c78);
  let rest = c78 - fromPrior;
  c.pending.prior -= fromPrior;
  c.pending.year = c.pending.year.map((p) => {
    const used = Math.min(p, rest);
    rest -= used;
    return p - used;
  });
  c.pending.year.push(box72);
  const warnings: VatWarning[] = [];
  if (box77 > 0) warnings.push('importDeferred');
  if (o.refund && !last) warnings.push('refundNotLast');
  if (skip && c110 > 0 && c66 + box77 > 0) warnings.push('offsetNotApplied');
  if (b.other.reverse > 0) warnings.push('reverseIssued');
  const detail: QuarterDetail = {
    ordinary: a.ordinary,
    cash: a.cash,
    cashInvoiced: a.cashInvoiced,
    intraGoods: b.intraGoods,
    intraServices: b.intraServices,
    reverse: a.reverse,
    salesFix: a.salesFix,
    salesFixPriorYear: cents(x.salesFix?.priorYear),
    re: a.re,
    reFix: a.reFix,
    deducted: dd.d.out,
    deductionFix: dd.deductionFix,
    intraFix: dd.intraFix,
    reagp: dd.box42,
    box43: dd.box43,
    box44: dd.box44,
    art80: box76,
    importDeferred: box77,
    other: b.other,
    nonDeductibleBase: b.nonDeductibleBase,
    result71: c71,
    box72,
    box73,
    box78: c78,
    fromPriorYears: fromPrior,
    pendingAtYearEnd: 0,
  };
  return {
    draft: {
      result,
      amountDue: euros(c71),
      accrued: a.accrued,
      deductible: dd.deductible,
      info,
      settlement,
      prorrata: c.pct,
      warnings,
    },
    detail,
  };
}

/** Regularisation of the investment goods of earlier years in the last return (arts. 107-109 LIVA). */
export function investmentRegularisation(
  year: number,
  options: VatOptions,
  definitive: number
): number {
  let out = 0;
  for (const good of options.investments ?? []) {
    const years = good.realEstate ? REAL_ESTATE_YEARS : INVESTMENT_YEARS;
    const elapsed = year - good.year;
    if (elapsed < 1 || elapsed > years) continue;
    if (Math.abs(definitive - good.pct) <= INVESTMENT_THRESHOLD) continue;
    // (deduction with this year's percentage − deduction made) ÷ 5, or ÷ 10 for land and buildings.
    out += Math.round((cents(good.vat) * (definitive - good.pct)) / 100 / (years + 1));
  }
  return out;
}

/**
 * The 303 of the four quarters of a year, in order, so each one starts with what the earlier ones
 * left to offset; the fourth one regularises the prorrata and the investment goods.
 */
export function vatYear(
  year: number,
  buckets: VatBucket[],
  extras: QuarterVat[],
  options: VatOptions,
  legacy: { quarter: number; pending: number } | null
): VatYear {
  const base = prorrataBase(buckets, extras);
  const exemptSales = base.total > base.withRight;
  const definitive = prorrataOf(base.withRight, base.total);
  const provisional = options.prorrata?.provisional ?? null;
  const special = Boolean(options.prorrata?.special);
  const pending = { prior: cents(options.offsetStart), year: [] as number[] };
  const out: VatYear['quarters'] = [];
  const pcts: number[] = [];
  for (let q = 0; q < 4; q++) {
    // Without the percentage of last year, the one of the operations so far is proposed (art. 105.Tres).
    const soFar = prorrataBase(buckets.slice(0, q + 1), extras.slice(0, q + 1));
    const pct =
      provisional !== null
        ? provisional
        : exemptSales
        ? prorrataOf(soFar.withRight, soFar.total)
        : 100;
    pcts.push(pct);
    let annual: QuarterContext['annual'] = null;
    if (q === 3) {
      // The deductions of the year at the definitive percentage (art. 105.Cuatro LIVA).
      const box44 = sum(
        buckets.map((b, i) =>
          Math.round((deductions(b.items, 100, special).prorrated * (definitive - pcts[i])) / 100)
        )
      );
      annual = { box44, box43: investmentRegularisation(year, options, definitive) };
    }
    // Older data gave box 110 of the viewed quarter itself: it replaces what was carried.
    if (legacy && legacy.quarter === q) {
      pending.prior = cents(legacy.pending);
      pending.year = pending.year.map(() => 0);
    }
    const result = quarter303({
      q,
      bucket: buckets[q],
      extras: extras[q] ?? {},
      pct,
      pending,
      options,
      annual,
    });
    out.push(result);
  }
  // The VAT generated in the first three quarters that is still to offset at the end of the year.
  pending.year.slice(0, 3).forEach((p, i) => (out[i].detail.pendingAtYearEnd = p));
  const draftWarnings = out.map((r) => r.draft.warnings);
  const general = sum(buckets.map((b) => deductions(b.items, definitive, false).general));
  const specialSum = sum(buckets.map((b) => deductions(b.items, definitive, true).special));
  draftWarnings.forEach((w, q) => {
    if (exemptSales && provisional === null) w.push('prorrataMissing');
    else if (exemptSales || (provisional !== null && provisional < 100)) w.push('prorrataApplied');
    if (provisional !== null && provisional < 100 && !exemptSales) w.push('exemptNoProrrata');
    // The special prorrata is compulsory when the general one deducts 10 % more (art. 103.Dos.2.º).
    const usesSet = buckets.some((b) => b.items.some((i) => i.use !== 'common'));
    if (
      q === 3 &&
      usesSet &&
      !options.prorrata?.special &&
      general > specialSum * (1 + SPECIAL_PRORRATA_EXCESS)
    )
      w.push('specialMandatory');
    if (options.regime === 'simplified') w.push('simplified');
    if (options.regime === 'reagp') w.push('reagp');
  });
  return {
    quarters: out,
    definitive: exemptSales || provisional !== null ? definitive : 100,
    prorrataBase: base,
  };
}
