import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { SearchView } from '@modules/finances/ui/views/SearchView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { captureDownloads, mockMatchMedia } from '@test-utils/dom';
import type { Transaction } from '@modules/finances/domain/types';

const categories = [
  f.category({ id: 'c1', name: 'Ocio' }),
  f.category({ id: 'c2', name: 'Salario' }),
];
const accounts = [
  f.account({ id: 'a1', name: 'Principal', isDefault: true }),
  f.account({ id: 'a2', name: 'Efectivo' }),
];
const dinner = f.transaction({ id: 't1', description: 'Cena', amount: 40, date: '2026-03-10' });
const piggy = f.transaction({
  id: 't3',
  description: 'Hucha',
  amount: 100,
  type: 'SAVING',
  category: 'Ahorro',
  date: '2026-03-10',
});
const salary = f.transaction({
  id: 't2',
  description: 'Nómina',
  amount: 2000,
  type: 'INCOME',
  category: 'Salario',
  date: '2026-03-01',
  notes: 'marzo',
  recurringRuleId: 'r1',
});

function setup(
  transactions: Transaction[] = [dinner, piggy, salary],
  options: { accounts?: typeof accounts; categories?: typeof categories } = {}
) {
  const api = createFakeApi();
  api.monthApi.get.mockResolvedValue(f.overview({ transactions }));
  api.categoryApi.getAll.mockResolvedValue(options.categories ?? categories);
  api.accountApi.getAll.mockResolvedValue({ accounts: options.accounts ?? accounts, total: 1000 });
  return renderWithProviders(<Dashboard />, { api });
}

const box = (name: string) =>
  screen.getByRole('checkbox', { name: tr('app.bulk.selectRow', { name }) });
const headerBox = () => screen.getAllByRole('checkbox', { name: tr('app.bulk.selectAll') })[0];
const bar = () => screen.getByRole('region', { name: tr('app.bulk.region') });
const action = (key: string) =>
  within(bar()).getByRole('button', { name: new RegExp(tr(`app.bulk.action.${key}`)) });
const selectedText = (count: number, total: number) => tr('app.bulk.selected', { count, total });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_recap_seen', '2026-3');
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

describe('selecting movements of the month', () => {
  it('selects all, shows a partial header and clears with the button or Escape', async () => {
    setup();
    await screen.findByText('Cena');
    expect(screen.queryByRole('region', { name: tr('app.bulk.region') })).toBeNull();

    fireEvent.click(box('Cena'));
    expect(headerBox()).toHaveAttribute('aria-checked', 'mixed');
    expect((headerBox() as HTMLInputElement).indeterminate).toBe(true);
    expect(within(bar()).getByText(selectedText(1, 3))).toBeInTheDocument();
    expect(within(bar()).getByText(/Gastos −40,00/)).toBeInTheDocument();
    expect(within(bar()).getByText(/Neto −40,00/)).toBeInTheDocument();

    fireEvent.click(headerBox());
    expect(headerBox()).toBeChecked();
    expect(within(bar()).getByText(selectedText(3, 3))).toBeInTheDocument();
    expect(within(bar()).getByText(/Neto \+1860,00|Neto \+1.860,00/)).toBeInTheDocument();
    expect(within(bar()).getByText(/Ahorro 100,00/)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: tr('app.bulk.region') })).toBeNull();

    fireEvent.click(headerBox());
    fireEvent.click(headerBox());
    expect(screen.queryByRole('region', { name: tr('app.bulk.region') })).toBeNull();

    fireEvent.click(box('Nómina'));
    expect(within(bar()).getByText(/Gastos 0,00/)).toBeInTheDocument();
    expect(within(bar()).getByText(/Ingresos \+2000,00|Ingresos \+2.000,00/)).toBeInTheDocument();
    fireEvent.click(within(bar()).getByRole('button', { name: tr('app.bulk.clear') }));
    expect(box('Nómina')).not.toBeChecked();
  });

  it('selects ranges with Shift, adds with Ctrl/Cmd and selects whole days', async () => {
    setup();
    await screen.findByText('Cena');
    const order = screen
      .getAllByRole('checkbox')
      .map((c) => c.getAttribute('aria-label'))
      .filter((l) => l?.startsWith('Seleccionar: '));
    const [first, , last] = order.map((l) => l!.replace('Seleccionar: ', ''));

    // Shift without a previous row selects just that one.
    fireEvent.click(box(first), { shiftKey: true });
    fireEvent.click(box(last), { shiftKey: true });
    expect(within(bar()).getByText(selectedText(3, 3))).toBeInTheDocument();
    fireEvent.click(headerBox());

    // Backwards range from the keyboard: Shift+Space.
    fireEvent.click(box(last));
    fireEvent.keyDown(box(first), { key: ' ', shiftKey: true });
    expect(within(bar()).getByText(selectedText(3, 3))).toBeInTheDocument();
    fireEvent.keyDown(box(first), { key: ' ' });
    fireEvent.keyDown(box(first), { key: 'a', shiftKey: true });
    fireEvent.click(headerBox());

    // Ctrl/Cmd click on a row toggles it; a plain click or a click on its buttons does not.
    const row = screen.getByText('Cena').closest('tr')!;
    fireEvent.mouseDown(row, { shiftKey: true });
    fireEvent.mouseDown(row);
    fireEvent.click(row);
    expect(box('Cena')).not.toBeChecked();
    fireEvent.click(within(row).getByText('Cena'), { ctrlKey: true });
    expect(box('Cena')).toBeChecked();
    expect(row).toHaveClass('is-selected');
    fireEvent.click(row, { metaKey: true });
    expect(box('Cena')).not.toBeChecked();
    fireEvent.click(
      within(row).getByRole('button', { name: `${tr('app.transaction.table.edit')}: Cena` }),
      { ctrlKey: true }
    );
    expect(box('Cena')).not.toBeChecked();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(row, { shiftKey: true });
    expect(box('Cena')).toBeChecked();
  });
});

