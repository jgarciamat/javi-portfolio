import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@domain/errors';
import { Account } from '@domain/model/Account';
import { Category } from '@domain/model/Category';
import { CategoryBudget } from '@domain/model/CategoryBudget';
import { CustomAlert, type CustomAlertInput } from '@domain/model/CustomAlert';
import { Goal } from '@domain/model/Goal';
import { RecurringRule } from '@domain/model/RecurringRule';
import { emptySubscription, planOf } from '@domain/model/Subscription';
import { Transaction } from '@domain/model/Transaction';
import { balanceEffect, parseTransactionType } from '@domain/model/TransactionType';
import { Transfer } from '@domain/model/Transfer';
import { passwordProblems } from '@domain/shared/password-policy';

const NOW = new Date('2026-03-15T12:00:00Z');
const long = (n: number) => 'x'.repeat(n);

describe('domain errors', () => {
  it('have a default message and code', () => {
    expect(new NotFoundError()).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Recurso no encontrado',
    });
    expect(new UnauthorizedError()).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'No autorizado',
    });
    expect(new ForbiddenError()).toMatchObject({ code: 'FORBIDDEN', message: 'Acceso denegado' });
    expect(new ConflictError('x')).toMatchObject({ code: 'CONFLICT' });
    expect(new ValidationError('x')).toMatchObject({
      code: 'VALIDATION_ERROR',
      name: 'ValidationError',
    });
  });
});

describe('Account', () => {
  const account = Account.create('u', { name: 'Banco' }, NOW);

  it.each([
    ['an empty name', { name: '  ' }, 'vacío'],
    ['a long name', { name: long(51) }, 'superar 50'],
    ['a fractional balance', { name: 'x', initialBalanceCents: 1.5 }, 'Saldo inicial inválido'],
    ['a bad colour', { name: 'x', color: 'red' }, 'Color inválido'],
  ])('rejects %s', (_, input, message) => {
    expect(() => Account.create('u', input)).toThrow(message);
  });

  it('updates each field and keeps the icon when it is cleared', () => {
    const updated = account
      .update({ type: 'savings', initialBalanceCents: 500, color: '#000000', icon: '🐷' })
      .update({ icon: '  ' });
    expect(updated.toPrimitives()).toMatchObject({
      type: 'savings',
      initialBalanceCents: 500,
      color: '#000000',
      icon: '🐷',
    });
  });
});

describe('Category', () => {
  it('rejects long names and icons', () => {
    expect(() => Category.create({ userId: 'u', name: long(51) })).toThrow('superar 50');
    expect(() => Category.create({ userId: 'u', name: 'x', icon: '🍕🍕🍕🍕🍕🍕🍕🍕🍕' })).toThrow(
      'Icono demasiado largo'
    );
  });

  it('updates name, colour and icon', () => {
    const updated = Category.create({ userId: 'u', name: 'Ocio' }).update({
      name: 'Cine',
      color: '#112233',
      icon: '🎬',
    });
    expect(updated.toPrimitives()).toMatchObject({ name: 'Cine', color: '#112233', icon: '🎬' });
  });
});

describe('CustomAlert', () => {
  const valid: CustomAlertInput = {
    name: 'Gasto',
    metric: 'expenses_pct',
    operator: 'gte',
    threshold: 80,
  };

  it.each<[string, CustomAlertInput, string]>([
    ['no name', { ...valid, name: undefined }, 'vacío'],
    ['a long name', { ...valid, name: long(81) }, 'demasiado largo'],
    ['an unknown metric', { ...valid, metric: 'mood' }, 'Métrica inválida'],
    ['an unknown operator', { ...valid, operator: 'eq' }, 'Operador inválido'],
    ['a threshold that is not a number', { ...valid, threshold: Number.NaN }, 'umbral debe ser'],
    ['a negative percentage', { ...valid, threshold: -1 }, 'no puede ser negativo'],
    ['a bad colour', { ...valid, color: 'blue' }, 'Color inválido'],
  ])('rejects %s', (_, input, message) => {
    expect(() => CustomAlert.create('u', input, NOW)).toThrow(message);
  });

  it('updates every field', () => {
    const updated = CustomAlert.create('u', valid, NOW).update({
      name: 'Ocio',
      metric: 'category_amount',
      operator: 'lte',
      categoryId: 'c1',
      color: '#abcdef',
    });
    expect(updated.toPrimitives()).toMatchObject({
      name: 'Ocio',
      metric: 'category_amount',
      operator: 'lte',
      categoryId: 'c1',
      color: '#abcdef',
    });
  });
});

