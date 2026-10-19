import * as navigation from '@modules/finances/ui/navigation';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import * as notifications from '@core/notifications/notifications';
import { AccountsView } from '@modules/finances/ui/views/AccountsView';
import { BudgetsView } from '@modules/finances/ui/views/BudgetsView';
import { GoalsView } from '@modules/finances/ui/views/GoalsView';
import { SearchView } from '@modules/finances/ui/views/SearchView';
import { AnalysisView } from '@modules/finances/ui/views/AnalysisView';
import { AssetsView } from '@modules/finances/ui/views/AssetsView';
import { buildAutonomoPdf } from '@modules/finances/application/autonomoPdf';
import { shareImage } from '@shared/utils/shareImage';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { SettingsView } from '@modules/finances/ui/views/SettingsView';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { captureDownloads } from '@test-utils/dom';
import { ApiError } from '@core/api/http';

jest.mock('@core/notifications/notifications', () => ({
  notificationsSupported: jest.fn(() => true),
  requestNotificationPermission: jest.fn(),
  scheduleMonthlyReminder: jest.fn().mockResolvedValue(undefined),
  cancelMonthlyReminder: jest.fn().mockResolvedValue(undefined),
  hasNotificationPermission: jest.fn().mockResolvedValue(false),
  showNotification: jest.fn(),
  notificationId: jest.fn(() => 1),
}));

beforeEach(() => {
  localStorage.clear();
  // Everything together (the assistant has its own suite).
  localStorage.setItem('mm_autonomo_assistant', 'expert');
  jest.clearAllMocks();
  freezeTime();
});
afterEach(restoreTime);

// ─── Accounts ────────────────────────────────────────────────────────────────

jest.mock('@modules/finances/application/autonomoPdf', () => ({
  buildAutonomoPdf: jest.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
}));
jest.mock('@shared/utils/shareImage', () => ({ shareImage: jest.fn(async () => 'saved') }));

