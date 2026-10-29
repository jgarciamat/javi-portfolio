import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { stableContext } from '@shared/utils/stableContext';
import esCore from 'virtual:locale/es/core';
import { storage } from '@shared/utils/storage';
import { AppSplash } from '@shared/components/AppSplash';
import { localeFromPath, withoutLocale } from './localeUrl';

export type Locale = 'es' | 'en';

type Messages = Record<string, string>;
export type Vars = Record<string, string | number>;

/**
 * The texts of each language come in two parts (built by scripts/i18n/split.cjs):
 * - «core»: what the landing, the login, the plans and the shell use. Spanish core travels in the
 *   main bundle; the English one is its own chunk, downloaded only by the people who use it.
 * - «rest»: everything else. The pages that need it ask for it with `withAllTexts`, and render once
 *   it is here, so no key ever paints raw.
 */
type Part = 'core' | 'rest';
type Loader = () => Promise<{ default: Messages }>;

const MESSAGES: Partial<Record<Locale, Messages>> & { es: Messages } = { es: { ...esCore } };
const LOADED: Record<Locale, Set<Part>> = { es: new Set(['core']), en: new Set() };
const LOADERS: Record<Locale, Partial<Record<Part, Loader>>> = {
  es: { rest: () => import('virtual:locale/es/rest') },
  en: {
    core: () => import('virtual:locale/en/core'),
    rest: () => import('virtual:locale/en/rest'),
  },
};
const STORAGE_KEY = 'mm_locale';

/** True once a page that needs every text has asked for them: a language switch then brings all. */
let allTexts = false;
/** The language on screen (the provider keeps it), whose rest `loadAllTexts` downloads. */
let active: Locale = 'es';
/** Told when texts arrive that a translate() had to leave blank. */
const listeners = new Set<() => void>();

const partsWanted = (): Part[] => (allTexts ? ['core', 'rest'] : ['core']);

/** True when the messages of `locale` that the app needs now are in memory. */
export function isLocaleLoaded(locale: Locale): boolean {
  return partsWanted().every((part) => LOADED[locale].has(part));
}

/** Downloads `part` of `locale` (once). False when it could not (offline, a stale deploy). */
async function loadPart(locale: Locale, part: Part): Promise<boolean> {
  if (LOADED[locale].has(part)) return true;
  try {
    const messages = (await (LOADERS[locale][part] as Loader)()).default;
    MESSAGES[locale] = { ...MESSAGES[locale], ...messages };
    LOADED[locale].add(part);
    return true;
  } catch {
    return false;
  }
}

/** Downloads the messages of `locale` the app needs now. What fails stays in Spanish. */
export async function loadLocale(locale: Locale): Promise<void> {
  await Promise.all(
    partsWanted().map(async (part) => {
      if (!(await loadPart(locale, part))) await loadPart('es', part);
    })
  );
}

/** Downloads every text of the language on screen; rejects when not even Spanish can arrive. */
export async function loadAllTexts(): Promise<void> {
  allTexts = true;
  await loadLocale(active);
  if (!LOADED[active].has('rest') && !LOADED.es.has('rest')) {
    throw new Error('[i18n] the texts could not be downloaded');
  }
}

/**
 * A page loader that also waits for every text: `lazyNamed(withAllTexts(() => import('./Page')), …)`.
 * scripts/i18n/split.cjs reads this call: what is imported inside it does not count for the core.
 */
export function withAllTexts<T>(load: () => Promise<T>): () => Promise<T> {
  return () => Promise.all([load(), loadAllTexts()]).then(([module]) => module);
}

/** A key that is not in memory: blank while the rest of the texts may still bring it. */
function missing(locale: Locale, key: string): string {
  if (LOADED[locale].has('rest') || LOADED.es.has('rest')) return key;
  void loadAllTexts().then(
    () => listeners.forEach((listener) => listener()),
    () => undefined
  );
  return '';
}

const isLocale = (value: unknown): value is Locale => value === 'es' || value === 'en';

/** The language last chosen on this device (Spanish by default). */
export function storedLocale(): Locale {
  const stored = storage.get(STORAGE_KEY);
  return isLocale(stored) ? stored : 'es';
}

/** Replaces every `{name}` in `text` with `vars.name`. */
export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(String(value)),
    text
  );
}

/**
 * Translation of `key`: Spanish when the key is missing in `locale`; blank while the rest of the
 * texts is on its way; the key itself as last resort.
 */
export function translate(locale: Locale, key: string, vars?: Vars): string {
  return interpolate(MESSAGES[locale]?.[key] ?? MESSAGES.es[key] ?? missing(locale, key), vars);
}

export function hasMessage(locale: Locale, key: string): boolean {
  return key in (MESSAGES[locale] ?? MESSAGES.es);
}

/** Category names are stored in Spanish; the default ones have a translation. */
export function translateCategory(locale: Locale, name: string): string {
  return MESSAGES[locale]?.[`app.categories.${name.replace(/\s+/g, '')}`] ?? name;
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Vars) => string;
  /** Display name of a category in the active language. */
  tCategory: (name: string) => string;
}

const I18nContext = stableContext<I18nContextValue | null>('I18nContext', null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // An English address (`/en/…`) shows English; otherwise the language chosen on this device.
  const [locale, setLocaleState] = useState<Locale>(
    () => localeFromPath(window.location.pathname) ?? storedLocale()
  );
  active = locale;
  // Until the stored language arrives the splash stays: no flash of Spanish for English users.
  const [ready, setReady] = useState(() => isLocaleLoaded(locale));
  // Bumped when texts a translate() left blank arrive: the screen paints them.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const repaint = () => setVersion((n) => n + 1);
    listeners.add(repaint);
    return () => {
      listeners.delete(repaint);
    };
  }, []);

  useEffect(() => {
    if (!ready) void loadLocale(locale).then(() => setReady(true));
  }, [ready, locale]);

  const setLocale = useCallback((next: Locale) => {
    storage.set(STORAGE_KEY, next);
    // On an English address, Spanish means the plain address (the router base changes: reload).
    const { pathname, search, hash } = window.location;
    if (localeFromPath(pathname) && next !== 'en') {
      window.location.replace(`${withoutLocale(pathname)}${search}${hash}`);
      return;
    }
    if (isLocaleLoaded(next)) setLocaleState(next);
    else void loadLocale(next).then(() => setLocaleState(next));
  }, []);

  // Screen readers pick the voice from <html lang>.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      tCategory: (name) => translateCategory(locale, name),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` only forces new texts
    [locale, setLocale, version]
  );

  if (!ready) return <AppSplash />;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
