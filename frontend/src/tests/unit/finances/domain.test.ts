import { buildAnnualChartData } from '@modules/finances/domain/annual';
import {
  ALERT_METRICS,
  alertInput,
  evaluateAlerts,
  isCategoryMetric,
  metricMeta,
} from '@modules/finances/domain/customAlerts';
import {
  emptyRuleForm,
  ruleToForm,
  validateRuleForm,
  type RuleFormState,
} from '@modules/finances/domain/recurringForm';
import { buildSummaryCards, savingsRateAccent } from '@modules/finances/domain/summaryCards';
import { amountSign, totalsByType } from '@modules/finances/domain/transactionTypes';
import type { CustomAlertMetric } from '@modules/finances/domain/types';
import { customAlert, rule, summary } from '@test-utils/fixtures';

describe('buildAnnualChartData', () => {
  it('sorts months and adds the totals', () => {
    const data = buildAnnualChartData({
      year: 2026,
      months: {
        2: { income: 100, expenses: 50, saving: 10, balance: 40 },
        1: { income: 300, expenses: 400, saving: 0, balance: -100 },
      },
    });
    expect(data.months.map((m) => m.month)).toEqual([1, 2]);
    expect(data.maxVal).toBe(400);
    expect(data.totals).toEqual({ income: 400, expenses: 450, saving: 10, balance: -60 });
  });

  it('handles a year without data', () => {
    expect(buildAnnualChartData(null)).toEqual({
      months: [],
      maxVal: 1,
      totals: { income: 0, expenses: 0, saving: 0, balance: 0 },
    });
  });
});

describe('custom alert metrics', () => {
  it('describes every metric', () => {
    expect(metricMeta('balance_amount')).toMatchObject({ unit: 'money', byCategory: false });
    expect(metricMeta('category_pct')).toMatchObject({ unit: 'percent', byCategory: true });
    expect(metricMeta('nope' as CustomAlertMetric)).toBe(ALERT_METRICS[0]);
    expect(isCategoryMetric('category_amount')).toBe(true);
    expect(isCategoryMetric('saving_pct')).toBe(false);
  });

  it('builds the input from the month and defaults missing figures', () => {
    expect(alertInput(null, null)).toEqual({
      totalExpenses: 0,
      totalIncome: 0,
      totalSaving: 0,
      balance: 0,
      carryover: 0,
      expensesByCategory: {},
    });
    expect(alertInput(summary(), 100).carryover).toBe(100);
  });

  it('ignores alerts with an unknown metric', () => {
    const odd = customAlert({ metric: 'unknown' as CustomAlertMetric });
    expect(evaluateAlerts([odd], alertInput(summary(), 0))).toEqual([]);
  });
});

describe('recurring rule form', () => {
  const valid: RuleFormState = {
    ...emptyRuleForm(new Date(2026, 2, 15)),
    description: ' Alquiler ',
    amount: '800,5',
    category: 'Vivienda',
  };

  it('starts on the first day of the current month', () => {
    expect(emptyRuleForm(new Date(2026, 2, 15)).startDate).toBe('2026-03-01');
    expect(emptyRuleForm().startDate).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('round-trips a rule with and without end', () => {
    expect(ruleToForm(rule({ endYear: 2027, endMonth: 6 }))).toMatchObject({
      startDate: '2026-01-01',
      hasEnd: true,
      endDate: '2027-06-01',
      amount: '800',
    });
    expect(ruleToForm(rule())).toMatchObject({ hasEnd: false, endDate: '' });
  });

  it('validates each field in order', () => {
    expect(validateRuleForm({ ...valid, description: ' ' })).toEqual({
      error: 'app.recurring.error.description',
    });
    expect(validateRuleForm({ ...valid, amount: '0' })).toEqual({
      error: 'app.recurring.error.amount',
    });
    expect(validateRuleForm({ ...valid, category: '' })).toEqual({
      error: 'app.recurring.error.category',
    });
    expect(validateRuleForm({ ...valid, startDate: '' })).toEqual({
      error: 'app.recurring.error.start',
    });
    expect(validateRuleForm({ ...valid, hasEnd: true, endDate: '2026-01-01' })).toEqual({
      error: 'app.recurring.error.end',
    });
  });

  it('builds the DTO', () => {
    expect(validateRuleForm(valid)).toEqual({
      dto: {
        description: 'Alquiler',
        amount: 800.5,
        type: 'EXPENSE',
        category: 'Vivienda',
        frequency: 'monthly',
        startYear: 2026,
        startMonth: 3,
        endYear: null,
        endMonth: null,
      },
    });
    expect(validateRuleForm({ ...valid, hasEnd: true, endDate: '2026-12-01' })).toMatchObject({
      dto: { endYear: 2026, endMonth: 12 },
    });
    expect(validateRuleForm({ ...valid, hasEnd: true, endDate: '' })).toMatchObject({
      dto: { endYear: null },
    });
  });
});

describe('summary cards', () => {
  const t = (key: string, vars?: Record<string, string | number>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key;
  const money = (n: number) => `${n}€`;
  const percent = (n: number) => `${n}%`;

  it('shows the savings rate when there is income', () => {
    const cards = buildSummaryCards(summary(), t, money, percent);
    expect(cards.map((c) => c.key)).toEqual(['balance', 'income', 'expenses', 'saving', 'rate']);
    expect(cards[4].value).toBe('10%');
  });

  it('explains the missing rate without income', () => {
    const cards = buildSummaryCards(summary({ totalIncome: 0 }), t, money, percent);
    expect(cards[4]).toMatchObject({ value: 'app.summary.savingsRate.noIncome', sub: '' });
  });

  it('colours the savings rate', () => {
    expect(savingsRateAccent(25)).toBe('#10b981');
    expect(savingsRateAccent(15)).toBe('#f59e0b');
    expect(savingsRateAccent(5)).toBe('#ef4444');
  });
});

describe('transaction types', () => {
  it('signs and totals movements', () => {
    expect(amountSign('EXPENSE')).toBe('−');
    expect(amountSign('SAVING')).toBe('+');
    expect(
      totalsByType([
        { type: 'INCOME', amount: 100 },
        { type: 'EXPENSE', amount: 30 },
        { type: 'SAVING', amount: 20 },
      ])
    ).toEqual({ income: 100, expenses: 30, saving: 20, balance: 50 });
  });
});