describe('AccountsView', () => {
  const main = f.account({ id: 'a1', name: 'Principal', isDefault: true, balance: 900 });
  const cash = f.account({ id: 'a2', name: 'Efectivo', type: 'cash', balance: -20, icon: '💵' });
  const old = f.account({ id: 'a3', name: 'Vieja', archived: true });

  function setup(accounts = [main, cash, old], api: FakeApi = createFakeApi()) {
    api.accountApi.getAll.mockResolvedValue({ accounts, total: 880 });
    api.accountApi.transfers.mockResolvedValue([
      f.transfer({ description: 'Paga' }),
      f.transfer({ id: 'tr2' }),
    ]);
    return renderWithProviders(<AccountsView />, { api });
  }

  it('lists accounts and transfers', async () => {
    setup();
    expect(
      await screen.findByRole('button', { name: `${tr('app.common.edit')} Efectivo` })
    ).toBeInTheDocument();
    expect(screen.getByText(tr('app.accounts.default'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.accounts.archived'))).toBeInTheDocument();
    expect(screen.getByText(/Paga/)).toBeInTheDocument();
  });

  it('creates, edits, archives, makes default and deletes accounts', async () => {
    const { api } = setup();
    await screen.findByRole('button', { name: `${tr('app.common.edit')} Efectivo` });
    const forms = () => screen.getAllByRole('textbox', { name: tr('app.accounts.name') });
    // New account (last form).
    const newName = forms()[forms().length - 1];
    fireEvent.change(newName, { target: { value: 'Tarjeta' } });
    const newForm = newName.closest('form')!;
    fireEvent.change(
      within(newForm).getByRole('combobox', { name: tr('app.accounts.typeLabel') }),
      { target: { value: 'card' } }
    );
    fireEvent.change(
      within(newForm).getByRole('spinbutton', { name: tr('app.accounts.initialBalance') }),
      { target: { value: '15.5' } }
    );
    fireEvent.click(within(newForm).getByRole('button', { name: tr('app.accounts.add') }));
    await waitFor(() =>
      expect(api.accountApi.create).toHaveBeenCalledWith({
        name: 'Tarjeta',
        type: 'card',
        initialBalance: 15.5,
      })
    );
    await waitFor(() => expect(newName).toHaveValue(''));
    // Blank names are not sent.
    fireEvent.change(newName, { target: { value: '   ' } });
    fireEvent.submit(newForm);
    expect(api.accountApi.create).toHaveBeenCalledTimes(1);

    // Edit (and cancel an edit).
    fireEvent.click(screen.getByRole('button', { name: `${tr('app.common.edit')} Efectivo` }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.cancel') }));
    fireEvent.click(screen.getByRole('button', { name: `${tr('app.common.edit')} Efectivo` }));
    const editName = forms()[0];
    fireEvent.change(editName, { target: { value: 'Cartera' } });
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.save') }));
    await waitFor(() =>
      expect(api.accountApi.update).toHaveBeenCalledWith('a2', {
        name: 'Cartera',
        type: 'cash',
        initialBalance: 0,
      })
    );

    fireEvent.click(screen.getByRole('button', { name: tr('app.accounts.makeDefault') }));
    await waitFor(() =>
      expect(api.settingsApi.update).toHaveBeenCalledWith({ defaultAccountId: 'a2' })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.accounts.unarchive') }));
    await waitFor(() =>
      expect(api.accountApi.update).toHaveBeenCalledWith('a3', { archived: false })
    );
    fireEvent.click(screen.getAllByRole('button', { name: tr('app.accounts.archive') })[0]);
    await waitFor(() =>
      expect(api.accountApi.update).toHaveBeenCalledWith('a2', { archived: true })
    );
    api.accountApi.delete.mockRejectedValueOnce(new Error('Tiene movimientos'));
    fireEvent.click(screen.getByRole('button', { name: `${tr('app.common.delete')} Efectivo` }));
    expect(await screen.findByText('Tiene movimientos')).toBeInTheDocument();
  });

  it('keeps the edit open when saving fails', async () => {
    const { api } = setup();
    api.accountApi.update.mockRejectedValueOnce(new Error('Nombre repetido'));
    fireEvent.click(
      await screen.findByRole('button', { name: `${tr('app.common.edit')} Efectivo` })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.save') }));
    expect(await screen.findByText('Nombre repetido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr('app.common.save') })).toBeInTheDocument();
  });

  it('transfers between active accounts and deletes transfers', async () => {
    const { api } = setup();
    await screen.findByRole('button', { name: `${tr('app.common.edit')} Efectivo` });
    const from = screen.getByRole('combobox', { name: tr('app.accounts.from') });
    const to = screen.getByRole('combobox', { name: tr('app.accounts.to') });
    expect(from).toHaveValue('a1');
    expect(to).toHaveValue('a2');
    const submit = screen.getByRole('button', { name: tr('app.accounts.transfer') });
    expect(submit).toBeDisabled();
    fireEvent.change(to, { target: { value: 'a1' } });
    fireEvent.change(from, { target: { value: 'a2' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.transaction.form.amount') }), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.accounts.transferNote') }), {
      target: { value: 'Cajero' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.transaction.form.date')), {
      target: { value: '2026-03-14' },
    });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(api.accountApi.createTransfer).toHaveBeenCalledWith({
        fromAccountId: 'a2',
        toAccountId: 'a1',
        amount: 25,
        date: '2026-03-14',
        description: 'Cajero',
      })
    );
    await waitFor(() =>
      expect(
        screen.getByRole('spinbutton', { name: tr('app.transaction.form.amount') })
      ).toHaveValue(null)
    );
    api.accountApi.createTransfer.mockRejectedValueOnce(new Error('Sin saldo'));
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.transaction.form.amount') }), {
      target: { value: '5' },
    });
    fireEvent.click(submit);
    expect(await screen.findByText('Sin saldo')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Principal → Ahorro/ })[0]);
    await waitFor(() => expect(api.accountApi.deleteTransfer).toHaveBeenCalled());
  });

  it('needs two active accounts to transfer', async () => {
    setup([main]);
    expect(await screen.findByText(tr('app.accounts.transferNeedsTwo'))).toBeInTheDocument();
  });
});

// ─── Budgets ─────────────────────────────────────────────────────────────────

describe('BudgetsView', () => {
  const ocio = f.category({ id: 'c-ocio', name: 'Ocio' });
  const casa = f.category({ id: 'c-casa', name: 'Casa' });

  function setup() {
    const api = createFakeApi();
    api.categoryApi.getAll.mockResolvedValue([ocio, casa]);
    api.budgetApi.getAll.mockResolvedValue([
      f.budget({ id: 'b1', categoryId: 'c-ocio', amount: 400 }),
    ]);
    api.monthApi.get.mockResolvedValue(f.overview({ budgets: [f.budgetLine()] }));
    return renderWithProviders(<BudgetsView />, { api });
  }
  const input = (name: string) =>
    screen.getByRole('spinbutton', { name: `${tr('app.budgets.limitFor')} ${name}` });

  it('shows limits and spending, and does nothing on Enter without changes', async () => {
    const { api } = setup();
    await waitFor(() => expect(input(tr('app.categories.Ocio'))).toHaveValue(400));
    expect(screen.getByText(/300,00\s€ de 400,00\s€|300,00/)).toBeInTheDocument();
    // The old version deleted the budget here.
    fireEvent.keyDown(input(tr('app.categories.Ocio')), { key: 'Enter' });
    expect(api.budgetApi.delete).not.toHaveBeenCalled();
    expect(api.budgetApi.set).not.toHaveBeenCalled();
  });

  it('creates, changes and removes limits', async () => {
    const { api } = setup();
    await waitFor(() => expect(input(tr('app.categories.Ocio'))).toHaveValue(400));
    fireEvent.change(input('Casa'), { target: { value: '250' } });
    fireEvent.keyDown(input('Casa'), { key: 'a' });
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.save') }));
    await waitFor(() => expect(api.budgetApi.set).toHaveBeenCalledWith('c-casa', 250));
    fireEvent.change(input(tr('app.categories.Ocio')), { target: { value: '' } });
    fireEvent.keyDown(input(tr('app.categories.Ocio')), { key: 'Enter' });
    await waitFor(() => expect(api.budgetApi.delete).toHaveBeenCalledWith('b1'));
    // Clearing a category without budget sends nothing.
    fireEvent.change(input('Casa'), { target: { value: '0' } });
    fireEvent.keyDown(input('Casa'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: tr('app.common.save') })).toBeNull()
    );
    expect(api.budgetApi.delete).toHaveBeenCalledTimes(1);
  });

  it('shows errors', async () => {
    const { api } = setup();
    api.budgetApi.set.mockRejectedValue(new Error('Límite inválido'));
    await waitFor(() => expect(input('Casa')).toBeInTheDocument());
    fireEvent.change(input('Casa'), { target: { value: '5' } });
    fireEvent.keyDown(input('Casa'), { key: 'Enter' });
    expect(await screen.findByText('Límite inválido')).toBeInTheDocument();
  });
});

// ─── Goals ───────────────────────────────────────────────────────────────────

describe('GoalsView', () => {
  function setup(
    goals = [
      f.goal({ id: 'g1' }),
      f.goal({
        id: 'g2',
        name: 'Coche',
        archived: true,
        targetDate: null,
        progress: { ...f.goal().progress, completed: true, monthlyNeeded: null },
      }),
    ]
  ) {
    const api = createFakeApi();
    api.goalApi.getAll.mockResolvedValue(goals);
    api.categoryApi.getAll.mockResolvedValue([f.category({ id: 'c1', name: 'Ahorro' })]);
    return renderWithProviders(<GoalsView />, { api });
  }

  it('shows progress and toggles archived goals', async () => {
    setup();
    expect(await screen.findByRole('progressbar', { name: 'Viaje' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Coche' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.goals.showArchived') }));
    expect(screen.getByRole('progressbar', { name: 'Coche' })).toBeInTheDocument();
    expect(screen.getByText(tr('app.goals.completed'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.goals.hideArchived') }));
  });

  it('notes a reached goal as a good moment to ask for a review, and only then', async () => {
    localStorage.removeItem('mm_review');
    setup([f.goal({ id: 'g1' })]);
    await screen.findByRole('progressbar', { name: 'Viaje' });
    expect(localStorage.getItem('mm_review')).toBeNull();
    cleanup();
    setup();
    await screen.findByRole('progressbar', { name: 'Viaje' });
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('mm_review') as string).positive).toBe(true)
    );
  });

  it('creates, archives and deletes goals', async () => {
    const { api } = setup();
    await screen.findByRole('progressbar', { name: 'Viaje' });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.goals.name') }), {
      target: { value: ' Moto ' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.goals.target') }), {
      target: { value: '1500' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.goals.targetDate')), {
      target: { value: '2027-01-01' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.goals.category')), {
      target: { value: 'Ahorro' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.goals.create') }));
    await waitFor(() =>
      expect(api.goalApi.create).toHaveBeenCalledWith({
        name: 'Moto',
        target: 1500,
        targetDate: '2027-01-01',
        category: 'Ahorro',
      })
    );
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: tr('app.goals.name') })).toHaveValue('')
    );
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.goals.name') }), {
      target: { value: 'Sin fecha' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.goals.target') }), {
      target: { value: '10' },
    });
    api.goalApi.create.mockRejectedValueOnce(new Error('Meta duplicada'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.goals.create') }));
    expect(await screen.findByText('Meta duplicada')).toBeInTheDocument();
    expect(api.goalApi.create).toHaveBeenLastCalledWith({
      name: 'Sin fecha',
      target: 10,
      targetDate: null,
      category: undefined,
      icon: '🎯',
    });

    fireEvent.click(screen.getByRole('button', { name: tr('app.accounts.archive') }));
    await waitFor(() => expect(api.goalApi.update).toHaveBeenCalledWith('g1', { archived: true }));
    fireEvent.click(screen.getByRole('button', { name: `${tr('app.common.delete')} Viaje` }));
    await waitFor(() => expect(api.goalApi.delete).toHaveBeenCalledWith('g1'));
  });

  it('shows the category a new goal creates in the list of categories at once', async () => {
    const { api } = setup();
    await screen.findByRole('progressbar', { name: 'Viaje' });
    const calls = api.categoryApi.getAll.mock.calls.length;
    api.categoryApi.getAll.mockResolvedValue([
      f.category({ id: 'c1', name: 'Ahorro' }),
      f.category({ id: 'c2', name: 'Moto' }),
    ]);
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.goals.name') }), {
      target: { value: 'Moto' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.goals.target') }), {
      target: { value: '1500' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.goals.create') }));
    await waitFor(() => expect(api.categoryApi.getAll.mock.calls.length).toBeGreaterThan(calls));
    expect(await screen.findByRole('option', { name: /Moto/ })).toBeInTheDocument();
  });

  it('lets you choose the emoji of the category a goal creates, and hides it for an existing one', async () => {
    const { api } = setup();
    await screen.findByRole('progressbar', { name: 'Viaje' });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.goals.name') }), {
      target: { value: 'Japón' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.goals.target') }), {
      target: { value: '3000' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.category.manager.emoji.choose') }));
    fireEvent.click(screen.getByRole('button', { name: '✈️' }));
    expect(screen.queryByRole('button', { name: '🏦' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.goals.create') }));
    await waitFor(() =>
      expect(api.goalApi.create).toHaveBeenLastCalledWith(expect.objectContaining({ icon: '✈️' }))
    );
    fireEvent.change(screen.getByLabelText(tr('app.goals.category')), {
      target: { value: 'Ahorro' },
    });
    expect(
      screen.queryByRole('button', { name: tr('app.category.manager.emoji.choose') })
    ).toBeNull();
  });

  it('shows the empty state', async () => {
    setup([]);
    expect(await screen.findByText(tr('app.goals.empty'))).toBeInTheDocument();
  });
});

// ─── Search ──────────────────────────────────────────────────────────────────

describe('SearchView', () => {
  const page = (items: ReturnType<typeof f.transaction>[], total = items.length) => ({
    items,
    total,
    totals: { income: 2000, expenses: 40, saving: 100 },
  });

  function setup(onEdit = jest.fn()) {
    const api = createFakeApi();
    api.categoryApi.getAll.mockResolvedValue([f.category({ id: 'c1', name: 'Ocio' })]);
    api.accountApi.getAll.mockResolvedValue({
      accounts: [f.account({ id: 'a1' }), f.account({ id: 'a2', name: 'Efectivo' })],
      total: 0,
    });
    api.transactionApi.search.mockResolvedValue(
      page(
        [
          f.transaction({ id: 't1' }),
          f.transaction({
            id: 't2',
            type: 'INCOME',
            description: 'Nómina',
            accountName: undefined,
          }),
        ],
        3
      )
    );
    const view = renderWithProviders(<SearchView onEdit={onEdit} />, { api });
    return { ...view, onEdit };
  }

  it('searches with filters and debounced text', async () => {
    const { api } = setup();
    expect(await screen.findByText('Nómina')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' cena ' } });
    await waitFor(
      () =>
        expect(api.transactionApi.search).toHaveBeenLastCalledWith(
          expect.objectContaining({ q: 'cena', offset: 0 })
        ),
      { timeout: 2000 }
    );
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.search.type') }), {
      target: { value: 'EXPENSE' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.search.category') }), {
      target: { value: 'c1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.transaction.form.account') }), {
      target: { value: 'a2' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.search.from')), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.search.to')), {
      target: { value: '2026-03-31' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.search.min') }), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.search.max') }), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.search.sort') }), {
      target: { value: 'amount_desc' },
    });
    await waitFor(() =>
      expect(api.transactionApi.search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'EXPENSE',
          categoryIds: ['c1'],
          accountId: 'a2',
          from: '2026-01-01',
          to: '2026-03-31',
          min: 5,
          sort: 'amount_desc',
        })
      )
    );
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.search.category') }), {
      target: { value: '' },
    });
    await waitFor(() =>
      expect(api.transactionApi.search).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoryIds: undefined })
      )
    );
  });

  it('loads more results and opens a movement', async () => {
    const { api, onEdit } = setup();
    await screen.findByText('Nómina');
    api.transactionApi.search.mockResolvedValueOnce(
      page([f.transaction({ id: 't3', description: 'Taxi' })], 3)
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.search.more') }));
    expect(await screen.findByText('Taxi')).toBeInTheDocument();
    expect(api.transactionApi.search).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 2 })
    );
    expect(screen.queryByRole('button', { name: tr('app.search.more') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Taxi/ }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 't3' }));
    // New filters drop the pages loaded for the old ones.
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.search.sort') }), {
      target: { value: 'date_asc' },
    });
    await waitFor(() => expect(screen.queryByText('Taxi')).toBeNull());
  });

  it('shows empty results and errors', async () => {
    const api = createFakeApi();
    api.transactionApi.search.mockResolvedValueOnce({
      items: [],
      total: 0,
      totals: { income: 0, expenses: 0, saving: 0 },
    });
    api.transactionApi.search.mockRejectedValueOnce(new Error('Búsqueda caída'));
    renderWithProviders(<SearchView onEdit={jest.fn()} />, { api });
    expect(await screen.findByText(tr('app.search.empty'))).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.search.sort') }), {
      target: { value: 'date_asc' },
    });
    expect(await screen.findByText('Búsqueda caída')).toBeInTheDocument();
  });
});

