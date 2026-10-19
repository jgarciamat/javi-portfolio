import { guessExpenseKind, type BookEntry, type BookKind } from './invoiceBook';
import type { PdfToken } from './taxModelPdf';
import type { ExpenseKind, VatRate } from './types';

/**
 * Reading an ordinary invoice from the text of its PDF (the ones that come by email; not photos).
 *
 * There is no fixed layout, so the reader works with what every invoice has: lines of text, labels
 * («Base imponible», «IVA 21 %», «Total», «Fecha factura») and amounts either to the right of their
 * label or under it. Nothing is made up: what cannot be read stays empty and the invoice is marked
 * to be checked, with the reason.
 */

// ─── Lines and cells ─────────────────────────────────────────────────────────

/** A piece of a line: text with where it starts and how wide it is (PDF points). */
export interface Cell {
  text: string;
  /** Folded: lower case, no accents, same length as `text`. */
  low: string;
  x: number;
  w: number;
}

export interface Line {
  page: number;
  y: number;
  cells: Cell[];
}

/** Baselines this close are the same printed line. */
const SAME_LINE = 3;
/** Lines further apart than this (points) are not one block of text. */
const BLOCK_GAP = 24;
/** A gap this wide (points) between two pieces of a line separates two columns. */
const COLUMN_GAP = 50;

/** Lower case without accents, keeping every character in its place (ñ → n, á → a). */
export const fold = (text: string): string =>
  Array.from(text, (c) => c.normalize('NFD')[0])
    .join('')
    .toLowerCase();

const cell = (text: string, x: number, w: number): Cell => ({ text, low: fold(text), x, w });

/** One drawn piece can hold several columns: «Base 100,00 · IVA 21,00» or wide runs of spaces. */
function split(t: PdfToken): Cell[] {
  const per = (t.w ?? 0) / t.text.length;
  const out: Cell[] = [];
  let from = 0;
  const push = (end: number) => {
    const text = t.text.slice(from, end).trim();
    if (text) out.push(cell(text, t.x + per * from, per * text.length));
  };
  for (const m of t.text.matchAll(/\s+[·•|]\s+|\s{3,}/g)) {
    push(m.index);
    from = m.index + m[0].length;
  }
  push(t.text.length);
  return out;
}

/** Two pieces drawn one after the other, a space at most between them: one piece. */
function touches(last: PdfToken | undefined, t: PdfToken): last is PdfToken & { w: number } {
  if (!last || last.w === undefined || !t.h) return false;
  return t.x - (last.x + last.w) < t.h * 0.45;
}

function joinNear(tokens: PdfToken[]): PdfToken[] {
  const out: PdfToken[] = [];
  for (const t of tokens) {
    const last = out[out.length - 1];
    if (!touches(last, t)) {
      out.push({ ...t });
      continue;
    }
    const gap = t.x - (last.x + last.w);
    last.text += gap > (t.h as number) * 0.1 ? ` ${t.text}` : t.text;
    last.w = t.x + (t.w ?? 0) - last.x;
  }
  return out;
}

/** The pieces of every page as lines, top to bottom, each with its cells from left to right. */
export function linesOf(pages: PdfToken[][]): Line[] {
  const out: Line[] = [];
  pages.forEach((tokens, page) => {
    const rows: { y: number; tokens: PdfToken[] }[] = [];
    for (const t of [...tokens].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const last = rows[rows.length - 1];
      if (last && last.y - t.y <= SAME_LINE) last.tokens.push(t);
      else rows.push({ y: t.y, tokens: [t] });
    }
    for (const row of rows) {
      const joined = joinNear(row.tokens.sort((a, b) => a.x - b.x));
      out.push({ page, y: row.y, cells: joined.flatMap(split) });
    }
  });
  return out;
}

// ─── Amounts, rates and dates in a text ──────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface Found {
  value: number;
  start: number;
  end: number;
}

// Thousands go with a dot, a comma or a non-breaking space ([^\S ]: any space but the plain one).
/** «1.234,56», «1,234.56», «-121,00», «€ 50.00»: always with two decimals, never a percentage. */
const MONEY =
  /(^|[^\w.,/-])([-−–]\s?)?(?:€\s?)?(\d{1,3}(?:([.,]|[^\S ])\d{3})+|\d+)([.,])(\d{2})(?!\d)(?![.,/-]\d)(?!\s?%)/g;
/** Whole euros only count with the euro sign next to them: «1,500€», «€ 90», «1.500 EUR». */
const WHOLE_EUROS =
  /(^|[^\w.,/-])([-−–]\s?)?(€\s?)?(\d{1,3}(?:(?:[.,]|[^\S ])\d{3})+|\d+)(?![.,]?\d)(\s?(?:€|eur\b|euros?\b))?/gi;

