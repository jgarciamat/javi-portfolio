import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import esMessages from '@locales/es.json';
import enMessages from '@locales/en.json';

export type Locale = 'es' | 'en';

type Messages = Record<string, string>;

const MESSAGES: Record<Locale, Messages> = {
    es: esMessages,
    en: enMessages,
};

const STORAGE_KEY = 'mm_locale';

function loadLocale(): Locale {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'es' ? stored : 'es';
}

interface I18nContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, vars?: Record<string, string | number>) => string;
    /** Returns the translated display name for a canonical (Spanish) category name */
    tCategory: (name: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(loadLocale);

    const setLocale = useCallback((newLocale: Locale) => {
        localStorage.setItem(STORAGE_KEY, newLocale);
        setLocaleState(newLocale);
    }, []);

    /** Translate a key with optional variable interpolation: t('key', { count: 5 }) */
    const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
        const messages = MESSAGES[locale];
        let text = messages[key] ?? MESSAGES['es'][key] ?? key;
        if (vars) {
            Object.entries(vars).forEach(([k, v]) => {
                text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
            });
        }
        return text;
    }, [locale]);

    /**
     * Translate a category name stored in the DB (always Spanish canonical form)
     * to the currently active locale.
     * Key format: app.categories.<NameWithoutSpaces>
     */
    const tCategory = useCallback((name: string): string => {
        // Normalise key: strip spaces and special chars to match JSON key format
        const key = `app.categories.${name.replace(/\s+/g, '')}`;
        const messages = MESSAGES[locale];
        return messages[key] ?? name;
    }, [locale]);

    return (
        <I18nContext.Provider value={{ locale, setLocale, t, tCategory }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n(): I18nContextValue {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        if (import.meta.env.DEV) {
            // During HMR, providers may temporarily be unavailable — return a no-op fallback
            // so the app doesn't crash. The real context will be restored on next render.
            return {
                locale: 'es',
                setLocale: () => undefined,
                t: (key: string) => key,
                tCategory: (name: string) => name,
            };
        }
        throw new Error('useI18n must be used inside I18nProvider');
    }
    return ctx;
}
