import { parseDecimal } from '@shared/utils/numbers';
import { filingDeadline } from './workingDays';

/**
 * Whether a quarter is closed: its modelo 130 and 303 can no longer be filed in time. The last day is
 * the 20th of the month after the quarter (30 January for the fourth), moved past weekends and
 * national holidays (instructions of the modelos 130 and 303, AEAT, checked 2026-10-25; the same rule
 * as the deadlines of the server draft: workingDays.ts).
 */
export { filingDeadline };

/** `today` as YYYY-MM-DD. */
export const isClosedQuarter = (year: number, quarter: 1 | 2 | 3 | 4, today: string): boolean =>
  today > filingDeadline(year, quarter);

/** A signed amount typed by hand (box 07 or 19 can be negative); empty or not a number: null. */
export function typedAmount(text: string | undefined): number | null {
  const n = parseDecimal(text ?? '');
  return Number.isFinite(n) ? n : null;
}
