import { EU_PREFIXES, normalVatId } from './vatBook';
import { KEYS_349, type IntraOp, type Key349, type VatRate } from './types';

/**
 * Reading the modelos 130, 303, 390, 349, 111 and 115 from a PDF, without knowing which version of the
 * form it is.
 *
 * Every box of these forms is printed with its number, and its amount sits on the same line to the
 * right of it. That holds for the official fillable form (the number and the field are both widgets),
 * for the PDF that the Tax Agency's own page produces (everything is text) and for the templates of
 * the app. So the reader does not look for «the line that says Ingresos computables» but pairs every
 * amount with the box number that is nearest to its left on the same line.
 */

export type TaxModel = '130' | '303' | '390' | '349' | '111' | '115';

/** A piece of the page: text or a form field, where it is (PDF points) and whether it is an amount. */
export interface PdfToken {
  text: string;
  x: number;
  y: number;
  /** Typed in a form field (a plain number is fine); printed text only counts when it looks like an amount. */
  field: boolean;
  /** Width and font size of printed text, when the PDF gives them (to join pieces of one word). */
  w?: number;
  h?: number;
}

export interface TaxModelPdf {
  model: TaxModel;
  year: number | null;
  /** 1 to 4; null when the period is not a quarter (monthly 303) or could not be read. */
  quarter: 1 | 2 | 3 | 4 | null;
  /** Box number ("01", "07", "150"…) to its amount in euros. */
  boxes: Record<string, number>;
  /** Modelo 349: one line per operator and key (corrections with the period they correct). */
  operators?: IntraOp[];
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
  // Boxes of the 2026 design of the 303 (DR303e26v101.xlsx, pages 1-4), with 72 «a compensar» and
  // 73 «a devolver» of the form, and the 153-155, 165-167 and 16-18 of the older rates.
  '303': new Set([
    ...boxRange(1, 60),
    ...['62', '63', '64', '65', '66', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77'],
    ...['78', '79', '80', '81', '83', '84', '86', '87', '88', '89', '90', '91', '92', '93', '94'],
    ...['95', '96', '97', '98', '99', '107', '108', '109', '110', '111', '112'],
    ...['120', '122', '123', '124', '125', '126', '127', '128'],
    ...['150', '151', '152', '153', '154', '155', '156', '157', '158'],
    ...['165', '166', '167', '168', '169', '170'],
  ]),
  // Every box of the 2025 design of the 390 (dr390e2025.xlsx), the latest published.
  '390': new Set([
    ...boxRange(1, 14),
    ...boxRange(21, 36),
    ...boxRange(41, 66),
    ...boxRange(74, 111),
    ...['113', '114', '115', '116', '117', '118', '125', '126', '127', '128'],
    ...boxRange(139, 191),
    ...['196', '197', '202', '203', '208', '209', '214', '215', '220', '221', '227', '228'],
    ...['230', '231', '232', '500', '501', '502', '503', '504', '505', '506', '507'],
    ...['512', '513', '514', '515', '520', '521', '522', '523', '524', '525', '526'],
    ...['545', '546', '547', '548', '551', '552', '587', '588', '597', '598'],
    ...boxRange(599, 698),
    ...boxRange(700, 741),
    ...boxRange(745, 776),
  ]),
  // The 349 has no numbered boxes: its operators are read line by line (operators349).
  '349': new Set(),
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

/** The VAT forms by the words of their title, the annual summary first. */
const VAT_TITLES: [RegExp, TaxModel][] = [
  [/resumen anual/, '390'],
  [/autoliquidaci[oó]n/, '303'],
];

/** Which form is it: the title and the words only that form has. */
function modelOf(tokens: PdfToken[]): TaxModel | null {
  const text = tokens
    .map((t) => t.text)
    .join(' ')
    .toLowerCase()
    // The 303 asks whether one is exempt from the 390: that mention is not its title.
    .replace(/exonerad[oa] de la declaraci[oó]n-? ?resumen anual/g, '');
  // The withholding forms first: their titles say «retenciones e ingresos a cuenta», as the box 06
  // of the 130 does, so the 130 is told apart by what only the 111 and the 115 have.
  if (/retenciones e ingresos a cuenta/.test(text)) {
    if (/arrendamiento o subarrendamiento de inmuebles urbanos/.test(text)) return '115';
    if (/rendimientos del trabajo/.test(text) && !/pago fraccionado/.test(text)) return '111';
  }
  // The 349 and the 390 before the 303: their titles mention the VAT too.
  if (/recapitulativa de operaciones intracomunitarias/.test(text)) return '349';
  const vat = /impuesto sobre el valor a[ñn]adido/.test(text);
  const vatModel = VAT_TITLES.find(([title]) => vat && title.test(text));
  if (vatModel) return vatModel[1];
  if (
    /pago fraccionado/.test(text) &&
    /(estimaci[oó]n directa|actividades econ[oó]micas)/.test(text)
  ) {
    return '130';
  }
  return null;
}

/**
 * The year printed digit by digit, in four boxes, to the right of its label, as the official 390
 * does («Ejercicio 2 0 2 5»).
 */
function digitsAfter(tokens: PdfToken[], word: RegExp): string | null {
  const label = tokens.find((t) => word.test(t.text.trim()));
  if (!label) return null;
  const digits = tokens
    .filter(
      (o) => Math.abs(o.y - label.y) <= SAME_LINE && o.x > label.x && /^\d$/.test(o.text.trim())
    )
    .sort((a, b) => a.x - b.x)
    .slice(0, 4)
    .map((o) => o.text.trim())
    .join('');
  return /^20\d{2}$/.test(digits) ? digits : null;
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
  const year = after(/^ejercicio$/i, /^20\d{2}$/) ?? digitsAfter(tokens, /^ejercicio$/i);
  const period = after(/^per[ií]odo$/i, /^[1-4]T?$/i);
  return {
    year: year ? Number(year) : null,
    quarter: period ? (Number(period[0]) as 1 | 2 | 3 | 4) : null,
  };
}

/** A piece of a number: digits, a dot or a comma (the official forms print «1 7 . 2 14,00»). */
const NUMBER_PIECE = /^-?[\d.,]+$/;

/**
 * The pieces of one number printed one after the other, touching, as one token: pdf.js gives the
 * official 390 and 303 their amounts and their year («202 5») in pieces.
 */
function joinPieces(tokens: PdfToken[]): PdfToken[] {
  const out: PdfToken[] = [];
  for (const t of [...tokens].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const prev = out[out.length - 1];
    if (prev && touches(prev, t)) {
      out[out.length - 1] = { ...prev, text: prev.text + t.text, w: t.x + (t.w ?? 0) - prev.x };
    } else {
      out.push(t);
    }
  }
  return out;
}

/** Two printed pieces of a number, one right after the other on the same line. */
function touches(prev: PdfToken, t: PdfToken): boolean {
  if (prev.field || t.field || prev.w === undefined) return false;
  if (Math.abs(prev.y - t.y) >= 1 || Math.abs(t.x - (prev.x + prev.w)) >= 0.6) return false;
  return NUMBER_PIECE.test(prev.text) && NUMBER_PIECE.test(t.text);
}

/** The tokens of all the pages as one list, the pages stacked so a line never mixes two pages. */
const stack = (pages: PdfToken[][]): PdfToken[] =>
  pages.flatMap((tokens, page) => joinPieces(tokens).map((t) => ({ ...t, y: t.y - page * 10000 })));

/** Boxes with their amounts: every amount is paired with the closest box number to its left on its line. */
export function parseTaxModelTokens(pages: PdfToken[][]): TaxModelParse {
  const tokens = stack(pages);
  const model = modelOf(tokens);
  if (!model) return { ok: false, reason: 'unknownModel' };

  const known = BOXES[model];
  if (model === '349') {
    const operators = operators349(tokens);
    if (operators.length === 0) return { ok: false, reason: 'noBoxes' };
    return { ok: true, data: { model, ...periodOf(tokens), boxes: {}, operators } };
  }
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

const KEY_TOKEN = /^[A-Z]$/;
const VAT_ID = /^[A-Z]{2}[0-9A-Z]{2,15}$/;
const PERIOD = /^([1-4])T$/;

/**
 * The lines of a 349: each has the VAT number of the operator, its key and the base; a correction also
 * the year and the quarter it corrects and, after the new base, the one declared before. The words
 * left on the line are the name of the operator.
 */
function operators349(tokens: PdfToken[]): IntraOp[] {
  const lines: PdfToken[][] = [];
  for (const t of [...tokens].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l[0].y - t.y) <= SAME_LINE);
    if (line) line.push(t);
    else lines.push([t]);
  }
  const out: IntraOp[] = [];
  for (const line of lines) {
    const cells = line.sort((a, b) => a.x - b.x).map((t) => t.text.trim());
    const id = cells.find((c) => {
      const clean = normalVatId(c);
      return VAT_ID.test(clean) && EU_PREFIXES.includes(clean.slice(0, 2));
    });
    const key = cells.find((c) => KEY_TOKEN.test(c) && (KEYS_349 as readonly string[]).includes(c));
    const amounts = cells.filter((c) => PRINTED_AMOUNT.test(c) || /^\d+\.\d{2}$/.test(c));
    if (!id || !key || amounts.length === 0) continue;
    const year = cells.find((c) => /^20\d{2}$/.test(c));
    const period = cells.map((c) => PERIOD.exec(c)).find((m) => m !== null);
    const name = cells
      .filter((c) => c !== id && c !== key && !amounts.includes(c) && c !== year && !PERIOD.test(c))
      .join(' ')
      .trim();
    out.push({
      key: key as Key349,
      vatId: normalVatId(id),
      name,
      base: amountOf(amounts[0]),
      ...(year && period && amounts.length > 1
        ? {
            rectifies: {
              year: Number(year),
              quarter: Number(period[1]) as 1 | 2 | 3 | 4,
              previous: amountOf(amounts[1]),
            },
          }
        : {}),
    });
  }
  return out;
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

/** An expense line that a filed 303 gives: VAT included, or its base when it has no Spanish VAT. */
export interface Line303 {
  amount: number;
  vatRate: VatRate;
  /** False when the ratio fits no rate: several rates were mixed and the rate is a guess. */
  exact: boolean;
  op: 'domestic' | 'reverse' | 'import' | 'intraGoods';
  investment: boolean;
}

export interface Quarter303 {
  income: { r21: number; r10: number; r4: number; r0: number };
  /** Expenses by channel: domestic, reverse charge, imports and intra-EU, current or investment goods. */
  expenses: Line303[];
  /** The rest of the VAT of the quarter, as the form of the quarter takes it. */
  vat: {
    sales: Record<string, number>;
    re: { r21: number; r10: number; r4: number; tobacco: number };
    salesFix: { base: number; vat: number };
    reFix: { base: number; fee: number };
    deductionFix: { base: number; vat: number };
    oneOff: { reagp: number; investmentAdjust: number; art80: number; importDeferred: number };
  };
  /** Its result (box 71), to reconcile the 390 with it; null when it does not show it. */
  result: number | null;
  /** What the form has and the draft cannot take: it is reported, not imported. */
  ignored: string[];
}

const RATES: VatRate[] = [0, 4, 10, 21];
const r2 = (n: number) => Math.round(n * 100) / 100;

/** The VAT rate that base and VAT amount point to, or null when they are a mix that none fits. */
export function rateOfRatio(base: number, vat: number): VatRate | null {
  if (base <= 0) return null;
  const rate = (vat / base) * 100;
  return RATES.find((r) => Math.abs(r - rate) < 0.05) ?? null;
}

function lineOf(base: number, vat: number, op: Line303['op'], investment: boolean): Line303 {
  const exact = rateOfRatio(base, vat);
  const rate = (vat / base) * 100;
  const nearest = RATES.reduce((a, b) => (Math.abs(b - rate) < Math.abs(a - rate) ? b : a));
  return {
    // Without Spanish VAT on the invoice the draft takes the base; otherwise VAT included.
    amount: op === 'domestic' ? r2(base + vat) : r2(base),
    vatRate: exact ?? nearest,
    exact: exact !== null,
    op,
    investment,
  };
}

/**
 * What a filed modelo 303 says about its quarter: the income by rate, the sales without Spanish VAT
 * in their boxes (59, 60, 120, 122-124), the surcharge, the corrections, the expenses by channel and
 * its result. Boxes of the 2026 design (autonomo-vat-data.ts in the backend).
 */
export function quarterFrom303(boxes: Record<string, number>): Quarter303 {
  const b = (id: string) => box(boxes, id);
  // The VAT of a reverse charge is deducted with the domestic purchases (28-29): it is taken apart.
  const reverse = { base: b('12'), vat: b('13') };
  const channels: [string, string, Line303['op'], boolean, number, number][] = [
    ['28', '29', 'domestic', false, reverse.base, reverse.vat],
    ['30', '31', 'domestic', true, 0, 0],
    ['32', '33', 'import', false, 0, 0],
    ['34', '35', 'import', true, 0, 0],
    ['36', '37', 'intraGoods', false, 0, 0],
    ['38', '39', 'intraGoods', true, 0, 0],
  ];
  const expenses: Line303[] = [];
  if (reverse.base > 0) expenses.push(lineOf(reverse.base, reverse.vat, 'reverse', false));
  for (const [base, vat, op, investment, lessBase, lessVat] of channels) {
    const amount = r2(b(base) - lessBase);
    if (amount > 0) expenses.push(lineOf(amount, r2(b(vat) - lessVat), op, investment));
  }
  const ignored = ['44', '62', '74'].filter((id) => b(id) !== 0);
  return {
    income: { r21: b('07'), r10: b('04'), r4: b('01'), r0: b('150') },
    expenses,
    vat: {
      sales: {
        intraEU: b('59'),
        exports: b('60'),
        notSubject: b('120'),
        reverse: b('122'),
        oss: b('123'),
        ossSubject: b('124'),
      },
      // The tobacco base (1.75 %) is part of the 21 % one, as the form of the quarter takes it.
      re: { r21: r2(b('22') + b('156')), r10: b('19'), r4: b('168'), tobacco: b('156') },
      salesFix: { base: b('14'), vat: b('15') },
      reFix: { base: b('25'), fee: b('26') },
      deductionFix: { base: b('40'), vat: b('41') },
      oneOff: {
        reagp: b('42'),
        investmentAdjust: b('43'),
        art80: b('76'),
        importDeferred: b('77'),
      },
    },
    result: '71' in boxes ? b('71') : null,
    ignored,
  };
}

/**
 * What the 390 of last year hands to this one: its definitive prorrata (box 118) is this year's
 * provisional one (art. 105.Uno LIVA), and the VAT still to offset is the one of the last quarter
 * (97) plus the one generated before it and not applied (662) [I390].
 */
export function carryFrom390(boxes: Record<string, number>): {
  prorrata: number | null;
  toOffset: number;
} {
  return {
    prorrata: '118' in boxes ? box(boxes, '118') : null,
    toOffset: r2(box(boxes, '97') + box(boxes, '662')),
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
