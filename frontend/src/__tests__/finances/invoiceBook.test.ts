import {
  bookNumber,
  expensesByQuarter,
  guessExpenseKind,
  incomeByQuarter,
  parseInvoiceBook,
  parseWorkbook,
  type BookCell,
  type BookEntry,
} from '@modules/finances/domain/invoiceBook';
import { readXlsx } from '@modules/finances/application/spreadsheet';
import { buildXlsx, type XlsxSheet } from '../../../scripts/xlsx';

const workbook = (sheets: XlsxSheet[]) => {
  const bytes = buildXlsx(sheets, { sharedStrings: true });
  return readXlsx(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  );
};

const entries = (rows: BookCell[][], kind: 'issued' | 'received', year = 2026): BookEntry[] => {
  const parsed = parseInvoiceBook(rows, kind, year);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.result.entries;
};

describe('bookNumber', () => {
  it('reads the numbers of Spain and of everywhere else', () => {
    expect(bookNumber(1234.5)).toBe(1234.5);
    expect(bookNumber('1.234,56 €')).toBe(1234.56);
    expect(bookNumber('1,234.56')).toBe(1234.56);
    expect(bookNumber('1.234')).toBe(1234);
    expect(bookNumber('12,5')).toBe(12.5);
    expect(bookNumber('12.5')).toBe(12.5);
    expect(bookNumber(' 21 % ')).toBe(21);
    expect(bookNumber('-45,10')).toBe(-45.1);
  });

  it('gives NaN for what is not a number', () => {
    for (const value of ['', 'abc', '€', null, undefined, NaN, Infinity]) {
      expect(bookNumber(value as BookCell)).toBeNaN();
    }
  });
});

describe('Invoice book with the AEAT layout (two heading lines, rates as 0.21)', () => {
  // The layout of the books that Quipu and the gestorías hand out, with invented invoices.
  const issued: XlsxSheet = {
    name: 'Ingresos',
    rows: [
      ['Libro registro de facturas expedidas'],
      [],
      [],
      [],
      [
        'Autoliquidación',
        null,
        'Concepto',
        'Fecha Expedición',
        'Nombre Destinatario',
        'Total Factura',
        'Base Imponible',
        'Tipo de IVA',
        'Cuota IVA Repercutida',
        'Tipo Retención del IRPF',
        'Importe Retenido del IRPF',
      ],
      ['Ejercicio', 'Periodo'],
      [
        2026,
        '1T',
        'I01',
        { date: '2026-01-11' },
        'Cliente Uno SL',
        1210,
        1000,
        { percent: 0.21 },
        210,
        { percent: 0.15 },
        150,
      ],
      [
        2026,
        '1T',
        'I01',
        { date: '2026-03-31' },
        'Cliente Dos SL',
        110,
        100,
        { percent: 0.1 },
        10,
        0,
        0,
      ],
      [
        2026,
        '2T',
        'I01',
        { date: '2026-04-01' },
        'Cliente Tres SL',
        104,
        100,
        { percent: 0.04 },
        4,
        0,
        0,
      ],
      [2026, '2T', 'I01', { date: '2026-06-30' }, 'Cliente Cuatro SL', 500, 500, 0, 0, 0, 0],
      [
        2025,
        '4T',
        'I01',
        { date: '2025-12-31' },
        'Del año pasado',
        121,
        100,
        { percent: 0.21 },
        21,
        0,
        0,
      ],
      [],
      ['Totales', null, null, null, null, 2045, 1700],
    ],
  };

  it('reads the real layout: both heading lines, fractions as percentages and the totals row left out', () => {
    const parsed = parseWorkbook(workbook([issued]), 'issued', 2026);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.result.skipped).toEqual({ year: 1, rate: 0, amount: 0 });
    expect(
      parsed.result.entries.map((e) => [e.date, e.quarter, e.base, e.vatRate, e.vat, e.withheld])
    ).toEqual([
      ['2026-01-11', 1, 1000, 21, 210, 150],
      ['2026-03-31', 1, 100, 10, 10, 0],
      ['2026-04-01', 2, 100, 4, 4, 0],
      ['2026-06-30', 2, 500, 0, 0, 0],
    ]);
    expect(parsed.result.entries[0].concept).toBe('Cliente Uno SL');
  });

  it('adds up the income base by VAT rate and the withholdings, quarter by quarter', () => {
    const parsed = parseWorkbook(workbook([issued]), 'issued', 2026);
    if (!parsed.ok) throw new Error('no');
    expect(incomeByQuarter(parsed.result.entries)).toEqual({
      1: { r21: 1000, r10: 100, r4: 0, r0: 0, withheld: 150 },
      2: { r21: 0, r10: 0, r4: 100, r0: 500, withheld: 0 },
    });
  });

  it('reads the withholding from its rate when the amount is missing, and not at all in expenses', () => {
    const rows: BookCell[][] = [
      ['Fecha', 'Base imponible', 'Tipo IVA', 'Retención IRPF %'],
      ['15/02/2026', '2.000,00', '21', '15'],
    ];
    expect(entries(rows, 'issued')[0].withheld).toBe(300);
    expect(entries(rows, 'received')[0].withheld).toBe(0);
    // The same with the rate as a fraction (15 % shown as 0.15), and with no withholding at all.
    const fraction: BookCell[][] = [
      ['Fecha', 'Base imponible', 'Tipo IVA', 'Retención IRPF %'],
      ['15/02/2026', 2000, 21, 0.15],
      ['16/02/2026', 2000, 21, null],
    ];
    expect(entries(fraction, 'issued').map((e) => e.withheld)).toEqual([300, 0]);
  });
});

