import type { ImportRowDTO } from './types';

/**
 * Parsers for bank statements: generic CSV exports (any delimiter, Spanish or
 * English number formats) and the Spanish banking format Norma 43 (AEB C43).
 */

// ─── CSV ─────────────────────────────────────────────────────────────────────

/** Most frequent candidate delimiter in the first lines (outside quotes). */
export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 10).join('\n');
  const candidates = [';', ',', '\t', '|'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    let count = 0;
    let quoted = false;
    for (const ch of sample) {
      if (ch === '"') quoted = !quoted;
      else if (ch === d && !quoted) count++;
    }
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

interface CsvState {
  rows: string[][];
  row: string[];
  cell: string;
  quoted: boolean;
}

function endCell(st: CsvState): void {
  st.row.push(st.cell);
  st.cell = '';
}

function endRow(st: CsvState): void {
  endCell(st);
  st.rows.push(st.row);
  st.row = [];
}

/** Handles one character inside quotes; returns how many characters were consumed. */
function readQuoted(st: CsvState, text: string, i: number): number {
  if (text[i] !== '"') {
    st.cell += text[i];
    return 1;
  }
  if (text[i + 1] === '"') {
    st.cell += '"';
    return 2;
  }
  st.quoted = false;
  return 1;
}

/** Handles one character outside quotes; returns how many characters were consumed. */
function readPlain(st: CsvState, text: string, i: number, delimiter: string): number {
  const ch = text[i];
  if (ch === '"') st.quoted = true;
  else if (ch === delimiter) endCell(st);
  else if (ch === '\n' || ch === '\r') {
    endRow(st);
    return ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
  } else st.cell += ch;
  return 1;
}

/** RFC 4180-style parser (quotes, escaped quotes, newlines inside quotes). */
export function parseCSV(text: string, delimiter = detectDelimiter(text)): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const st: CsvState = { rows: [], row: [], cell: '', quoted: false };
  let i = 0;
  while (i < clean.length) {
    i += st.quoted ? readQuoted(st, clean, i) : readPlain(st, clean, i, delimiter);
  }
  if (st.cell !== '' || st.row.length > 0) endRow(st);
  return st.rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

/**
 * Parses "1.234,56", "-1,234.56", "12,30 €", "(45.00)" … The last separator
 * followed by 1–2 digits is taken as the decimal one.
 */
/** Removes sign markers: "(45)", "45-", "-45", "+45". */
function extractSign(value: string): { negative: boolean; digits: string } {
  let s = value;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[^\d.,+-]/g, '');
  if (s.endsWith('-')) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  if (s.startsWith('-')) negative = !negative;
  return { negative, digits: s.replace(/^[+-]/, '') };
}

/** The last separator followed by 1–2 digits is the decimal one; the rest are thousands. */
function normalizeDecimal(s: string): string {
  const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  const decimals = s.length - lastSep - 1;
  if (lastSep < 0 || decimals < 1 || decimals > 2) return s.replace(/[.,]/g, '');
  return `${s.slice(0, lastSep).replace(/[.,]/g, '')}.${s.slice(lastSep + 1)}`;
}

export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const { negative, digits } = extractSign(trimmed);
  const normalized = normalizeDecimal(digits);
  const value = Number(normalized);
  if (normalized === '' || !Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY and two-digit years. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s.split(' ')[0]);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return toIso(year, Number(m[2]), Number(m[1]));
  }
  return null;
}

function toIso(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day)
    return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export interface ColumnMapping {
  date: number;
  description: number;
  /** Single signed amount column… */
  amount: number;
  /** …or separate debit / credit columns (-1 when not used). */
  debit: number;
  credit: number;
  category: number;
}

const HEADER_HINTS: Record<keyof ColumnMapping, string[]> = {
  date: ['fecha operacion', 'fecha', 'date', 'f. operacion', 'fecha valor'],
  description: [
    'concepto',
    'descripcion',
    'description',
    'detalle',
    'movimiento',
    'payee',
    'texto',
  ],
  amount: ['importe', 'amount', 'cantidad', 'valor'],
  debit: ['cargo', 'debe', 'debit', 'gasto'],
  credit: ['abono', 'haber', 'credit', 'ingreso'],
  category: ['categoria', 'category'],
};

