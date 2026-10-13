import { storage } from '@shared/utils/storage';

const KEY = 'mm_acq';

/**
 * Where a visit comes from: the campaign (`?utm_source=reddit`) or the site that linked to us.
 * Own pages and empty referrers say nothing.
 */
export function sourceOf(search: string, referrer: string, ownHost: string): string | null {
  const campaign = new URLSearchParams(search).get('utm_source')?.trim().toLowerCase();
  const fromCampaign = campaign?.replace(/[^a-z0-9._-]/g, '').slice(0, 40);
  if (fromCampaign) return fromCampaign;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host && host !== ownHost.replace(/^www\./, '') ? host.slice(0, 40) : null;
  } catch {
    return null;
  }
}

/** Keeps the first source seen until the new user has signed in (first touch counts). */
export function captureAcquisition(
  search: string = window.location.search,
  referrer: string = document.referrer,
  ownHost: string = window.location.hostname
): void {
  if (storage.get(KEY)) return;
  const source = sourceOf(search, referrer, ownHost);
  if (source) storage.set(KEY, source);
}

export function pendingAcquisition(): string | undefined {
  return storage.get(KEY) ?? undefined;
}

export function clearAcquisition(): void {
  storage.set(KEY, null);
}
