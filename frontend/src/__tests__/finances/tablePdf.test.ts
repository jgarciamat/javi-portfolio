/**
 * The PDF of the tables (search, month, year, accounts…) and of the yearly report: a real file,
 * uncompressed so what it writes can be searched, with «Finanverso», the title, the date, the period
 * and «Página X de Y» on every page.
 */
import {
  buildTablePdf,
  numberText,
  pdfFileName,
  savePdf,
  typeTone,
  type PdfTable,
  type PdfWords,
} from '@modules/finances/application/tablePdf';
import {
  buildAnnualReportPdf,
  type AnnualPdfText,
} from '@modules/finances/application/annualReportPdf';
import * as f from '@test-utils/fixtures';
import { captureDownloads, mockMatchMedia } from '@test-utils/dom';
import { freezeTime, restoreTime } from '@test-utils/time';

beforeEach(() => freezeTime());
afterEach(restoreTime);

const words: PdfWords = {
  generated: 'Generado el {date}',
  range: 'Periodo: {range}',
  page: 'Página {page} de {pages}',
  legend: 'Importes: + ingreso, − gasto',
};
const header = { title: 'Búsqueda', range: 'marzo de 2026', date: '15 mar 2026' };

const read = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsBinaryString(blob);
  });
const pages = (pdf: string) => Number(/\/Count (\d+)/.exec(pdf)?.[1]);

async function pdfOf(table: PdfTable, over: { range?: string; locale?: string } = {}) {
  const blob = await buildTablePdf(table, {
    header: { ...header, range: over.range },
    words,
    locale: over.locale ?? 'es',
    currency: 'EUR',
    compress: false,
  });
  expect(blob.type).toBe('application/pdf');
  return read(blob);
}

describe('the PDF of a table', () => {
  it('has the brand, the title, the date, the period, the legend and the page numbers', async () => {
    const pdf = await pdfOf(
      {
        head: ['Fecha', 'Descripción', 'Importe (EUR)', 'Notas'],
        rows: [
          ['2026-03-01', 'Nómina', 1234.5, null],
          ['2026-03-02', 'Café', 2.4, undefined],
          ['2026-03-03', 'Hucha', 50, 'Mes'],
          ['2026-03-04', 'Devolución', -3, ''],
        ],
        tones: ['income', 'expense', 'saving', null],
        foot: [['TOTAL', '', 1279.9, '']],
      },
      { range: 'marzo de 2026' }
    );
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    for (const text of [
      'Finanverso',
      'Búsqueda',
      'Generado el 15 mar 2026',
      'Periodo: marzo de 2026',
      'Importes: + ingreso, - gasto',
      'Página 1 de 1',
      'Nómina',
      // Signed amounts: they read apart printed in black and white.
      '+1234,50',
      '-2,40',
      // Saving and rows without a type keep the number as it is.
      '(50,00)',
      '(-3,00)',
      '1279,90',
    ])
      expect(pdf).toContain(text);
    expect(pages(pdf)).toBe(1);
    // Upright: four columns fit.
    expect(pdf).toMatch(/\/MediaBox \[0 0 595\.2\d* 841\.8\d*\]/);
  });

  it('pages a long table with the header on every page, landscape when it is wide', async () => {
    const pdf = await pdfOf({
      head: ['A', 'B', 'C', 'D', 'E', 'F', 'G (EUR)'],
      rows: Array.from({ length: 120 }, (_, i) => [`fila ${i}`, 'b', 'c', 'd', 'e', 'f', i]),
    });
    expect(pages(pdf)).toBeGreaterThan(2);
    expect(pdf).toContain(`Página ${pages(pdf)} de ${pages(pdf)}`);
    expect(pdf).toContain('fila 119');
    expect(pdf).toMatch(/\/MediaBox \[0 0 841\.8\d* 595\.2\d*\]/);
    // No period and no tones: neither line is written.
    expect(pdf).not.toContain('Periodo');
    expect(pdf).not.toContain('Importes');
  });

  it('sends a very wide table on to more pages instead of squeezing it', async () => {
    const head = Array.from({ length: 14 }, (_, i) => `Persona ${i} (EUR)`);
    const pdf = await pdfOf({ head, rows: [head.map((_, i) => i * 10)] }, { locale: 'en' });
    expect(pages(pdf)).toBeGreaterThan(1);
    expect(pdf).toContain('Persona 13');
  });

  it('writes numbers as the person reads them', () => {
    expect(numberText(1234.5, 'es', true)).toBe('1234,50');
    expect(numberText(12345.5, 'es', true)).toBe('12.345,50');
    expect(numberText(12345.5, 'en', true)).toBe('12,345.50');
    expect(numberText(75, 'es', false)).toBe('75');
    expect(numberText(7.25, 'es', false)).toBe('7,25');
  });

  it('colours by the type of the movement', () => {
    expect(typeTone('INCOME')).toBe('income');
    expect(typeTone('EXPENSE')).toBe('expense');
    expect(typeTone('SAVING')).toBe('saving');
    expect(typeTone('OTRO')).toBeNull();
  });
});

