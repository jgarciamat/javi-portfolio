import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { captureDownloads, mockMatchMedia } from '@test-utils/dom';

const categories = [
  f.category({ id: 'c1', name: 'Ocio' }),
  f.category({ id: 'c2', name: 'Salario' }),
];
const accounts = [
  f.account({ id: 'a1', name: 'Principal', isDefault: true }),
  f.account({ id: 'a2', name: 'Efectivo' }),
];
const dinner = f.transaction({ id: 't1', description: 'Cena', amount: 40, date: '2026-03-10' });
const salary = f.transaction({
  id: 't2',
  description: 'Nómina',
  amount: 2000,
  type: 'INCOME',
  category: 'Salario',
  date: '2026-03-01',
  notes: 'marzo',
});
const saving = f.transaction({
  id: 't3',
  description: 'Hucha',
  amount: 100,
  type: 'SAVING',
  category: 'Ahorro',
  date: '2026-03-10',
});

function setup(overview = f.overview({ transactions: [dinner, salary, saving] })) {
  const api = createFakeApi();
  api.monthApi.get.mockResolvedValue(overview);
  api.categoryApi.getAll.mockResolvedValue(categories);
  api.accountApi.getAll.mockResolvedValue({ accounts, total: 1000 });
  return renderWithProviders(<Dashboard />, { api });
}

