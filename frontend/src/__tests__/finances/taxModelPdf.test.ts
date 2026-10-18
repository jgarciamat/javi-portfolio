import {
  amountOf,
  parseTaxModelTokens,
  priorFrom130,
  quarterFrom303,
  rateOfRatio,
  type PdfToken,
} from '@modules/finances/domain/taxModelPdf';

const text = (t: string, x: number, y: number): PdfToken => ({ text: t, x, y, field: false });
const typed = (t: string, x: number, y: number): PdfToken => ({ text: t, x, y, field: true });

/**
 * The first page of the Tax Agency's own filled example of the modelo 303 (2024, first quarter): the
 * words and numbers as pdf.js reads them, with the places they have on the page.
 */
const OFFICIAL_303: PdfToken[] = [
  text('Impuesto sobre el Valor Añadido', 40, 760),
  text('Autoliquidación', 40, 748),
  text('Modelo', 480, 747),
  text('303', 506, 747),
  text('Ejercicio', 416, 710),
  text('2024', 462, 710),
  text('Período', 505, 710),
  text('1T', 538, 710),
  text('01', 297, 375),
  text('02', 397, 375),
  text('03', 461, 375),
  text('04', 297, 351),
  text('05', 397, 351),
  text('06', 461, 351),
  text('83.000,00', 334, 339),
  text('21,00', 419, 339),
  text('17.430,00', 501, 339),
  text('07', 297, 339),
  text('08', 397, 339),
  text('09', 461, 339),
  text('10', 296, 328),
  text('11', 461, 328),
  text('21.000,00', 334, 328),
  text('4.410,00', 505, 328),
  text('22', 297, 247),
  text('24.000,00', 334, 247),
  text('23', 397, 247),
  text('5,20', 423, 247),
  text('24', 461, 247),
  text('1.248,00', 505, 247),
  text('27', 460, 217),
  text('23.088,00', 501, 217),
  text('28', 361, 182),
  text('29', 461, 182),
  text('47.000,00', 404, 182),
  text('9.870,00', 505, 182),
  text('45', 460, 56),
  text('16.800,00', 501, 56),
  text('46', 460, 29),
  text('6.288,00', 505, 29),
  // Numbers that are not boxes: the telephone, a page number, a percentage.
  text('901', 208, 754),
  text('Página 1', 300, 20),
];

