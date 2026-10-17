import type { Deduction } from './rentaData';

/** What could be read from the text of a tax return draft (borrador). Everything is a suggestion to confirm. */
export interface DraftReading {
  ccaaId: string | null;
  gross: number | null;
  socialSecurity: number | null;
  withheld: number | null;
  pension: number | null;
  rentalIncome: number | null;
  savings: number | null;
  /** Ages on 31 December of the year of the descendants and of the relatives in the draft. */
  childAges: number[];
  /** Ages of the ascendants on 31 December. */
  ascendantAges: number[];
  /** The person's own age on 31 December, from their date of birth. */
  age: number | null;
  /** The draft lists a property that was the main home. */
  ownsHome: boolean;
  /** The deductions the draft already applies, as it names them, with what each one gives. */
  applied: { label: string; amount: number }[];
}

export interface DraftSituation {
  childAges: number[];
  ascendants: number;
  /** Any disability in the family. */
  disability: boolean;
  /** The person rents the home they live in. */
  rents: boolean;
}

/** Amounts in a draft always carry the cents (`1.234,56`), which tells them apart from box numbers. */
const AMOUNT = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/;

/** `1.234,56` → 1234.56 */
export function parseAmount(text: string): number {
  return Number(text.replace(/\./g, '').replace(',', '.'));
}

export const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

/**
 * The values of the boxes of the official PDF: each one is printed as `label  value  box` ("Retribuciones
 * dinerarias  30.774,34  0003"), so a value followed by a four-digit number belongs to that box.
 */
export function boxesOf(text: string): Record<string, string[]> {
  const boxes: Record<string, string[]> = {};
  const pair = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d{2}\/\d{2}\/\d{4})\s+(\d{4})(?!\d)/g;
  for (const m of text.matchAll(pair)) (boxes[m[2]] ??= []).push(m[1]);
  return boxes;
}

const amountIn = (boxes: Record<string, string[]>, ...ids: string[]): number | null => {
  for (const id of ids) {
    const value = boxes[id]?.[0];
    if (value !== undefined && !value.includes('/')) return parseAmount(value);
  }
  return null;
};

/** The first amount that follows a label, within a short distance (for what has no known box). */
function amountAfter(text: string, label: RegExp): number | null {
  const found = label.exec(text);
  if (!found) return null;
  const rest = text.slice(found.index + found[0].length, found.index + found[0].length + 90);
  const amount = AMOUNT.exec(rest);
  return amount ? parseAmount(amount[1]) : null;
}

const ageIn = (date: string, year: number) => year - Number(date.slice(-4));

/** Lower case and without accents, one character for each character of the original (so indexes match). */
const fold = (text: string) =>
  Array.from(text)
    .map((c) => c.normalize('NFD')[0])
    .join('')
    .toLowerCase();

/** The deductions that the draft applies: the lines between the "Deducciones" heading and the totals. */
export function appliedDeductions(rawText: string): { label: string; amount: number }[] {
  const flat = rawText.replace(/\s+/g, ' ');
  const lower = fold(flat);
  const from = lower.indexOf('deducciones autonomicas de');
  if (from < 0) return [];
  const end = lower.indexOf('suma de deducciones autonomicas', from);
  if (end < 0) return [];
  const lines: { label: string; amount: number }[] = [];
  const line = /(Por [^0-9]{12,}?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+\d{4}/g;
  for (const m of flat.slice(from, end).matchAll(line)) {
    lines.push({ label: m[1].trim(), amount: parseAmount(m[2]) });
  }
  return lines;
}

const STOP = new Set(['para', 'por', 'con', 'los', 'las', 'del', 'por', 'una', 'que', 'sus']);

/** Words of a title that identify it, without accents or filler words. */
const keywords = (title: string) =>
  normalize(title)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 4 && !STOP.has(w));

/** A deduction is already in the draft when most of the words of its title appear in a line the draft applies. */
export function mentionedIn(applied: { label: string }[], deductions: Deduction[]): string[] {
  const lines = applied.map((a) => normalize(a.label));
  return deductions
    .filter((d) => {
      const words = keywords(d.title);
      return (
        words.length >= 2 &&
        lines.some((line) => words.filter((w) => line.includes(w)).length / words.length >= 0.8)
      );
    })
    .map((d) => d.id);
}

/** Reads the text of a draft. `communities` are matched by name against the text. */
export function readDraft(
  rawText: string,
  options: { year: number; communities: { id: string; name: string }[] }
): DraftReading {
  const text = normalize(rawText);
  const boxes = boxesOf(text);
  const dates = (id: string) => boxes[id] ?? [];
  const named = options.communities.find((c) => text.includes(normalize(c.name)));
  const own = dates('0010')[0];
  return {
    ccaaId: named?.id ?? null,
    gross: amountIn(boxes, '0012', '0003'),
    socialSecurity: amountIn(boxes, '0013'),
    withheld: amountIn(boxes, '0609', '0596'),
    pension: amountAfter(text, /reduccion por aportaciones[^0-9]{0,80}/),
    rentalIncome: amountAfter(text, /(?<!total )ingresos integros computables/),
    savings: amountIn(boxes, '0460'),
    childAges: dates('0077').map((d) => ageIn(d, options.year)),
    ascendantAges: dates('0092').map((d) => ageIn(d, options.year)),
    age: own ? ageIn(own, options.year) : null,
    ownsHome: text.includes('vivienda habitual en'),
    applied: appliedDeductions(rawText),
  };
}

const CHILD = /hij|nacimiento|adopci|guarder|maternidad|descend|menor/;

/** What makes a deduction relevant, by words of its id or title: the first rule that matches decides. */
const RULES: [RegExp, (s: DraftSituation) => boolean][] = [
  [/numerosa|monoparental/, (s) => s.childAges.length >= 2 || s.childAges.length > 0],
  [/maternidad|guarder/, (s) => s.childAges.some((a) => a < 3)],
  [/nacimiento|adopci/, (s) => s.childAges.some((a) => a < 2)],
  [CHILD, (s) => s.childAges.length > 0],
  [/ascend|mayor de 65|mayores/, (s) => s.ascendants > 0],
  [/discapacid/, (s) => s.disability],
  [/alquiler|arrendamiento/, (s) => s.rents],
];

/** Groups worth asking about whatever the situation. */
const ALWAYS: Deduction['group'][] = ['housing', 'health', 'education', 'donations'];

/** Whether a deduction is worth asking about, given the person's situation. */
export function isRelevant(d: Deduction, s: DraftSituation): boolean {
  const text = normalize(`${d.id} ${d.title}`);
  const rule = RULES.find(([words]) => words.test(text));
  return rule ? rule[1](s) : ALWAYS.includes(d.group);
}

/** The deductions to ask about: relevant ones that the draft does not seem to include. */
export function missingDeductions(
  deductions: Deduction[],
  mentioned: string[],
  s: DraftSituation
): Deduction[] {
  return deductions.filter((d) => !mentioned.includes(d.id) && isRelevant(d, s));
}
