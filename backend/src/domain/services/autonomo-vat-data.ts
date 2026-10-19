/**
 * The VAT family of a sole trader in the general regime (Spain): what each operation is, the rates and
 * the inputs of the modelos 303, 349 and 390. Rules and boxes come from (all checked on 19-10-2026):
 *
 * - [DR303] AEAT, diseño de registro del modelo 303 para 2026, v1.01 (DR303e26v101.xlsx, «Diseños de
 *   registro 300-399»): the boxes and the formulas of 27, 45, 46, 64, 69 and 71. Boxes 153-155, 165-167
 *   and 16-18 carry the constant rate «00000» in 2026: no rate uses them, so they are left out.
 * - [I303] AEAT, instrucciones del modelo 303 2026 (01-1T and 02-12/2T-4T, page updated 09-06-2026).
 * - [DR390] AEAT, diseño de registro del modelo 390 del ejercicio 2025, v1.02 (dr390e2025.xlsx): the one
 *   for 2026 is not published yet (it is filed in January 2027), so the 2025 boxes are used.
 * - [I390] AEAT, Instrucciones_modelo_390-2025.pdf (formulas of 33, 34, 47, 64, 84, 86 and 108).
 * - [DR349] AEAT, DR_Anexo_349.pdf and [I349] instr_mod_349.pdf: keys, records and deadlines.
 * - [LIVA] Ley 37/1992 del IVA (BOE-A-1992-28740, consolidated text): arts. 25 (intra-EU supplies),
 *   84 (reverse charge), 91 (rates), 102-106 (prorrata), 107-110 (investment goods), 161 (equivalence
 *   surcharge) and 163 terdecies-quinquiesdecies (cash accounting).
 * - [LSI] AEAT, diseños de registro normalizados de los libros registro de IVA e IRPF 2026 (LSI.xlsx) and
 *   «Formato electrónico común de los libros registro» v18-02-2026: keys of the operations (Clave de
 *   Operación 02, 07, 09, 13, 17…), qualification S1/S2/N1/N2 and exemption causes E1-E6. Its note 39
 *   allows only the 0, 4, 10 and 21 % rates from 2025 (5 % and 2 % only to correct older operations).
 * - [MIVA] Manual práctico de IVA 2025 (AEAT), chapter 9: the worked 303/390/349 cases of
 *   docs/casos-practicos/oficiales.json (303-01 to 303-04, 390-01, 390-02, 349-01, 349-02).
 */
import { VatRate } from '@domain/ports/repositories';

/** What an issued invoice is for VAT. `domestic` (default) is a sale with Spanish VAT. */
export const SALE_OPS = [
  'domestic',
  // Sale with VAT to a retailer in the equivalence surcharge (art. 154 LIVA): VAT box plus 16-24.
  're',
  // Exempt intra-EU supply of goods (art. 25 LIVA) or intra-EU service: box 59 and modelo 349.
  'intraEU',
  // Export and assimilated (arts. 21-24 LIVA): box 60.
  'export',
  // Not subject by the place-of-supply rules (box 120), e.g. a service to a business outside the EU.
  'notSubject',
  // Not subject and declared in the EU one-stop shop (box 123), subject and in it (box 124).
  'oss',
  'ossSubject',
  // Subject with reverse charge: the customer pays the VAT (art. 84.Uno.2.º; box 122).
  'reverse',
  // Exempt without the right to deduct (art. 20 LIVA): no box in the 303, it brings the prorrata.
  'exempt',
  // Exempt property or financial operation that is not the usual activity (art. 104.Tres.4.º).
  'exemptOccasional',
  // Not subject to VAT by art. 7 LIVA (e.g. a whole business transferred): income, no box (N1 in [LSI]).
  'nonVat',
] as const;
export type SaleOp = (typeof SALE_OPS)[number];

/** What a received invoice is for VAT. `domestic` (default) is a purchase with Spanish VAT. */
export const PURCHASE_OPS = [
  'domestic',
  // Intra-EU acquisition of goods: self-assessed VAT (boxes 10-11) and deducted (36-39).
  'intraGoods',
  // Service from a business of another EU country: boxes 10-11 and 36-37 too.
  'intraServices',
  // Other reverse charge (art. 84.Uno.2.º and 4.º: non-EU services, construction, gold…): 12-13.
  'reverse',
  // Import: the VAT the customs office settled (DUA), deducted in 32-35.
  'import',
] as const;
export type PurchaseOp = (typeof PURCHASE_OPS)[number];

/** What a received invoice is used for, for the special prorrata (art. 106 LIVA). */
export const DEDUCTION_USES = ['common', 'taxed', 'exempt'] as const;
export type DeductionUse = (typeof DEDUCTION_USES)[number];

/** Keys of the modelo 349 [DR349, record type 2, position 133]. */
export const KEYS_349 = ['E', 'M', 'H', 'A', 'T', 'S', 'I', 'R', 'D', 'C'] as const;
export type Key349 = (typeof KEYS_349)[number];
/** Keys that are supplies of goods or services (they decide a monthly 349 over 50,000 €) [I349]. */
export const SUPPLY_KEYS: Key349[] = ['E', 'M', 'H', 'T', 'S'];
/** Keys that the 303 shows in box 59 (art. 25 supplies and intra-EU services) [I303, box 59]. */
export const KEYS_59: Key349[] = ['E', 'M', 'H', 'S'];
/** Keys of the acquisitions that the 303 shows in box 10 [I303, boxes 10-11]. */
export const KEYS_10: Key349[] = ['A', 'I'];
/** Quarterly 349 while the supplies stay at or under this in the quarter and the four before [I349]. */
export const M349_QUARTERLY_LIMIT = 50000;

