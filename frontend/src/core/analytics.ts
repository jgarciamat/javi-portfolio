import { API_BASE_URL } from '@core/config/api.config';
import { isNativeApp } from '@shared/utils/platform';

/**
 * First-party, cookieless funnel analytics (docs/analitica.md).
 *
 * Nothing is stored on the device and nothing identifies the visitor: each call sends one
 * event name, at most a guide slug, and the origin of the landing (kept in memory only for
 * this page load). The server adds it to a daily counter. Every failure is swallowed:
 * blockers, offline, a down API or a missing `fetch` never reach the UI.
 */

/** Closed list of events the browser may send. Anything else is rejected by the server. */
export const TRACK_EVENTS = [
  'visit',
  'signup_view',
  'guide_view',
  'guide_cta_click',
  'pricing_view',
  'paywall_view',
] as const;

export type TrackEvent = (typeof TRACK_EVENTS)[number];

export interface TrackProps {
  /** Slug of the guide (`guide_view`, `guide_cta_click`): `[a-z0-9-]`, up to 80 characters. */
  guide?: string;
}

/** Where this page load came from. Raw values: the server normalises them. */
export interface LandingOrigin {
  utm_source?: string;
  utm_campaign?: string;
  utm_content?: string;
  /** Host of the page that linked here (never its path or query). */
  ref?: string;
}

/** What goes with a sign-up: the landing origin, or nothing when there is none. */
export interface SignupOrigin extends LandingOrigin {
  app?: boolean;
}

let landing: LandingOrigin | null = null;

function clip(value: string | null): string | undefined {
  const text = value?.trim().slice(0, 80);
  return text || undefined;
}

function referrerHost(referrer: string, ownHost: string): string | undefined {
  try {
    const host = new URL(referrer).hostname;
    return host && host !== ownHost ? host.slice(0, 80) : undefined;
  } catch {
    return undefined;
  }
}

/** The origin of the first page of this load (first touch), computed once and held in memory. */
export function landingOrigin(): LandingOrigin {
  if (!landing) {
    const query = new URLSearchParams(window.location.search);
    landing = {
      utm_source: clip(query.get('utm_source')),
      utm_campaign: clip(query.get('utm_campaign')),
      utm_content: clip(query.get('utm_content')),
      ref: referrerHost(document.referrer, window.location.hostname),
    };
  }
  return landing;
}

/** The visitor asked not to be measured (Global Privacy Control or Do Not Track). */
function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1' || nav.webdriver === true;
}

/**
 * The origin to send with the sign-up request (`origin` in `/auth/register` and `/auth/google`),
 * so the server counts the new account by origin without anything stored on the device.
 */
export function signupOrigin(): SignupOrigin | undefined {
  if (optedOut()) return undefined;
  const origin: SignupOrigin = { ...landingOrigin(), ...(isNativeApp() ? { app: true } : {}) };
  return Object.values(origin).some((value) => value !== undefined) ? origin : undefined;
}

/** Counts one funnel event. Fire and forget: never throws, never blocks. */
export function track(event: TrackEvent, props?: TrackProps): void {
  try {
    if (optedOut()) return;
    const body = JSON.stringify({
      event,
      ...(props?.guide ? { guide: props.guide } : {}),
      ...landingOrigin(),
      ...(isNativeApp() ? { app: true } : {}),
    });
    fetch(`${API_BASE_URL}/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'omit',
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Blocked or unavailable: analytics must never break the page.
  }
}

/** Tests only: forget the landing so another URL can be simulated. */
export function resetAnalyticsForTests(): void {
  landing = null;
}
