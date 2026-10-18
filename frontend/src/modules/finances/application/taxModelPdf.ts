import { parseTaxModelTokens, type PdfToken, type TaxModelParse } from '../domain/taxModelPdf';

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

/** Every piece of text and every filled form field of the pages, with its place on the page. */
export async function tokensFromPdf(pdf: PdfDocument): Promise<PdfToken[][]> {
  const pages: PdfToken[][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const tokens: PdfToken[] = [];
    for (const item of (await page.getTextContent()).items as Partial<TextItem>[]) {
      const text = item.str?.trim();
      if (text && item.transform)
        tokens.push({ text, x: item.transform[4], y: item.transform[5], field: false });
    }
    for (const w of (await page.getAnnotations()) as Widget[]) {
      const value = typeof w.fieldValue === 'string' ? w.fieldValue.trim() : '';
      if (w.subtype !== 'Widget' || w.fieldType !== 'Tx' || value === '') continue;
      tokens.push({
        text: value,
        x: w.rect[0],
        y: w.rect[1] + BASELINE,
        // The official form keeps its labels in fields too: they are text, not something typed in.
        field: !LABEL_FIELD.test(w.fieldName ?? ''),
      });
    }
    pages.push(tokens);
  }
  return pages;
}

/** The boxes of a modelo 130 or 303 in a PDF, read in the browser: the file never leaves the device. */
export async function readTaxModelPdf(file: File): Promise<TaxModelParse> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  return parseTaxModelTokens(await tokensFromPdf(pdf as unknown as PdfDocument));
}
