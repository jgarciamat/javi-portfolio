/**
 * A step-by-step assistant: numbered steps, each one a few short screens. A step opens only when
 * every step before it is done; going back is always allowed and nothing is lost on the way.
 * "Done" means answered (also with «I don't know / it does not apply»), never "said yes".
 */

/** One step of a flow: its id and about how long it takes, for the time left. */
export interface WizardStep {
  id: string;
  minutes: number;
}

/** Where the person is in a flow, kept on the device (and in the account, where there is one). */
export interface WizardProgress {
  /** The step on screen. */
  at: number;
  /** The screen of that step. */
  screen: number;
  /** The steps finished, by id. */
  done: string[];
  /** The answers of the assistant's own questions (by screen id), and «I don't know» marks. */
  answers: Record<string, string>;
  /** Days in a row with a step finished. */
  streak: number;
  /** The last day a step was finished (YYYY-MM-DD). */
  lastDay: string | null;
}

/** «I don't know / it does not apply»: an answer like any other, it never blocks. */
export const UNKNOWN = 'unknown';

export const NEW_PROGRESS: WizardProgress = {
  at: 0,
  screen: 0,
  done: [],
  answers: {},
  streak: 0,
  lastDay: null,
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const whole = (v: unknown, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : 0;

/** A saved progress over a new one: anything of the wrong kind, or of a step that is gone, is left out. */
export function reviveProgress(saved: unknown, steps: readonly WizardStep[]): WizardProgress {
  if (!isObject(saved)) return { ...NEW_PROGRESS };
  const ids = steps.map((s) => s.id);
  const done = Array.isArray(saved.done)
    ? saved.done.filter((d): d is string => typeof d === 'string' && ids.includes(d))
    : [];
  const answers = isObject(saved.answers)
    ? Object.fromEntries(Object.entries(saved.answers).filter(([, v]) => typeof v === 'string'))
    : {};
  const at = whole(saved.at, steps.length - 1);
  return {
    // A step can only be on screen when it is open.
    at: isOpen(steps, done, at) ? at : firstOpenStep(steps, done),
    screen: whole(saved.screen, 50),
    done: [...new Set(done)],
    answers: answers as Record<string, string>,
    streak: whole(saved.streak, 10_000),
    lastDay:
      typeof saved.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.lastDay)
        ? saved.lastDay
        : null,
  };
}

/** Whether a step can be opened: the first one always, the others once every step before is done. */
export function isOpen(steps: readonly WizardStep[], done: string[], index: number): boolean {
  return steps.slice(0, index).every((s) => done.includes(s.id));
}

/** The first step not finished (the last one when all are). */
export function firstOpenStep(steps: readonly WizardStep[], done: string[]): number {
  const open = steps.findIndex((s) => !done.includes(s.id));
  return open < 0 ? steps.length - 1 : open;
}

export const isFinished = (steps: readonly WizardStep[], done: string[]) =>
  steps.every((s) => done.includes(s.id));

/** The day of a date in the person's time zone, as YYYY-MM-DD. */
export function dayOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day before a YYYY-MM-DD day. */
function dayBefore(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayOf(new Date(y, m - 1, d - 1));
}

/** Days in a row: the same day keeps it, the next day adds one, a gap starts again at one. */
export function streakAfter(progress: WizardProgress, today: string): number {
  if (progress.lastDay === today) return Math.max(1, progress.streak);
  if (progress.lastDay !== null && progress.lastDay === dayBefore(today))
    return progress.streak + 1;
  return 1;
}

/** A step finished: kept as done, the streak counted and the next step (or the last) on screen. */
export function completeStep(
  progress: WizardProgress,
  steps: readonly WizardStep[],
  index: number,
  today: string
): WizardProgress {
  const id = steps[index].id;
  const done = progress.done.includes(id) ? progress.done : [...progress.done, id];
  return {
    ...progress,
    done,
    at: Math.min(index + 1, steps.length - 1),
    screen: 0,
    streak: streakAfter(progress, today),
    lastDay: today,
  };
}

/** About how many minutes are left: the steps not done yet. */
export function minutesLeft(steps: readonly WizardStep[], done: string[]): number {
  return steps.filter((s) => !done.includes(s.id)).reduce((sum, s) => sum + s.minutes, 0);
}

/** How much of the flow is done, from 0 to 100. */
export function percentDone(steps: readonly WizardStep[], done: string[]): number {
  return Math.round((steps.filter((s) => done.includes(s.id)).length / steps.length) * 100);
}

/** The words of encouragement for how far the person got: never a countdown, never pressure. */
export type Cheer = 'start' | 'first' | 'going' | 'half' | 'almost' | 'last' | 'finished';

export function cheerOf(doneCount: number, total: number): Cheer {
  if (doneCount >= total) return 'finished';
  if (doneCount === 0) return 'start';
  if (doneCount === 1) return 'first';
  if (doneCount === total - 1) return 'last';
  if (doneCount / total >= 0.7) return 'almost';
  return doneCount / total >= 0.45 ? 'half' : 'going';
}
