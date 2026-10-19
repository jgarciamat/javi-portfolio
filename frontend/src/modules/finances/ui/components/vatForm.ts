import { parseDecimal } from '@shared/utils/numbers';
import type {
  CashRates,
  IntraOp,
  Key349,
  ManualSales,
  QuarterVat,
  VatOptions,
} from '@modules/finances/domain/types';

/**
 * The VAT of a quarter beyond the invoices with VAT, as the person types it (text, so the fields can be
 * edited freely), and the options of the VAT of the year. Older data has none of it: every part is
 * optional and an empty one is the same as none.
 */

export const SALES_FIELDS = [
  'intraEU',
  'exports',
  'notSubject',
  'oss',
  'ossSubject',
  'reverse',
  'exempt',
  'exemptOccasional',
  'nonVat',
] as const;
export type SalesField = (typeof SALES_FIELDS)[number];
export const RE_FIELDS = ['r21', 'r10', 'r4', 'tobacco'] as const;
export const CASH_FIELDS = ['invoiced', 'collected', 'purchasesInvoiced', 'purchasesPaid'] as const;
export const CASH_RATES = ['r21', 'r10', 'r4'] as const;
/** One-off amounts of the quarter, each in its box (42, 43, 76, 77). */
export const ONE_OFF_FIELDS = ['reagp', 'investmentAdjust', 'art80', 'importDeferred'] as const;

type Pair<A extends string, B extends string> = Record<A | B, string>;

export interface IntraRow {
  key: Key349;
  vatId: string;
  name: string;
  base: string;
  /** A correction of an earlier period: its year, quarter and what was declared then. */
  rect: boolean;
  rectYear: string;
  rectQuarter: string;
  previous: string;
}

export interface VatForm {
  sales: Record<SalesField, string>;
  re: Record<(typeof RE_FIELDS)[number], string>;
  salesFix: Pair<'base' | 'vat', 'priorYear'>;
  reFix: Pair<'base', 'fee'>;
  deductionFix: Pair<'base', 'vat'>;
  intraFix: Pair<'base', 'vat'>;
  oneOff: Record<(typeof ONE_OFF_FIELDS)[number], string>;
  cash: Record<(typeof CASH_FIELDS)[number], Record<(typeof CASH_RATES)[number], string>>;
  intra: IntraRow[];
}

const blank = <K extends string>(keys: readonly K[]): Record<K, string> =>
  Object.fromEntries(keys.map((k) => [k, ''])) as Record<K, string>;

export const emptyVat = (): VatForm => ({
  sales: blank(SALES_FIELDS),
  re: blank(RE_FIELDS),
  salesFix: { base: '', vat: '', priorYear: '' },
  reFix: { base: '', fee: '' },
  deductionFix: { base: '', vat: '' },
  intraFix: { base: '', vat: '' },
  oneOff: blank(ONE_OFF_FIELDS),
  cash: {
    invoiced: blank(CASH_RATES),
    collected: blank(CASH_RATES),
    purchasesInvoiced: blank(CASH_RATES),
    purchasesPaid: blank(CASH_RATES),
  },
  intra: [],
});

export const emptyIntra = (key: Key349 = 'E'): IntraRow => ({
  key,
  vatId: '',
  name: '',
  base: '',
  rect: false,
  rectYear: '',
  rectQuarter: '',
  previous: '',
});