describe('day groups', () => {
  it('selects and unselects a whole day', async () => {
    setup();
    await screen.findByText('Cena');
    const day = screen.getByRole('checkbox', { name: /Seleccionar el día .*10 mar/ });
    fireEvent.click(box('Cena'));
    expect(day).toHaveAttribute('aria-checked', 'mixed');
    fireEvent.click(day);
    expect(box('Hucha')).toBeChecked();
    expect(day).toBeChecked();
    fireEvent.click(day);
    expect(box('Cena')).not.toBeChecked();
  });
});

describe('bulk delete', () => {
  it('confirms with the totals and dates, hides the rows and can be undone', async () => {
    const { api } = setup();
    await screen.findByText('Cena');
    fireEvent.click(headerBox());
    fireEvent.click(action('delete'));
    const dialog = screen.getByRole('dialog', { name: tr('app.bulk.delete.title', { count: 3 }) });
    expect(within(dialog).getByText(/1 mar.*10 mar/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(tr('app.bulk.note.deleteRecurring', { count: 1 }))
    ).toBeInTheDocument();
    // Escape closes the dialog, not the selection.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(bar()).toBeInTheDocument();

    fireEvent.click(action('delete'));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.bulk.delete.confirm', { count: 3 }) })
    );
    expect(screen.queryByText('Cena')).toBeNull();
    expect(screen.getByText(tr('app.bulk.undo.text', { count: 3 }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.bulk.undo.action') }));
    expect(screen.getByText('Cena')).toBeInTheDocument();
    expect(api.transactionApi.bulkDelete).not.toHaveBeenCalled();
  });

  it('sends a waiting delete when another one starts or the screen closes', async () => {
    const { api, unmount } = setup();
    api.transactionApi.bulkDelete.mockResolvedValue({ applied: ['t1'], skipped: [] });
    await screen.findByText('Cena');
    fireEvent.click(box('Cena'));
    fireEvent.click(action('delete'));
    const one = screen.getByRole('dialog', { name: tr('app.bulk.delete.title', { count: 1 }) });
    expect(within(one).queryByText(/Podrás|recurrente/)).toBeInTheDocument();
    fireEvent.click(
      within(one).getByRole('button', { name: tr('app.bulk.delete.confirm', { count: 1 }) })
    );

    fireEvent.click(box('Nómina'));
    fireEvent.click(action('delete'));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.bulk.delete.confirm', { count: 1 }) })
    );
    await waitFor(() => expect(api.transactionApi.bulkDelete).toHaveBeenCalledWith(['t1']));
    expect(await screen.findByText(tr('app.bulk.done.delete', { count: 1 }))).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByText(tr('app.bulk.done.delete', { count: 1 })).closest('div')!).getByRole(
        'button',
        { name: tr('app.common.close') }
      )
    );
    unmount();
    await waitFor(() => expect(api.transactionApi.bulkDelete).toHaveBeenCalledWith(['t2']));
  });
});

