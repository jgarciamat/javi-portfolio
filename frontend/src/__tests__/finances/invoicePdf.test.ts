import {
  amountsIn,
  bookOf,
  datesIn,
  entriesOf,
  fold,
  isCompany,
  kindOfInvoice,
  linesOf,
  parseInvoiceTokens,
  ratesIn,
  taxIdsIn,
  type InvoicePdf,
  type InvoicePdfParse,
} from '@modules/finances/domain/invoicePdf';
import type { PdfToken } from '@modules/finances/domain/taxModelPdf';
import { INVOICE_EXAMPLES } from '../../../scripts/invoice-pdfs';
import FIXTURES from './fixtures/invoicePdfTokens.json';

/** A printed piece: by default 6 points per character and a 10-point font, as pdf.js gives them. */
const tk = (text: string, x: number, y: number, over: Partial<PdfToken> = {}): PdfToken => ({
  text,
  x,
  y,
  field: false,
  w: text.length * 5,
  h: 10,
  ...over,
});

/** An invoice of one page from lines of text: each line a list of [text, x] at a height. */
const page = (...lines: [number, ...[string, number][]][]): PdfToken[][] => [
  lines.flatMap(([y, ...cells]) => cells.map(([text, x]) => tk(text, x, y))),
];

const read = (pages: PdfToken[][]): InvoicePdf => {
  const parsed = parseInvoiceTokens(pages);
  if (!parsed.ok) throw new Error(`not read: ${parsed.reason}`);
  return parsed.invoice;
};

/** The usual parts of an invoice around what a test is about. */
const HEAD: [number, ...[string, number][]][] = [
  [800, ['Ejemplo Servicios SL', 40]],
  [786, ['CIF B12345678', 40]],
  [760, ['FACTURA', 40]],
  [700, ['Cliente:', 340]],
  [686, ['Laura Martín Gómez', 340]],
  [672, ['NIF 12345678Z', 340]],
];
const undated = (...lines: [number, ...[string, number][]][]) => read(page(...HEAD, ...lines));
const invoiceWith = (...lines: [number, ...[string, number][]][]) =>
  read(page(...HEAD, [740, ['Fecha: 12/03/2026', 40]], ...lines));

describe('The synthetic invoices read with the real pdf.js (their pieces of text as fixtures)', () => {
  const fixtures = FIXTURES as unknown as Record<string, PdfToken[][]>;

  it.each(INVOICE_EXAMPLES.filter((e) => e.expected).map((e) => [e.file, e.expected]))(
    '%s',
    (file, expected) => {
      const want = expected as NonNullable<(typeof INVOICE_EXAMPLES)[number]['expected']>;
      const invoice = read(fixtures[file as string]);
      expect({
        date: invoice.date,
        number: invoice.number,
        issuer: invoice.issuer,
        client: invoice.client,
        taxes: invoice.taxes,
        withheld: invoice.withheld,
        total: invoice.total,
        credit: invoice.credit,
        review: [...invoice.review].sort(),
        book: bookOf(invoice, null).book,
      }).toEqual({ ...want, review: [...want.review].sort() });
    }
  );

  it.each(INVOICE_EXAMPLES.filter((e) => e.rejected).map((e) => [e.file, e.rejected]))(
    '%s is turned down',
    (file, reason) => {
      expect((parseInvoiceTokens(fixtures[file as string]) as { reason: string }).reason).toBe(
        reason
      );
    }
  );

  it('guesses the kind of expense from the supplier or from what was bought', () => {
    expect(kindOfInvoice(read(fixtures['01-luz-cabecera-izquierda.pdf']))).toBe('supplies');
    expect(kindOfInvoice(read(fixtures['06-coworking-fecha-escrita-pie.pdf']))).toBe('rent');
    expect(kindOfInvoice(read(fixtures['07-invoice-in-english.pdf']))).toBe('software');
    expect(kindOfInvoice(read(fixtures['02-papeleria-tabla-cabecera-derecha.pdf']))).toBe(
      'material'
    );
  });
});

