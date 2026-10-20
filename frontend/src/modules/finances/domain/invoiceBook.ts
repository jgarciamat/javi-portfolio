import { parseBookDate } from './excelDates';
import type { ExpenseKind, Key349, PurchaseOp, SaleOp, VatRate } from './types';
import {
  cashOf,
  investmentOf,
  isEuVatId,
  key349Of,
  normalVatId,
  purchaseOpOf,
  saleOpOf,
  type VatCells,
} from './vatBook';

/**
 * Invoice books (issued and received) kept in a spreadsheet: the AEAT-style layout that gestorías and
 * Quipu hand out (two header lines, «Base Imponible», «Tipo de IVA», «Importe Retenido del IRPF»…) and
 * any simple sheet with a date, a base and a VAT rate. They fill the self-employed draft by quarter.
 */

export type BookKind = 'issued' | 'received';
export type BookCell = string | number | null | undefined;

export interface BookEntry {
  date: string;
  quarter: 1 | 2 | 3 | 4;
  /** Amount without VAT (negative for a credit note). */
  base: number;
  vatRate: VatRate;
  vat: number;
  /** Base plus VAT. */
  total: number;
  /** IRPF withheld by the client (issued invoices only). */
  withheld: number;
  /**
   * IRPF the person withheld from the supplier (received invoices of a book that has a withholding
   * column): it goes to the modelo 111 or 115, not to the draft of the 130.
   */
  retention?: number;
  /** The supplier's tax id (NIF/CIF), when the book has the column: it tells two suppliers apart. */
  nif?: string;
  /** Who or what: the client, the supplier or the concept. */
  concept: string;
  /** The quarter a «Periodo/Trimestre» column says it belongs to (only when the book has one). */
  period?: 1 | 2 | 3 | 4 | null;
  /** What it is for VAT, when it is not a plain domestic operation (see vatBook.ts). */
  op?: SaleOp | PurchaseOp;
  /** An investment good (received book, «Bien de inversión»). */
  investment?: boolean;
  /** The VAT number of the other party of an intra-EU operation, and its key of the 349. */
  vatId?: string;
  key349?: Key349;
  /** Under cash accounting (key 07): the VAT is due when collected or paid. */
  cash?: boolean;
  /** The book gave no VAT rate for a purchase that self-assesses it: 21 % was assumed. */
  rateGuessed?: boolean;
}

/** Rows that did not make it into the result, and why. */
export interface BookSkipped {
  /** Dated in another year than the draft. */
  year: number;
  /** A VAT rate the draft does not take (only 0, 4, 10 and 21 %). */
  rate: number;
  /** No usable amount. */
  amount: number;
}

export interface BookResult {
  entries: BookEntry[];
  skipped: BookSkipped;
}

export type BookParse =
  { ok: true; result: BookResult } | { ok: false; reason: 'noHeader' | 'noColumns' };

const RATES: VatRate[] = [0, 4, 10, 21];

const norm = (value: BookCell): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "1.234,56" / "1,234.56" / "12,5" / "1.234" as a plain JS number string. */
function plainNumber(text: string): string {
  const dot = text.lastIndexOf('.');
  const comma = text.lastIndexOf(',');
  // The separator that comes last is the decimal one.
  if (dot >= 0 && comma >= 0) {
    return dot > comma ? text.replace(/,/g, '') : text.replace(/\./g, '').replace(',', '.');
  }
  if (comma >= 0) return text.replace(',', '.');
  return /^[+-]?\d{1,3}(\.\d{3})+$/.test(text) ? text.replace(/\./g, '') : text;
}

/** A number as typed in Spain or elsewhere: "1.234,56 €", "1,234.56", "21%", 1234.56. NaN when it is none. */
export function bookNumber(value: BookCell): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;
  const text = value.replace(/[€$£%\s\u00a0]/g, '').replace(/[^\d.,+-]/g, '');
  return /\d/.test(text) ? Number(plainNumber(text)) : NaN;
}

interface Columns {
  date: number;
  base: number;
  rate: number;
  vat: number;
  retentionRate: number;
  retention: number;
  total: number;
  concept: number;
  period: number;
  nif: number;
  key: number;
  qualification: number;
  exempt: number;
  reRate: number;
  reFee: number;
  investment: number;
  reverse: number;
  invoiceType: number;
  opType: number;
  key349: number;
  vatId: number;
  country: number;
  idNumber: number;
}

