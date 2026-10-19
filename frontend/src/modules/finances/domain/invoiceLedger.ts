import { guessExpenseKind, type BookEntry, type BookKind } from './invoiceBook';
import type { Missing, PdfEntry } from './invoicePdf';
import type { ExpenseKind, VatRate } from './types';
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
  /** Read from an invoice in PDF: its fields can be corrected in the review. */
  source?: 'pdf';
  /** Why the reading should be checked (codes of the PDF reader); empty once the person did. */
  review?: string[];
  /** Fields the PDF did not give: the invoice stays out of the draft until they are filled in. */
  missing?: Missing[];
}

/** What is still to check of an invoice read from a PDF (none for the others). */
export const reviewOf = (i: ImportedInvoice): string[] => i.review ?? [];
export const missingOf = (i: ImportedInvoice): Missing[] => i.missing ?? [];
/** Whether an invoice still has something to check or to fill in. */
export const needsCheck = (i: ImportedInvoice) => reviewOf(i).length > 0 || missingOf(i).length > 0;

/** What the person can correct in an imported invoice. */
export type InvoicePatch = Partial<
  Pick<ImportedInvoice, 'kind' | 'excluded' | 'retentionFix' | 'withholding' | 'review'>
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
  const ids = new Set(incoming.map((i) => i.id));
  // Invoices read from PDFs are not part of the book: they stay unless the book has them too.
  const kept = list.filter((i) =>
    i.source === 'pdf' ? !ids.has(i.id) : i.book !== book || !quarters.includes(i.quarter)
  );
  return { list: [...kept, ...incoming], quarters };
}

/**
 * The entries of an invoice read from a PDF as invoices of a book. One with missing fields stays out
 * of the draft until the person completes it; the kind starts from what was chosen for the supplier.
 */
export function toPdfInvoices(
  book: BookKind,
  entries: PdfEntry[],
  review: string[],
  guessed: ExpenseKind,
  preferences: KindPreferences
): ImportedInvoice[] {
  const seen = new Map<string, number>();
  return entries.map(({ missing, ...entry }) => {
    const key = sameKey(book, entry);
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return {
      ...entry,
      id: n === 1 ? hash(key) : `${hash(key)}-${n}`,
      book,
      kind: book === 'issued' ? 'other' : preferences[supplierKey(entry.concept)] ?? guessed,
      excluded: missing.length > 0,
      source: 'pdf',
      review,
      missing,
    };
  });
}

/** New invoices added to the list; the ones already there (same id) are kept as they are. */
export function addInvoices(
  list: ImportedInvoice[],
  incoming: ImportedInvoice[]
): { list: ImportedInvoice[]; quarters: Quarter[]; fresh: ImportedInvoice[] } {
  const ids = new Set(list.map((i) => i.id));
  const fresh = incoming.filter((i) => !ids.has(i.id));
  const quarters = Array.from(new Set(fresh.map((i) => i.quarter))).sort();
  return { list: [...list, ...fresh], quarters, fresh };
}

/** The invoices without some of them; `quarters` are the ones whose figures change, by book. */
export function dropInvoices(
  list: ImportedInvoice[],
  ids: string[]
): { list: ImportedInvoice[]; quarters: Partial<Record<BookKind, Quarter[]>> } {
  const quarters: Partial<Record<BookKind, Quarter[]>> = {};
  for (const i of list.filter((x) => ids.includes(x.id))) {
    const changed = (quarters[i.book] ??= []);
    if (!changed.includes(i.quarter)) changed.push(i.quarter);
  }
  return { list: list.filter((i) => !ids.includes(i.id)), quarters };
}

/** What the person can correct of an invoice read from a PDF. */
export interface InvoiceEdit {
  date: string;
  concept: string;
  base: number;
  vatRate: VatRate;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * An invoice corrected by the person: its quarter follows its date, its VAT the base and rate (the
 * printed VAT stays while they do not change). Corrected means checked: it has nothing left to review,
 * and one that was incomplete goes into the draft. The id stays, so importing the PDF again finds it.
 */
export function editInvoice(
  list: ImportedInvoice[],
  id: string,
  edit: InvoiceEdit
): { list: ImportedInvoice[]; quarters: Partial<Record<BookKind, Quarter[]>> } {
  const old = list.find((i) => i.id === id) as ImportedInvoice;
  const quarter = (Math.floor((Number(edit.date.slice(5, 7)) - 1) / 3) + 1) as Quarter;
  const incomplete = missingOf(old).length > 0;
  const vat =
    !incomplete && edit.base === old.base && edit.vatRate === old.vatRate
      ? old.vat
      : round2((edit.base * edit.vatRate) / 100);
  const next: ImportedInvoice = {
    ...old,
    ...edit,
    concept: edit.concept.trim(),
    quarter,
    vat,
    total: round2(edit.base + vat),
    excluded: incomplete ? false : old.excluded,
    review: [],
    missing: [],
  };
  return {
    list: list.map((i) => (i.id === id ? next : i)),
    quarters: { [old.book]: Array.from(new Set([old.quarter, quarter])) },
  };
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
