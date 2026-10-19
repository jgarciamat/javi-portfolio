import { parseBookDate } from './excelDates';
import type { ExpenseKind, VatRate } from './types';

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
  /** Who or what: the client, the supplier or the concept. */
  concept: string;
  /** The quarter a «Periodo/Trimestre» column says it belongs to (only when the book has one). */
  period?: 1 | 2 | 3 | 4 | null;
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
  | { ok: true; result: BookResult }
  | { ok: false; reason: 'noHeader' | 'noColumns' };

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
    },
    { include: [/concepto/] },
  ],
  period: [{ include: [/trimestre/, /periodo/], exclude: /fecha|ejercicio/ }],
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

/** The withholding of an issued invoice: its amount, or its rate over the base. */
function withheldOf(
  kind: BookKind,
  base: number,
  retention: number,
  retentionRate: number
): number {
  if (kind === 'received') return 0;
  if (Number.isFinite(retention)) return round2(Math.abs(retention));
  const rate = retentionRate > 0 && retentionRate < 1 ? retentionRate * 100 : retentionRate;
  return Number.isFinite(rate) ? round2((base * rate) / 100) : 0;
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
  const vatRate = rateOf(bookNumber(at(col.rate)), base, vatRaw);
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
    withheld: withheldOf(
      kind,
      base,
      bookNumber(at(col.retention)),
      bookNumber(at(col.retentionRate))
    ),
    concept: String(at(col.concept) ?? '').trim(),
    ...periodOf(row, col),
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
  const issued = /retencion|retenido|irpf|cliente|destinatario|repercutid/.test(text);
  if (issued === /proveedor|expedidor|acreedor|soportad/.test(text)) return null;
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

/** Income base by VAT rate and withholdings, for each quarter that has invoices. */
export function incomeByQuarter(
  entries: BookEntry[]
): Partial<Record<1 | 2 | 3 | 4, QuarterIncome>> {
  const out: Partial<Record<1 | 2 | 3 | 4, QuarterIncome>> = {};
  for (const e of entries) {
    const q = (out[e.quarter] ??= { r21: 0, r10: 0, r4: 0, r0: 0, withheld: 0 });
    q[`r${e.vatRate}` as 'r21' | 'r10' | 'r4' | 'r0'] = round2(
      q[`r${e.vatRate}` as 'r21' | 'r10' | 'r4' | 'r0'] + e.base
    );
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
  /** With VAT included, as the draft asks for it. */
  amount: number;
  vatRate: VatRate;
  days: number | null;
}

/** Expense lines per quarter: invoices of the same kind and VAT rate are added up, meals stay one each. */
export function expensesByQuarter<E extends BookEntry>(
  entries: E[],
  kindOf: (entry: E) => ExpenseKind = (e) => guessExpenseKind(e.concept)
): Partial<Record<1 | 2 | 3 | 4, ExpenseLineData[]>> {
  const out: Partial<Record<1 | 2 | 3 | 4, ExpenseLineData[]>> = {};
  for (const e of entries) {
    const lines = (out[e.quarter] ??= []);
    const kind = kindOf(e);
    const same =
      kind === 'meals' ? undefined : lines.find((l) => l.kind === kind && l.vatRate === e.vatRate);
    if (same) same.amount = round2(same.amount + e.total);
    else
      lines.push({ kind, amount: e.total, vatRate: e.vatRate, days: kind === 'meals' ? 1 : null });
  }
  return out;
}