type Matcher = { include: RegExp[]; exclude?: RegExp };

const MATCHERS: Record<keyof Columns, Matcher[]> = {
  date: [
    {
      include: [/fecha expedicion/, /fecha (de )?(la )?factura/, /fecha emision/],
      exclude: /cobro|pago/,
    },
    { include: [/^fecha$/], exclude: /cobro|pago/ },
    { include: [/fecha operacion/], exclude: /cobro|pago/ },
    { include: [/fecha/], exclude: /cobro|pago|recepcion|vencimiento|deduccion/ },
  ],
  base: [
    { include: [/base imponible/, /base sin iva/, /importe sin iva/, /^base$/], exclude: /exent/ },
    { include: [/neto/] },
  ],
  rate: [
    {
      include: [/tipo (de )?(iva|impositivo)/, /% ?iva/, /iva ?%/, /^iva ?\(?%\)?$/],
      exclude: /recargo|retencion|irpf/,
    },
  ],
  vat: [
    {
      include: [
        /cuota iva (repercutida|soportada|soportado)/,
        /iva (repercutido|soportado)/,
        /cuota (repercutida|soportada)/,
        /cuota iva/,
        /^iva$/,
      ],
      exclude: /recargo|deducible|retencion|tipo|%/,
    },
  ],
  retentionRate: [
    {
      include: [/tipo retencion/, /% ?(irpf|retencion)/, /(irpf|retencion) ?%/],
      exclude: /importe/,
    },
  ],
  retention: [
    {
      include: [
        /importe retenido/,
        /retencion irpf/,
        /irpf retenido/,
        /^retencion$/,
        /^irpf$/,
        /retencion/,
      ],
      exclude: /tipo|%/,
    },
  ],
  total: [{ include: [/total factura/, /^total$/, /importe total/] }],
  concept: [
    {
      include: [/nombre (destinatario|expedidor)/, /cliente/, /proveedor/, /descripcion/, /nombre/],
      exclude: /\bnif\b|\bcif\b/,
    },
    { include: [/concepto/] },
  ],
  period: [{ include: [/trimestre/, /periodo/], exclude: /fecha|ejercicio|deduccion/ }],
  nif: [{ include: [/\bnif\b/, /\bcif\b/, /\bn\.i\.f\b/], exclude: /iva|vat|intracom/ }],
  // The VAT columns of the AEAT layout of the books [vatBook.ts] and of the app's template.
  key: [{ include: [/clave (de )?operacion/], exclude: /349|intracom/ }],
  qualification: [{ include: [/calificacion/] }],
  exempt: [{ include: [/operacion exenta/, /causa (de )?exencion/] }],
  reRate: [{ include: [/tipo (de )?recargo/] }],
  reFee: [{ include: [/cuota recargo/] }],
  investment: [{ include: [/bien(es)? de inversion/] }],
  reverse: [{ include: [/inversion del sujeto pasivo/] }],
  invoiceType: [{ include: [/tipo (de )?factura/] }],
  opType: [{ include: [/tipo (de )?operacion/] }],
  key349: [{ include: [/clave 349/, /clave (operacion )?intracomunitaria/] }],
  vatId: [{ include: [/nif.?iva/, /vat (id|number)/, /nif intracomunitario/] }],
  country: [{ include: [/codigo pais/] }],
  idNumber: [{ include: [/^identificacion$/] }],
};

function pick(headers: string[], matchers: Matcher[]): number {
  for (const { include, exclude } of matchers) {
    for (const pattern of include) {
      const index = headers.findIndex(
        (h) => h !== '' && pattern.test(h) && !(exclude && exclude.test(h))
      );
      if (index >= 0) return index;
    }
  }
  return -1;
}

/** The first row that has a «base imponible» heading; its header is that row plus the one below it. */
function headerRowOf(rows: BookCell[][]): number {
  const limit = Math.min(rows.length, 40);
  for (let r = 0; r < limit; r++) {
    if (
      rows[r].some(
        (c) =>
          /base( imponible| sin iva)?$|base imponible|importe sin iva/.test(norm(c)) &&
          typeof c === 'string'
      )
    ) {
      return r;
    }
  }
  return -1;
}