// ─── Analysis ────────────────────────────────────────────────────────────────

describe('AnalysisView', () => {
  it('shows trends and the net worth chart', async () => {
    const api = createFakeApi();
    api.insightsApi.trends.mockResolvedValue({
      year: 2026,
      month: 3,
      categories: [
        {
          categoryName: 'Ocio',
          current: 300,
          previous: 200,
          average3: 250,
          changeVsPreviousPct: 50,
          changeVsAveragePct: -10,
        },
        {
          categoryName: 'Casa',
          current: 100,
          previous: 0,
          average3: 100,
          changeVsPreviousPct: null,
          changeVsAveragePct: 0,
        },
      ],
    });
    api.insightsApi.netWorth.mockResolvedValue([
      { year: 2026, month: 2, available: 100, saved: 50, assets: 0, debts: 0, netWorth: 150 },
      { year: 2026, month: 3, available: 200, saved: 60, assets: 0, debts: 0, netWorth: 260 },
    ]);
    renderWithProviders(<AnalysisView />, { api });
    expect(await screen.findByText(tr('app.categories.Ocio'))).toBeInTheDocument();
    expect(screen.getByText(/▲ 50%/)).toBeInTheDocument();
    expect(screen.getByText(/▼ 10%/)).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: tr('app.analysis.netWorthTitle') })
    ).toBeInTheDocument();
    // The chart's figures are also a table for screen readers.
    const data = screen.getByRole('table', { name: tr('app.analysis.netWorthTitle') });
    expect(within(data).getAllByRole('row')).toHaveLength(3);
    expect(
      within(data).getByRole('columnheader', { name: tr('app.analysis.month') })
    ).toBeVisible();
    // The wide tables scroll inside a named region the keyboard can reach.
    const trends = screen.getByRole('region', { name: /Tendencias de gasto/ });
    expect(trends).toHaveAttribute('tabindex', '0');
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.analysis.range') }), {
      target: { value: '24' },
    });
    await waitFor(() => expect(api.insightsApi.netWorth).toHaveBeenLastCalledWith(24));
  });

  it('lists the detected subscriptions with the yearly cost and price increases', async () => {
    const api = createFakeApi();
    renderWithProviders(<AnalysisView />, { api });
    expect(await screen.findByText(/Pagas unos .*18,99.* al mes/)).toBeInTheDocument();
    const rows = screen
      .getAllByRole('row')
      .filter((r) => /Netflix|Seguro coche/.test(r.textContent ?? ''));
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(/subió de .*12,99.* a .*13,99/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(tr('app.subscriptions.monthly'))).toBeInTheDocument();
    expect(within(rows[1]).getByText(tr('app.subscriptions.yearly'))).toBeInTheDocument();
    expect(within(rows[1]).queryByText(/subió/)).toBeNull();
  });

  it('shows the free plan the total and the most expensive ones, and the rest with Premium', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(
      f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free })
    );
    api.insightsApi.subscriptions.mockResolvedValue(f.subscriptions({ locked: true, count: 5 }));
    renderWithProviders(<AnalysisView />, { api, plan: true });
    expect(await screen.findByText(/Pagas unos .*18,99.* al mes/)).toBeInTheDocument();
    expect(screen.getByText(tr('app.subscriptions.found', { count: 5 }))).toBeInTheDocument();
    expect(
      screen.getByText(tr('app.subscriptions.moreLocked', { count: 3 }), { exact: false })
    ).toBeInTheDocument();
    const buttons = await screen.findAllByRole('button', { name: tr('billing.seePlans') });
    fireEvent.click(buttons[0]);
    expect(
      await screen.findByText(
        tr('billing.reason.feature', { feature: tr('billing.feature.insights') })
      )
    ).toBeInTheDocument();
  });

  it('says the full list is Premium when every subscription found is shown', async () => {
    const api = createFakeApi();
    api.insightsApi.subscriptions.mockResolvedValue(f.subscriptions({ locked: true, count: 2 }));
    renderWithProviders(<AnalysisView />, { api });
    expect(
      await screen.findByText(tr('app.subscriptions.fullLocked'), { exact: false })
    ).toBeInTheDocument();
  });

  it('says so when there are no subscriptions or they cannot be loaded', async () => {
    const api = createFakeApi();
    api.insightsApi.subscriptions.mockResolvedValue(f.subscriptions({ subscriptions: [] }));
    const { unmount } = renderWithProviders(<AnalysisView />, { api });
    expect(await screen.findByText(tr('app.subscriptions.none'))).toBeInTheDocument();
    unmount();
    api.insightsApi.subscriptions.mockRejectedValue(new Error('Sin suscripciones'));
    renderWithProviders(<AnalysisView />, { api });
    expect(await screen.findByText('Sin suscripciones')).toBeInTheDocument();
  });

  it('handles empty data and errors', async () => {
    const api = createFakeApi();
    api.insightsApi.netWorth.mockRejectedValue(new Error('Sin patrimonio'));
    renderWithProviders(<AnalysisView />, { api });
    expect(await screen.findByText(tr('app.analysis.noData'))).toBeInTheDocument();
    expect(await screen.findByText('Sin patrimonio')).toBeInTheDocument();
  });

  it('draws a flat chart for a single point', async () => {
    const api = createFakeApi();
    api.insightsApi.netWorth.mockResolvedValue([
      { year: 2026, month: 3, available: 0, saved: 0, assets: 0, debts: 0, netWorth: 0 },
    ]);
    renderWithProviders(<AnalysisView />, { api });
    expect(
      await screen.findByRole('img', { name: tr('app.analysis.netWorthTitle') })
    ).toBeInTheDocument();
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

describe('the self-employed draft', () => {
  const free = (usage = 0, pdfs = 0) => {
    const api = createFakeApi();
    const overview = f.billing({ plan: 'free' });
    api.billingApi.get.mockResolvedValue({
      ...overview,
      limits: f.catalog().limits.free,
      usage: { ...overview.usage, autonomoDrafts: usage, autonomoPdfs: pdfs },
    });
    return api;
  };
  const premium = () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    return api;
  };
  const open = (api = free()) => {
    renderWithProviders(<BusinessView />, { api, plan: true });
    return api;
  };
  const emptyQuarter = {
    income: { r21: 0, r10: 0, r4: 0, r0: 0 },
    expenses: [],
  };
  const saved = (over: Record<string, unknown> = {}) =>
    JSON.stringify({
      profile: {
        workArea: '',
        homeArea: '',
        vehicleExclusive: false,
        healthPeople: '',
        healthDisability: false,
      },
      quarters: [0, 1, 2, 3].map(() => ({
        income: { r21: '', r10: '', r4: '', r0: '' },
        withheld: '',
        expenses: [],
      })),
      ...over,
    });

  beforeEach(() => {
    localStorage.clear();
    // Everything together (the assistant has its own suite).
    localStorage.setItem('mm_autonomo_assistant', 'expert');
  });

  it('has no categories to mark: everything is typed by hand', async () => {
    open();
    expect(await screen.findByLabelText(tr('app.autonomo.workArea'))).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText(tr('app.tax.estimate'))).toBeNull();
  });

  it('prepares a draft and shows the boxes, the contribution and the deadlines', async () => {
    const api = open();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.autonomo.prepare') }));
    expect(await screen.findByText(/Borrador de \d{4}, \d\.º trimestre/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('mm_review') as string).positive).toBe(true);
    expect(screen.getAllByText('Modelo 303').length).toBeGreaterThan(0);
    expect(screen.getByText('Modelo 130')).toBeInTheDocument();
    expect(screen.getByText('Base imponible al 21 %')).toBeInTheDocument();
    expect(screen.getByText('21 %')).toBeInTheDocument();
    expect(screen.getByText(/tramo R1/)).toBeInTheDocument();
    expect(screen.getByText('IVA trimestral')).toBeInTheDocument();
    expect(api.businessApi.draft).toHaveBeenCalledWith(
      new Date().getFullYear(),
      expect.any(Number),
      expect.objectContaining({
        hardToJustify: false,
        exempt130: false,
        priorYearNet: null,
        manual: expect.objectContaining({ quarters: expect.any(Array) }),
      })
    );
  });

  it('sends the income, the expenses and the other data the person types', async () => {
    const api = open(premium());
    api.businessApi.draft.mockResolvedValue(
      f.autonomoDraft({
        expenses: [
          {
            quarter: 1,
            kind: 'supplies',
            amount: 121,
            deductible: 6,
            vatDeductible: 1.26,
            note: 'supplies',
          },
          {
            quarter: 1,
            kind: 'training',
            amount: 121,
            deductible: 100,
            vatDeductible: 21,
            note: '',
          },
        ],
      })
    );
    fireEvent.change(await screen.findByLabelText(tr('app.autonomo.quarter')), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.year')), {
      target: { value: String(new Date().getFullYear() - 1) },
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.workArea')), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.homeArea')), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.healthPeople')), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByLabelText(tr('app.autonomo.vehicleExclusive')));
    fireEvent.click(screen.getByLabelText(tr('app.autonomo.healthDisability')));
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 1`), {
      target: { value: '5000' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.income.r10')} 1`), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.income.r4')} 1`), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.income.r0')} 1`), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.withheld')} 1`), {
      target: { value: '120,5' },
    });

    const add = () =>
      fireEvent.click(
        screen.getAllByRole('button', { name: new RegExp(tr('app.autonomo.addExpense')) })[0]
      );
    add();
    add();
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.expenseKind')} 1.1`), {
      target: { value: 'meals' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.expenseAmount')} 1.1`), {
      target: { value: '121' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.expenseVat')} 1.1`), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.days')} 1.1`), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.expenseKind')} 1.2`), {
      target: { value: 'training' },
    });
    expect(screen.queryByLabelText(`${tr('app.autonomo.days')} 1.2`)).toBeNull();
    fireEvent.click(screen.getByLabelText(`${tr('app.common.delete')} 1.2`));
    add();
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.expenseAmount')} 1.2`), {
      target: { value: '121' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.expenseKind')} 1.2`), {
      target: { value: 'supplies' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 2`), {
      target: { value: '300' },
    });

    fireEvent.click(screen.getByLabelText(new RegExp('gastos de difícil justificación')));
    fireEvent.click(screen.getByLabelText(new RegExp('no presento el modelo 130')));
    fireEvent.change(screen.getByLabelText(new RegExp(tr('app.autonomo.priorNet'))), {
      target: { value: '9500' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(tr('app.autonomo.toOffset'))), {
      target: { value: '40' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.prepare') }));

    await waitFor(() =>
      expect(api.businessApi.draft).toHaveBeenCalledWith(new Date().getFullYear() - 1, 2, {
        quarters: [
          { withheld: 120.5, socialSecurity: 0, vatNotDeductible: 0 },
          { withheld: 0, socialSecurity: 0, vatNotDeductible: 0 },
          { withheld: 0, socialSecurity: 0, vatNotDeductible: 0 },
          { withheld: 0, socialSecurity: 0, vatNotDeductible: 0 },
        ],
        hardToJustify: true,
        priorYearNet: 9500,
        exempt130: true,
        // What was left to offset at the start of the year: the quarters carry it on.
        vatToOffset: 0,
        vat: { offsetStart: 40 },
        prior: null,
        manual: {
          profile: {
            workArea: 20,
            homeArea: 100,
            vehicleExclusive: true,
            healthPeople: 2,
            healthDisability: true,
          },
          quarters: [
            {
              income: { r21: 5000, r10: 1000, r4: 10, r0: 20 },
              expenses: [
                { kind: 'meals', amount: 121, vatRate: 10, days: 2 },
                { kind: 'supplies', amount: 121, vatRate: 21, days: 0 },
              ],
            },
            { ...emptyQuarter, income: { r21: 300, r10: 0, r4: 0, r0: 0 } },
            emptyQuarter,
            emptyQuarter,
          ],
        },
      })
    );
    expect(await screen.findByText(tr('app.autonomo.deductibleTitle'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.autonomo.note.supplies'))).toBeInTheDocument();
    expect(screen.getAllByText(tr('app.autonomo.kind.training')).length).toBeGreaterThan(1);
    expect(localStorage.getItem('mm_autonomo_manual2')).toContain('"workArea":"20"');
  });

  it('copies the data of the previous quarter into the next one', async () => {
    open();
    fireEvent.change(await screen.findByLabelText(tr('app.autonomo.quarter')), {
      target: { value: '3' },
    });
    expect(
      screen.queryByRole('button', { name: tr('app.autonomo.copyPrevious', { n: 0 }) })
    ).toBeNull();
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 1`), {
      target: { value: '700' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.withheld')} 1`), {
      target: { value: '50' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: new RegExp(tr('app.autonomo.addExpense')) })[0]
    );
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.expenseAmount')} 1.1`), {
      target: { value: '121' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.autonomo.copyPrevious', { n: 1 }) })
    );
    expect(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 2`)).toHaveValue('700');
    expect(screen.getByLabelText(`${tr('app.autonomo.withheld')} 2`)).toHaveValue('50');
    expect(screen.getByLabelText(`${tr('app.autonomo.expenseAmount')} 2.1`)).toHaveValue('121');
    // The copy is independent of the original.
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.expenseAmount')} 2.1`), {
      target: { value: '60' },
    });
    expect(screen.getByLabelText(`${tr('app.autonomo.expenseAmount')} 1.1`)).toHaveValue('121');
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.autonomo.copyPrevious', { n: 2 }) })
    );
    expect(screen.getByLabelText(`${tr('app.autonomo.expenseAmount')} 3.1`)).toHaveValue('60');
  });

  it('uses the totals of the modelo 130 already filed instead of the earlier quarters', async () => {
    const api = open(premium());
    fireEvent.change(await screen.findByLabelText(tr('app.autonomo.quarter')), {
      target: { value: '1' },
    });
    expect(screen.queryByLabelText(new RegExp(tr('app.autonomo.priorOn')))).toBeNull();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '4' } });
    expect(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 1`)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(new RegExp(tr('app.autonomo.priorOn'))));
    // Only the viewed quarter is left to fill in.
    expect(screen.queryByLabelText(`${tr('app.autonomo.income.r21')} 1`)).toBeNull();
    expect(screen.queryByLabelText(`${tr('app.autonomo.income.r21')} 3`)).toBeNull();
    expect(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 4`)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.priorIncome')), {
      target: { value: '3000' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.priorExpenses')), {
      target: { value: '600' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.priorPayments')), {
      target: { value: '360,5' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.priorWithheld')), {
      target: { value: '100' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.prepare') }));
    await waitFor(() =>
      expect(api.businessApi.draft).toHaveBeenCalledWith(
        expect.any(Number),
        4,
        expect.objectContaining({
          prior: { income: 3000, expenses: 600, previousPayments: 360.5, withheld: 100 },
        })
      )
    );
    // Back to the first quarter the totals are not sent.
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.prepare') }));
    await waitFor(() =>
      expect(api.businessApi.draft).toHaveBeenLastCalledWith(
        expect.any(Number),
        1,
        expect.objectContaining({ prior: null })
      )
    );
  });

  it('remembers what was typed the last time', async () => {
    localStorage.setItem(
      'mm_autonomo_manual2',
      saved({
        profile: {
          workArea: '15',
          homeArea: '',
          vehicleExclusive: false,
          healthPeople: '',
          healthDisability: false,
        },
      })
    );
    open();
    expect(await screen.findByLabelText(tr('app.autonomo.workArea'))).toHaveValue('15');
  });

  it('downloads the draft as a PDF, and reports when it cannot', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.autonomo.prepare') }));
    const download = await screen.findByRole('button', { name: tr('app.autonomo.pdf.download') });
    fireEvent.click(download);
    await waitFor(() =>
      expect(shareImage).toHaveBeenCalledWith(
        expect.any(Blob),
        `borrador-autonomo-2026-T1.pdf`,
        tr('app.autonomo.pdf.title'),
        'download'
      )
    );
    (buildAutonomoPdf as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.pdf.download') }));
    expect(await screen.findByText(tr('app.autonomo.pdf.error'))).toBeInTheDocument();
  });

  describe('the PDF on the free plan', () => {
    const prepared = () =>
      localStorage.setItem(
        'mm_autonomo_draft2',
        JSON.stringify({ draft: f.autonomoDraft(), inputs: null })
      );

    it('counts the one free download and refreshes the plan', async () => {
      prepared();
      const api = open(free(1));
      expect(await screen.findByText(tr('app.autonomo.pdf.freeOne'))).toBeInTheDocument();
      await waitFor(() => expect(api.billingApi.get).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.pdf.download') }));
      await waitFor(() => expect(api.billingApi.get).toHaveBeenCalledTimes(2));
      expect(api.businessApi.recordPdf).toHaveBeenCalledTimes(1);
      expect(shareImage).toHaveBeenCalledTimes(1);
    });

    it('asks for Premium once the free PDF is used', async () => {
      prepared();
      const api = open(free(0, 1));
      expect(await screen.findByText(tr('app.autonomo.pdf.usedFree'))).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: tr('app.autonomo.pdf.download') })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.goPremium') }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(api.businessApi.recordPdf).not.toHaveBeenCalled();
    });

    it('builds no PDF when the server refuses it, and shows no error', async () => {
      prepared();
      const api = open(free(1));
      api.businessApi.recordPdf.mockRejectedValueOnce(
        new ApiError('Límite', 402, 'PLAN_LIMIT', { resource: 'autonomoPdfs', limit: 1 })
      );
      fireEvent.click(await screen.findByRole('button', { name: tr('app.autonomo.pdf.download') }));
      await waitFor(() => expect(api.billingApi.get).toHaveBeenCalledTimes(2));
      expect(buildAutonomoPdf).not.toHaveBeenCalled();
      expect(screen.queryByText(tr('app.autonomo.pdf.error'))).toBeNull();
    });
  });

  it('offers the share sheet on a phone instead of downloading', async () => {
    const original = window.matchMedia;
    window.matchMedia = jest.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
    try {
      open();
      fireEvent.click(await screen.findByRole('button', { name: tr('app.autonomo.prepare') }));
      fireEvent.click(await screen.findByRole('button', { name: tr('app.autonomo.pdf.download') }));
      await waitFor(() =>
        expect(shareImage).toHaveBeenLastCalledWith(
          expect.any(Blob),
          expect.stringContaining('.pdf'),
          expect.any(String),
          'share'
        )
      );
    } finally {
      window.matchMedia = original;
    }
  });

  it('says a professional with 70 % withheld has no modelo 130, and shows the other results', async () => {
    const api = open();
    api.businessApi.draft.mockResolvedValue(
      f.autonomoDraft({
        irpf: { required: false, result: 'notRequired', amountDue: 0, boxes: [] },
        vat: { ...f.autonomoDraft().vat, result: 'offset', amountDue: -21 },
      })
    );
    fireEvent.click(await screen.findByRole('button', { name: tr('app.autonomo.prepare') }));
    expect(await screen.findByText(tr('app.autonomo.irpf.notRequiredText'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.autonomo.vat.offset'))).toBeInTheDocument();
  });

  it('lets the free plan prepare one draft, keeps it, and then asks for Premium', async () => {
    const api = open(free(1));
    expect(await screen.findByText(tr('app.autonomo.usedFree'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('app.autonomo.prepare') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.goPremium') }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(api.businessApi.draft).not.toHaveBeenCalled();
  });

  it('keeps other quarters for Premium on the free plan', async () => {
    const api = open();
    expect(await screen.findByText(tr('app.autonomo.freeOne'))).toBeInTheDocument();
    // 15 March 2026: the first quarter is the current one.
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '2' } });
    expect(screen.getByText(tr('app.autonomo.otherQuarterLocked'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('app.autonomo.prepare') })).toBeNull();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.year')), { target: { value: '2025' } });
    expect(screen.getByText(tr('app.autonomo.otherQuarterLocked'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.goPremium') }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(api.businessApi.draft).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.year')), { target: { value: '2026' } });
    expect(screen.getByRole('button', { name: tr('app.autonomo.prepare') })).toBeInTheDocument();
  });

  it('lets the free plan draft the quarter just ended while it can be filed', async () => {
    freezeTime('2026-04-10T12:00:00');
    open();
    expect(await screen.findByText(tr('app.autonomo.freeOne'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '1' } });
    expect(screen.getByRole('button', { name: tr('app.autonomo.prepare') })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '4' } });
    expect(screen.getByText(tr('app.autonomo.otherQuarterLocked'))).toBeInTheDocument();
  });

  it('counts the free draft of each quarter on its own', async () => {
    freezeTime('2026-04-10T12:00:00');
    const api = createFakeApi();
    const overview = f.billing({ plan: 'free', limits: f.catalog().limits.free });
    api.billingApi.get.mockResolvedValue({
      ...overview,
      // The first quarter was drafted in its filing window; the second is still free.
      autonomoQuarters: [
        { year: 2026, quarter: 2, used: 0 },
        { year: 2026, quarter: 1, used: 1 },
      ],
    });
    open(api);
    expect(await screen.findByRole('button', { name: tr('app.autonomo.prepare') })).toBeVisible();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '1' } });
    expect(screen.getByText(tr('app.autonomo.usedFree'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('app.autonomo.prepare') })).toBeNull();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '2' } });
    expect(screen.getByRole('button', { name: tr('app.autonomo.prepare') })).toBeVisible();
  });

  it('shows the draft prepared before, even when the plan is out of drafts', async () => {
    localStorage.setItem(
      'mm_autonomo_draft2',
      JSON.stringify({ draft: f.autonomoDraft(), inputs: null })
    );
    open(free(1));
    expect(await screen.findByText(/Borrador de 2026, 1.º trimestre/)).toBeInTheDocument();
  });

  it('has no limit with Premium and reports errors', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    api.businessApi.draft.mockRejectedValueOnce(new Error('Sin conexión'));
    renderWithProviders(<BusinessView />, { api, plan: true });
    expect(screen.queryByText(tr('app.autonomo.freeOne'))).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.autonomo.prepare') }));
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
  });

  it('works outside the plan context too', async () => {
    renderWithProviders(<BusinessView />, { api: createFakeApi() });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.autonomo.prepare') }));
    expect(await screen.findByText(/Borrador de 2026/)).toBeInTheDocument();
  });
});