describe('Lines and cells', () => {
  it('joins the pieces of one word, keeps columns apart and splits a piece at «·» or wide gaps', () => {
    const [line] = linesOf([
      [
        tk('Base', 40, 500),
        tk('imponible', 63, 501),
        tk(':', 108, 500),
        tk('100,00', 300, 500),
        tk('A · B', 400, 500, { w: undefined }),
        tk('C   D', 450, 500),
        tk('   ', 500, 500),
      ],
    ]);
    expect(line.cells.map((c) => c.text)).toEqual([
      'Base imponible:',
      '100,00',
      'A',
      'B',
      'C',
      'D',
    ]);
    expect(line.cells[3].x).toBe(400);
    expect(line.cells[5].x).toBe(470);
  });

  it('does not join pieces without a width or a size', () => {
    const [line] = linesOf([[tk('A', 10, 5, { w: undefined }), tk('B', 15, 5)]]);
    expect(line.cells.map((c) => c.text)).toEqual(['A', 'B']);
    const [other] = linesOf([[tk('A', 10, 5), tk('B', 15, 5, { h: undefined })]]);
    expect(other.cells.map((c) => c.text)).toEqual(['A', 'B']);
    const [last] = linesOf([[tk('A', 10, 5), tk('B', 15, 5, { w: undefined })]]);
    expect(last.cells).toEqual([{ text: 'AB', low: 'ab', x: 10, w: 5 }]);
  });

  it('orders lines top to bottom and pages one after the other', () => {
    const lines = linesOf([[tk('abajo', 1, 10), tk('arriba', 1, 700)], [tk('otra', 1, 800)]]);
    expect(lines.map((l) => [l.page, l.cells[0].text])).toEqual([
      [0, 'arriba'],
      [0, 'abajo'],
      [1, 'otra'],
    ]);
  });

  it('folds text keeping every character in its place', () => {
    expect(fold('Señal Á')).toBe('senal a');
  });
});

describe('Amounts, rates and tax ids in a text', () => {
  it.each([
    ['1.234,56 €', [1234.56]],
    ['1,234.56', [1234.56]],
    ['€242.00', [242]],
    ['-150,00 €', [-150]],
    ['−9,00', [-9]],
    ['1 234,50', [1234.5]],
    ['12,50 y 7,00', [12.5, 7]],
    ['1,500€', [1500]],
    ['€ 90', [90]],
    ['1.500 EUR', [1500]],
    ['-1.500 €', [-1500]],
  ])('reads «%s»', (text, values) => {
    expect(amountsIn(text).map((a) => a.value)).toEqual(values);
  });

  it.each(['21 %', '12/03/2026', '12.03.2026', '1.234.56', '1,5', '2026', 'Ref 1234'])(
    'takes «%s» as no amount',
    (text) => {
      expect(amountsIn(text)).toEqual([]);
    }
  );

  it('reads percentages', () => {
    expect(ratesIn('IVA 21 % · RE 5,2% · 10%')).toEqual([21, 5.2, 10]);
  });

  it('finds NIF, NIE and CIF with or without «ES» and hyphens', () => {
    expect(taxIdsIn('CIF: B-12345678 · NIF 12345678-Z · X1234567L · ESA87654321')).toEqual([
      'B12345678',
      '12345678Z',
      'X1234567L',
      'A87654321',
    ]);
    expect(taxIdsIn('Tel. 912345678 · IBAN ES91 2100')).toEqual([]);
  });

  it('tells a company by its CIF or by the suffix of its name', () => {
    expect(isCompany({ name: null, nif: 'B12345678' })).toBe(true);
    expect(isCompany({ name: 'Ejemplo S.L.', nif: null })).toBe(true);
    expect(isCompany({ name: 'Laura Martín', nif: '12345678Z' })).toBe(false);
    expect(isCompany({ name: null, nif: 'X1234567L' })).toBe(false);
  });
});