function headersOf(rows: BookCell[][], headerRow: number): string[] {
  const width = Math.max(...rows.slice(headerRow, headerRow + 2).map((r) => r.length), 0);
  const second = rows[headerRow + 1] ?? [];
  // The second heading line only counts when it is text (the first data row is numbers and dates).
  const secondIsHeading = second.some(
    (c) =>
      typeof c === 'string' &&
      c.trim() !== '' &&
      parseBookDate(c) === null &&
      Number.isNaN(bookNumber(c))
  );
  return Array.from({ length: width }, (_, c) =>
    [norm(rows[headerRow][c]), secondIsHeading ? norm(second[c]) : ''].filter(Boolean).join(' ')
  );
}

function columnsOf(rows: BookCell[][], headerRow: number): Columns {
  const headers = headersOf(rows, headerRow);
  const found = {} as Columns;
  for (const key of Object.keys(MATCHERS) as (keyof Columns)[])
    found[key] = pick(headers, MATCHERS[key]);
  return found;
}

const rateOf = (raw: number, base: number, vat: number): VatRate | null => {
  let rate = raw;
  if (Number.isFinite(rate)) {
    // 0.21 in a percent-formatted cell.
    if (rate > 0 && rate < 1) rate = round2(rate * 100);
  } else if (Number.isFinite(vat) && Number.isFinite(base) && base !== 0) {
    rate = Math.round((vat / base) * 1000) / 10;
  } else {
    return null;
  }
  return RATES.find((r) => Math.abs(r - rate) < 0.05) ?? null;
};

/** The withholding of an invoice: its amount, or its rate over the base. */
function heldOf(base: number, retention: number, retentionRate: number): number {
  if (Number.isFinite(retention)) return round2(Math.abs(retention));
  const rate = retentionRate > 0 && retentionRate < 1 ? retentionRate * 100 : retentionRate;
  return Number.isFinite(rate) ? round2((base * rate) / 100) : 0;
}

/**
 * What an invoice says about withholdings: issued ones keep theirs in `withheld` (the 130 takes it);
 * received ones in `retention`, with the sign of the base so a credit note takes it back.
 */
function withholdingsOf(
  row: BookCell[],
  col: Columns,
  kind: BookKind,
  base: number
): Pick<BookEntry, 'withheld' | 'retention' | 'nif'> {
  const at = (index: number): BookCell => (index >= 0 ? row[index] : undefined);
  const held = heldOf(base, bookNumber(at(col.retention)), bookNumber(at(col.retentionRate)));
  if (kind === 'issued') return { withheld: held };
  const nif = String(at(col.nif) ?? '')
    .replace(/[\s.-]/g, '')
    .toUpperCase();
  return {
    withheld: 0,
    ...(col.retention >= 0 || col.retentionRate >= 0
      ? { retention: round2(Math.abs(held) * (base < 0 ? -1 : 1)) }
      : {}),
    ...(nif ? { nif } : {}),
  };
}

/** «1T», «T1», «2.º trimestre», «Q3» or a bare «4» as a quarter; anything else (a month) is null. */
export function quarterOfPeriod(value: BookCell): 1 | 2 | 3 | 4 | null {
  const text = norm(value);
  const found =
    /^([1-4])$/.exec(text) ??
    /\b([1-4])\s*(?:o|º|\.º|er|o\.)?\s*(?:t|q|trim|trimestre)\b/.exec(text) ??
    /\b(?:t|q|trimestre)\s*([1-4])\b/.exec(text);
  return found ? (Number(found[1]) as 1 | 2 | 3 | 4) : null;
}

/** The declared quarter of a row, only when the book has a «Periodo/Trimestre» column. */
const periodOf = (row: BookCell[], col: Columns): Pick<BookEntry, 'period'> =>
  col.period >= 0 ? { period: quarterOfPeriod(row[col.period]) } : {};

type Skip = keyof BookSkipped;

