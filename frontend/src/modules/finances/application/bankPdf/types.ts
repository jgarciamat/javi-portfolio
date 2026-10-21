import type { ImportRowDTO } from '@modules/finances/domain/types';
import type { Piece } from '@modules/tools/application/readPdf';

/** A page of a PDF: its pieces of text with their position. */
export type PdfPage = Piece[];

/** A movement as read from the PDF; the balance (when the statement prints one) checks it. */
export interface Entry {
  row: ImportRowDTO;
  balance: number | null;
}

/** What a bank statement PDF gave: the movements, oldest first, and what to tell the person. */
export interface BankPdfResult {
  rows: ImportRowDTO[];
  /** Line numbers of the PDF text (1-based) that looked like a movement but could not be read. */
  skipped: number[];
  /** Movements whose balance does not follow from the previous one (the person should check them). */
  balanceMismatches: number;
  /** The bank's name when its format is known; null for the generic table reader. */
  bank: string | null;
}

/** Why a PDF could not be used: the i18n key suffix is the code. */
export class BankPdfError extends Error {
  constructor(readonly code: 'tooBig' | 'scanned' | 'unrecognized') {
    super(code);
  }
}

/** A reader for one bank's PDF: it must say if the PDF is its own before reading it. */
export interface BankPdfReader {
  bank: string;
  matches: (lines: Piece[][]) => boolean;
  read: (lines: Piece[][]) => { entries: Entry[]; skipped: number[] };
}
