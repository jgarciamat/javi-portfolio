import { storage } from '@shared/utils/storage';
import type { DetectedPayment } from '../domain/bankNotifications';

const PENDING_KEY = 'mm_captured';
const ENABLED_KEY = 'mm_capture_enabled';
const SEEN_KEY = 'mm_captured_seen';
const MAX_PENDING = 50;
const MAX_SEEN = 200;

export const captureEnabled = (): boolean => storage.get(ENABLED_KEY) === '1';
export const setCaptureEnabled = (on: boolean): void => storage.set(ENABLED_KEY, on ? '1' : null);

export const loadPending = (): DetectedPayment[] =>
  storage.getJSON<DetectedPayment[]>(PENDING_KEY, []);

const savePending = (items: DetectedPayment[]): void => storage.setJSON(PENDING_KEY, items);

/** Adds the payments that were not seen before (a notification is never suggested twice). */
export function addPending(items: DetectedPayment[]): DetectedPayment[] {
  const seen = storage.getJSON<string[]>(SEEN_KEY, []);
  const fresh = items.filter(
    (item, i) => !seen.includes(item.id) && items.findIndex((x) => x.id === item.id) === i
  );
  if (fresh.length === 0) return loadPending();
  storage.setJSON(SEEN_KEY, [...seen, ...fresh.map((f) => f.id)].slice(-MAX_SEEN));
  const next = [...loadPending(), ...fresh].slice(-MAX_PENDING);
  savePending(next);
  return next;
}

export function removePending(ids: string[]): DetectedPayment[] {
  const next = loadPending().filter((p) => !ids.includes(p.id));
  savePending(next);
  return next;
}
