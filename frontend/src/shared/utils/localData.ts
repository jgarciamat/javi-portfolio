/**
 * What this device keeps about the signed-in person. Every key the app writes starts
 * with `mm_`; on sign-out and account deletion all of them go except these device
 * preferences, which say nothing about the person:
 * - `mm_theme`, `mm_locale`: look and language;
 * - `mm_chunk_reload`: guard against reload loops after a deploy;
 * - `mm_renta_uses`: the public tax calculator's one free use per browser.
 *
 * Removed, among others: session (`mm_token`, `mm_refresh_token`, `mm_user`), drafts
 * (`mm_renta_snapshot_v2`, `mm_renta_progress`, `mm_autonomo_*`, `mm_hacienda_*`), captured payments
 * (`mm_captured*`, `mm_capture_enabled`), invite codes (`mm_ref`, `mm_join`), the
 * app lock, reminders and UI state.
 */
export const KEPT_KEYS = ['mm_theme', 'mm_locale', 'mm_chunk_reload', 'mm_renta_uses'];

/** "Remember me" on the login form: kept on sign-out (the person chose it), not on deletion. */
export const REMEMBER_EMAIL_KEY = 'mm_remember_email';

const PREFIX = 'mm_';

export function clearLocalUserData(options: { keepRememberedEmail: boolean }): void {
  const kept = new Set(KEPT_KEYS);
  if (options.keepRememberedEmail) kept.add(REMEMBER_EMAIL_KEY);
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX) && !kept.has(key))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage unavailable: nothing was stored either */
  }
}
