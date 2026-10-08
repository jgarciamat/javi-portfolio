import {
  hasMessage,
  storedLocale,
  translate,
  type Locale,
  type Vars,
} from '@core/i18n/I18nContext';

type Details = Record<string, unknown>;

/** Translation variables the API sends in another shape. */
const DERIVED_VARS: Record<string, (details: Details, locale: Locale) => Vars> = {
  INSUFFICIENT_BALANCE: (d) => ({ available: (Number(d.availableCents) / 100).toFixed(2) }),
  PLAN_LIMIT: (d, locale) => ({
    resource: translate(locale, `billing.resource.${String(d.resource)}`),
    limit: Number(d.limit),
  }),
};

/** Every "<THING>_NOT_FOUND" reads the same to the user. */
const keyFor = (code: string) => `app.apiError.${code.endsWith('_NOT_FOUND') ? 'NOT_FOUND' : code}`;

/**
 * Message of an API error in the user's language. The API writes Spanish
 * messages, the most specific ones, so Spanish keeps them; other languages get
 * the translation of the error code, and a generic message when there is none.
 */
export function apiErrorMessage(
  code: string | undefined,
  serverMessage?: string,
  details: Details = {}
): string {
  const locale = storedLocale();
  if (locale === 'es' && serverMessage) return serverMessage;
  const key = code ? keyFor(code) : '';
  if (!code || !hasMessage(locale, key)) return translate(locale, 'app.apiError.generic');
  return translate(locale, key, DERIVED_VARS[code]?.(details, locale));
}