/** The amounts of money in a text, in order. */
export function amountsIn(text: string): Found[] {
  const out: Found[] = [];
  for (const m of text.matchAll(MONEY)) {
    const [whole, before, sign, int, thousands, decimal, cents] = m;
    // «1.234.56»: the same mark cannot separate thousands and decimals.
    if (thousands === decimal) continue;
    const value = Number(`${int.replace(/\D/g, '')}.${cents}`);
    out.push({
      value: sign ? -value : value,
      start: m.index + before.length,
      end: m.index + whole.length,
    });
  }
  for (const m of text.matchAll(WHOLE_EUROS)) {
    const [whole, before, sign, euroBefore, int, euroAfter] = m;
    const start = m.index + before.length;
    const end = m.index + whole.length;
    // Two decimals never come out here: «€242.00» is not «€242» and «00».
    if (!euroBefore && !euroAfter) continue;
    const value = Number(int.replace(/\D/g, ''));
    out.push({ value: sign ? -value : value, start, end });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** «21 %», «10%», «5,2 %». */
export function ratesIn(text: string): number[] {
  return Array.from(text.matchAll(/(\d{1,2}(?:[.,]\d{1,2})?)\s?%/g), (m) =>
    Number(m[1].replace(',', '.'))
  );
}

const MONTHS: Record<string, number> = {
  enero: 1,
  ene: 1,
  january: 1,
  jan: 1,
  febrero: 2,
  feb: 2,
  february: 2,
  marzo: 3,
  mar: 3,
  march: 3,
  abril: 4,
  abr: 4,
  april: 4,
  apr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  june: 6,
  julio: 7,
  jul: 7,
  july: 7,
  agosto: 8,
  ago: 8,
  august: 8,
  aug: 8,
  septiembre: 9,
  setiembre: 9,
  sept: 9,
  sep: 9,
  september: 9,
  octubre: 10,
  oct: 10,
  october: 10,
  noviembre: 11,
  nov: 11,
  november: 11,
  diciembre: 12,
  dic: 12,
  december: 12,
  dec: 12,
};
const MONTH = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|');

export interface FoundDate {
  /** `YYYY-MM-DD`. */
  date: string;
  start: number;
  end: number;
  /** Day and month could be either way round (03/04/2026 in an English invoice). */
  ambiguous: boolean;
}

type Ymd = [number, number, number];

/** The patterns of a date, each with how to take its year, month and day. The second is d/m/y. */
const DATE_PATTERNS: [RegExp, (m: RegExpMatchArray) => Ymd][] = [
  [/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g, (m) => [+m[1], +m[2], +m[3]]],
  [/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g, (m) => [+m[3], +m[2], +m[1]]],
  [
    new RegExp(
      `\\b(\\d{1,2})(?:º|o)?(?:\\s+de\\s+|[\\s-]+)(${MONTH})\\.?(?:\\s+de\\s+|\\s+del\\s+|[\\s,-]+)(\\d{4})\\b`,
      'g'
    ),
    (m) => [+m[3], MONTHS[m[2]], +m[1]],
  ],
  [
    new RegExp(`\\b(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'g'),
    (m) => [+m[3], MONTHS[m[1]], +m[2]],
  ],
];

const validDate = ([y, m, d]: Ymd) =>
  m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();

const iso = ([y, m, d]: Ymd) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * Year, month and day of a match. With slashes an English invoice is month first when the day could
 * not be a month; when both could, the date is ambiguous.
 */
function partsOf(raw: Ymd, slashes: boolean, english: boolean): { ymd: Ymd; ambiguous: boolean } {
  const [y, mo, d] = raw;
  const year = y < 100 ? y + 2000 : y;
  if (!slashes || !english) return { ymd: [year, mo, d], ambiguous: false };
  if (mo > 12 && d <= 12) return { ymd: [year, d, mo], ambiguous: false };
  return { ymd: [year, mo, d], ambiguous: mo !== d };
}

/** The dates of a folded text, in order: numbers, «12 de marzo de 2026», «March 12, 2026». */
export function datesIn(low: string, english = false): FoundDate[] {
  const out: FoundDate[] = [];
  DATE_PATTERNS.forEach(([pattern, parts], kind) => {
    for (const m of low.matchAll(pattern)) {
      const start = m.index;
      const end = start + m[0].length;
      const { ymd, ambiguous } = partsOf(parts(m), kind === 1, english);
      if (!validDate(ymd)) continue;
      out.push({ date: iso(ymd), start, end, ambiguous });
    }
  });
  return out.sort((a, b) => a.start - b.start);
}

// ─── Parties: who issued it and who it is for ────────────────────────────────

export interface Party {
  name: string | null;
  nif: string | null;
}

/** NIF of a person, NIE or CIF of a company, with or without «ES» and hyphens: format only. */
const TAX_ID = /\b(?:ES-?)?([A-HJNP-SUVW]-?\d{7}-?[0-9A-J]|\d{8}-?[A-Z]|[XYZ]-?\d{7}-?[A-Z])\b/g;

export function taxIdsIn(text: string): string[] {
  return Array.from(text.toUpperCase().matchAll(TAX_ID), (m) => m[1].replace(/-/g, ''));
}

/** A company suffix at the end of a folded name. */
export const COMPANY =
  /\b(s\.?\s?l\.?\s?u?\.?|s\.?\s?a\.?\s?u?\.?|s\.?\s?coop\.?|sociedad (limitada|anonima)|ltd\.?|limited|inc\.?|llc|gmbh|s\.?\s?c\.?\s?p\.?)$/;

/** A company: a CIF (a letter first that is not a foreigner's NIE) or a company suffix in its name. */
export const isCompany = (party: Party): boolean =>
  /^[A-HJNP-SUVW]/.test(party.nif ?? '') || COMPANY.test(fold(party.name ?? '').trim());

const CLIENT_LABEL =
  /^(datos del cliente|cliente|facturar a|factura a|facturado a|destinatario|receptor|bill to|billed to|invoice to|sold to|customer|para)\b\s*:?\s*/;
const ISSUER_LABEL =
  /^(datos del emisor|emisor|proveedor|vendedor|expedido por|issued by|supplier|seller|from\s*:|de\s*:)\s*:?\s*/;
/** Where a block of party data ends. */
const BLOCK_END =
  /^(fecha|n[ºo°]\.?\s|numero|factura\b|invoice\b|descripcion|concepto|description|detalle|base\b|iva\b|total\b|forma de pago|vencimiento)/;
/** Lines that are part of an address or a contact, not a name. */
const NOT_NAME =
  /^(c\/|calle|avda|avenida|plaza|pza|paseo|ctra|carretera|camino|pol\.|poligono|cp\b|c\.p\.|tel|tlf|telefono|phone|movil|fax|e-?mail|correo|mail|www|http|iban|swift|bic|nif|cif|dni|nie|vat|tax id|n\.i\.f|registro|inscrita|\d)/;
const NAME_PREFIX = /^(razon social|nombre|name|empresa|company)\s*:?\s*/;
const TAX_ID_WORD = /\b(nif|cif|dni|nie|vat|tax id)\b|\b(?:ES-?)?[A-Z]?-?\d{7,8}-?[A-Z0-9]?\b/i;

interface Place {
  line: number;
  cell: number;
}

const textAt = (lines: Line[], p: Place) => lines[p.line].cells[p.cell];

/** The label's own line: what follows it is its value, up to a wide gap (another column starts there). */
function labelLine(lines: Line[], at: Place): { places: Place[]; limit: number } {
  const head = lines[at.line];
  const places: Place[] = [{ ...at }];
  let end = head.cells[at.cell].x + head.cells[at.cell].w;
  for (let i = at.cell + 1; i < head.cells.length; i++) {
    const c = head.cells[i];
    if (c.x - end > COLUMN_GAP) return { places, limit: c.x - 4 };
    places.push({ line: at.line, cell: i });
    end = c.x + c.w;
  }
  return { places, limit: Infinity };
}

/** The cells under a party label: the same column, down to a blank gap or another heading. */
function blockOf(lines: Line[], at: Place): Place[] {
  const head = lines[at.line];
  const { places: out, limit } = labelLine(lines, at);
  const left = head.cells[at.cell].x - 12;
  let y = head.y;
  for (let l = at.line + 1; l < lines.length && l <= at.line + 6; l++) {
    const line = lines[l];
    if (line.page !== head.page || y - line.y > BLOCK_GAP) break;
    const inside = line.cells
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.x >= left && c.x < limit);
    if (inside.some(({ c }) => BLOCK_END.test(c.low) || CLIENT_LABEL.test(c.low))) break;
    out.push(...inside.map(({ i }) => ({ line: l, cell: i })));
    if (inside.length > 0) y = line.y;
  }
  return out;
}

/** The text without what comes before (a label) and what comes after (a tax id). */
function strip(text: string, label: RegExp | null): string {
  let rest = text;
  const head = label?.exec(fold(rest));
  if (head) rest = rest.slice(head[0].length);
  const prefix = NAME_PREFIX.exec(fold(rest));
  if (prefix) rest = rest.slice(prefix[0].length);
  const id = TAX_ID_WORD.exec(rest);
  if (id) rest = rest.slice(0, id.index);
  return rest.replace(/[\s,;:·•|–-]+$/, '').trim();
}

/** A name out of a cell; null when it is an address, a contact, a number or a title. */
function nameOf(text: string, label: RegExp | null = null): string | null {
  const rest = strip(text, label);
  const low = fold(rest);
  if (!/[a-z].*[a-z]/.test(low) || NOT_NAME.test(low) || low.includes('@')) return null;
  // «Base 100,00» or «Total» are amounts, not names.
  if (fieldOf(low) || amountsIn(rest).length > 0) return null;
  return /^(factura|invoice|abono|rectificativa|credit note)\b/.test(low) ? null : rest;
}

function partyOfBlock(lines: Line[], block: Place[], label: RegExp): Party {
  let name: string | null = null;
  let nif: string | null = null;
  block.forEach((p, n) => {
    const { text } = textAt(lines, p);
    nif ??= taxIdsIn(text)[0] ?? null;
    name ??= nameOf(text, n === 0 ? label : null);
  });
  return { name, nif };
}

function findLabel(lines: Line[], label: RegExp): Place | null {
  for (let l = 0; l < lines.length; l++) {
    const c = lines[l].cells.findIndex((x) => label.test(x.low));
    if (c >= 0) return { line: l, cell: c };
  }
  return null;
}

const key = (p: Place) => `${p.line}:${p.cell}`;

const placesOf = (lines: Line[]): Place[] =>
  lines.flatMap((line, l) => line.cells.map((_, c) => ({ line: l, cell: c })));

/** Where to look for a name near a tax id: before it on its line, then above it in its column. */
function nearId(lines: Line[], free: Place[], at: Place): Place[] {
  const x = textAt(lines, at).x;
  const before = free.filter((p) => p.line === at.line && p.cell <= at.cell).reverse();
  const above = free
    .filter(
      (p) =>
        p.line < at.line &&
        p.line >= at.line - 3 &&
        lines[p.line].page === lines[at.line].page &&
        Math.abs(textAt(lines, p).x - x) < 30
    )
    .reverse();
  return [...before, ...above];
}

/** The issuer outside the client's block: next to its tax id, a company name, or the top line. */
function issuerOf(lines: Line[], skip: Set<string>): Party {
  const free = placesOf(lines).filter((p) => !skip.has(key(p)));
  const withId = free.find((p) => taxIdsIn(textAt(lines, p).text).length > 0);
  const near = withId ? nearId(lines, free, withId) : [];
  const companies = free.filter((p) => COMPANY.test(fold(textAt(lines, p).text).trim()));
  const [before, above] = [
    near.filter((p) => p.line === withId?.line),
    near.filter((p) => p.line !== withId?.line),
  ];
  const name = [...before, ...companies, ...above, ...free]
    .map((p) => nameOf(textAt(lines, p).text))
    .find((n) => n !== null);
  return { name: name ?? null, nif: withId ? taxIdsIn(textAt(lines, withId).text)[0] : null };
}

/** Without a client label: the first other tax id, with the name next to or above it. */
function clientWithoutLabel(lines: Line[], issuer: Party): Party {
  const at = placesOf(lines).find((p) =>
    taxIdsIn(textAt(lines, p).text).some((nif) => nif !== issuer.nif)
  );
  if (!at) return { name: null, nif: null };
  const nif = taxIdsIn(textAt(lines, at).text).find((n) => n !== issuer.nif) as string;
  const name = nearId(lines, placesOf(lines), at)
    .map((p) => nameOf(textAt(lines, p).text))
    .find((n) => n !== null);
  return { name: name ?? null, nif };
}

/** Who issued the invoice and who it is for, by their labels and their tax ids. */
export function partiesOf(lines: Line[]): { issuer: Party; client: Party } {
  const clientAt = findLabel(lines, CLIENT_LABEL);
  const issuerAt = findLabel(lines, ISSUER_LABEL);
  const clientBlock = clientAt ? blockOf(lines, clientAt) : [];
  const issuer = issuerAt
    ? partyOfBlock(lines, blockOf(lines, issuerAt), ISSUER_LABEL)
    : issuerOf(lines, new Set(clientBlock.map(key)));
  const client = clientAt
    ? partyOfBlock(lines, clientBlock, CLIENT_LABEL)
    : clientWithoutLabel(lines, issuer);
  return { issuer, client };
}

// ─── Amounts by their labels ─────────────────────────────────────────────────

type Field = 'surcharge' | 'withheld' | 'base' | 'rate' | 'vat' | 'total';

/** The labels of the totals block. The order matters: «Total base» is a base, «Total IVA» a VAT amount. */
const LABELS: [Field, RegExp][] = [
  ['surcharge', /^(recargo( de)? equivalencia|recargo|r\.\s?e\.)/],
  ['withheld', /^((total )?retencion|ret\.|(total )?irpf|withholding)/],
  [
    'base',
    /^(base imponible|base|subtotal|sub-total|suma|taxable (amount|base)|net amount|importe neto|total base( imponible)?|total neto|neto)\b/,
  ],
  ['rate', /^(% ?(de )?(iva|vat)\b|tipo( de)?( iva| impositivo)?\b|(iva|vat) ?%|vat rate\b|%$)/],
  [
    'vat',
    /^(cuota( de)? iva|cuota|total (iva|impuestos|vat|tax)|iva|i\.v\.a\.?|vat|impuestos?|tax(es)?)\b(?!.*incluid)(?!.*included)/,
  ],
  [
    'total',
    /^(total( factura| a pagar| invoice| due| eur| amount)?|importe total|amount due|a pagar)\b/,
  ],
];

/** Column headings of the lines of the invoice: their «Total» or «IVA» are not the invoice's. */
const ITEMS_HEAD =
  /^(descripcion|concepto|description|detalle|articulo|item|servicio|producto|cant\.?|cantidad|uds\.?|unidades|qty|quantity|precio|price)\b/;

const fieldOf = (low: string): Field | null => LABELS.find(([, re]) => re.test(low))?.[0] ?? null;

const hasAmount = (c: Cell) => amountsIn(c.text).length > 0;

interface Reading {
  field: Field;
  amounts: number[];
  rate: number | null;
}

/** The value of each label on its own line: what follows it up to the next label. */
function inlineReadings(lines: Line[], skip: Set<number>): Reading[] {
  const out: Reading[] = [];
  lines.forEach((line, l) => {
    if (skip.has(l)) return;
    let current: Reading | null = null;
    for (const c of line.cells) {
      const field = fieldOf(c.low);
      if (field) out.push((current = { field, amounts: [], rate: null }));
      if (!current) continue;
      current.amounts.push(...amountsIn(c.text).map((a) => a.value));
      current.rate ??= ratesIn(c.text)[0] ?? null;
    }
  });
  // A label with a rate only counts too: «Retención 15 %».
  return out.filter((r) => r.amounts.length > 0 || r.rate !== null);
}

const valued = (r: Reading) => r.amounts.length > 0;

type Row = Partial<Record<Field, number>>;

/** Distance between the horizontal spans of two cells (0 when they overlap; the centres break ties). */
const apart = (a: Cell, b: Cell) =>
  Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)) +
  Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)) / 1000;

/** A line of headings with nothing else: «Base imponible | IVA 21 % | Total». */
const isHeadLine = (line: Line) =>
  line.cells.some((c) => fieldOf(c.low)) &&
  !line.cells.some((c) => ITEMS_HEAD.test(c.low) || hasAmount(c));

/** The values of a line under headings, each to the heading over it. */
function rowUnder(heads: Cell[], values: Cell[]): Row {
  const out: Row = {};
  for (const v of values) {
    const head = [...heads].sort((a, b) => apart(a, v) - apart(b, v))[0];
    const field = fieldOf(head.low) as Field;
    const amount = amountsIn(v.text)[0]?.value;
    const rate = ratesIn(v.text)[0] ?? ratesIn(head.text)[0];
    if (field === 'rate') out.rate = rate ?? amount;
    else out[field] ??= amount;
    // «IVA 21 %» over its amount gives the rate too; a withholding or a surcharge has its own.
    if (field === 'vat' || field === 'base') out.rate ??= rate;
  }
  return out;
}

/**
 * Headings with their values under them: «Base imponible | IVA 21 % | Total» over «100,00 | 21,00 |
 * 121,00», or a breakdown with one line per VAT rate. Returns the rows and the lines they used.
 */
function tableReadings(lines: Line[]): { rows: Row[]; used: Set<number> } {
  const rows: Row[] = [];
  const used = new Set<number>();
  lines.forEach((line, l) => {
    if (!isHeadLine(line)) return;
    const heads = line.cells.filter((c) => fieldOf(c.low));
    for (let r = l + 1; r < lines.length && r <= l + 6; r++) {
      const row = lines[r];
      const values = row.cells.filter((c) => hasAmount(c) || ratesIn(c.text).length > 0);
      const near = row.page === line.page && lines[r - 1].y - row.y <= BLOCK_GAP;
      if (!near || values.length === 0 || row.cells.some((c) => fieldOf(c.low))) break;
      rows.push(rowUnder(heads, values));
      used.add(l).add(r);
    }
  });
  return { rows, used };
}

// ─── The invoice ─────────────────────────────────────────────────────────────

const RATES: VatRate[] = [0, 4, 10, 21];

/** Why an invoice read from a PDF should be checked by the person. */
export type ReviewCode =
  | 'date'
  | 'dateFormat'
  | 'amount'
  | 'rate'
  | 'mismatch'
  | 'noTotal'
  | 'surcharge'
  | 'split'
  | 'reverse'
  | 'currency'
  | 'several'
  | 'issuer';

export interface TaxLine {
  rate: VatRate | null;
  base: number | null;
  vat: number | null;
}

/** A tax line as read, before its rate is known to be one the draft takes. */
interface RawTax {
  rate: number | null;
  base: number | null;
  vat: number | null;
}

export interface InvoicePdf {
  date: string | null;
  number: string | null;
  issuer: Party;
  client: Party;
  /** One line per VAT rate. */
  taxes: TaxLine[];
  /** IRPF withheld (0 when there is none). */
  withheld: number;
  /** As printed at the bottom, when it can be read. */
  total: number | null;
  /** Credit note: every amount is negative. */
  credit: boolean;
  /** What was bought, from the lines of the invoice. */
  concept: string;
  review: ReviewCode[];
  /** What the amounts add up to against the printed total, when they differ. */
  mismatch: { expected: number; total: number } | null;
}

export type InvoicePdfParse =
  | { ok: true; invoice: InvoicePdf }
  | { ok: false; reason: 'noText' | 'notInvoice' | 'currency'; currency?: string };

/** Tolerance of the sums against the printed total. */
export const TOLERANCE = 0.02;

const close = (a: number, b: number) => Math.abs(a - b) <= TOLERANCE + 1e-9;

const validRate = (rate: number): VatRate | null =>
  RATES.find((r) => Math.abs(r - rate) < 0.05) ?? null;

/** The VAT rate a base and its VAT amount point to, within the cents of rounding. */
const rateOfAmounts = (base: number, vat: number): VatRate | null =>
  RATES.find((r) => close(round2((base * r) / 100), vat)) ?? null;

const DATE_LABELS: [RegExp, number][] = [
  [
    /fecha (de )?(la )?(factura|emision|expedicion)|fecha fra|invoice date|date of issue|issue date|issued on/g,
    3,
  ],
  [/vencim|vto\b|due|fecha (de )?(pago|cobro)|payment|validez|valid until/g, -1],
  [/operacion|entrega|prestacion|servicio|delivery|supply|periodo|period/g, 1],
  [/\bfecha\b|\bdate\b|\bdated\b/g, 2],
];

/** What the label closest before a date says it is: issue (3), plain (2), operation (1) or due (-1). */
function scoreOf(label: string): number | null {
  let best: [number, number] | null = null;
  for (const [re, score] of DATE_LABELS) {
    for (const m of label.matchAll(re)) {
      if (!best || m.index > best[0]) best = [m.index, score];
    }
  }
  return best ? best[1] : null;
}

interface DateCandidate {
  date: string;
  score: number;
  ambiguous: boolean;
}

/** The dates of a line with how sure each is to be the issue date. */
function datesOfLine(lines: Line[], l: number, english: boolean): DateCandidate[] {
  const line = lines[l];
  const out: DateCandidate[] = [];
  line.cells.forEach((c, ci) => {
    let from = 0;
    for (const d of datesIn(c.low, english)) {
      // The words before the date, on its cell or the cells to its left.
      const before = from === 0 ? line.cells.slice(0, ci).map((x) => x.low) : [];
      const label = [...before, c.low.slice(from, d.start)].join(' ');
      from = d.end;
      // A heading over the value: «Fecha» on the line above, in the same column.
      const up = lines[l - 1]?.page === line.page ? lines[l - 1] : undefined;
      const head = up?.cells.find((h) => apart(h, c) < 20);
      const score = scoreOf(label) ?? (head ? scoreOf(head.low) : null) ?? 0;
      out.push({ date: d.date, score, ambiguous: d.ambiguous });
    }
  });
  return out;
}

/** The invoice's issue date: the one next to «Fecha factura» or «Fecha», never the due date. */
function dateOf(lines: Line[], english: boolean): { date: string | null; ambiguous: boolean } {
  const best = lines
    .flatMap((_, l) => datesOfLine(lines, l, english))
    .filter((d) => d.score >= 0)
    .reduce<DateCandidate | null>((a, b) => (!a || b.score > a.score ? b : a), null);
  return best ? { date: best.date, ambiguous: best.ambiguous } : { date: null, ambiguous: false };
}

const NUMBER_LABEL =
  /(?:(?:factura|fra\.|invoice|abono|rectificativa)\s*(?:n[ºo°]\.?|number|numero|num\.|no\.|#)?|n[ºo°]\.?\s*(?:de\s*)?(?:factura|fra\.?)?|numero(?:\s+de)?(?:\s+factura)?)\s*[:.]?\s*/g;
const NUMBER_VALUE = /^[#[(]?([a-z]{0,6}[-/ ]?\d[\w\-/.]*)/i;

/** The number after a label, on its cell or right under it. */
function numberAfter(lines: Line[], l: number, c: Cell, at: number): string | undefined {
  const own = NUMBER_VALUE.exec(c.text.slice(at))?.[1];
  if (own || at < c.low.length) return own;
  const under = lines[l + 1]?.cells.find((x) => apart(x, c) < 20);
  return under && NUMBER_VALUE.exec(under.text)?.[1];
}

/** The invoice numbers printed (one, or several when the PDF holds more than one invoice). */
function numbersOf(lines: Line[]): string[] {
  const out = new Set<string>();
  lines.forEach((line, l) => {
    for (const c of line.cells) {
      for (const m of c.low.matchAll(NUMBER_LABEL)) {
        // «Fecha factura: 12/03/2026» is a date.
        if (/fecha\s*$/.test(c.low.slice(0, m.index))) continue;
        const value = numberAfter(lines, l, c, m.index + m[0].length);
        if (value && datesIn(fold(value)).length === 0 && amountsIn(value).length === 0)
          out.add(value.replace(/[.,;:]+$/, ''));
      }
    }
  });
  return Array.from(out);
}

/** What was bought: the first descriptions under the «Descripción/Concepto» heading. */
function conceptOf(lines: Line[]): string {
  const at = findLabel(lines, /^(descripcion|concepto|description|detalle|articulo|servicio)\b/);
  if (!at) return '';
  const head = textAt(lines, at);
  const out: string[] = [];
  for (let l = at.line + 1; l < lines.length && out.length < 3; l++) {
    const c = lines[l].cells.find((x) => apart(x, head) < 40 && !hasAmount(x));
    if (!c || lines[l].cells.some((x) => fieldOf(x.low))) break;
    if (/[a-z]{3}/.test(c.low)) out.push(c.text);
  }
  return out.join(', ');
}

/** A VAT line: its amount and, when the base is on the same line («21 % s/ 1.000,00 … 210,00»), its base. */
function vatLine(v: Reading): RawTax {
  const rate = v.rate;
  const pairs =
    rate === null
      ? []
      : v.amounts.flatMap((a) =>
          v.amounts.filter((b) => b !== a && close(round2((a * rate) / 100), b)).map((b) => [a, b])
        );
  if (pairs.length > 0) return { rate, base: pairs[0][0], vat: pairs[0][1] };
  return { rate, base: null, vat: v.amounts[v.amounts.length - 1] };
}

/** Several rates and one base: each base from its VAT; a 0 % line takes what is left. */
function splitBases(lines: RawTax[], plainBase: number | null, review: Set<ReviewCode>): RawTax[] {
  const missing = lines.filter((t) => t.base === null);
  for (const t of missing) {
    if (t.rate) t.base = round2(((t.vat as number) * 100) / t.rate);
  }
  const sum = round2(lines.reduce((s, t) => s + (t.base ?? 0), 0));
  const zero = lines.find((t) => t.base === null);
  if (plainBase === null || missing.length === 0) return lines;
  if (zero) zero.base = round2(plainBase - sum);
  else if (Math.abs(sum - plainBase) > TOLERANCE * lines.length) review.add('split');
  return lines;
}

/** Bases per VAT rate from the labels on their own lines. */
function taxesOfReadings(readings: Reading[], review: Set<ReviewCode>): RawTax[] {
  const bases = readings.filter((r) => r.field === 'base' && valued(r));
  const vats = readings.filter((r) => r.field === 'vat' && valued(r));
  const plainBase = bases.filter((b) => b.rate === null).pop()?.amounts[0] ?? null;
  const withRate = bases.filter((b) => b.rate !== null);
  if (vats.length === 0) {
    if (withRate.length > 0)
      return withRate.map((b) => ({ rate: b.rate, base: b.amounts[0], vat: null }));
    return plainBase === null ? [] : [{ rate: null, base: plainBase, vat: null }];
  }
  const lines = vats.map(vatLine).map((t) => ({
    ...t,
    base: t.base ?? withRate.find((b) => b.rate === t.rate)?.amounts[0] ?? null,
  }));
  if (lines.length > 1) return splitBases(lines, plainBase, review);
  lines[0].base ??= plainBase;
  return lines;
}

/** The rows of a breakdown table as tax lines. */
const taxesOfRows = (rows: Row[]): RawTax[] =>
  rows
    .filter((r) => r.base !== undefined || r.vat !== undefined)
    .map((r) => ({ rate: r.rate ?? null, base: r.base ?? null, vat: r.vat ?? null }));

/** The rate of a tax line: as printed when the draft takes it, or the one its amounts point to. */
function rateOfLine(t: RawTax, exempt: boolean, review: Set<ReviewCode>): VatRate | null {
  if (t.rate !== null) {
    const rate = validRate(t.rate);
    if (rate === null) review.add('rate');
    return rate;
  }
  if (t.base !== null && t.vat !== null) return rateOfAmounts(t.base, t.vat);
  return exempt ? 0 : null;
}

/** Every tax line completed with what the others say: its VAT from its base, or its base from its VAT. */
function completeTaxes(taxes: RawTax[], exempt: boolean, review: Set<ReviewCode>): TaxLine[] {
  return taxes.map((t) => {
    const rate = rateOfLine(t, exempt, review);
    if (rate === null) return { rate, base: t.base, vat: t.vat };
    if (t.vat === null && t.base !== null)
      return { rate, base: t.base, vat: round2((t.base * rate) / 100) };
    if (t.base === null && t.vat !== null && rate > 0)
      return { rate, base: round2((t.vat * 100) / rate), vat: t.vat };
    return { rate, base: t.base, vat: t.vat };
  });
}

const FOREIGN: [RegExp, string][] = [
  [/\$|\busd\b|dolares|dollars?\b/, 'USD'],
  [/£|\bgbp\b|pounds? sterling|libras/, 'GBP'],
  [/\bchf\b|francos suizos|swiss francs?/, 'CHF'],
];

/** Why a PDF cannot be read as an invoice, or null when it can. */
function rejection(
  pages: PdfToken[][],
  lines: Line[],
  low: string
): Extract<InvoicePdfParse, { ok: false }> | null {
  const letters = pages.flat().reduce((n, t) => n + (t.text.match(/\p{L}/gu)?.length ?? 0), 0);
  if (letters < 20) return { ok: false, reason: 'noText' };
  const cells = lines.flatMap((l) => l.cells);
  const traits = [
    /\btotal\b/.test(low),
    /\biva\b|\bvat\b|i\.v\.a/.test(low),
    /base imponible|subtotal|taxable|\bbase\b/.test(low),
    cells.some((c) => taxIdsIn(c.text).length > 0),
  ];
  const named = /factura|invoice|abono|credit note|rectificativa/.test(low);
  if (!named || !cells.some(hasAmount) || traits.filter(Boolean).length < 2)
    return { ok: false, reason: 'notInvoice' };
  const foreign = FOREIGN.find(([re]) => re.test(low));
  if (foreign && !/€|\beur\b|euros?\b/.test(low))
    return { ok: false, reason: 'currency', currency: foreign[1] };
  return null;
}

/** What the totals block says besides the bases: withholding, surcharge and the printed totals. */
interface Totals {
  withheld: number | null;
  withheldRate: number | null;
  surcharge: number;
  printed: number[];
}

function totalsOf(rows: Row[], readings: Reading[]): Totals {
  const first = (field: Field) => readings.find((r) => r.field === field);
  const fromRows = (field: Field) => rows.find((r) => r[field] !== undefined)?.[field];
  const last = (r: Reading | undefined) => r?.amounts[r.amounts.length - 1];
  return {
    withheld: fromRows('withheld') ?? last(first('withheld')) ?? null,
    withheldRate: first('withheld')?.rate ?? null,
    surcharge: fromRows('surcharge') ?? last(first('surcharge')) ?? 0,
    printed: [
      ...rows.flatMap((r) => (r.total === undefined ? [] : [r.total])),
      ...readings.filter((r) => r.field === 'total' && valued(r)).map((r) => last(r) as number),
    ],
  };
}

/** A single base without a VAT line: its rate is the one the printed total leaves. */
function rateFromTotal(taxes: TaxLine[], totals: Totals, withheld: number): TaxLine[] {
  const [only] = taxes;
  if (taxes.length !== 1 || only.rate !== null || only.base === null || totals.printed.length === 0)
    return taxes;
  const total = totals.printed[totals.printed.length - 1];
  const vat = round2(total + withheld - Math.abs(totals.surcharge) - only.base);
  const rate = rateOfAmounts(only.base, vat);
  return rate === null ? taxes : [{ rate, base: only.base, vat }];
}

/** What the tax lines add up to (an unread amount counts as nothing). */
const sumOf = (taxes: TaxLine[], field: 'base' | 'vat') =>
  taxes.reduce((s, t) => s + (t[field] ?? 0), 0);

interface Sums {
  total: number | null;
  mismatch: InvoicePdf['mismatch'];
}

/** Base + VAT + surcharge − withholding against the printed totals (with or without the withholding). */
function reconcile(
  taxes: TaxLine[],
  totals: Totals,
  withheld: number,
  review: Set<ReviewCode>
): Sums {
  const gross = round2(sumOf(taxes, 'base') + sumOf(taxes, 'vat') + Math.abs(totals.surcharge));
  const expected = round2(gross - withheld);
  const { printed } = totals;
  const total = printed.find((t) => close(t, expected)) ?? printed.find((t) => close(t, gross));
  if (printed.length === 0) {
    review.add('noTotal');
    return { total: null, mismatch: null };
  }
  const shown = printed[printed.length - 1];
  if (total !== undefined || review.has('amount')) return { total: total ?? shown, mismatch: null };
  review.add('mismatch');
  return { total: shown, mismatch: { expected, total: shown } };
}

/** The amounts of an invoice by its labels, reconciled with its total. */
function amountsOf(lines: Line[], low: string, review: Set<ReviewCode>) {
  const table = tableReadings(lines);
  const readings = inlineReadings(lines, table.used);
  const fromRows = taxesOfRows(table.rows);
  const raw = fromRows.length > 0 ? fromRows : taxesOfReadings(readings, review);
  const totals = totalsOf(table.rows, readings);
  const all = [...totals.printed, ...raw.flatMap((t) => [t.base ?? 0, t.vat ?? 0])];
  const negative = all.some((n) => n < 0);
  const abs = (n: number | null) => (n === null ? null : Math.abs(n));
  const positive = raw.map((t) => ({ rate: t.rate, base: abs(t.base), vat: abs(t.vat) }));
  totals.printed = totals.printed.map(Math.abs);
  let withheld = Math.abs(totals.withheld ?? 0);
  let taxes = rateFromTotal(
    completeTaxes(positive, /exent[oa]|no sujet/.test(low), review),
    totals,
    withheld
  );
  // Nothing readable: one empty line, for the person to complete.
  if (taxes.length === 0) taxes = [{ rate: null, base: null, vat: null }];
  if (taxes.some((t) => t.base === null || t.vat === null || t.rate === null)) review.add('amount');
  // The withholding may come as a rate only: «Retención 15 %».
  if (totals.withheld === null && totals.withheldRate !== null)
    withheld = round2((sumOf(taxes, 'base') * totals.withheldRate) / 100);
  if (/recargo( de)? equivalencia/.test(low) || totals.surcharge !== 0) review.add('surcharge');
  return { taxes, withheld, negative, ...reconcile(taxes, totals, withheld, review) };
}

/** Amounts in another currency next to the euros, or VAT that the buyer declares. */
function flagsOf(low: string, review: Set<ReviewCode>) {
  if (FOREIGN.some(([re]) => re.test(low))) review.add('currency');
  if (/inversion del sujeto pasivo|reverse charge/.test(low)) review.add('reverse');
}

/** Date, number and parties of an invoice, with what to check about them. */
function headOf(pages: PdfToken[][], lines: Line[], low: string, review: Set<ReviewCode>) {
  const { date, ambiguous } = dateOf(lines, /invoice/.test(low) && !/factura/.test(low));
  if (!date) review.add('date');
  if (ambiguous) review.add('dateFormat');
  const numbers = numbersOf(lines);
  if (numbers.length > 1 && pages.length > 1) review.add('several');
  const { issuer, client } = partiesOf(lines);
  if (!issuer.name && !issuer.nif) review.add('issuer');
  return { date, number: numbers[0] ?? null, issuer, client };
}

/** Reads an invoice from the pieces of text of its pages. */
export function parseInvoiceTokens(pages: PdfToken[][]): InvoicePdfParse {
  const lines = linesOf(pages);
  const low = lines.map((l) => l.cells.map((c) => c.low).join('  ')).join('\n');
  const rejected = rejection(pages, lines, low);
  if (rejected) return rejected;
  const review = new Set<ReviewCode>();
  flagsOf(low, review);
  const head = headOf(pages, lines, low, review);
  const amounts = amountsOf(lines, low, review);
  const credit =
    amounts.negative || /rectificativa|\babono\b|credit note|nota de credito/.test(low);
  const signed = (n: number) => (credit && n !== 0 ? -n : n);
  const maybe = (n: number | null) => (n === null ? null : signed(n));
  return {
    ok: true,
    invoice: {
      ...head,
      taxes: amounts.taxes.map((t) => ({ rate: t.rate, base: maybe(t.base), vat: maybe(t.vat) })),
      withheld: signed(amounts.withheld),
      total: maybe(amounts.total),
      credit,
      concept: conceptOf(lines),
      review: Array.from(review),
      mismatch: amounts.mismatch && {
        expected: signed(amounts.mismatch.expected),
        total: signed(amounts.mismatch.total),
      },
    },
  };
}

// ─── Issued or received, and the invoice as entries of a book ────────────────

/** The self-employed person, as the app learnt it from an invoice they said they issued. */
export interface Me {
  nif: string | null;
  name: string | null;
}

const nameKey = (name: string | null) =>
  fold(name ?? '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const same = (a: Party, me: Me) =>
  (a.nif !== null && a.nif === me.nif) ||
  (nameKey(a.name) !== '' && nameKey(a.name) === nameKey(me.name));

/**
 * Which book an invoice goes to. Known person: their tax id or name says it. Otherwise it is an
 * expense (the usual case), unless it withholds IRPF from a company: the person is likely its issuer.
 * `sure` is false when the person should be asked (`book` null) or may want to change it.
 */
export function bookOf(
  invoice: InvoicePdf,
  me: Me | null
): { book: BookKind | null; sure: boolean } {
  if (me) {
    if (same(invoice.issuer, me)) return { book: 'issued', sure: true };
    if (same(invoice.client, me)) return { book: 'received', sure: true };
    return { book: null, sure: false };
  }
  if (invoice.withheld !== 0 && isCompany(invoice.client)) return { book: null, sure: false };
  return { book: 'received', sure: false };
}

/** Fields of an entry the PDF did not give: the person completes them in the review. */
export type Missing = 'date' | 'base' | 'rate';

export interface PdfEntry extends BookEntry {
  missing: Missing[];
}

const missingOf = (invoice: InvoicePdf, t: TaxLine): Missing[] => [
  ...(invoice.date ? [] : ['date' as const]),
  ...(t.base === null ? ['base' as const] : []),
  ...(t.rate === null ? ['rate' as const] : []),
];

/**
 * Who withheld what: an issued invoice keeps the client's withholding (for the 130); a received one
 * what the person withheld from the supplier, and the supplier's tax id (modelos 111 and 115).
 */
function withholdingOf(
  invoice: InvoicePdf,
  book: BookKind,
  first: boolean
): Pick<BookEntry, 'withheld' | 'retention' | 'nif'> {
  if (book === 'issued') return { withheld: first ? invoice.withheld : 0 };
  return {
    withheld: 0,
    ...(first && invoice.withheld !== 0 ? { retention: invoice.withheld } : {}),
    ...(invoice.issuer.nif ? { nif: invoice.issuer.nif } : {}),
  };
}

/** The invoice as one entry per VAT rate; the withholding goes with the first one. */
export function entriesOf(invoice: InvoicePdf, book: BookKind): PdfEntry[] {
  const party = book === 'issued' ? invoice.client : invoice.issuer;
  const month = invoice.date ? Number(invoice.date.slice(5, 7)) : 1;
  return invoice.taxes.map((t, i) => ({
    date: invoice.date ?? '',
    quarter: (Math.floor((month - 1) / 3) + 1) as BookEntry['quarter'],
    base: t.base ?? 0,
    vatRate: t.rate ?? 21,
    vat: t.vat ?? 0,
    total: round2((t.base ?? 0) + (t.vat ?? 0)),
    ...withholdingOf(invoice, book, i === 0),
    concept: party.name ?? party.nif ?? '',
    missing: missingOf(invoice, t),
  }));
}

/** The kind of an expense from its supplier and, when that says nothing, from what was bought. */
export function kindOfInvoice(invoice: InvoicePdf): ExpenseKind {
  const bySupplier = guessExpenseKind(invoice.issuer.name ?? '');
  return bySupplier !== 'other' ? bySupplier : guessExpenseKind(invoice.concept);
}
