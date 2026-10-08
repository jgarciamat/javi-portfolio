import { ValidationError } from '@domain/errors';

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'SAVING'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export function parseTransactionType(value: unknown): TransactionType {
  const upper = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!(TRANSACTION_TYPES as readonly string[]).includes(upper)) {
    throw new ValidationError(
      `Tipo de movimiento inválido. Debe ser ${TRANSACTION_TYPES.join(', ')}`,
      'INVALID_TRANSACTION_TYPE'
    );
  }
  return upper as TransactionType;
}

/** Effect of a movement on the money available to spend. */
export function balanceEffect(type: TransactionType, amountCents: number): number {
  return type === 'INCOME' ? amountCents : -amountCents;
}
