import type { Locale } from './I18nContext';

/**
 * The public pages also exist in English under `/en` (`/en/pricing`, `/en/calculadora-iva`…), so
 * search engines can index each language at its own address. Spanish keeps the plain addresses.
 */
export const EN_PREFIX = '/en';

const EN_PATH = /^\/en(\/|$)/;

/** The language an address asks for, or null when it does not say. */
export const localeFromPath = (pathname: string): Locale | null =>
  EN_PATH.test(pathname) ? 'en' : null;

/** Base of the router: `/en` on the English addresses, so every link stays in English. */
export const routerBasename = (pathname: string): string | undefined =>
  localeFromPath(pathname) ? EN_PREFIX : undefined;

/** `path` (`/pricing`, `/`) as an address in the language of `pathname`. */
export function localizedPath(path: string, pathname: string): string {
  if (!localeFromPath(pathname)) return path;
  return path === '/' ? EN_PREFIX : `${EN_PREFIX}${path}`;
}

/** The same address without the language: `/en/pricing` → `/pricing`, `/en` → `/`. */
export const withoutLocale = (pathname: string): string => pathname.replace(EN_PATH, '/');
