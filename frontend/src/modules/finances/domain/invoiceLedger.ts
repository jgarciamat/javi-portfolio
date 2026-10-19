import { guessExpenseKind, type BookEntry, type BookKind } from './invoiceBook';
import type { ExpenseKind } from './types';
import type { WithholdingRole } from './withholdings';

/**
 * The invoices imported from the books, one by one, so the person can check them and correct the
 * kind of each expense. The quarters of the draft are worked out from them, not stored apart.
 */

export type Quarter = 1 | 2 | 3 | 4;

export interface ImportedInvoice extends BookEntry {
  /** Same invoice, same id: importing the book again finds it (and keeps what was corrected). */
  id: string;
  book: BookKind;
  /** The kind of expense (received invoices); issued ones keep "other", it is not used. */
  kind: ExpenseKind;
  /** Left out of the draft by the person. */
  excluded: boolean;
  /** The withholding of a received invoice as the person corrected it (the book's stays in `retention`). */
  retentionFix?: number;
  /** Which form the withholding goes to, when the person chose it (otherwise it follows the kind). */
  withholding?: WithholdingRole;
}

/** What the person can correct in an imported invoice. */
export type InvoicePatch = Partial<
  Pick<ImportedInvoice, 'kind' | 'excluded' | 'retentionFix' | 'withholding'>
>;

/** Supplier (normalised) → the kind the person chose for it, for the next imports. */
export type KindPreferences = Record<string, ExpenseKind>;

/** The supplier or client as one key: no accents, case, punctuation or company suffixes. */
export function supplierKey(concept: string): string {
  return concept
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\b(s ?l ?u?|s ?a ?u?|s ?c|s ?coop|cb|sll|sociedad limitada|sociedad anonima)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A short, stable hash (FNV-1a) as base 36: enough to tell the invoices of a book apart. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** The fields that make an invoice the same one: book, date, supplier, base and VAT rate. */
const sameKey = (book: BookKind, e: BookEntry) =>
  [book, e.date, supplierKey(e.concept), e.base.toFixed(2), e.vatRate].join('|');

/**
 * The entries of a book as invoices. Repeated invoices get a counter in their id, so two identical
 * rows stay two (and are reported); an id that was already imported keeps its correction.
 */
export function toInvoices(
  book: BookKind,
  entries: BookEntry[],
  preferences: KindPreferences,
  previous: ImportedInvoice[]
): ImportedInvoice[] {
  const before = new Map(previous.map((p) => [p.id, p]));
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const key = sameKey(book, entry);
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    const id = n === 1 ? hash(key) : `${hash(key)}-${n}`;
    const old = before.get(id);
    const kind: ExpenseKind =
      book === 'issued'
        ? 'other'
        : old?.kind ?? preferences[supplierKey(entry.concept)] ?? guessExpenseKind(entry.concept);
    return {
      ...entry,
      id,
      book,
      kind,
      excluded: old?.excluded ?? false,
      // The corrections of the withholding stay too.
      ...(old?.retentionFix !== undefined ? { retentionFix: old.retentionFix } : {}),
      ...(old?.withholding ? { withholding: old.withholding } : {}),
    };
  });
}

/**
 * The invoices with a newly imported book: its quarters are replaced (as the form's are), the other
 * quarters and the other book stay. Returns the quarters that changed.
 */
export function mergeInvoices(
  list: ImportedInvoice[],
  book: BookKind,
  incoming: ImportedInvoice[]
): { list: ImportedInvoice[]; quarters: Quarter[] } {
  const quarters = Array.from(new Set(incoming.map((i) => i.quarter))).sort();
  const kept = list.filter((i) => i.book !== book || !quarters.includes(i.quarter));
  return { list: [...kept, ...incoming], quarters };
}

/** The invoices with a change to some of them; `quarters` are the ones whose figures change. */
export function updateInvoices(
  list: ImportedInvoice[],
  ids: string[],
  patch: InvoicePatch
): { list: ImportedInvoice[]; quarters: Partial<Record<BookKind, Quarter[]>> } {
  const quarters: Partial<Record<BookKind, Quarter[]>> = {};
  const next = list.map((i) => {
    if (!ids.includes(i.id)) return i;
    const changed = (quarters[i.book] ??= []);
    if (!changed.includes(i.quarter)) changed.push(i.quarter);
    return { ...i, ...patch };
  });
  return { list: next, quarters };
}

/** Other invoices of the same supplier with a different kind: the ones a correction could go to. */
export function sameSupplier(list: ImportedInvoice[], invoice: ImportedInvoice): ImportedInvoice[] {
  const key = supplierKey(invoice.concept);
  return list.filter(
    (i) =>
      i.book === invoice.book &&
      i.id !== invoice.id &&
      i.kind !== invoice.kind &&
      key !== '' &&
      supplierKey(i.concept) === key
  );
}
