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

function setup(
  overview = f.overview({ transactions: [dinner, salary, saving] }),
  api = createFakeApi()
) {
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

describe('the review prompt of the month view', () => {
  it('appears after real use and its invitation opens the plan section', async () => {
    localStorage.setItem(
      'mm_review',
      JSON.stringify({
        days: ['2026-03-01', '2026-03-05', '2026-03-09', '2026-03-12'],
        askedAt: null,
        done: false,
      })
    );
    const api = createFakeApi();
    const many = Array.from({ length: 8 }, (_, i) =>
      f.transaction({ id: `t${i}`, description: `Compra ${i}` })
    );
    api.monthApi.get.mockResolvedValue(f.overview({ transactions: many }));
    api.categoryApi.getAll.mockResolvedValue(categories);
    api.accountApi.getAll.mockResolvedValue({ accounts, total: 1000 });
    api.settingsApi.get.mockResolvedValue(f.settings({ showGettingStarted: false }));
    renderWithProviders(<Dashboard />, { api, plan: true });
    // The month view loads several panels first: on a busy machine it takes more than a second.
    fireEvent.click(
      await screen.findByRole('button', { name: tr('app.rate.yes') }, { timeout: 5000 })
    );
    fireEvent.click(await screen.findByRole('button', { name: tr('app.rate.invite') }));
    expect(await screen.findByRole('region', { name: tr('app.tabs.plan') })).toBeInTheDocument();
  });
});

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
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.export.month')) }));
    expect(downloads.names).toEqual(['finanverso_2026-03_marzo.csv']);
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
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.transaction.form.category') }), {
      target: { value: category },
    });
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

  it('suggests the category from the concept until one is chosen', async () => {
    const api = createFakeApi();
    api.categoryRuleApi.getAll.mockResolvedValue([
      { id: 'r1', pattern: 'nomina', categoryId: 'c2', categoryName: 'Salario' },
      { id: 'r2', pattern: 'gimnasio', categoryId: 'c9', categoryName: 'Deporte' },
    ]);
    setup(undefined, api);
    await screen.findByText('Cena');
    open();
    const description = screen.getByRole('textbox', {
      name: tr('app.transaction.form.description'),
    });
    const category = screen.getByRole('combobox', { name: tr('app.transaction.form.category') });
    const type = screen.getByRole('combobox', { name: tr('app.transaction.form.type') });
    // One letter is not a concept yet.
    fireEvent.change(description, { target: { value: 'N' } });
    expect(category).toHaveValue('');
    // A rule of the person (accents and case aside).
    fireEvent.change(description, { target: { value: 'Nómina marzo' } });
    await waitFor(() => expect(category).toHaveValue('Salario'));
    expect(screen.getByText(tr('app.transaction.form.categorySuggested'))).toBeInTheDocument();
    // A rule pointing at a category the person no longer has: the last one used instead.
    fireEvent.change(description, { target: { value: 'Gimnasio' } });
    await waitFor(() => expect(category).toHaveValue('Ocio'));
    // No movement of that type yet: nothing to go by.
    fireEvent.change(type, { target: { value: 'SAVING' } });
    fireEvent.change(description, { target: { value: 'Algo nuevo' } });
    await waitFor(() => expect(category).toHaveValue(''));
    fireEvent.change(type, { target: { value: 'EXPENSE' } });
    // Chosen by hand: the concept no longer changes it.
    fireEvent.change(category, { target: { value: 'Salario' } });
    fireEvent.change(description, { target: { value: 'Cena con amigos' } });
    expect(category).toHaveValue('Salario');
    expect(screen.queryByText(tr('app.transaction.form.categorySuggested'))).toBeNull();
  });

  it('says next to the category that it is missing, and saves once chosen', async () => {
    const { api } = setup(f.overview({ transactions: [salary] }));
    await screen.findByText('Nómina');
    open();
    fireEvent.change(
      screen.getByRole('textbox', { name: tr('app.transaction.form.description') }),
      { target: { value: 'Café' } }
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.transaction.form.amount') }), {
      target: { value: '1.5' },
    });
    const category = screen.getByRole('combobox', { name: tr('app.transaction.form.category') });
    expect(category).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));
    const message = await screen.findByText(tr('app.transaction.form.categoryRequired'));
    expect(category).toHaveAttribute('aria-invalid', 'true');
    expect(category.getAttribute('aria-describedby')).toContain(message.id);
    expect(category).toHaveFocus();
    expect(api.transactionApi.create).not.toHaveBeenCalled();
    fireEvent.change(category, { target: { value: 'Ocio' } });
    expect(screen.queryByText(tr('app.transaction.form.categoryRequired'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));
    await waitFor(() =>
      expect(api.transactionApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Café', amount: 1.5, category: 'Ocio' })
      )
    );
  });

  it('opens the category manager from the category select', async () => {
    setup();
    await screen.findByText('Cena');
    open();
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.transaction.form.category') }), {
      target: { value: '__manage__' },
    });
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

  it('shows how to start on a month without movements, and nothing that needs them', async () => {
    setup(f.overview({ transactions: [] }));
    const panel = await screen.findByRole('region', { name: tr('app.emptyMonth.title') });
    const option = (key: string) =>
      within(panel).getByRole('button', { name: new RegExp(tr(key)) });
    // No exports, recap, list or adviser yet.
    expect(screen.queryByRole('button', { name: literal(tr('app.export.month')) })).toBeNull();
    expect(screen.queryByRole('button', { name: literal(tr('app.recap.open')) })).toBeNull();
    expect(screen.queryByText(tr('app.transaction.table.empty'))).toBeNull();
    expect(screen.queryByRole('button', { name: /Analizar mes/ })).toBeNull();
    // «Paste text or a screenshot» opens the importer on its tab.
    fireEvent.click(option('app.emptyMonth.paste'));
    const dialog = await screen.findByRole('dialog', { name: tr('app.import.title') });
    expect(
      within(dialog).getByRole('tab', { name: new RegExp(tr('app.import.source.paste')) })
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(dialog).getAllByRole('button', { name: tr('app.common.close') })[0]);
    fireEvent.click(option('app.emptyMonth.import'));
    const again = await screen.findByRole('dialog', { name: tr('app.import.title') });
    expect(
      within(again).getByRole('tab', { name: new RegExp(tr('app.import.source.file')) })
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(again).getAllByRole('button', { name: tr('app.common.close') })[0]);
    // «Note down an expense» opens the form.
    const form = screen.getByRole('button', { name: new RegExp(tr('app.transaction.form.title')) });
    expect(form).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(option('app.emptyMonth.add'));
    await waitFor(() => expect(form).toHaveAttribute('aria-expanded', 'true'));
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

  it('shows no view tabs without movements', async () => {
    setup(f.overview({ transactions: [] }));
    await screen.findByRole('region', { name: tr('app.emptyMonth.title') });
    // Without movements there are no view tabs; the week view itself handles empty lists.
    expect(screen.queryByRole('tablist', { name: tr('app.transactions.viewMode') })).toBeNull();
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

describe('teaching a rule while editing a movement', () => {
  const open = async () => {
    await screen.findByText('Cena');
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.edit')}: Cena` })
    );
    return screen.getByRole('dialog', { name: tr('app.transaction.edit.title') });
  };

  it('offers to remember the category and creates the rule after saving', async () => {
    const { api } = setup();
    api.categoryRuleApi.suggest.mockResolvedValue({ pattern: 'cena', categoryId: null });
    const dialog = await open();
    const remember = await within(dialog).findByRole('checkbox', {
      name: tr('app.rules.remember', { pattern: 'cena' }),
    });
    fireEvent.click(remember);
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.transaction.edit.save') }));
    await waitFor(() =>
      expect(api.categoryRuleApi.add).toHaveBeenCalledWith('cena', expect.any(String))
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('does not create a rule unless asked, nor offer one without a merchant text', async () => {
    const { api } = setup();
    api.categoryRuleApi.suggest.mockResolvedValue({ pattern: '', categoryId: null });
    const dialog = await open();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.transaction.edit.save') }));
    await waitFor(() => expect(api.transactionApi.update).toHaveBeenCalled());
    expect(api.categoryRuleApi.add).not.toHaveBeenCalled();
  });

  it('saves without a rule when the box is left unticked', async () => {
    const { api } = setup();
    api.categoryRuleApi.suggest.mockResolvedValue({ pattern: 'cena', categoryId: null });
    const dialog = await open();
    await within(dialog).findByRole('checkbox');
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.transaction.edit.save') }));
    await waitFor(() => expect(api.transactionApi.update).toHaveBeenCalled());
    expect(api.categoryRuleApi.add).not.toHaveBeenCalled();
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
        name: tr('app.transaction.form.category'),
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
    expect(screen.getByText(tr('app.ai.quota', { used: 1, quota: 10 }))).toBeInTheDocument();
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

describe('«Recibos y cargos de este mes»', () => {
  const gym = (id: string, date: string) =>
    f.transaction({
      id,
      description: `Gimnasio ${date}`,
      amount: 30,
      category: 'Salud',
      date,
      recurringRuleId: 'r-gym',
    });

  it('lists the automatic expenses apart, with the total and what is still to come', async () => {
    const payroll = f.transaction({ ...salary, id: 't9', recurringRuleId: 'r-pay' });
    setup(
      f.overview({
        transactions: [dinner, payroll, gym('g1', '2026-03-05'), gym('g2', '2026-03-28')],
      })
    );
    const card = within(await screen.findByRole('region', { name: tr('app.charges.title') }));
    const rows = card.getAllByRole('listitem');
    // Only the expenses (not the payroll), by date: the charged one, then the one to come.
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Gimnasio 2026-03-05');
    expect(rows[0]).toHaveTextContent(tr('app.charges.status.done'));
    expect(rows[1]).toHaveTextContent(tr('app.charges.status.pending'));
    expect(card.getByText(tr('app.charges.total')).nextSibling).toHaveTextContent(/^60,00\s€$/);
    expect(card.getByText(tr('app.charges.pending')).nextSibling).toHaveTextContent(
      /^30,00\s€ · 1 cargo$/
    );
    expect(card.getByText(tr('app.charges.pendingNote'))).toBeInTheDocument();
    // The one still to come is not among the movements of the month; the charged one is.
    expect(screen.getAllByText('Gimnasio 2026-03-28')).toHaveLength(1);
    expect(screen.getAllByText('Gimnasio 2026-03-05').length).toBeGreaterThan(1);
    // A row opens the movement, to change it or remove it this month.
    fireEvent.click(within(rows[1]).getByRole('button'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('counts several pending charges and is hidden without automatic expenses', async () => {
    const { unmount } = setup(
      f.overview({
        transactions: [dinner, gym('g2', '2026-03-28'), gym('g3', '2026-03-29')],
      })
    );
    const card = within(await screen.findByRole('region', { name: tr('app.charges.title') }));
    expect(card.getByText(tr('app.charges.pending')).nextSibling).toHaveTextContent(
      /^60,00\s€ · 2 cargos$/
    );
    unmount();
    setup();
    await screen.findAllByText('Cena');
    expect(screen.queryByRole('region', { name: tr('app.charges.title') })).toBeNull();
  });

  it('says «del mes» in another month, where everything was already charged', async () => {
    setup(f.overview({ transactions: [dinner, gym('g1', '2026-02-05')] }));
    await screen.findByRole('region', { name: tr('app.charges.title') });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.nav.prev')) }));
    const card = within(await screen.findByRole('region', { name: tr('app.charges.titleOther') }));
    expect(card.getByText(tr('app.charges.pending')).nextSibling).toHaveTextContent(/^0,00\s€$/);
    expect(card.queryByText(tr('app.charges.pendingNote'))).toBeNull();
  });
});
