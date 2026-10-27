/**
 * Formatting helpers shared by the whole UI (replaces the copies of
 * formatCurrency / MONTH_NAMES that lived in several `types` files).
 * Dates travel as calendar dates "YYYY-MM-DD" and are parsed as local dates,
 * so they never move a day because of the time zone.
 */

const INTL_LOCALE: Record<string, string> = { es: 'es-ES', en: 'en-GB' };

/** es-ES skips the thousands dot under 10.000 («1875,00 €»): the same mark on every amount. */
const GROUP = { useGrouping: 'always' as unknown as boolean };

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
    ...GROUP,
    style: 'currency',
    currency,
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
    signDisplay: options.signed ? 'exceptZero' : 'auto',
  }).format(amount);
}

/** «7,5 %» in Spanish (a non-breaking space, as the texts and the amounts write it), «7.5%» in English. */
export function formatPercent(value: number, locale: string, digits = 1): string {
  const figure = new Intl.NumberFormat(intlLocale(locale), {
    ...GROUP,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `${figure}${locale === 'en' ? '' : '\u00a0'}%`;
}

/** "marzo" / "March" (long) or "mar" / "Mar" (short). */
export function monthName(month: number, locale: string, style: 'long' | 'short' = 'long'): string {
  const name = new Intl.DateTimeFormat(intlLocale(locale), { month: style }).format(
    new Date(2026, month - 1, 15)
  );
  const short = name.replace('.', '');
  // Spanish writes «sept» but «oct», «nov»: three letters for all, so an axis reads even.
  const even = style === 'short' ? short.slice(0, 3) : short;
  return even.charAt(0).toUpperCase() + even.slice(1);
}

export function monthLabel(year: number, month: number, locale: string): string {
  return `${monthName(month, locale)} ${year}`;
}

/** "febrero de 2028" / "February 2028": a month in words, for estimates and «since». */
export function formatMonthYear(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 15)
  );
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
/** "12 de septiembre" / "12 September": a day in words, without the year. */
export function formatDayMonth(value: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long' }).format(
    parseDateOnly(value)
  );
}

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
