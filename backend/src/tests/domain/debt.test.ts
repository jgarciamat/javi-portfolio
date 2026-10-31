import { RecurringRule } from '@domain/model/RecurringRule';
import { Asset } from '@domain/ports/repositories';
import {
  coversInterest,
  debtDueOn,
  debtOwedAt,
  monthlyInterest,
  paymentsToPayOff,
} from '@domain/services/debt';
import { assetTotalsAt } from '@domain/services/net-worth';
import { dateInPeriod } from '@domain/shared/period';

const values = [
  { date: '2026-01-10', valueCents: 1000 },
  { date: '2026-03-10', valueCents: 900 },
];
const pay = (date: string, amountCents = 100) => ({ date, amountCents });

describe('debt owed', () => {
  it('is the latest value minus the payments after it, up to the day', () => {
    const payments = [pay('2026-02-05'), pay('2026-01-05'), pay('2026-03-05'), pay('2026-04-05')];
    expect(debtOwedAt(values, payments, null, '2026-01-09')).toBe(0);
    // A payment before the value is already in it.
    expect(debtOwedAt(values, payments, null, '2026-01-10')).toBe(1000);
    expect(debtOwedAt(values, payments, null, '2026-02-05')).toBe(900);
    expect(debtOwedAt(values, payments, null, '2026-03-09')).toBe(800);
    // A new value is the new starting point (the March payment came before it).
    expect(debtOwedAt(values, payments, null, '2026-03-31')).toBe(900);
    expect(debtOwedAt(values, payments, null, '2026-04-05')).toBe(800);
  });

  it('never goes below zero, and a payment on the day of a value is in the value', () => {
    expect(debtOwedAt(values, [pay('2026-02-01', 5000)], null, '2026-02-02')).toBe(0);
    expect(debtOwedAt(values, [pay('2026-03-10', 500)], null, '2026-03-10')).toBe(900);
  });

  it('with a rate each payment first pays the month’s interest', () => {
    expect(monthlyInterest(1000, 12)).toBe(10);
    expect(monthlyInterest(1000, null)).toBe(0);
    expect(monthlyInterest(1000, 0)).toBe(0);
    expect(debtOwedAt(values, [pay('2026-02-05')], 12, '2026-02-05')).toBe(910);
    // A payment smaller than the interest makes the debt grow.
    expect(debtOwedAt(values, [pay('2026-02-05', 4)], 12, '2026-02-05')).toBe(1006);
  });

  it('the most a payment can be is what is owed before it plus its interest', () => {
    const payments = [pay('2026-02-05'), pay('2026-02-20')];
    expect(debtDueOn(values, payments, null, '2026-02-20')).toBe(900);
    expect(debtDueOn(values, payments, 12, '2026-02-20')).toBe(919);
    expect(debtDueOn(values, payments, null, '2026-01-01')).toBe(0);
  });

  it('counts the payments left to pay it off', () => {
    expect(paymentsToPayOff(0, null, 100)).toBe(0);
    expect(paymentsToPayOff(1000, null, 300)).toBe(4);
    expect(paymentsToPayOff(1000, 12, 510)).toBe(2);
    // The payment does not cover the interest: never.
    expect(paymentsToPayOff(1000, 12, 10)).toBeNull();
    // Over 50 years is not a payoff either.
    expect(paymentsToPayOff(1_000_000, null, 1)).toBeNull();
    expect(paymentsToPayOff(600, null, 1)).toBe(600);
  });

  it('tells whether the payment covers the interest', () => {
    expect(coversInterest(1000, 12, 11)).toBe(true);
    expect(coversInterest(1000, 12, 10)).toBe(false);
    expect(coversInterest(0, 12, 0)).toBe(true);
    expect(coversInterest(1000, null, 1)).toBe(true);
  });
});

describe('net worth with debts paid every month', () => {
  const asset = (id: string, kind: Asset['kind'], interestRate: number | null = null): Asset => ({
    id,
    userId: 'u',
    name: id,
    kind,
    interestRate,
    minPaymentCents: null,
    debtType: kind === 'debt' ? 'mortgage' : null,
    initialCents: null,
    paymentRuleId: kind === 'debt' ? 'r' : null,
    paymentEnd: null,
    createdAt: '2026-01-01T00:00:00Z',
  });

  it('takes each month what was owed after its payments', () => {
    const assets = [asset('loan', 'debt'), asset('fund', 'investment')];
    const all = [
      { assetId: 'loan', date: '2026-01-10', valueCents: 1000 },
      { assetId: 'fund', date: '2026-01-10', valueCents: 50 },
    ];
    const payments = new Map([['loan', [pay('2026-02-05'), pay('2026-03-05')]]]);
    expect(assetTotalsAt(assets, all, '2026-02-28', payments)).toEqual({
      assetsCents: 50,
      debtsCents: 900,
    });
    expect(assetTotalsAt(assets, all, '2026-03-31', payments).debtsCents).toBe(800);
    expect(assetTotalsAt(assets, all, '2026-03-31').debtsCents).toBe(1000);
  });
});

describe('dateInPeriod', () => {
  it('is the day in the calendar month of the period', () => {
    expect(dateInPeriod({ year: 2026, month: 3 }, 20)).toBe('2026-03-20');
    expect(dateInPeriod({ year: 2026, month: 2 }, 31)).toBe('2026-02-28');
    expect(dateInPeriod({ year: 2028, month: 2 }, 30)).toBe('2028-02-29');
  });

  it('with a custom start day it stays inside the period', () => {
    // 5 Mar – 4 Apr is March.
    expect(dateInPeriod({ year: 2026, month: 3 }, 10, 5)).toBe('2026-03-10');
    expect(dateInPeriod({ year: 2026, month: 3 }, 2, 5)).toBe('2026-04-02');
    // 25 Mar – 24 Apr is April.
    expect(dateInPeriod({ year: 2026, month: 4 }, 28, 25)).toBe('2026-03-28');
    expect(dateInPeriod({ year: 2026, month: 4 }, 31, 25)).toBe('2026-03-31');
    expect(dateInPeriod({ year: 2026, month: 5 }, 31, 25)).toBe('2026-04-30');
    expect(dateInPeriod({ year: 2026, month: 4 }, 3, 25)).toBe('2026-04-03');
  });
});

describe('RecurringRule day', () => {
  const base = {
    description: 'Cuota',
    amountCents: 100,
    type: 'EXPENSE',
    categoryId: 'c',
    start: { year: 2026, month: 1 },
  };

  it('is optional, between 1 and 31, and changes the movements', () => {
    const rule = RecurringRule.create('u', base);
    expect(rule.day).toBeNull();
    const withDay = rule.update({ day: 15 });
    expect(withDay.day).toBe(15);
    expect(RecurringRule.contentChanged(rule, withDay)).toBe(true);
    expect(RecurringRule.contentChanged(withDay, withDay.update({}))).toBe(false);
    for (const day of [0, 32, 1.5]) {
      expect(() => RecurringRule.create('u', { ...base, day })).toThrow('El día');
    }
    expect(RecurringRule.create('u', { ...base, day: 31 }).toPrimitives().day).toBe(31);
  });
});