describe('Dates in a text', () => {
  it.each([
    ['12/03/2026', '2026-03-12'],
    ['12-03-26', '2026-03-12'],
    ['12.03.2026', '2026-03-12'],
    ['12 de marzo de 2026', '2026-03-12'],
    ['1º de septiembre del 2026', '2026-09-01'],
    ['12-mar-2026', '2026-03-12'],
    ['2026-03-12', '2026-03-12'],
    ['2026/3/5', '2026-03-05'],
    ['march 12, 2026', '2026-03-12'],
    ['march 1st 2026', '2026-03-01'],
    ['12 march 2026', '2026-03-12'],
  ])('reads «%s»', (text, date) => {
    expect(datesIn(text).map((d) => d.date)).toEqual([date]);
  });

  it('leaves out dates that do not exist', () => {
    expect(datesIn('31/02/2026 · 10/13/2026 · 00/01/2026')).toEqual([]);
  });

  it('reads an English invoice month first when the day could not be a month, and says when it could', () => {
    expect(datesIn('03/25/2026', true)).toEqual([
      { date: '2026-03-25', start: 0, end: 10, ambiguous: false },
    ]);
    expect(datesIn('03/04/2026', true)[0]).toMatchObject({ date: '2026-04-03', ambiguous: true });
    expect(datesIn('04/04/2026', true)[0].ambiguous).toBe(false);
    expect(datesIn('03/04/2026')[0].ambiguous).toBe(false);
  });
});

describe('Which date is the invoice’s', () => {
  const dateOf = (...lines: [number, ...[string, number][]][]) =>
    undated(
      ...lines,
      [500, ['Base imponible', 300], ['100,00', 500]],
      [480, ['IVA 21 %', 300], ['21,00', 500]],
      [460, ['Total', 300], ['121,00', 500]]
    ).date;

  it.each([
    ['Fecha factura: 12/03/2026  Vencimiento: 12/04/2026', '2026-03-12'],
    ['Vencimiento: 12/04/2026  Fecha: 12/03/2026', '2026-03-12'],
    ['Fecha de operación: 01/03/2026  Fecha de expedición: 05/03/2026', '2026-03-05'],
    ['Fecha de operación: 01/03/2026', '2026-03-01'],
    ['Madrid, 12 de marzo de 2026', '2026-03-12'],
    ['Invoice date: 12/03/2026', '2026-03-12'],
  ])('«%s»', (text, date) => {
    expect(dateOf([600, [text, 40]])).toBe(date);
  });

  it('takes a heading over its value, and never the due date alone', () => {
    expect(
      dateOf(
        [610, ['Vencimiento', 40], ['Fecha', 160]],
        [596, ['30/04/2026', 40], ['31/03/2026', 160]]
      )
    ).toBe('2026-03-31');
    const due = undated(
      [600, ['Vencimiento: 30/04/2026', 40]],
      [500, ['Total', 300], ['121,00', 500]]
    );
    expect(due.date).toBeNull();
    expect(due.review).toContain('date');
  });

  it('takes the date written after another one in the same piece by its own label', () => {
    expect(dateOf([600, ['Emitida 02/03/2026, vencimiento 02/04/2026', 40]])).toBe('2026-03-02');
  });

  it('marks an English date that could be either way round', () => {
    const invoice = read(
      page(
        [800, ['Example Ltd', 40]],
        [780, ['INVOICE', 40]],
        [760, ['Invoice date: 03/04/2026', 40]],
        [700, ['Subtotal', 300], ['€100.00', 500]],
        [680, ['VAT 21%', 300], ['€21.00', 500]],
        [660, ['Total', 300], ['€121.00', 500]]
      )
    );
    expect(invoice.review).toContain('dateFormat');
  });
});

describe('The number of the invoice', () => {
  const numberOf = (...lines: [number, ...[string, number][]][]) =>
    invoiceWith(...lines, [460, ['Total', 300], ['121,00', 500]]);

  it.each([
    ['Factura nº F-2026-001', 'F-2026-001'],
    ['FACTURA 2026/015', '2026/015'],
    ['Nº de factura: A123', 'A123'],
    ['Número: T-0457.', 'T-0457'],
    ['Invoice # [42]', '42'],
  ])('«%s»', (text, number) => {
    expect(numberOf([620, [text, 40]]).number).toBe(number);
  });

  it('takes a number under its heading, and not a date after «Fecha factura»', () => {
    expect(
      numberOf(
        [620, ['Fecha factura: 12/03/2026', 40]],
        [600, ['Nº factura', 40]],
        [586, ['X-9', 40]]
      ).number
    ).toBe('X-9');
    expect(numberOf([620, ['Fecha factura: 12/03/2026', 40]]).number).toBeNull();
    expect(numberOf([620, ['Nº factura', 40]]).number).toBeNull();
  });

  it('marks a PDF with several invoices', () => {
    const two = [
      ...page(...HEAD, [620, ['Factura nº A-1', 40]], [460, ['Total', 300], ['121,00', 500]]),
      ...page([620, ['Factura nº A-2', 40]], [460, ['Total', 300], ['50,00', 500]]),
    ];
    const invoice = read(two);
    expect(invoice.number).toBe('A-1');
    expect(invoice.review).toContain('several');
  });
});

