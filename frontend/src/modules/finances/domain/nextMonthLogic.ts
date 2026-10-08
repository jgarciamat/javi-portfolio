/**
 * Navigation limits for the month and annual views. Past months are unlimited
 * (down to MIN_YEAR, to allow importing old bank statements) and the future is
 * limited to MAX_MONTHS_AHEAD so recurring movements can be planned.
 * `current` is the user's current period (it depends on the month start day).
 */
export const MIN_YEAR = 2000;
export const MAX_MONTHS_AHEAD = 12;

export interface YearMonth {
  year: number;
  month: number;
}

const ordinal = (p: YearMonth) => p.year * 12 + (p.month - 1);
const fromOrdinal = (o: number): YearMonth => ({ year: Math.floor(o / 12), month: (o % 12) + 1 });

export function addMonths(p: YearMonth, n: number): YearMonth {
  return fromOrdinal(ordinal(p) + n);
}

export function comparePeriods(a: YearMonth, b: YearMonth): number {
  return ordinal(a) - ordinal(b);
}

/** Latest month the user can open. */
export function maxPeriod(current: YearMonth): YearMonth {
  return addMonths(current, MAX_MONTHS_AHEAD);
}

/** True when a month is further ahead than the planning horizon (cannot be opened). */
export function isBeyondHorizon(year: number, month: number, current: YearMonth): boolean {
  return comparePeriods({ year, month }, maxPeriod(current)) > 0;
}

/** "Next" is disabled once the view reaches the planning horizon. */
export function isNextButtonDisabled(year: number, month: number, current: YearMonth): boolean {
  return comparePeriods({ year, month }, maxPeriod(current)) >= 0;
}

export function isPrevButtonDisabled(year: number, month: number): boolean {
  return comparePeriods({ year, month }, { year: MIN_YEAR, month: 1 }) <= 0;
}
