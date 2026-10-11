import { buildDigest, isDigestWindow } from '@domain/services/digest';

describe('buildDigest', () => {
  const base = {
    from: '2026-03-02',
    to: '2026-03-08',
    incomeCents: 0,
    previousSpentCents: 0,
    upcoming: null,
  };

  it('adds the week up, ranks the categories and compares with the week before', () => {
    const digest = buildDigest({
      ...base,
      incomeCents: 150000,
      previousSpentCents: 10000,
      expenses: [
        { amountCents: 5000, categoryName: 'Ocio' },
        { amountCents: 7000, categoryName: 'Alimentación' },
        { amountCents: 3000, categoryName: 'Ocio' },
        { amountCents: 1000, categoryName: 'Ropa' },
        { amountCents: 500, categoryName: 'Gas' },
      ],
    });
    expect(digest.spentCents).toBe(16500);
    expect(digest.changePct).toBe(65);
    expect(digest.topCategories).toEqual([
      { name: 'Ocio', cents: 8000 },
      { name: 'Alimentación', cents: 7000 },
      { name: 'Ropa', cents: 1000 },
    ]);
  });

  it('has no comparison without a base and breaks ties by name', () => {
    const digest = buildDigest({
      ...base,
      expenses: [
        { amountCents: 100, categoryName: 'B' },
        { amountCents: 100, categoryName: 'A' },
      ],
    });
    expect(digest.changePct).toBeNull();
    expect(digest.topCategories.map((c) => c.name)).toEqual(['A', 'B']);
  });
});

describe('isDigestWindow', () => {
  it('is Monday morning (UTC 07-13) only', () => {
    expect(isDigestWindow(new Date('2026-03-09T07:00:00Z'))).toBe(true);
    expect(isDigestWindow(new Date('2026-03-09T12:59:00Z'))).toBe(true);
    expect(isDigestWindow(new Date('2026-03-09T06:59:00Z'))).toBe(false);
    expect(isDigestWindow(new Date('2026-03-09T13:00:00Z'))).toBe(false);
    expect(isDigestWindow(new Date('2026-03-10T09:00:00Z'))).toBe(false);
  });
});
