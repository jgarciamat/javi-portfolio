import { isNativeApp } from '@shared/utils/platform';
import { storage } from '@shared/utils/storage';

const KEY = 'mm_review';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Distinct days the app has been opened, and movements, before it is worth asking. */
export const MIN_DAYS = 4;
export const MIN_MOVEMENTS = 8;
/** How long to wait before asking again after someone said "later" or "no". */
export const RETRY_DAYS = 90;
/** Days since the app was first opened before any request, even after a happy moment. */
export const MIN_ACCOUNT_DAYS = 3;
export const PLAY_PACKAGE = 'com.jgarciamat.moneymanager';

interface ReviewState {
  days: string[];
  /** First day the app was opened (`days` only keeps the last thirty). */
  firstSeen?: string;
  /** A positive moment happened (goal reached, first tax draft): a good time to ask. */
  positive?: boolean;
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
  save({
    ...state,
    firstSeen: state.firstSeen ?? state.days[0] ?? day,
    days: [...state.days, day].slice(-30),
  });
}

/** A savings goal was reached or a tax draft was generated: now the request makes sense. */
export function recordPositiveMoment(): void {
  const state = load();
  if (!state.positive) save({ ...state, positive: true });
}

/** The person has used the app enough, recently asked or not, to be worth a review request. */
export function shouldAskForReview(movements: number, now: Date): boolean {
  const state = load();
  if (state.done) return false;
  const first = state.firstSeen ?? state.days[0];
  if (!first || now.getTime() - new Date(first).getTime() < MIN_ACCOUNT_DAYS * DAY_MS) return false;
  const usedEnough = state.days.length >= MIN_DAYS && movements >= MIN_MOVEMENTS;
  if (!state.positive && !usedEnough) return false;
  return !state.askedAt || now.getTime() - new Date(state.askedAt).getTime() > RETRY_DAYS * DAY_MS;
}

/** Google Play listing: the store app on Android, the web page elsewhere. */
export function storeListingUrl(): string {
  return isNativeApp()
    ? `market://details?id=${PLAY_PACKAGE}`
    : `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;
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
