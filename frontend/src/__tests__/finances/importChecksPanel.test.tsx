import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { emptyManual } from '@modules/finances/ui/components/AutonomoManual';
import { toInvoices } from '@modules/finances/domain/invoiceLedger';
import type { BookEntry } from '@modules/finances/domain/invoiceBook';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { bringIntoView } from '@modules/finances/ui/components/bringIntoView';

const entry = (date: string, concept: string, base: number, over: Partial<BookEntry> = {}) => ({
  date,
  quarter: (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1) as 1 | 2 | 3 | 4,
  base,
  vatRate: 21 as const,
  vat: Math.round(base * 21) / 100,
  total: Math.round(base * 121) / 100,
  withheld: 0,
  concept,
  ...over,
});

/** A form kept on the device with imported invoices, as the import leaves it. */
const stored = (invoices: ReturnType<typeof toInvoices>, over: object = {}) =>
  localStorage.setItem(
    'mm_autonomo_manual2',
    JSON.stringify({ ...emptyManual(), invoices, ...over })
  );

const open = async () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
  renderWithProviders(<BusinessView />, { api, plan: true });
  return screen.findByRole('region', { name: tr('app.autonomo.checks.title') });
};

beforeEach(() => {
  localStorage.clear();
  // Everything together (the assistant has its own suite).
  localStorage.setItem('mm_autonomo_assistant', 'expert');
  // The fourth quarter of 2026 has begun: the draft opens on it.
  freezeTime('2026-10-18T12:00:00');
});
afterEach(restoreTime);

describe('«Before you calculate»', () => {
  it('is not there without imported invoices, or when they are fine', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    renderWithProviders(<BusinessView />, { api, plan: true });
    await screen.findByLabelText(tr('app.autonomo.workArea'));
    expect(screen.queryByText(tr('app.autonomo.checks.title'))).toBeNull();
  });

  it('lists the warnings first and opens the invoice each one is about', async () => {
    const list = toInvoices(
      'received',
      [
        entry('2026-02-01', 'Algo raro', 400),
        entry('2026-02-01', 'Algo raro', 400),
        entry('2026-05-01', 'Alquiler', 100),
        entry('2026-05-02', '', -5),
      ],
      {},
      []
    );
    stored(list);
    const panel = await open();
    const items = within(panel).getAllByRole('listitem');
    expect(items[0]).toHaveClass('autonomo-check--warn');
    expect(items[0]).toHaveTextContent(tr('app.autonomo.checks.level.warn'));
    expect(items[0]).toHaveTextContent(
      tr('app.autonomo.checks.duplicate', {
        who: 'Algo raro',
        date: '1 feb 2026',
        base: '400,00 €',
        n: 2,
      }).replace(/\s/g, ' ')
    );
    expect(items[items.length - 1]).toHaveClass('autonomo-check--info');
    // An invoice without a supplier still has a name to be opened by.
    expect(
      within(items[items.length - 1]).getByRole('button', {
        name: new RegExp(tr('app.autonomo.review.noName').replace(/[()]/g, '\\$&')),
      })
    ).toBeInTheDocument();
    // Opening an invoice brings its row into view, lit and with the focus on its kind.
    fireEvent.click(within(items[0]).getAllByRole('button')[1]);
    const row = document.getElementById(`autonomo-invoice-${list[1].id}`) as HTMLElement;
    expect(row).toHaveClass('is-highlighted');
    await waitFor(() =>
      expect(within(row).getByRole('combobox', { name: /^Tipo de gasto/ })).toHaveFocus()
    );
  });

  it('opens the review again when it was folded, and goes to an empty quarter', async () => {
    stored(toInvoices('issued', [entry('2026-02-01', 'Cliente', 100)], {}, []));
    const panel = await open();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.review.hide') }));
    expect(screen.queryByRole('table')).toBeNull();
    // Quarters 2, 3 and 4 have begun with no income.
    const go = within(panel).getByRole('button', {
      name: tr('app.autonomo.checks.goQuarter', { n: 3 }),
    });
    fireEvent.click(go);
    expect(
      screen.getByRole('heading', { name: tr('app.autonomo.quarterN', { n: 3 }) })
    ).toHaveFocus();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('sends to the review when a modelo 130 does not match, and to the table when there are many invoices', async () => {
    const list = toInvoices(
      'received',
      [1, 2, 3, 4, 5, 6].map((d) =>
        entry(`2026-0${d}-0${d}`, 'Otro', 100, { vatRate: 0, vat: 0, total: 100 })
      ),
      {},
      []
    );
    stored(list, {
      model130: { year: 2026, quarter: 2, income: 0, expenses: 5000 },
      prior: { on: true, income: '', expenses: '5000', payments: '', withheld: '' },
    });
    const panel = await open();
    expect(within(panel).getByText(/declara 5000,00 € de gastos deducibles/)).toBeInTheDocument();
    const review = within(panel).getByRole('button', { name: tr('app.autonomo.checks.review') });
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.review.hide') }));
    fireEvent.click(review);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: tr('app.autonomo.review.hide') })).toHaveFocus()
    );
    // Six 0 % expenses: four are listed and the rest are in the table.
    const more = within(panel).getAllByRole('button', {
      name: tr('app.autonomo.checks.more', { n: 2 }),
    });
    expect(more.length).toBeGreaterThan(0);
    fireEvent.click(more[0]);
    // Asking twice for the same thing works too.
    fireEvent.click(more[0]);
    expect(screen.getAllByRole('table')).toHaveLength(1);
  });

  it('does nothing when what it should show is not on the page', () => {
    expect(bringIntoView('nowhere', ['button'])).toBe(false);
    document.body.innerHTML = '<div id="here"><span>no control</span></div>';
    expect(bringIntoView('here', ['button'])).toBe(true);
  });
});
