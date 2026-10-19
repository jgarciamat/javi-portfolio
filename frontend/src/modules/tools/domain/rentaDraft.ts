import type { Disability } from './rentaCalc';
import type { Deduction } from './rentaData';
import type { RentaForm } from './rentaForm';
import { isRelevant, normalize, type DraftSituation } from './rentaRelevance';

export { isRelevant, normalize, type DraftSituation };

/** A deduction the draft applies: its line as printed, what it gives and its box. */
export interface AppliedDeduction {
  label: string;
  amount: number;
  /** The box of the return (the regional ones: 0801 to 2246; empty when not read). */
  box?: string;
  /** What was spent, by deduction of the catalogue, when the draft details it (the Agency's file). */
  bases?: Record<string, number>;
  /** The deduction of the catalogue, when the box says which one it is (the State ones). */
  id?: string;
}

/**
 * The State deductions of the quota the draft applies, by their boxes (modelo 100 of 2025, Orden
 * HAC/277/2026, BOE-A-2026-7041, page 22; the same boxes in 2023 and 2024 by the Agency's data
 * dictionaries): the State part and the regional part of each one, added up.
 */
const STATE_BOXES: { boxes: string[]; id: string; label: string }[] = [
  {
    boxes: ['0547', '0548'],
    id: 'estado-vivienda-habitual-transitorio',
    label: 'Deducción por inversión en vivienda habitual',
  },
  {
    boxes: ['0549'],
    id: 'estado-empresas-nueva-creacion',
    label: 'Deducción por inversión en empresas de nueva o reciente creación',
  },
  {
    boxes: ['0552', '0553'],
    id: 'estado-donativos-ley-49-2002',
    label: 'Por donativos y otras aportaciones',
  },
  {
    boxes: ['0562', '0563'],
    id: 'estado-alquiler-transitorio',
    label: 'Por alquiler de la vivienda habitual (régimen transitorio)',
  },
];

/** The State deductions the draft applies, from its boxes. */
export function stateApplied(boxes: Record<string, number>): AppliedDeduction[] {
  return STATE_BOXES.flatMap(({ boxes: ids, id, label }) => {
    // Half and half (LIRPF arts. 67.1.b and 77.1.b): a text with only the State part has both.
    const regional = ids.length > 1 ? boxes[ids[1]] ?? boxes[ids[0]] ?? 0 : 0;
    const amount = Math.round(((boxes[ids[0]] ?? 0) + regional) * 100) / 100;
    return amount > 0 ? [{ label, amount, box: ids[0], id }] : [];
  });
}

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
  applied: AppliedDeduction[];
  /** The tax year the draft is for ("Ejercicio 2025"). */
  exercise: number | null;
  /** The person's own degree of disability (box 0011); null when the draft does not say. */
  disability: Disability | null;
  /** Properties at the owner's disposal: their cadastral value, how it was valued and the days (null: not read, the whole year). */
  unrented: { value: number; revised: boolean; days: number | null }[];
  /** The amount of each box, the first time it appears (only amounts: no names or ids). */
  boxes: Record<string, number>;
}

/** What the planner keeps about the draft: what was read, and what the person answered. */
export interface DraftState {
  reading: DraftReading | null;
  rents: boolean;
  dismissed: string[];
  /** The draft as it was read, kept while the person tries next year's return with the same data. */
  scenario: { form: RentaForm; reading: DraftReading } | null;
  /** Just read: the deductions it applies are still to be marked, once its community is loaded. */
  pending?: boolean;
}

export const NO_DRAFT: DraftState = { reading: null, rents: false, dismissed: [], scenario: null };

/** Amounts in a draft always carry the cents (`1.234,56`), which tells them apart from box numbers. */
const AMOUNT = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/;

/** `1.234,56` → 1234.56 */
export function parseAmount(text: string): number {
  return Number(text.replace(/\./g, '').replace(',', '.'));
}

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

/** An amount and the box after it: `18.379,04   0003`, or `-1.117,09   0610` for a refund. */
const BOX_AMOUNT = /(?<![\d.,])(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{4})(?!\d)/g;

