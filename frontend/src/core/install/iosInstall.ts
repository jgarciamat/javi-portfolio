import { storage } from '@shared/utils/storage';
import { isNativeApp } from '@shared/utils/platform';

/** What the page knows about the browser it runs in (passed in so it can be tested). */
export interface BrowserInfo {
  userAgent: string;
  /** iPadOS 13+ says it is a Mac: only its touch screen gives it away. */
  maxTouchPoints: number;
  /** Opened from the icon on the home screen (`display-mode: standalone` or `navigator.standalone`). */
  standalone: boolean;
}

export type AppleDevice = 'iphone' | 'ipad';

/** The two browsers the guide explains: both add Finanverso to the home screen from their Share button. */
export type InstallBrowser = 'chrome' | 'safari';

/** Other browsers on iOS and the browsers inside other apps: the guide does not cover them. */
const OTHER_BROWSER =
  /FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|Ddg\/|GSA\/|FBAN|FBAV|FBIOS|Instagram|musical_ly|TikTok|Bytedance|Twitter|LinkedInApp|Snapchat|Pinterest|Line\/|MicroMessenger|WhatsApp|Telegram/i;

/** The iPhone or iPad the page is on, or `null` on any other device. */
export function appleDevice({ userAgent, maxTouchPoints }: BrowserInfo): AppleDevice | null {
  if (/iPhone|iPod/.test(userAgent)) return 'iphone';
  if (/iPad/.test(userAgent)) return 'ipad';
  // iPadOS asks for the desktop site by default: a "Mac" with a touch screen is an iPad.
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return 'ipad';
  return null;
}

/**
 * Google Chrome (`CriOS/…`) or Safari itself (`Version/… Safari/…`) on an iPhone or iPad; `null`
 * for any other browser, the browsers inside other apps and other devices.
 */
export function iosBrowser(info: BrowserInfo): InstallBrowser | null {
  const ua = info.userAgent;
  if (appleDevice(info) === null || OTHER_BROWSER.test(ua)) return null;
  if (/CriOS\//.test(ua)) return 'chrome';
  return /Version\/[\d.]+.*Safari\//.test(ua) ? 'safari' : null;
}

/** The install notice is for Chrome or Safari on an iPhone or iPad, not once Finanverso is opened from its icon. */
export function canOfferIosInstall(info: BrowserInfo): boolean {
  return !info.standalone && iosBrowser(info) !== null;
}

/** The browser this page runs in. */
export function currentBrowser(): BrowserInfo {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints,
    standalone:
      nav.standalone === true ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches),
  };
}

/** Kept on sign-out (see localData): it says nothing about the person. */
export const INSTALL_HINT_KEY = 'mm_install_hint';

/** Whether to show the notice now: iPhone or iPad, Chrome or Safari, outside the apps, not dismissed here. */
export function shouldShowInstallHint(info: BrowserInfo = currentBrowser()): boolean {
  return !isNativeApp() && canOfferIosInstall(info) && storage.get(INSTALL_HINT_KEY) === null;
}

/** "Not now" or "Show me how": the notice does not come back on this device. */
export function dismissInstallHint(): void {
  storage.set(INSTALL_HINT_KEY, 'dismissed');
}
