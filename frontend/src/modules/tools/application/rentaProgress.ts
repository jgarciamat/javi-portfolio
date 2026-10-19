import { storage } from '@shared/utils/storage';
import { NO_DRAFT, type DraftReading, type DraftState } from '../domain/rentaDraft';
import { emptyForm, type RentaForm } from '../domain/rentaForm';

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
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const sameKind = (a: unknown, b: unknown) =>
  Array.isArray(a) ? Array.isArray(b) : isObject(a) ? isObject(b) : typeof a === typeof b;

/** A saved form over an empty one: every field of the wrong kind (old or broken data) is left empty. */
export function reviveForm(saved: unknown): RentaForm {
  const form = emptyForm('');
  if (!isObject(saved)) return form;
  const fields = form as unknown as Record<string, unknown>;
  for (const key of Object.keys(form)) {
    if (sameKind(fields[key], saved[key])) fields[key] = saved[key];
  }
  // Lists of rows: only rows that are objects (a row with a missing field still reads as empty).
  form.children = form.children.filter(isObject);
  form.ascendants = form.ascendants.filter(isObject);
  form.unrented = form.unrented.filter(isObject);
  return form;
}

/** A reading is kept only when it has the shape of this version: else it is read again from the PDF. */
const isReading = (r: unknown): r is DraftReading =>
  isObject(r) &&
  isObject(r.boxes) &&
  Array.isArray(r.applied) &&
  Array.isArray(r.childAges) &&
  Array.isArray(r.ascendantAges) &&
  Array.isArray(r.unrented);

function reviveDraft(saved: unknown): DraftState {
  if (!isObject(saved) || !isReading(saved.reading)) return NO_DRAFT;
  return {
    reading: saved.reading,
    rents: saved.rents === true,
    dismissed: Array.isArray(saved.dismissed)
      ? saved.dismissed.filter((d) => typeof d === 'string')
      : [],
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
  return { year: saved.year, form: reviveForm(saved.form), draft: reviveDraft(saved.draft) };
}

export function saveProgress(progress: RentaProgress): void {
  storage.setJSON(PROGRESS_KEY, { version: PROGRESS_VERSION, ...progress });
}

export function clearProgress(): void {
  storage.set(PROGRESS_KEY, null);
}
