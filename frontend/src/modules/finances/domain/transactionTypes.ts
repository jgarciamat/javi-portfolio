import type { Transaction, TransactionType } from './types';

export const TRANSACTION_TYPES: TransactionType[] = ['EXPENSE', 'INCOME', 'SAVING'];

/** i18n key of the name of each type. */
export const TYPE_LABEL_KEYS: Record<TransactionType, string> = {
  INCOME: 'app.transaction.form.type.income',
  EXPENSE: 'app.transaction.form.type.expense',
  SAVING: 'app.transaction.form.type.saving',
};

export const TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: '#4ade80',
  EXPENSE: '#f87171',
  SAVING: '#a78bfa',
};

export const TYPE_BADGE_CLASS: Record<TransactionType, string> = {
  INCOME: 'tx-badge tx-badge-income',
  EXPENSE: 'tx-badge tx-badge-expense',
  SAVING: 'tx-badge tx-badge-saving',
};

/** Expenses read as money going out; income and saving as money put somewhere. */
export const amountSign = (type: TransactionType): string => (type === 'EXPENSE' ? '−' : '+');

export interface TypeTotals {
  income: number;
  expenses: number;
  saving: number;
  /** income − expenses − saving */
  balance: number;
}

export function totalsByType(items: Pick<Transaction, 'type' | 'amount'>[]): TypeTotals {
  let income = 0;
  let expenses = 0;
  let saving = 0;
  for (const tx of items) {
    if (tx.type === 'INCOME') income += tx.amount;
    else if (tx.type === 'EXPENSE') expenses += tx.amount;
    else saving += tx.amount;
  }
  return { income, expenses, saving, balance: income - expenses - saving };
}
