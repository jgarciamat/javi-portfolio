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

/** Rows that start another known header (a report with several blocks one under another). */
function blocks(rows: Cell[][]): { start: number; spec: FormatSpec }[] {
  const found: { start: number; spec: FormatSpec }[] = [];
  rows.forEach((row, i) => {
    const header = row.map(norm);
    const spec = FORMATS.find((s) => fits(header, s));
    if (spec) found.push({ start: i, spec });
  });
  return found;
}

/** Reads every table of a file with the formats it fits. */
export function readTables(tables: Table[], source: string): TableReading[] {
  const out: TableReading[] = [];
  for (const table of tables.flatMap(splitSections)) {
    const found = blocks(table.rows);
    if (found.length === 0) {
      const headerRow = guessHeader(table.rows);
      out.push({
        table: table.name,
        format: null,
        ops: [],
        skipped: 0,
        header: (table.rows[headerRow] ?? []).map((c) => String(c ?? '')),
        headerRow,
      });
      continue;
    }
    found.forEach(({ start, spec }, i) => {
      const end = found[i + 1]?.start ?? table.rows.length;
      const rows = table.rows.slice(0, end);
      const { ops, skipped } = readWith(spec, rows, start, `${source}:${table.name}`);
      out.push({ table: table.name, format: spec, ops, skipped, header: [], headerRow: start });
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
