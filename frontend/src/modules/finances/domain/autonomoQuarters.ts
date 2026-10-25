import { filingDeadline } from './workingDays';

export type Quarter = 1 | 2 | 3 | 4;

/** A date of the device as YYYY-MM-DD. */
const dayOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The quarters a free account can draft on a date (the API checks the same, backend plans.ts): the
 * current one and, while its filing window is open, the one just ended. The window ends on the real
 * last day (20 April, July and October, 30 January, moved past weekends and holidays: 1 February
 * 2027 for the fourth quarter of 2026).
 */
export function freeDraftQuarters(now: Date): { year: number; quarter: Quarter }[] {
  const year = now.getFullYear();
  const current = { year, quarter: (Math.floor(now.getMonth() / 3) + 1) as Quarter };
  const ended =
    current.quarter === 1
      ? { year: year - 1, quarter: 4 as Quarter }
      : { year, quarter: (current.quarter - 1) as Quarter };
  return dayOf(now) <= filingDeadline(ended.year, ended.quarter) ? [current, ended] : [current];
}

/**
 * The quarter to open the self-employed draft on, a date: during the filing window of the quarter
 * just ended (to 20 April, July and October, or 30 January, moved past weekends) that one; outside it,
 * the current one. Always one of `freeDraftQuarters`, so the free plan never opens on a locked one.
 */
export function filingQuarter(now: Date): { year: number; quarter: Quarter } {
  const [current, ended] = freeDraftQuarters(now);
  return ended ?? current;
}
