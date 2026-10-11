import { BusinessMovement, splitVat, yearlyTax } from '@domain/services/tax';

describe('splitVat', () => {
  it('takes the VAT out of an amount that includes it', () => {
    expect(splitVat(12100, 21)).toEqual({ baseCents: 10000, vatCents: 2100 });
    expect(splitVat(11000, 10)).toEqual({ baseCents: 10000, vatCents: 1000 });
    expect(splitVat(10400, 4)).toEqual({ baseCents: 10000, vatCents: 400 });
    expect(splitVat(5000, 0)).toEqual({ baseCents: 5000, vatCents: 0 });
    // Rounded to the cent: base + VAT is always the amount paid.
    const { baseCents, vatCents } = splitVat(9999, 21);
    expect(baseCents + vatCents).toBe(9999);
  });
});

describe('yearlyTax', () => {
  const income = (date: string, amountCents: number): BusinessMovement => ({
    date,
    type: 'INCOME',
    amountCents,
    vatRate: 21,
  });
  const expense = (
    date: string,
    amountCents: number,
    vatRate: 0 | 4 | 10 | 21 = 21
  ): BusinessMovement => ({
    date,
    type: 'EXPENSE',
    amountCents,
    vatRate,
  });

  it('adds up each calendar quarter: VAT collected and paid, and the net income', () => {
    const tax = yearlyTax(2026, [
      income('2026-01-15', 121000),
      expense('2026-03-31', 24200),
      income('2026-04-01', 60500),
      expense('2026-06-30', 11000, 10),
      income('2025-12-31', 999999),
    ]);
    const [q1, q2] = tax.quarters;
    expect(q1).toMatchObject({
      incomeBaseCents: 100000,
      vatCollectedCents: 21000,
      expenseBaseCents: 20000,
      vatPaidCents: 4200,
      vatDueCents: 16800,
      netIncomeCents: 80000,
    });
    expect(q2).toMatchObject({
      incomeBaseCents: 50000,
      expenseBaseCents: 10000,
      vatPaidCents: 1000,
    });
    expect(tax.totals.incomeBaseCents).toBe(150000);
    expect(tax.quarters).toHaveLength(4);
  });

  it('estimates the 20 % advance of the income tax on the accumulated net, once', () => {
    const tax = yearlyTax(2026, [
      income('2026-02-01', 121000 * 2),
      expense('2026-05-01', 121000),
      income('2026-08-01', 121000),
    ]);
    expect(tax.quarters[0].irpfAdvanceCents).toBe(40000);
    // Q2: accumulated net 100 000 → 20 000 in total, 40 000 already paid: nothing more.
    expect(tax.quarters[1].irpfAdvanceCents).toBe(0);
    // Q3: accumulated net 200 000 → 40 000 in total: nothing more to add yet either.
    expect(tax.quarters[2].irpfAdvanceCents).toBe(0);
    expect(tax.totals.irpfAdvanceCents).toBe(40000);
  });

  it('never advances a negative amount and handles a year without movements', () => {
    const loss = yearlyTax(2026, [expense('2026-02-01', 121000)]);
    expect(loss.totals.irpfAdvanceCents).toBe(0);
    expect(loss.quarters[0].vatDueCents).toBe(-21000);
    expect(yearlyTax(2026, []).totals.netIncomeCents).toBe(0);
  });
});
