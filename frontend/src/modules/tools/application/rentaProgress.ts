import { storage } from '@shared/utils/storage';
import { NO_DRAFT, type DraftReading, type DraftState } from '../domain/rentaDraft';
import { emptyForm, emptyPartner, type RentaForm, type UnrentedForm } from '../domain/rentaForm';
import { NO_REVIEW, type ReviewState } from '../domain/rentaReview';
import type { ActivityInput } from '../domain/rentaActivity';
import type { SavingsDetail } from '../domain/rentaGains';
import { emptyProperty } from '../domain/rentaRentals';

/** What was typed in the planner, kept on this device until it is wiped (or the person signs out). */
export const PROGRESS_KEY = 'mm_renta_progress';
/** Bumped when the saved shape changes in a way old data cannot be read with. */
export const PROGRESS_VERSION = 1;

export interface RentaProgress {
  /** The year of the return the data is for. */
  year: number;
  form: RentaForm;
  /** The draft as it was read: amounts and ages only, never the text, names or ids. */
  draft: DraftState;
  /** The review of the deductions that could apply: the dismissed ones and the ones left for later. */
  review: ReviewState;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const sameKind = (a: unknown, b: unknown) =>
  Array.isArray(a) ? Array.isArray(b) : isObject(a) ? isObject(b) : typeof a === typeof b;

/** Every field of `saved` with the kind of the same field of `empty` (old or broken data is left out). */
function over<T extends object>(empty: T, saved: unknown): T {
  if (!isObject(saved)) return empty;
  const fields = empty as unknown as Record<string, unknown>;
  for (const key of Object.keys(empty)) {
    if (sameKind(fields[key], saved[key])) fields[key] = saved[key];
  }
  return empty;
}

/**
 * A property row as saved: the planner asked for months before it asked for days (box 0085), so a
 * row with months and no days gets the same share of the year in days (6 months: 183 days), which
 * the person sees and can correct. Anything else that is not text is left empty.
 */
function unrentedRow(row: Record<string, unknown>): UnrentedForm {
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  const months = text(row.months).trim();
  const days =
    typeof row.days === 'string'
      ? row.days
      : months === ''
      ? ''
      : String(Math.round((Math.min(12, Math.max(0, Number(months) || 0)) * 365) / 12));
  return { value: text(row.value), revised: row.revised === true, days };
}

/** A saved form over an empty one: every field of the wrong kind (old or broken data) is left empty. */
export function reviveForm(saved: unknown): RentaForm {
  const form = over(emptyForm(''), saved);
  form.partner = over(emptyPartner(), form.partner);
  form.answers = Object.fromEntries(
    Object.entries(form.answers).filter(([, value]) => typeof value === 'string')
  );
  // Lists of rows: only rows that are objects (a row with a missing field still reads as empty).
  form.children = form.children.filter(isObject);
  form.ascendants = form.ascendants.filter(isObject);
  form.unrented = (form.unrented as unknown[]).filter(isObject).map(unrentedRow);
  return withOptional(form, isObject(saved) ? saved : {});
}

const OPTIONAL_TEXT = [
  'childSupport',
  'pensionCapital2006',
  'secondPayers',
  'rentalPendingExcess',
] as const;

const isDetail = (d: unknown): d is SavingsDetail =>
  isObject(d) &&
  isObject(d.capital) &&
  isObject(d.pending) &&
  ['assets', 'properties', 'otherGains', 'generalGains'].every((k) => Array.isArray(d[k]));

const isActivity = (a: unknown): a is ActivityInput =>
  isObject(a) &&
  ['direct', 'modules', 'agrarian', 'given'].includes(a.kind as string) &&
  isObject(a.data);

/** The fields the planner asked later (not in every saved form): kept when they have their shape. */
function withOptional(form: RentaForm, saved: Record<string, unknown>): RentaForm {
  for (const key of OPTIONAL_TEXT)
    if (typeof saved[key] === 'string') form[key] = saved[key] as string;
  if (saved.assistance === true) form.assistance = true;
  if (isDetail(saved.savingsDetail)) form.savingsDetail = saved.savingsDetail;
  if (Array.isArray(saved.activities)) form.activities = saved.activities.filter(isActivity);
  // Each rented property over an empty one: a field of the wrong kind is left empty.
  if (Array.isArray(saved.properties))
    form.properties = saved.properties
      .filter(isObject)
      .map((p, i) => ({ ...over(emptyProperty(i + 1), p), expenses: textMap(p.expenses) }));
  return form;
}

/** A map of texts (the expenses of a property, by id): anything else is left out. */
const textMap = (v: unknown): Record<string, string> =>
  isObject(v)
    ? Object.fromEntries(
        Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string')
      )
    : {};

/** A reading is kept only when it has the shape of this version: else it is read again from the PDF. */
const isReading = (r: unknown): r is DraftReading =>
  isObject(r) &&
  isObject(r.boxes) &&
  Array.isArray(r.applied) &&
  Array.isArray(r.childAges) &&
  Array.isArray(r.ascendantAges) &&
  Array.isArray(r.unrented) &&
  // Readings saved when the planner kept months instead of the days of box 0085 are read again.
  r.unrented.every((u) => isObject(u) && (u.days === null || typeof u.days === 'number'));

/** The strings of a saved list (anything else is left out). */
const strings = (list: unknown): string[] =>
  Array.isArray(list) ? list.filter((d): d is string => typeof d === 'string') : [];

function reviveDraft(saved: unknown): DraftState {
  if (!isObject(saved) || !isReading(saved.reading)) return NO_DRAFT;
  return {
    reading: saved.reading,
    rents: saved.rents === true,
    dismissed: strings(saved.dismissed),
    scenario:
      isObject(saved.scenario) && isReading(saved.scenario.reading)
        ? { form: reviveForm(saved.scenario.form), reading: saved.scenario.reading }
        : null,
  };
}

/** What was saved, when it is of this version; null when there is nothing (or nothing readable). */
export function loadProgress(): RentaProgress | null {
  const saved = storage.getJSON<unknown>(PROGRESS_KEY, null);
  if (!isObject(saved) || saved.version !== PROGRESS_VERSION || typeof saved.year !== 'number') {
    return null;
  }
  const review = isObject(saved.review)
    ? { dismissed: strings(saved.review.dismissed), later: strings(saved.review.later) }
    : NO_REVIEW;
  return {
    year: saved.year,
    form: reviveForm(saved.form),
    draft: reviveDraft(saved.draft),
    review,
  };
}

export function saveProgress(progress: RentaProgress): void {
  storage.setJSON(PROGRESS_KEY, { version: PROGRESS_VERSION, ...progress });
}

export function clearProgress(): void {
  storage.set(PROGRESS_KEY, null);
}
