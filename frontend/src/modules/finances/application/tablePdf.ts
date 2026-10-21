import type { jsPDF as JsPdf } from 'jspdf';
import type { CellHookData, UserOptions } from 'jspdf-autotable';
import { PDF_COLORS, winAnsi } from '@modules/tools/application/reportPdf';
import { isNativeApp } from '@shared/utils/platform';
import { shareImage } from '@shared/utils/shareImage';
import { intlLocale, todayDateOnly } from '@shared/utils/format';
import type { CsvTable, CsvValue } from './hooks/useExportCSV';

/**
 * The PDF of any table of the app (search, month, year, accounts, budgets…), the same rows as its
 * CSV. jsPDF and jspdf-autotable are loaded on demand: they are large. A4, upright up to six
 * columns and landscape with more; every page has «Finanverso», the title, the date it was made,
 * the period when there is one and «Página X de Y». Rows of income, expenses and saving have their
 * amounts in colour and with a sign (+ / −), so they still read apart printed in black and white.
 * Nothing about the person is printed: only the rows of the table.
 */

type Rgb = [number, number, number];

/** Dark enough to print as black: the sign, not the colour, tells the rows apart. */
export const TONE_COLORS: Record<RowTone, Rgb> = {
  income: [22, 101, 52],
  expense: [185, 28, 28],
  saving: [91, 33, 182],
};

export type RowTone = 'income' | 'expense' | 'saving';

const TONES: Record<string, RowTone> = { INCOME: 'income', EXPENSE: 'expense', SAVING: 'saving' };
/** The tone of a movement's type (INCOME, EXPENSE, SAVING). */
export const typeTone = (type: string): RowTone | null => TONES[type] ?? null;

/** A table to print: the CSV one plus what only the PDF shows. */
export interface PdfTable extends CsvTable {
  /** What each row is, to colour and sign its amounts. */
  tones?: (RowTone | null)[];
  /** Rows of totals at the end (in bold, on the last page). */
  foot?: CsvValue[][];
}

/** The words the PDF needs, already in the language of the person. */
export interface PdfWords {
  /** «Generado el {date}» */
  generated: string;
  /** «Periodo: {range}» */
  range: string;
  /** «Página {page} de {pages}» */
  page: string;
  /** «+ ingreso · − gasto · ahorro en violeta» */
  legend: string;
}

export interface PdfHeader {
  title: string;
  /** The period the rows are about, when they are about one. */
  range?: string;
  /** Today, as the person reads dates. */
  date: string;
}

/** The PDF libraries, loaded the first time a PDF is made. */
export async function loadPdf() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

const C = PDF_COLORS;
export const PDF_MARGIN = 14;
/** Where the content starts on every page, under the header. */
export const PDF_TOP = 34;
const BOTTOM = 18;

const fill = (text: string, values: Record<string, string>) =>
  Object.entries(values).reduce((s, [k, v]) => s.replace(`{${k}}`, v), text);

/** The header and the page number of every page, drawn once the content is laid out. */
export function stampPages(doc: JsPdf, header: PdfHeader, words: PdfWords, legend = false) {
  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const right = width - PDF_MARGIN;
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.blue);
    doc.text('Finanverso', PDF_MARGIN, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(winAnsi(fill(words.generated, { date: header.date })), right, 14, {
      align: 'right',
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...C.navy);
    doc.text(winAnsi(header.title), PDF_MARGIN, 21.5, { maxWidth: right - PDF_MARGIN });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    const sub = [
      header.range ? fill(words.range, { range: header.range }) : '',
      legend ? words.legend : '',
    ].filter(Boolean);
    if (sub.length > 0) doc.text(winAnsi(sub.join('   ·   ')), PDF_MARGIN, 27);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.3);
    doc.line(PDF_MARGIN, 30, right, 30);
    doc.setFontSize(8);
    doc.setTextColor(...C.faint);
    doc.text(
      winAnsi(fill(words.page, { page: String(page), pages: String(pages) })),
      right,
      height - 8,
      {
        align: 'right',
      }
    );
  }
}