describe('Who issued it and who it is for', () => {
  const totals: [number, ...[string, number][]] = [460, ['Total', 300], ['121,00', 500]];

  it('reads the issuer’s label block when there is one', () => {
    const invoice = read(
      page(
        [800, ['Factura', 40]],
        [780, ['Emisor: Taller Ejemplo SL', 40], ['Cliente', 340]],
        [766, ['B87654321', 40], ['Ana Pérez · 11111111H', 340]],
        totals
      )
    );
    expect(invoice.issuer).toEqual({ name: 'Taller Ejemplo SL', nif: 'B87654321' });
    expect(invoice.client).toEqual({ name: 'Ana Pérez', nif: '11111111H' });
  });

  it('without a client label, the issuer is the first tax id and the client the next one', () => {
    const invoice = read(
      page(
        [800, ['Ejemplo Uno SL', 40]],
        [786, ['B12345678', 40]],
        [760, ['FACTURA', 40]],
        [720, ['Ana Pérez', 340]],
        [706, ['11111111H', 340]],
        totals
      )
    );
    expect(invoice.issuer).toEqual({ name: 'Ejemplo Uno SL', nif: 'B12345678' });
    expect(invoice.client).toEqual({ name: 'Ana Pérez', nif: '11111111H' });
  });

  it('a client with no tax id and no name near it, and an issuer with neither', () => {
    const invoice = read(
      page(
        [800, ['FACTURA SIMPLIFICADA', 40]],
        [700, ['Base 100,00', 300]],
        [680, ['IVA 21 %   21,00', 300]],
        totals
      )
    );
    expect(invoice.issuer).toEqual({ name: null, nif: null });
    expect(invoice.client).toEqual({ name: null, nif: null });
    expect(invoice.review).toContain('issuer');
    const named = read(
      page(
        [800, ['FACTURA', 40]],
        [780, ['C/ Mayor 1', 40]],
        [766, ['B12345678', 40]],
        [700, ['www.example.test', 340]],
        [686, ['11111111H', 340]],
        [600, ['Base 100,00 · IVA 21 % 21,00', 300]],
        totals
      )
    );
    expect(named.issuer).toEqual({ name: null, nif: 'B12345678' });
    expect(named.client).toEqual({ name: null, nif: '11111111H' });
  });

  it('takes a company name before the tax id on its line, and stops the client block at a heading', () => {
    const invoice = read(
      page(
        [800, ['FACTURA', 40]],
        [780, ['Nombre: Ejemplo Dos SA', 40], ['CIF A11111111', 200]],
        [740, ['Facturar a: Ana Pérez', 40]],
        [726, ['Fecha: 01/02/2026', 40]],
        [712, ['NIF 22222222J', 40]],
        totals
      )
    );
    expect(invoice.issuer).toEqual({ name: 'Ejemplo Dos SA', nif: 'A11111111' });
    expect(invoice.client).toEqual({ name: 'Ana Pérez', nif: null });
  });

  it('a block ends at a wide gap, on another page or far below', () => {
    const invoice = read([
      [
        tk('Factura', 40, 800),
        tk('Cliente:', 40, 700),
        tk('Ana Pérez', 90, 700),
        tk('Ejemplo Tres SL B33333333', 400, 700),
        tk('22222222J', 40, 600),
        tk('Base imponible 100,00', 300, 500),
        tk('IVA 21 % 21,00', 300, 486),
        tk('Total 121,00', 300, 472),
      ],
      [tk('33333333P', 40, 690)],
    ]);
    expect(invoice.client).toEqual({ name: 'Ana Pérez', nif: null });
    expect(invoice.issuer).toEqual({ name: 'Ejemplo Tres SL', nif: 'B33333333' });
  });
});

