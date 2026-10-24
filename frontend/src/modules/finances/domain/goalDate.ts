import { monthsToGoal } from '@modules/tools/domain/calculators';

/**
 * «La fecha de tu meta» (docs/disenos/dinero-perdido-y-fecha-meta.md, D): the month a goal is
 * reached at a pace of saving, computed in the browser so the «what if…» answers at once.
 * Months, never days; the date is never rounded in the user's favour.
 */

/** Past this many months the screen says «over 50 years» instead of a date. */
export const MAX_GOAL_MONTHS = 600;

export interface YearMonth {
  year: number;
  month: number;
}

export type GoalDate =
  | { kind: 'done' }
  /** Nothing (or less) put aside a month: it is never reached. */
  | { kind: 'zero' }
  | { kind: 'tooLong' }
  | ({ kind: 'date'; months: number } & YearMonth);

export const monthOrdinal = (p: YearMonth): number => p.year * 12 + (p.month - 1);
export const fromOrdinal = (n: number): YearMonth => ({
  year: Math.floor(n / 12),
  month: (n % 12) + 1,
});

export function goalDate(input: {
  target: number;
  saved: number;
  /** Put aside each month (the pace plus any extra). */
  monthly: number;
  /** Estimated yearly return, 0 to 10 %. */
  annualRatePct?: number;
  /** Current period of the user (their month may start on another day). */
  current: YearMonth;
  /** Already saved this period: the first month of the estimate is then the next one. */
  savedThisMonth: number;
}): GoalDate {
  const missing = Math.max(0, input.target - input.saved);
  if (missing === 0) return { kind: 'done' };
  if (!(input.monthly > 0)) return { kind: 'zero' };
  const rate = Math.min(10, Math.max(0, input.annualRatePct ?? 0));
  const months =
    rate > 0
      ? monthsToGoal({
          target: input.target,
          initial: input.saved,
          monthly: input.monthly,
          annualRatePct: rate,
        })
      : // Whole cents, so 0,1 + 0,2 never needs one month more.
        Math.ceil(Math.round(missing * 100) / Math.round(input.monthly * 100));
  if (months === null || months > MAX_GOAL_MONTHS) return { kind: 'tooLong' };
  const first = monthOrdinal(input.current) + (input.savedThisMonth > 0 ? 1 : 0);
  return { kind: 'date', months, ...fromOrdinal(first + months - 1) };
}

/** Months between two dates of a goal: positive when `b` is later than `a`. */
export const monthsBetween = (a: YearMonth, b: YearMonth): number =>
  monthOrdinal(b) - monthOrdinal(a);

/** The month of a goal's target date (YYYY-MM-DD). */
export function targetMonth(targetDate: string): YearMonth {
  const [year, month] = targetDate.split('-').map(Number);
  return { year, month };
}
