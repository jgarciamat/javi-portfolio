/** The text of a PDF: all of it, and line by line as it is printed on the page. */
export interface PdfText {
  text: string;
  lines: string[];
}

interface Piece {
  x: number;
  y: number;
  str: string;
}

/** Pieces whose baselines are this close (in PDF points) are on the same printed line. */
const SAME_LINE = 2;

/** Pieces of text grouped into lines: top to bottom, and left to right inside each line. */
export function linesOf(pieces: Piece[]): string[] {
  const rows: { y: number; pieces: Piece[] }[] = [];
  for (const piece of pieces) {
    if (!piece.str.trim()) continue;
    const row = rows.find((r) => Math.abs(r.y - piece.y) <= SAME_LINE);
    if (row) row.pieces.push(piece);
    else rows.push({ y: piece.y, pieces: [piece] });
  }
  // PDF coordinates grow upwards: the top line has the highest y.
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) =>
      r.pieces
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str.trim())
        .join('   ')
    );
}

/** Reads a PDF in the browser: the file never leaves the device. */
export async function readPdf(file: File): Promise<PdfText> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pieces: Piece[] = [];
    const words: string[] = [];
    for (const item of content.items) {
      // Marked-content items carry no text.
      if (!('str' in item)) {
        words.push('');
        continue;
      }
      words.push(item.str);
      pieces.push({ x: item.transform[4], y: item.transform[5], str: item.str });
    }
    pages.push(words.join(' '));
    lines.push(...linesOf(pieces));
  }
  return { text: pages.join('\n'), lines };
}

/** The text of a PDF, read in the browser. */
export async function readPdfText(file: File): Promise<string> {
  return (await readPdf(file)).text;
}