describe('saving the PDF', () => {
  const blob = new Blob(['%PDF-1.3'], { type: 'application/pdf' });

  it('is named finanverso_<screen>_<today>.pdf and downloaded on a computer', async () => {
    const saved = captureDownloads();
    expect(pdfFileName('busqueda')).toBe('finanverso_busqueda_2026-03-15.pdf');
    await expect(savePdf(blob, pdfFileName('busqueda'), 'Búsqueda')).resolves.toBe('saved');
    expect(saved.names).toEqual(['finanverso_busqueda_2026-03-15.pdf']);
    saved.restore();
  });

  it('opens the share sheet on a phone', async () => {
    const restoreMedia = mockMatchMedia(true);
    const share = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { canShare: () => true, share });
    await expect(savePdf(blob, 'x.pdf', 'Búsqueda')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: 'Búsqueda' }));
    Object.assign(navigator, { canShare: undefined, share: undefined });
    restoreMedia();
  });
});

const text: AnnualPdfText = {
  summary: 'Resumen del año',
  chart: 'Ingresos y gastos por mes',
  byMonth: 'Por meses',
  quarters: 'Por trimestres',
  quarter: 'Trimestre',
  expensesByCategory: 'Gastos por categoría',
  incomeByCategory: 'Ingresos por categoría',
  noData: 'Sin datos este año.',
  disclaimer: 'Resumen orientativo.',
  total: 'TOTAL',
  month: 'Mes',
  income: 'Ingresos',
  expenses: 'Gastos',
  saving: 'Ahorro',
  balance: 'Balance',
  category: 'Categoría',
  amount: 'Importe',
  monthNames: Array.from({ length: 12 }, (_, i) => (i === 0 ? 'enero' : `mes ${i + 1}`)),
  monthShort: Array.from({ length: 12 }, (_, i) => (i === 0 ? 'ene' : `m${i + 1}`)),
};

async function reportOf(report = f.report(), pdfText = text) {
  const blob = await buildAnnualReportPdf(report, {
    header: { title: 'Informe anual 2026', range: '2026', date: '15 mar 2026' },
    words,
    text: pdfText,
    locale: 'es',
    compress: false,
  });
  return read(blob);
}

describe('the PDF of the yearly report', () => {
  it('has the totals, the chart, the months, the quarters, the categories and the note', async () => {
    const pdf = await reportOf();
    expect(pdf.startsWith('%PDF-')).toBe(true);
    for (const value of [
      'Finanverso',
      'Informe anual 2026',
      'Periodo: 2026',
      'Resumen del año',
      'Ingresos y gastos por mes',
      'ene',
      'Por meses',
      'enero',
      'Ingresos \\(EUR\\)',
      '2000,00',
      '1900,00',
      'Por trimestres',
      'T1',
      'Gastos por categoría',
      'Ocio',
      '(100)',
      'Ingresos por categoría',
      'Salario',
      'Resumen orientativo.',
      'Página 1 de',
    ])
      expect(pdf).toContain(value);
  });

  it('is compressed unless asked otherwise', async () => {
    const blob = await buildAnnualReportPdf(f.report(), {
      header: { title: 'Informe anual 2026', date: '15 mar 2026' },
      words,
      text,
      locale: 'en',
    });
    expect((await read(blob)).startsWith('%PDF-')).toBe(true);
    const table = await buildTablePdf(
      { head: ['A'], rows: [['b']] },
      { header, words, locale: 'es', currency: 'EUR' }
    );
    expect((await read(table)).startsWith('%PDF-')).toBe(true);
  });

  it('says when a list is empty and copes with months missing and amounts at zero', async () => {
    const pdf = await reportOf(
      f.report({
        months: [{ month: 2, income: 0, expenses: 0, saving: 0 }],
        expensesByCategory: [],
        incomeByCategory: [{ categoryName: 'Regalo', amount: 0 }],
      })
    );
    expect(pdf.match(/Sin datos este año\./g)).toHaveLength(1);
    expect(pdf).toContain('Regalo');
    expect(pdf).toContain('(0)');
  });

  it('goes on to a new page when the categories do not fit', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      categoryName: `Cat ${i}`,
      amount: i + 1,
    }));
    const pdf = await reportOf(f.report({ expensesByCategory: many, incomeByCategory: many }), {
      ...text,
      // A note that does not fit under the last table starts a page of its own.
      disclaimer: 'Resumen orientativo de lo registrado. '.repeat(120),
    });
    expect(pages(pdf)).toBeGreaterThan(2);
    expect(pdf).toContain(`Página ${pages(pdf)} de ${pages(pdf)}`);
  });
});
