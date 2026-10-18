import { storage } from './storage';
import { safeNext } from './appLinks';

const KEY = 'mm_next';
/** A day: enough to open the verification e-mail, not enough to surprise anyone weeks later. */
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Remembers on this device the page someone left to sign up (a guide, a calculator), because the
 * link of the verification e-mail opens a new tab that has lost `?next=`.
 */
export function rememberReturn(next: string | null): void {
  if (next === null || safeNext(next) === '/') return;
  storage.setJSON(KEY, { to: next, at: Date.now() });
}

/** The remembered page, once: it is forgotten as soon as it is read. Null when none or too old. */
export function takeReturn(): string | null {
  const saved = storage.getJSON<{ to?: unknown; at?: unknown } | null>(KEY, null);
  storage.set(KEY, null);
  if (!saved || typeof saved.to !== 'string' || typeof saved.at !== 'number') return null;
  return Date.now() - saved.at <= TTL_MS ? saved.to : null;
}
