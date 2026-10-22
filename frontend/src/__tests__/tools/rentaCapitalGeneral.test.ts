import { generalCapitalOf, relatedLoanSplit } from '@modules/tools/domain/rentaCapitalGeneral';

// Hand calculations: LIRPF arts. 26.1.b, 26.2 and 46.a (BOE-A-2006-20764, checked 22-10-2026).
describe('capital mobiliario of the general base', () => {
  it('takes the expenses off each item and 30 % off the irregular ones, on at most 300,000 €', () => {
    const r = generalCapitalOf([
      { box: '0046', label: 'Nave', income: 12000, expenses: 2000 },
      { box: '0048', label: 'Derechos', income: 500000, expenses: 50000, irregular: true },
      { box: '0047', label: 'Asistencia', income: 1000, expenses: 1500, irregular: true },
    ]);
    expect(r.items.map((i) => [i.box, i.net, i.reduction, i.reduced])).toEqual([
      ['0046', 10000, 0, 10000],
      // 30 % of 300,000, not of the 450,000 €.
      ['0048', 450000, 90000, 360000],
      // A loss has no reduction.
      ['0047', -500, 0, -500],
    ]);
    expect(r.total).toBe(10000 + 360000 - 500);
  });

  it('sends the interest of a related loan over three times the own funds to the general base', () => {
    // 3 × 100,000 × 50 % = 150,000 of 200,000 lent: a quarter of 8,000 € of interest.
    expect(relatedLoanSplit({ interest: 8000, loan: 200000, ownFunds: 100000, share: 50 })).toEqual(
      { general: 2000, savings: 6000 }
    );
    // Not linked by shares: 25 %. Within the limit, or with nothing lent: all of it to the savings.
    expect(relatedLoanSplit({ interest: 1000, loan: 100000, ownFunds: 100000 })).toEqual({
      general: 250,
      savings: 750,
    });
    expect(relatedLoanSplit({ interest: 1000, loan: 10000, ownFunds: 100000, share: 50 })).toEqual({
      general: 0,
      savings: 1000,
    });
    expect(relatedLoanSplit({ interest: 1000, loan: 0, ownFunds: 0, share: 50 }).general).toBe(0);
    const r = generalCapitalOf([
      {
        box: '0046',
        label: 'Préstamo',
        income: 99,
        expenses: 99,
        related: { interest: 8000, loan: 200000, ownFunds: 100000, share: 50 },
      },
    ]);
    // The related loan always goes to box 0051, with its own interest and no expenses.
    expect(r.items[0]).toMatchObject({ box: '0051', income: 2000, expenses: 0, savings: 6000 });
  });
});