const normalize = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Guesses which column holds each field from the header names. */
export function detectColumns(headers: string[]): ColumnMapping {
  const names = headers.map(normalize);
  const find = (key: keyof ColumnMapping, exclude: number[] = []): number => {
    for (const hint of HEADER_HINTS[key]) {
      const index = names.findIndex((n, i) => !exclude.includes(i) && n.includes(hint));
      if (index >= 0) return index;
    }
    return -1;
  };
  const date = find('date');
  const description = find('description', [date]);
  const amount = find('amount', [date, description]);
  const debit = amount >= 0 ? -1 : find('debit', [date, description]);
  const credit = amount >= 0 ? -1 : find('credit', [date, description, debit]);
  const category = find('category', [date, description, amount]);
  return { date, description, amount, debit, credit, category };
}

export interface ParsedRows {
  rows: ImportRowDTO[];
  /** Line numbers (1-based, header included) that could not be read. */
  skipped: number[];
}

const cellAt = (cells: string[], index: number): string => (index >= 0 ? cells[index] ?? '' : '');

/** Signed amount from a single column or from debit / credit columns. */
function amountFromCells(cells: string[], mapping: ColumnMapping): number | null {
  if (mapping.amount >= 0) return parseAmount(cellAt(cells, mapping.amount));
  const credit = parseAmount(cellAt(cells, mapping.credit));
  if (credit) return Math.abs(credit);
  const debit = parseAmount(cellAt(cells, mapping.debit));
  return debit ? -Math.abs(debit) : null;
}

function rowFromCells(cells: string[], mapping: ColumnMapping): ImportRowDTO | null {
  const date = parseDate(cellAt(cells, mapping.date));
  const description = cellAt(cells, mapping.description).trim();
  const amount = amountFromCells(cells, mapping);
  if (!date || !description || !amount) return null;
  return { date, description, amount, category: cellAt(cells, mapping.category).trim() || null };
}

/** Rows of a CSV table whose first row is the header. */
export function rowsFromCSV(table: string[][], mapping: ColumnMapping): ParsedRows {
  const rows: ImportRowDTO[] = [];
  const skipped: number[] = [];
  table.slice(1).forEach((cells, i) => {
    const row = rowFromCells(cells, mapping);
    if (row) rows.push(row);
    else skipped.push(i + 2); // 1-based line number, header included
  });
  return { rows, skipped };
}

// ─── Norma 43 (AEB Cuaderno 43) ──────────────────────────────────────────────

export function looksLikeNorma43(text: string): boolean {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.length > 0 && lines[0].startsWith('11') && lines.some((l) => l.startsWith('22'));
}

function n43Date(yymmdd: string): string | null {
  const yy = Number(yymmdd.slice(0, 2));
  return toIso(2000 + yy, Number(yymmdd.slice(2, 4)), Number(yymmdd.slice(4, 6)));
}

/**
 * Record 22 (movement): operation date at 11-16 (YYMMDD), debit/credit key at
 * 28 (1 = charge, 2 = credit), amount at 29-42 (14 digits, 2 decimals),
 * references at 53-64 and 65-80. Records 23 that follow carry the concept text
 * in 5-42 and 43-80.
 */
export function parseNorma43(text: string): ParsedRows {
  const rows: ImportRowDTO[] = [];
  const skipped: number[] = [];
  let current: { row: ImportRowDTO; line: number; refs: string } | null = null;
  const concepts: string[] = [];

  const flush = (): void => {
    if (!current) return;
    const description =
      concepts.join(' ').replace(/\s+/g, ' ').trim() || current.refs || 'Movimiento';
    rows.push({ ...current.row, description });
    current = null;
    concepts.length = 0;
  };

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.padEnd(80, ' ');
    const code = line.slice(0, 2);
    if (code === '22') {
      flush();
      const date = n43Date(line.slice(10, 16));
      const sign = line.charAt(27) === '1' ? -1 : 1;
      const cents = Number(line.slice(28, 42));
      if (!date || !Number.isFinite(cents) || cents === 0) {
        skipped.push(index + 1);
        return;
      }
      const refs = `${line.slice(52, 64)} ${line.slice(64, 80)}`.replace(/\s+/g, ' ').trim();
      current = {
        row: { date, description: '', amount: (sign * cents) / 100 },
        line: index + 1,
        refs,
      };
    } else if (code === '23' && current) {
      concepts.push(line.slice(4, 42).trim(), line.slice(42, 80).trim());
    } else if (code === '33' || code === '88') {
      flush();
    }
  });
  flush();
  return { rows, skipped };
}
