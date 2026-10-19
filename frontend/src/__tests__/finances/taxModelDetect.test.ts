import { parseTaxModelTokens, type PdfToken } from '@modules/finances/domain/taxModelPdf';
import { formKindOf, wordsOf } from '@modules/finances/domain/taxModelDetect';

/**
 * The failures of the reader found on the official documents (docs/fiscalidad/documentos-oficiales.md,
 * § 2), each one on a made-up PDF that has the same shape: the words and places of the pieces, with
 * invented figures.
 */
const text = (t: string, x: number, y: number, h?: number): PdfToken => ({
  text: t,
  x,
  y,
  field: false,
  ...(h !== undefined ? { h } : {}),
});
const typed = (t: string, x: number, y: number, w = 80): PdfToken => ({
  text: t,
  x,
  y,
  field: true,
  w,
  h: 12,
});

const VAT_TITLE = [
  text('Impuesto sobre el Valor Añadido', 40, 760),
  text('Autoliquidación', 40, 748),
];
const header = (year: string, period: string, y = 710) => [
  text('Ejercicio', 416, y),
  text(year, 462, y),
  text('Período', 505, y),
  text(period, 538, y),
];
const row = (box: string, amount: string, y: number, x = 300): PdfToken[] => [
  text(box, x, y),
  text(amount, x + 40, y),
];

const parse = (...pages: PdfToken[][]) => parseTaxModelTokens(pages);
const boxesOf = (...pages: PdfToken[][]) => {
  const read = parse(...pages);
  if (!read.ok) throw new Error(read.reason);
  return read.data.boxes;
};

describe('Forms of the foral Treasuries', () => {
  it('refuses a 303 of Bizkaia: its 08 is the 21 % quota, not the rate', () => {
    const bizkaia = [
      text('Bizkaiko Foru Aldundia', 40, 790),
      text('Diputación Foral de Bizkaia', 40, 780),
      ...VAT_TITLE,
      ...header('2026', '2T'),
      ...row('07', '1.000,00', 400),
      ...row('08', '210,00', 400, 420),
    ];
    expect(parse(bizkaia)).toEqual({ ok: false, reason: 'foral', territory: 'bizkaia' });
  });

  it('refuses the 300 of Gipuzkoa, the 130 of Álava and the F-69 of Navarra', () => {
    const gipuzkoa = [
      text('Gipuzkoako Foru Aldundia', 40, 790),
      text('Modelo 300', 40, 770),
      ...VAT_TITLE,
      ...row('02', '500,00', 400),
    ];
    const alava = [
      text('Diputación Foral de Álava', 40, 790),
      text('Pago fraccionado', 40, 770),
      text('Actividades económicas', 40, 760),
      ...row('01', '900,00', 400),
    ];
    const navarra = [
      text('Hacienda Foral de Navarra', 40, 790),
      text('F-69', 40, 770),
      ...row('03', '12,00', 400),
    ];
    const basque = [text('Foru Aldundia', 40, 790), ...VAT_TITLE, ...row('07', '1,00', 400)];
    expect(parse(gipuzkoa)).toMatchObject({ reason: 'foral', territory: 'gipuzkoa' });
    expect(parse(alava)).toMatchObject({ reason: 'foral', territory: 'alava' });
    expect(parse(navarra)).toMatchObject({ reason: 'foral', territory: 'navarra' });
    expect(parse(basque)).toMatchObject({ reason: 'foral', territory: 'basque' });
  });

  it('still reads the State 303, which names the four territories in its boxes 89-92', () => {
    const state = [
      ...VAT_TITLE,
      ...header('2026', '4T'),
      text('Tributación exclusivamente foral.', 40, 600),
      text('Araba/Álava', 40, 590),
      text('Gipuzkoa', 120, 590),
      text('Bizkaia', 200, 590),
      text('Navarra', 280, 590),
      ...row('89', '10,00', 500),
    ];
    expect(parse(state)).toMatchObject({ ok: true, data: { model: '303', boxes: { '89': 10 } } });
  });
});