describe('the investments and debts section', () => {
  const fund = {
    id: 'a1',
    name: 'Fondo indexado',
    kind: 'investment' as const,
    interestRate: null,
    minPayment: null,
    value: 1200,
    valueDate: '2026-03-01',
    previousValue: 1000,
    history: [],
  };
  const loan = {
    ...fund,
    id: 'a2',
    name: 'Préstamo',
    kind: 'debt' as const,
    value: 800,
    previousValue: 1000,
  };
  const flat = { ...fund, id: 'a3', name: 'Piso', kind: 'property' as const, previousValue: null };
  const zero = { ...fund, id: 'a4', name: 'Nuevo', previousValue: 0 };
  const falling = { ...fund, id: 'a5', name: 'Bajista', previousValue: 1500 };
  const growingDebt = { ...loan, id: 'a6', name: 'Crece', previousValue: 400 };

  it('lists what the user values by hand, with the change and the total', async () => {
    const api = createFakeApi();
    api.assetApi.getAll.mockResolvedValue([fund, loan, flat, zero, falling, growingDebt]);
    renderWithProviders(<AssetsView />, { api });
    expect(await screen.findByText('Fondo indexado')).toBeInTheDocument();
    expect(screen.getAllByText('Préstamo').length).toBeGreaterThan(0);
    // Good: an investment that grows, a debt that shrinks. Bad: the opposite.
    const marks = (pattern: RegExp) => screen.getAllByText(pattern).map((e) => e.className);
    expect(marks(/▲ 20,0/)).toEqual(['amount-pos']);
    expect(marks(/▼ 20,0/).sort()).toEqual(['amount-neg', 'amount-pos']);
    expect(marks(/▲ 100,0/)).toEqual(['amount-neg']);
    expect(screen.getByText(literal(tr('app.assets.total'))).parentElement?.textContent).toContain(
      '3200,00'
    );
  });

  it('adds, values and removes elements', async () => {
    const api = createFakeApi();
    api.assetApi.getAll.mockResolvedValue([fund]);
    renderWithProviders(<AssetsView />, { api });
    await screen.findByText('Fondo indexado');

    const add = screen.getByRole('button', { name: tr('app.assets.add') });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.name') }), {
      target: { value: ' Casa ' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.assets.kind') }), {
      target: { value: 'property' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.value') }), {
      target: { value: '150000,50' },
    });
    fireEvent.click(add);
    await waitFor(() =>
      expect(api.assetApi.create).toHaveBeenCalledWith({
        name: 'Casa',
        kind: 'property',
        value: 150000.5,
      })
    );

    const update = screen.getByRole('button', { name: tr('app.assets.update') });
    expect(update).toBeDisabled();
    const box = screen.getByRole('textbox', {
      name: tr('app.assets.updateValue', { name: 'Fondo indexado' }),
    });
    fireEvent.change(box, { target: { value: 'abc' } });
    expect(update).toBeDisabled();
    fireEvent.change(box, { target: { value: '1300' } });
    fireEvent.click(update);
    await waitFor(() => expect(api.assetApi.setValue).toHaveBeenCalledWith('a1', 1300));
    expect(box).toHaveValue('');

    fireEvent.click(
      screen.getByRole('button', { name: tr('app.assets.remove', { name: 'Fondo indexado' }) })
    );
    await waitFor(() => expect(api.assetApi.remove).toHaveBeenCalledWith('a1'));
  });

  describe('on the free plan', () => {
    const free = () => {
      const api = createFakeApi();
      api.billingApi.get.mockResolvedValue({
        ...f.billing({ plan: 'free' }),
        limits: f.catalog().limits.free,
      });
      return api;
    };

    it('lets a free account add its first element', async () => {
      const api = free();
      renderWithProviders(<AssetsView />, { api, plan: true });
      await waitFor(() => expect(api.billingApi.get).toHaveBeenCalled());
      expect(await screen.findByRole('button', { name: tr('app.assets.add') })).toBeInTheDocument();
      expect(screen.queryByText(tr('app.assets.usedFree'))).toBeNull();
    });

    it('lets a free account have three in total', async () => {
      const api = free();
      api.assetApi.getAll.mockResolvedValue([fund, { ...fund, id: 'a2', name: 'Piso' }]);
      renderWithProviders(<AssetsView />, { api, plan: true });
      expect(await screen.findByText('Piso')).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: tr('app.assets.add') })).toBeInTheDocument();
    });

    it('asks for Premium to add a fourth one, and keeps the others usable', async () => {
      const api = free();
      api.assetApi.getAll.mockResolvedValue([
        fund,
        { ...fund, id: 'a2', name: 'Piso' },
        { ...fund, id: 'a3', name: 'Hipoteca', kind: 'debt' as const },
      ]);
      renderWithProviders(<AssetsView />, { api, plan: true });
      expect(await screen.findByText(tr('app.assets.usedFree'))).toBeInTheDocument();
      expect(screen.getByText('Fondo indexado')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: tr('app.assets.add') })).toBeNull();
      expect(screen.queryByRole('textbox', { name: tr('app.assets.name') })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: tr('billing.seePlans') }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
  });

  it('shows why a value was refused', async () => {
    const api = createFakeApi();
    api.assetApi.create.mockRejectedValueOnce(new Error('Máximo 30 elementos'));
    renderWithProviders(<AssetsView />, { api });
    fireEvent.change(await screen.findByRole('textbox', { name: tr('app.assets.name') }), {
      target: { value: 'x' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.value') }), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.add') }));
    expect(await screen.findByText('Máximo 30 elementos')).toBeInTheDocument();
  });
});