describe('Received invoices and other layouts', () => {
  it('reads a simple sheet with Spanish text, dates and a VAT amount instead of a rate', () => {
    const rows: BookCell[][] = [
      ['Fecha factura', 'Proveedor', 'Base imponible', 'Cuota IVA', 'Total'],
      ['05/02/2026', 'Gestoría Pérez', '100,00 €', '21,00 €', '121,00 €'],
      ['06/05/2026', 'Papelería', '50', '5', '55'],
      ['07/08/2026', 'Libros', '25,00', '1,00', '26,00'],
      ['08/11/2026', 'Sin cuota', '80,00', '0', '80,00'],
    ];
    const read = entries(rows, 'received');
    expect(read.map((e) => [e.quarter, e.base, e.vatRate, e.total])).toEqual([
      [1, 100, 21, 121],
      [2, 50, 10, 55],
      [3, 25, 4, 26],
      [4, 80, 0, 80],
    ]);
  });

  it('keeps credit notes as negative amounts and rounds to cents', () => {
    const rows: BookCell[][] = [
      ['Fecha', 'Base imponible', 'Tipo de IVA', 'Cuota IVA soportada'],
      ['10/01/2026', -100, 21, -21],
      ['11/01/2026', 33.333, 21, 7],
    ];
    const read = entries(rows, 'received');
    expect(read[0]).toMatchObject({ base: -100, vat: -21, total: -121 });
    expect(read[1]).toMatchObject({ base: 33.33, vat: 7, total: 40.33 });
  });

  it('counts what it leaves out: other year, a VAT rate the draft does not take, no amount', () => {
    const rows: BookCell[][] = [
      ['Fecha', 'Base imponible', 'Tipo IVA'],
      ['10/01/2025', 100, 21],
      ['10/01/2026', 100, 5],
      ['11/01/2026', 'pendiente', 21],
      ['12/01/2026', 100, 21],
    ];
    const parsed = parseInvoiceBook(rows, 'received', 2026);
    expect(parsed.ok && parsed.result.entries).toHaveLength(1);
    expect(parsed.ok && parsed.result.skipped).toEqual({ year: 1, rate: 1, amount: 1 });
  });

  it('leaves out an invoice that has neither a VAT rate nor a VAT amount to know it from', () => {
    const rows: BookCell[][] = [
      ['Fecha', 'Base imponible', 'Tipo IVA', 'Cuota IVA'],
      ['10/01/2026', 100, null, null],
      ['11/01/2026', 100, null, 21],
    ];
    const parsed = parseInvoiceBook(rows, 'received', 2026);
    expect(parsed.ok && parsed.result.entries.map((e) => e.vatRate)).toEqual([21]);
    expect(parsed.ok && parsed.result.skipped.rate).toBe(1);
  });

  it('works out the base from the total and the VAT when the base column is empty', () => {
    const rows: BookCell[][] = [
      ['Fecha', 'Base imponible', 'Tipo IVA', 'Cuota IVA', 'Total factura'],
      ['10/01/2026', null, 21, 21, 121],
    ];
    expect(entries(rows, 'received')[0].base).toBe(100);
  });

  it('refuses a sheet it cannot read, saying why', () => {
    expect(parseInvoiceBook([['Hola'], ['Mundo']], 'issued', 2026)).toEqual({
      ok: false,
      reason: 'noHeader',
    });
    expect(
      parseInvoiceBook(
        [
          ['Fecha', 'Base imponible'],
          ['01/01/2026', 100],
        ],
        'issued',
        2026
      )
    ).toEqual({
      ok: false,
      reason: 'noColumns',
    });
    expect(
      parseInvoiceBook(
        [
          ['Base imponible', 'Tipo IVA'],
          [100, 21],
        ],
        'issued',
        2026
      )
    ).toEqual({
      ok: false,
      reason: 'noColumns',
    });
  });
});

