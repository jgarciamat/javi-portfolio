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

type LiveDebt = Debt & { min: number };
/** What the simulation carries from month to month (summed in the same order, debt by debt). */
interface Totals {
  interest: number;
  paid: number;
  remaining: number;
}

const owes = (d: LiveDebt) => d.balance > EPS;

/** Adds a month of interest to every debt still owed. */
function chargeInterest(live: LiveDebt[], t: Totals): void {
  for (const d of live) {
    if (!owes(d)) continue;
    const charge = (d.balance * d.rate) / 100 / 12;
    d.balance += charge;
    t.interest += charge;
  }
}

/** Pays `amount` of a debt out of what is left this month. */
function pay(d: LiveDebt, amount: number, t: Totals): void {
  d.balance -= amount;
  t.remaining -= amount;
  t.paid += amount;
}

/** The highest rate first (avalanche) or the smallest balance first (snowball). */
const byStrategy = (strategy: Strategy) => (a: LiveDebt, b: LiveDebt) =>
  strategy === 'avalanche' ? b.rate - a.rate || a.balance - b.balance : a.balance - b.balance;

/** One month: interest, the minimums, and what is left to the debts the strategy chooses. */
function simulateMonth(
  live: LiveDebt[],
  strategy: Strategy,
  monthBudget: () => number,
  t: Totals
): void {
  chargeInterest(live, t);
  t.remaining = monthBudget();
  for (const d of live) {
    if (!owes(d)) continue;
    pay(d, Math.min(d.min, d.balance, t.remaining), t);
  }
  const targets = live.filter(owes).sort(byStrategy(strategy));
  for (const d of targets) {
    if (t.remaining <= EPS) break;
    pay(d, Math.min(d.balance, t.remaining), t);
  }
}

/** Notes the debts cleared this month (once each), leaving their balance at exactly zero. */
function recordCleared(live: LiveDebt[], order: DebtPlan['order'], month: number): void {
  for (const d of live) {
    if (d.balance <= EPS && !order.some((o) => o.id === d.id)) {
      d.balance = 0;
      order.push({ id: d.id, name: d.name, month });
    }
  }
}

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
  const live: LiveDebt[] = debts
    .filter((d) => d.balance > EPS)
    .map((d) => ({ ...d, balance: d.balance, min: Math.max(0, d.minPayment) }));
  const budget = live.reduce((sum, d) => sum + d.min, 0) + Math.max(0, extra);
  const t: Totals = { interest: 0, paid: 0, remaining: 0 };
  const order: DebtPlan['order'] = [];
  // Without rollover only the minimums of the debts still owed (after interest) are paid.
  const monthBudget = () =>
    rollover
      ? budget
      : live.reduce((sum, d) => sum + (owes(d) ? d.min : 0), 0) + Math.max(0, extra);

  for (let month = 1; month <= MAX_MONTHS; month++) {
    if (live.every((d) => d.balance <= EPS)) {
      return {
        months: month - 1,
        totalInterest: round2(t.interest),
        totalPaid: round2(t.paid),
        order,
      };
    }
    simulateMonth(live, strategy, monthBudget, t);
    recordCleared(live, order, month);
  }
  return { months: null, totalInterest: round2(t.interest), totalPaid: round2(t.paid), order };
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