describe('Documents that print a form without being one', () => {
  it('refuses the BOE that prints the blank 390, with the rate 1,75 beside its box 41', () => {
    const boe = [
      text('BOLETÍN OFICIAL DEL ESTADO', 200, 800),
      text('cve: BOE-A-2026-0000', 20, 400),
      ...VAT_TITLE,
      ...row('41', '1,75', 400),
    ];
    expect(parse(boe)).toEqual({ ok: false, reason: 'notAForm' });
  });

  it('refuses a manual that speaks of the VAT on page after page', () => {
    const pages = Array.from({ length: 41 }, (_, i) =>
      i === 0 ? [...VAT_TITLE, ...row('27', '3,00', 400)] : [text('Capítulo', 40, 700)]
    );
    expect(parse(...pages)).toEqual({ ok: false, reason: 'notAForm' });
    expect(formKindOf([], 1)).toEqual({ kind: 'unknown' });
  });
});

describe('Telling the 390 from the 303', () => {
  it('takes the number printed big in the header over the words of the title', () => {
    const big390 = [
      text('Modelo', 460, 790),
      text('390', 455, 770, 22),
      ...VAT_TITLE,
      text('Ejercicio', 416, 710),
      text('2025', 462, 710),
      ...row('99', '1.234,00', 400),
    ];
    expect(parse(big390)).toMatchObject({ ok: true, data: { model: '390', year: 2025 } });
    // A small «303» in a sentence, or a typed one, is not the header.
    const small = [text('303', 455, 770, 6), typed('390', 400, 700), ...VAT_TITLE];
    expect(formKindOf(small, 1)).toEqual({ kind: 'model', model: '303' });
  });

  it('knows a 390 whose title is not text by its yearly period or its own boxes', () => {
    const yearly = [...VAT_TITLE, ...header('2025', '0A'), ...row('99', '5,00', 400)];
    expect(parse(yearly)).toMatchObject({ ok: true, data: { model: '390', quarter: null } });
    const deductions = [
      ...VAT_TITLE,
      ...row('605', '1,00', 400),
      ...row('606', '2,00', 380),
      ...row('[607]', '3,00', 360),
    ];
    expect(boxesOf(deductions)).toEqual({ '605': 1, '606': 2, '607': 3 });
    expect(parse(deductions)).toMatchObject({ data: { model: '390' } });
  });

  it('reads a 303 that only mentions the 390 to say it is exempt from it', () => {
    const exempt = [
      ...VAT_TITLE,
      text('Sujeto pasivo exonerado de la Declaración-resumen anual del IVA', 40, 600),
      ...header('2026', '1T'),
      ...row('71', '15,00', 400),
    ];
    expect(parse(exempt)).toMatchObject({ data: { model: '303', quarter: 1 } });
  });
});

