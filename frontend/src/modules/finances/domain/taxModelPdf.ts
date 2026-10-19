import type { VatRate } from './types';

/**
 * Reading the modelos 130, 303, 111 and 115 from a PDF, without knowing which version of the form it is.
 *
 * Every box of these forms is printed with its number, and its amount sits on the same line to the
 * right of it. That holds for the official fillable form (the number and the field are both widgets),
 * for the PDF that the Tax Agency's own page produces (everything is text) and for the templates of
 * the app. So the reader does not look for «the line that says Ingresos computables» but pairs every
 * amount with the box number that is nearest to its left on the same line.
 */

export type TaxModel = '130' | '303' | '111' | '115';

/** A piece of the page: text or a form field, where it is (PDF points) and whether it is an amount. */
export interface PdfToken {
  text: string;
  x: number;
  y: number;
  /** Typed in a form field (a plain number is fine); printed text only counts when it looks like an amount. */
  field: boolean;
}

export interface TaxModelPdf {
  model: TaxModel;
  year: number | null;
  /** 1 to 4; null when the period is not a quarter (monthly 303) or could not be read. */
  quarter: 1 | 2 | 3 | 4 | null;
  /** Box number ("01", "07", "150"…) to its amount in euros. */
  boxes: Record<string, number>;
}

export type TaxModelParse =
  | { ok: true; data: TaxModelPdf }
  | { ok: false; reason: 'unknownModel' | 'noBoxes' };

const boxRange = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i).padStart(2, '0'));

/** Boxes that exist on each form: a number outside them is a page number, a year or a percentage. */
const BOXES: Record<TaxModel, Set<string>> = {
  // Boxes 01-30 of the 111 and 01-05 of the 115, as the AEAT instructions and record layouts number
  // them (checked on 19 October 2026; see domain/withholdings.ts).
  '111': new Set(boxRange(1, 30)),
  '115': new Set(boxRange(1, 5)),
  '130': new Set(Array.from({ length: 19 }, (_, i) => String(i + 1).padStart(2, '0'))),
  '303': new Set([
    ...Array.from({ length: 46 }, (_, i) => String(i + 1).padStart(2, '0')),
    ...[
      '58',
      '59',
      '60',
      '61',
      '62',
      '63',
      '64',
      '65',
      '66',
      '67',
      '68',
      '69',
      '70',
      '71',
      '74',
      '75',
    ],
    ...[
      '76',
      '77',
      '78',
      '79',
      '80',
      '81',
      '82',
      '83',
      '84',
      '85',
      '86',
      '87',
      '108',
      '109',
      '110',
    ],
    ...[
      '111',
      '112',
      '113',
      '114',
      '115',
      '116',
      '117',
      '118',
      '119',
      '120',
      '121',
      '122',
      '123',
      '124',
    ],
    ...[
      '150',
      '151',
      '152',
      '153',
      '154',
      '155',
      '156',
      '157',
      '158',
      '165',
      '166',
      '167',
      '168',
      '169',
      '170',
    ],
  ]),
};

/** Same line: the number of a box and its amount differ by a couple of points at most. */
const SAME_LINE = 6;

const AMOUNT = /^-?\d{1,3}(\.\d{3})*,\d{2}$|^-?\d+,\d{2}$|^-?\d+\.\d{2}$|^-?\d+$/;
const PRINTED_AMOUNT = /^-?\d{1,3}(\.\d{3})*,\d{2}$|^-?\d+,\d{2}$/;

/** "1.234,56" / "1234,56" / "1234.56" / "5300" as euros; NaN when it is not an amount. */
export function amountOf(text: string): number {
  const clean = text.trim().replace(/[€\s]/g, '');
  if (!AMOUNT.test(clean)) return NaN;
  const normal = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  return Number(normal);
}

const labelOf = (text: string): string | null => /^\[?(\d{2,3})\]?$/.exec(text.trim())?.[1] ?? null;

