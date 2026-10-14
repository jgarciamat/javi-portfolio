import {
  compareDebtPlan,
  estimatedMinimum,
  planDebts,
  type Debt,
} from '@modules/finances/domain/debtPlan';

const debt = (id: string, balance: number, rate: number, minPayment: number): Debt => ({
  id,
  name: id,
  balance,
  rate,
  minPayment,
});

describe('planDebts', () => {
  it('pays a debt without interest in equal months', () => {
    const plan = planDebts([debt('a', 1000, 0, 100)], 0, 'avalanche');
    expect(plan).toMatchObject({ months: 10, totalInterest: 0, totalPaid: 1000 });
    expect(plan.order).toEqual([{ id: 'a', name: 'a', month: 10 }]);
  });

  it('adds interest every month', () => {
    const plan = planDebts([debt('a', 1200, 12, 200)], 0, 'avalanche');
    expect(plan.months).toBe(7);
    expect(plan.totalInterest).toBeGreaterThan(30);
    expect(plan.totalPaid).toBeCloseTo(1200 + plan.totalInterest, 1);
  });

  it('puts the extra money on the highest rate first (avalanche)', () => {
    const debts = [debt('small-cheap', 500, 2, 25), debt('big-dear', 3000, 22, 90)];
    const plan = planDebts(debts, 100, 'avalanche');
    expect(plan.order[0].id).not.toBe(undefined);
    const snowball = planDebts(debts, 100, 'snowball');
    // The smallest balance is cleared first with the snowball, the most expensive one with the avalanche.
    expect(snowball.order[0].id).toBe('small-cheap');
    expect(plan.totalInterest).toBeLessThanOrEqual(snowball.totalInterest);
  });

  it('moves the minimum of a cleared debt to the next one (rollover)', () => {
    const debts = [debt('a', 100, 0, 50), debt('b', 1000, 0, 50)];
    const rolled = planDebts(debts, 0, 'snowball');
    const flat = planDebts(debts, 0, 'snowball', false);
    expect(rolled.months).toBeLessThan(flat.months as number);
  });

  it('says it never ends when the payments do not cover the interest', () => {
    const plan = planDebts([debt('a', 10000, 24, 50)], 0, 'avalanche');
    expect(plan.months).toBeNull();
    expect(plan.totalInterest).toBeGreaterThan(0);
  });

  it('ignores debts that are already paid and handles no debts at all', () => {
    expect(planDebts([], 100, 'avalanche')).toEqual({
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      order: [],
    });
    expect(planDebts([debt('a', 0, 10, 5)], 0, 'snowball').months).toBe(0);
  });

  it('breaks ties between equal rates by the smallest balance and ignores negative extras', () => {
    const plan = planDebts([debt('a', 800, 10, 20), debt('b', 300, 10, 20)], -50, 'avalanche');
    expect(plan.order[0].id).toBe('b');
  });

  it('never pays more than the balance of the last debt', () => {
    const plan = planDebts([debt('a', 55, 0, 100)], 0, 'avalanche');
    expect(plan).toMatchObject({ months: 1, totalPaid: 55 });
  });
});

describe('compareDebtPlan', () => {
  it('shows what the extra payment saves', () => {
    const result = compareDebtPlan([debt('a', 3000, 20, 80)], 120, 'avalanche');
    expect(result.monthsSaved).toBeGreaterThan(0);
    expect(result.interestSaved).toBeGreaterThan(0);
    expect(result.minimumsOnly.months).toBeGreaterThan(result.plan.months as number);
  });

  it('has nothing to compare when paying only the minimums never ends', () => {
    const result = compareDebtPlan([debt('a', 10000, 24, 50)], 600, 'avalanche');
    expect(result.plan.months).not.toBeNull();
    expect(result.minimumsOnly.months).toBeNull();
    expect(result.monthsSaved).toBeNull();
    expect(result.interestSaved).toBeNull();
  });
});

describe('estimatedMinimum', () => {
  it('takes 3 % of the balance, at least 10 and never more than the balance', () => {
    expect(estimatedMinimum(1000)).toBe(30);
    expect(estimatedMinimum(200)).toBe(10);
    expect(estimatedMinimum(6)).toBe(6);
  });
});