describe('The boxes of the 2026 design of the 303', () => {
  it('reads the simplified regime (47-57), the 112 and the prorrata (500-524, 700-735)', () => {
    const page = [
      ...VAT_TITLE,
      ...header('2026', '1T'),
      ...row('47', '100,00', 600),
      ...row('57', '7,00', 590),
      ...row('112', '8,00', 580),
      ...row('500', '1,00', 570),
      ...row('524', '90,00', 560),
      ...row('735', '-2,00', 550),
      // Boxes the 2026 design no longer has.
      ...row('61', '3,00', 540),
      ...row('121', '4,00', 530),
    ];
    expect(boxesOf(page)).toEqual({ '47': 100, '57': 7, '112': 8, '500': 1, '524': 90, '735': -2 });
  });

  it('takes whole amounts printed without cents (-6.000, 0) when they are next to their box', () => {
    const page = [
      ...VAT_TITLE,
      ...header('2026', '2T'),
      ...row('40', '-6.000', 600),
      ...row('87', '0', 590),
      ...row('110', '1.234,56', 580),
      // A whole figure with no box at its left is nothing.
      text('0', 100, 570),
    ];
    expect(boxesOf(page)).toEqual({ '40': -6000, '87': 0, '110': 1234.56 });
  });

  it('does not take a row of whole figures, nor the figures of a page with no amount in cents', () => {
    const table = [
      ...VAT_TITLE,
      ...header('2026', '2T'),
      text('05', 100, 600),
      text('83.000', 150, 600),
      text('91.000', 200, 600),
      ...row('07', '5,00', 500),
      // The amount in cents is the one of the box, even after a whole one.
      text('09', 100, 450),
      text('2.000', 150, 450),
      text('09', 100, 300),
      text('7,00', 150, 300),
    ];
    expect(boxesOf(table)).toEqual({ '05': 83000, '07': 5, '09': 7 });
    const statement = [text('05', 100, 600), text('83.000', 150, 600)];
    expect(boxesOf([...VAT_TITLE, ...row('07', '1,00', 500)], statement)).toEqual({ '07': 1 });
  });
});

describe('Several periods in one PDF', () => {
  it('refuses the four quarters of a year in one PDF: their boxes would be mixed', () => {
    const quarter = (q: string, amount: string) => [
      ...VAT_TITLE,
      ...header('2026', q),
      ...row('71', amount, 400),
    ];
    expect(parse(quarter('1T', '1,00'), quarter('2T', '2,00'))).toEqual({
      ok: false,
      reason: 'severalPeriods',
      periods: ['2026 1T', '2026 2T'],
    });
    const noYear = (q: string) => [...VAT_TITLE, text('Período', 505, 710), text(q, 538, 710)];
    expect(parse(noYear('1T'), noYear('2T'))).toMatchObject({ periods: ['1T', '2T'] });
    // The pages of one quarter may repeat its header.
    expect(boxesOf(quarter('3T', '3,00'), quarter('3T', '4,00'))).toEqual({ '71': 3 });
  });

  it('refuses two years too, when the form has no quarter', () => {
    const year = (y: string) => [...VAT_TITLE, ...header(y, '0A'), ...row('99', '1,00', 400)];
    expect(parse(year('2024'), year('2025'))).toMatchObject({ periods: ['2024', '2025'] });
  });
});

describe('The year and the quarter, however they are printed', () => {
  const at = (...tokens: PdfToken[]) => {
    const read = parse([...VAT_TITLE, ...tokens, ...row('71', '1,00', 400)]);
    return read.ok ? { year: read.data.year, quarter: read.data.quarter } : read;
  };

  it('joins the year cut in pieces that do not touch («202» «5»), or digit by digit', () => {
    expect(at(text('Ejercicio', 400, 700), text('202', 450, 700), text('5', 466, 700))).toEqual({
      year: 2025,
      quarter: null,
    });
    const digits = ['2', '0', '2', '6'].map((d, i) => text(d, 450 + i * 8, 700));
    expect(at(text('Ejercicio', 400, 700), ...digits)).toMatchObject({ year: 2026 });
    expect(at(text('Ejercicio', 400, 700), text('20', 450, 700), text('x', 470, 700))).toEqual({
      year: null,
      quarter: null,
    });
  });

  it('reads «Ejercicio 2025» and «Período 3T» in one piece', () => {
    expect(at(text('Ejercicio 2025', 400, 700), text('Período 3T', 500, 700))).toEqual({
      year: 2025,
      quarter: 3,
    });
  });

  it('reads them under their labels, as the fillable 110 has them', () => {
    expect(
      at(
        text('Ejercicio', 400, 700),
        typed('2026', 400, 685),
        text('Período', 500, 700),
        typed('2T', 500, 685)
      )
    ).toEqual({ year: 2026, quarter: 2 });
    // The nearest one under the label, when there are two.
    expect(
      at(text('Ejercicio', 400, 700), typed('2024', 400, 680), typed('2025', 405, 690))
    ).toMatchObject({ year: 2025 });
  });

  it('never takes the year typed in its box for an amount', () => {
    const page = [
      text('Retenciones e ingresos a cuenta', 40, 760),
      text('Arrendamiento o subarrendamiento de inmuebles urbanos', 40, 750),
      text('2', 300, 700),
      text('Ejercicio', 320, 700),
      typed('2026', 360, 700),
      text('2', 300, 600),
      typed('3.000,00', 340, 600),
    ];
    expect(boxesOf(page)).toEqual({ '02': 3000 });
  });
});

