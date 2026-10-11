import { computeBalances, splitEqually, suggestTransfers } from '@domain/services/split';

describe('splitEqually', () => {
  it('shares the cents that do not divide, one each to the first people', () => {
    expect([...splitEqually(1000, ['a', 'b', 'c'])]).toEqual([
      ['a', 334],
      ['b', 333],
      ['c', 333],
    ]);
    expect([...splitEqually(900, ['a', 'b', 'c'])].map(([, c]) => c)).toEqual([300, 300, 300]);
    expect([...splitEqually(1, ['a', 'b'])].map(([, c]) => c)).toEqual([1, 0]);
    const total = [...splitEqually(9999, ['a', 'b', 'c', 'd', 'e', 'f', 'g'])].reduce(
      (s, [, c]) => s + c,
      0
    );
    expect(total).toBe(9999);
  });
});

describe('balances and transfers', () => {
  const dinner = {
    paidBy: 'ana',
    amountCents: 9000,
    shares: ['ana', 'ben', 'cai'].map((memberId) => ({ memberId, shareCents: 3000 })),
  };

  it('is what each person paid minus what they owe', () => {
    expect(computeBalances(['ana', 'ben', 'cai'], [dinner])).toEqual([
      { memberId: 'ana', cents: 6000 },
      { memberId: 'ben', cents: -3000 },
      { memberId: 'cai', cents: -3000 },
    ]);
    expect(computeBalances(['ana', 'dan'], [])).toEqual([
      { memberId: 'ana', cents: 0 },
      { memberId: 'dan', cents: 0 },
    ]);
  });

  it('suggests few payments that settle everybody', () => {
    const taxi = {
      paidBy: 'ben',
      amountCents: 3000,
      shares: ['ana', 'ben'].map((memberId) => ({ memberId, shareCents: 1500 })),
    };
    const balances = computeBalances(['ana', 'ben', 'cai'], [dinner, taxi]);
    const transfers = suggestTransfers(balances);
    expect(transfers).toEqual([
      { from: 'cai', to: 'ana', cents: 3000 },
      { from: 'ben', to: 'ana', cents: 1500 },
    ]);
    // Applying them leaves nobody owing anything.
    const settled = computeBalances(
      ['ana', 'ben', 'cai'],
      [
        dinner,
        taxi,
        ...transfers.map((t) => ({
          paidBy: t.from,
          amountCents: t.cents,
          shares: [{ memberId: t.to, shareCents: t.cents }],
        })),
      ]
    );
    expect(settled.every((b) => b.cents === 0)).toBe(true);
    expect(suggestTransfers(computeBalances(['ana', 'ben'], []))).toEqual([]);
  });

  it('breaks ties by name', () => {
    expect(
      suggestTransfers([
        { memberId: 'b', cents: 100 },
        { memberId: 'a', cents: 100 },
        { memberId: 'z', cents: -200 },
      ])
    ).toEqual([
      { from: 'z', to: 'a', cents: 100 },
      { from: 'z', to: 'b', cents: 100 },
    ]);
  });
});