/** Which form is it: the title and the words only that form has. */
function modelOf(tokens: PdfToken[]): TaxModel | null {
  const text = tokens
    .map((t) => t.text)
    .join(' ')
    .toLowerCase();
  // The withholding forms first: their titles say «retenciones e ingresos a cuenta», as the box 06
  // of the 130 does, so the 130 is told apart by what only the 111 and the 115 have.
  if (/retenciones e ingresos a cuenta/.test(text)) {
    if (/arrendamiento o subarrendamiento de inmuebles urbanos/.test(text)) return '115';
    if (/rendimientos del trabajo/.test(text) && !/pago fraccionado/.test(text)) return '111';
  }
  if (/impuesto sobre el valor a[ñn]adido/.test(text) && /autoliquidaci[oó]n/.test(text))
    return '303';
  if (
    /pago fraccionado/.test(text) &&
    /(estimaci[oó]n directa|actividades econ[oó]micas)/.test(text)
  ) {
    return '130';
  }
  return null;
}

/** The year and the quarter printed next to «Ejercicio» and «Período». */
function periodOf(tokens: PdfToken[]): Pick<TaxModelPdf, 'year' | 'quarter'> {
  const after = (word: RegExp, accepts: RegExp): string | null => {
    const label = tokens.find((t) => word.test(t.text.trim()));
    if (!label) return null;
    const same = tokens
      .filter((o) => o !== label && Math.abs(o.y - label.y) <= SAME_LINE && o.x > label.x)
      .sort((a, b) => a.x - b.x);
    return same.map((o) => o.text.trim()).find((text) => accepts.test(text)) ?? null;
  };
  const year = after(/^ejercicio$/i, /^20\d{2}$/);
  const period = after(/^per[ií]odo$/i, /^[1-4]T?$/i);
  return {
    year: year ? Number(year) : null,
    quarter: period ? (Number(period[0]) as 1 | 2 | 3 | 4) : null,
  };
}

/** The tokens of all the pages as one list, the pages stacked so a line never mixes two pages. */
const stack = (pages: PdfToken[][]): PdfToken[] =>
  pages.flatMap((tokens, page) => tokens.map((t) => ({ ...t, y: t.y - page * 10000 })));

/** Boxes with their amounts: every amount is paired with the closest box number to its left on its line. */
export function parseTaxModelTokens(pages: PdfToken[][]): TaxModelParse {
  const tokens = stack(pages);
  const model = modelOf(tokens);
  if (!model) return { ok: false, reason: 'unknownModel' };

  const known = BOXES[model];
  const labels = tokens.filter((t) => {
    const id = labelOf(t.text);
    return id !== null && known.has(id);
  });
  const values = tokens.filter((t) => {
    const printed = PRINTED_AMOUNT.test(t.text.trim());
    return t.field ? !Number.isNaN(amountOf(t.text)) : printed;
  });

  const boxes: Record<string, number> = {};
  for (const value of values) {
    const label = labels
      .filter((l) => l !== value && Math.abs(l.y - value.y) <= SAME_LINE && l.x < value.x)
      .sort((a, b) => b.x - a.x)[0];
    if (!label) continue;
    const id = labelOf(label.text) as string;
    // The first amount a box gets stays: the closer to the box, the likelier it is the right one.
    if (!(id in boxes)) boxes[id] = amountOf(value.text);
  }
  if (Object.keys(boxes).length === 0) return { ok: false, reason: 'noBoxes' };
  return { ok: true, data: { model, ...periodOf(tokens), boxes } };
}

// ─── What each form gives the self-employed draft ────────────────────────────

export interface Prior130 {
  income: number;
  expenses: number;
  /** Everything paid in the quarters up to this one: its box 05 plus its own payment (07), less box 16. */
  payments: number;
  withheld: number;
}

const box = (boxes: Record<string, number>, id: string): number => boxes[id] ?? 0;

