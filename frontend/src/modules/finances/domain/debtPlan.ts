/** A debt with what the payoff plan needs: balance, yearly interest (%) and minimum payment. */
export interface Debt {
  id: string;
  name: string;
  balance: number;
  /** Yearly interest rate in percent. */
  rate: number;
  /** Minimum monthly payment. */
  minPayment: number;
}

export type Strategy = 'avalanche' | 'snowball';

export interface DebtPlan {
  /** Months until every debt is paid, or null if the payments never get there. */
  months: number | null;
  totalInterest: number;
  totalPaid: number;
  /** The month (1 = this one) in which each debt is cleared, in the order they are cleared. */
  order: { id: string; name: string; month: number }[];
}

const MAX_MONTHS = 600;
const EPS = 0.005;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The minimum to assume when the person has not said it: 3 % of the balance, at least 10. */
export const estimatedMinimum = (balance: number): number =>
  Math.min(balance, Math.max(10, round2(balance * 0.03)));

/**
 * Month-by-month simulation. Every month the interest is added, the minimums are paid and
 * everything else (`extra` plus the minimums of the debts already cleared when `rollover`)
 * goes to the debt the strategy chooses: the highest rate (avalanche) or the smallest
 * balance (snowball).
 */
export function planDebts(
  debts: Debt[],
  extra: number,
  strategy: Strategy,
  rollover = true
): DebtPlan {
  const live = debts
    .filter((d) => d.balance > EPS)
    .map((d) => ({ ...d, balance: d.balance, min: Math.max(0, d.minPayment) }));
  const budget = live.reduce((sum, d) => sum + d.min, 0) + Math.max(0, extra);
  let interest = 0;
  let paid = 0;
  const order: DebtPlan['order'] = [];

  for (let month = 1; month <= MAX_MONTHS; month++) {
    if (live.every((d) => d.balance <= EPS)) {
      return { months: month - 1, totalInterest: round2(interest), totalPaid: round2(paid), order };
    }
    for (const d of live) {
      if (d.balance <= EPS) continue;
      const charge = (d.balance * d.rate) / 100 / 12;
      d.balance += charge;
      interest += charge;
    }
    let remaining = rollover
      ? budget
      : live.reduce((sum, d) => sum + (d.balance > EPS ? d.min : 0), 0) + Math.max(0, extra);
    for (const d of live) {
      if (d.balance <= EPS) continue;
      const pay = Math.min(d.min, d.balance, remaining);
      d.balance -= pay;
      remaining -= pay;
      paid += pay;
    }
    const targets = live
      .filter((d) => d.balance > EPS)
      .sort((a, b) =>
        strategy === 'avalanche' ? b.rate - a.rate || a.balance - b.balance : a.balance - b.balance
      );
    for (const d of targets) {
      if (remaining <= EPS) break;
      const pay = Math.min(d.balance, remaining);
      d.balance -= pay;
      remaining -= pay;
      paid += pay;
    }
    for (const d of live) {
      if (d.balance <= EPS && !order.some((o) => o.id === d.id)) {
        d.balance = 0;
        order.push({ id: d.id, name: d.name, month });
      }
    }
  }
  return { months: null, totalInterest: round2(interest), totalPaid: round2(paid), order };
}

export interface DebtComparison {
  plan: DebtPlan;
  /** Paying only the minimums, without moving the money of cleared debts to the others. */
  minimumsOnly: DebtPlan;
  /** Interest saved against paying only the minimums (null when that never ends). */
  interestSaved: number | null;
  /** Months saved against paying only the minimums (null when that never ends). */
  monthsSaved: number | null;
}

export function compareDebtPlan(debts: Debt[], extra: number, strategy: Strategy): DebtComparison {
  const plan = planDebts(debts, extra, strategy);
  const minimumsOnly = planDebts(debts, 0, strategy, false);
  const finite = plan.months !== null && minimumsOnly.months !== null;
  return {
    plan,
    minimumsOnly,
    interestSaved: finite ? round2(minimumsOnly.totalInterest - plan.totalInterest) : null,
    monthsSaved: finite ? (minimumsOnly.months as number) - (plan.months as number) : null,
  };
}
