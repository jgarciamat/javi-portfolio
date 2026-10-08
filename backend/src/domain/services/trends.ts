import { Cents } from '@domain/shared/money';
import { Period, addMonths, periodOrdinal } from '@domain/shared/period';

export interface CategoryPeriodTotal {
  year: number;
  month: number;
  categoryName: string;
  cents: Cents;
}

export interface CategoryTrend {
  categoryName: string;
  currentCents: Cents;
  previousCents: Cents;
  /** Average of the three periods before the current one. */
  average3Cents: Cents;
  /** Change vs previous period in %, null when the previous period had no spending. */
  changeVsPreviousPct: number | null;
  /** Change vs the 3-period average in %, null when the average is 0. */
  changeVsAveragePct: number | null;
}

function change(current: Cents, base: Cents): number | null {
  if (base <= 0) return null;
  return Math.round(((current - base) / base) * 1000) / 10;
}

/**
 * Compares each category in `current` with the previous period and with the average
 * of the three previous periods. `totals` must cover at least [current-3, current].
 */
export function computeCategoryTrends(
  current: Period,
  totals: CategoryPeriodTotal[]
): CategoryTrend[] {
  const cur = periodOrdinal(current);
  const prev = periodOrdinal(addMonths(current, -1));
  const byCategory = new Map<string, Map<number, Cents>>();
  for (const t of totals) {
    const ord = periodOrdinal({ year: t.year, month: t.month });
    if (ord < cur - 3 || ord > cur) continue;
    const perPeriod = byCategory.get(t.categoryName) ?? new Map<number, Cents>();
    perPeriod.set(ord, (perPeriod.get(ord) ?? 0) + t.cents);
    byCategory.set(t.categoryName, perPeriod);
  }
  const trends: CategoryTrend[] = [];
  for (const [categoryName, perPeriod] of byCategory) {
    const currentCents = perPeriod.get(cur) ?? 0;
    const previousCents = perPeriod.get(prev) ?? 0;
    const lastThree = [cur - 1, cur - 2, cur - 3].map((o) => perPeriod.get(o) ?? 0);
    const average3Cents = Math.round(lastThree.reduce((a, b) => a + b, 0) / 3);
    trends.push({
      categoryName,
      currentCents,
      previousCents,
      average3Cents,
      changeVsPreviousPct: change(currentCents, previousCents),
      changeVsAveragePct: change(currentCents, average3Cents),
    });
  }
  return trends.sort(
    (a, b) => b.currentCents - a.currentCents || b.average3Cents - a.average3Cents
  );
}