/** One row as an entry, or the reason it is left out. Rows without a date (headings, totals) are not rows. */
function entryOf(
  row: BookCell[],
  col: Columns,
  kind: BookKind,
  year: number
): BookEntry | Skip | null {
  const date = parseBookDate(row[col.date]);
  if (!date) return null;
  if (Number(date.slice(0, 4)) !== year) return 'year';
  const at = (index: number): BookCell => (index >= 0 ? row[index] : undefined);
  const vatRaw = bookNumber(at(col.vat));
  const totalRaw = bookNumber(at(col.total));
  let base = bookNumber(at(col.base));
  if (Number.isNaN(base) && Number.isFinite(totalRaw) && Number.isFinite(vatRaw))
    base = totalRaw - vatRaw;
  if (Number.isNaN(base)) return 'amount';
  const concept = String(at(col.concept) ?? '').trim();
  const vatInfo = vatOf(row, col, kind, concept);
  const { vatRate, guessed } = rateFor(bookNumber(at(col.rate)), base, vatRaw, kind, vatInfo);
  if (vatRate === null) return 'rate';
  const vat = Number.isFinite(vatRaw) ? round2(vatRaw) : round2((base * vatRate) / 100);
  const month = Number(date.slice(5, 7));
  return {
    date,
    quarter: (Math.floor((month - 1) / 3) + 1) as BookEntry['quarter'],
    base: round2(base),
    vatRate,
    vat,
    total: round2(base + vat),
    ...withholdingsOf(row, col, kind, base),
    concept,
    ...periodOf(row, col),
    ...vatInfo,
    ...guessed,
  };
}

/**
 * The VAT rate of a row. An operation without Spanish VAT may come with no rate: an exempt sale is at
 * 0 %, and a purchase that self-assesses its VAT is taken at 21 %, to check.
 */
function rateFor(
  raw: number,
  base: number,
  vat: number,
  kind: BookKind,
  info: Pick<BookEntry, 'op'>
): { vatRate: VatRate | null; guessed: Pick<BookEntry, 'rateGuessed'> } {
  const rate = rateOf(raw, base, vat);
  if (rate !== null || !Number.isNaN(raw) || Number.isFinite(vat) || !info.op) {
    return { vatRate: rate, guessed: {} };
  }
  return kind === 'received'
    ? { vatRate: 21, guessed: { rateGuessed: true } }
    : { vatRate: 0, guessed: {} };
}

/** Services that a business of another member state usually bills (the rest are goods). */
const SERVICE_KINDS: ExpenseKind[] = ['software', 'advertising', 'management', 'training'];

/** What the VAT columns of a row say: only the fields that are not the plain domestic case. */
function vatOf(
  row: BookCell[],
  col: Columns,
  kind: BookKind,
  concept: string
): Pick<BookEntry, 'op' | 'investment' | 'vatId' | 'key349' | 'cash'> {
  const cells = cellsOf(row, col, kind);
  const services = /servicio/.test(cells.free) || SERVICE_KINDS.includes(guessExpenseKind(concept));
  const op = kind === 'issued' ? saleOpOf(cells) : purchaseOpOf(cells, services);
  const key349 = key349Of(cells, op, services);
  return {
    ...(op !== 'domestic' ? { op } : {}),
    ...(kind === 'received' && investmentOf(cells) ? { investment: true } : {}),
    ...(cells.vatId ? { vatId: cells.vatId } : {}),
    ...(key349 ? { key349 } : {}),
    ...(cashOf(cells) ? { cash: true } : {}),
  };
}

/** The VAT number of the other party: its own column, the country and number apart, or the NIF. */
function vatIdOf(raw: (index: number) => string, col: Columns): string {
  const own = raw(col.vatId) || `${raw(col.country)}${raw(col.idNumber)}`;
  const fallback = raw(col.nif);
  return normalVatId(isEuVatId(own) ? own : isEuVatId(fallback) ? fallback : '');
}

/** The VAT columns of a row as text. */
function cellsOf(row: BookCell[], col: Columns, kind: BookKind): VatCells {
  const at = (index: number): string => (index >= 0 ? norm(row[index]) : '');
  const raw = (index: number): string => (index >= 0 ? String(row[index] ?? '').trim() : '');
  const positive = (index: number) => {
    const n = bookNumber(index >= 0 ? row[index] : undefined);
    return Number.isFinite(n) && n > 0;
  };
  return {
    key: at(col.key),
    qualification: at(col.qualification),
    exempt: at(col.exempt),
    reverse: at(col.reverse),
    investment: at(col.investment),
    invoiceType: at(col.invoiceType),
    free: at(col.opType),
    key349: raw(col.key349),
    surcharge: kind === 'issued' && (positive(col.reFee) || positive(col.reRate)),
    vatId: vatIdOf(raw, col),
  };
}

