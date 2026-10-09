import { buildQuestionFacts } from '@domain/services/question-facts';

describe('buildQuestionFacts', () => {
  const months = [
    { year: 2026, month: 2, incomeCents: 200000, expenseCents: 50000, savingCents: 10000 },
    { year: 2026, month: 3, incomeCents: 210000, expenseCents: 60000, savingCents: 0 },
  ];

  it('keeps only totals: decimals per month and per category', () => {
    const facts = buildQuestionFacts({
      currency: 'EUR',
      today: '2026-03-15',
      availableCents: 123456,
      months,
      categoryTotals: [
        { year: 2026, month: 2, categoryName: 'Ocio', cents: 3000 },
        { year: 2026, month: 3, categoryName: 'Ocio', cents: 4550 },
        { year: 2026, month: 3, categoryName: 'Vivienda', cents: 50000 },
      ],
    });
    expect(facts).toEqual({
      currency: 'EUR',
      today: '2026-03-15',
      available: 1234.56,
      months: [
        { period: '2026-02', income: 2000, expenses: 500, saving: 100 },
        { period: '2026-03', income: 2100, expenses: 600, saving: 0 },
      ],
      expensesByCategory: {
        Ocio: { '2026-02': 30, '2026-03': 45.5 },
        Vivienda: { '2026-03': 500 },
      },
    });
  });

  it('keeps the twelve most spent categories', () => {
    const categoryTotals = Array.from({ length: 15 }, (_, i) => ({
      year: 2026,
      month: 3,
      categoryName: `Cat ${i}`,
      cents: (i + 1) * 100,
    }));
    const facts = buildQuestionFacts({
      currency: 'EUR',
      today: '2026-03-15',
      availableCents: 0,
      months,
      categoryTotals,
    });
    const names = Object.keys(facts.expensesByCategory);
    expect(names).toHaveLength(12);
    expect(names).not.toContain('Cat 0');
    expect(names).toContain('Cat 14');
  });
});
