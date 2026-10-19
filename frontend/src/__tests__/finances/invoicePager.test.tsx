import { useState } from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { emptyManual, type ManualForm } from '@modules/finances/ui/components/AutonomoManual';
import { InvoiceReview, type ReviewFocus } from '@modules/finances/ui/components/InvoiceReview';
import { pagesOf, validPage, pageOfIndex } from '@modules/finances/ui/components/InvoicePager';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { renderWithProviders, tr } from '@test-utils/render';

/** Invented invoices: the n-th of a book is dated on day n of 2026 (in order). */
const invoice = (book: 'issued' | 'received', n: number): ImportedInvoice => {
  const date = new Date(Date.UTC(2026, 0, n)).toISOString().slice(0, 10);
  return {
    id: `${book}-${n}`,
    book,
    kind: 'material',
    excluded: false,
    date,
    quarter: Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1,
    base: 100,
    vatRate: 21,
    vat: 21,
    total: 121,
    withheld: 0,
    concept: `Empresa ${book} ${n}`,
  };
};
const many = (book: 'issued' | 'received', count: number) =>
  Array.from({ length: count }, (_, i) => invoice(book, i + 1));

let latest: ManualForm = emptyManual();
let setForm: (form: ManualForm) => void = () => undefined;
let setFocus: (focus: ReviewFocus | null) => void = () => undefined;
function Harness({ invoices }: { invoices: ImportedInvoice[] }) {
  const [form, set] = useState<ManualForm>({ ...emptyManual(), invoices });
  const [focus, changeFocus] = useState<ReviewFocus | null>(null);
  latest = form;
  setForm = set;
  setFocus = changeFocus;
  return <InvoiceReview form={form} onChange={set} focus={focus} />;
}

const show = (invoices: ImportedInvoice[]) =>
  renderWithProviders(<Harness invoices={invoices} />, { authenticated: false });

const caption = (book: 'issued' | 'received', n: number) =>
  tr(`app.autonomo.review.${book}`, { n });
const pagers = (book: 'issued' | 'received', n: number) =>
  screen.getAllByRole('navigation', {
    name: tr('app.autonomo.review.pages.label', { what: caption(book, n) }),
  });
const press = (key: string, book: 'issued' | 'received', n: number) =>
  fireEvent.click(
    within(pagers(book, n)[0]).getByRole('button', {
      name: tr(`app.autonomo.review.pages.${key}Of`, { what: caption(book, n) }),
    })
  );
const table = (book: 'issued' | 'received', n: number) =>
  screen.getByRole('table', { name: caption(book, n) });
const rows = (book: 'issued' | 'received', n: number) =>
  within(table(book, n)).getAllByRole('row').length - 1;

describe('The pages of the imported invoices', () => {
  it('works out pages, valid pages and the page of a row', () => {
    expect(pagesOf(0)).toBe(1);
    expect(pagesOf(15)).toBe(1);
    expect(pagesOf(16)).toBe(2);
    expect(pagesOf(61)).toBe(5);
    expect(validPage(7, 30)).toBe(2);
    expect(validPage(0, 30)).toBe(1);
    expect(pageOfIndex(0)).toBe(1);
    expect(pageOfIndex(15)).toBe(2);
  });

  it('shows 15 at a time in each table, with its own pager, and keeps the totals of all', () => {
    show([...many('issued', 24), ...many('received', 37)]);
    expect(screen.getByText(tr('app.autonomo.review.summary', { n: 61 }))).toBeInTheDocument();
    expect(rows('issued', 24)).toBe(15);
    expect(rows('received', 37)).toBe(15);
    // A pager above and below each table.
    expect(pagers('issued', 24)).toHaveLength(2);
    expect(within(pagers('issued', 24)[0]).getByText(/Página 1 de 2/)).toHaveAttribute(
      'aria-live',
      'polite'
    );

    press('next', 'received', 37);
    const status = within(pagers('received', 37)[0]).getByText(/Página 2 de 3/);
    expect(status).toHaveTextContent(
      tr('app.autonomo.review.pages.showing', { from: 16, to: 30, count: 37 })
    );
    expect(within(table('received', 37)).getByText('Empresa received 16')).toBeInTheDocument();
    // The other table stays where it was.
    expect(within(table('issued', 24)).getByText('Empresa issued 1')).toBeInTheDocument();

    press('last', 'received', 37);
    expect(rows('received', 37)).toBe(7);
    expect(within(pagers('received', 37)[0]).getByText(/Mostrando 31-37 de 37/)).toBeTruthy();
    press('previous', 'received', 37);
    expect(within(pagers('received', 37)[0]).getByText(/Página 2 de 3/)).toBeTruthy();
    press('first', 'received', 37);
    expect(within(pagers('received', 37)[0]).getByText(/Página 1 de 3/)).toBeTruthy();
  });

  it('keeps a change made on another page and goes back to a valid page when rows go', () => {
    show(many('received', 40));
    press('last', 'received', 40);
    const box = screen.getByLabelText(
      tr('app.autonomo.review.includeOf', {
        invoice: tr('app.autonomo.review.invoice', {
          who: 'Empresa received 40',
          date: '9 feb 2026',
        }),
      })
    );
    fireEvent.click(box);
    expect(latest.invoices.find((i) => i.id === 'received-40')?.excluded).toBe(true);
    press('first', 'received', 40);
    press('last', 'received', 40);
    expect(within(table('received', 40)).getByText('Empresa received 40')).toBeInTheDocument();
    expect(screen.getByText(/Fuera del borrador: 1\./)).toBeInTheDocument();

    // Fewer invoices: the third page does not exist any more; the last one is shown.
    act(() => setForm({ ...latest, invoices: latest.invoices.slice(0, 20) }));
    expect(within(pagers('received', 20)[0]).getByText(/Página 2 de 2/)).toBeTruthy();
    // Up to 15: no pager at all.
    act(() => setForm({ ...latest, invoices: latest.invoices.slice(0, 15) }));
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(rows('received', 15)).toBe(15);
  });

  it('opens the page of an invoice a warning asks for', () => {
    show(many('issued', 31));
    act(() => setFocus({ id: 'issued-31', n: 1 }));
    expect(within(pagers('issued', 31)[0]).getByText(/Página 3 de 3/)).toBeTruthy();
    expect(document.getElementById('autonomo-invoice-issued-31')).toHaveClass('is-highlighted');
    // A request for an invoice that is not there changes no page.
    act(() => setFocus({ id: 'gone', n: 2 }));
    expect(within(pagers('issued', 31)[0]).getByText(/Página 3 de 3/)).toBeTruthy();
  });
});
