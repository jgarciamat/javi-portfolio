import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { stableContext } from '@shared/utils/stableContext';
import esMessages from '@locales/es.json';
import { storage } from '@shared/utils/storage';
import { AppSplash } from '@shared/components/AppSplash';
import { localeFromPath, withoutLocale } from './localeUrl';

export type Locale = 'es' | 'en';

type Messages = Record<string, string>;
export type Vars = Record<string, string | number>;

// Spanish is the fallback and travels in the main bundle; English is its own chunk, downloaded
// only by the people who use it (each language is about 50 KB gzipped).
const MESSAGES: Partial<Record<Locale, Messages>> & { es: Messages } = { es: esMessages };
const LOADERS: Record<Exclude<Locale, 'es'>, () => Promise<{ default: Messages }>> = {
  en: () => import('@locales/en.json'),
};
const STORAGE_KEY = 'mm_locale';

/** True when the messages of `locale` are already in memory. */
export function isLocaleLoaded(locale: Locale): boolean {
  return locale in MESSAGES;
}

/** Downloads the messages of `locale` (once). If that fails, its texts stay in Spanish. */
export async function loadLocale(locale: Locale): Promise<void> {
  if (isLocaleLoaded(locale)) return;
  try {
    MESSAGES[locale] = (await LOADERS[locale as Exclude<Locale, 'es'>]()).default;
  } catch {
    /* offline or a stale deploy: translate() falls back to Spanish */
  }
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

/** Translation of `key` (Spanish when the key is missing in `locale`, the key itself as last resort). */
export function translate(locale: Locale, key: string, vars?: Vars): string {
  return interpolate(MESSAGES[locale]?.[key] ?? MESSAGES.es[key] ?? key, vars);
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
  // Until the stored language arrives the splash stays: no flash of Spanish for English users.
  const [ready, setReady] = useState(() => isLocaleLoaded(locale));

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
    [locale, setLocale]
  );

  if (!ready) return <AppSplash />;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
