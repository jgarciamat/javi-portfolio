import { storage } from '@shared/utils/storage';

const KEY = 'mm_ref';
/** Where invitation links point to (the native apps cannot use their own origin). */
export const PUBLIC_URL = 'https://www.winjgm.com';

/** Keeps the invitation code of an `/?ref=CODE` link until the user registers. */
export function captureReferral(search: string = window.location.search): void {
  const code = new URLSearchParams(search).get('ref')?.trim();
  if (code) storage.set(KEY, code.slice(0, 32));
}

/** Code to send with the registration, if the user arrived through an invitation. */
export function pendingReferral(): string | undefined {
  return storage.get(KEY) ?? undefined;
}

export function clearReferral(): void {
  storage.set(KEY, null);
}

export function inviteLink(code: string): string {
  return `${PUBLIC_URL}/?ref=${encodeURIComponent(code)}`;
}
