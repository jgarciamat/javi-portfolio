/**
 * What this device keeps about the signed-in person. Every key the app writes starts
 * with `mm_`; on sign-out and account deletion all of them go except these device
 * preferences, which say nothing about the person:
 * - `mm_theme`, `mm_locale`: look and language;
 * - `mm_chunk_reload`: guard against reload loops after a deploy;
 * - `mm_renta_uses`: the public tax calculator's one free use per browser;
 * - `mm_install_hint`: the "install it on your iPhone" notice was dismissed.
 *
 * Removed, among others: session (`mm_token`, `mm_refresh_token`, `mm_user`), drafts
 * (`mm_renta_snapshot_v2`, `mm_renta_progress`, `mm_autonomo_*`, `mm_hacienda_*`), captured payments
 * (`mm_captured*`, `mm_capture_enabled`), invite codes (`mm_ref`, `mm_join`), the
 * app lock, reminders and UI state; and from this tab, the open calculators' figures
 * (`mm_calc_draft:*`).
 */
export const KEPT_KEYS = [
  'mm_theme',
  'mm_locale',
  'mm_chunk_reload',
  'mm_renta_uses',
  'mm_install_hint',
];

/** "Remember me" on the login form: kept on sign-out (the person chose it), not on deletion. */
export const REMEMBER_EMAIL_KEY = 'mm_remember_email';

const PREFIX = 'mm_';

/** This tab's storage too: the figures of an open calculator kept for after signing up. */
const STORES = ['localStorage', 'sessionStorage'] as const;

export function clearLocalUserData(options: { keepRememberedEmail: boolean }): void {
  const kept = new Set(KEPT_KEYS);
  if (options.keepRememberedEmail) kept.add(REMEMBER_EMAIL_KEY);
  for (const name of STORES) {
    try {
      const store = window[name];
      Object.keys(store)
        .filter((key) => key.startsWith(PREFIX) && !kept.has(key))
        .forEach((key) => store.removeItem(key));
    } catch {
      /* storage unavailable: nothing was stored either */
    }
  }
}
