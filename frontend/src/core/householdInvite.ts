import { storage } from '@shared/utils/storage';
import { PUBLIC_URL } from '@core/referral';

const KEY = 'mm_join';

/** Keeps the code of a `/?join=CODE` invitation until the user decides (like the referral code). */
export function captureHouseholdInvite(search: string = window.location.search): void {
  const code = new URLSearchParams(search).get('join')?.trim();
  if (code) storage.set(KEY, code.slice(0, 64));
}

export function pendingHouseholdInvite(): string | null {
  return storage.get(KEY);
}

export function clearHouseholdInvite(): void {
  storage.set(KEY, null);
}

export function householdInviteLink(code: string): string {
  return `${PUBLIC_URL}/?join=${encodeURIComponent(code)}`;
}
