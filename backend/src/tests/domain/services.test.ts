import { computeBudgetLines, computeMonthAlerts } from '@domain/services/budget-status';
import { guessCategoryName } from '@domain/services/categorizer';
import { savingsRate, summarize } from '@domain/services/summary';
import { computeCategoryTrends } from '@domain/services/trends';

describe('summarize', () => {
  const s = summarize([
    { type: 'INCOME', amountCents: 200000, categoryName: 'Salario' },
    { type: 'EXPENSE', amountCents: 30000, categoryName: 'Ocio' },
    { type: 'EXPENSE', amountCents: 20000, categoryName: 'Ocio' },
    { type: 'SAVING', amountCents: 50000, categoryName: 'Ahorro' },
  ]);

  it('totals by type and category', () => {
    expect(s).toEqual({
      incomeCents: 200000,
      expenseCents: 50000,
      savingCents: 50000,
      balanceCents: 100000,
      incomeByCategory: { Salario: 200000 },
      expensesByCategory: { Ocio: 50000 },
      savingByCategory: { Ahorro: 50000 },
      count: 4,
    });
  });

  it('computes the savings rate including the positive balance', () => {
    expect(savingsRate(s)).toBe(75);
    expect(savingsRate(summarize([]))).toBe(0);
  });
});

describe('budget status', () => {
  const lines = computeBudgetLines(
    [
      { categoryId: '1', categoryName: 'Ocio', amountCents: 10000 },
      { categoryId: '2', categoryName: 'Ropa', amountCents: 10000 },
      { categoryId: '3', categoryName: 'Luz', amountCents: 10000 },
    ],
    { Ocio: 12000, Ropa: 8000, Luz: 1000 }
  );

  it('classifies each budget and sorts by usage', () => {
    expect(lines.map((l) => [l.categoryName, l.level, l.percentage])).toEqual([
      ['Ocio', 'danger', 120],
      ['Ropa', 'warning', 80],
      ['Luz', 'ok', 10],
    ]);
  });

  it('turns warnings into month alerts, plus the available-money alert', () => {
    const summary = summarize([
      { type: 'INCOME', amountCents: 10000, categoryName: 'Salario' },
      { type: 'EXPENSE', amountCents: 21000, categoryName: 'Ocio' },
    ]);
    const alerts = computeMonthAlerts(summary, 10000, lines);
    expect(alerts.map((a) => `${a.kind}:${a.level}`)).toEqual([
      'available:danger',
      'category_budget:danger',
      'category_budget:warning',
    ]);
    expect(computeMonthAlerts(summary, -50000, [])).toEqual([]);
  });
});

describe('categorizer', () => {
  it.each([
    ['NOMINA MARZO EMPRESA', 'Salario'],
    ['COMPRA MERCADONA 1234', 'Alimentación'],
    ['Uber Eats pedido', 'Alimentación'],
    ['UBER *TRIP', 'Transporte'],
    ['Recibo IBERDROLA', 'Luz'],
    ['Suscripción Netflix', 'Ocio'],
    ['Farmacia Lda. Pérez', 'Salud'],
  ])('%s → %s', (description, category) => {
    expect(guessCategoryName(description)).toBe(category);
  });

  it('matches short keywords only as whole words', () => {
    expect(guessCategoryName('Diario El País')).toBeNull();
    expect(guessCategoryName('DIA RETAIL ESPAÑA')).toBe('Alimentación');
    expect(guessCategoryName('Transferencia a Juan')).toBeNull();
  });
});

describe('category trends', () => {
  it('compares with the previous period and the 3-period average', () => {
    const trends = computeCategoryTrends({ year: 2026, month: 4 }, [
      { year: 2026, month: 1, categoryName: 'Ocio', cents: 3000 },
      { year: 2026, month: 2, categoryName: 'Ocio', cents: 6000 },
      { year: 2026, month: 3, categoryName: 'Ocio', cents: 9000 },
      { year: 2026, month: 4, categoryName: 'Ocio', cents: 12000 },
      { year: 2026, month: 3, categoryName: 'Ropa', cents: 5000 },
      { year: 2025, month: 12, categoryName: 'Viejo', cents: 999 },
    ]);
    expect(trends).toEqual([
      {
        categoryName: 'Ocio',
        currentCents: 12000,
        previousCents: 9000,
        average3Cents: 6000,
        changeVsPreviousPct: 33.3,
        changeVsAveragePct: 100,
      },
      {
        categoryName: 'Ropa',
        currentCents: 0,
        previousCents: 5000,
        average3Cents: 1667,
        changeVsPreviousPct: -100,
        changeVsAveragePct: -100,
      },
    ]);
  });
});
