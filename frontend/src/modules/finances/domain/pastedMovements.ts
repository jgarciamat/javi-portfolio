import type { ImportRowDTO } from './types';
import { type ParsedRows, parseAmount } from './importParsers';

/**
 * Movements copied from a bank's app or web (or read from a screenshot of them): one per line
 * («12/10/2026 Mercadona -45,30 €») or in blocks, the way the apps list them (a day, then the
 * concept and the amount of each movement on their own lines). Spanish and English dates and
 * amounts: «12 oct», «12 de octubre de 2026», «Oct 12», «hoy», «-12,50 €», «+1.800,00», «€45.30».
 */

const MONTHS: Record<string, number> = {
  ene: 1,
  enero: 1,
  jan: 1,
  january: 1,
  feb: 2,
  febrero: 2,
  february: 2,
  mar: 3,
  marzo: 3,
  march: 3,
  abr: 4,
  abril: 4,
  apr: 4,
  april: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  junio: 6,
  june: 6,
  jul: 7,
  julio: 7,
  july: 7,
  ago: 8,
  agosto: 8,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  septiembre: 9,
  setiembre: 9,
  september: 9,
  oct: 10,
  octubre: 10,
  october: 10,
  nov: 11,
  noviembre: 11,
  november: 11,
  dic: 12,
  diciembre: 12,
  dec: 12,
  december: 12,
};
const MONTH = `(${Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|')})\\.?`;

/** Weekdays, «de» and punctuation: what is left of a line that only says which day it is. */
const DAY_WORDS =
  /^(?:\s|[,.\-–·|]|de|lunes|martes|miercoles|jueves|viernes|sabado|domingo|lun|mar|mie|jue|vie|sab|dom|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)*$/;

/** Lines about the account, not a movement. */
const NOT_A_MOVEMENT =
  /^(saldo|balance|disponible|available|total|retenido|pendiente de|movimientos|transactions|fecha|date)\b/;

/** Words that make an amount without a sign an income. */
const INCOME_WORDS =
  /\b(nomina|ingreso|abono|transferencia recibida|recibida|recibido|devolucion|reembolso|salary|payroll|refund|received|income)\b/;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Without accents and in lower case, the same length as the text (positions stay valid). */
const fold = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().padEnd(s.length).slice(0, s.length);

const iso = (y: number, m: number, d: number): string | null => {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
};

/** A day without a year is the last one that is not after today. */
function withYear(
  month: number,
  day: number,
  year: string | undefined,
  today: string
): string | null {
  if (year) return iso(year.length === 2 ? 2000 + Number(year) : Number(year), month, day);
  const thisYear = Number(today.slice(0, 4));
  const date = iso(thisYear, month, day);
  return date && date > today ? iso(thisYear - 1, month, day) : date;
}