describe('Issued or received', () => {
  const base = read(page(...HEAD, [500, ['Total', 300], ['121,00', 500]]));
  const me = { nif: '12345678Z', name: 'Laura Martín Gómez' };

  it('knows the person by their tax id or name', () => {
    expect(bookOf({ ...base, issuer: { name: 'x', nif: '12345678Z' } }, me)).toEqual({
      book: 'issued',
      sure: true,
    });
    expect(bookOf({ ...base, issuer: { name: 'LAURA martin gomez', nif: null } }, me).book).toBe(
      'issued'
    );
    expect(bookOf(base, me)).toEqual({ book: 'received', sure: true });
    expect(bookOf({ ...base, client: { name: null, nif: null } }, me)).toEqual({
      book: null,
      sure: false,
    });
    expect(bookOf({ ...base, client: { name: '', nif: null } }, { nif: null, name: '' }).book).toBe(
      null
    );
  });

  it('is an expense unless a company client has IRPF withheld, when it asks', () => {
    expect(bookOf(base, null)).toEqual({ book: 'received', sure: false });
    const withheld = { ...base, withheld: 150 };
    expect(bookOf(withheld, null).book).toBe('received');
    expect(bookOf({ ...withheld, client: { name: 'Estudio SL', nif: null } }, null)).toEqual({
      book: null,
      sure: false,
    });
  });
});

