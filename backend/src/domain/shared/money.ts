import { ValidationError } from '@domain/errors';

/** Amounts are stored and computed as integer cents to avoid floating point drift. */
export type Cents = number;

/** Converts a decimal amount (e.g. 12.34) into integer cents (1234). */
export function toCents(amount: number): Cents {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new ValidationError('El importe debe ser un número válido', 'INVALID_AMOUNT');
  }
  // toFixed(6) removes binary noise such as 1.005 * 100 = 100.49999999999999
  return Math.round(Number((amount * 100).toFixed(6)));
}

/** Converts integer cents back into a decimal amount for the API boundary. */
export function fromCents(cents: Cents): number {
  return cents / 100;
}

export function assertPositiveCents(cents: Cents, field = 'importe'): void {
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new ValidationError(`El ${field} debe ser mayor que 0`, 'INVALID_AMOUNT');
  }
}

export function assertNonNegativeCents(cents: Cents, field = 'importe'): void {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new ValidationError(`El ${field} no puede ser negativo`, 'INVALID_AMOUNT');
  }
}
