import { isNativeApp } from '@shared/utils/platform';
import { storage } from '@shared/utils/storage';

const KEY = 'mm_review';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Distinct days the app has been opened, and movements, before it is worth asking. */
export const MIN_DAYS = 4;
export const MIN_MOVEMENTS = 8;
/** How long to wait before asking again after someone said "later" or "no". */
export const RETRY_DAYS = 60;

interface ReviewState {
  days: string[];
  askedAt: string | null;
  done: boolean;
}

const load = (): ReviewState =>
  storage.getJSON<ReviewState>(KEY, { days: [], askedAt: null, done: false });
const save = (state: ReviewState): void => storage.setJSON(KEY, state);

/** Notes that the app was opened today (one entry per day, the last 30 kept). */
export function recordOpen(now: Date): void {
  const state = load();
  const day = now.toISOString().slice(0, 10);
  if (state.days.includes(day)) return;
  save({ ...state, days: [...state.days, day].slice(-30) });
}

/** The person has used the app enough, recently asked or not, to be worth a review request. */
export function shouldAskForReview(movements: number, now: Date): boolean {
  const state = load();
  if (state.done || state.days.length < MIN_DAYS || movements < MIN_MOVEMENTS) return false;
  return !state.askedAt || now.getTime() - new Date(state.askedAt).getTime() > RETRY_DAYS * DAY_MS;
}

/** "Later" or "no": do not ask again for a while. */
export function snoozeReview(now: Date): void {
  save({ ...load(), askedAt: now.toISOString() });
}

/** Never ask again (the person already rated or recommended the app). */
export function finishReview(): void {
  save({ ...load(), done: true });
}

/** Opens the Google Play review sheet inside the Android app; false elsewhere. */
export async function requestStoreReview(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
