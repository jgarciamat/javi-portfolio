import { parseDecimal } from '@shared/utils/numbers';

/**
 * Whether a quarter is closed: its modelo 130 and 303 can no longer be filed in time. The last day is
 * the 20th of the month after the quarter (30 January for the fourth), a weekend moving to the
 * Monday (instructions of the modelos 130 and 303, AEAT, checked 2026-10-21; the same rule as the
 * deadlines of the server draft). Public holidays are not known here.
 */
export function filingDeadline(year: number, quarter: 1 | 2 | 3 | 4): string {
  const d =
    quarter === 4 ? new Date(Date.UTC(year + 1, 0, 30)) : new Date(Date.UTC(year, quarter * 3, 20));
  while (d.getUTCDay() === 6 || d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** `today` as YYYY-MM-DD. */
export const isClosedQuarter = (year: number, quarter: 1 | 2 | 3 | 4, today: string): boolean =>
  today > filingDeadline(year, quarter);

/** A signed amount typed by hand (box 07 or 19 can be negative); empty or not a number: null. */
export function typedAmount(text: string | undefined): number | null {
  const n = parseDecimal(text ?? '');
  return Number.isFinite(n) ? n : null;
}