describe('Amounts by their labels', () => {
  it('reads labels with their amounts to the right, or under them', () => {
    const inline = invoiceWith(
      [500, ['Base imponible', 300], ['1.000,00', 500]],
      [486, ['IVA 21 %', 300], ['210,00', 500]],
      [472, ['Total factura', 300], ['1.210,00 €', 500]]
    );
    expect(inline.taxes).toEqual([{ rate: 21, base: 1000, vat: 210 }]);
    expect(inline.total).toBe(1210);
    expect(inline.review).toEqual([]);
  });

  it('reads a breakdown with one line per rate, with the rate in its own column', () => {
    const invoice = invoiceWith(
      [520, ['Base', 300], ['Tipo', 380], ['Cuota', 460]],
      [506, ['100,00', 300], ['21%', 380], ['21,00', 460]],
      [492, ['50,00', 300], ['10 %', 380], ['5,00', 460]],
      [478, ['20,00', 300], ['0 %', 380], ['0,00', 460]],
      [440, ['Total', 300], ['196,00', 460]]
    );
    expect(invoice.taxes).toEqual([
      { rate: 21, base: 100, vat: 21 },
      { rate: 10, base: 50, vat: 5 },
      { rate: 0, base: 20, vat: 0 },
    ]);
    expect(invoice.review).toEqual([]);
  });

  it('reads the totals of a breakdown table, a rate typed without «%» and a heading line without values', () => {
    const invoice = invoiceWith(
      [520, ['Base', 300], ['% IVA', 380], ['Cuota', 440], ['Retención', 500], ['Total', 560]],
      [506, ['100,00', 300], ['21,00', 380], ['21,00', 440], ['15,00', 500], ['106,00', 560]],
      [420, ['Total', 300]],
      [300, ['Forma de pago: transferencia', 40]]
    );
    expect(invoice.taxes).toEqual([{ rate: 21, base: 100, vat: 21 }]);
    expect(invoice.withheld).toBe(15);
    expect(invoice.total).toBe(106);
  });

  it('reads table rows without a rate, without a VAT amount or without a base', () => {
    const noRate = invoiceWith(
      [520, ['Base imponible', 300], ['Cuota', 400], ['Total', 500]],
      [506, ['100,00', 300], ['10,00', 400], ['110,00', 500]]
    );
    expect(noRate.taxes).toEqual([{ rate: 10, base: 100, vat: 10 }]);
    const noVat = invoiceWith(
      [520, ['Base imponible', 300], ['Total', 500]],
      [506, ['100,00', 300], ['121,00', 500]]
    );
    expect(noVat.taxes).toEqual([{ rate: 21, base: 100, vat: 21 }]);
    const noBase = invoiceWith(
      [520, ['IVA 21 %', 300], ['Total', 500]],
      [506, ['21,00', 300], ['121,00', 500]],
      [480, ['Retención', 300], ['Total', 500]],
      [466, ['0,00', 300], ['121,00', 500]]
    );
    expect(noBase.taxes).toEqual([{ rate: 21, base: 100, vat: 21 }]);
  });

  it('works out the bases of several rates from their VAT, and a 0 % base from what is left', () => {
    const invoice = invoiceWith(
      [520, ['Base imponible', 300], ['170,00', 500]],
      [506, ['IVA 21 %', 300], ['21,00', 500]],
      [492, ['IVA 10 %', 300], ['5,00', 500]],
      [478, ['IVA 0 %', 300], ['0,00', 500]],
      [440, ['Total', 300], ['196,00', 500]]
    );
    expect(invoice.taxes).toEqual([
      { rate: 21, base: 100, vat: 21 },
      { rate: 10, base: 50, vat: 5 },
      { rate: 0, base: 20, vat: 0 },
    ]);
  });

  it('marks the split when the bases from the VAT do not add up to the base', () => {
    const invoice = invoiceWith(
      [520, ['Base imponible', 300], ['200,00', 500]],
      [506, ['IVA 21 %', 300], ['21,00', 500]],
      [492, ['IVA 10 %', 300], ['5,00', 500]],
      [440, ['Total', 300], ['226,00', 500]]
    );
    expect(invoice.review).toContain('split');
  });

  it('takes several bases each with its rate, and a VAT line with its base on it', () => {
    const bases = invoiceWith(
      [520, ['Base imponible 21 %', 300], ['100,00', 500]],
      [506, ['Base imponible 10 %', 300], ['50,00', 500]],
      [440, ['Total', 300], ['176,00', 500]]
    );
    expect(bases.taxes).toEqual([
      { rate: 21, base: 100, vat: 21 },
      { rate: 10, base: 50, vat: 5 },
    ]);
    const paired = invoiceWith(
      [506, ['IVA 21 % s/ 1.000,00', 300], ['210,00', 500]],
      [492, ['IVA 10 % s/ 100,00 = 10,00', 300]],
      [440, ['Total', 300], ['1.320,00', 500]]
    );
    expect(paired.taxes).toEqual([
      { rate: 21, base: 1000, vat: 210 },
      { rate: 10, base: 100, vat: 10 },
    ]);
    const byRate = invoiceWith(
      [520, ['Base imponible 21 %', 300], ['100,00', 500]],
      [506, ['IVA 21 %', 300], ['21,00', 500]],
      [440, ['Total', 300], ['121,00', 500]]
    );
    expect(byRate.taxes).toEqual([{ rate: 21, base: 100, vat: 21 }]);
  });

  it('a VAT line without a base: the base comes from its rate; without a rate, from the amounts', () => {
    expect(
      invoiceWith([506, ['IVA 21 %', 300], ['21,00', 500]], [440, ['Total', 300], ['121,00', 500]])
        .taxes
    ).toEqual([{ rate: 21, base: 100, vat: 21 }]);
    expect(
      invoiceWith(
        [520, ['Subtotal', 300], ['100,00', 500]],
        [506, ['IVA', 300], ['10,00', 500]],
        [440, ['Total', 300], ['110,00', 500]]
      ).taxes
    ).toEqual([{ rate: 10, base: 100, vat: 10 }]);
  });

  it('a single base without VAT takes the rate the total leaves; an exempt one is at 0 %', () => {
    expect(
      invoiceWith([520, ['Subtotal', 300], ['100,00', 500]], [440, ['Total', 300], ['104,00', 500]])
        .taxes
    ).toEqual([{ rate: 4, base: 100, vat: 4 }]);
    const exempt = invoiceWith(
      [560, ['Operación exenta de IVA (art. 20)', 40]],
      [520, ['Base imponible', 300], ['100,00', 500]],
      [440, ['Total', 300], ['100,00', 500]]
    );
    expect(exempt.taxes).toEqual([{ rate: 0, base: 100, vat: 0 }]);
    const odd = invoiceWith(
      [520, ['Subtotal', 300], ['100,00', 500]],
      [440, ['Total', 300], ['107,00', 500]]
    );
    expect(odd.taxes).toEqual([{ rate: null, base: 100, vat: null }]);
    expect(odd.review).toContain('amount');
  });

  it('a VAT rate the draft does not take is marked, and the base stays', () => {
    const invoice = invoiceWith(
      [520, ['Base imponible', 300], ['100,00', 500]],
      [506, ['IGIC 7 %', 300]],
      [500, ['IVA 7 %', 300], ['7,00', 500]],
      [440, ['Total', 300], ['107,00', 500]]
    );
    expect(invoice.taxes).toEqual([{ rate: null, base: 100, vat: 7 }]);
    expect(invoice.review).toEqual(expect.arrayContaining(['rate', 'amount']));
  });

  it('nothing readable: one empty line to complete, and no total to check against', () => {
    const invoice = invoiceWith([520, ['IVA incluido', 300], ['21,00', 500]], [300, ['Total', 40]]);
    expect(invoice.taxes).toEqual([{ rate: null, base: null, vat: null }]);
    expect(invoice.total).toBeNull();
    expect(invoice.review).toEqual(expect.arrayContaining(['amount', 'noTotal']));
  });

  it('a total that does not add up is marked with what the amounts give', () => {
    const invoice = invoiceWith(
      [520, ['Base imponible', 300], ['100,00', 500]],
      [506, ['IVA 21 %', 300], ['21,00', 500]],
      [440, ['Total', 300], ['125,00', 500]]
    );
    expect(invoice.review).toEqual(['mismatch']);
    expect(invoice.mismatch).toEqual({ expected: 121, total: 125 });
    expect(invoice.total).toBe(125);
  });

  it('within 2 cents the total adds up; the total before the withholding counts too', () => {
    expect(
      invoiceWith(
        [520, ['Base imponible', 300], ['100,00', 500]],
        [506, ['IVA 21 %', 300], ['21,00', 500]],
        [440, ['Total', 300], ['121,02', 500]]
      ).review
    ).toEqual([]);
    const withheld = invoiceWith(
      [520, ['Base imponible', 300], ['100,00', 500]],
      [506, ['IVA 21 %', 300], ['21,00', 500]],
      [492, ['Retención 15 %', 300]],
      [440, ['Total', 300], ['121,00', 500]]
    );
    expect(withheld.withheld).toBe(15);
    expect(withheld.total).toBe(121);
    expect(withheld.review).toEqual([]);
  });

  it('a surcharge is added to the total and marked; reverse charge and other currencies too', () => {
    const invoice = invoiceWith(
      [560, ['Inversión del sujeto pasivo', 40]],
      [520, ['Base imponible', 300], ['100,00 €', 500]],
      [506, ['IVA 21 %', 300], ['21,00', 500]],
      [492, ['Recargo', 300], ['5,20', 500]],
      [470, ['Equivalente a 140,00 USD', 40]],
      [440, ['Total', 300], ['126,20', 500]]
    );
    expect(invoice.review.sort()).toEqual(['currency', 'reverse', 'surcharge']);
    expect(invoice.total).toBe(126.2);
  });

  it('a credit note has every amount negative, whether printed so or not', () => {
    const invoice = invoiceWith(
      [600, ['Abono de la factura A-1', 40]],
      [520, ['Base imponible', 300], ['50,00', 500]],
      [506, ['IVA 21 %', 300], ['10,50', 500]],
      [440, ['Total', 300], ['60,50', 500]]
    );
    expect(invoice.credit).toBe(true);
    expect(invoice.taxes).toEqual([{ rate: 21, base: -50, vat: -10.5 }]);
    expect(invoice.total).toBe(-60.5);
    const printed = invoiceWith(
      [520, ['Base imponible', 300], ['-50,00', 500]],
      [506, ['IVA 0 %', 300], ['0,00', 500]],
      [470, ['Retención', 300], ['5,00', 500]],
      [440, ['Total', 300], ['-55,00', 500]]
    );
    expect(printed.credit).toBe(true);
    expect(printed.withheld).toBe(-5);
    expect(printed.taxes).toEqual([{ rate: 0, base: -50, vat: 0 }]);
    expect(printed.review).toEqual(['mismatch']);
    expect(printed.mismatch).toEqual({ expected: -45, total: -55 });
  });

  it('takes what was bought from the lines under «Descripción»', () => {
    const invoice = invoiceWith(
      [640, ['Descripción', 40], ['Importe', 500]],
      [626, ['Curso de formación', 40], ['100,00', 500]],
      [612, ['--', 40]],
      [598, ['Material', 40]],
      [584, ['Otra cosa', 40]],
      [570, ['Y otra', 40]],
      [520, ['Base imponible', 300], ['100,00', 500]]
    );
    expect(invoice.concept).toBe('Curso de formación, Material, Otra cosa');
    expect(
      invoiceWith(
        [640, ['Concepto', 40]],
        [626, ['100,00', 40]],
        [440, ['Total', 300], ['1,00', 500]]
      ).concept
    ).toBe('');
  });
});

