import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { errorMessage } from '@shared/utils/errors';
import { todayDateOnly } from '@shared/utils/format';
import { storage } from '@shared/utils/storage';
import type { ImportResult, ImportRowDTO, TransactionType } from '@modules/finances/domain/types';
import {
  type BankId,
  bankMapping,
  detectBank,
  normalizeBankTable,
} from '@modules/finances/domain/bankFormats';
import {
  type ColumnMapping,
  type ParsedRows,
  detectColumns,
  detectDelimiter,
  looksLikeNorma43,
  parseCSV,
  parseNorma43,
  rowsFromCSV,
  withType,
} from '@modules/finances/domain/importParsers';
import { parsePastedMovements } from '@modules/finances/domain/pastedMovements';

import { BankPdfError, readBankPdf } from '../bankPdf';
import { readScreenshot } from '../ocr';
import { readSpreadsheet, sheetAsText } from '../spreadsheet';

export type ImportStep = 'file' | 'mapping' | 'preview' | 'done';
/** Where the movements come from: a file, text pasted from the bank's app or a screenshot of it. */
export type ImportFormat = 'csv' | 'norma43' | 'pdf' | 'text' | 'image';
/** What a row of pasted movements can be corrected in, before the preview. */
export type RowChanges = Partial<Pick<ImportRowDTO, 'date' | 'description' | 'amount'>>;

/** The person's choice to let the AI suggest categories (off until they turn it on). */
const AI_KEY = 'mm_import_ai';

const NO_MAPPING: ColumnMapping = {
  date: -1,
  description: -1,
  amount: -1,
  debit: -1,
  credit: -1,
  category: -1,
  type: -1,
  notes: -1,
};

/** Banks often export Latin-1: fall back to it when UTF-8 decoding produces garbage. */
export async function readStatement(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
}

/**
 * Pasted text that is a table with a header (copied from a spreadsheet or the bank's web): it is
 * read as a CSV, with its columns.
 */
export function looksLikeTable(text: string): boolean {
  const delimiter = detectDelimiter(text);
  if (delimiter !== '\t' && delimiter !== ';') return false;
  const columns = detectColumns(parseCSV(text, delimiter)[0] ?? []);
  return (
    columns.date >= 0 &&
    columns.description >= 0 &&
    (columns.amount >= 0 || columns.debit >= 0 || columns.credit >= 0)
  );
}

/** A row taken out of the list: the indexes after it move one up. */
export const withoutIndex = (indexes: number[], removed: number): number[] =>
  indexes.filter((i) => i !== removed).map((i) => (i > removed ? i - 1 : i));

/** An amount column and debit/credit columns exclude each other. */
export function changeMapping(
  mapping: ColumnMapping,
  field: keyof ColumnMapping,
  index: number
): ColumnMapping {
  const next = { ...mapping, [field]: index };
  if (index < 0) return next;
  if (field === 'amount') return { ...next, debit: -1, credit: -1 };
  if (field === 'debit' || field === 'credit') return { ...next, amount: -1 };
  return next;
}

/**
 * The movements read from a statement, with the corrections the person made: the type of a row,
 * and, for pasted text or a screenshot, any field of it or the whole row.
 */
