import type { Key349, PurchaseOp, SaleOp } from './types';

/**
 * What an invoice of a book is for VAT, from the columns of the AEAT layout of the books [LSI] or a
 * free «Tipo de operación» column: an intra-EU supply, an export, a reverse charge, an import…
 *
 * [LSI] AEAT, diseños de registro normalizados de los libros registro de IVA e IRPF (LSI.xlsx, 2026)
 * and «Formato electrónico común de los libros registro» v18-02-2026 (checked on 19-10-2026):
 * - Issued: «Clave de Operación» 02 export, 07 cash accounting, 17 one-stop shop; «Calificación de la
 *   Operación» S1 taxed, S2 reverse charge, N1 not subject (art. 7), N2 not subject by the place-of-
 *   supply rules; «Operación Exenta» E1 art. 20, E2 art. 21, E3 art. 22, E4 arts. 23-24, E5 art. 25,
 *   E6 others; «Tipo de Recargo Eq.» / «Cuota Recargo Eq.» filled for a sale to a retailer in it.
 * - Received: «Clave de Operación» 09 intra-EU acquisition of goods and services, 13 import; «Tipo de
 *   Factura» F5 import (DUA); «Bien de Inversión» S/N; «Inversión del Sujeto Pasivo» S/N.
 */

/** VAT number prefixes of the 27 member states (Greece is «EL»), as the backend has them. */
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

/** A VAT number as the 349 takes it: capitals, no spaces, dots or dashes. */
export const normalVatId = (id: string): string => id.replace(/[\s.\-/]/g, '').toUpperCase();

/** A tax id of another member state («FR12345678901», «DE 123 456 789»). */
export const isEuVatId = (id: string | null | undefined): boolean => {
  const clean = normalVatId(id ?? '');
  return clean.length > 4 && EU_PREFIXES.includes(clean.slice(0, 2)) && /\d/.test(clean);
};

/** What the VAT columns of a row say, already as plain text. */
export interface VatCells {
  key: string;
  qualification: string;
  exempt: string;
  reverse: string;
  investment: string;
  invoiceType: string;
  free: string;
  key349: string;
  /** Equivalence surcharge rate or fee: a sale to a retailer in it. */
  surcharge: boolean;
  vatId: string;
}

/** «S», «Sí», «X», «1» or «true»: the column says yes. */
const yes = (text: string): boolean => /^(s|si|x|1|true|yes|y)$/.test(text);
/** The code of a cell: «02», «2», «02 - Exportación» → «02»; «S2», «E5»… as they are. */
const codeOf = (text: string): string => {
  const found = /^([a-z]?\d{1,2})\b/i.exec(text.trim());
  if (!found) return '';
  const code = found[1].toUpperCase();
  return /^\d$/.test(code) ? `0${code}` : code;
};

/** What a free text says the operation is, for an issued invoice: the first that fits wins. */
const SALE_TEXT: [(text: string) => boolean, SaleOp][] = [
  [(t) => /recargo/.test(t), 're'],
  [(t) => /inversion del sujeto pasivo|\bisp\b|reverse/.test(t), 'reverse'],
  [(t) => /intracomunitari|intra-?(ue|eu|comunitari)|art\.? ?25\b/.test(t), 'intraEU'],
  [(t) => /export|art\.? ?21\b/.test(t), 'export'],
  [(t) => /ventanilla|\boss\b/.test(t), 'oss'],
  [
    (t) => /no sujet.*(localiz|art\.? ?(69|70|72))|localizacion|fuera de (la )?(ue|union)/.test(t),
    'notSubject',
  ],
  [(t) => /no sujet/.test(t), 'nonVat'],
  [(t) => /inmueble|no habitual|financier/.test(t) && /exent/.test(t), 'exemptOccasional'],
  [(t) => /exent|art\.? ?20\b/.test(t), 'exempt'],
];

/** The cause of exemption of the AEAT books [LSI]: E1 art. 20, E2-E4 arts. 21-24, E5 art. 25. */
const EXEMPT: Record<string, SaleOp> = {
  E1: 'exempt',
  E2: 'export',
  E3: 'export',
  E4: 'export',
  E5: 'intraEU',
  E6: 'exempt',
};

/** What the qualification says: S2 reverse charge, N1 not subject (art. 7), N2 by the place of supply. */
function qualifiedOp(c: VatCells, key: string): SaleOp | null {
  switch (codeOf(c.qualification)) {
    case 'S2':
      return 'reverse';
    case 'N1':
      return 'nonVat';
    case 'N2':
      if (key === '17') return 'oss';
      // A service to a business of another member state is an intra-EU service (box 59) [I303].
      return isEuVatId(c.vatId) ? 'intraEU' : 'notSubject';
    default:
      return null;
  }
}

/** What a row of the issued book is for VAT (`domestic` when nothing says otherwise). */
export function saleOpOf(c: VatCells): SaleOp {
  const key = codeOf(c.key);
  if (c.surcharge) return 're';
  const op = EXEMPT[codeOf(c.exempt)] ?? qualifiedOp(c, key);
  if (op) return op;
  if (key === '02') return 'export';
  if (key === '17') return 'ossSubject';
  return SALE_TEXT.find(([test]) => test(c.free))?.[1] ?? 'domestic';
}

