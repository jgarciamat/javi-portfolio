import { Cents } from '@domain/shared/money';

export interface DigestMovement {
  amountCents: Cents;
  categoryName: string;
}

export interface DigestUpcoming {
  /** First day of the next period: when the recurring movements are charged. */
  date: string;
  items: { description: string; amountCents: Cents }[];
  totalCents: Cents;
}

export interface DigestData {
  /** Last 7 days. */
  from: string;
  to: string;
  spentCents: Cents;
  previousSpentCents: Cents;
  /** Change of spending against the 7 days before; null without a base to compare. */
  changePct: number | null;
  incomeCents: Cents;
  topCategories: { name: string; cents: Cents }[];
  upcoming: DigestUpcoming | null;
}

const TOP = 3;

/** What the Monday e-mail tells: the week's spending, its biggest categories and what is coming. */
export function buildDigest(input: {
  from: string;
  to: string;
  expenses: DigestMovement[];
  incomeCents: Cents;
  previousSpentCents: Cents;
  upcoming: DigestUpcoming | null;
}): DigestData {
  const byCategory = new Map<string, Cents>();
  for (const e of input.expenses) {
    byCategory.set(e.categoryName, (byCategory.get(e.categoryName) ?? 0) + e.amountCents);
  }
  const spentCents = input.expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const changePct =
    input.previousSpentCents > 0
      ? Math.round(((spentCents - input.previousSpentCents) / input.previousSpentCents) * 100)
      : null;
  return {
    from: input.from,
    to: input.to,
    spentCents,
    previousSpentCents: input.previousSpentCents,
    changePct,
    incomeCents: input.incomeCents,
    topCategories: [...byCategory.entries()]
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name))
      .slice(0, TOP),
    upcoming: input.upcoming,
  };
}

/** Mondays in the morning (UTC 07-13, i.e. 8-15 h in Spain). */
export function isDigestWindow(now: Date): boolean {
  return now.getUTCDay() === 1 && now.getUTCHours() >= 7 && now.getUTCHours() < 13;
}
