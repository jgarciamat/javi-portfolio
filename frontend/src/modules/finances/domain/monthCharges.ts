import type { Transaction } from './types';

/**
 * An automatic operation dated after today: already noted (it counts in the month's balance)
 * but not charged yet. It stays out of the list of the month's movements until its day.
 */
export function isPendingAutomatic(tx: Transaction, today: string): boolean {
  return !!tx.recurringRuleId && tx.date > today;
}

export interface MonthCharges {
  /** The month's automatic expenses, by date: the charged ones and those still to come. */
  items: { tx: Transaction; pending: boolean }[];
  total: number;
  pendingTotal: number;
  pendingCount: number;
}

const cents = (amount: number) => Math.round(amount * 100);

/** «Recibos y cargos de este mes»: the automatic expenses of the month, with what is still due. */
export function monthCharges(transactions: Transaction[], today: string): MonthCharges {
  const items = transactions
    .filter((tx) => tx.type === 'EXPENSE' && !!tx.recurringRuleId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tx) => ({ tx, pending: isPendingAutomatic(tx, today) }));
  const sum = (list: typeof items) => list.reduce((s, { tx }) => s + cents(tx.amount), 0) / 100;
  const pending = items.filter((i) => i.pending);
  return {
    items,
    total: sum(items),
    pendingTotal: sum(pending),
    pendingCount: pending.length,
  };
}