describe('CategoryRulesCard in the settings', () => {
  const rule = { id: 'r1', pattern: 'mercadona', categoryId: 'c1', categoryName: 'Comida' };

  it('lists, adds and removes the rules the user taught', async () => {
    const api = createFakeApi();
    api.categoryRuleApi.getAll.mockResolvedValue([rule]);
    api.categoryApi.getAll.mockResolvedValue([
      f.category({ id: 'c1', name: 'Comida' }),
      f.category({ id: 'c2', name: 'Ocio' }),
    ]);
    renderWithProviders(<SettingsView onOpenProfile={jest.fn()} onStartTour={jest.fn()} />, {
      api,
    });
    expect(await screen.findByText(/«mercadona» →/)).toBeInTheDocument();

    const add = screen.getByRole('button', { name: tr('app.rules.add') });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.rules.pattern') }), {
      target: { value: 'Netflix' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.rules.category') }), {
      target: { value: 'c2' },
    });
    fireEvent.click(add);
    await waitFor(() => expect(api.categoryRuleApi.add).toHaveBeenCalledWith('Netflix', 'c2'));
    await waitFor(() => expect(add).toBeDisabled());

    fireEvent.click(
      screen.getByRole('button', { name: tr('app.rules.remove', { pattern: 'mercadona' }) })
    );
    await waitFor(() => expect(api.categoryRuleApi.remove).toHaveBeenCalledWith('r1'));
  });

  it('shows what went wrong when a rule is refused', async () => {
    const api = createFakeApi();
    api.categoryRuleApi.add.mockRejectedValueOnce(new Error('Regla no válida'));
    api.categoryApi.getAll.mockResolvedValue([f.category({ id: 'c1', name: 'Comida' })]);
    renderWithProviders(<SettingsView onOpenProfile={jest.fn()} onStartTour={jest.fn()} />, {
      api,
    });
    fireEvent.change(await screen.findByRole('textbox', { name: tr('app.rules.pattern') }), {
      target: { value: 'abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.rules.add') }));
    expect(await screen.findByText('Regla no válida')).toBeInTheDocument();
  });
});

