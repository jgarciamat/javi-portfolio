import { type ColumnMapping, detectColumns } from './importParsers';

/**
 * Bank statement layouts we recognise from the header row, so the import works with the
 * file as downloaded: preamble lines before the header, split columns, fees and states.
 * Anything else still goes through the generic column detection.
 */
export type BankId = 'caixabank' | 'bbva' | 'santander' | 'ing' | 'revolut';

export interface BankFormat {
  bank: BankId | null;
  /** Index (in the parsed table) of the header row. */
  headerRow: number;
}

const normalize = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

const has = (names: string[], ...parts: string[]): boolean =>
  parts.every((p) => names.some((n) => n === p || n.startsWith(p)));

/** Signature of each bank in its header row (normalised, accent-free). */
const SIGNATURES: { bank: BankId; test: (names: string[]) => boolean }[] = [
  {
    bank: 'revolut',
    test: (n) =>
      (has(n, 'started date') || has(n, 'fecha de inicio')) &&
      (has(n, 'completed date') || has(n, 'fecha de finalizacion')),
  },
  {
    bank: 'caixabank',
    test: (n) => has(n, 'ingreso (+)', 'gasto (-)') || has(n, 'concepto comun'),
  },
  { bank: 'ing', test: (n) => has(n, 'f. valor', 'descripcion', 'subcategoria') },
  { bank: 'bbva', test: (n) => has(n, 'f.valor', 'concepto', 'movimiento', 'importe') },
  {
    bank: 'santander',
    test: (n) => has(n, 'fecha operacion', 'fecha valor', 'concepto', 'importe'),
  },
];

const DATE_WORDS = ['fecha', 'date', 'f. valor', 'f.valor', 'f. operacion'];
const MONEY_WORDS = ['importe', 'amount', 'cargo', 'abono', 'ingreso', 'gasto', 'debe', 'haber'];

/** A header row names a date column and a money column. */
function looksLikeHeader(names: string[]): boolean {
  const some = (words: string[]) => names.some((n) => words.some((w) => n.includes(w)));
  return some(DATE_WORDS) && some(MONEY_WORDS);
}

const HEADER_SEARCH_ROWS = 25;

/** Finds the header row (banks put account details above it) and the bank, if known. */
export function detectBank(table: string[][]): BankFormat {
  const limit = Math.min(table.length, HEADER_SEARCH_ROWS);
  for (let row = 0; row < limit; row++) {
    const names = table[row].map(normalize);
    const known = SIGNATURES.find((s) => s.test(names));
    if (known) return { bank: known.bank, headerRow: row };
  }
  for (let row = 0; row < limit; row++) {
    if (looksLikeHeader(table[row].map(normalize))) return { bank: null, headerRow: row };
  }
  return { bank: null, headerRow: 0 };
}

const column = (names: string[], ...candidates: string[]): number => {
  for (const c of candidates) {
    const index = names.findIndex((n) => n === c || n.startsWith(c));
    if (index >= 0) return index;
  }
  return -1;
};

const COMPLETED = ['completed', 'completado', 'completada'];

/** Revolut: only completed rows, dated when they finished, with the fee taken off. */
function revolutTable(table: string[][]): string[][] {
  const names = table[0].map(normalize);
  const date = column(names, 'completed date', 'fecha de finalizacion', 'started date');
  const description = column(names, 'description', 'descripcion');
  const amount = column(names, 'amount', 'importe');
  const fee = column(names, 'fee', 'comision');
  const state = column(names, 'state', 'estado');
  const num = (s: string | undefined): number => {
    const value = Number((s ?? '').replace(',', '.'));
    return Number.isFinite(value) ? value : 0;
  };
  const rows = table.slice(1).filter((cells) => {
    if (state < 0) return true;
    return COMPLETED.includes(normalize(cells[state] ?? ''));
  });
  return [
    ['Fecha', 'Descripción', 'Importe'],
    ...rows.map((cells) => [
      cells[date] ?? '',
      cells[description] ?? '',
      String(Math.round((num(cells[amount]) - Math.abs(num(cells[fee]))) * 100) / 100),
    ]),
  ];
}

/** CaixaBank spreads the concept over several columns: join them. */
function caixabankTable(table: string[][]): string[][] {
  const names = table[0].map(normalize);
  const date = column(names, 'f. operacion', 'fecha operacion', 'f. valor');
  const income = column(names, 'ingreso');
  const expense = column(names, 'gasto');
  const concepts = ['concepto comun', 'concepto propio', 'concepto complementario'].flatMap((c) =>
    names.map((n, i) => (n.startsWith(c) ? i : -1)).filter((i) => i >= 0)
  );
  return [
    ['Fecha', 'Concepto', 'Ingreso', 'Gasto'],
    ...table.slice(1).map((cells) => [
      cells[date] ?? '',
      concepts
        .map((i) => cells[i] ?? '')
        .filter(Boolean)
        .join(' '),
      cells[income] ?? '',
      cells[expense] ?? '',
    ]),
  ];
}

/** The table, from its header down, in the generic shape when the bank needs adapting. */
export function normalizeBankTable(table: string[][], bank: BankId | null): string[][] {
  if (bank === 'revolut') return revolutTable(table);
  if (bank === 'caixabank') return caixabankTable(table);
  return table;
}

/** Column mapping for a table; ING's own categories do not match ours, so they are ignored. */
export function bankMapping(headers: string[], bank: BankId | null): ColumnMapping {
  const mapping = detectColumns(headers);
  return bank === 'ing' ? { ...mapping, category: -1 } : mapping;
}
