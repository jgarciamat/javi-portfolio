import type { jsPDF as JsPdf } from 'jspdf';
import { PDF_COLORS, winAnsi } from '@modules/tools/application/reportPdf';
import type { AnnualReport, ReportTotals } from '@modules/finances/domain/types';
import { formatMoney } from '@shared/utils/format';
import {
  alignNumbers,
  loadPdf,
  numberText,
  PDF_MARGIN,
  PDF_TOP,
  stampPages,
  tableStyle,
  TONE_COLORS,
  type PdfHeader,
  type PdfWords,
} from './tablePdf';

/** The words of the yearly report, already in the language of the person. */
export interface AnnualPdfText {
  summary: string;
  chart: string;
  byMonth: string;
  quarters: string;
  quarter: string;
  expensesByCategory: string;
  incomeByCategory: string;
  noData: string;
  disclaimer: string;
  total: string;
  month: string;
  income: string;
  expenses: string;
  saving: string;
  balance: string;
  category: string;
  amount: string;
  /** January to December, long and short. */
  monthNames: string[];
  monthShort: string[];
}

export interface AnnualPdfOptions {
  header: PdfHeader;
  words: PdfWords;
  text: AnnualPdfText;
  locale: string;
  /** `false` leaves the text readable (tests). */
  compress?: boolean;
}

const C = PDF_COLORS;
/** Light red with a dark outline: next to the solid income bars it still reads apart in grey. */
const EXPENSE_FILL: [number, number, number] = [254, 202, 202];

const CHART_H = 42;

/** The totals of the year in four boxes side by side. */
function drawCards(doc: JsPdf, cards: [string, string][], y: number, inner: number) {
  const gap = 4;
  const w = (inner - gap * 3) / 4;
  cards.forEach(([label, value], i) => {
    const x = PDF_MARGIN + i * (w + gap);
    doc.setFillColor(...C.card);
    doc.setDrawColor(...C.cardLine);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, 17, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(winAnsi(label), x + 3, y + 5);
    doc.setFontSize(12);
    doc.setTextColor(...C.navy);
    doc.text(value, x + 3, y + 12.5);
  });
}

/** Income and expenses of each month side by side, with the legend; returns where it ends. */
function drawChart(
  doc: JsPdf,
  report: AnnualReport,
  text: AnnualPdfText,
  y: number,
  inner: number
): number {
  const max = Math.max(1, ...report.months.flatMap((m) => [m.income, m.expenses]));
  const slot = inner / 12;
  const bar = slot * 0.32;
  const base = y + CHART_H;
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGIN, base, PDF_MARGIN + inner, base);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  for (let m = 1; m <= 12; m++) {
    const data = report.months.find((d) => d.month === m);
    const x = PDF_MARGIN + (m - 1) * slot + slot / 2;
    const hIncome = ((data?.income ?? 0) / max) * CHART_H;
    const hExpenses = ((data?.expenses ?? 0) / max) * CHART_H;
    doc.setFillColor(...TONE_COLORS.income);
    if (hIncome > 0) doc.rect(x - bar, base - hIncome, bar, hIncome, 'F');
    doc.setFillColor(...EXPENSE_FILL);
    doc.setDrawColor(...TONE_COLORS.expense);
    if (hExpenses > 0) doc.rect(x, base - hExpenses, bar, hExpenses, 'FD');
    doc.setTextColor(...C.muted);
    doc.text(winAnsi(text.monthShort[m - 1]), x, base + 4, { align: 'center' });
  }
  const legend = base + 9;
  doc.setFillColor(...TONE_COLORS.income);
  doc.rect(PDF_MARGIN, legend - 2.5, 3, 3, 'F');
  doc.setTextColor(...C.ink);
  doc.setFontSize(8);
  doc.text(winAnsi(text.income), PDF_MARGIN + 5, legend);
  doc.setFillColor(...EXPENSE_FILL);
  doc.rect(PDF_MARGIN + 30, legend - 2.5, 3, 3, 'FD');
  doc.text(winAnsi(text.expenses), PDF_MARGIN + 35, legend);
  return legend + 8;
}

