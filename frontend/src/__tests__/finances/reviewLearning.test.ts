import { merchantKey, nextStreak } from '@modules/finances/domain/reviewLearning';

describe('merchantKey', () => {
  it('keeps the shop of a bank description, without numbers or card words', () => {
    expect(merchantKey('Compra TARJ. MERCADONA 0231 Valencia')).toBe('mercadona valencia');
    expect(merchantKey('Pago con tarjeta en Café Ñu')).toBe('cafe nu');
    expect(merchantKey('Bizum 1234')).toBe('');
  });
});

describe('nextStreak', () => {
  const suggested = (category: string, source?: 'rule' | 'history' | 'fallback') => ({
    category,
    source,
  });

  it('creates the rule the second time in a row the same shop goes to the same category', () => {
    const first = nextStreak(undefined, 'Alimentación', suggested('Otros', 'fallback'));
    expect(first).toEqual({ streak: { category: 'Alimentación' }, learn: false });
    // The second time the history already suggests it: confirming it is enough.
    expect(nextStreak(first.streak!, 'Alimentación', suggested('Alimentación', 'history'))).toEqual(
      { streak: null, learn: true }
    );
  });

  it('starts again with another category, and needs a change the first time', () => {
    expect(nextStreak({ category: 'Ocio' }, 'Alimentación', suggested('Otros'))).toEqual({
      streak: { category: 'Alimentación' },
      learn: false,
    });
    expect(nextStreak(undefined, 'Otros', suggested('Otros'))).toEqual({
      streak: null,
      learn: false,
    });
    expect(nextStreak(undefined, 'Ocio', undefined)).toEqual({
      streak: { category: 'Ocio' },
      learn: false,
    });
  });

  it('needs nothing when a rule already gives that category', () => {
    expect(nextStreak({ category: 'Ocio' }, 'Ocio', suggested('Ocio', 'rule'))).toEqual({
      streak: null,
      learn: false,
    });
  });
});
