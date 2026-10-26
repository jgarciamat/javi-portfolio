import { coveringMovements, similarConcepts } from '@domain/services/recurring-match';

const movement = (over: Partial<Parameters<typeof coveringMovements>[1][number]> = {}) => ({
  id: 'm1',
  description: 'Netflix',
  date: '2026-03-01',
  amountCents: 1399,
  type: 'EXPENSE' as const,
  ...over,
});
const row = (over: Partial<Parameters<typeof coveringMovements>[0][number]> = {}) => ({
  description: 'NETFLIX.COM 866-579',
  date: '2026-03-03',
  amountCents: 1399,
  type: 'EXPENSE' as const,
  ...over,
});

describe('recurring-match', () => {
  it('finds the movement a statement row repeats: type, 3 days, amount and concept', () => {
    expect(coveringMovements([row()], [movement()])).toEqual([movement()]);
    // A bill that changed a little still matches; a different one does not.
    expect(coveringMovements([row({ amountCents: 1420 })], [movement()])[0]).not.toBeNull();
    expect(coveringMovements([row({ amountCents: 2000 })], [movement()])).toEqual([null]);
    expect(
      coveringMovements([row({ amountCents: 100500 })], [movement({ amountCents: 100000 })])[0]
    ).not.toBeNull();
    expect(coveringMovements([row({ date: '2026-03-05' })], [movement()])).toEqual([null]);
    expect(coveringMovements([row({ type: 'INCOME' })], [movement()])).toEqual([null]);
    expect(coveringMovements([row({ description: 'Spotify' })], [movement()])).toEqual([null]);
  });

  it('gives each movement to one row, the closest in date', () => {
    const [far, near] = coveringMovements(
      [row({ date: '2026-03-04' }), row({ date: '2026-03-02' })],
      [movement()]
    );
    expect(far).toEqual(movement());
    expect(near).toBeNull();
    const both = coveringMovements(
      [row({ date: '2026-03-04' })],
      [movement({ id: 'a', date: '2026-03-01' }), movement({ id: 'b', date: '2026-03-04' })]
    );
    expect(both[0]?.id).toBe('b');
  });

  it('compares the words that name the payment, not the filler', () => {
    expect(similarConcepts('Recibo Endesa', 'ADEUDO ENDESA ENERGIA 10/2026')).toBe(true);
    expect(similarConcepts('Recibo luz', 'RECIBO AGUA')).toBe(false);
    expect(similarConcepts('Pago', 'PAGO 123')).toBe(false);
    expect(similarConcepts('Alquiler', '2026')).toBe(false);
  });
});