describe('What is not an invoice', () => {
  const reason = (pages: PdfToken[][]) =>
    (parseInvoiceTokens(pages) as Extract<InvoicePdfParse, { ok: false }>).reason;

  it('a PDF without text, one that is not an invoice, and one in another currency', () => {
    expect(reason([[tk('1 2 3', 1, 1)], []])).toBe('noText');
    expect(reason(page([800, ['Contrato de arrendamiento entre las partes', 40]]))).toBe(
      'notInvoice'
    );
    expect(reason(page([800, ['Factura de algo sin importes ni nada', 40]]))).toBe('notInvoice');
    expect(
      reason(
        page([800, ['Factura de servicios varios', 40]], [700, ['Total', 300], ['100,00', 500]])
      )
    ).toBe('notInvoice');
    expect(
      parseInvoiceTokens(
        page(
          [800, ['Invoice from Example Ltd', 40]],
          [700, ['Subtotal', 300], ['$100.00', 500]],
          [680, ['Total', 300], ['$100.00', 500]]
        )
      )
    ).toEqual({ ok: false, reason: 'currency', currency: 'USD' });
    expect(
      (
        parseInvoiceTokens(
          page(
            [800, ['Invoice from Example Ltd', 40]],
            [700, ['VAT', 300], ['£20.00', 500]],
            [680, ['Total', 300], ['£120.00', 500]]
          )
        ) as { currency: string }
      ).currency
    ).toBe('GBP');
    expect(
      (
        parseInvoiceTokens(
          page(
            [800, ['Invoice from Example Ltd', 40]],
            [700, ['VAT', 300], ['20.00 CHF', 500]],
            [680, ['Total', 300], ['120.00 CHF', 500]]
          )
        ) as { currency: string }
      ).currency
    ).toBe('CHF');
  });
});