beforeEach(() => {
  localStorage.clear();
  // The recap of the previous month has its own tests: keep it out of the way here.
  localStorage.setItem('mm_recap_seen', '2026-3');
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

describe('month view', () => {
  it('shows the figures, alerts and movements of the month', async () => {
    setup(
      f.overview({
        transactions: [dinner, salary],
        alerts: [
          f.monthAlert(),
          f.monthAlert({
            kind: 'category_budget',
            level: 'danger',
            categoryName: 'Ocio',
            percentage: 120,
          }),
        ],
        budgets: [
          f.budgetLine(),
          f.budgetLine({
            categoryId: 'c9',
            categoryName: 'Casa',
            remaining: -50,
            level: 'danger',
            percentage: 112,
          }),
        ],
      })
    );
    expect(await screen.findByText('Cena')).toBeInTheDocument();
    expect(screen.getByText(tr('app.summary.availableBalance'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.alert.globalWarning', { pct: 85 }))).toBeInTheDocument();
    expect(
      screen.getByText(tr('app.alert.budgetDanger', { category: 'Ocio', pct: 120 }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr('app.budgets.over', { amount: '50,00 €' }).replace(' ', ' '))
    ).toBeInTheDocument();
    // Dismissing an alert hides it.
    fireEvent.click(screen.getAllByRole('button', { name: tr('app.alert.dismiss') })[0]);
    expect(screen.queryByText(tr('app.alert.globalWarning', { pct: 85 }))).toBeNull();
    // Category chart of the month.
    expect(screen.getByText(tr('app.categoryChart.expenses'))).toBeInTheDocument();
  });

  it('shows an error banner when the month cannot be loaded', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockRejectedValue(new Error('caído'));
    renderWithProviders(<Dashboard />, { api });
    expect(await screen.findByRole('alert')).toHaveTextContent('caído');
  });

  it('shows the period range when the month starts on another day', async () => {
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(
      f.settings({
        monthStartDay: 25,
        currentPeriod: { year: 2026, month: 3, start: '2026-03-25', end: '2026-04-24' },
      })
    );
    api.monthApi.get.mockResolvedValue(
      f.overview({ start: '2026-03-25', end: '2026-04-24', transactions: [dinner] })
    );
    renderWithProviders(<Dashboard />, { api });
    expect(await screen.findByText('25 mar – 24 abr')).toBeInTheDocument();
  });

  it('navigates between months and back to the current one', async () => {
    const { api } = setup();
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('button', { name: `‹ ${tr('app.nav.prev')}` }));
    await waitFor(() => expect(api.monthApi.get).toHaveBeenLastCalledWith(2026, 2));
    fireEvent.click(screen.getByRole('button', { name: tr('app.nav.goToCurrentMonth') }));
    await waitFor(() => expect(api.monthApi.get).toHaveBeenLastCalledWith(2026, 3));
    fireEvent.click(screen.getByRole('button', { name: `${tr('app.nav.next')} ›` }));
    await waitFor(() => expect(api.monthApi.get).toHaveBeenLastCalledWith(2026, 4));
  });

  it('exports the month as CSV', async () => {
    const downloads = captureDownloads();
    setup();
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('button', { name: tr('app.export.options') }));
    fireEvent.click(screen.getByRole('menuitem', { name: literal(tr('app.export.month')) }));
    expect(downloads.names).toEqual(['money-manager_2026-03_marzo.csv']);
    const [csv] = await downloads.text();
    expect(csv).toContain('"Cena"');
    expect(csv).toContain(tr('app.export.csv.summary'));
    downloads.restore();
  });
});

describe('app shortcuts (?add=)', () => {
  function setupWith(route: string) {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(f.overview({ transactions: [dinner] }));
    api.categoryApi.getAll.mockResolvedValue(categories);
    api.accountApi.getAll.mockResolvedValue({ accounts, total: 1000 });
    return renderWithProviders(<Dashboard />, { api, route });
  }
  const typeSelect = () => screen.findByRole('combobox', { name: tr('app.transaction.form.type') });

  it('opens the new-movement form for the requested type', async () => {
    setupWith('/?add=income');
    const select = await typeSelect();
    expect(select).toHaveValue('INCOME');
    expect(
      screen.getByRole('button', { name: literal(tr('app.transaction.form.title')) })
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps the form closed without a valid request', async () => {
    setupWith('/?add=nonsense');
    await screen.findByText('Cena');
    expect(
      screen.getByRole('button', { name: literal(tr('app.transaction.form.title')) })
    ).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('new movement form', () => {
  const open = () =>
    fireEvent.click(
      screen.getByRole('button', { name: literal(tr('app.transaction.form.title')) })
    );
  const fill = (description: string, amount: string, category = 'Ocio') => {
    fireEvent.change(
      screen.getByRole('textbox', { name: tr('app.transaction.form.description') }),
      { target: { value: description } }
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.transaction.form.amount') }), {
      target: { value: amount },
    });
    fireEvent.change(
      screen.getByRole('combobox', { name: tr('app.transaction.form.category.placeholder') }),
      { target: { value: category } }
    );
  };

  it('validates, saves and reloads the month', async () => {
    const { api } = setup();
    await screen.findByText('Cena');
    open();
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));
    expect(await screen.findByText(tr('app.transaction.form.required'))).toBeInTheDocument();
    fill('Cine', '12.5');
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.transaction.form.account') }), {
      target: { value: 'a2' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.transaction.form.notes') }), {
      target: { value: ' con amigos ' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));
    await waitFor(() =>
      expect(api.transactionApi.create).toHaveBeenCalledWith({
        description: 'Cine',
        amount: 12.5,
        type: 'EXPENSE',
        category: 'Ocio',
        date: '2026-03-15',
        notes: 'con amigos',
        accountId: 'a2',
      })
    );
    await waitFor(() => expect(api.monthApi.get).toHaveBeenCalledTimes(2));
  });

  it('blocks a saving larger than the available money and shows API errors', async () => {
    const { api } = setup();
    api.transactionApi.create.mockRejectedValue(new Error('Sin conexión'));
    await screen.findByText('Cena');
    open();
    fill('Hucha', '99999');
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.transaction.form.type') }), {
      target: { value: 'SAVING' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));
    expect(await screen.findByText(/Saldo insuficiente/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.transaction.form.type') }), {
      target: { value: 'EXPENSE' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    // Cancel resets and closes the form.
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.cancel') }));
    open();
    expect(
      screen.getByRole('textbox', { name: tr('app.transaction.form.description') })
    ).toHaveValue('');
  });

  it('opens the category manager from the category select', async () => {
    setup();
    await screen.findByText('Cena');
    open();
    fireEvent.change(
      screen.getByRole('combobox', { name: tr('app.transaction.form.category.placeholder') }),
      { target: { value: '__manage__' } }
    );
    expect(
      await screen.findByRole('dialog', { name: tr('app.category.manager.title') })
    ).toBeInTheDocument();
  });
});

describe('movements table', () => {
  it('collapses days and deletes after confirming', async () => {
    const { api } = setup();
    await screen.findByText('Cena');
    const day = screen.getByRole('button', { name: /10 mar/ });
    fireEvent.click(day);
    expect(screen.queryByText('Cena')).toBeNull();
    fireEvent.click(day);
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.delete')}: Cena` })
    );
    const dialog = screen.getByRole('dialog', { name: tr('app.confirm.delete.title') });
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.confirm.delete.cancel') }));
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.delete')}: Cena` })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.confirm.delete.confirm') }));
    await waitFor(() => expect(api.transactionApi.delete).toHaveBeenCalledWith('t1'));
  });

  it('edits notes inline: Enter saves, Escape cancels, unchanged is not sent', async () => {
    const { api } = setup();
    await screen.findByText('Cena');
    // Unchanged notes: no request.
    fireEvent.click(screen.getByRole('button', { name: 'marzo' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: tr('app.transaction.table.notes') }), {
      key: 'Enter',
    });
    expect(api.transactionApi.patch).not.toHaveBeenCalled();
    // Escape discards (the following blur must not save).
    fireEvent.click(screen.getByRole('button', { name: 'marzo' }));
    const input = screen.getByRole('textbox', { name: tr('app.transaction.table.notes') });
    fireEvent.change(input, { target: { value: 'otra' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);
    expect(api.transactionApi.patch).not.toHaveBeenCalled();
    // Enter saves the trimmed note.
    const placeholders = screen.getAllByRole('button', {
      name: tr('app.transaction.table.notes.placeholder'),
    });
    fireEvent.click(placeholders[0]);
    const editor = screen.getByRole('textbox', { name: tr('app.transaction.table.notes') });
    fireEvent.change(editor, { target: { value: '  con Luis ' } });
    fireEvent.keyDown(editor, { key: 'a' });
    fireEvent.keyDown(editor, { key: 'Enter' });
    await waitFor(() =>
      expect(api.transactionApi.patch).toHaveBeenCalledWith('t1', { notes: 'con Luis' })
    );
  });

  it('shows an error when saving notes fails and saves on blur', async () => {
    const { api } = setup();
    api.transactionApi.patch.mockRejectedValue(new Error('No guardado'));
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('button', { name: 'marzo' }));
    const input = screen.getByRole('textbox', { name: tr('app.transaction.table.notes') });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(await screen.findByText('No guardado')).toBeInTheDocument();
    expect(api.transactionApi.patch).toHaveBeenCalledWith('t2', { notes: null });
  });

  it('uses cards on small screens', async () => {
    const restore = mockMatchMedia(true);
    setup();
    await screen.findByText('Cena');
    expect(document.querySelector('.tx-card-list')).not.toBeNull();
    expect(document.querySelector('table.tx-table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /10 mar/ }));
    expect(screen.queryByText('Cena')).toBeNull();
    restore();
  });

  it('shows an empty state without movements', async () => {
    setup(f.overview({ transactions: [] }));
    expect(await screen.findByText(tr('app.transaction.table.empty'))).toBeInTheDocument();
  });
});

describe('week and calendar views', () => {
  it('groups by week with totals', async () => {
    setup();
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('tab', { name: literal(tr('app.transactions.view.week')) }));
    const weeks = screen.getAllByRole('button', { expanded: false });
    const week = weeks.find((b) => b.textContent?.includes('9 mar'))!;
    fireEvent.click(week);
    expect(screen.getByText('Hucha')).toBeInTheDocument();
    fireEvent.click(week);
    expect(screen.queryByText('Hucha')).toBeNull();
  });

  it('shows the empty week view', async () => {
    setup(f.overview({ transactions: [] }));
    await screen.findByText(tr('app.transaction.table.empty'));
    // Without movements there are no view tabs; the week view itself handles empty lists.
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('opens the movements of a calendar day', async () => {
    setup();
    await screen.findByText('Cena');
    fireEvent.click(
      screen.getByRole('tab', { name: literal(tr('app.transactions.view.calendar')) })
    );
    expect(screen.getByText('Marzo 2026', { selector: '.tx-calendar-title' })).toBeInTheDocument();
    const day = screen
      .getAllByRole('button')
      .find(
        (b) => b.classList.contains('tx-calendar-cell--has-tx') && b.textContent?.startsWith('10')
      )!;
    fireEvent.click(day);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('martes, 10 de marzo')).toBeInTheDocument();
    expect(within(dialog).getByText('Hucha')).toBeInTheDocument();
    expect(
      within(dialog).getByText(tr('app.transactions.calendar.popup.balance'))
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.transactions.calendar.popup.close') })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('editing a movement', () => {
  it('saves changes through the edit dialog', async () => {
    const { api } = setup();
    await screen.findByText('Cena');
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.edit')}: Hucha` })
    );
    const dialog = screen.getByRole('dialog', { name: tr('app.transaction.edit.title') });
    // A saving can use its own amount on top of the available money.
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '150' } });
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.transaction.edit.save') }));
    await waitFor(() =>
      expect(api.transactionApi.update).toHaveBeenCalledWith(
        't3',
        expect.objectContaining({ amount: 150 })
      )
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes with the button and can jump to the category manager', async () => {
    setup();
    await screen.findByText('Cena');
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.edit')}: Cena` })
    );
    let dialog = screen.getByRole('dialog', { name: tr('app.transaction.edit.title') });
    fireEvent.click(
      within(dialog).getAllByRole('button', { name: tr('app.transaction.form.cancel') })[0]
    );
    expect(screen.queryByRole('dialog', { name: tr('app.transaction.edit.title') })).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.edit')}: Cena` })
    );
    dialog = screen.getByRole('dialog', { name: tr('app.transaction.edit.title') });
    fireEvent.change(
      within(dialog).getByRole('combobox', {
        name: tr('app.transaction.form.category.placeholder'),
      }),
      { target: { value: '__manage__' } }
    );
    expect(
      screen.getByRole('dialog', { name: tr('app.category.manager.title') })
    ).toBeInTheDocument();
  });
});

describe('AI advisor', () => {
  it('analyses the month and keeps the result for the next visit', async () => {
    const { api } = setup();
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('button', { name: tr('app.ai.btn.analyze') }));
    expect(await screen.findByText('Buen mes')).toBeInTheDocument();
    expect(api.insightsApi.advice).toHaveBeenCalledWith(2026, 3, 'es');
    expect(screen.getByText(tr('app.ai.quota', { used: 1, quota: 30 }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr('app.ai.btn.reanalyze') })).toBeEnabled();
    const toggle = screen.getByRole('button', { name: literal(tr('app.ai.title')) });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'true'));
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('explains fallbacks and errors', async () => {
    const { api } = setup();
    api.insightsApi.advice
      .mockResolvedValueOnce(f.advice({ source: 'rules', reason: 'quota' }))
      .mockRejectedValueOnce(new Error('IA caída'));
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('button', { name: tr('app.ai.btn.analyze') }));
    expect(await screen.findByText(tr('app.ai.fallback.quota'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.ai.btn.reanalyze') }));
    expect(await screen.findByText(/IA caída/)).toBeInTheDocument();
  });
});
