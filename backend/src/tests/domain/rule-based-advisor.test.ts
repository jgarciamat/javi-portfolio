import { AdviceContext, generateRuleBasedAdvice } from '@domain/services/rule-based-advisor';

const base: AdviceContext = {
  year: 2026,
  month: 3,
  locale: 'es',
  currency: 'EUR',
  totalIncome: 2000,
  totalExpenses: 1000,
  totalSaving: 200,
  balance: 800,
  savingsRate: 50,
  budgetAmount: 0,
  expensesByCategory: { Alimentación: 300, Ocio: 700 },
  savingByCategory: { 'Fondo de emergencia': 200 },
  transactionCount: 1,
};

const advice = (overrides: Partial<AdviceContext> = {}) =>
  generateRuleBasedAdvice({ ...base, ...overrides });
const has = (list: string[], text: string | RegExp) =>
  list.some((item) => (typeof text === 'string' ? item.includes(text) : text.test(item)));

describe('rule-based advisor', () => {
  describe('savings rate', () => {
    it('praises >= 30%', () =>
      expect(has(advice({ savingsRate: 35 }).positives, '35.0%')).toBe(true));
    it('praises >= 20%', () =>
      expect(has(advice({ savingsRate: 25 }).positives, 'Buena tasa')).toBe(true));
    it('suggests the gap to 20% when >= 10%', () =>
      expect(has(advice({ savingsRate: 15, totalSaving: 300 }).tips, '20%')).toBe(true));
    it('warns when < 10%', () =>
      expect(has(advice({ savingsRate: 5 }).warnings, 'Tasa de ahorro baja')).toBe(true));
    it('warns when nothing is saved', () =>
      expect(has(advice({ savingsRate: 0, totalSaving: 0 }).warnings, 'No hay ahorro')).toBe(true));
  });

  it('warns about a negative balance and praises a positive one', () => {
    expect(has(advice({ balance: -100 }).warnings, 'Balance negativo')).toBe(true);
    expect(has(advice().positives, 'Balance positivo')).toBe(true);
  });

  it('flags a high expense ratio', () => {
    expect(has(advice({ totalExpenses: 1900 }).warnings, '95.0%')).toBe(true);
    expect(has(advice({ totalExpenses: 1600 }).tips, 'Reducir un 10%')).toBe(true);
  });

  it('flags a dominant category', () => {
    expect(has(advice().warnings, '"Ocio" domina')).toBe(true);
    expect(
      has(
        advice({ expensesByCategory: { Ocio: 400, Luz: 300, Agua: 300 } }).tips,
        '"Ocio" representa'
      )
    ).toBe(true);
  });

  it('compares with the budget', () => {
    expect(has(advice({ budgetAmount: 800 }).warnings, 'Presupuesto superado')).toBe(true);
    expect(has(advice({ budgetAmount: 1500 }).positives, 'respetado tu presupuesto')).toBe(true);
  });

  it('comments on savings allocation and tracking habits', () => {
    expect(has(advice().tips, 'Fondo de emergencia')).toBe(true);
    expect(has(advice({ savingByCategory: { A: 100, B: 100 } }).positives, '2 categorías')).toBe(
      true
    );
    expect(has(advice({ transactionCount: 0 }).tips, 'Sin transacciones')).toBe(true);
    expect(has(advice({ transactionCount: 25 }).positives, '25 transacciones')).toBe(true);
  });

  it('builds a summary for each situation', () => {
    expect(advice({ totalIncome: 0, totalExpenses: 0 }).summary).toMatch(/Sin datos/);
    expect(advice({ balance: -50 }).summary).toMatch(/superan/);
    expect(advice().summary).toMatch(/ingresos 2000,00\s€/);
  });

  it('speaks English and uses the user currency', () => {
    const en = advice({ locale: 'en', currency: 'USD', balance: -10 });
    expect(en.summary).toMatch(/expenses/);
    expect(has(en.warnings, 'US$')).toBe(true);
  });
});