/**
 * The yearly report as a PDF to keep or send (A4 upright): the four totals of the year, a bar chart
 * of income and expenses per month, the tables by month (with the total), by quarter and by
 * category, and the note that it is only a summary of what was recorded. jsPDF is loaded on demand.
 */
export async function buildAnnualReportPdf(
  report: AnnualReport,
  options: AnnualPdfOptions
): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdf();
  const { text, locale } = options;
  const doc: JsPdf = new jsPDF({ format: 'a4', unit: 'mm', compress: options.compress ?? true });
  const width = doc.internal.pageSize.getWidth();
  const bottom = doc.internal.pageSize.getHeight() - 18;
  const inner = width - 2 * PDF_MARGIN;
  const money = (n: number) => winAnsi(formatMoney(n, report.currency, locale));
  const num = (n: number) => numberText(n, locale, true);
  const unit = (label: string) => winAnsi(`${label} (${report.currency})`);
  let y = PDF_TOP;

  const room = (h: number) => {
    if (y + h > bottom) {
      doc.addPage();
      y = PDF_TOP;
    }
  };
  /** A title, kept on the page with at least `need` millimetres of what follows. */
  const heading = (value: string, need = 22) => {
    room(need);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.navy);
    doc.text(winAnsi(value), PDF_MARGIN, y + 4);
    y += 7;
  };
  const table = (head: string[], body: string[][], foot?: string[]) => {
    autoTable(doc, {
      ...tableStyle(head.length),
      startY: y,
      head: [head],
      body,
      foot: foot && [foot],
      didParseCell: alignNumbers(head.map((_, c) => c > 0)),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  };

  heading(text.summary);
  drawCards(
    doc,
    [
      [text.income, money(report.totals.income)],
      [text.expenses, money(report.totals.expenses)],
      [text.saving, money(report.totals.saving)],
      [text.balance, money(report.totals.balance)],
    ],
    y,
    inner
  );
  y += 17 + 8;

  heading(text.chart, CHART_H + 24);
  y = drawChart(doc, report, text, y, inner);

  const periodHead = (first: string) => [
    winAnsi(first),
    unit(text.income),
    unit(text.expenses),
    unit(text.saving),
    unit(text.balance),
  ];
  const periodRow = (label: string, x: ReportTotals) => [
    winAnsi(label),
    num(x.income),
    num(x.expenses),
    num(x.saving),
    num(x.balance),
  ];

  heading(text.byMonth);
  table(
    periodHead(text.month),
    report.months.map((m) =>
      periodRow(text.monthNames[m.month - 1], {
        ...m,
        balance: Math.round((m.income - m.expenses - m.saving) * 100) / 100,
      })
    ),
    periodRow(text.total, report.totals)
  );

  // Small tables are kept whole on one page.
  heading(text.quarters, 50);
  table(
    periodHead(text.quarter),
    report.quarters.map((q) => periodRow(`T${q.quarter}`, q))
  );

  const categories = (title: string, list: AnnualReport['expensesByCategory']) => {
    heading(title, Math.min(70, 22 + list.length * 8));
    if (list.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text(winAnsi(text.noData), PDF_MARGIN, y + 3);
      y += 10;
      return;
    }
    const total = list.reduce((s, c) => s + c.amount, 0);
    table(
      [winAnsi(text.category), unit(text.amount), '%'],
      list.map((c) => [
        winAnsi(c.categoryName),
        num(c.amount),
        numberText(total ? Math.round((c.amount / total) * 1000) / 10 : 0, locale, false),
      ])
    );
  };
  categories(text.expensesByCategory, report.expensesByCategory);
  categories(text.incomeByCategory, report.incomeByCategory);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const note = doc.splitTextToSize(winAnsi(text.disclaimer), inner) as string[];
  room(note.length * 4 + 2);
  doc.setTextColor(...C.faint);
  doc.text(note, PDF_MARGIN, y + 2);

  stampPages(doc, options.header, options.words);
  return doc.output('blob');
}