/** What a row of the received book is for VAT. `services` says an intra-EU purchase is a service. */
export function purchaseOpOf(c: VatCells, services: boolean): PurchaseOp {
  const key = codeOf(c.key);
  const intra = (): PurchaseOp => (services ? 'intraServices' : 'intraGoods');
  if (key === '09') return intra();
  if (key === '13' || /^f5$/.test(c.invoiceType.trim())) return 'import';
  if (yes(c.reverse)) return 'reverse';
  const text = c.free;
  if (/import|\bdua\b/.test(text)) return 'import';
  if (/inversion del sujeto pasivo|\bisp\b|reverse/.test(text) && !isEuVatId(c.vatId))
    return 'reverse';
  if (/intracomunitari|intra-?(ue|eu|comunitari)|reverse|inversion del sujeto pasivo/.test(text))
    return /servicio/.test(text) ? 'intraServices' : intra();
  return 'domestic';
}

/** «Bien de inversión»: S, Sí, X… */
export const investmentOf = (c: VatCells): boolean =>
  yes(c.investment) || /bien de inversion/.test(c.free);

/** Cash accounting (key 07): the VAT is due when collected [LSI]. */
export const cashOf = (c: VatCells): boolean =>
  codeOf(c.key) === '07' || /criterio de caja/.test(c.free);

const KEYS: Key349[] = ['E', 'M', 'H', 'A', 'T', 'S', 'I', 'R', 'D', 'C'];

/**
 * The key of the 349 of an intra-EU operation: the one the book gives, or the usual one of the
 * operation (E supply of goods, S service rendered, A acquisition of goods, I service received).
 */
export function key349Of(c: VatCells, op: SaleOp | PurchaseOp, services: boolean): Key349 | null {
  const given = c.key349.trim().toUpperCase();
  if ((KEYS as string[]).includes(given)) return given as Key349;
  if (op === 'intraEU') return codeOf(c.qualification) === 'N2' || services ? 'S' : 'E';
  if (op === 'intraGoods') return 'A';
  if (op === 'intraServices') return 'I';
  return null;
}

// ─── The VAT of the invoices of a quarter ────────────────────────────────────

/** The box of the 303 each sale without Spanish VAT goes to, as the form field it fills. */
export const SALES_FIELD: Partial<Record<SaleOp, string>> = {
  intraEU: 'intraEU',
  export: 'exports',
  notSubject: 'notSubject',
  oss: 'oss',
  ossSubject: 'ossSubject',
  reverse: 'reverse',
  exempt: 'exempt',
  exemptOccasional: 'exemptOccasional',
  nonVat: 'nonVat',
};

/** An invoice as the VAT of its quarter needs it (a book entry, or an imported invoice). */
export interface VatEntry {
  quarter: 1 | 2 | 3 | 4;
  base: number;
  vatRate: number;
  concept: string;
  op?: SaleOp | PurchaseOp;
  vatId?: string;
  key349?: Key349;
  cash?: boolean;
}

export interface QuarterVatOfBook {
  /** Bases of the sales without Spanish VAT, by form field. */
  sales: Record<string, number>;
  /** Bases sold to retailers in the surcharge, by rate. */
  re: { r21: number; r10: number; r4: number };
  /** Operations of the 349, one per invoice (the 349 adds them up by operator and key). */
  intra: { key: Key349; vatId: string; name: string; base: number }[];
  /** Bases invoiced under cash accounting, by rate. */
  cash: { r21: number; r10: number; r4: number };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const DEFAULT_KEY: Partial<Record<SaleOp | PurchaseOp, Key349>> = {
  intraEU: 'E',
  intraGoods: 'A',
  intraServices: 'I',
};

/** The key of the 349 of an intra-EU invoice (its own, or the usual one), none for the others. */
export const intraKeyOf = (e: Pick<VatEntry, 'op' | 'key349'>): Key349 | null => {
  const usual = e.op ? DEFAULT_KEY[e.op] : undefined;
  if (!usual) return null;
  // A supply's own key can be E, M, H, S, T…; an acquisition's, A or I.
  const fits =
    e.key349 && (usual === 'E' ? !['A', 'I'].includes(e.key349) : ['A', 'I'].includes(e.key349));
  return fits ? (e.key349 as Key349) : usual;
};

/** The VAT parts of each quarter of the invoices of one book. */
export function vatByQuarter(
  entries: VatEntry[]
): Partial<Record<1 | 2 | 3 | 4, QuarterVatOfBook>> {
  const out: Partial<Record<1 | 2 | 3 | 4, QuarterVatOfBook>> = {};
  for (const e of entries) {
    addEntry(
      (out[e.quarter] ??= {
        sales: {},
        re: { r21: 0, r10: 0, r4: 0 },
        intra: [],
        cash: { r21: 0, r10: 0, r4: 0 },
      }),
      e
    );
  }
  return out;
}

/** One invoice into the VAT parts of its quarter. */
function addEntry(q: QuarterVatOfBook, e: VatEntry): void {
  const field = SALES_FIELD[e.op as SaleOp];
  if (field) q.sales[field] = round2((q.sales[field] ?? 0) + e.base);
  const rate = `r${e.vatRate}` as 'r21' | 'r10' | 'r4';
  const atRate = rate in q.re;
  if (e.op === 're' && atRate) q.re[rate] = round2(q.re[rate] + e.base);
  if (e.cash && atRate) q.cash[rate] = round2(q.cash[rate] + e.base);
  const key = intraKeyOf(e);
  if (key) q.intra.push({ key, vatId: e.vatId ?? '', name: e.concept, base: e.base });
}
