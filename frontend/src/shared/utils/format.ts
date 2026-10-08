/**
 * Formatting helpers shared by the whole UI (replaces the copies of
 * formatCurrency / MONTH_NAMES that lived in several `types` files).
 * Dates travel as calendar dates "YYYY-MM-DD" and are parsed as local dates,
 * so they never move a day because of the time zone.
 */

const INTL_LOCALE: Record<string, string> = { es: 'es-ES', en: 'en-GB' };

export function intlLocale(locale: string): string {
  return INTL_LOCALE[locale] ?? locale;
}

export function formatMoney(
  amount: number,
  currency: string,
  locale: string,
  options: { decimals?: boolean; signed?: boolean } = {}
): string {
  const decimals = options.decimals ?? true;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
    signDisplay: options.signed ? 'exceptZero' : 'auto',
  }).format(amount);
}

export function formatPercent(value: number, locale: string, digits = 1): string {
  return `${new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

/** "marzo" / "March" (long) or "mar" / "Mar" (short). */
export function monthName(month: number, locale: string, style: 'long' | 'short' = 'long'): string {
  const name = new Intl.DateTimeFormat(intlLocale(locale), { month: style }).format(
    new Date(2026, month - 1, 15)
  );
  return name.charAt(0).toUpperCase() + name.slice(1).replace('.', '');
}

export function monthLabel(year: number, month: number, locale: string): string {
  return `${monthName(month, locale)} ${year}`;
}

/** Local Date (at noon, safe from DST and time zones) for a calendar date YYYY-MM-DD. */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

/** "4 mar 2026" */
export function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseDateOnly(value));
}

/** "4 mar – 3 abr" for a period that does not match a calendar month. */
export function formatRange(start: string, end: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short' });
  return `${fmt.format(parseDateOnly(start))} – ${fmt.format(parseDateOnly(end))}`;
}