/** The VAT of a quarter with what older data lacks filled in empty. */
export function vatOfForm(form: Partial<VatForm> | undefined | null): VatForm {
  const empty = emptyVat();
  if (!form) return empty;
  return {
    sales: { ...empty.sales, ...form.sales },
    re: { ...empty.re, ...form.re },
    salesFix: { ...empty.salesFix, ...form.salesFix },
    reFix: { ...empty.reFix, ...form.reFix },
    deductionFix: { ...empty.deductionFix, ...form.deductionFix },
    intraFix: { ...empty.intraFix, ...form.intraFix },
    oneOff: { ...empty.oneOff, ...form.oneOff },
    cash: {
      invoiced: { ...empty.cash.invoiced, ...form.cash?.invoiced },
      collected: { ...empty.cash.collected, ...form.cash?.collected },
      purchasesInvoiced: { ...empty.cash.purchasesInvoiced, ...form.cash?.purchasesInvoiced },
      purchasesPaid: { ...empty.cash.purchasesPaid, ...form.cash?.purchasesPaid },
    },
    intra: (form.intra ?? []).map((r) => ({ ...emptyIntra(), ...r })),
  };
}

/** Nothing typed: the quarter has no VAT beyond its invoices with VAT. */
export const isEmptyVat = (form: Partial<VatForm> | undefined | null): boolean =>
  JSON.stringify(vatOfForm(form)) === JSON.stringify(emptyVat());

/** A positive amount (0 when empty or not a number). */
const amount = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
/** An amount that can be negative: corrections and regularisations. */
const signed = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pick = <T extends Record<string, number>>(values: T): T | null =>
  Object.values(values).some((v) => v !== 0) ? values : null;

const cashRates = (r: Record<(typeof CASH_RATES)[number], string>): CashRates => ({
  r21: amount(r.r21),
  r10: amount(r.r10),
  r4: amount(r.r4),
});

function intraOf(row: IntraRow): IntraOp | null {
  const base = signed(row.base);
  if (base === 0 && row.vatId.trim() === '' && row.name.trim() === '') return null;
  const quarter = Number(row.rectQuarter);
  return {
    key: row.key,
    vatId: row.vatId.trim(),
    name: row.name.trim(),
    base,
    ...(row.rect && [1, 2, 3, 4].includes(quarter)
      ? {
          rectifies: {
            year: Math.floor(amount(row.rectYear)),
            quarter: quarter as 1 | 2 | 3 | 4,
            previous: signed(row.previous),
          },
        }
      : {}),
  };
}

const SALES_OF = (v: VatForm) =>
  pick(
    Object.fromEntries(SALES_FIELDS.map((f) => [f, amount(v.sales[f])])) as Record<
      SalesField,
      number
    >
  );

/** The corrections of a quarter that have something (signed amounts). */
function fixesOf(v: VatForm): Partial<QuarterVat> {
  const out: Partial<QuarterVat> = {};
  const re = pick({
    r21: amount(v.re.r21),
    r10: amount(v.re.r10),
    r4: amount(v.re.r4),
    tobacco: amount(v.re.tobacco),
  });
  if (re) out.re = re;
  const salesFix = pick({
    base: signed(v.salesFix.base),
    vat: signed(v.salesFix.vat),
    priorYear: signed(v.salesFix.priorYear),
  });
  if (salesFix) out.salesFix = salesFix;
  const reFix = pick({ base: signed(v.reFix.base), fee: signed(v.reFix.fee) });
  if (reFix) out.reFix = reFix;
  const deductionFix = pick({ base: signed(v.deductionFix.base), vat: signed(v.deductionFix.vat) });
  if (deductionFix) out.deductionFix = deductionFix;
  const intraFix = pick({ base: signed(v.intraFix.base), vat: signed(v.intraFix.vat) });
  if (intraFix) out.intraFix = intraFix;
  return out;
}

/** The one-off boxes (42, 43, 76, 77) that have an amount; 43 can be negative. */
function oneOffOf(v: VatForm): Partial<QuarterVat> {
  const values = {
    reagp: amount(v.oneOff.reagp),
    investmentAdjust: signed(v.oneOff.investmentAdjust),
    art80: amount(v.oneOff.art80),
    importDeferred: amount(v.oneOff.importDeferred),
  };
  return Object.fromEntries(Object.entries(values).filter(([, n]) => n !== 0));
}

