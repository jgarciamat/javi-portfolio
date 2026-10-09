import { detectSubscriptions, subscriptionKey } from '@domain/services/subscriptions';

const charge = (description: string, date: string, euros: number, extra = {}) => ({
  description,
  amountCents: Math.round(euros * 100),
  date,
  type: 'EXPENSE',
  recurringRuleId: null,
  ...extra,
});
const options = { today: '2026-04-20', coveredKeys: new Set<string>() };

describe('subscriptionKey', () => {
  it('ignores accents, digits, references and punctuation', () => {
    expect(subscriptionKey('NETFLIX.COM 4521 ES')).toBe('netflix com es');
    expect(subscriptionKey('  Música  Premium #12 ')).toBe('musica premium');
  });
});

describe('detectSubscriptions', () => {
  const netflix = [
    charge('Netflix', '2026-01-05', 12.99),
    charge('Netflix', '2026-02-05', 12.99),
    charge('NETFLIX 123', '2026-03-05', 12.99),
    charge('Netflix', '2026-04-05', 13.99),
  ];

  it('finds a monthly subscription, its annual cost and a price increase', () => {
    const report = detectSubscriptions(netflix, options);
    expect(report.subscriptions).toEqual([
      {
        key: 'netflix',
        description: 'Netflix',
        cadence: 'monthly',
        amountCents: 1399,
        annualCostCents: 16788,
        count: 4,
        lastDate: '2026-04-05',
        nextDate: '2026-05-05',
        priceIncrease: { fromCents: 1299, toCents: 1399 },
      },
    ]);
    expect(report).toMatchObject({ annualCents: 16788, monthlyCents: 1399 });
  });

  it('finds yearly charges and orders everything by annual cost', () => {
    const report = detectSubscriptions(
      [
        ...netflix.slice(0, 3),
        charge('Seguro coche', '2025-03-01', 480),
        charge('Seguro coche', '2026-03-02', 480),
      ],
      options
    );
    expect(report.subscriptions.map((s) => [s.key, s.cadence, s.priceIncrease])).toEqual([
      ['seguro coche', 'yearly', null],
      ['netflix', 'monthly', null],
    ]);
    expect(report.subscriptions[0].annualCostCents).toBe(48000);
  });

  it('ignores one-off, irregular, unsteady, ended, recurring and short-named charges', () => {
    const items = [
      charge('Cena', '2026-04-01', 40), // once
      charge('Gimnasio', '2026-01-01', 30),
      charge('Gimnasio', '2026-02-20', 30), // 50 days apart: irregular
      charge('Gimnasio', '2026-04-01', 30),
      charge('Compra', '2026-01-03', 20),
      charge('Compra', '2026-02-03', 80), // amount changes too much
      charge('Compra', '2026-03-03', 20),
      charge('Revista', '2025-09-01', 9),
      charge('Revista', '2025-10-01', 9),
      charge('Revista', '2025-11-01', 9), // stopped months ago
      charge('Alquiler', '2026-02-01', 700, { recurringRuleId: 'r1' }),
      charge('Alquiler', '2026-03-01', 700, { recurringRuleId: 'r1' }),
      charge('Alquiler', '2026-04-01', 700, { recurringRuleId: 'r1' }),
      charge('TV', '2026-02-01', 5),
      charge('TV', '2026-03-01', 5),
      charge('TV', '2026-04-01', 5), // name too short
      { ...charge('Sueldo', '2026-02-01', 1000), type: 'INCOME' },
      { ...charge('Sueldo', '2026-03-01', 1000), type: 'INCOME' },
      { ...charge('Sueldo', '2026-04-01', 1000), type: 'INCOME' },
    ];
    expect(detectSubscriptions(items, options).subscriptions).toEqual([]);
  });

  it('skips what the user already tracks as a recurring rule', () => {
    const covered = { ...options, coveredKeys: new Set(['netflix']) };
    expect(detectSubscriptions(netflix, covered).subscriptions).toEqual([]);
  });

  it('is empty without data', () => {
    expect(detectSubscriptions([], options)).toEqual({
      subscriptions: [],
      monthlyCents: 0,
      annualCents: 0,
    });
  });
});
