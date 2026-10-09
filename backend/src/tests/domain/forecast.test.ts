import { RecurringRule } from '@domain/model/RecurringRule';
import {
  averageVariable,
  firstShortfall,
  inclusiveDays,
  projectMonths,
  safeToSpend,
} from '@domain/services/forecast';

const rule = (
  amountCents: number,
  type: 'INCOME' | 'EXPENSE' | 'SAVING',
  extra: Record<string, unknown> = {}
) =>
  RecurringRule.create('u1', {
    description: 'r',
    amountCents,
    type,
    categoryId: 'c',
    start: { year: 2026, month: 1 },
    ...extra,
  });

describe('inclusiveDays', () => {
  it('counts both ends and never goes below one', () => {
    expect(inclusiveDays('2026-04-10', '2026-04-30')).toBe(21);
    expect(inclusiveDays('2026-04-30', '2026-04-30')).toBe(1);
    expect(inclusiveDays('2026-05-02', '2026-04-30')).toBe(1);
  });
});

describe('averageVariable', () => {
  const tx = (type: string, amountCents: number, recurringRuleId: string | null = null) => ({
    type,
    amountCents,
    recurringRuleId,
  });

  it('averages only non-recurring movements over the periods that have data', () => {
    const result = averageVariable([
      [tx('EXPENSE', 10000), tx('EXPENSE', 99999, 'rule'), tx('INCOME', 20000)],
      [],
      [tx('EXPENSE', 20000), tx('SAVING', 5000)],
    ]);
    expect(result).toEqual({ expenseCents: 15000, incomeCents: 10000 });
  });

  it('is zero without history', () => {
    expect(averageVariable([[], [], []])).toEqual({ expenseCents: 0, incomeCents: 0 });
  });
});

describe('safeToSpend', () => {
  const base = {
    today: '2026-04-11',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    variable: { expenseCents: 30000, incomeCents: 0 },
  };

  it('splits what is left over the remaining days', () => {
    const r = safeToSpend({ ...base, availableCents: 40000 });
    // 20 days left of 30: usual spending still to come = 300 € · 20/30 = 200 €.
    expect(r).toEqual({
      availableCents: 40000,
      daysLeft: 20,
      dailyCents: 2000,
      projectedEndCents: 20000,
      status: 'ok',
    });
  });

  it('is "tight" when only a slower pace gets to the end of the month', () => {
    const r = safeToSpend({ ...base, availableCents: 10000 });
    expect(r.projectedEndCents).toBe(-10000);
    expect(r.status).toBe('tight');
    expect(r.dailyCents).toBe(500);
  });

  it('is "over" with nothing left and never offers a negative daily amount', () => {
    const r = safeToSpend({ ...base, availableCents: -5000 });
    expect(r.status).toBe('over');
    expect(r.dailyCents).toBe(0);
  });
});

describe('projectMonths', () => {
  const income = rule(200000, 'INCOME');
  const rent = rule(80000, 'EXPENSE');
  const saving = rule(10000, 'SAVING', { frequency: 'quarterly' });
  const ended = rule(5000, 'EXPENSE', { end: { year: 2026, month: 4 } });
  const input = {
    from: { year: 2026, month: 5 },
    months: 3,
    startAvailableCents: 50000,
    rules: [income, rent, saving, ended],
    variable: { expenseCents: 30000, incomeCents: 10000 },
    excludedRuleIds: new Set<string>(),
    skipped: new Map<string, ReadonlySet<number>>(),
  };

  it('chains the months from recurring rules plus the usual variable movements', () => {
    const months = projectMonths(input);
    expect(months).toHaveLength(3);
    // May: +2000 +100 variable income −800 rent −300 variable = +1000; the quarterly saving starts in
    // January, so it falls in April and July only.
    expect(months[0]).toMatchObject({
      year: 2026,
      month: 5,
      incomeCents: 210000,
      fixedExpenseCents: 80000,
      variableExpenseCents: 30000,
      savingCents: 0,
      balanceCents: 100000,
      endAvailableCents: 150000,
    });
    expect(months[2]).toMatchObject({ month: 7, savingCents: 10000, endAvailableCents: 340000 });
  });

  it('leaves out excluded rules and months the user deleted', () => {
    const skipped = new Map([[rent.id, new Set([2026 * 12 + 5])]]); // June
    const without = projectMonths({ ...input, excludedRuleIds: new Set([income.id]), skipped });
    expect(without[0].incomeCents).toBe(10000);
    expect(without[1].fixedExpenseCents).toBe(0);
    expect(without[0].fixedExpenseCents).toBe(80000);
  });

  it('finds the first month that ends below zero', () => {
    const tight = projectMonths({ ...input, startAvailableCents: -250000, months: 2 });
    expect(firstShortfall(tight)).toEqual({ year: 2026, month: 5 });
    expect(firstShortfall(projectMonths(input))).toBeNull();
  });
});
