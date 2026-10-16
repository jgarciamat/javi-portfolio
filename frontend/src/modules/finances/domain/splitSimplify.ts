export interface SplitMemberBalance {
  id: string;
  /** Euros: positive, the others owe them; negative, they owe the others. */
  balance: number;
}

export interface SplitPayment {
  from: string;
  to: string;
  amount: number;
}

/** Up to this many people with a balance the best answer is searched exactly. */
const EXACT_LIMIT = 18;

interface Side {
  id: string;
  cents: number;
}

/** The biggest debtor pays the biggest creditor until everything is settled. */
function greedy(people: Side[]): SplitPayment[] {
  const debtors = people.filter((p) => p.cents < 0).map((p) => ({ id: p.id, cents: -p.cents }));
  const creditors = people.filter((p) => p.cents > 0).map((p) => ({ ...p }));
  const payments: SplitPayment[] = [];
  const byAmount = (a: Side, b: Side) => b.cents - a.cents || a.id.localeCompare(b.id);
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(byAmount);
    creditors.sort(byAmount);
    const cents = Math.min(debtors[0].cents, creditors[0].cents);
    payments.push({ from: debtors[0].id, to: creditors[0].id, amount: cents / 100 });
    debtors[0].cents -= cents;
    creditors[0].cents -= cents;
    if (debtors[0].cents === 0) debtors.shift();
    if (creditors[0].cents === 0) creditors.shift();
  }
  return payments;
}

/** Splits the people into the most groups that settle among themselves (each group of k needs k − 1 payments). */
function bestGroups(people: Side[]): Side[][] {
  const n = people.length;
  const size = 1 << n;
  const sum = new Int32Array(size);
  const best = new Int8Array(size);
  const last = new Int8Array(size);
  for (let mask = 1; mask < size; mask++) {
    const low = 31 - Math.clz32(mask & -mask);
    sum[mask] = sum[mask & (mask - 1)] + people[low].cents;
    let top = -1;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i) && best[mask ^ (1 << i)] > top) {
        top = best[mask ^ (1 << i)];
        last[mask] = i;
      }
    }
    best[mask] = top + (sum[mask] === 0 ? 1 : 0);
  }
  // The removal order is a sequence in which every time the running sum is zero a group closes.
  const order: number[] = [];
  for (let mask = size - 1; mask > 0; mask ^= 1 << last[mask]) order.push(last[mask]);
  const groups: Side[][] = [];
  let current: Side[] = [];
  let running = 0;
  for (const i of order.reverse()) {
    current.push(people[i]);
    running += people[i].cents;
    if (running === 0) {
      groups.push(current);
      current = [];
    }
  }
  return groups;
}

/**
 * The fewest payments that settle the group: people whose balances cancel out among themselves are settled
 * apart. Searched exactly for up to 18 people with a balance; beyond that a good suggestion is given.
 */
export function simplifyPayments(members: SplitMemberBalance[]): SplitPayment[] {
  const people = members
    .map((m) => ({ id: m.id, cents: Math.round(m.balance * 100) }))
    .filter((p) => p.cents !== 0);
  if (people.length > EXACT_LIMIT) return greedy(people);
  return bestGroups(people).flatMap((group) => greedy(group));
}
