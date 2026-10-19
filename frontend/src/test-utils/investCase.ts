import { parseCSV } from '@modules/finances/domain/importParsers';
import { readTables } from '@modules/tools/domain/invest/detect';
import { withheldInOf } from '@modules/tools/domain/invest/formats';
import type { RateTable } from '@modules/tools/domain/invest/fx';
import { buildLedger } from '@modules/tools/domain/invest/ledger';
import { readQuantfury } from '@modules/tools/domain/invest/pdfReports';
import type { ImportedSavings } from '@modules/tools/domain/rentaGains';

/**
 * The investment import of a persona of the case bank, as «Importar mis inversiones» does it: used
 * by the generator of the personas (scripts/casos/generar-personas4.ts) and by the case tests.
 */
export interface CaseFile {
  name: string;
  text?: string;
  /** A workbook: its sheets with their cells (text and numbers). */
  sheets?: { name: string; rows: (string | number | null)[][] }[];
  /** A PDF: its lines as the app reads them. */
  lines?: string[];
}

export function investCase(
  files: CaseFile[],
  usd?: number
): { imported: ImportedSavings; warnings: string[] } {
  const ops = files.flatMap((f) => {
    if (f.lines) return readQuantfury(f.lines);
    const tables = f.sheets ?? [{ name: f.name, rows: parseCSV(f.text as string) }];
    return readTables(tables, f.name).flatMap((r) => r.ops);
  });
  const rates: RateTable = usd ? { USD: [['2020-01-01', usd]] } : {};
  const ledger = buildLedger(ops, { year: 2025, rates, withheldIn: withheldInOf() });
  return {
    imported: { ...ledger.imported, files: files.map((f) => f.name) },
    warnings: ledger.warnings.map((w) => w.code),
  };
}