describe('The invoice as entries of a book', () => {
  const invoice = read(
    page(
      ...HEAD,
      [600, ['Fecha: 12/05/2026', 40]],
      [520, ['Base', 300], ['% IVA', 380], ['Cuota', 460]],
      [506, ['100,00', 300], ['21 %', 380], ['21,00', 460]],
      [492, ['50,00', 300], ['10 %', 380], ['5,00', 460]],
      [470, ['Retención 15 %', 300], ['22,50', 460]],
      [440, ['Total', 300], ['153,50', 460]]
    )
  );

  it('one entry per rate; an issued one keeps the withholding on the first', () => {
    expect(entriesOf(invoice, 'issued')).toEqual([
      expect.objectContaining({
        date: '2026-05-12',
        quarter: 2,
        base: 100,
        vatRate: 21,
        vat: 21,
        total: 121,
        withheld: 22.5,
        concept: 'Laura Martín Gómez',
        missing: [],
      }),
      expect.objectContaining({ base: 50, vatRate: 10, withheld: 0 }),
    ]);
  });

  it('a received one keeps what the person withheld and the supplier’s tax id', () => {
    const [first, second] = entriesOf(invoice, 'received');
    expect(first).toMatchObject({ withheld: 0, retention: 22.5, nif: 'B12345678' });
    expect(second.retention).toBeUndefined();
    const plain = entriesOf(
      { ...invoice, withheld: 0, issuer: { name: null, nif: null } },
      'received'
    );
    expect(plain[0].retention).toBeUndefined();
    expect(plain[0].nif).toBeUndefined();
    expect(plain[0].concept).toBe('');
  });

  it('what was not read stays empty and is listed as missing', () => {
    const [entry] = entriesOf(
      {
        ...invoice,
        date: null,
        taxes: [{ rate: null, base: null, vat: null }],
        issuer: { name: null, nif: 'B1' },
      },
      'received'
    );
    expect(entry).toMatchObject({
      date: '',
      quarter: 1,
      base: 0,
      vatRate: 21,
      vat: 0,
      total: 0,
      concept: 'B1',
      missing: ['date', 'base', 'rate'],
    });
  });

  it('the kind falls back on what was bought, and on «other»', () => {
    expect(
      kindOfInvoice({ ...invoice, issuer: { name: null, nif: null }, concept: 'Curso de inglés' })
    ).toBe('training');
    expect(kindOfInvoice({ ...invoice, concept: '' })).toBe('other');
  });
});