describe('Workbook with several sheets', () => {
  const sheet = (name: string, concept: string): XlsxSheet => ({
    name,
    rows: [
      ['Fecha', 'Concepto', 'Base imponible', 'Tipo IVA'],
      [{ date: '2026-02-01' }, concept, 100, 21],
    ],
  });

  it('picks the sheet that fits the kind of book, whatever the order', () => {
    const sheets = workbook([sheet('Gastos', 'compra'), sheet('Ingresos', 'venta')]);
    const issued = parseWorkbook(sheets, 'issued', 2026);
    const received = parseWorkbook(sheets, 'received', 2026);
    expect(issued.ok && issued.result.entries[0].concept).toBe('venta');
    expect(received.ok && received.result.entries[0].concept).toBe('compra');
  });

  it('falls back to a neutral sheet, then to the other one, and reports the last failure', () => {
    const neutral = workbook([sheet('Hoja1', 'x')]);
    expect(parseWorkbook(neutral, 'issued', 2026).ok).toBe(true);
    const other = workbook([sheet('Gastos', 'compra')]);
    expect(parseWorkbook(other, 'issued', 2026).ok).toBe(true);
    const broken = workbook([{ name: 'Nada', rows: [['a'], ['b']] }]);
    expect(parseWorkbook(broken, 'received', 2026)).toEqual({ ok: false, reason: 'noHeader' });
    expect(parseWorkbook([], 'received', 2026)).toEqual({ ok: false, reason: 'noHeader' });
  });
});

describe('Expense lines', () => {
  const entry = (
    concept: string,
    total: number,
    vatRate: 21 | 10 | 4 | 0,
    quarter: 1 | 2 | 3 | 4 = 1
  ): BookEntry => ({
    date: '2026-01-10',
    quarter,
    base: total,
    vatRate,
    vat: 0,
    total,
    withheld: 0,
    concept,
  });

  it('guesses the kind from the supplier or the concept, and falls back to other', () => {
    const cases: [string, string][] = [
      ['Alquiler oficina', 'rent'],
      ['Material de oficina', 'material'],
      ['Google Ads', 'advertising'],
      ['Google Workspace', 'software'],
      ['Gestoría Pérez', 'management'],
      ['Licencia Adobe', 'software'],
      ['Campaña de publicidad', 'advertising'],
      ['Seguro Sanitas', 'health'],
      ['Repsol gasolina', 'vehicle'],
      ['Restaurante La Plaza', 'meals'],
      ['Curso de formación', 'training'],
      ['Cuota autónomos', 'quota'],
      ['Nómina Ana', 'staff'],
      ['Factura de luz Endesa', 'supplies'],
      ['Portátil nuevo', 'material'],
      ['Algo raro', 'other'],
      ['', 'other'],
    ];
    for (const [concept, kind] of cases) expect(guessExpenseKind(concept)).toBe(kind);
  });

  it('adds up invoices of the same kind and VAT rate; every meal stays on its own line with one day', () => {
    const lines = expensesByQuarter([
      entry('Gestoría A', 121, 21),
      entry('Gestoría B', 60.5, 21),
      entry('Gestoría C', 55, 10),
      entry('Restaurante A', 30, 10),
      entry('Restaurante B', 20, 10),
      entry('Alquiler', 500, 21, 2),
    ]);
    expect(lines[1]).toEqual([
      { kind: 'management', amount: 181.5, vatRate: 21, days: null },
      { kind: 'management', amount: 55, vatRate: 10, days: null },
      { kind: 'meals', amount: 30, vatRate: 10, days: 1 },
      { kind: 'meals', amount: 20, vatRate: 10, days: 1 },
    ]);
    expect(lines[2]).toEqual([{ kind: 'rent', amount: 500, vatRate: 21, days: null }]);
    expect(lines[3]).toBeUndefined();
  });
});
