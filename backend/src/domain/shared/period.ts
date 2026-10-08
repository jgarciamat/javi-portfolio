import { ValidationError } from '@domain/errors';

/**
 * A budgeting period ("month"). With the default month start day (1) a period is a
 * calendar month. With a custom start day (e.g. payday on the 25th) a period runs from
 * that day until the day before it in the next month, and it is named after the
 * calendar month that holds most of its days:
 *   - start day 2..15  → named after the month where it starts (5 Mar – 4 Apr = March)
 *   - start day 16..28 → named after the month where it ends   (25 Mar – 24 Apr = April)
 */
export interface Period {
  year: number;
  month: number;
}

export const MIN_START_DAY = 1;
export const MAX_START_DAY = 28;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

export function normalizeStartDay(day: number | null | undefined): number {
  if (!day || !Number.isFinite(day)) return 1;
  return Math.min(MAX_START_DAY, Math.max(MIN_START_DAY, Math.trunc(day)));
}

export function periodOrdinal(p: Period): number {
  return p.year * 12 + (p.month - 1);
}

export function periodFromOrdinal(ordinal: number): Period {
  return { year: Math.floor(ordinal / 12), month: (((ordinal % 12) + 12) % 12) + 1 };
}

export function addMonths(p: Period, months: number): Period {
  return periodFromOrdinal(periodOrdinal(p) + months);
}

export function comparePeriods(a: Period, b: Period): number {
  return periodOrdinal(a) - periodOrdinal(b);
}

export function isValidPeriod(p: Period): boolean {
  return (
    Number.isInteger(p.year) &&
    Number.isInteger(p.month) &&
    p.year >= 1970 &&
    p.year <= 9999 &&
    p.month >= 1 &&
    p.month <= 12
  );
}

export function assertValidPeriod(p: Period): void {
  if (!isValidPeriod(p)) throw new ValidationError('Año o mes inválidos', 'INVALID_PERIOD');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Accepts `YYYY-MM-DD` or a full ISO timestamp and returns the calendar date part.
 * Throws when the value is not a real date (e.g. 2026-02-30).
 */
export function toDateOnly(value: string): string {
  const match = DATE_ONLY.exec(value);
  if (!match) throw new ValidationError('Fecha inválida (formato YYYY-MM-DD)', 'INVALID_DATE');
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new ValidationError('Fecha inválida', 'INVALID_DATE');
  }
  return formatDate(year, month, day);
}

function splitDate(date: string): { year: number; month: number; day: number } {
  const [y, m, d] = toDateOnly(date).split('-').map(Number);
  return { year: y, month: m, day: d };
}

/** Period a calendar date belongs to, given the user's month start day. */
export function periodOfDate(date: string, startDay = 1): Period {
  const { year, month, day } = splitDate(date);
  const sd = normalizeStartDay(startDay);
  const calendar = { year, month };
  if (sd === 1) return calendar;
  if (sd <= 15) return day >= sd ? calendar : addMonths(calendar, -1);
  return day >= sd ? addMonths(calendar, 1) : calendar;
}

/** First day (inclusive) of a period, as YYYY-MM-DD. */
export function periodStart(p: Period, startDay = 1): string {
  const sd = normalizeStartDay(startDay);
  const startMonth = sd > 15 ? addMonths(p, -1) : p;
  return formatDate(startMonth.year, startMonth.month, sd);
}

/** Last day (inclusive) of a period, as YYYY-MM-DD. */
export function periodEnd(p: Period, startDay = 1): string {
  const next = periodStart(addMonths(p, 1), startDay);
  const { year, month, day } = splitDate(next);
  const d = new Date(Date.UTC(year, month - 1, day - 1));
  return formatDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function todayDateOnly(now: Date = new Date()): string {
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function currentPeriod(startDay = 1, now: Date = new Date()): Period {
  return periodOfDate(todayDateOnly(now), startDay);
}

/** Inclusive list of periods between two periods. */
export function periodsBetween(from: Period, to: Period): Period[] {
  const result: Period[] = [];
  for (let o = periodOrdinal(from); o <= periodOrdinal(to); o++) result.push(periodFromOrdinal(o));
  return result;
}