function useReadRows() {
  const [parsedRows, setRows] = useState<ImportRowDTO[]>([]);
  /** Types the person corrected row by row (index in the read rows). */
  const [typeOverrides, setTypeOverrides] = useState<Record<number, TransactionType>>({});
  const [review, setReview] = useState<number[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  const rows = parsedRows.map((r, i) => (typeOverrides[i] ? withType(r, typeOverrides[i]) : r));

  const load = (parsed: ParsedRows) => {
    setRows(parsed.rows);
    setSkipped(parsed.skipped);
    setReview(parsed.review);
    setTypeOverrides({});
  };
  /** Corrections apply to the rows as they are shown (with the types chosen so far). */
  const change = (next: ImportRowDTO[]) => {
    setRows(next);
    setTypeOverrides({});
  };

  return {
    rows,
    skipped,
    review,
    load,
    setRowType: (index: number, type: TransactionType) =>
      setTypeOverrides((prev) => ({ ...prev, [index]: type })),
    editRow: (index: number, changes: RowChanges) =>
      change(rows.map((r, i) => (i === index ? { ...r, ...changes } : r))),
    removeRow: (index: number) => {
      change(rows.filter((_, i) => i !== index));
      setReview(withoutIndex(review, index));
    },
  };
}

const NOTHING_READ: ParsedRows = { rows: [], skipped: [], review: [] };

/** A picture (a screenshot of the bank's app), by its type or, without one, by its name. */
export const isImage = (file: File): boolean =>
  file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(file.name);

/** A screenshot of the movements, read on the device: nothing is uploaded. */
function useScreenshot(onRead: (parsed: ParsedRows) => void, onError: (key: string) => void) {
  const [reading, setReading] = useState(false);
  const load = async (image: File) => {
    setReading(true);
    try {
      const parsed = parsePastedMovements(await readScreenshot(image), todayDateOnly());
      if (parsed.rows.length === 0) onError('app.import.screenshot.nothing');
      else onRead(parsed);
    } catch {
      onError('app.import.screenshot.error');
    } finally {
      setReading(false);
    }
  };
  return { reading, load };
}

/**
 * Bank statement import: read the file (CSV, Excel, Norma 43 or PDF), the pasted text or the
 * screenshot, map the CSV columns, preview what the API would import and import it. `error` is an
 * i18n key or an API message.
 */
export function useImport(onImported: () => void, defaultAccountId: string | null) {
  const { transactionApi } = useApi();
  const [step, setStep] = useState<ImportStep>('file');
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState<ImportFormat>('csv');
  const [table, setTable] = useState<string[][]>([]);
  const [bank, setBank] = useState<BankId | null>(null);
  /** PDF statements: the bank when its format is known, and the movements whose balance does not follow. */
  const [pdfBank, setPdfBank] = useState<string | null>(null);
  const [balanceMismatches, setBalanceMismatches] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>(NO_MAPPING);
  const read = useReadRows();
  /** '' = the API's default account. */
  const [accountId, setAccountId] = useState(defaultAccountId ?? '');
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAi, setUseAiState] = useState(() => storage.get(AI_KEY) === '1');
  /**
   * Rows of the preview left out of the import (their index): those an automatic operation
   * already added, unless the person asks to keep them.
   */
  const [omitted, setOmitted] = useState<number[]>([]);

  const setUseAi = (on: boolean) => {
    setUseAiState(on);
    storage.set(AI_KEY, on ? '1' : null);
  };

  const applyMapping = (tableRows: string[][], next: ColumnMapping) => {
    setMapping(next);
    read.load(rowsFromCSV(tableRows, next));
  };

  /** A statement as a table of text: find the bank, the header row and the columns. */
  const loadTable = (parsedTable: string[][]) => {
    if (parsedTable.length < 2) throw new Error('empty');
    // Banks put account details above the header and some split their columns.
    const found = detectBank(parsedTable);
    const bankTable = normalizeBankTable(parsedTable.slice(found.headerRow), found.bank);
    setFormat('csv');
    setBank(found.bank);
    setPdfBank(null);
    setBalanceMismatches(0);
    setTable(bankTable);
    applyMapping(bankTable, bankMapping(bankTable[0], found.bank));
    setStep('mapping');
  };

  /** Movements already read, without columns to map (Norma 43, PDF, pasted text, screenshot). */
  const loadRows = (
    parsed: ParsedRows,
    source: Exclude<ImportFormat, 'csv'>,
    pdf: { bank: string | null; balanceMismatches: number } = { bank: null, balanceMismatches: 0 }
  ) => {
    setFormat(source);
    setBank(null);
    setPdfBank(pdf.bank);
    setBalanceMismatches(pdf.balanceMismatches);
    setTable([]);
    read.load(parsed);
    setStep('mapping');
  };

  /** Text copied from the bank's app or web: a table with a header, or a list of movements. */
  const loadText = (text: string) => {
    setError(null);
    setFileName('');
    const table = looksLikeTable(text) ? parseCSV(text) : [];
    if (table.length > 1) return loadTable(table);
    const parsed = parsePastedMovements(text, todayDateOnly());
    if (parsed.rows.length === 0) setError('app.import.paste.nothing');
    else loadRows(parsed, 'text');
  };

  const screenshot = useScreenshot((parsed) => loadRows(parsed, 'image'), setError);

  const loadFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    if (isImage(file)) return screenshot.load(file);
    try {
      if (/\.xlsx?$/i.test(file.name)) {
        // A spreadsheet export: its first sheet with data is the table, as a CSV would be.
        const sheet = (await readSpreadsheet(file)).find((sh) => sh.rows.length >= 2);
        if (!sheet) throw new Error('empty');
        return loadTable(sheetAsText(sheet));
      }
      if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
        const parsed = await readBankPdf(file);
        return loadRows({ ...parsed, review: [] }, 'pdf', parsed);
      }
      const text = await readStatement(file);
      if (looksLikeNorma43(text)) loadRows(parseNorma43(text), 'norma43');
      else loadTable(parseCSV(text));
    } catch (e) {
      setError(
        e instanceof BankPdfError ? `app.import.error.pdf.${e.code}` : 'app.import.error.read'
      );
    }
  };

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const rows = dryRun ? read.rows : read.rows.filter((_, i) => !omitted.includes(i));
      const response = await transactionApi.import(rows, {
        accountId: accountId || null,
        dryRun,
        useAi,
      });
      if (dryRun) {
        setPreview(response);
        setOmitted(response.rows.filter((r) => r.coveredBy).map((r) => r.index));
        setStep('preview');
      } else {
        setResult(response);
        setStep('done');
        onImported();
      }
    } catch (e) {
      setError(errorMessage(e, 'app.import.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('file');
    setFileName('');
    setTable([]);
    setBank(null);
    setPdfBank(null);
    setBalanceMismatches(0);
    setMapping(NO_MAPPING);
    read.load(NOTHING_READ);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return {
    step,
    fileName,
    format,
    bank,
    pdfBank,
    balanceMismatches,
    headers: table[0] ?? [],
    mapping,
    // rows, skipped, review and their corrections.
    ...read,
    accountId,
    setAccountId,
    useAi,
    setUseAi,
    preview,
    omitted,
    /** Keeps a row an automatic operation already covers, or leaves it out again. */
    toggleOmitted: (index: number) =>
      setOmitted((list) =>
        list.includes(index) ? list.filter((i) => i !== index) : [...list, index]
      ),
    result,
    busy,
    reading: screenshot.reading,
    error,
    loadFile,
    loadText,
    loadRows,
    updateMapping: (field: keyof ColumnMapping, index: number) =>
      applyMapping(table, changeMapping(mapping, field, index)),
    previewImport: () => run(true),
    confirmImport: () => run(false),
    back: () => setStep('mapping'),
    reset,
    /** What to do when the movements change (also after the import, from its result). */
    onImported,
  };
}