/** VAT number prefixes of the 27 member states (Greece is «EL») [DR349, page 8, without the UK]. */
export const EU_PREFIXES = [
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'EL',
  'FI',
  'FR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
];

/** Equivalence surcharge by VAT rate (art. 161 LIVA) and its boxes in the 2026 303 [DR303]. */
export const RE_RATES: { vat: 21 | 10 | 4; rate: number; boxes: [string, string, string] }[] = [
  { vat: 21, rate: 5.2, boxes: ['22', '23', '24'] },
  { vat: 10, rate: 1.4, boxes: ['19', '20', '21'] },
  { vat: 4, rate: 0.5, boxes: ['168', '169', '170'] },
];
/** Tobacco: 1.75 % (art. 161.4.º LIVA), boxes 156-158. */
export const RE_TOBACCO = 1.75;

/** Investment goods: worth at least 500,000 pesetas (art. 108.Dos.5.º LIVA). */
export const INVESTMENT_MIN = 3005.06;
/** Regularised over 4 years after the purchase, 9 for land and buildings (art. 107 LIVA)… */
export const INVESTMENT_YEARS = 4;
export const REAL_ESTATE_YEARS = 9;
/** …dividing by 5 or 10 (art. 109.3.º), only when the percentages differ by more than 10 points. */
export const INVESTMENT_THRESHOLD = 10;
/** The special prorrata is compulsory when the general one deducts 10 % more (art. 103.Dos.2.º). */
export const SPECIAL_PRORRATA_EXCESS = 0.1;

/** One operation of the 349, as typed or worked out from the invoices (euros). */
export interface IntraOp {
  key: Key349;
  /** VAT number with its country prefix (FR12345678901). */
  vatId: string;
  name: string;
  base: number;
  /** A correction of an earlier period: the new total of that period and what was declared then. */
  rectifies?: { year: number; quarter: 1 | 2 | 3 | 4; previous: number } | null;
}

/** By rate: what was invoiced and what was collected (cash accounting), bases in euros. */
export interface CashRates {
  r21: number;
  r10: number;
  r4: number;
}

/**
 * What the VAT of a quarter needs besides the invoices (euros; the corrections can be negative).
 * Everything is optional: older data has none of it.
 */
export interface QuarterVat {
  /** Bases sold to retailers in the equivalence surcharge (part of the income at that rate). */
  re?: { r21?: number; r10?: number; r4?: number; tobacco?: number } | null;
  /** Credit notes and other changes of the VAT charged (art. 80 LIVA, boxes 14-15). */
  salesFix?: { base: number; vat: number; priorYear?: number } | null;
  /** Changes of the surcharge charged (boxes 25-26). */
  reFix?: { base: number; fee: number } | null;
  /** Corrections of the VAT deducted in domestic purchases or imports (boxes 40-41). */
  deductionFix?: { base: number; vat: number } | null;
  /** Corrections of the VAT deducted in intra-EU acquisitions (boxes 40-41 too). */
  intraFix?: { base: number; vat: number } | null;
  /** Flat-rate compensations paid to farmers in the special agricultural regime (box 42). */
  reagp?: number;
  /** Regularisation of investment goods worked out by hand, e.g. one sold (art. 110; box 43). */
  investmentAdjust?: number;
  /** VAT owed after a customer's unpaid invoice was modified, with prorrata (box 76). */
  art80?: number;
  /** Import VAT settled by customs and deferred to this return (art. 74.1 RIVA; box 77). */
  importDeferred?: number;
  /** Cash accounting (arts. 163 terdecies-quinquiesdecies): bases by invoice and by payment. */
  cash?: {
    invoiced: CashRates;
    collected: CashRates;
    purchasesInvoiced: CashRates;
    purchasesPaid: CashRates;
  } | null;
  /** Intra-EU operations of the 349 (with the VAT number of the other party). */
  intra?: IntraOp[];
}

/** An investment good bought in an earlier year, for the regularisation of box 43 (euros). */
export interface InvestmentGood {
  year: number;
  /** VAT borne on it. */
  vat: number;
  /** Percentage deducted in the year it was bought (the definitive prorrata of that year). */
  pct: number;
  /** Land or a building: regularised over 9 years and divided by 10. */
  realEstate: boolean;
}

/** The options of the VAT of the year. */
export interface VatOptions {
  /** Exempt sales without the right to deduct: the prorrata (art. 102-106 LIVA). */
  prorrata?: { provisional: number | null; special: boolean } | null;
  investments?: InvestmentGood[];
  /**
   * VAT to offset left from the earlier years (box 110 of the first quarter): the quarters carry it
   * on. Absent in older data, which gave box 110 of the viewed quarter in `vatToOffset`.
   */
  offsetStart?: number | null;
  /** Quarters (0-3) in which the person chose not to apply the VAT to offset (box 78 empty). */
  skipOffset?: number[];
  /** Fourth quarter: ask for the refund instead of carrying it to next year. */
  refund?: boolean;
  /** Results (box 71) of the 303 already filed, by quarter, to reconcile the 390 with them. */
  filed?: (number | null)[];
  /** Income of an activity in the special agricultural regime (box 101 of the 390). */
  reagpVolume?: number;
  /** Simplified regime (módulos) or agricultural regime: only warned about, not worked out. */
  regime?: 'general' | 'simplified' | 'reagp';
}

export type CashRate = 21 | 10 | 4;
export const CASH_RATES: CashRate[] = [21, 10, 4];
export const RATES: VatRate[] = [0, 4, 10, 21];
