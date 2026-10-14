import {
  challengeProgress,
  healthScore,
  levelOf,
  noSpendDays,
  type HealthInput,
} from '@modules/finances/domain/health';
import * as f from '@test-utils/fixtures';

const base: HealthInput = {
  income: 2000,
  saving: 400,
  monthlyExpenses: 1000,
  liquid: 6000,
  debt: 0,
  budgets: [f.budgetLine({ level: 'ok' })],
};

describe('healthScore', () => {
  it('gives 100 for 20 % saved, six months of cushion, no debt and budgets kept', () => {
    const health = healthScore(base);
    expect(health.score).toBe(100);
    expect(health.level).toBe('excellent');
    expect(health.pillars.map((p) => p.id)).toEqual(['saving', 'cushion', 'debt', 'budgets']);
  });

  it('measures each pillar by its own scale', () => {
    const health = healthScore({
      income: 2000,
      saving: 100,
      monthlyExpenses: 1000,
      liquid: 3000,
      debt: 12000,
      budgets: [f.budgetLine({ level: 'ok' }), f.budgetLine({ level: 'danger' })],
    });
    const points = Object.fromEntries(health.pillars.map((p) => [p.id, p.points]));
    expect(points.saving).toBe(6.3); // 5 % saved of 20 %
    expect(points.cushion).toBe(12.5); // 3 of 6 months
    expect(points.debt).toBe(13.9); // debts are 50 % of a year of income
    expect(points.budgets).toBe(12.5);
    expect(health.score).toBe(Math.round(6.3 + 12.5 + 13.9 + 12.5));
  });

  it('leaves out what cannot be measured and scales the rest', () => {
    const health = healthScore({ ...base, debt: null, budgets: [] });
    expect(health.pillars.map((p) => p.id)).toEqual(['saving', 'cushion']);
    expect(health.score).toBe(100);
  });

  it('is fragile without income, savings or a cushion', () => {
    const health = healthScore({
      income: 0,
      saving: 0,
      monthlyExpenses: 0,
      liquid: 0,
      debt: 500,
      budgets: [],
    });
    expect(health.score).toBe(0);
    expect(health.level).toBe('fragile');
    expect(health.pillars.find((p) => p.id === 'debt')?.value).toBe(100);
  });

  it('counts money saved but no expenses as a full cushion and ignores overdrafts', () => {
    expect(healthScore({ ...base, monthlyExpenses: 0, liquid: 10 }).pillars[1].points).toBe(25);
    expect(healthScore({ ...base, liquid: -500 }).pillars[1]).toMatchObject({
      points: 0,
      value: 0,
    });
    expect(healthScore({ ...base, saving: -100 }).pillars[0].points).toBe(0);
  });

  it('classifies the score', () => {
    expect(levelOf(80)).toBe('excellent');
    expect(levelOf(60)).toBe('good');
    expect(levelOf(40)).toBe('improvable');
    expect(levelOf(39)).toBe('fragile');
  });
});

describe('noSpendDays', () => {
  const tx = (date: string, type: 'EXPENSE' | 'INCOME' = 'EXPENSE') =>
    f.transaction({ date, type });

  it('counts the days without expenses and the current streak', () => {
    const result = noSpendDays(
      [tx('2026-03-02'), tx('2026-03-02'), tx('2026-03-05'), tx('2026-03-04', 'INCOME')],
      '2026-03-01',
      '2026-03-07'
    );
    expect(result).toEqual({ days: 5, streak: 2, elapsed: 7 });
  });

  it('is a clean streak without expenses and nothing before the period starts', () => {
    expect(noSpendDays([], '2026-03-01', '2026-03-03')).toEqual({ days: 3, streak: 3, elapsed: 3 });
    expect(noSpendDays([], '2026-03-10', '2026-03-01')).toEqual({ days: 0, streak: 0, elapsed: 0 });
  });
});

describe('challengeProgress', () => {
  const data = {
    noSpendDays: 5,
    income: 1000,
    saving: 150,
    budgets: [f.budgetLine({ level: 'ok' }), f.budgetLine({ level: 'danger' })],
  };

  it('tracks days without spending', () => {
    expect(challengeProgress('noSpend', data)).toEqual({ current: 5, target: 8, done: false });
    expect(challengeProgress('noSpend', { ...data, noSpendDays: 9 }).done).toBe(true);
  });

  it('tracks the savings rate', () => {
    expect(challengeProgress('save20', data)).toEqual({ current: 15, target: 20, done: false });
    expect(challengeProgress('save20', { ...data, saving: 300 }).done).toBe(true);
    expect(challengeProgress('save20', { ...data, income: 0, saving: -5 })).toMatchObject({
      current: 0,
      done: false,
    });
  });

  it('tracks the budgets kept', () => {
    expect(challengeProgress('budgets', data)).toEqual({ current: 1, target: 2, done: false });
    expect(challengeProgress('budgets', { ...data, budgets: [f.budgetLine()] }).done).toBe(true);
    expect(challengeProgress('budgets', { ...data, budgets: [] }).done).toBe(false);
  });
});