const openEdit = async (kind: string, names: string[], options?: Parameters<typeof setup>[1]) => {
  const view = setup([dinner, piggy, salary], options);
  await screen.findByText('Cena');
  for (const name of names) fireEvent.click(box(name));
  fireEvent.click(action(kind));
  return view;
};

describe('bulk changes', () => {
  it('changes the category at once and explains the movements left as they were', async () => {
    const { api } = await openEdit('category', ['Cena', 'Hucha']);
    api.transactionApi.bulkUpdate.mockResolvedValue({
      applied: ['t1'],
      skipped: [
        { id: 't3', code: 'INSUFFICIENT_BALANCE', reason: 'Saldo insuficiente' },
        { id: 't4', code: 'INSUFFICIENT_BALANCE', reason: 'Saldo insuficiente' },
        { id: 't5', code: 'ODD', reason: 'Motivo del servidor' },
      ],
    });
    const dialog = screen.getByRole('dialog', { name: tr('app.bulk.edit.category') });
    expect(within(dialog).getByText(tr('app.bulk.note.categoryGoals'))).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'c2' } });
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.bulk.apply', { count: 2 }) })
    );
    await waitFor(() =>
      expect(api.transactionApi.bulkUpdate).toHaveBeenCalledWith(['t1', 't3'], { categoryId: 'c2' })
    );
    expect(await screen.findByText(/Movimientos actualizados: 1/)).toBeInTheDocument();
    expect(
      screen.getByText(`2 · ${tr('app.bulk.reason.INSUFFICIENT_BALANCE')}`)
    ).toBeInTheDocument();
    expect(screen.getByText('1 · Motivo del servidor')).toBeInTheDocument();
    // The selection stays for another change.
    expect(bar()).toBeInTheDocument();
    await waitFor(() => expect(api.monthApi.get.mock.calls.length).toBeGreaterThan(1));
  });

  it('changes the type, with the savings rule when they become savings', async () => {
    const { api } = await openEdit('type', ['Cena']);
    const dialog = screen.getByRole('dialog', { name: tr('app.bulk.edit.type') });
    expect(within(dialog).queryByText(tr('app.bulk.note.savingBalance'))).toBeNull();
    fireEvent.click(
      within(dialog).getByRole('radio', { name: tr('app.transaction.form.type.saving') })
    );
    expect(within(dialog).getByText(tr('app.bulk.note.savingBalance'))).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.bulk.apply', { count: 1 }) })
    );
    await waitFor(() =>
      expect(api.transactionApi.bulkUpdate).toHaveBeenCalledWith(['t1'], { type: 'SAVING' })
    );
    expect(await screen.findByText(tr('app.bulk.done.update', { count: 0 }))).toBeInTheDocument();
  });

  it('moves movements to another account (only offered with several accounts)', async () => {
    const { api } = await openEdit('account', ['Cena']);
    const dialog = screen.getByRole('dialog', { name: tr('app.bulk.edit.account') });
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'a2' } });
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.bulk.apply', { count: 1 }) })
    );
    await waitFor(() =>
      expect(api.transactionApi.bulkUpdate).toHaveBeenCalledWith(['t1'], { accountId: 'a2' })
    );
  });

  it('hides the account action with a single account and needs a category', async () => {
    await openEdit('category', ['Cena'], { accounts: [accounts[0]], categories: [] });
    expect(within(bar()).queryByRole('button', { name: /Cuenta/ })).toBeNull();
    const dialog = screen.getByRole('dialog', { name: tr('app.bulk.edit.category') });
    expect(within(dialog).queryByText(tr('app.bulk.note.categoryGoals'))).toBeNull();
    expect(
      within(dialog).getByRole('button', { name: tr('app.bulk.apply', { count: 1 }) })
    ).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.confirm.delete.cancel') }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves movements to another day, warning about recurring ones and savings', async () => {
    const { api } = await openEdit('date', ['Nómina', 'Hucha']);
    const dialog = screen.getByRole('dialog', { name: tr('app.bulk.edit.date') });
    expect(within(dialog).getByText(tr('app.bulk.note.dateRecurring'))).toBeInTheDocument();
    expect(within(dialog).getByText(tr('app.bulk.note.savingBalance'))).toBeInTheDocument();
    const input = dialog.querySelector('input[type="date"]')!;
    const apply = within(dialog).getByRole('button', { name: tr('app.bulk.apply', { count: 2 }) });
    fireEvent.change(input, { target: { value: '' } });
    expect(apply).toBeDisabled();
    fireEvent.change(input, { target: { value: '2026-04-02' } });
    fireEvent.click(apply);
    await waitFor(() =>
      expect(api.transactionApi.bulkUpdate).toHaveBeenCalledWith(['t3', 't2'], {
        date: '2026-04-02',
      })
    );
  });

  it('a date change of plain expenses has no notes to read', async () => {
    await openEdit('date', ['Cena']);
    const dialog = screen.getByRole('dialog', { name: tr('app.bulk.edit.date') });
    expect(dialog.querySelector('.bulk-note')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.common.close') }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('replaces, clears or appends notes, leaving out those that would grow too long', async () => {
    const long = f.transaction({ id: 't9', description: 'Larga', notes: 'x'.repeat(995) });
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(f.overview({ transactions: [dinner, salary, long] }));
    api.categoryApi.getAll.mockResolvedValue(categories);
    api.accountApi.getAll.mockResolvedValue({ accounts, total: 1000 });
    renderWithProviders(<Dashboard />, { api });
    await screen.findByText('Cena');
    fireEvent.click(headerBox());
    fireEvent.click(action('notes'));
    let dialog = screen.getByRole('dialog', { name: tr('app.bulk.edit.notes') });
    const text = () =>
      within(dialog).getByRole('textbox', { name: tr('app.transaction.table.notes') });
    expect(text()).toHaveAttribute('placeholder', tr('app.bulk.notes.replaceHint'));
    // Replacing with nothing clears the notes.
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.bulk.apply', { count: 3 }) })
    );
    await waitFor(() =>
      expect(api.transactionApi.bulkUpdate).toHaveBeenLastCalledWith(['t1', 't2', 't9'], {
        notes: null,
        notesMode: 'replace',
      })
    );

    fireEvent.click(action('notes'));
    dialog = screen.getByRole('dialog', { name: tr('app.bulk.edit.notes') });
    fireEvent.click(within(dialog).getByRole('radio', { name: tr('app.bulk.notes.append') }));
    expect(text()).toHaveAttribute('placeholder', tr('app.bulk.notes.appendHint'));
    const apply = () => within(dialog).getByRole('button', { name: /Aplicar a/ });
    expect(apply()).toBeDisabled();
    fireEvent.change(text(), { target: { value: 'revisado' } });
    expect(
      within(dialog).getByText(tr('app.bulk.note.notesTooLong', { count: 1, valid: 2 }))
    ).toBeInTheDocument();
    fireEvent.click(apply());
    await waitFor(() =>
      expect(api.transactionApi.bulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], {
        notes: 'revisado',
        notesMode: 'append',
      })
    );

    fireEvent.click(action('notes'));
    dialog = screen.getByRole('dialog', { name: tr('app.bulk.edit.notes') });
    fireEvent.click(within(dialog).getByRole('radio', { name: tr('app.bulk.notes.replace') }));
    fireEvent.change(text(), { target: { value: ' nueva ' } });
    fireEvent.submit(text().closest('form')!);
    await waitFor(() =>
      expect(api.transactionApi.bulkUpdate).toHaveBeenLastCalledWith(['t1', 't2', 't9'], {
        notes: 'nueva',
        notesMode: 'replace',
      })
    );
  });

  it('shows an error when a change fails and reloads the month', async () => {
    const { api } = await openEdit('type', ['Cena']);
    api.transactionApi.bulkUpdate.mockRejectedValue(new Error('Sin conexión'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.bulk.apply', { count: 1 }) }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  });

  it('exports the selection to CSV', async () => {
    const downloads = captureDownloads();
    setup();
    await screen.findByText('Cena');
    fireEvent.click(box('Cena'));
    fireEvent.click(action('export'));
    expect(downloads.names).toEqual(['finanverso_seleccion_2026-03-15.csv']);
    const [csv] = await downloads.text();
    expect(csv).toContain('Cena');
    expect(csv).not.toContain('Nómina');
    downloads.restore();
  });
});

describe('other views of the month', () => {
  it('selects cards and days on mobile', async () => {
    const restore = mockMatchMedia(true);
    setup();
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.bulk.selectAll') }));
    expect(within(bar()).getByText(selectedText(3, 3))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar el día .*1 mar/ }));
    expect(box('Nómina')).not.toBeChecked();
    const card = screen.getByText('Cena').closest('.tx-card')!;
    fireEvent.click(card, { ctrlKey: true });
    expect(box('Cena')).not.toBeChecked();
    restore();
  });

  it('keeps the selection in the week view and selects there too', async () => {
    setup();
    await screen.findByText('Cena');
    fireEvent.click(box('Cena'));
    fireEvent.click(
      screen.getByRole('tab', { name: new RegExp(tr('app.transactions.view.week')) })
    );
    expect(within(bar()).getByText(selectedText(1, 3))).toBeInTheDocument();
    for (const week of screen.getAllByRole('button', { expanded: false })) fireEvent.click(week);
    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar el día .*10 mar/ }));
    expect(box('Hucha')).toBeChecked();
    const item = screen.getByText('Nómina').closest('.tx-week-item')!;
    fireEvent.click(item, { metaKey: true });
    expect(box('Nómina')).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.bulk.selectAll') }));
    expect(screen.queryByRole('region', { name: tr('app.bulk.region') })).toBeNull();
    await act(async () => undefined);
  });
});