/**
 * The totals a filed modelo 130 hands over to the next quarter: the income, expenses and withholdings
 * it accumulated, and the payments made so far (box 05 counts those before it, 07 is its own).
 */
export function priorFrom130(boxes: Record<string, number>): Prior130 {
  return {
    income: box(boxes, '01'),
    expenses: box(boxes, '02'),
    payments:
      Math.round((box(boxes, '05') + Math.max(0, box(boxes, '07')) - box(boxes, '16')) * 100) / 100,
    withheld: box(boxes, '06'),
  };
}

export interface Quarter303 {
  income: { r21: number; r10: number; r4: number; r0: number };
  /**
   * Expenses with VAT included (base and VAT of box 28/29), at the VAT rate that fits their ratio.
   * `exact` is false when the ratio fits no rate: several rates were mixed and the rate is a guess.
   */
  expense: { amount: number; vatRate: VatRate; exact: boolean } | null;
  /** What the form has and the draft cannot take: it is reported, not imported. */
  ignored: string[];
}

const RATES: VatRate[] = [0, 4, 10, 21];

/** The VAT rate that base and VAT amount point to, or null when they are a mix that none fits. */
export function rateOfRatio(base: number, vat: number): VatRate | null {
  if (base <= 0) return null;
  const rate = (vat / base) * 100;
  return RATES.find((r) => Math.abs(r - rate) < 0.05) ?? null;
}

function expenseOf(base: number, vat: number): NonNullable<Quarter303['expense']> {
  const exact = rateOfRatio(base, vat);
  const rate = (vat / base) * 100;
  const nearest = RATES.reduce((a, b) => (Math.abs(b - rate) < Math.abs(a - rate) ? b : a));
  return {
    amount: Math.round((base + vat) * 100) / 100,
    vatRate: exact ?? nearest,
    exact: exact !== null,
  };
}

/** What a filed modelo 303 says about its quarter: the income by rate and the expenses of the current operations. */
export function quarterFrom303(boxes: Record<string, number>): Quarter303 {
  const base = box(boxes, '28');
  const vat = box(boxes, '29');
  const ignored: string[] = [];
  // Reverse charge, imports and investment goods are VAT matters the quarterly draft does not model.
  for (const id of ['10', '12', '30', '32', '34', '36', '38', '40']) {
    if (box(boxes, id) !== 0) ignored.push(id);
  }
  return {
    income: {
      r21: box(boxes, '07'),
      r10: box(boxes, '04'),
      r4: box(boxes, '01'),
      r0: Math.round((box(boxes, '59') + box(boxes, '60')) * 100) / 100,
    },
    expense: base > 0 ? expenseOf(base, vat) : null,
    ignored,
  };
}

/** What a filed modelo 111 says about the payees of its quarter. */
export interface Quarter111 {
  staff: {
    people: number;
    paid: number;
    withheld: number;
    kindPeople: number;
    kindPaid: number;
    kindWithheld: number;
  };
  pros: { people: number; paid: number; withheld: number };
  /** Boxes the draft does not model (activities in kind, prizes, forestry gains, image rights). */
  ignored: string[];
}

/** The employees (01-06) and professionals (07-09) of a filed modelo 111. */
export function quarterFrom111(boxes: Record<string, number>): Quarter111 {
  const b = (id: string) => box(boxes, id);
  return {
    staff: {
      people: b('01'),
      paid: b('02'),
      withheld: b('03'),
      kindPeople: b('04'),
      kindPaid: b('05'),
      kindWithheld: b('06'),
    },
    pros: { people: b('07'), paid: b('08'), withheld: b('09') },
    ignored: boxRange(10, 27).filter((id) => b(id) !== 0),
  };
}

/** The landlords, the base and the withholdings (01-03) of a filed modelo 115. */
export const quarterFrom115 = (boxes: Record<string, number>) => ({
  people: box(boxes, '01'),
  paid: box(boxes, '02'),
  withheld: box(boxes, '03'),
});
