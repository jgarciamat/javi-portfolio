import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import * as notifications from '@core/notifications/notifications';
import { AccountsView } from '@modules/finances/ui/views/AccountsView';
import { BudgetsView } from '@modules/finances/ui/views/BudgetsView';
import { GoalsView } from '@modules/finances/ui/views/GoalsView';
import { SearchView } from '@modules/finances/ui/views/SearchView';
import { AnalysisView } from '@modules/finances/ui/views/AnalysisView';
import { SettingsView } from '@modules/finances/ui/views/SettingsView';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { captureDownloads } from '@test-utils/dom';

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
  jest.clearAllMocks();
  freezeTime();
});
afterEach(restoreTime);

// ─── Accounts ────────────────────────────────────────────────────────────────

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
    });

    fireEvent.click(screen.getByRole('button', { name: tr('app.accounts.archive') }));
    await waitFor(() => expect(api.goalApi.update).toHaveBeenCalledWith('g1', { archived: true }));
    fireEvent.click(screen.getByRole('button', { name: `${tr('app.common.delete')} Viaje` }));
    await waitFor(() => expect(api.goalApi.delete).toHaveBeenCalledWith('g1'));
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
      { year: 2026, month: 2, available: 100, saved: 50, netWorth: 150 },
      { year: 2026, month: 3, available: 200, saved: 60, netWorth: 260 },
    ]);
    renderWithProviders(<AnalysisView />, { api });
    expect(await screen.findByText(tr('app.categories.Ocio'))).toBeInTheDocument();
    expect(screen.getByText(/▲ 50%/)).toBeInTheDocument();
    expect(screen.getByText(/▼ 10%/)).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: tr('app.analysis.netWorthTitle') })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.analysis.range') }), {
      target: { value: '24' },
    });
    await waitFor(() => expect(api.insightsApi.netWorth).toHaveBeenLastCalledWith(24));
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
      { year: 2026, month: 3, available: 0, saved: 0, netWorth: 0 },
    ]);
    renderWithProviders(<AnalysisView />, { api });
    expect(
      await screen.findByRole('img', { name: tr('app.analysis.netWorthTitle') })
    ).toBeInTheDocument();
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

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
    await waitFor(() => expect(downloads.names).toEqual(['money-manager-2026-03-15.json']));
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.settings.exportCsv')) }));
    await waitFor(() =>
      expect(downloads.names[1]).toBe('money-manager_movimientos_2026-03-15.csv')
    );
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
