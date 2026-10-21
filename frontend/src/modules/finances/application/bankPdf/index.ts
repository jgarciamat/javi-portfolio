import { readPdfPages, rowsOf } from '@modules/tools/application/readPdf';
import { orderEntries } from './balance';
import { readGenericTable } from './generic';
import { ibercaja } from './ibercaja';
import { type BankPdfReader, type BankPdfResult, BankPdfError, type PdfPage } from './types';

export { BankPdfError } from './types';
export type { BankPdfResult } from './types';

/** Banks with their own reader: add the next one here. The generic table reader is the fallback. */
const READERS: BankPdfReader[] = [ibercaja];

/** A statement PDF this big (or with this many pages) is not a bank statement. */
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 80;

/** Reads the movements of a bank statement from the positioned text of its pages. */
export function parseBankPdf(pages: PdfPage[]): BankPdfResult {
  if (pages.length > MAX_PAGES) throw new BankPdfError('tooBig');
  if (!pages.some((page) => page.some((p) => p.str.trim()))) throw new BankPdfError('scanned');
  const rows = pages.flatMap(rowsOf);
  const reader = READERS.find((r) => r.matches(rows));
  const { entries, skipped } = reader ? reader.read(rows) : readGenericTable(rows);
  if (entries.length === 0) throw new BankPdfError('unrecognized');
  return { ...orderEntries(entries), skipped, bank: reader?.bank ?? null };
}

/** Reads a bank statement PDF in the browser: the file never leaves the device. */
export async function readBankPdf(file: File): Promise<BankPdfResult> {
  if (file.size > MAX_BYTES) throw new BankPdfError('tooBig');
  return parseBankPdf(await readPdfPages(file));
}