/** Numbers as the person reads them; amounts (columns «… (EUR)») always with two decimals. */
export function numberText(value: number, locale: string, money: boolean): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: money ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** The options shared by every table of the app's PDFs: header colours, zebra, sizes. */
export function tableStyle(columns: number): Partial<UserOptions> {
  const size = columns <= 5 ? 9 : columns <= 8 ? 8 : 7;
  return {
    margin: { top: PDF_TOP, left: PDF_MARGIN, right: PDF_MARGIN, bottom: BOTTOM },
    styles: {
      font: 'helvetica',
      fontSize: size,
      cellPadding: 1.6,
      textColor: C.ink,
      lineColor: C.line,
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' },
    footStyles: { fillColor: C.card, textColor: C.ink, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.zebra },
    showHead: 'everyPage',
    showFoot: 'lastPage',
    // Many columns (one per member of a group…) go on to a second page instead of squeezing.
    horizontalPageBreak: columns > 10,
    horizontalPageBreakRepeat: 0,
  };
}

/** Numbers to the right in the header, the rows and the totals alike. */
export const alignNumbers = (numeric: boolean[]) => (data: CellHookData) => {
  if (numeric[data.column.index]) data.cell.styles.halign = 'right';
};

export interface TablePdfOptions {
  header: PdfHeader;
  words: PdfWords;
  locale: string;
  currency: string;
  /** `false` leaves the text readable (tests). */
  compress?: boolean;
}

/** The PDF of one table. */
export async function buildTablePdf(table: PdfTable, options: TablePdfOptions): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdf();
  const { head, rows, tones, foot = [] } = table;
  const orientation = head.length > 6 ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    format: 'a4',
    unit: 'mm',
    compress: options.compress ?? true,
  });
  const money = head.map((h) => h.endsWith(`(${options.currency})`));
  const numeric = head.map((_, c) => [...rows, ...foot].some((r) => typeof r[c] === 'number'));
  const cell = (value: CsvValue, c: number, tone?: RowTone | null) => {
    if (typeof value !== 'number') return winAnsi(value ?? '');
    const text = numberText(tone && money[c] ? Math.abs(value) : value, options.locale, money[c]);
    if (!tone || !money[c] || tone === 'saving') return text;
    return `${tone === 'income' ? '+' : '-'}${text}`;
  };
  const columnStyles: UserOptions['columnStyles'] = {};
  numeric.forEach((n, c) => {
    if (n) columnStyles[c] = { cellWidth: 'wrap' };
  });

  autoTable(doc, {
    ...tableStyle(head.length),
    startY: PDF_TOP,
    head: [head.map((h) => winAnsi(h))],
    body: rows.map((r, i) => r.map((v, c) => cell(v, c, tones?.[i]))),
    foot: foot.length > 0 ? foot.map((r) => r.map((v, c) => cell(v, c))) : undefined,
    columnStyles,
    didParseCell: (data: CellHookData) => {
      alignNumbers(numeric)(data);
      const tone = data.section === 'body' ? tones?.[data.row.index] : null;
      if (tone && money[data.column.index]) data.cell.styles.textColor = TONE_COLORS[tone];
    },
  });
  stampPages(doc, options.header, options.words, !!tones?.some(Boolean));
  return doc.output('blob');
}

/** `finanverso_<name>_<today>.pdf` */
export const pdfFileName = (name: string) => `finanverso_${name}_${todayDateOnly()}.pdf`;

/** Saves the PDF: a download on a computer, the share sheet on a phone (where there is one). */
export function savePdf(blob: Blob, fileName: string, text: string) {
  const touch = isNativeApp() || window.matchMedia?.('(pointer: coarse)')?.matches;
  return shareImage(blob, fileName, text, touch ? 'share' : 'download');
}
