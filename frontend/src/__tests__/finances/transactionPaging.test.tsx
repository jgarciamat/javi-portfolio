import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { pageOfGroups, type DayGroup } from '@modules/finances/domain/transactionGrouping';
import { pagesFor } from '@shared/hooks/usePagination';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { mockMatchMedia } from '@test-utils/dom';

const accounts = [
  f.account({ id: 'a1', name: 'Principal', isDefault: true }),
  f.account({ id: 'a2', name: 'Efectivo' }),
];

/** `count` movements of March, three a day, the n-th called «Mov nn». */
const movements = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    f.transaction({
      id: `t${i + 1}`,
      description: `Mov ${String(i + 1).padStart(2, '0')}`,
      amount: 10,
      date: `2026-03-${String(Math.floor(i / 3) + 1).padStart(2, '0')}`,
      accountId: i % 2 === 0 ? 'a1' : 'a2',
    })
  );

function setup(count: number) {
  const api = createFakeApi();
  api.monthApi.get.mockResolvedValue(f.overview({ transactions: movements(count) }));
  api.categoryApi.getAll.mockResolvedValue([f.category({ id: 'c1', name: 'Ocio' })]);
  api.accountApi.getAll.mockResolvedValue({ accounts, total: 1000 });
  return { ...renderWithProviders(<Dashboard />, { api }), api };
}

const rows = () =>
  screen
    .getAllByRole('checkbox', { name: /^Seleccionar: Mov/ })
    .map((c) => c.getAttribute('aria-label'));
const pager = () =>
  screen.getByRole('navigation', {
    name: tr('app.pager.label', { what: tr('app.transactions.pager.label') }),
  });
const what = tr('app.transactions.pager.label');
const next = () => within(pager()).getByRole('button', { name: tr('app.pager.nextOf', { what }) });
const prev = () =>
  within(pager()).getByRole('button', { name: tr('app.pager.previousOf', { what }) });
const headerBox = () => screen.getAllByRole('checkbox', { name: tr('app.bulk.selectAll') })[0];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_recap_seen', '2026-3');
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

describe('paging the movements of the month', () => {
  it('shows no pager up to 20 movements', async () => {
    setup(20);
    await screen.findByText('Mov 01');
    expect(rows()).toHaveLength(20);
    expect(screen.queryByRole('navigation', { name: /Páginas/ })).toBeNull();
  });

  it('pages by 20 with prev/next, keyboard and a status line', async () => {
    setup(45);
    await screen.findByText('Mov 01');
    expect(rows()).toHaveLength(20);
    expect(within(pager()).getByText(/Página 1 de 3 · Mostrando 1-20 de 45/)).toBeInTheDocument();
    expect(prev()).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(prev());
    expect(within(pager()).getByText(/Página 1 de 3/)).toBeInTheDocument();

    fireEvent.click(next());
    expect(within(pager()).getByText(/Página 2 de 3 · Mostrando 21-40 de 45/)).toBeInTheDocument();
    expect(rows()).toHaveLength(20);

    fireEvent.keyDown(next(), { key: 'ArrowRight' });
    expect(within(pager()).getByText(/Página 3 de 3 · Mostrando 41-45 de 45/)).toBeInTheDocument();
    expect(rows()).toHaveLength(5);
    expect(next()).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(next());
    expect(within(pager()).getByText(/Página 3 de 3/)).toBeInTheDocument();

    fireEvent.keyDown(pager(), { key: 'ArrowLeft' });
    fireEvent.keyDown(pager(), { key: 'Enter' });
    expect(within(pager()).getByText(/Página 2 de 3/)).toBeInTheDocument();
  });

  it('keeps selecting every movement of the month, not only the page', async () => {
    setup(45);
    await screen.findByText('Mov 01');
    expect(
      screen.getByText(tr('app.transactions.pager.selectionNote', { count: 45 }))
    ).toBeInTheDocument();
    fireEvent.click(headerBox());
    expect(screen.getByText(tr('app.bulk.selected', { count: 45, total: 45 }))).toBeInTheDocument();
    fireEvent.click(next());
    expect(screen.getAllByRole('checkbox', { name: /^Seleccionar: Mov/ })[0]).toBeChecked();
    expect(headerBox()).toBeChecked();
  });

  it('goes back to page 1 when the account filter changes', async () => {
    setup(60);
    await screen.findByText('Mov 01');
    fireEvent.click(next());
    expect(within(pager()).getByText(/Página 2 de 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { pressed: false, name: /Efectivo/ }));
    await waitFor(() => expect(within(pager()).getByText(/Página 1 de 2/)).toBeInTheDocument());
  });

  it('steps back a page when the last row of the last page is deleted', async () => {
    const { api } = setup(41);
    api.transactionApi.delete.mockImplementation(async () => {
      // The month comes back without the deleted movement.
      api.monthApi.get.mockResolvedValue(f.overview({ transactions: movements(40) }));
    });
    await screen.findByText('Mov 01');
    fireEvent.click(next());
    fireEvent.click(next());
    expect(rows()).toHaveLength(1);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`^${tr('app.transaction.table.delete')}: `) })
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: tr('app.confirm.delete.confirm'),
      })
    );
    await waitFor(() => expect(within(pager()).getByText(/Página 2 de 2/)).toBeInTheDocument());
  });

  it('pages the cards on small screens too', async () => {
    mockMatchMedia(true);
    setup(25);
    await screen.findByText('Mov 01');
    expect(rows()).toHaveLength(20);
    fireEvent.click(next());
    expect(rows()).toHaveLength(5);
  });
});

describe('page helpers', () => {
  const day = (key: string, n: number): DayGroup => ({
    dayKey: key,
    label: key,
    items: Array.from({ length: n }, (_, i) => f.transaction({ id: `${key}-${i}` })),
  });

  it('splits a day across two pages and counts pages', () => {
    const groups = [day('a', 3), day('b', 3)];
    expect(pageOfGroups(groups, 1, 4).map((g) => g.items.length)).toEqual([3, 1]);
    expect(pageOfGroups(groups, 2, 4).map((g) => [g.dayKey, g.items.length])).toEqual([['b', 2]]);
    expect(pageOfGroups(groups, 3, 4)).toEqual([]);
    expect(pagesFor(0, 20)).toBe(1);
    expect(pagesFor(41, 20)).toBe(3);
  });
});
