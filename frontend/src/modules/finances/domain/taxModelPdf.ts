import { EU_PREFIXES, normalVatId } from './vatBook';
import { KEYS_349, type IntraOp, type Key349, type VatRate } from './types';
import { formKindOf, type ForalTerritory, type FormKind, type TaxModel } from './taxModelDetect';

export type { ForalTerritory, TaxModel } from './taxModelDetect';

/**
 * Reading the modelos 130, 303, 390, 349, 111, 115 and 100 from a PDF, without knowing which version
 * of the form it is.
 *
 * Every box of these forms is printed with its number, and its amount sits on the same line next to
 * it: to its right on the forms (the official fillable form, the PDF of the Tax Agency's page, the
 * templates and previews of the app), to its left on the PDF of Renta WEB («66.661,66 0435»). So the
 * reader does not look for «the line that says Ingresos computables» but pairs every amount with the
 * box number next to it on its line. Fillable forms that print the number above the field (030, 840)
 * are paired upwards when the line has none.
 */

/** A piece of the page: text or a form field, where it is (PDF points) and whether it is an amount. */
export interface PdfToken {
  text: string;
  x: number;
  y: number;
  /** Typed in a form field (a plain number is fine); printed text only counts when it looks like an amount. */
  field: boolean;
  /** Width and font size of printed text (or the size of a field), when the PDF gives them. */
  w?: number;
  h?: number;
}

export interface TaxModelPdf {
  model: TaxModel;
  year: number | null;
  /** 1 to 4; null when the period is not a quarter (monthly 303, 390, Renta) or could not be read. */
  quarter: 1 | 2 | 3 | 4 | null;
  /** Box number ("01", "07", "150", "0435"…) to its amount in euros. */
  boxes: Record<string, number>;
  /** Modelo 349: one line per operator and key (corrections with the period they correct). */
  operators?: IntraOp[];
}

export type TaxModelParse =
  | { ok: true; data: TaxModelPdf }
  /** Not a form the app knows; a blank form; a publication or manual that prints forms. */
  | { ok: false; reason: 'unknownModel' | 'noBoxes' | 'notAForm' }
  /** A form of a foral Treasury: its boxes do not mean what the State's do. */
  | { ok: false; reason: 'foral'; territory: ForalTerritory }
  /** Several periods in one PDF (the four quarters of a year): their figures would be mixed. */
  | { ok: false; reason: 'severalPeriods'; periods: string[] };

const boxRange = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i).padStart(2, '0'));