describe('Reading the boxes of the modelo 303 from the official PDF', () => {
  it('pairs every amount with the box number at its left, on its line', () => {
    const parsed = parseTaxModelTokens([OFFICIAL_303]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toMatchObject({ model: '303', year: 2024, quarter: 1 });
    expect(parsed.data.boxes).toEqual({
      '07': 83000,
      '08': 21,
      '09': 17430,
      '10': 21000,
      '11': 4410,
      '22': 24000,
      '23': 5.2,
      '24': 1248,
      '27': 23088,
      '28': 47000,
      '29': 9870,
      '45': 16800,
      '46': 6288,
    });
  });

  it('gives figures that add up the way the form says they do', () => {
    const parsed = parseTaxModelTokens([OFFICIAL_303]);
    if (!parsed.ok) throw new Error('no');
    const b = parsed.data.boxes;
    expect(b['09'] + b['11'] + b['24']).toBe(b['27']);
    expect(b['29'] + 2520 + b['11']).toBe(b['45']);
    expect(b['27'] - b['45']).toBe(b['46']);
  });

  it('hands the draft the income by rate and the expenses of current operations', () => {
    const parsed = parseTaxModelTokens([OFFICIAL_303]);
    if (!parsed.ok) throw new Error('no');
    expect(
      quarterFrom303({ ...parsed.data.boxes, '59': 5000, '60': 7000, '04': 1000, '01': 200 })
    ).toEqual({
      income: { r21: 83000, r10: 1000, r4: 200, r0: 12000 },
      // 47,000 + 9,870 = 56,870 with VAT, and 9,870 / 47,000 is exactly 21 %.
      expense: { amount: 56870, vatRate: 21, exact: true },
      ignored: ['10'],
    });
  });
});

/** The official fillable modelo 130: its labels are fields too, the amounts are `dato.N` fields to their right. */
const form130 = (values: Record<string, string>, period = ['2026', '2']): PdfToken[] => [
  text('Impuesto sobre la Renta de las Personas Físicas', 40, 780),
  text('Actividades económicas en estimación directa', 40, 768),
  text('Pago fraccionado', 40, 756),
  text('Ejercicio', 373, 733),
  typed(period[0], 423, 735),
  text('Período', 488, 733),
  typed(period[1], 538, 735),
  ...Object.entries({
    '01': 577,
    '02': 565,
    '03': 553,
    '04': 541,
    '05': 516,
    '06': 492,
    '07': 469,
    '16': 290,
  }).flatMap(([box, y]) => [
    text(box, 462, y),
    ...(values[box] ? [typed(values[box], 475, y + 2)] : []),
  ]),
];

describe('Reading the boxes of the modelo 130 from the official fillable form', () => {
  const filled = form130({
    '01': '11.300,00',
    '02': '2948,25',
    '03': '8351.75',
    '04': '1.670,35',
    '05': '86,60',
    '06': '1425',
    '07': '158,75',
  });

  it('reads the period and every box that has an amount typed in', () => {
    const parsed = parseTaxModelTokens([filled]);
    if (!parsed.ok) throw new Error('no');
    expect(parsed.data).toMatchObject({ model: '130', year: 2026, quarter: 2 });
    expect(parsed.data.boxes).toEqual({
      '01': 11300,
      '02': 2948.25,
      '03': 8351.75,
      '04': 1670.35,
      '05': 86.6,
      '06': 1425,
      '07': 158.75,
    });
  });

  it('passes the totals to the next quarter: income, expenses, payments so far and withholdings', () => {
    const parsed = parseTaxModelTokens([filled]);
    if (!parsed.ok) throw new Error('no');
    // Payments so far = box 05 (before this quarter) + box 07 (its own) = 86.60 + 158.75.
    expect(priorFrom130(parsed.data.boxes)).toEqual({
      income: 11300,
      expenses: 2948.25,
      payments: 245.35,
      withheld: 1425,
    });
  });

  it('does not count a negative 07, and takes away what box 16 deducted', () => {
    expect(priorFrom130({ '05': 100, '07': -40, '16': 10 })).toEqual({
      income: 0,
      expenses: 0,
      payments: 90,
      withheld: 0,
    });
  });

  it('accepts the period as 2T or as a bare 2, and a blank form has nothing to read', () => {
    const t = parseTaxModelTokens([form130({ '01': '10' }, ['2025', '3T'])]);
    expect(t.ok && t.data).toMatchObject({ year: 2025, quarter: 3 });
    expect(parseTaxModelTokens([form130({})])).toEqual({ ok: false, reason: 'noBoxes' });
  });
});

describe('What is not a modelo 130 or 303', () => {
  it('is refused, saying it does not know the form', () => {
    const renta = [
      text('Modelo 100', 10, 10),
      text('Impuesto sobre la Renta de las Personas Físicas', 10, 20),
      text('18.379,04', 100, 30),
    ];
    expect(parseTaxModelTokens([renta])).toEqual({ ok: false, reason: 'unknownModel' });
    expect(parseTaxModelTokens([])).toEqual({ ok: false, reason: 'unknownModel' });
  });

  it('leaves the period empty when the PDF does not print it', () => {
    const tokens = form130({ '01': '10' }).filter(
      (t) => !['Ejercicio', 'Período', '2026', '2'].includes(t.text)
    );
    const parsed = parseTaxModelTokens([tokens]);
    expect(parsed.ok && parsed.data).toMatchObject({ year: null, quarter: null });
  });

  it('leaves the period empty when its labels are printed but nothing is typed next to them', () => {
    const tokens = form130({ '01': '10' }).filter((t) => !['2026', '2'].includes(t.text));
    const parsed = parseTaxModelTokens([tokens]);
    expect(parsed.ok && parsed.data).toMatchObject({ year: null, quarter: null });
  });

  it('never mixes the amounts of two pages: each page has its own lines', () => {
    const page1 = [
      text('Pago fraccionado', 0, 700),
      text('actividades económicas', 100, 700),
      text('01', 100, 500),
      text('5,00', 150, 500),
    ];
    const page2 = [text('01', 100, 500), text('9,00', 150, 500)];
    const parsed = parseTaxModelTokens([page1, page2]);
    // Box 01 keeps the first amount it got (page 1); page 2's amount is not read into it either.
    expect(parsed.ok && parsed.data.boxes).toEqual({ '01': 5 });
  });
});

describe('amountOf', () => {
  it('reads amounts as the forms print them and as people type them', () => {
    expect(amountOf('1.234,56')).toBe(1234.56);
    expect(amountOf('1234,56 €')).toBe(1234.56);
    expect(amountOf('1234.56')).toBe(1234.56);
    expect(amountOf('-45,10')).toBe(-45.1);
    expect(amountOf('5300')).toBe(5300);
    expect(amountOf('')).toBeNaN();
    expect(amountOf('abc')).toBeNaN();
    expect(amountOf('12,5')).toBeNaN();
  });
});

describe('quarterFrom303 and rateOfRatio', () => {
  it('gives no expense when there are no current operations, and flags the other VAT boxes it cannot use', () => {
    expect(quarterFrom303({ '07': 100, '12': 50, '34': 10, '38': 1 })).toEqual({
      income: { r21: 100, r10: 0, r4: 0, r0: 0 },
      expense: null,
      ignored: ['12', '34', '38'],
    });
  });

  it('puts the VAT rate that base and VAT point to, and says when it was a mix of rates', () => {
    expect(rateOfRatio(1000, 210)).toBe(21);
    expect(rateOfRatio(1000, 100)).toBe(10);
    expect(rateOfRatio(1000, 40)).toBe(4);
    expect(rateOfRatio(1000, 0)).toBe(0);
    expect(rateOfRatio(1000, 150)).toBeNull();
    expect(rateOfRatio(0, 10)).toBeNull();
    expect(quarterFrom303({ '28': 725, '29': 146.2 }).expense).toEqual({
      amount: 871.2,
      vatRate: 21,
      exact: false,
    });
    expect(quarterFrom303({ '28': 100, '29': 11 }).expense).toEqual({
      amount: 111,
      vatRate: 10,
      exact: false,
    });
  });
});