describe('selecting search results', () => {
  const page = (items: Transaction[], total = items.length) => ({
    items,
    total,
    totals: { income: 0, expenses: 0, saving: 0 },
  });
  const third = f.transaction({ id: 't7', description: 'Taxi' });

  function search(onEdit = jest.fn(), failMonth = false) {
    const api = createFakeApi();
    if (failMonth) api.monthApi.get.mockRejectedValue(new Error('caído'));
    api.categoryApi.getAll.mockResolvedValue(categories);
    api.accountApi.getAll.mockResolvedValue({ accounts, total: 0 });
    api.transactionApi.search.mockImplementation(async (filters) =>
      filters.offset ? page([third], 3) : page([dinner, salary], 3)
    );
    const view = renderWithProviders(<SearchView onEdit={onEdit} />, { api });
    return { ...view, onEdit };
  }

  it('selects with checkboxes or Shift/Ctrl click, while a plain click still opens it', async () => {
    const { onEdit } = search();
    await screen.findByText('Cena');
    const row = screen.getByRole('button', { name: /Cena/ });
    fireEvent.mouseDown(row, { shiftKey: true });
    fireEvent.click(row, { shiftKey: true });
    expect(box('Cena')).toBeChecked();
    expect(onEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Nómina/ }));
    expect(onEdit).toHaveBeenCalledWith(salary);
    expect(within(bar()).getByText(selectedText(1, 3))).toBeInTheDocument();
    // Only when the whole page is selected the rest of the matches are offered.
    expect(within(bar()).queryByRole('button', { name: /del filtro/ })).toBeNull();
  });

  it('brings and selects every match of the filter', async () => {
    const { api } = search();
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.bulk.selectAll') }));
    fireEvent.click(
      within(bar()).getByRole('button', { name: tr('app.bulk.selectMatching', { count: 3 }) })
    );
    expect(await screen.findByText('Taxi')).toBeInTheDocument();
    expect(api.transactionApi.search).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 200, offset: 2 })
    );
    await waitFor(() => expect(box('Taxi')).toBeChecked());
    expect(within(bar()).getByText(selectedText(3, 3))).toBeInTheDocument();
    expect(within(bar()).queryByRole('button', { name: /del filtro/ })).toBeNull();
  });

  it('reloads the results after a change, even without the month loaded', async () => {
    const { api } = search(jest.fn(), true);
    await screen.findByText('Cena');
    fireEvent.click(box('Cena'));
    fireEvent.click(action('type'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.bulk.apply', { count: 1 }) }));
    await waitFor(() => expect(api.transactionApi.bulkUpdate).toHaveBeenCalled());
    await waitFor(() => expect(api.transactionApi.search).toHaveBeenCalledTimes(2));
  });

  it('hides deleted results until the delete is sent', async () => {
    const { api, unmount } = search();
    await screen.findByText('Cena');
    fireEvent.click(box('Cena'));
    fireEvent.click(action('delete'));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.bulk.delete.confirm', { count: 1 }) })
    );
    expect(screen.queryByText('Cena')).toBeNull();
    expect(screen.getByText(tr('app.search.results', { count: 2 }))).toBeInTheDocument();
    unmount();
    await waitFor(() => expect(api.transactionApi.bulkDelete).toHaveBeenCalledWith(['t1']));
  });
});
