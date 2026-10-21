import type { BankPdfResult, Entry } from './types';

const cents = (n: number): number => Math.round(n * 100);

/** Entries whose balance is not the neighbour's balance plus their amount. */
function mismatches(entries: Entry[], newestFirst: boolean): number {
  let bad = 0;
  entries.forEach((entry, i) => {
    const older = entries[newestFirst ? i + 1 : i - 1];
    if (entry.balance === null || !older || older.balance === null) return;
    if (cents(older.balance + entry.row.amount) !== cents(entry.balance)) bad += 1;
  });
  return bad;
}

/**
 * The movements oldest first, and how many break the balance chain. Statements list
 * the newest movement first or last: the dates say which; when they all fall on the
 * same day the balances do.
 */
export function orderEntries(entries: Entry[]): Pick<BankPdfResult, 'rows' | 'balanceMismatches'> {
  const first = entries[0].row.date;
  const last = entries[entries.length - 1].row.date;
  const newestFirst =
    first === last ? mismatches(entries, true) < mismatches(entries, false) : first > last;
  const ordered = newestFirst ? [...entries].reverse() : entries;
  return {
    rows: ordered.map((e) => e.row),
    balanceMismatches: mismatches(entries, newestFirst),
  };
}
