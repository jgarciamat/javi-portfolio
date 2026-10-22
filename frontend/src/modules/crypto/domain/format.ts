import type { DisplayCurrency } from './currency';
import type { Locale } from '@core/i18n/I18nContext';

/** The Intl locale of the app language. */
export const intlTag = (locale: Locale): string => (locale === 'en' ? 'en-GB' : 'es-ES');
const tag = intlTag;
/** «9.499,50 €», not «9499,50 €»: thousands are always grouped (easier to read). */
const GROUP = { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions;

/** Decimals that keep four significant digits on tiny prices (0,000004312 €), two otherwise. */
export function priceDecimals(price: number): number {
  if (!(price > 0) || price >= 1) return 2;
  return Math.min(10, Math.ceil(-Math.log10(price)) + 3);
}

/** Money with cents (amounts of the simulator), in euros or the display currency. */
export function formatEur(
  value: number,
  locale: Locale,
  signed = false,
  currency: DisplayCurrency = 'EUR'
): string {
  return new Intl.NumberFormat(tag(locale), {
    ...GROUP,
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value);
}

/** The price of a coin, with as many decimals as it needs. */
export function formatPrice(
  price: number,
  locale: Locale,
  currency: DisplayCurrency = 'EUR'
): string {
  const digits = priceDecimals(price);
  return new Intl.NumberFormat(tag(locale), {
    ...GROUP,
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(price);
}

/** A plain number with the decimals of a price (the chart's axis). */
export function formatPlain(price: number, locale: Locale): string {
  const digits = priceDecimals(price);
  return new Intl.NumberFormat(tag(locale), {
    ...GROUP,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(price);
}

/** Coins held: up to eight decimals, without trailing zeros. */
export function formatQuantity(quantity: number, locale: Locale): string {
  return new Intl.NumberFormat(tag(locale), { ...GROUP, maximumFractionDigits: 8 }).format(
    quantity
  );
}

/** «+1,25 %» (a change, with its sign). */
export function formatChange(percent: number, locale: Locale): string {
  return new Intl.NumberFormat(tag(locale), {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(percent / 100);
}

/** Coins traded (volume), shortened: «1,2 mil». */
export function formatVolume(volume: number, locale: Locale): string {
  return new Intl.NumberFormat(tag(locale), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(volume);
}

/** Date and time of a candle or an operation, in the person's time zone. */
export function formatDateTime(iso: string | number, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * Label of a mark of the time axis in the person's time zone (the chart library writes UTC):
 * a year, a month, a day, or an hour (0 Year, 1 Month, 2 DayOfMonth, 3 Time, 4 TimeWithSeconds).
 */
export function formatTick(ms: number, kind: number, locale: Locale): string {
  const options: Intl.DateTimeFormatOptions[] = [
    { year: 'numeric' },
    { month: 'short' },
    { day: 'numeric' },
    { hour: '2-digit', minute: '2-digit' },
  ];
  return new Intl.DateTimeFormat(tag(locale), options[Math.min(kind, 3)]).format(new Date(ms));
}

/** Direction of a number for the colour: up, down or flat. */
export const tone = (value: number | null): 'up' | 'down' | 'flat' =>
  value === null || value === 0 ? 'flat' : value > 0 ? 'up' : 'down';

/** A plain number with up to one decimal («66,7»). */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 1 }).format(value);
}