/** Reads the invoices of one sheet for the given year. */
export function parseInvoiceBook(rows: BookCell[][], kind: BookKind, year: number): BookParse {
  const headerRow = headerRowOf(rows);
  if (headerRow < 0) return { ok: false, reason: 'noHeader' };
  const col = columnsOf(rows, headerRow);
  if (col.date < 0 || col.base < 0 || (col.rate < 0 && col.vat < 0)) {
    return { ok: false, reason: 'noColumns' };
  }
  const skipped: BookSkipped = { year: 0, rate: 0, amount: 0 };
  const entries: BookEntry[] = [];
  for (const row of rows.slice(headerRow + 1)) {
    const entry = entryOf(row, col, kind, year);
    if (entry === null) continue;
    if (typeof entry === 'string') skipped[entry]++;
    else entries.push(entry);
  }
  return { ok: true, result: { entries, skipped } };
}

/** The first sheet of the workbook that reads as the wanted book (the sheet name breaks ties). */
export function parseWorkbook(
  sheets: { name: string; rows: BookCell[][] }[],
  kind: BookKind,
  year: number
): BookParse {
  const wanted = kind === 'issued' ? /ingres|emitid|venta/ : /gast|recibid|compra/;
  const unwanted = kind === 'issued' ? /gast|recibid|compra/ : /ingres|emitid|venta/;
  const ordered = [
    ...sheets.filter((s) => wanted.test(norm(s.name))),
    ...sheets.filter((s) => !wanted.test(norm(s.name)) && !unwanted.test(norm(s.name))),
    ...sheets.filter((s) => unwanted.test(norm(s.name))),
  ];
  let last: BookParse = { ok: false, reason: 'noHeader' };
  for (const sheet of ordered) {
    last = parseInvoiceBook(sheet.rows, kind, year);
    if (last.ok) return last;
  }
  return last;
}

const ISSUED_NAME = /ingres|emitid|venta|expedid/;
const RECEIVED_NAME = /gast|recibid|compra|soportad/;

/** What a name (of a sheet or a file) says the book is, when it says one thing only. */
function kindOfName(name: string): BookKind | null {
  const text = norm(name);
  const issued = ISSUED_NAME.test(text);
  if (issued === RECEIVED_NAME.test(text)) return null;
  return issued ? 'issued' : 'received';
}

/**
 * What the headings say: withholdings and clients belong to what is billed, suppliers to what is
 * paid. «Fecha expedición» is in both books, so only «expedidor» (who issued it to us) counts.
 */
function kindOfHeaders(headers: string[]): BookKind | null {
  const text = headers.join(' | ');
  const received = /proveedor|expedidor|acreedor|soportad/.test(text);
  // A received book can have withholdings too (those the person made to professionals and landlords).
  const issued =
    /cliente|destinatario|repercutid/.test(text) ||
    (!received && /retencion|retenido|irpf/.test(text));
  if (issued === received) return null;
  return issued ? 'issued' : 'received';
}

export interface BookDetection {
  /** The sheets of each book that the workbook has. */
  books: Partial<Record<BookKind, { name: string; rows: BookCell[][] }[]>>;
  /** Sheets that are invoice books but say nothing of which one: the person is asked. */
  unknown: { name: string; rows: BookCell[][] }[];
}

/**
 * Which book each sheet of a workbook is: by the name of the sheet, by its headings and, for a
 * sheet that says nothing, by the name of the file. Sheets without a «Base imponible» heading
 * (instructions, totals) are not books.
 */
export function detectBooks(
  sheets: { name: string; rows: BookCell[][] }[],
  fileName: string
): BookDetection {
  const out: BookDetection = { books: {}, unknown: [] };
  for (const sheet of sheets) {
    const headerRow = headerRowOf(sheet.rows);
    if (headerRow < 0) continue;
    const kind =
      kindOfName(sheet.name) ??
      kindOfHeaders(headersOf(sheet.rows, headerRow)) ??
      kindOfName(fileName);
    if (kind) (out.books[kind] ??= []).push(sheet);
    else out.unknown.push(sheet);
  }
  return out;
}

export interface QuarterIncome {
  r21: number;
  r10: number;
  r4: number;
  r0: number;
  withheld: number;
}

/** A sale with Spanish VAT (to anyone, a retailer in the surcharge too): it goes by its rate. */
export const isTaxedSale = (e: Pick<BookEntry, 'op'>): boolean =>
  e.op === undefined || e.op === 'domestic' || e.op === 're';

/**
 * Income base by VAT rate and withholdings, for each quarter that has invoices. The sales without
 * Spanish VAT (intra-EU, exports…) are not here: they go to their own box of the 303 (vatOfBook).
 */