describe('Goal', () => {
  const input = { name: 'Viaje', targetCents: 1000, categoryId: 'c1' };

  it.each([
    ['an empty name', { ...input, name: ' ' }, 'vacío'],
    ['a long name', { ...input, name: long(81) }, 'demasiado largo'],
    ['a bad colour', { ...input, color: 'green' }, 'Color inválido'],
  ])('rejects %s', (_, goal, message) => {
    expect(() => Goal.create('u', goal, NOW)).toThrow(message);
  });

  it('updates every field and falls back to the default icon', () => {
    const updated = Goal.create('u', input, NOW).update({
      name: 'Coche',
      targetCents: 5000,
      targetDate: '2027-01-01',
      categoryId: 'c2',
      icon: ' ',
      color: '#123456',
    });
    expect(updated.toPrimitives()).toMatchObject({
      name: 'Coche',
      targetCents: 5000,
      targetDate: '2027-01-01',
      categoryId: 'c2',
      icon: '🎯',
      color: '#123456',
    });
  });
});

describe('RecurringRule', () => {
  const input = {
    description: 'Gimnasio',
    amountCents: 3000,
    type: 'EXPENSE',
    categoryId: 'c1',
    start: { year: 2026, month: 3 },
  };

  it('rejects empty or long descriptions', () => {
    expect(() => RecurringRule.create('u', { ...input, description: ' ' }, NOW)).toThrow('vacía');
    expect(() => RecurringRule.create('u', { ...input, description: long(201) }, NOW)).toThrow(
      'demasiado larga'
    );
  });

  it('updates type and category', () => {
    const updated = RecurringRule.create('u', input, NOW).update({
      type: 'INCOME',
      categoryId: 'c2',
    });
    expect(updated.toPrimitives()).toMatchObject({ type: 'INCOME', categoryId: 'c2' });
  });
});

describe('Transaction', () => {
  const input = {
    userId: 'u',
    accountId: 'a1',
    categoryId: 'c1',
    description: 'Cena',
    amountCents: 2500,
    type: 'EXPENSE',
    date: '2026-03-10',
  };

  it('rejects long descriptions', () => {
    expect(() => Transaction.create({ ...input, description: long(201) }, 1, NOW)).toThrow(
      'superar 200'
    );
  });

  it('moves to another account and changes type', () => {
    const updated = Transaction.create(input, 1, NOW).update(
      { accountId: 'a2', type: 'income' },
      1
    );
    expect(updated.toPrimitives()).toMatchObject({ accountId: 'a2', type: 'INCOME' });
  });
});

describe('TransactionType', () => {
  it('rejects values that are not text and signs the balance effect', () => {
    expect(() => parseTransactionType(3)).toThrow('Tipo de movimiento inválido');
    expect(balanceEffect('INCOME', 100)).toBe(100);
    expect(balanceEffect('SAVING', 100)).toBe(-100);
  });
});

describe('Transfer', () => {
  it('rejects long descriptions', () => {
    expect(() =>
      Transfer.create({
        userId: 'u',
        fromAccountId: 'a',
        toAccountId: 'b',
        amountCents: 1,
        date: '2026-03-01',
        description: long(201),
      })
    ).toThrow('demasiado larga');
  });
});

describe('CategoryBudget and plans', () => {
  it('stamps budgets with the current time by default', () => {
    expect(CategoryBudget.create('u', 'c', 100).toPrimitives().createdAt).toMatch(/^\d{4}-/);
  });

  it('gives no Premium without a subscription or with an empty one', () => {
    expect(planOf(null, NOW)).toBe('free');
    expect(planOf(emptySubscription('u', NOW), NOW)).toBe('free');
  });
});

describe('password policy', () => {
  it('limits the length', () => {
    expect(passwordProblems(`Aa1!${long(130)}`)).toEqual(['como máximo 128 caracteres']);
  });
});
