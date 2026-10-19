import { parseTaxModelTokens, type PdfToken, type TaxModelParse } from '../domain/taxModelPdf';
import { parseInvoiceTokens, type InvoicePdfParse } from '../domain/invoicePdf';

/** The part of a pdf.js document the reader uses (so tests and scripts can hand it their own). */
export interface PdfDocument {
  numPages: number;
  getPage(n: number): Promise<{
    getTextContent(): Promise<{ items: unknown[] }>;
    getAnnotations(): Promise<unknown[]>;
  }>;
}

interface TextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}
interface Widget {
  subtype?: string;
  fieldType?: string;
  fieldName?: string;
  fieldValue?: unknown;
  rect: number[];
}

/** Fields of the official form that only carry printed text: titles, dots, the barcode, the buttons. */
const LABEL_FIELD = /^(texto|textofijo|acc\.|inst|bot|lista|codbar)/i;

/** Where the text baseline of a field sits, a little above its bottom edge. */
const BASELINE = 2;

/** A printed piece with its place, and its width and size when pdf.js gives them. */
function tokenOf(item: TextItem, text: string): PdfToken {
  const [x, y] = [item.transform[4], item.transform[5]];
  if (typeof item.width !== 'number' || typeof item.height !== 'number')
    return { text, x, y, field: false };
  // The width covers the spaces trimmed off: keep the share of the text that is left.
  const per = item.width / item.str.length;
  const lead = item.str.length - item.str.trimStart().length;
  return { text, x: x + per * lead, y, field: false, w: per * text.length, h: item.height };
}

/** A filled text field of the form as a token; null for the empty ones, buttons and links. */
function fieldToken(w: Widget): PdfToken | null {
  const value = typeof w.fieldValue === 'string' ? w.fieldValue.trim() : '';
  if (w.subtype !== 'Widget' || w.fieldType !== 'Tx' || value === '') return null;
  return {
    text: value,
    x: w.rect[0],
    y: w.rect[1] + BASELINE,
    // The official form keeps its labels in fields too: they are text, not something typed in.
    field: !LABEL_FIELD.test(w.fieldName ?? ''),
    // Its size, to pair it with a box number printed above it (030, 840).
    w: w.rect[2] - w.rect[0],
    h: w.rect[3] - w.rect[1],
  };
}

/** Every piece of text and every filled form field of the pages, with its place on the page. */
export async function tokensFromPdf(pdf: PdfDocument): Promise<PdfToken[][]> {
  const pages: PdfToken[][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const tokens: PdfToken[] = [];
    for (const item of (await page.getTextContent()).items as Partial<TextItem>[]) {
      const text = item.str?.trim();
      if (text && item.transform) tokens.push(tokenOf(item as TextItem, text));
    }
    for (const w of (await page.getAnnotations()) as Widget[]) {
      const token = fieldToken(w);
      if (token) tokens.push(token);
    }
    pages.push(tokens);
  }
  return pages;
}

/** What a PDF dropped in the import is: a filed modelo 130/303, or else an invoice (or neither). */
export type ImportPdf =
  | { kind: 'model'; parsed: TaxModelParse }
  | { kind: 'invoice'; parsed: InvoicePdfParse };

/** The pieces of a PDF given as bytes, read with pdf.js: the file never leaves the device. */
async function openPdf(file: File): Promise<PdfToken[][]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  return tokensFromPdf(pdf as unknown as PdfDocument);
}

/** A modelo when the form's title is there; otherwise the PDF is read as an invoice. */
export function classifyPdf(pages: PdfToken[][]): ImportPdf {
  const model = parseTaxModelTokens(pages);
  if (model.ok || model.reason !== 'unknownModel') return { kind: 'model', parsed: model };
  return { kind: 'invoice', parsed: parseInvoiceTokens(pages) };
}

/** Reads a PDF dropped in the import of the self-employed screen. */
export async function readImportPdf(file: File): Promise<ImportPdf> {
  return classifyPdf(await openPdf(file));
}
