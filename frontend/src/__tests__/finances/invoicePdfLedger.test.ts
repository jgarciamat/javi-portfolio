import type { BookEntry } from '@modules/finances/domain/invoiceBook';
import {
  addInvoices,
  dropInvoices,
  editInvoice,
  mergeInvoices,
  toInvoices,
  toPdfInvoices,
  type ImportedInvoice,
} from '@modules/finances/domain/invoiceLedger';
import type { PdfEntry } from '@modules/finances/domain/invoicePdf';
import { emptyManual } from '@modules/finances/ui/components/AutonomoManual';
import { toSaved } from '@modules/finances/ui/components/autonomoSync';

const entry = (over: Partial<PdfEntry> = {}): PdfEntry => ({
  date: '2026-02-10',
  quarter: 1,
  base: 100,
  vatRate: 21,
  vat: 21,
  total: 121,
  withheld: 0,
  concept: 'Gestoría Pérez SL',
  missing: [],
  ...over,
});

const pdfInvoices = (entries: PdfEntry[], review: string[] = []) =>
  toPdfInvoices('received', entries, review, 'management', {});

describe('Invoices read from a PDF in the list of imported invoices', () => {
  it('get the id of the same invoice in a book, the kind chosen for the supplier, and stay out when incomplete', () => {
    const [read] = pdfInvoices([entry()]);
    const [fromBook] = toInvoices('received', [entry() as BookEntry], {}, []);
    expect(read.id).toBe(fromBook.id);
    expect(read).toMatchObject({ source: 'pdf', review: [], missing: [], excluded: false });
    expect(
      toPdfInvoices('received', [entry()], [], 'management', { 'gestoria perez': 'rent' })[0].kind
    ).toBe('rent');
    expect(toPdfInvoices('issued', [entry()], [], 'management', {})[0].kind).toBe('other');
    expect(pdfInvoices([entry({ missing: ['date'] })], ['date'])[0]).toMatchObject({
      excluded: true,
      review: ['date'],
    });
    // Two lines with the same rate in one PDF are two invoices.
    const twice = pdfInvoices([entry(), entry()]);
    expect(twice[1].id).toBe(`${twice[0].id}-2`);
  });

  it('are added once: the ones already there stay as they are', () => {
    const [a] = pdfInvoices([entry()]);
    const [b] = pdfInvoices([entry({ date: '2026-05-01', quarter: 2 })]);
    const first = addInvoices([], [a]);
    expect(first).toEqual({ list: [a], quarters: [1], fresh: [a] });
    const again = addInvoices([{ ...a, kind: 'rent' }], [a, b]);
    expect(again.list.map((i) => [i.id, i.kind])).toEqual([
      [a.id, 'rent'],
      [b.id, 'management'],
    ]);
    expect(again.quarters).toEqual([2]);
  });

  it('stay when a book is imported again, unless the book has the same invoice', () => {
    const [kept] = pdfInvoices([entry({ concept: 'Otro SL' })]);
    const [same] = pdfInvoices([entry()]);
    const book = toInvoices('received', [entry() as BookEntry], {}, []);
    const merged = mergeInvoices([kept, same], 'received', book);
    expect(merged.list.map((i) => i.id)).toEqual([kept.id, book[0].id]);
    expect(merged.list[1].source).toBeUndefined();
  });

  it('can be taken out, saying which quarters of which book change', () => {
    const list = [
      ...pdfInvoices([entry(), entry({ date: '2026-04-02', quarter: 2, base: 50 })]),
      ...toPdfInvoices('issued', [entry({ base: 7 })], [], 'other', {}),
    ];
    const { list: rest, quarters } = dropInvoices(
      list,
      list.map((i) => i.id)
    );
    expect(rest).toEqual([]);
    expect(quarters).toEqual({ received: [1, 2], issued: [1] });
    expect(dropInvoices(list, [list[0].id, list[0].id]).list).toHaveLength(2);
  });

  it('are corrected: quarter from the date, VAT from base and rate, and nothing left to check', () => {
    const [incomplete, other] = pdfInvoices(
      [entry({ missing: ['base'], base: 0, vat: 0, total: 0 }), entry({ concept: 'Otro SL' })],
      ['amount']
    );
    const fixed = editInvoice([incomplete, other], incomplete.id, {
      date: '2026-07-01',
      concept: '  Gestoría Nueva  ',
      base: 200,
      vatRate: 10,
    });
    expect(fixed.list[0]).toMatchObject({
      id: incomplete.id,
      date: '2026-07-01',
      quarter: 3,
      concept: 'Gestoría Nueva',
      base: 200,
      vatRate: 10,
      vat: 20,
      total: 220,
      excluded: false,
      review: [],
      missing: [],
    });
    expect(fixed.list[1]).toBe(other);
    expect(fixed.quarters).toEqual({ received: [1, 3] });

    // The same base and rate keep the printed VAT; an invoice left out stays out.
    const printed: ImportedInvoice = { ...other, vat: 21.01, total: 121.01, excluded: true };
    const kept = editInvoice([printed], printed.id, {
      date: printed.date,
      concept: printed.concept,
      base: 100,
      vatRate: 21,
    });
    expect(kept.list[0]).toMatchObject({ vat: 21.01, total: 121.01, excluded: true });
    expect(kept.quarters).toEqual({ received: [1] });
  });

  it('keep what is still to check in the copy of the account, and only them', () => {
    const [read] = pdfInvoices([entry({ missing: ['date'] })], ['date']);
    const [book] = toInvoices('received', [entry() as BookEntry], {}, []);
    const bare = { ...read, review: undefined, missing: undefined };
    const saved = toSaved({ ...emptyManual(), invoices: [read, book, bare] }, {}, {});
    expect(saved.manual.invoices[0]).toMatchObject({
      source: 'pdf',
      review: ['date'],
      missing: ['date'],
    });
    expect(saved.manual.invoices[1]).not.toHaveProperty('source');
    expect(saved.manual.invoices[2]).toMatchObject({ source: 'pdf', review: [], missing: [] });
  });
});