describe('The old fillable 115 (2002)', () => {
  it('knows its title with line breaks and reads its boxes of one digit', () => {
    const page = [
      text('Retenciones e ingresos a cuenta.\rRendimientos procedentes del\r', 40, 780),
      text('arrendamiento o subarrendamiento\rde inmuebles urbanos', 40, 768),
      ...['1', '2', '3', '4', '5'].map((b, i) => text(b, 430, 600 - i * 15)),
      typed('1', 444, 600),
      typed('6.000,00', 444, 585),
      typed('1.140,00', 444, 570),
      typed('0,00', 444, 555),
      typed('1.140,00', 444, 540),
    ];
    expect(wordsOf(page.slice(0, 2))).toContain('del arrendamiento o subarrendamiento de');
    expect(boxesOf(page)).toEqual({ '01': 1, '02': 6000, '03': 1140, '04': 0, '05': 1140 });
  });
});

describe('Fillable forms with the box number above the field (030, 840)', () => {
  it('pairs a field with the number just above it when its line has none', () => {
    const page = [
      text('Pago fraccionado', 40, 780),
      text('Actividades económicas', 40, 770),
      text('01', 100, 612),
      typed('2.500,00', 98, 600, 70),
      text('02', 200, 612),
      typed('300,00', 198, 600, 70),
      // A printed amount is never paired upwards; a field too far below is not either.
      text('03', 300, 612),
      text('9,00', 300, 600),
      text('04', 400, 640),
      typed('5,00', 400, 600),
    ];
    expect(boxesOf(page)).toEqual({ '01': 2500, '02': 300 });
    // The nearest number above wins; a field of unknown width reaches 80 points to its right.
    const stacked = [
      ...page.slice(0, 2),
      text('05', 100, 614),
      text('06', 160, 610),
      { text: '7,00', x: 98, y: 600, field: true },
    ];
    expect(boxesOf(stacked)).toEqual({ '06': 7 });
  });
});

describe('The modelo 131 (estimación objetiva)', () => {
  it('is told apart from the 130 and reads its boxes 01-15', () => {
    const page = [
      text('Impuesto sobre la Renta de las Personas Físicas', 40, 790),
      text('Pago fraccionado', 40, 780),
      text('Actividades económicas en estimación objetiva', 40, 770),
      ...header('2026', '1T'),
      ...row('01', '1.200,00', 500),
      ...row('15', '24,00', 480),
      ...row('16', '1,00', 460),
    ];
    expect(parse(page)).toMatchObject({
      ok: true,
      data: { model: '131', year: 2026, quarter: 1, boxes: { '01': 1200, '15': 24 } },
    });
  });
});

