import { Cents } from '@domain/shared/money';

export interface SplitExpense {
  paidBy: string;
  amountCents: Cents;
  shares: { memberId: string; shareCents: Cents }[];
}

export interface Balance {
  memberId: string;
  /** Positive: the others owe them; negative: they owe the others. */
  cents: Cents;
}

export interface Transfer {
  from: string;
  to: string;
  cents: Cents;
}

/** Splits an amount equally; the cents that do not divide go one by one to the first people. */
export function splitEqually(totalCents: Cents, memberIds: string[]): Map<string, Cents> {
  const base = Math.floor(totalCents / memberIds.length);
  const extra = totalCents - base * memberIds.length;
  return new Map(memberIds.map((id, i) => [id, base + (i < extra ? 1 : 0)]));
}

/** What each person paid minus what they owe for the expenses (settlements included). */
export function computeBalances(memberIds: string[], expenses: SplitExpense[]): Balance[] {
  const net = new Map<string, Cents>(memberIds.map((id) => [id, 0]));
  for (const e of expenses) {
    net.set(e.paidBy, (net.get(e.paidBy) ?? 0) + e.amountCents);
    for (const s of e.shares) net.set(s.memberId, (net.get(s.memberId) ?? 0) - s.shareCents);
  }
  return memberIds.map((memberId) => ({ memberId, cents: net.get(memberId) ?? 0 }));
}

/** Few payments that settle everything: the biggest debtor pays the biggest creditor. */
export function suggestTransfers(balances: Balance[]): Transfer[] {
  const debtors = balances.filter((b) => b.cents < 0).map((b) => ({ ...b, cents: -b.cents }));
  const creditors = balances.filter((b) => b.cents > 0).map((b) => ({ ...b }));
  const transfers: Transfer[] = [];
  const byAmount = (a: Balance, b: Balance): number =>
    b.cents - a.cents || a.memberId.localeCompare(b.memberId);
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(byAmount);
    creditors.sort(byAmount);
    const debtor = debtors[0];
    const creditor = creditors[0];
    const cents = Math.min(debtor.cents, creditor.cents);
    transfers.push({ from: debtor.memberId, to: creditor.memberId, cents });
    debtor.cents -= cents;
    creditor.cents -= cents;
    if (debtor.cents === 0) debtors.shift();
    if (creditor.cents === 0) creditors.shift();
  }
  return transfers;
}