describe('the appearance setting', () => {
  it('switches the look of the app on this device', async () => {
    window.matchMedia = jest
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    localStorage.clear();
    // Everything together (the assistant has its own suite).
    localStorage.setItem('mm_autonomo_assistant', 'expert');
    renderWithProviders(<SettingsView onOpenProfile={jest.fn()} onStartTour={jest.fn()} />);
    const select = await screen.findByRole('combobox', {
      name: new RegExp(tr('app.settings.theme')),
    });
    expect(select).toHaveValue('system');
    fireEvent.change(select, { target: { value: 'light' } });
    expect(localStorage.getItem('mm_theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    fireEvent.change(select, { target: { value: 'dark' } });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('SettingsView', () => {
  const mocked = notifications as jest.Mocked<typeof notifications>;

  function setup(api = createFakeApi()) {
    api.accountApi.getAll.mockResolvedValue({
      accounts: [
        f.account({ id: 'a1' }),
        f.account({ id: 'a2', name: 'Efectivo' }),
        f.account({ id: 'a3', archived: true }),
      ],
      total: 0,
    });
    const onOpenProfile = jest.fn();
    const view = renderWithProviders(
      <SettingsView onOpenProfile={onOpenProfile} onStartTour={jest.fn()} />,
      { api }
    );
    return { ...view, onOpenProfile };
  }

  it('saves preferences and reloads the months when the start day changes', async () => {
    jest.spyOn(navigation, 'offersEnabled').mockReturnValue(true);
    const { api } = setup();
    api.settingsApi.update.mockResolvedValue(
      f.settings({ monthStartDay: 25, notificationsEnabled: true })
    );
    const currency = await screen.findByRole('combobox', {
      name: new RegExp(tr('app.settings.currency')),
    });
    fireEvent.change(currency, { target: { value: 'USD' } });
    await waitFor(() => expect(api.settingsApi.update).toHaveBeenCalledWith({ currency: 'USD' }));
    expect(await screen.findByText(tr('app.settings.saved'))).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('combobox', { name: new RegExp(tr('app.settings.monthStartDay')) }),
      { target: { value: '25' } }
    );
    await waitFor(() =>
      expect(mocked.scheduleMonthlyReminder).toHaveBeenCalledWith(
        25,
        expect.any(String),
        expect.any(String)
      )
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: new RegExp(tr('app.settings.language')) }),
      { target: { value: 'en' } }
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: new RegExp(tr('app.settings.defaultAccount')) }),
      { target: { value: 'a2' } }
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: new RegExp(tr('app.settings.showOffers')) })
    );
    await waitFor(() => expect(api.settingsApi.update).toHaveBeenCalledWith({ showOffers: false }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: new RegExp(tr('app.settings.weeklyDigest')) })
    );
    await waitFor(() =>
      expect(api.settingsApi.update).toHaveBeenCalledWith({ weeklyDigest: true })
    );
  });

  it('turns notifications on and off', async () => {
    const { api } = setup();
    api.settingsApi.update.mockResolvedValue(f.settings({ notificationsEnabled: true }));
    const toggle = await screen.findByRole('checkbox', {
      name: new RegExp(tr('app.settings.notifications')),
    });
    mocked.requestNotificationPermission.mockResolvedValueOnce(false);
    fireEvent.click(toggle);
    expect(await screen.findByText(tr('app.settings.notificationsDenied'))).toBeInTheDocument();
    mocked.requestNotificationPermission.mockResolvedValueOnce(true);
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(mocked.scheduleMonthlyReminder).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.any(String)
      )
    );
    api.settingsApi.update.mockResolvedValue(f.settings({ notificationsEnabled: false }));
    fireEvent.click(
      await screen.findByRole('checkbox', {
        name: new RegExp(tr('app.settings.notifications')),
        checked: true,
      })
    );
    await waitFor(() => expect(mocked.cancelMonthlyReminder).toHaveBeenCalled());
  });

  it('does not touch the reminder when saving fails', async () => {
    const { api } = setup();
    api.settingsApi.update.mockRejectedValue(new Error('No guardado'));
    mocked.requestNotificationPermission.mockResolvedValueOnce(true);
    fireEvent.click(
      await screen.findByRole('checkbox', { name: new RegExp(tr('app.settings.notifications')) })
    );
    expect(await screen.findByText('No guardado')).toBeInTheDocument();
    expect(mocked.scheduleMonthlyReminder).not.toHaveBeenCalled();
  });

  it('exports data and handles export errors', async () => {
    const downloads = captureDownloads();
    const { api } = setup();
    api.dataApi.exportAll
      .mockResolvedValueOnce({ a: 1 })
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Export fallida'));
    fireEvent.click(
      await screen.findByRole('button', { name: literal(tr('app.settings.exportJson')) })
    );
    await waitFor(() => expect(downloads.names).toEqual(['finanverso-2026-03-15.json']));
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.settings.exportCsv')) }));
    await waitFor(() => expect(downloads.names[1]).toBe('finanverso_movimientos_2026-03-15.csv'));
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.settings.exportCsv')) }));
    expect(await screen.findByText('Export fallida')).toBeInTheDocument();
    downloads.restore();
  });

  it('opens the profile and closes every session after confirming', async () => {
    const { authApi } = jest.requireActual('@core/api/authApi');
    const everywhere = jest
      .spyOn(authApi, 'logoutEverywhere')
      .mockRejectedValueOnce(new Error('Sin red'))
      .mockResolvedValueOnce(undefined);
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    const { onOpenProfile } = setup();
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('app.header.openProfile')) })
    );
    expect(onOpenProfile).toHaveBeenCalled();
    const button = screen.getByRole('button', {
      name: new RegExp(tr('app.settings.logoutEverywhere')),
    });
    fireEvent.click(button);
    expect(everywhere).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(await screen.findByText('Sin red')).toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(everywhere).toHaveBeenCalledTimes(2));
    confirm.mockRestore();
    await act(async () => undefined);
  });

  it('waits for the settings and hides notifications where unsupported', async () => {
    mocked.notificationsSupported.mockReturnValue(false);
    const api = createFakeApi();
    let resolve!: (v: ReturnType<typeof f.settings>) => void;
    api.settingsApi.get.mockReturnValue(new Promise((r) => (resolve = r)));
    api.accountApi.getAll.mockResolvedValue({ accounts: [f.account()], total: 0 });
    renderWithProviders(<SettingsView onOpenProfile={jest.fn()} onStartTour={jest.fn()} />, {
      api,
    });
    expect(screen.getByText(tr('app.common.loading'))).toBeInTheDocument();
    await act(async () => resolve(f.settings()));
    expect(
      screen.queryByRole('checkbox', { name: new RegExp(tr('app.settings.notifications')) })
    ).toBeNull();
    expect(
      screen.queryByRole('combobox', { name: new RegExp(tr('app.settings.defaultAccount')) })
    ).toBeNull();
    mocked.notificationsSupported.mockReturnValue(true);
  });
});