const shift = (today: string, days: number): string =>
  new Date(Date.parse(`${today}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);

interface DateRule {
  re: RegExp;
  read: (m: RegExpExecArray, today: string) => string | null;
}

const DATE_RULES: DateRule[] = [
  { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, read: (m) => iso(+m[1], +m[2], +m[3]) },
  {
    // 12/10/2026, 12-10-26, 12.10.2026 and, with a slash, 12/10.
    re: /(?<![\d.,])(\d{1,2})(?:([/.-])(\d{1,2})\2(\d{4}|\d{2})|\/(\d{1,2}))(?![\d,]|\.\d)/g,
    read: (m, today) => withYear(+(m[3] ?? m[5]), +m[1], m[4], today),
  },
  {
    re: new RegExp(
      `\\b(\\d{1,2})(?:\\s+de)?\\s*[\\s-]${MONTH}(?:[\\s-]+(?:de\\s+)?(\\d{4}))?\\b`,
      'g'
    ),
    read: (m, today) => withYear(MONTHS[m[2]], +m[1], m[3], today),
  },
  {
    re: new RegExp(
      `\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?![.,]\\d)(?:,?\\s+(\\d{4})\\b)?`,
      'g'
    ),
    read: (m, today) => withYear(MONTHS[m[1]], +m[2], m[3], today),
  },
  { re: /\b(hoy|today)\b/g, read: (_m, today) => today },
  { re: /\b(ayer|yesterday)\b/g, read: (_m, today) => shift(today, 1) },
];

/** Hours («14:32») and masked card numbers («**** 5402») are never part of the concept. */
const NOISE = /\b\d{1,2}:\d{2}(?::\d{2})?\b|[*•·x]{2,}\s?\d{4}\b/gi;

/** An amount: sign, currency before or after, thousands and two decimals (or a currency). */
const AMOUNT =
  /(?<![\w.,])([+\-−–]\s?)?([€$£]|eur|usd|gbp)?\s?(\d[\d.,\u00a0\u202f]*\d|\d)(\s?(?:euros?|eur|usd|gbp)\b|\s?[€$£])?(-(?!\d))?(?![\w%]|[.,]\d)/gi;

interface FoundAmount {
  value: number;
  signed: boolean;
}

interface LineParts {
  date: string | null;
  amounts: FoundAmount[];
  /** What is left: the concept (may be empty). */
  text: string;
}

function blank(line: string, from: number, to: number): string {
  return line.slice(0, from) + ' '.repeat(to - from) + line.slice(to);
}

function takeDate(line: string, today: string): { date: string | null; line: string } {
  let date: string | null = null;
  let rest = line;
  for (const rule of DATE_RULES) {
    for (const m of fold(rest).matchAll(rule.re)) {
      const found = rule.read(m, today);
      if (!found) continue;
      date ??= found;
      rest = blank(rest, m.index, m.index + m[0].length);
    }
  }
  return { date, line: rest };
}

function takeAmounts(line: string): { amounts: FoundAmount[]; line: string } {
  const amounts: FoundAmount[] = [];
  let rest = line;
  for (const m of line.matchAll(AMOUNT)) {
    const currency = !!(m[2] || m[4]);
    if (!currency && !/[.,]\d{2}$/.test(m[3])) continue;
    const value = parseAmount(m[3].replace(/[\u00a0\u202f]/g, '.'));
    if (!value) continue;
    // «45,30-»: some banks put the minus after the amount.
    const sign = (m[1] ?? m[5] ?? '').trim();
    amounts.push({ value: sign && sign !== '+' ? -value : value, signed: sign !== '' });
    rest = blank(rest, m.index, m.index + m[0].length);
  }
  return { amounts, line: rest };
}

const cleanText = (text: string): string =>
  text
    .replace(/[\t|;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.\-–·:]+|[\s,\-–·:]+$/g, '')
    .trim();

/** «… Saldo 1.204,10 €» at the end of a line is the balance, not part of the movement. */
const BALANCE_TAIL = /\b(saldo|balance)\b.*$/;

function splitLine(raw: string, today: string): LineParts {
  const balanceAt = fold(raw).search(BALANCE_TAIL);
  const movement = balanceAt > 0 ? raw.slice(0, balanceAt) : raw;
  const withoutNoise = movement.replace(NOISE, (s) => ' '.repeat(s.length));
  const dated = takeDate(withoutNoise, today);
  const priced = takeAmounts(dated.line);
  const text = cleanText(priced.line);
  return {
    date: dated.date,
    amounts: priced.amounts,
    text: DAY_WORDS.test(fold(text)) ? '' : text,
  };
}

interface Draft {
  date: string;
  description: string;
  amount: FoundAmount;
}

/** The movement amount of a line: the first signed one (a balance often follows it), else the first. */
const movementAmount = (amounts: FoundAmount[]): FoundAmount =>
  amounts.find((a) => a.signed) ?? amounts[0];

/**
 * The concept waiting for its amount after a line without one. A day starts a new block (with the
 * concept on the same line, if any); otherwise the first line counts: the one under it, «Pago con
 * tarjeta», is not the concept.
 */
const waitingConcept = (parts: LineParts, concept: string | null): string | null =>
  parts.date ? parts.text || null : (concept ?? (parts.text || null));

interface ReadState {
  drafts: Draft[];
  skipped: number[];
  /** The day of the block being read (the apps put it above its movements). */
  day: string | null;
  concept: string | null;
  /**
   * Some apps write the day under each movement («Glovo -18,40 €», then «24/10/2026»): a movement
   * read before any day waits for the line under it, and from then on every one does.
   */
  dayBelow: boolean;
  waiting: { description: string; amount: FoundAmount; line: number } | null;
}

/** A line without an amount: a day (maybe the one of the movement above) or a concept. */
function readOtherLine(st: ReadState, parts: LineParts): void {
  if (parts.date && !parts.text && st.waiting) {
    const { description, amount } = st.waiting;
    st.drafts.push({ date: parts.date, description, amount });
    st.waiting = null;
    st.dayBelow = true;
    st.concept = null;
    return;
  }
  st.day = parts.date ?? st.day;
  st.concept = waitingConcept(parts, st.concept);
}

function readMovementLine(st: ReadState, parts: LineParts, line: number): void {
  const description = parts.text || st.concept;
  const amount = movementAmount(parts.amounts);
  st.concept = null;
  st.day = parts.date ?? st.day;
  const date = parts.date ?? (st.dayBelow ? null : st.day);
  if (!description) st.skipped.push(line);
  else if (date) st.drafts.push({ date, description, amount });
  else {
    if (st.waiting) st.skipped.push(st.waiting.line);
    st.waiting = { description, amount, line };
  }
}

const MONTH_START = new RegExp(`^\\s*${MONTH}(?=\\s|$)`);

/** «25» on one line and «OCT» under it (a day column like a calendar's): the day is put together. */
function joinSplitDays(lines: string[]): string[] {
  const out = [...lines];
  for (let i = 0; i + 1 < out.length; i++) {
    const day = /^\s*(\d{1,2})(?=\s)/.exec(out[i]);
    const month = MONTH_START.exec(fold(out[i + 1]));
    if (!day || !month) continue;
    out[i] = `${day[1]} ${month[1]}${out[i].slice(day[0].length)}`;
    out[i + 1] = out[i + 1].slice(month[0].length);
  }
  return out;
}

interface ReadLine {
  parts: LineParts;
  /** 1-based, in the text. */
  line: number;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.005;

/** Whether `balances` follow from `amounts`, newest movement first or oldest first. */
function isRunningBalance(amounts: number[], balances: number[]): boolean {
  const pairs = balances.slice(1).map((next, k) => ({ prev: balances[k], next, k }));
  return (
    pairs.every(({ prev, next, k }) => near(prev, next + amounts[k])) ||
    pairs.every(({ prev, next, k }) => near(next, prev + amounts[k + 1]))
  );
}

/**
 * Apps that print the balance under each amount: when every line with an amount is followed by one
 * whose only amount has no sign and the balances add up with the movements, those lines are the
 * balances. Their text is the end of the concept above («CARREFOUR» / «EXPRESS»).
 */
function withoutBalances(lines: ReadLine[]): ReadLine[] {
  const priced = lines.filter((l) => l.parts.amounts.length > 0);
  const pairs = Array.from({ length: Math.floor(priced.length / 2) }, (_, k) => ({
    movement: priced[2 * k],
    balance: priced[2 * k + 1],
  }));
  const fits =
    pairs.length >= 2 &&
    priced.length % 2 === 0 &&
    pairs.every(
      ({ movement, balance }) =>
        lines.indexOf(balance) === lines.indexOf(movement) + 1 &&
        !balance.parts.date &&
        balance.parts.amounts.length === 1 &&
        !balance.parts.amounts[0].signed
    ) &&
    isRunningBalance(
      pairs.map((p) => movementAmount(p.movement.parts.amounts).value),
      pairs.map((p) => p.balance.parts.amounts[0].value)
    );
  if (!fits) return lines;
  const balances = new Set(pairs.map((p) => p.balance));
  return lines.flatMap((l, i) => {
    if (balances.has(l)) return [];
    const below = lines[i + 1];
    if (!below || !balances.has(below) || !below.parts.text) return [l];
    return [{ ...l, parts: { ...l.parts, text: `${l.parts.text} ${below.parts.text}`.trim() } }];
  });
}

function readDrafts(text: string, today: string): { drafts: Draft[]; skipped: number[] } {
  const st: ReadState = {
    drafts: [],
    skipped: [],
    day: null,
    concept: null,
    dayBelow: false,
    waiting: null,
  };
  const lines = joinSplitDays(text.normalize('NFC').split(/\r?\n/)).flatMap((raw, index) =>
    !raw.trim() || NOT_A_MOVEMENT.test(fold(raw.trim()))
      ? []
      : [{ parts: splitLine(raw, today), line: index + 1 }]
  );
  for (const { parts, line } of withoutBalances(lines)) {
    if (parts.amounts.length === 0) readOtherLine(st, parts);
    else readMovementLine(st, parts, line);
  }
  if (st.waiting) st.skipped.push(st.waiting.line);
  return { drafts: st.drafts, skipped: st.skipped.sort((x, y) => x - y) };
}

/** A line read from an image, with its box in pixels. */
export interface OcrLine {
  text: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * The text of a screenshot as rows, the way they look: the OCR often reads the concepts and the
 * amounts as two columns, so the pieces that sit side by side are put back on one line (an amount
 * goes with the piece it overlaps most, if it overlaps it by a third of its height).
 */
export function textFromOcrLines(lines: OcrLine[]): string {
  const rows: OcrLine[][] = [];
  const overlap = (a: OcrLine, b: OcrLine): number =>
    (Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)) / Math.min(a.y1 - a.y0, b.y1 - b.y0);
  const sideBySide = (row: OcrLine[], line: OcrLine): boolean =>
    row.every((piece) => line.x0 >= piece.x1 || line.x1 <= piece.x0);
  for (const line of [...lines].filter((l) => l.text.trim()).sort((a, b) => a.y0 - b.y0)) {
    let best: OcrLine[] | null = null;
    let bestOverlap = 1 / 3;
    for (const row of rows) {
      const shared = overlap(row[0], line);
      if (shared >= bestOverlap && sideBySide(row, line)) {
        best = row;
        bestOverlap = shared;
      }
    }
    if (best) best.push(line);
    else rows.push([line]);
  }
  return rows
    .map((row) =>
      [...row]
        .sort((a, b) => a.x0 - b.x0)
        .map((piece) => piece.text.trim())
        .join('  ')
    )
    .join('\n');
}

/**
 * Reads pasted movements. An amount with a minus is an expense; one with a plus, an income. When
 * some amounts carry a sign, those without one are incomes (the bank only marks the charges, or
 * only the incomes with a plus); when none does, they are expenses unless the concept says
 * otherwise («Nómina», «Devolución»…), and the type is flagged for review.
 */
export function parsePastedMovements(text: string, today: string): ParsedRows {
  const { drafts, skipped } = readDrafts(text, today);
  const anySigned = drafts.some((d) => d.amount.signed);
  const anyMinus = drafts.some((d) => d.amount.value < 0);
  const rows: ImportRowDTO[] = [];
  const review: number[] = [];
  for (const d of drafts) {
    const abs = Math.abs(d.amount.value);
    let income: boolean;
    if (d.amount.signed) income = d.amount.value > 0;
    else if (anyMinus) income = true;
    else income = INCOME_WORDS.test(fold(d.description));
    if (!anySigned) review.push(rows.length);
    rows.push({
      date: d.date,
      description: d.description.slice(0, 200),
      amount: income ? abs : -abs,
      type: income ? 'INCOME' : 'EXPENSE',
      category: null,
    });
  }
  return { rows, skipped, review };
}
