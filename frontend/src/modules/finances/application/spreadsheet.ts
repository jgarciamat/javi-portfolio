import { strFromU8, unzipSync } from 'fflate';
import { dateFromSerial } from '../domain/excelDates';
import { parseCSV } from '../domain/importParsers';

/** A cell as the person sees it: text, a number, or nothing. Dates come as `YYYY-MM-DD` text. */
export type Cell = string | number | null;

export interface Sheet {
  name: string;
  rows: Cell[][];
}

/** What an .xlsx file can hold before we refuse it: far above any statement or invoice book. */
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 20000;
const MAX_COLUMNS = 100;
/** Entries larger than this once unzipped are never opened (a zip bomb would live there). */
const MAX_ENTRY_BYTES = 30 * 1024 * 1024;

export class SpreadsheetError extends Error {
  constructor(readonly code: 'tooBig' | 'unsupported' | 'unreadable') {
    super(code);
  }
}

const NEEDED =
  /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/[^/]+\.xml)$/;

const xml = (bytes: Uint8Array): Document =>
  new DOMParser().parseFromString(strFromU8(bytes), 'application/xml');

const all = (node: Document | Element, name: string): Element[] =>
  Array.from(node.getElementsByTagNameNS('*', name));

/** "AB12" → column index 27 (0 based). */
function columnOf(ref: string): number {
  let index = 0;
  for (const ch of ref.replace(/[^A-Za-z]/g, '').toUpperCase())
    index = index * 26 + ch.charCodeAt(0) - 64;
  return index - 1;
}

/** The text of a shared or inline string: its runs joined, phonetic hints left out. */
function textOf(si: Element): string {
  return all(si, 't')
    .filter((t) => t.parentElement?.localName !== 'rPh')
    .map((t) => t.textContent as string)
    .join('');
}

/** Built-in number formats that show a date (the other date ones depend on the language of Excel). */
const BUILT_IN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function isDateFormatCode(code: string): boolean {
  const plain = code
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\\./g, '');
  return /[dmy]/i.test(plain) && !/general/i.test(plain);
}

/** For every cell style (by index): whether its number format is a date. */
function dateStyles(doc: Document | null): boolean[] {
  if (!doc) return [];
  const custom = new Map<number, string>();
  for (const fmt of all(doc, 'numFmt')) {
    custom.set(Number(fmt.getAttribute('numFmtId')), fmt.getAttribute('formatCode') ?? '');
  }
  const cellXfs = all(doc, 'cellXfs')[0];
  if (!cellXfs) return [];
  return Array.from(cellXfs.children).map((xf) => {
    const id = Number(xf.getAttribute('numFmtId'));
    const code = custom.get(id);
    return code === undefined ? BUILT_IN_DATE_FORMATS.has(id) : isDateFormatCode(code);
  });
}

/** A cell that holds a number, or a date when its style is a date format. */
function numberCell(raw: string, style: number, dates: boolean[]): Cell {
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  return dates[style] && value >= 1 ? dateFromSerial(value) : value;
}

function cellValue(cell: Element, strings: string[], dates: boolean[]): Cell {
  const type = cell.getAttribute('t');
  if (type === 'inlineStr') {
    const is = all(cell, 'is')[0];
    return is ? textOf(is) : null;
  }
  const raw = all(cell, 'v')[0]?.textContent ?? '';
  if (raw === '' || type === 'e') return null;
  if (type === 's') return strings[Number(raw)] ?? null;
  if (type === 'str') return raw;
  if (type === 'b') return raw === '1' ? 1 : 0;
  return numberCell(raw, Number(cell.getAttribute('s') ?? 0), dates);
}

function readSheet(doc: Document, strings: string[], dates: boolean[]): Cell[][] {
  const rows: Cell[][] = [];
  for (const row of all(doc, 'row')) {
    const index = Number(row.getAttribute('r')) - 1;
    if (!(index >= 0) || index >= MAX_ROWS) continue;
    const cells: Cell[] = [];
    for (const cell of all(row, 'c')) {
      const col = columnOf(cell.getAttribute('r') ?? '');
      if (col < 0 || col >= MAX_COLUMNS) continue;
      cells[col] = cellValue(cell, strings, dates);
    }
    // Sparse → dense: empty cells are null so every row can be read by position.
    rows[index] = Array.from(cells, (c) => c ?? null);
  }
  return Array.from(rows, (r) => r ?? []);
}

/** The files of the workbook that matter, unzipped; anything else (images, macros) is never opened. */
function unzipWorkbook(buffer: ArrayBuffer): Record<string, Uint8Array> {
  if (buffer.byteLength > MAX_BYTES) throw new SpreadsheetError('tooBig');
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer), {
      filter: (f) => f.originalSize <= MAX_ENTRY_BYTES && NEEDED.test(f.name),
    });
  } catch {
    throw new SpreadsheetError('unreadable');
  }
  if (!files['xl/workbook.xml']) throw new SpreadsheetError('unreadable');
  return files;
}

/** Where each sheet of the workbook lives inside the zip, by relationship id. */
function sheetPaths(files: Record<string, Uint8Array>): Map<string, string> {
  const targets = new Map<string, string>();
  const relsFile = files['xl/_rels/workbook.xml.rels'];
  for (const rel of relsFile ? all(xml(relsFile), 'Relationship') : []) {
    const target = rel.getAttribute('Target') ?? '';
    targets.set(
      rel.getAttribute('Id') ?? '',
      target.startsWith('/') ? target.slice(1) : `xl/${target}`
    );
  }
  return targets;
}

const RELATIONSHIPS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** The sheets of an .xlsx workbook with their cells (formulas give the value Excel saved). */
export function readXlsx(buffer: ArrayBuffer): Sheet[] {
  const files = unzipWorkbook(buffer);
  const sharedFile = files['xl/sharedStrings.xml'];
  const strings = sharedFile ? all(xml(sharedFile), 'si').map(textOf) : [];
  const stylesFile = files['xl/styles.xml'];
  const dates = dateStyles(stylesFile ? xml(stylesFile) : null);
  const targets = sheetPaths(files);

  const sheets: Sheet[] = [];
  for (const sheet of all(xml(files['xl/workbook.xml']), 'sheet')) {
    const file = files[targets.get(sheet.getAttributeNS(RELATIONSHIPS, 'id') ?? '') ?? ''];
    if (file) {
      sheets.push({
        name: sheet.getAttribute('name') ?? '',
        rows: readSheet(xml(file), strings, dates),
      });
    }
  }
  if (sheets.length === 0) throw new SpreadsheetError('unreadable');
  return sheets;
}

/** Banks and gestorías export Latin-1 as often as UTF-8. */
function decode(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
}

/** What a file holds as sheets: .xlsx workbooks, or CSV/TXT as a single sheet. Old .xls is refused. */
export async function readSpreadsheet(file: File): Promise<Sheet[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xls') || name.endsWith('.ods')) throw new SpreadsheetError('unsupported');
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) return readXlsx(buffer);
  return [{ name: file.name, rows: parseCSV(decode(buffer)) }];
}

/** A sheet as text rows, for the importers that already work on CSV tables. */
export function sheetAsText(sheet: Sheet): string[][] {
  return sheet.rows.map((row) => row.map((c) => (c === null ? '' : String(c))));
}
