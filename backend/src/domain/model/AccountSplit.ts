import { ValidationError } from '@domain/errors';
import { Cents, fromCents } from '@domain/shared/money';

/**
 * One account's part of a movement (or of an automatic operation) paid from, or received in,
 * several accounts: e.g. 800 € = 500 € from the current account + 300 € of the cash one. The
 * movement stays one (its total counts once for categories, budgets and reports); each account's
 * balance counts only its part.
 */
export interface AccountSplit {
  accountId: string;
  amountCents: Cents;
}

/** Most accounts one movement can be split between. */
export const MAX_SPLITS = 10;

/**
 * The parts, checked against the total: none (null or empty) means «one account, the whole
 * amount»; otherwise two or more different accounts, each with a positive whole number of cents,
 * adding up exactly to the total.
 */
export function cleanSplits(
  splits: readonly AccountSplit[] | null | undefined,
  totalCents: Cents
): AccountSplit[] {
  if (!splits || splits.length === 0) return [];
  if (splits.length < 2) {
    throw new ValidationError('Para repartir, elige al menos dos cuentas', 'SPLIT_TOO_FEW');
  }
  if (splits.length > MAX_SPLITS) {
    throw new ValidationError(
      `Se puede repartir entre ${MAX_SPLITS} cuentas como mucho`,
      'SPLIT_TOO_MANY',
      { max: MAX_SPLITS }
    );
  }
  if (new Set(splits.map((s) => s.accountId)).size !== splits.length) {
    throw new ValidationError('Cada cuenta puede aparecer una sola vez', 'SPLIT_DUPLICATE_ACCOUNT');
  }
  if (splits.some((s) => !Number.isInteger(s.amountCents) || s.amountCents <= 0)) {
    throw new ValidationError(
      'El importe de cada cuenta debe ser mayor que 0',
      'SPLIT_INVALID_AMOUNT'
    );
  }
  const sum = splits.reduce((total, s) => total + s.amountCents, 0);
  if (sum !== totalCents) {
    throw new ValidationError(
      `Las partes suman ${fromCents(sum).toFixed(2)} y el importe es ${fromCents(
        totalCents
      ).toFixed(2)}: deben coincidir`,
      'SPLIT_SUM_MISMATCH',
      { totalCents, splitCents: sum }
    );
  }
  return splits.map((s) => ({ accountId: s.accountId, amountCents: s.amountCents }));
}

/**
 * The parts with the same account put together, in the order each account first appears (two
 * parts may end in the same account when an archived one is replaced by the default one). A
 * single part left means «not split».
 */
export function mergeSplits(splits: readonly AccountSplit[]): AccountSplit[] {
  const merged = new Map<string, Cents>();
  for (const s of splits) merged.set(s.accountId, (merged.get(s.accountId) ?? 0) + s.amountCents);
  if (merged.size < 2) return [];
  return [...merged].map(([accountId, amountCents]) => ({ accountId, amountCents }));
}

/** Whether two lists of parts are the same accounts with the same amounts, in the same order. */
export function sameSplits(a: readonly AccountSplit[], b: readonly AccountSplit[]): boolean {
  return (
    a.length === b.length &&
    a.every((s, i) => s.accountId === b[i].accountId && s.amountCents === b[i].amountCents)
  );
}
