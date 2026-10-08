import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n, type Locale } from '@core/i18n/I18nContext';
import { useAuth } from '@shared/hooks/useAuth';
import type { SettingsChanges, UserSettings } from '@modules/finances/domain/types';
import {
  formatDate,
  formatMoney,
  formatPercent,
  formatRange,
  monthLabel,
  monthName,
} from '@shared/utils/format';

interface SettingsContextValue {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (changes: SettingsChanges) => Promise<UserSettings>;
  /** Changes the UI language and, when signed in, remembers it in the account. */
  changeLocale: (locale: Locale) => void;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { settingsApi } = useApi();
  const { isAuthenticated } = useAuth();
  const { locale, setLocale } = useI18n();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  // The language saved in the account wins over the one of this device.
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const apply = useCallback(
    (next: UserSettings) => {
      setSettings(next);
      if (next.locale !== localeRef.current) setLocale(next.locale);
    },
    [setLocale]
  );

  const reload = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      apply(await settingsApi.get());
    } catch {
      /* keep defaults: the month view shows its own error if the API is down */
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, settingsApi, apply]);

  useEffect(() => {
    if (isAuthenticated) void reload();
    else setSettings(null);
  }, [isAuthenticated, reload]);

  const updateSettings = useCallback(
    async (changes: SettingsChanges) => {
      const updated = await settingsApi.update(changes);
      apply(updated);
      return updated;
    },
    [settingsApi, apply]
  );

  const changeLocale = useCallback(
    (next: Locale) => {
      setLocale(next);
      if (isAuthenticated) {
        settingsApi
          .update({ locale: next })
          .then(setSettings)
          .catch(() => undefined);
      }
    },
    [isAuthenticated, setLocale, settingsApi]
  );

  const value = useMemo(
    () => ({ settings, loading, updateSettings, changeLocale, reload }),
    [settings, loading, updateSettings, changeLocale, reload]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

/** Same as useSettings but returns null outside the provider (public pages, tests). */
export function useOptionalSettings(): SettingsContextValue | null {
  return useContext(SettingsContext);
}

/** Formatters bound to the user's currency and the UI language. */
export function useFormat() {
  const { locale } = useI18n();
  const currency = useOptionalSettings()?.settings?.currency ?? 'EUR';
  return useMemo(
    () => ({
      locale,
      currency,
      money: (amount: number, options?: { decimals?: boolean; signed?: boolean }) =>
        formatMoney(amount, currency, locale, options),
      percent: (value: number, digits?: number) => formatPercent(value, locale, digits),
      monthName: (month: number, style?: 'long' | 'short') => monthName(month, locale, style),
      monthLabel: (year: number, month: number) => monthLabel(year, month, locale),
      date: (value: string) => formatDate(value, locale),
      range: (start: string, end: string) => formatRange(start, end, locale),
    }),
    [locale, currency]
  );
}

export type Formatter = ReturnType<typeof useFormat>;
