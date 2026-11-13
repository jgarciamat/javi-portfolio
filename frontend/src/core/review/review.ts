import { track } from '@core/analytics';
import { isNativeApp } from '@shared/utils/platform';
import { storage } from '@shared/utils/storage';

const KEY = 'mm_review';
const DAY_MS = 24 * 60 * 60 * 1000;
/** How long to wait before asking again. */
export const RETRY_DAYS = 90;
/** Days since the app was first opened before any request, even after an achievement. */
export const MIN_ACCOUNT_DAYS = 3;
/** Pause between the achievement on screen and the sheet, so the result is seen first. */
export const REVIEW_DELAY_MS = 2000;
export const PLAY_PACKAGE = 'com.jgarciamat.moneymanager';

/**
 * The achievements after which the Google Play review sheet is requested (also the detail of the
 * `review_request` event): a quarterly tax draft prepared, a savings goal reached and a
 * cancellation checked in «Tu dinero perdido».
 */
export type ReviewMoment = 'autonomo_draft' | 'goal_reached' | 'dp_recovered';

interface ReviewState {
  days: string[];
  /** First day the app was opened (`days` only keeps the last thirty). */
  firstSeen?: string;
  askedAt: string | null;
  /** Older versions: the person answered «¿Te está gustando?» (no longer asked). */
  done?: boolean;
}

const load = (): ReviewState => storage.getJSON<ReviewState>(KEY, { days: [], askedAt: null });
const save = (state: ReviewState): void => storage.setJSON(KEY, state);

/** The first day was recorded during this run of the app: its first session. */
let firstSession = false;

/** Notes that the app was opened today (one entry per day, the last 30 kept). */
export function recordOpen(now: Date): void {
  const state = load();
  const day = now.toISOString().slice(0, 10);
  if (!state.firstSeen && state.days.length === 0) firstSession = true;
  // Whoever answered the old question counts as asked today: nobody is asked twice in 90 days.
  const migrated: ReviewState = state.done
    ? { days: state.days, firstSeen: state.firstSeen, askedAt: state.askedAt ?? now.toISOString() }
    : state;
  if (migrated.days.includes(day) && migrated === state) return;
  save({
    ...migrated,
    firstSeen: migrated.firstSeen ?? migrated.days[0] ?? day,
    days: migrated.days.includes(day) ? migrated.days : [...migrated.days, day].slice(-30),
  });
}

/**
 * Whether the review sheet may be requested now: in the Android app only, never in the first
 * session nor before the app is 3 days old, and at most once every 90 days.
 */
export function canAskForReview(now: Date): boolean {
  if (!isNativeApp() || firstSession) return false;
  const state = load();
  const first = state.firstSeen ?? state.days[0];
  if (!first || now.getTime() - new Date(first).getTime() < MIN_ACCOUNT_DAYS * DAY_MS) return false;
  return !state.askedAt || now.getTime() - new Date(state.askedAt).getTime() > RETRY_DAYS * DAY_MS;
}

/**
 * Right after an achievement, the same for everybody (Google Play's rules: no question before,
 * no filter by opinion): a moment later, Google's own sheet, which Google may decide not to show.
 * Nothing is offered in exchange. Resolves to whether the sheet was requested.
 */
export async function askForReview(moment: ReviewMoment, now = new Date()): Promise<boolean> {
  if (!canAskForReview(now)) return false;
  save({ ...load(), askedAt: now.toISOString() });
  track('review_request', { detail: moment });
  await new Promise((resolve) => setTimeout(resolve, REVIEW_DELAY_MS));
  return requestStoreReview();
}

/** Google Play listing: the store app on Android, the web page elsewhere. */
export function storeListingUrl(): string {
  return isNativeApp()
    ? `market://details?id=${PLAY_PACKAGE}`
    : `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;
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

/** Tests only: a new run of the app. */
export function resetReviewSessionForTests(): void {
  firstSession = false;
}
