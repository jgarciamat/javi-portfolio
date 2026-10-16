import { simplifyPayments, type SplitMemberBalance } from '@modules/finances/domain/splitSimplify';

const people = (balances: number[]): SplitMemberBalance[] =>
  balances.map((balance, i) => ({ id: `p${i}`, balance }));

/** What each person ends up with after the payments: zero for everybody when it settles. */
const settled = (balances: number[], payments: { from: string; to: string; amount: number }[]) => {
  const net = balances.map((b) => Math.round(b * 100));
  for (const p of payments) {
    net[Number(p.from.slice(1))] += Math.round(p.amount * 100);
    net[Number(p.to.slice(1))] -= Math.round(p.amount * 100);
  }
  return net;
};

describe('simplifying the payments of a group', () => {
  it('has nothing to pay when everything is balanced', () => {
    expect(simplifyPayments(people([0, 0, 0]))).toEqual([]);
    expect(simplifyPayments([])).toEqual([]);
  });

  it('settles two people with one payment', () => {
    expect(simplifyPayments(people([25, -25]))).toEqual([{ from: 'p1', to: 'p0', amount: 25 }]);
  });

  it('uses one payment less for every group that cancels out by itself', () => {
    // 90 and -90 settle between themselves; the other four need three payments: 4 instead of 5.
    const balances = [90, 40, 70, -90, 60, -170];
    const payments = simplifyPayments(people(balances));
    expect(payments).toHaveLength(4);
    expect(settled(balances, payments).every((n) => n === 0)).toBe(true);
    expect(payments).toContainEqual({ from: 'p3', to: 'p0', amount: 90 });
  });

  it('never needs more payments than people with a balance minus one', () => {
    const balances = [172.5, -186.25, -86.25, 100];
    const payments = simplifyPayments(people(balances));
    expect(payments).toHaveLength(3);
    expect(settled(balances, payments).every((n) => n === 0)).toBe(true);
  });

  it('ignores people without a balance and works in cents', () => {
    const balances = [0.1, -0.1, 0, 0.3, -0.3];
    const payments = simplifyPayments(people(balances));
    expect(payments).toHaveLength(2);
    expect(settled(balances, payments).every((n) => n === 0)).toBe(true);
  });

  it('gives a good suggestion for very big groups', () => {
    const balances = Array.from({ length: 20 }, (_, i) => (i < 10 ? 10 : -10));
    const payments = simplifyPayments(people(balances));
    expect(payments.length).toBeLessThanOrEqual(19);
    expect(settled(balances, payments).every((n) => n === 0)).toBe(true);
  });
});