describe('The Renta (modelo 100)', () => {
  const title = [
    text('Modelo 100', 40, 800),
    text('Declaración del Impuesto sobre la Renta de las Personas Físicas', 40, 790),
    text('Ejercicio 2025', 400, 790),
  ];

  it('reads the PDF of Renta WEB, with the box to the right of its amount', () => {
    const page = [
      ...title,
      text('Retribuciones dinerarias', 40, 600),
      text('30.774,34', 400, 600),
      text('0003', 450, 600),
      text('Cotizaciones a la Seguridad Social', 40, 580),
      text('1.951,10', 400, 580),
      text('0013', 450, 580),
      // Two pairs on one line, and a refund.
      text('100,00', 100, 560),
      text('0024', 150, 560),
      text('-1.117,09', 400, 560),
      text('0610', 450, 560),
      // A box repeated for a second property keeps the first amount.
      text('50,00', 400, 540),
      text('0003', 450, 540),
    ];
    expect(parse(page)).toEqual({
      ok: true,
      data: {
        model: '100',
        year: 2025,
        quarter: null,
        boxes: { '0003': 30774.34, '0013': 1951.1, '0024': 100, '0610': -1117.09 },
      },
    });
  });

  it('reads the boxes of the facsimile too, with the number to the left', () => {
    const page = [
      ...title,
      text('[0435]', 300, 600),
      text('66.661,66', 340, 600),
      text('0436', 300, 580),
      text('2.000,00', 340, 580),
      text('0437', 420, 580),
    ];
    expect(boxesOf(page)).toEqual({ '0435': 66661.66, '0436': 2000 });
  });

  it('knows a draft without its number, and is blank without amounts', () => {
    const draft = [
      text('Impuesto sobre la Renta de las Personas Físicas', 40, 790),
      text('Borrador', 40, 780),
      text('1,00', 400, 600),
      text('0003', 450, 600),
    ];
    expect(boxesOf(draft)).toEqual({ '0003': 1 });
    expect(parse(title)).toEqual({ ok: false, reason: 'noBoxes' });
  });
});

describe('The forms the previews print (190, 347, 349, 390…)', () => {
  it('knows a summary by the number printed big in its header', () => {
    const page = [
      text('190', 474, 668, 17.6),
      text('Ejercicio', 368, 587),
      text('Ejercicio', 356, 570),
      typed('2025', 474, 568, 33),
      text('01', 460, 426),
      typed('2', 470, 424),
    ];
    const read = parse(page);
    if (!read.ok) throw new Error(read.reason);
    // The first «Ejercicio» is the title of its section: the year is by the second one.
    expect(read.data).toMatchObject({
      model: '190',
      year: 2025,
      quarter: null,
      boxes: { '01': 2 },
    });
  });

  it('takes the figure typed in a box, not the rate the form prints by it', () => {
    const page = [
      text('390', 466, 610, 18),
      text('41', 238, 574),
      text('1,75', 369, 574),
      typed('137.037,27', 247, 572, 107),
    ];
    const read = parse(page);
    if (!read.ok) throw new Error(read.reason);
    expect(read.data.boxes['41']).toBe(137037.27);
  });

  it('reads the operators of a 349 with the country in its own cell and corrections in two lines', () => {
    const page = [
      text('Declaración recapitulativa de operaciones intracomunitarias', 240, 700),
      typed('FR', 90, 628, 20),
      typed('12345678901', 118, 628, 61),
      typed('CLIENT PARIS', 187, 628, 235),
      typed('E', 430, 628, 7),
      typed('1.500,00', 445, 628, 61),
      // A correction: the operator, the labels of the next line, then its period and bases.
      typed('DE', 90, 575, 20),
      typed('123456789', 118, 575, 61),
      typed('KUNDE', 187, 575, 235),
      typed('S', 498, 575, 7),
      text('Ejercicio', 88, 567),
      text('Base imponible rectificada', 152, 567),
      typed('2025', 88, 556, 32),
      typed('2T', 129, 556, 15),
      typed('800,00', 152, 556, 172),
      typed('700,00', 332, 556, 172),
    ];
    const read = parse(page);
    if (!read.ok) throw new Error(read.reason);
    expect(read.data.operators).toEqual([
      { key: 'E', vatId: 'FR12345678901', name: 'CLIENT PARIS', base: 1500 },
      {
        key: 'S',
        vatId: 'DE123456789',
        name: 'KUNDE',
        base: 800,
        rectifies: { year: 2025, quarter: 2, previous: 700 },
      },
    ]);
  });
});