/** Cash accounting: invoiced, collected and paid by rate, when any of them has something. */
function cashOf(v: VatForm): Partial<QuarterVat> {
  const cash = {
    invoiced: cashRates(v.cash.invoiced),
    collected: cashRates(v.cash.collected),
    purchasesInvoiced: cashRates(v.cash.purchasesInvoiced),
    purchasesPaid: cashRates(v.cash.purchasesPaid),
  };
  return Object.values(cash).some((r) => r.r21 + r.r10 + r.r4 > 0) ? { cash } : {};
}

/** The VAT of a quarter as the server takes it (null when there is none). */
export function toQuarterVat(form: Partial<VatForm> | undefined | null): QuarterVat | null {
  if (isEmptyVat(form)) return null;
  const v = vatOfForm(form);
  const sales = SALES_OF(v);
  const intra = v.intra.map(intraOf).filter((o): o is IntraOp => o !== null);
  return {
    ...(sales ? { sales: sales as ManualSales } : {}),
    ...fixesOf(v),
    ...oneOffOf(v),
    ...cashOf(v),
    ...(intra.length > 0 ? { intra } : {}),
  };
}

// ─── The VAT of the year ─────────────────────────────────────────────────────

export interface InvestmentRow {
  year: string;
  vat: string;
  pct: string;
  realEstate: boolean;
}

export interface VatExtras {
  /** Definitive prorrata of last year (provisional for this one, art. 105 LIVA); empty: none. */
  provisional: string;
  special: boolean;
  /** Fourth quarter: ask for the refund instead of carrying it on. */
  refund: boolean;
  /** Quarters (1-4) in which the VAT to offset is not applied. */
  skip: number[];
  regime: 'general' | 'simplified' | 'reagp';
  reagpVolume: string;
  /** Cash accounting: its fields are shown in the quarters. */
  cashBasis: boolean;
  investments: InvestmentRow[];
}

export const NO_VAT_EXTRAS: VatExtras = {
  provisional: '',
  special: false,
  refund: false,
  skip: [],
  regime: 'general',
  reagpVolume: '',
  cashBasis: false,
  investments: [],
};

export const vatExtrasOf = (v: Partial<VatExtras> | undefined | null): VatExtras => ({
  ...NO_VAT_EXTRAS,
  ...v,
});

/** The prorrata: the percentage of last year (0-100) and whether the special one applies. */
function prorrataOf(v: VatExtras): Pick<VatOptions, 'prorrata'> {
  const provisional = parseDecimal(v.provisional);
  const valid = Number.isFinite(provisional) && provisional >= 0 && provisional <= 100;
  if (!valid && !v.special) return {};
  return { prorrata: { provisional: valid ? provisional : null, special: v.special } };
}

/**
 * The options of the VAT of the year as the server takes them. `toOffset` is what was left to offset
 * at the start of the year; `filed` the results of the 303 already filed, by quarter.
 */
export function toVatOptions(
  extras: Partial<VatExtras> | undefined | null,
  toOffset: number,
  filed: (number | null)[]
): VatOptions {
  const v = vatExtrasOf(extras);
  const investments = v.investments
    .map((i) => ({
      year: Math.floor(amount(i.year)),
      vat: amount(i.vat),
      pct: Math.min(100, amount(i.pct)),
      realEstate: i.realEstate,
    }))
    .filter((i) => i.year > 0 && i.vat > 0);
  return {
    offsetStart: toOffset,
    ...prorrataOf(v),
    ...(investments.length > 0 ? { investments } : {}),
    ...(v.skip.length > 0 ? { skipOffset: v.skip.map((q) => q - 1) } : {}),
    ...(v.refund ? { refund: true } : {}),
    ...(filed.some((f) => f !== null) ? { filed } : {}),
    ...(amount(v.reagpVolume) > 0 ? { reagpVolume: amount(v.reagpVolume) } : {}),
    ...(v.regime !== 'general' ? { regime: v.regime } : {}),
  };
}