/** Boxes that exist on each form: a number outside them is a page number, a year or a percentage. */
const BOXES: Record<Exclude<TaxModel, '100'>, Set<string>> = {
  // Boxes 01-30 of the 111 and 01-05 of the 115, as the AEAT instructions and record layouts number
  // them (checked on 19 October 2026; see domain/withholdings.ts).
  '111': new Set(boxRange(1, 30)),
  '115': new Set(boxRange(1, 5)),
  '130': new Set(boxRange(1, 19)),
  // Orden HAP/258/2015 (BOE-A-2015-1656), page 8: boxes 01-15 of the 131.
  '131': new Set(boxRange(1, 15)),
  // Every box of the 2026 design of the 303 (Orden HAC/27/2026, anexo III, and DR303e26v101.xlsx,
  // the same list as the preview's layout), the prorrata of page 5 (500-524, 700-735) included. The
  // boxes the design no longer has (61, 67, 82, 85, 113-119, 121) are not read.
  '303': new Set([
    ...boxRange(1, 60),
    ...['62', '63', '64', '65', '66', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77'],
    ...['78', '79', '80', '81', '83', '84', '86', '87', '88', '89', '90', '91', '92', '93', '94'],
    ...['95', '96', '97', '98', '99', '107', '108', '109', '110', '111', '112'],
    ...['120', '122', '123', '124', '125', '126', '127', '128'],
    ...['150', '151', '152', '153', '154', '155', '156', '157', '158'],
    ...['165', '166', '167', '168', '169', '170'],
    ...boxRange(500, 524),
    ...boxRange(700, 735),
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
    // The payment on account of the 319 (Orden HAC/27/2026, anexo IV, page 6), new in 2026.
    '112',
  ]),
  // The 349 has no numbered boxes: its operators are read line by line (operators349).
  '349': new Set(),
  // Summaries and other forms the app previews (docs/fiscalidad/documentos-oficiales.md): the boxes
  // of their facsimiles. 180: summary 01-03 (Orden de 20-11-2000); 190: 01-03 (Orden EHA/3127/2009);
  // 347: 01-04 (Orden HAP/1732/2014); 123: 01-14 (Orden HAC/56/2024); 309: 01-27 (Orden HFP/1245/2022).
  '180': new Set(boxRange(1, 3)),
  '190': new Set(boxRange(1, 3)),
  '347': new Set(boxRange(1, 4)),
  '123': new Set(boxRange(1, 14)),
  '309': new Set(boxRange(1, 27)),
};

/** Same line: the number of a box and its amount differ by a couple of points at most. */
const SAME_LINE = 6;
/** A fillable form that prints the number above the field: the field is just under it. */
const ABOVE = 16;

const AMOUNT = /^-?\d{1,3}(\.\d{3})*,\d{2}$|^-?\d+,\d{2}$|^-?\d+\.\d{2}$|^-?\d+$/;
const PRINTED_AMOUNT = /^-?\d{1,3}(\.\d{3})*,\d{2}$|^-?\d+,\d{2}$/;
/**
 * Printed amounts without cents: the Tax Agency's examples print a whole «-6.000» or «0». A box
 * number never has a dot, a sign or is 0, so these cannot be taken for one.
 */
const PRINTED_WHOLE = /^-?\d{1,3}(\.\d{3})+$|^-\d+$|^0$/;

/** "1.234,56" / "1234,56" / "1234.56" / "5300" / "-6.000" as euros; NaN when it is not an amount. */
export function amountOf(text: string): number {
  const clean = text.trim().replace(/[€\s]/g, '');
  if (/^-?\d{1,3}(\.\d{3})+$/.test(clean)) return Number(clean.replace(/\./g, ''));
  if (!AMOUNT.test(clean)) return NaN;
  const normal = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  return Number(normal);
}

/**
 * The box a number names on each form: four digits on the Renta, one or two on the old 115 (2002,
 * «1»…«5»), two or three on the rest.
 */
function labelOf(text: string, model: TaxModel): string | null {
  const clean = text.trim();
  if (model === '100') return /^\[?(\d{4})\]?$/.exec(clean)?.[1] ?? null;
  const id = (model === '115' ? /^\[?(\d{1,2})\]?$/ : /^\[?(\d{2,3})\]?$/).exec(clean)?.[1];
  return id === undefined ? null : id.padStart(2, '0');
}

const isBox = (model: TaxModel, id: string): boolean => model === '100' || BOXES[model].has(id);

// ─── The period ──────────────────────────────────────────────────────────────

type Quarter = 1 | 2 | 3 | 4;

interface Period {
  year: number | null;
  quarter: Quarter | null;
  /** The tokens that hold the year and the period: they are not amounts of a box. */
  used: PdfToken[];
}

const sameLine = (a: PdfToken, b: PdfToken) => Math.abs(a.y - b.y) <= SAME_LINE;

/** The tokens to the right of a label on its line, from the nearest. */
const rightOf = (tokens: PdfToken[], label: PdfToken) =>
  tokens
    .filter((o) => o !== label && sameLine(o, label) && o.x > label.x)
    .sort((a, b) => a.x - b.x);

/** The tokens just under a label (a fillable form with the label above its field), nearest first. */
const under = (tokens: PdfToken[], label: PdfToken) =>
  tokens
    .filter(
      (o) => o.y < label.y && label.y - o.y <= 25 && o.x >= label.x - 20 && o.x <= label.x + 80
    )
    .sort((a, b) => b.y - a.y);

/**
 * The year next to «Ejercicio»: in one piece, in the same piece («Ejercicio 2025»), or cut in pieces
 * that follow each other («202» «5», or digit by digit as the official 390 prints «2 0 2 5»).
 */
function yearOf(tokens: PdfToken[]): { year: number; used: PdfToken[] } | null {
  const inline = tokens.find((t) => /^ejercicio:? ?20\d{2}$/i.test(t.text.trim()));
  if (inline) return { year: Number(inline.text.trim().slice(-4)), used: [inline] };
  // The summaries print «Ejercicio» twice: as the title of the section and by its cell.
  for (const label of tokens.filter((t) => /^ejercicio$/i.test(t.text.trim()))) {
    const found = yearBy(tokens, label);
    if (found) return found;
  }
  return null;
}

/** The year next to one «Ejercicio» label, or under it. */
function yearBy(tokens: PdfToken[], label: PdfToken): { year: number; used: PdfToken[] } | null {
  const right = rightOf(tokens, label);
  const whole = right.find((t) => /^20\d{2}$/.test(t.text.trim()));
  if (whole) return { year: Number(whole.text.trim()), used: [whole] };
  const pieces: PdfToken[] = [];
  const digitsOf = () => pieces.map((p) => p.text.trim()).join('');
  for (const t of right) {
    if (!/^\d{1,3}$/.test(t.text.trim())) break;
    pieces.push(t);
    if (digitsOf().length >= 4) break;
  }
  const digits = digitsOf();
  if (/^20\d{2}$/.test(digits)) return { year: Number(digits), used: pieces };
  const below = under(tokens, label).find((t) => /^20\d{2}$/.test(t.text.trim()));
  return below ? { year: Number(below.text.trim()), used: [below] } : null;
}

const QUARTER = /^([1-4])T?$/i;

/** The quarter next to «Período» («3T» or «3»), or under it on a fillable form. */
function quarterOf(tokens: PdfToken[]): { quarter: Quarter; used: PdfToken } | null {
  const inline = tokens.find((t) => /^per[ií]odo:? ?[1-4]T$/i.test(t.text.trim()));
  if (inline) return { quarter: Number(inline.text.trim().slice(-2, -1)) as Quarter, used: inline };
  const label = tokens.find((t) => /^per[ií]odo$/i.test(t.text.trim()));
  if (!label) return null;
  const found =
    rightOf(tokens, label).find((t) => QUARTER.test(t.text.trim())) ??
    under(tokens, label).find((t) => QUARTER.test(t.text.trim()));
  return found ? { quarter: Number(found.text.trim()[0]) as Quarter, used: found } : null;
}

function periodOf(tokens: PdfToken[]): Period {
  const year = yearOf(tokens);
  const quarter = quarterOf(tokens);
  return {
    year: year?.year ?? null,
    quarter: quarter?.quarter ?? null,
    used: [...(year?.used ?? []), ...(quarter ? [quarter.used] : [])],
  };
}

/**
 * The periods the pages print, when they are more than one: a PDF with the four quarters of a year
 * would otherwise give the boxes of the first one mixed with those of the rest.
 */
function periodsOf(pages: PdfToken[][]): string[] {
  const read = pages.map((p) => periodOf(joinPieces(p)));
  const quarters = new Set(
    read.filter((p) => p.quarter !== null).map((p) => `${p.year ?? ''} ${p.quarter}T`.trim())
  );
  if (quarters.size > 1) return [...quarters];
  const years = new Set(read.filter((p) => p.year !== null).map((p) => String(p.year)));
  return years.size > 1 ? [...years] : [];
}

// ─── Pieces of text ──────────────────────────────────────────────────────────

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

/** The page a stacked token is on. */
const pageOf = (t: PdfToken) => Math.floor((1000 - t.y) / 10000);

// ─── Pairing amounts with boxes ──────────────────────────────────────────────

type Side = 'left' | 'right';

/**
 * Which side of its amount the box number is printed on: on each line with both, whether the line
 * starts with a number of box (the forms) or ends with one (Renta WEB). The forms win a tie.
 */
function sideOf(labels: PdfToken[], values: PdfToken[]): Side {
  let left = 0;
  let right = 0;
  for (const value of values) {
    const line = [...labels, ...values].filter((t) => sameLine(t, value)).sort((a, b) => a.x - b.x);
    if (line[0] !== value && labels.includes(line[0])) left++;
    if (line[line.length - 1] !== value && labels.includes(line[line.length - 1])) right++;
  }
  return right > left ? 'right' : 'left';
}

/** The number of the box an amount belongs to: next to it on its line, or above a field. */
function labelFor(value: PdfToken, labels: PdfToken[], side: Side): PdfToken | undefined {
  const line = labels.filter((l) => sameLine(l, value));
  const beside =
    side === 'left'
      ? line.filter((l) => l.x < value.x).sort((a, b) => b.x - a.x)[0]
      : line.filter((l) => l.x > value.x).sort((a, b) => a.x - b.x)[0];
  if (beside || !value.field) return beside;
  return labels
    .filter(
      (l) =>
        l.y > value.y &&
        l.y - value.y <= ABOVE &&
        l.x >= value.x - 4 &&
        l.x <= value.x + (value.w ?? 80)
    )
    .sort((a, b) => a.y - b.y)[0];
}

/** Every amount paired with the box number next to it; the tokens of the period are not amounts. */
function boxesFrom(tokens: PdfToken[], model: TaxModel, used: PdfToken[]): Record<string, number> {
  // Box numbers are printed (or label fields of the official form): what is typed in is a value.
  const labels = tokens.filter((t) => {
    const id = t.field ? null : labelOf(t.text, model);
    return id !== null && isBox(model, id);
  });
  const values = tokens.filter((t) => {
    if (used.includes(t) || labels.includes(t)) return false;
    return t.field ? !Number.isNaN(amountOf(t.text)) : PRINTED_AMOUNT.test(t.text.trim());
  });
  // Whole amounts printed («-6.000», «0») count only right after their box number: a row of them is a
  // table of figures (the quarters of a 390), not the boxes of the form. And a page with no amount in
  // cents is the statement of a case or a table, not a filled form.
  const filled = new Set(values.map(pageOf));
  const wholes = tokens.filter(
    (t) =>
      !t.field && !used.includes(t) && filled.has(pageOf(t)) && PRINTED_WHOLE.test(t.text.trim())
  );
  const side = model === '100' ? sideOf(labels, values) : 'left';

  const boxes: Record<string, number> = {};
  // The first amount a box gets stays (the Renta repeats a box for each property: the first one).
  const put = (label: PdfToken, value: PdfToken) => {
    const id = labelOf(label.text, model) as string;
    if (!(id in boxes)) boxes[id] = amountOf(value.text);
  };
  // What is typed in a field goes first: the form prints rates next to some boxes («1,75» by the 41
  // of the 390), and those are not the amount of the box.
  for (const value of [...values].sort((a, b) => Number(b.field) - Number(a.field))) {
    const label = labelFor(value, labels, side);
    if (label) put(label, value);
  }
  const all = [...labels, ...values, ...wholes];
  for (const whole of wholes) {
    const label = labelFor(whole, labels, 'left');
    if (!label) continue;
    const between = (t: PdfToken) => sameLine(t, whole) && t.x > label.x && t.x < whole.x;
    if (!all.some(between)) put(label, whole);
  }
  return boxes;
}

/** Why a PDF that is not a State form the app reads is refused. */
function refusal(kind: Exclude<FormKind, { kind: 'model' }>): TaxModelParse {
  if (kind.kind === 'foral') return { ok: false, reason: 'foral', territory: kind.territory };
  return { ok: false, reason: kind.kind === 'notAForm' ? 'notAForm' : 'unknownModel' };
}

/** Which form a PDF is, its period and its boxes with their amounts. */
export function parseTaxModelTokens(pages: PdfToken[][]): TaxModelParse {
  const tokens = stack(pages);
  const kind = formKindOf(tokens, pages.length);
  if (kind.kind !== 'model') return refusal(kind);
  const { model } = kind;
  const periods = periodsOf(pages);
  if (periods.length > 1) return { ok: false, reason: 'severalPeriods', periods };
  const { used, ...period } = periodOf(tokens);

  if (model === '349') {
    const operators = operators349(tokens);
    if (operators.length === 0) return { ok: false, reason: 'noBoxes' };
    return { ok: true, data: { model, ...period, boxes: {}, operators } };
  }
  const boxes = boxesFrom(tokens, model, used);
  if (Object.keys(boxes).length === 0) return { ok: false, reason: 'noBoxes' };
  return { ok: true, data: { model, ...period, boxes } };
}

const KEY_TOKEN = /^[A-Z]$/;
const VAT_ID = /^[A-Z]{2}[0-9A-Z]{2,15}$/;
const PERIOD = /^([1-4])T$/;

const vatIdOf = (cells: string[]) =>
  cells.find((c) => {
    const clean = normalVatId(c);
    return VAT_ID.test(clean) && EU_PREFIXES.includes(clean.slice(0, 2));
  });
const amountsOf = (cells: string[]) =>
  cells.filter((c) => PRINTED_AMOUNT.test(c) || /^\d+\.\d{2}$/.test(c));

/**
 * The official form asks for the country («FR») and the VAT number without it in two cells: they are
 * read as one VAT number.
 */
function withCountry(cells: string[]): string[] {
  const out: string[] = [];
  for (const c of cells) {
    const prev = out[out.length - 1];
    const joined = prev && EU_PREFIXES.includes(prev) ? normalVatId(prev + c) : '';
    if (joined && VAT_ID.test(joined) && !vatIdOf([prev]) && !EU_PREFIXES.includes(c)) {
      out[out.length - 1] = joined;
    } else out.push(c);
  }
  return out;
}

/** A record of two lines: the second line has amounts and no operator of its own. */
const RECORD_GAP = 25;

/**
 * The lines of a 349: each has the VAT number of the operator, its key and the base; a correction also
 * the year and the quarter it corrects and, after the new base, the one declared before. The words
 * left on the line are the name of the operator. The official form writes a correction in two lines
 * (the operator, then the period and the bases): they are read as one.
 */
function operators349(tokens: PdfToken[]): IntraOp[] {
  const lines: PdfToken[][] = [];
  for (const t of [...tokens].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l[0].y - t.y) <= SAME_LINE);
    if (line) line.push(t);
    else lines.push([t]);
  }
  const texts = lines.map((l) =>
    withCountry(l.sort((a, b) => a.x - b.x).map((t) => t.text.trim()))
  );
  const out: IntraOp[] = [];
  texts.forEach((own, i) => {
    // The second line of a record: the next one below with amounts and no operator (the labels of
    // the form may sit between them).
    const j = texts.findIndex(
      (other, k) =>
        k > i &&
        lines[i][0].y - lines[k][0].y <= RECORD_GAP &&
        !vatIdOf(other) &&
        amountsOf(other).length > 0
    );
    const cells = amountsOf(own).length === 0 && j > 0 ? [...own, ...texts[j]] : own;
    const id = vatIdOf(cells);
    const key = cells.find((c) => KEY_TOKEN.test(c) && (KEYS_349 as readonly string[]).includes(c));
    const amounts = amountsOf(cells);
    if (!id || !key || amounts.length === 0) return;
    const year = cells.find((c) => /^20\d{2}$/.test(c));
    const period = cells.map((c) => PERIOD.exec(c)).find((m) => m !== null);
    // The country of the operator in its own cell is the prefix of its VAT number, not its name.
    const country = normalVatId(id).slice(0, 2);
    const name = cells
      .filter(
        (c) =>
          c !== id &&
          c !== key &&
          c !== country &&
          !amounts.includes(c) &&
          c !== year &&
          !PERIOD.test(c)
      )
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
  });
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
  // 153, 165 and 16: the temporary rates of 2023-2024 (5 %, 2 %, 7.5 %) and the surcharges that go
  // with them (16-18 also took the 0.5 % one up to 3T 2024): the quarter does not model them.
  const ignored = ['44', '62', '74', '153', '165', '16'].filter((id) => b(id) !== 0);
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
