import { FORMATS } from './formats';
import { fits, readWith, type FormatSpec, type Table } from './read';
import { norm, type Cell } from './text';
import type { InvestOp } from './types';

/** What one table of a file gave: the format recognised and its operations. */
export interface TableReading {
  table: string;
  format: FormatSpec | null;
  ops: InvestOp[];
  skipped: number;
  /** The header row when no format was recognised (for the guided mapping). */
  header: string[];
  headerRow: number;
  /** Rows with something under the header (0: an empty sheet, or one with only its header). */
  dataRows: number;
  /**
   * A sheet with no operations (customer data, summary, instructions): it is not shown nor kept,
   * and the mapping is not asked for it.
   */
  info?: boolean;
}

/** Names of the sheets of a report that hold no operations (NO CONFIRMADO for each platform). */
const INFO_SHEET =
  /customer|assets? overview|balance|saldo|client|cliente|information|informaci[oó]n|summary|resumen|instruc|disclaimer|aviso|readme|cover|portada|glossary|glosario|overview|notes|notas|legal/i;

/**
 * The readings of a file, with its unknown tables marked as informative when they look like one
 * (customer data, balances, a summary), have no rows or under three columns; their header is
 * dropped (it may hold the name or the id of the customer). Any other unknown sheet with data is
 * offered the guided mapping, on its own.
 */
export function withInfoSheets(readings: TableReading[]): TableReading[] {
  return readings.map((r) =>
    !r.format && (INFO_SHEET.test(r.table) || r.header.length < 3 || r.dataRows === 0)
      ? { ...r, info: true, header: [] }
      : r
  );
}

/**
 * Interactive Brokers' statement: every row starts with its section ("Trades", "Dividends") and
 * "Header" or "Data". Each section becomes a table of its own, with a mark for the income sections.
 */
export function splitSections(table: Table): Table[] {
  const first = table.rows[0] ?? [];
  if (norm(first[1]) !== 'header') return [table];
  const out = new Map<string, Table>();
  for (const row of table.rows) {
    const section = String(row[0]);
    const kind = norm(row[1]);
    if (kind === 'header') {
      const mark = {
        dividends: 'dividends',
        'withholding tax': 'withholding',
        interest: 'interest',
      }[norm(section)];
      const header = [...row.slice(2), ...(mark ? [`__ibkr_${mark}`] : [])];
      out.set(section, { name: `${table.name} · ${section}`, rows: [header] });
    } else if (kind === 'data') out.get(section)?.rows.push(row.slice(2));
  }
  return [...out.values()];
}

/** A JSON export: an array of objects (or an object holding one) as a table with its keys as header. */
export function jsonTables(name: string, text: string): Table[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const lists: [string, unknown[]][] = Array.isArray(data)
    ? [[name, data]]
    : Object.entries((data ?? {}) as Record<string, unknown>).filter(
        (e): e is [string, unknown[]] => Array.isArray(e[1])
      );
  return lists.map(([key, list]) => {
    const objects = list.filter((o): o is Record<string, unknown> => !!o && typeof o === 'object');
    const keys = [...new Set(objects.flatMap((o) => Object.keys(o)))];
    const cell = (v: unknown): Cell =>
      typeof v === 'number' || typeof v === 'string' ? v : v == null ? null : JSON.stringify(v);
    return {
      name: `${name} · ${key}`,
      rows: [keys, ...objects.map((o) => keys.map((k) => cell(o[k])))],
    };
  });
}

/** A format of a workbook's sheet: never for a whole file (a CSV is named after its file). */
const ofSheet = (re: RegExp, name: string) =>
  !/\.(csv|txt|json|xlsx?|xlsm|pdf)\b/i.test(name) && re.test(name);

/** Rows that start another known header (a report with several blocks one under another). */
function blocks(rows: Cell[][], sheet: string): { start: number; spec: FormatSpec }[] {
  const found: { start: number; spec: FormatSpec }[] = [];
  rows.forEach((row, i) => {
    const header = row.map(norm);
    const spec = FORMATS.find((s) => (!s.sheet || ofSheet(s.sheet, sheet)) && fits(header, s));
    if (spec) found.push({ start: i, spec });
  });
  return found;
}

const hasData = (row: Cell[]) => row.some((c) => c !== null && String(c).trim() !== '');

/** Reads every table of a file with the formats it fits. */
export function readTables(tables: Table[], source: string): TableReading[] {
  const out: TableReading[] = [];
  for (const table of tables.flatMap(splitSections)) {
    const found = blocks(table.rows, table.name);
    if (found.length === 0) {
      const headerRow = guessHeader(table.rows);
      out.push({
        table: table.name,
        format: null,
        ops: [],
        skipped: 0,
        header: (table.rows[headerRow] ?? []).map((c) => String(c ?? '')),
        headerRow,
        dataRows: table.rows.slice(headerRow + 1).filter(hasData).length,
      });
      continue;
    }
    found.forEach(({ start, spec }, i) => {
      const end = found[i + 1]?.start ?? table.rows.length;
      const rows = table.rows.slice(0, end);
      const read = readWith(spec, rows, start, `${source}:${table.name}`, table.name);
      out.push({
        table: table.name,
        format: spec,
        ops: read.ops,
        skipped: read.skipped,
        header: [],
        headerRow: start,
        dataRows: read.rows,
      });
    });
  }
  return out;
}

/** The header of an unknown table: the first of the top rows with three or more texts. */
export function guessHeader(rows: Cell[][]): number {
  const i = rows
    .slice(0, 30)
    .findIndex((r) => r.filter((c) => typeof c === 'string' && /[a-z]/i.test(c)).length >= 3);
  return Math.max(0, i);
}
