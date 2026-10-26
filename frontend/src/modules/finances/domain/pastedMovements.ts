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

function splitLine(raw: string, today: string): LineParts {
  const withoutNoise = raw.replace(NOISE, (s) => ' '.repeat(s.length));
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

function readDrafts(text: string, today: string): { drafts: Draft[]; skipped: number[] } {
  const drafts: Draft[] = [];
  const skipped: number[] = [];
  let day: string | null = null;
  let concept: string | null = null;
  const lines = text.normalize('NFC').split(/\r?\n/);
  lines.forEach((raw, index) => {
    if (!raw.trim() || NOT_A_MOVEMENT.test(fold(raw.trim()))) return;
    const parts = splitLine(raw, today);
    day = parts.date ?? day;
    if (parts.amounts.length === 0) {
      concept = waitingConcept(parts, concept);
      return;
    }
    const description = parts.text || concept;
    concept = null;
    if (!description || !day) skipped.push(index + 1);
    else drafts.push({ date: day, description, amount: movementAmount(parts.amounts) });
  });
  return { drafts, skipped };
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
