import { configureCapture, type CaptureAlerts } from '@core/capture/notificationCapture';
import { storage } from '@shared/utils/storage';
import {
  CAPTURE_PACKAGES,
  betterOf,
  samePayment,
  type DetectedPayment,
} from '../domain/bankNotifications';
import type { Streak } from '../domain/reviewLearning';

const PENDING_KEY = 'mm_captured';
const ENABLED_KEY = 'mm_capture_enabled';
const SEEN_KEY = 'mm_captured_seen';
/** The payments suggested lately (also the ones already added or discarded), to spot a repeat. */
const RECENT_KEY = 'mm_captured_recent';
/** When the person read what the detection reads and agreed (before the system settings). */
const CONSENT_KEY = 'mm_capture_consent';
const ALERT_KEY = 'mm_capture_alert';
const LEARN_KEY = 'mm_review_learn';
const MAX_PENDING = 50;
const MAX_SEEN = 200;
const MAX_RECENT = 50;

export const captureEnabled = (): boolean => storage.get(ENABLED_KEY) === '1';
export const setCaptureEnabled = (on: boolean): void => storage.set(ENABLED_KEY, on ? '1' : null);

export const captureConsented = (): boolean => storage.get(CONSENT_KEY) !== null;
/** Turning the detection off forgets the consent: turning it on again asks again. */
export const setCaptureConsent = (on: boolean): void =>
  storage.set(CONSENT_KEY, on ? new Date().toISOString() : null);

/**
 * How the phone tells about payments waiting in «Para revisar»: once a day at 21:00 (the
 * default), as each one is detected, or never.
 */
export type CaptureAlert = 'daily' | 'each' | 'off';
const ALERTS: CaptureAlert[] = ['daily', 'each', 'off'];
export const captureAlert = (): CaptureAlert =>
  ALERTS.find((a) => a === storage.get(ALERT_KEY)) ?? 'daily';
export const setCaptureAlert = (alert: CaptureAlert): void =>
  storage.set(ALERT_KEY, alert === 'daily' ? null : alert);

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** The alerts chosen, with their texts in the person's language. */
export const captureAlerts = (t: Translate): CaptureAlerts => ({
  alert: captureAlert(),
  texts: {
    channel: t('app.review.alert.channel'),
    eachTitle: t('app.review.alert.eachTitle'),
    manyTitle: t('app.review.alert.manyTitle'),
    eachBody: t('app.review.alert.eachBody'),
    dailyTitle: t('app.review.alert.dailyTitle'),
    dailyBody: t('app.review.alert.dailyBody'),
  },
});

/** Keeps the Android service in line with the choices made here (also after an app update). */
export const syncCapture = (t: Translate): Promise<void> =>
  configureCapture(captureEnabled(), CAPTURE_PACKAGES, captureAlerts(t)).catch(() => undefined);

/** Rules learnt from «Para revisar» (on unless the person turns them off). */
export const learningEnabled = (): boolean => storage.get(LEARN_KEY) !== '0';
export const setLearningEnabled = (on: boolean): void => storage.set(LEARN_KEY, on ? null : '0');

export const loadPending = (): DetectedPayment[] =>
  storage.getJSON<DetectedPayment[]>(PENDING_KEY, []);

const savePending = (items: DetectedPayment[]): void => storage.setJSON(PENDING_KEY, items);

/**
 * Adds the payments that were not seen before (a notification is never suggested twice). A payment
 * that another app already told (Google Wallet and the bank) is not added again: while it waits,
 * the bank's notification takes the wallet's place, since it names the shop.
 */
export function addPending(items: DetectedPayment[]): DetectedPayment[] {
  const seen = storage.getJSON<string[]>(SEEN_KEY, []);
  const fresh = items.filter(
    (item, i) => !seen.includes(item.id) && items.findIndex((x) => x.id === item.id) === i
  );
  if (fresh.length === 0) return loadPending();
  storage.setJSON(SEEN_KEY, [...seen, ...fresh.map((f) => f.id)].slice(-MAX_SEEN));
  let pending = loadPending();
  let recent = storage.getJSON<DetectedPayment[]>(RECENT_KEY, []);
  for (const item of fresh) {
    const twin = recent.find((r) => samePayment(r, item));
    if (!twin) {
      pending = [...pending, item];
      recent = [...recent, item];
      continue;
    }
    const kept = betterOf(twin, item);
    if (kept === twin) continue;
    pending = pending.map((p) => (p.id === twin.id ? item : p));
    recent = recent.map((r) => (r.id === twin.id ? item : r));
  }
  storage.setJSON(RECENT_KEY, recent.slice(-MAX_RECENT));
  const next = pending.slice(-MAX_PENDING);
  savePending(next);
  return next;
}

export function removePending(ids: string[]): DetectedPayment[] {
  const next = loadPending().filter((p) => !ids.includes(p.id));
  savePending(next);
  return next;
}

/** Puts back a payment taken out a moment ago («Deshacer»), where it was. */
export function restorePending(item: DetectedPayment, index: number): DetectedPayment[] {
  const current = loadPending().filter((p) => p.id !== item.id);
  const next = [...current.slice(0, index), item, ...current.slice(index)];
  savePending(next);
  return next;
}

/** Turning the detection off also forgets what was waiting and what was suggested lately. */
export function forgetCaptured(): void {
  savePending([]);
  storage.set(RECENT_KEY, null);
}

const STREAKS_KEY = 'mm_review_streaks';
const MAX_STREAKS = 100;

/** What «Para revisar» remembers to learn a rule: the shop and the category chosen last time. */
export const loadStreak = (shop: string): Streak | undefined =>
  storage.getJSON<Record<string, Streak>>(STREAKS_KEY, {})[shop];

export function saveStreak(shop: string, streak: Streak | null): void {
  const kept = Object.entries(storage.getJSON<Record<string, Streak>>(STREAKS_KEY, {}))
    .filter(([key]) => key !== shop)
    .slice(-(MAX_STREAKS - 1));
  storage.setJSON(STREAKS_KEY, Object.fromEntries(streak ? [...kept, [shop, streak]] : kept));
}
