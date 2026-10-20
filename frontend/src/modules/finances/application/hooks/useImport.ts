import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { errorMessage } from '@shared/utils/errors';
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
  looksLikeNorma43,
  parseCSV,
  parseNorma43,
  rowsFromCSV,
  withType,
} from '@modules/finances/domain/importParsers';

import { readSpreadsheet, sheetAsText } from '../spreadsheet';

export type ImportStep = 'file' | 'mapping' | 'preview' | 'done';

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
 * Bank statement import: read the file (CSV or Norma 43), map the CSV columns,
 * preview what the API would import and import it. `error` is an i18n key or an
 * API message.
 */
export function useImport(onImported: () => void, defaultAccountId: string | null) {
  const { transactionApi } = useApi();
  const plan = useOptionalPlan();
  const [step, setStep] = useState<ImportStep>('file');
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState<'csv' | 'norma43'>('csv');
  const [table, setTable] = useState<string[][]>([]);
  const [bank, setBank] = useState<BankId | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(NO_MAPPING);
  const [parsedRows, setRows] = useState<ImportRowDTO[]>([]);
  /** Types the person corrected row by row (index in the read rows). */
  const [typeOverrides, setTypeOverrides] = useState<Record<number, TransactionType>>({});
  const [review, setReview] = useState<number[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  /** '' = the API's default account. */
  const [accountId, setAccountId] = useState(defaultAccountId ?? '');
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAi, setUseAiState] = useState(() => storage.get(AI_KEY) === '1');

  const setUseAi = (on: boolean) => {
    setUseAiState(on);
    storage.set(AI_KEY, on ? '1' : null);
  };

  const rows = parsedRows.map((r, i) => (typeOverrides[i] ? withType(r, typeOverrides[i]) : r));

  const applyMapping = (tableRows: string[][], next: ColumnMapping) => {
    setMapping(next);
    const parsed = rowsFromCSV(tableRows, next);
    setRows(parsed.rows);
    setSkipped(parsed.skipped);
    setReview(parsed.review);
    setTypeOverrides({});
  };

  /** A statement as a table of text: find the bank, the header row and the columns. */
  const loadTable = (parsedTable: string[][]) => {
    if (parsedTable.length < 2) throw new Error('empty');
    // Banks put account details above the header and some split their columns.
    const found = detectBank(parsedTable);
    const bankTable = normalizeBankTable(parsedTable.slice(found.headerRow), found.bank);
    setFormat('csv');
    setBank(found.bank);
    setTable(bankTable);
    applyMapping(bankTable, bankMapping(bankTable[0], found.bank));
  };

  const loadFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      if (/\.xlsx?$/i.test(file.name)) {
        // A spreadsheet export: its first sheet with data is the table, as a CSV would be.
        const sheet = (await readSpreadsheet(file)).find((sh) => sh.rows.length >= 2);
        if (!sheet) throw new Error('empty');
        loadTable(sheetAsText(sheet));
        setStep('mapping');
        return;
      }
      const text = await readStatement(file);
      if (looksLikeNorma43(text)) {
        const parsed = parseNorma43(text);
        setFormat('norma43');
        setRows(parsed.rows);
        setSkipped(parsed.skipped);
        setReview([]);
        setTypeOverrides({});
      } else {
        loadTable(parseCSV(text));
      }
      setStep('mapping');
    } catch {
      setError('app.import.error.read');
    }
  };

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const response = await transactionApi.import(rows, {
        accountId: accountId || null,
        dryRun,
        useAi,
      });
      if (dryRun) {
        setPreview(response);
        setStep('preview');
      } else {
        setResult(response);
        setStep('done');
        onImported();
        // The free plan's import is now used: the next one opens the plans.
        void plan?.refresh();
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
    setMapping(NO_MAPPING);
    setRows([]);
    setSkipped([]);
    setReview([]);
    setTypeOverrides({});
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return {
    step,
    fileName,
    format,
    bank,
    headers: table[0] ?? [],
    mapping,
    rows,
    skipped,
    review,
    setRowType: (index: number, type: TransactionType) =>
      setTypeOverrides((prev) => ({ ...prev, [index]: type })),
    accountId,
    setAccountId,
    useAi,
    setUseAi,
    preview,
    result,
    busy,
    error,
    loadFile,
    updateMapping: (field: keyof ColumnMapping, index: number) =>
      applyMapping(table, changeMapping(mapping, field, index)),
    previewImport: () => run(true),
    confirmImport: () => run(false),
    back: () => setStep('mapping'),
    reset,
  };
}
