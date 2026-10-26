import type { EndOfMonth } from './types';

const cents = (amount: number): number => Math.round(amount * 100);

/**
 * What would be left at the end of the month spending `daily` a day from today:
 * available − payments still to come − daily · days left (negative: what would be missing).
 */
export function leftoverAt(plan: EndOfMonth, daily: number): number {
  const free = cents(plan.available) - cents(plan.pendingTotal);
  return (free - cents(daily) * plan.daysLeft) / 100;
}

/** Top of the «Si gastas … al día» slider: twice the larger of the pace and the maximum, in tens. */
export function sliderMax(plan: EndOfMonth): number {
  const top = Math.max(plan.pace, plan.maxDaily, 5) * 2;
  return Math.ceil(top / 10) * 10;
}

/** The amount typed in the field, or null while it is not a number of zero or more. */
export function parseDaily(text: string): number | null {
  const value = Number(text.replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value >= 0
    ? Math.round(value * 100) / 100
    : null;
}
