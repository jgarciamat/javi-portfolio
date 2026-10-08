import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { errorMessage } from '@shared/utils/errors';
import type { ImportResult, ImportRowDTO } from '@modules/finances/domain/types';
import {
  type ColumnMapping,
  detectColumns,
  looksLikeNorma43,
  parseCSV,
  parseNorma43,
  rowsFromCSV,
} from '@modules/finances/domain/importParsers';

export type ImportStep = 'file' | 'mapping' | 'preview' | 'done';

const NO_MAPPING: ColumnMapping = {
  date: -1,
  description: -1,
  amount: -1,
  debit: -1,
  credit: -1,
  category: -1,
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
  const [step, setStep] = useState<ImportStep>('file');
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState<'csv' | 'norma43'>('csv');
  const [table, setTable] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(NO_MAPPING);
  const [rows, setRows] = useState<ImportRowDTO[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  /** '' = the API's default account. */
  const [accountId, setAccountId] = useState(defaultAccountId ?? '');
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyMapping = (tableRows: string[][], next: ColumnMapping) => {
    setMapping(next);
    const parsed = rowsFromCSV(tableRows, next);
    setRows(parsed.rows);
    setSkipped(parsed.skipped);
  };

  const loadFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const text = await readStatement(file);
      if (looksLikeNorma43(text)) {
        const parsed = parseNorma43(text);
        setFormat('norma43');
        setRows(parsed.rows);
        setSkipped(parsed.skipped);
      } else {
        const parsedTable = parseCSV(text);
        if (parsedTable.length < 2) throw new Error('empty');
        setFormat('csv');
        setTable(parsedTable);
        applyMapping(parsedTable, detectColumns(parsedTable[0]));
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
      const response = await transactionApi.import(rows, { accountId: accountId || null, dryRun });
      if (dryRun) {
        setPreview(response);
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
    setMapping(NO_MAPPING);
    setRows([]);
    setSkipped([]);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return {
    step,
    fileName,
    format,
    headers: table[0] ?? [],
    mapping,
    rows,
    skipped,
    accountId,
    setAccountId,
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