/** Every amount of each box, in the order of the lines (the same box repeats for each property). */
export function boxAmounts(lines: string[]): Record<string, number[]> {
  const boxes: Record<string, number[]> = {};
  for (const line of lines) {
    for (const m of line.matchAll(BOX_AMOUNT)) (boxes[m[2]] ??= []).push(parseAmount(m[1]));
  }
  return boxes;
}

/** The person's degree of disability, from the words of box 0011 (the first declarant comes first). */
export function disabilityIn(text: string): Disability | null {
  const at = text.indexOf('grado de discapacidad');
  if (at < 0) return null;
  const rest = text.slice(at + 'grado de discapacidad'.length, at + 140);
  // Up to the box number: what follows belongs to the next line.
  const end = rest.search(/\b\d{4}\b/);
  const words = end < 0 ? rest : rest.slice(0, end);
  if (/superior al 65/.test(words)) return 65;
  if (/superior al 33/.test(words)) return 33;
  return 0;
}

/** Imputed income of 1.1 % of the cadastral value means a revised value; 2 %, one that was not. */
const REVISED_RATE = 0.015;

/** The days each property was at the owner's disposal (box 0085): a whole number, without cents. */
const DAYS = /(?<![\d.,/])(\d{1,3})\s+0085(?!\d)/g;

/** Properties at the owner's disposal: box 0083 (value) with 0089 (imputed income) and 0085 (days). */
function unrentedIn(boxes: Record<string, number[]>, lines: string[]): DraftReading['unrented'] {
  const values = boxes['0083'] ?? [];
  const imputed = boxes['0089'] ?? [];
  const days = lines.flatMap((line) => [...line.matchAll(DAYS)].map((m) => Number(m[1])));
  return values
    .map((value, i) => ({ value, imputed: imputed[i], days: days[i] }))
    .filter((p) => p.imputed !== undefined && p.value > 0)
    .map((p) => ({
      value: p.value,
      revised: p.imputed / p.value < REVISED_RATE,
      days: p.days ?? null,
    }));
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
export function appliedDeductions(rawText: string): AppliedDeduction[] {
  const flat = rawText.replace(/\s+/g, ' ');
  const lower = fold(flat);
  const from = lower.indexOf('deducciones autonomicas de');
  if (from < 0) return [];
  const end = lower.indexOf('suma de deducciones autonomicas', from);
  if (end < 0) return [];
  const lines: AppliedDeduction[] = [];
  const line = /(Por [^0-9]{12,}?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{4})/g;
  for (const m of flat.slice(from, end).matchAll(line)) {
    lines.push({ label: m[1].trim(), amount: parseAmount(m[2]), box: m[3] });
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

/** The first amount of each box. */
const firstOf = (amounts: Record<string, number[]>): Record<string, number> =>
  Object.fromEntries(Object.entries(amounts).map(([box, list]) => [box, list[0]]));

/** Reads the text of a draft. `communities` are matched by name against the text. */
export function readDraft(
  rawText: string,
  options: {
    year: number;
    communities: { id: string; name: string }[];
    /** The printed lines of the PDF; without them, the lines of the text. */
    lines?: string[];
  }
): DraftReading {
  const text = normalize(rawText);
  const boxes = boxesOf(text);
  const lines = options.lines ?? rawText.split('\n');
  const amounts = boxAmounts(lines);
  const exercise = /ejercicio (\d{4})/.exec(text);
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
    applied: [...stateApplied(firstOf(amounts)), ...appliedDeductions(rawText)],
    exercise: exercise ? Number(exercise[1]) : null,
    disability: disabilityIn(text),
    unrented: unrentedIn(amounts, lines),
    boxes: firstOf(amounts),
  };
}

/** The deductions to ask about: relevant ones that the draft does not seem to include. */
export function missingDeductions(
  deductions: Deduction[],
  mentioned: string[],
  s: DraftSituation
): Deduction[] {
  return deductions.filter((d) => !mentioned.includes(d.id) && isRelevant(d, s));
}
