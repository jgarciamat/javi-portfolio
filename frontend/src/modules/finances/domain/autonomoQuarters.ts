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

/**
 * The quarter to file on a date: the last one already ended (1–3 → 4T of last year, 4–6 → 1T,
 * 7–9 → 2T, 10–12 → 3T). The quarterly forms are filed in the month after the quarter ends.
 */
export function filingQuarter(now: Date): { year: number; quarter: Quarter } {
  const ended = Math.floor(now.getMonth() / 3);
  return ended === 0
    ? { year: now.getFullYear() - 1, quarter: 4 }
    : { year: now.getFullYear(), quarter: ended as Quarter };
}
