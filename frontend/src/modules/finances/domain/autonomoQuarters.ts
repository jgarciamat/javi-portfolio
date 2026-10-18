export type Quarter = 1 | 2 | 3 | 4;

/** Last day (of the month after a quarter) to file that quarter's forms: 20th, or 30 January. */
const FILING_LAST_DAY: Record<Quarter, number> = { 1: 20, 2: 20, 3: 20, 4: 30 };

/**
 * The quarters a free account can draft on a date (the API checks the same): the current one and,
 * while its filing window is open (1–20 April, July and October; 1–30 January), the one just ended.
 */
export function freeDraftQuarters(now: Date): { year: number; quarter: Quarter }[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const current = { year, quarter: (Math.floor(month / 3) + 1) as Quarter };
  if (month % 3 !== 0) return [current];
  const ended =
    current.quarter === 1
      ? { year: year - 1, quarter: 4 as Quarter }
      : { year, quarter: (current.quarter - 1) as Quarter };
  return now.getDate() <= FILING_LAST_DAY[ended.quarter] ? [current, ended] : [current];
}
