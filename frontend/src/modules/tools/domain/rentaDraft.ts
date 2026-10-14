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
  /** Ages on 31 December of the year, from the birth dates in the section of descendants. */
  childAges: number[];
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
export function parseAmount(text: string): number | null {
  const value = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

/** The first amount that follows a label, within a short distance. */
function amountAfter(text: string, label: RegExp): number | null {
  const found = label.exec(text);
  if (!found) return null;
  const rest = text.slice(found.index + found[0].length, found.index + found[0].length + 90);
  const amount = AMOUNT.exec(rest);
  return amount ? parseAmount(amount[1]) : null;
}

const FIELDS: { key: keyof DraftReading; label: RegExp }[] = [
  { key: 'gross', label: /retribuciones dinerarias/ },
  { key: 'socialSecurity', label: /cotizaciones a la seguridad social/ },
  { key: 'withheld', label: /(?:total )?retenciones(?: e ingresos a cuenta)?(?: del trabajo)?/ },
  { key: 'pension', label: /aportaciones (?:y contribuciones )?a planes de pensiones/ },
  { key: 'rentalIncome', label: /ingresos integros computables/ },
  { key: 'savings', label: /intereses de cuentas/ },
];

/** Ages on 31 December of `year` from every dd/mm/yyyy date found after "descendientes". */
export function childAgesOf(text: string, year: number): number[] {
  const start = text.indexOf('descendientes');
  if (start < 0) return [];
  const end = text.indexOf('ascendientes', start);
  const section = text.slice(start, end > start ? end : start + 1500);
  const ages: number[] = [];
  for (const m of section.matchAll(/\b\d{1,2}\/\d{1,2}\/(\d{4})\b/g)) {
    const age = year - Number(m[1]);
    if (age >= 0 && age < 40) ages.push(age);
  }
  return ages;
}

const STOP = new Set(['para', 'por', 'con', 'los', 'las', 'del', 'por', 'una', 'que', 'sus']);

/** Words of a title that identify it, without accents or filler words. */
const keywords = (title: string) =>
  normalize(title)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 4 && !STOP.has(w));

/** A deduction seems to be in the draft when most of the words of its title appear in the text. */
export function mentionedIn(text: string, deductions: Deduction[]): string[] {
  return deductions
    .filter((d) => {
      const words = keywords(d.title);
      return (
        words.length >= 2 && words.filter((w) => text.includes(w)).length / words.length >= 0.8
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
  const reading: DraftReading = {
    ccaaId: null,
    gross: null,
    socialSecurity: null,
    withheld: null,
    pension: null,
    rentalIncome: null,
    savings: null,
    childAges: childAgesOf(text, options.year),
  };
  for (const { key, label } of FIELDS) {
    (reading[key] as number | null) = amountAfter(text, label);
  }
  const named = options.communities.find((c) => text.includes(normalize(c.name)));
  reading.ccaaId = named?.id ?? null;
  return reading;
}

const CHILD = /hij|nacimiento|adopci|guarder|maternidad|descend|menor/;

/** Whether a deduction is worth asking about, given the person's situation. */
export function isRelevant(d: Deduction, s: DraftSituation): boolean {
  const text = normalize(`${d.id} ${d.title}`);
  if (/numerosa|monoparental/.test(text)) return s.childAges.length >= 2 || s.childAges.length > 0;
  if (/maternidad|guarder/.test(text)) return s.childAges.some((a) => a < 3);
  if (/nacimiento|adopci/.test(text)) return s.childAges.some((a) => a < 2);
  if (CHILD.test(text)) return s.childAges.length > 0;
  if (/ascend|mayor de 65|mayores/.test(text)) return s.ascendants > 0;
  if (/discapacid/.test(text)) return s.disability;
  if (/alquiler|arrendamiento/.test(text)) return s.rents;
  return (
    d.group === 'housing' ||
    d.group === 'health' ||
    d.group === 'education' ||
    d.group === 'donations'
  );
}

/** The deductions to ask about: relevant ones that the draft does not seem to include. */
export function missingDeductions(
  deductions: Deduction[],
  mentioned: string[],
  s: DraftSituation
): Deduction[] {
  return deductions.filter((d) => !mentioned.includes(d.id) && isRelevant(d, s));
}
