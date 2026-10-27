import { TransactionType } from '@domain/model/TransactionType';
import { Cents } from '@domain/shared/money';
import { normalizeText } from '@domain/shared/text';

/** A movement an automatic operation added (what a statement row may repeat). */
export interface RuleMovement {
  id: string;
  description: string;
  date: string;
  amountCents: Cents;
  type: TransactionType;
}

/** A statement row as it is about to be imported. */
export interface MatchableRow {
  description: string;
  date: string;
  amountCents: Cents;
  type: TransactionType;
}

/** The bank charges the rent a few days before or after the day the operation was set for. */
export const MATCH_DAYS = 3;
/** Bills change a little from month to month: 1 % or 50 cents, whichever is more. */
const AMOUNT_SHARE = 0.01;
const AMOUNT_CENTS = 50;
/** Words that say nothing about what was paid. */
const FILLER = new Set([
  'recibo',
  'pago',
  'cargo',
  'compra',
  'tarjeta',
  'transferencia',
  'adeudo',
  'domiciliacion',
  'abono',
  'del',
  'las',
  'los',
  'por',
  'com',
  'www',
]);

const DAY_MS = 24 * 60 * 60 * 1000;

const daysApart = (a: string, b: string): number =>
  Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS;

/** The words that name it: «RECIBO ENDESA ENERGIA 10/2026» → endesa, energia. */
function words(description: string): string[] {
  return normalizeText(description)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !FILLER.has(w) && !/^\d+$/.test(w));
}

/** Concepts alike: one names the other («Netflix» and «NETFLIX.COM 866-579»), or a word in common. */
export function similarConcepts(a: string, b: string): boolean {
  const left = words(a);
  const right = new Set(words(b));
  if (left.length === 0 || right.size === 0) return false;
  return left.some((w) => right.has(w));
}

const closeAmounts = (a: Cents, b: Cents): boolean =>
  Math.abs(a - b) <= Math.max(AMOUNT_CENTS, Math.round(Math.max(a, b) * AMOUNT_SHARE));

/**
 * For each row, the movement of an automatic operation it repeats, if any: the same type, a date
 * at most 3 days away, a close amount and a concept alike. Each movement covers one row at most
 * (the closest date wins), so two charges of the same month are not both taken for it.
 */
export function coveringMovements(
  rows: MatchableRow[],
  movements: RuleMovement[]
): (RuleMovement | null)[] {
  const used = new Set<string>();
  return rows.map((row) => {
    const found = movements
      .filter(
        (m) =>
          !used.has(m.id) &&
          m.type === row.type &&
          daysApart(m.date, row.date) <= MATCH_DAYS &&
          closeAmounts(m.amountCents, row.amountCents) &&
          similarConcepts(m.description, row.description)
      )
      .sort((a, b) => daysApart(a.date, row.date) - daysApart(b.date, row.date))[0];
    if (!found) return null;
    used.add(found.id);
    return found;
  });
}
