import { ValidationError } from '@domain/errors';
import { MAX_START_DAY, MIN_START_DAY } from '@domain/shared/period';

export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'MXN',
  'ARS',
  'COP',
  'CLP',
  'CHF',
] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface UserSettingsProps {
  userId: string;
  currency: Currency;
  locale: Locale;
  monthStartDay: number;
  defaultAccountId: string | null;
  notificationsEnabled: boolean;
  /** Show the (clearly labelled) affiliate offers section. */
  showOffers: boolean;
}

export type SettingsChanges = Partial<Omit<UserSettingsProps, 'userId'>>;

export function defaultSettings(userId: string, locale: string = 'es'): UserSettingsProps {
  return {
    userId,
    currency: 'EUR',
    locale: (SUPPORTED_LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : 'es',
    monthStartDay: 1,
    defaultAccountId: null,
    notificationsEnabled: false,
    showOffers: true,
  };
}

export function applySettingsChanges(
  current: UserSettingsProps,
  changes: SettingsChanges
): UserSettingsProps {
  const next = { ...current, ...changes };
  if (!SUPPORTED_CURRENCIES.includes(next.currency)) {
    throw new ValidationError(`Moneda no soportada. Usa ${SUPPORTED_CURRENCIES.join(', ')}`);
  }
  if (!SUPPORTED_LOCALES.includes(next.locale)) {
    throw new ValidationError(`Idioma no soportado. Usa ${SUPPORTED_LOCALES.join(', ')}`);
  }
  if (
    !Number.isInteger(next.monthStartDay) ||
    next.monthStartDay < MIN_START_DAY ||
    next.monthStartDay > MAX_START_DAY
  ) {
    throw new ValidationError(
      `El día de inicio debe estar entre ${MIN_START_DAY} y ${MAX_START_DAY}`
    );
  }
  return next;
}