export function incomeByQuarter(
  entries: BookEntry[]
): Partial<Record<1 | 2 | 3 | 4, QuarterIncome>> {
  const out: Partial<Record<1 | 2 | 3 | 4, QuarterIncome>> = {};
  for (const e of entries) {
    const q = (out[e.quarter] ??= { r21: 0, r10: 0, r4: 0, r0: 0, withheld: 0 });
    if (isTaxedSale(e)) {
      q[`r${e.vatRate}` as 'r21' | 'r10' | 'r4' | 'r0'] = round2(
        q[`r${e.vatRate}` as 'r21' | 'r10' | 'r4' | 'r0'] + e.base
      );
    }
    q.withheld = round2(q.withheld + e.withheld);
  }
  return out;
}

// The order matters: the first rule that fits wins, so the specific ones go before the broad ones
// («Google Ads» is advertising, not software; «material de oficina» is material, not rent).
const KIND_RULES: [RegExp, ExpenseKind][] = [
  [/publicidad|marketing|anuncio|\bads\b|imprenta/, 'advertising'],
  [/material|papeleria|ordenador|portatil|herramient|equipo/, 'material'],
  [/alquiler|arrend|coworking/, 'rent'],
  [/gestor|asesor|contab|abogad|notar|procurador/, 'management'],
  [
    /software|licencia|suscrip|hosting|dominio|saas|adobe|microsoft|google|apple|dropbox/,
    'software',
  ],
  [/seguro (de )?(salud|medic)|sanitas|adeslas|asisa|dkv/, 'health'],
  [
    /gasolin|combustible|carburante|repsol|cepsa|peaje|parking|taller|vehiculo|coche|furgoneta/,
    'vehicle',
  ],
  [/restaur|comida|menu|cafeter|dieta|\bbar\b/, 'meals'],
  [/formacion|curso|master|seminario|congreso/, 'training'],
  [/cuota (de )?aut|\breta\b|seguridad social/, 'quota'],
  [/nomina|salario|sueldo/, 'staff'],
  [
    /electric|\bluz\b|\bagua\b|\bgas\b|internet|fibra|telefon|movil|vodafone|movistar|orange|endesa|iberdrola/,
    'supplies',
  ],
];

/** A guess of the kind of expense from its supplier or concept; "other" when nothing fits. */
export function guessExpenseKind(concept: string): ExpenseKind {
  const text = norm(concept);
  return KIND_RULES.find(([pattern]) => pattern.test(text))?.[1] ?? 'other';
}

export interface ExpenseLineData {
  kind: ExpenseKind;
  /** With VAT included, as the draft asks for it; the base when the invoice has no Spanish VAT. */
  amount: number;
  vatRate: VatRate;
  days: number | null;
  /** What the purchase is for VAT and whether it is an investment good (absent: domestic, no). */
  op?: PurchaseOp;
  investment?: boolean;
}

/**
 * Expense lines per quarter: invoices of the same kind, VAT rate and operation are added up, meals
 * stay one each. An intra-EU purchase, a reverse charge or an import counts its base.
 */
export function expensesByQuarter<E extends BookEntry>(
  entries: E[],
  kindOf: (entry: E) => ExpenseKind = (e) => guessExpenseKind(e.concept)
): Partial<Record<1 | 2 | 3 | 4, ExpenseLineData[]>> {
  const out: Partial<Record<1 | 2 | 3 | 4, ExpenseLineData[]>> = {};
  for (const e of entries) {
    const lines = (out[e.quarter] ??= []);
    const kind = kindOf(e);
    const op = (e.op ?? 'domestic') as PurchaseOp;
    const investment = Boolean(e.investment);
    const amount = op === 'domestic' ? e.total : e.base;
    const same =
      kind === 'meals'
        ? undefined
        : lines.find(
            (l) =>
              l.kind === kind &&
              l.vatRate === e.vatRate &&
              (l.op ?? 'domestic') === op &&
              Boolean(l.investment) === investment
          );
    if (same) same.amount = round2(same.amount + amount);
    else
      lines.push({
        kind,
        amount,
        vatRate: e.vatRate,
        days: kind === 'meals' ? 1 : null,
        ...(op !== 'domestic' ? { op } : {}),
        ...(investment ? { investment } : {}),
      });
  }
  return out;
}
