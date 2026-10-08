import { Account } from '@domain/model/Account';
import { Category } from '@domain/model/Category';
import { CustomAlert } from '@domain/model/CustomAlert';
import { computeGoalProgress, Goal } from '@domain/model/Goal';
import { RecurringRule } from '@domain/model/RecurringRule';
import { Transaction } from '@domain/model/Transaction';
import { Transfer } from '@domain/model/Transfer';
import { User } from '@domain/model/User';
import { applySettingsChanges, defaultSettings } from '@domain/model/UserSettings';

const base = {
  userId: 'u1',
  accountId: 'a1',
  categoryId: 'c1',
  description: '  Cena  ',
  amountCents: 2500,
  type: 'expense',
  date: '2026-03-30',
};

describe('Transaction', () => {
  it('normalises input and computes its period', () => {
    const tx = Transaction.create(base, 25);
    expect(tx.description).toBe('Cena');
    expect(tx.type).toBe('EXPENSE');
    expect(tx.period).toEqual({ year: 2026, month: 4 });
    expect(tx.descriptionKey).toBe('cena');
  });

  it('rejects invalid values', () => {
    expect(() => Transaction.create({ ...base, amountCents: 0 }, 1)).toThrow('mayor que 0');
    expect(() => Transaction.create({ ...base, description: ' ' }, 1)).toThrow('descripción');
    expect(() => Transaction.create({ ...base, type: 'GIFT' }, 1)).toThrow('Tipo de movimiento');
    expect(() => Transaction.create({ ...base, notes: 'x'.repeat(1001) }, 1)).toThrow('notas');
  });

  it('update returns a new instance and recalculates the period', () => {
    const tx = Transaction.create(base, 1);
    const moved = tx.update({ date: '2026-01-02', notes: '' }, 1);
    expect(moved.period).toEqual({ year: 2026, month: 1 });
    expect(moved.notes).toBeNull();
    expect(tx.period).toEqual({ year: 2026, month: 3 });
  });
});

describe('RecurringRule', () => {
  const rule = (overrides: Record<string, unknown> = {}) =>
    RecurringRule.create('u1', {
      description: 'Alquiler',
      amountCents: 80000,
      type: 'EXPENSE',
      categoryId: 'c1',
      start: { year: 2026, month: 1 },
      ...overrides,
    });

  it('applies monthly between start and end', () => {
    const r = rule({ end: { year: 2026, month: 3 } });
    expect(r.appliesTo({ year: 2025, month: 12 })).toBe(false);
    expect(r.appliesTo({ year: 2026, month: 2 })).toBe(true);
    expect(r.appliesTo({ year: 2026, month: 4 })).toBe(false);
  });

  it.each([
    ['bimonthly', [1, 3, 5]],
    ['quarterly', [1, 4]],
    ['yearly', [1]],
  ])('%s fires on the right months', (frequency, months) => {
    const periods = rule({ frequency }).periodsWithin(
      { year: 2026, month: 1 },
      { year: 2026, month: 6 }
    );
    expect(periods.map((p) => p.month)).toEqual(months);
  });

  it('inactive rules never apply; update validates', () => {
    expect(rule({ active: false }).appliesTo({ year: 2026, month: 1 })).toBe(false);
    expect(() => rule().update({ amountCents: -1 })).toThrow();
    expect(() => rule().update({ end: { year: 2025, month: 1 } })).toThrow('anterior');
    expect(() => rule().update({ frequency: 'daily' })).toThrow('Frecuencia');
  });

  it('detects content changes', () => {
    const r = rule();
    expect(RecurringRule.contentChanged(r, r.update({ amountCents: 1 }))).toBe(true);
    expect(RecurringRule.contentChanged(r, r.update({ active: false }))).toBe(false);
  });
});

describe('Category, Account, Transfer, CustomAlert', () => {
  it('validate their fields', () => {
    expect(() => Category.create({ userId: 'u', name: '' })).toThrow();
    expect(() => Category.create({ userId: 'u', name: 'x', color: 'red' })).toThrow('Color');
    expect(Category.create({ userId: 'u', name: ' Mascotas ' }).name).toBe('Mascotas');
    expect(() => Account.create('u', { name: 'x', type: 'crypto' })).toThrow('Tipo de cuenta');
    expect(
      Account.create('u', { name: 'Tarjeta', type: 'card', initialBalanceCents: -5000 })
        .initialBalanceCents
    ).toBe(-5000);
    expect(() =>
      Transfer.create({
        userId: 'u',
        fromAccountId: 'a',
        toAccountId: 'a',
        amountCents: 1,
        date: '2026-01-01',
      })
    ).toThrow('distintas');
    expect(() =>
      CustomAlert.create('u', { name: 'x', metric: 'category_pct', operator: 'gte', threshold: 1 })
    ).toThrow('categoría');
    const alert = CustomAlert.create('u', {
      name: 'x',
      metric: 'balance_amount',
      operator: 'lte',
      threshold: -100,
    });
    expect(alert.toPrimitives().threshold).toBe(-100);
  });
});

describe('Goal progress', () => {
  const goal = Goal.create('u', {
    name: 'Coche',
    targetCents: 120000,
    targetDate: '2026-12-31',
    categoryId: 'c',
  }).toPrimitives();

  it('computes saved, remaining and monthly need', () => {
    expect(computeGoalProgress(goal, 30000, '2026-07-10')).toEqual({
      savedCents: 30000,
      remainingCents: 90000,
      percentage: 25,
      monthsLeft: 6,
      monthlyNeededCents: 15000,
      completed: false,
    });
  });

  it('caps at 100% and handles past dates', () => {
    const done = computeGoalProgress(goal, 200000, '2027-02-01');
    expect(done).toMatchObject({
      percentage: 100,
      remainingCents: 0,
      monthsLeft: 0,
      completed: true,
    });
  });
});

describe('User', () => {
  it('normalises e-mail and bumps the session version on password change', () => {
    const user = User.register({ email: ' Ana@Example.COM ', name: 'Ana', passwordHash: 'h' });
    expect(user.email).toBe('ana@example.com');
    expect(user.withPasswordHash('h2').sessionVersion).toBe(1);
    expect(() => User.register({ email: 'not-an-email', name: 'x', passwordHash: null })).toThrow(
      'Email'
    );
  });

  it('only drops passwords that were never verified', () => {
    const unverified = User.register({ email: 'a@b.co', name: 'x', passwordHash: 'h' });
    expect(unverified.dropUnverifiedPassword().passwordHash).toBeNull();
    const verified = unverified.markEmailVerified();
    expect(verified.dropUnverifiedPassword().passwordHash).toBe('h');
  });
});

describe('UserSettings', () => {
  it('validates changes', () => {
    const s = defaultSettings('u', 'en');
    expect(s.locale).toBe('en');
    expect(applySettingsChanges(s, { monthStartDay: 25 }).monthStartDay).toBe(25);
    expect(() => applySettingsChanges(s, { monthStartDay: 29 })).toThrow();
    expect(() => applySettingsChanges(s, { currency: 'BTC' as never })).toThrow('Moneda');
  });
});
