/** Public pages that have a section of the signed-in app that does the same and more. */
const APP_TAB_BY_PATH: Record<string, string> = {
  '/calculadora-renta': 'renta',
};

export const appTabOf = (path: string): string | null => APP_TAB_BY_PATH[path] ?? null;

/** Address of a section of the app: `/?tab=renta`. */
export const appTabPath = (tab: string): string => `/?tab=${tab}`;

/** Where to send someone who wants a section of the app: straight there, or to sign in first. */
export const appTarget = (tab: string, authenticated: boolean): string =>
  authenticated ? appTabPath(tab) : `/login?next=${encodeURIComponent(appTabPath(tab))}`;

const NEXT = /^\/\?tab=[a-z-]+$/;

/** The `next` address of the login page, only when it points to a section of the app. */
export const safeNext = (next: string | null): string =>
  next !== null && NEXT.test(next) ? next : '/';
