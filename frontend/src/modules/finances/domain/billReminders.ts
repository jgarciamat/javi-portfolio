import type { RecurringRule } from './types';

export interface BillReminder {
  /** When to notify: 9:00 (device time) the day before the period starts. */
  at: Date;
  count: number;
  total: number;
}

const STEP = { monthly: 1, bimonthly: 2, quarterly: 3, yearly: 12 } as const;
const REMINDERS_AHEAD = 3;

/** The rule generates a movement in the period `year`-`month`. */
function appliesTo(rule: RecurringRule, year: number, month: number): boolean {
  if (!rule.active) return false;
  const target = year * 12 + month;
  const start = rule.startYear * 12 + rule.startMonth;
  if (target < start) return false;
  if (
    rule.endYear !== null &&
    rule.endMonth !== null &&
    target > rule.endYear * 12 + rule.endMonth
  ) {
    return false;
  }
  return (target - start) % STEP[rule.frequency] === 0;
}

/**
 * For each of the next periods, the automatic expenses it will charge and the morning before
 * it starts, so the phone can remind the user. `current` is the period being lived now.
 */
export function upcomingBills(
  rules: RecurringRule[],
  current: { year: number; month: number; start: string },
  now: Date
): BillReminder[] {
  const [startYear, startMonth, startDay] = current.start.split('-').map(Number);
  const reminders: BillReminder[] = [];
  for (let k = 1; k <= REMINDERS_AHEAD; k++) {
    const target = current.year * 12 + (current.month - 1) + k;
    const year = Math.floor(target / 12);
    const month = (target % 12) + 1;
    const due = rules.filter((r) => r.type === 'EXPENSE' && appliesTo(r, year, month));
    // The period starts on the same day of the month, k months after the current one.
    const at = new Date(startYear, startMonth - 1 + k, startDay - 1, 9, 0, 0);
    if (due.length === 0 || at <= now) continue;
    reminders.push({ at, count: due.length, total: due.reduce((sum, r) => sum + r.amount, 0) });
  }
  return reminders;
}
