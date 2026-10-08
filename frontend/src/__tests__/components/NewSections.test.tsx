import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import esJson from '@locales/es.json';
import { MonthAlerts } from '@modules/finances/ui/components/MonthAlerts';
import { BudgetProgress } from '@modules/finances/ui/components/BudgetProgress';
import { AccountsView } from '@modules/finances/ui/views/AccountsView';
import { BudgetsView } from '@modules/finances/ui/views/BudgetsView';
import { GoalsView } from '@modules/finances/ui/views/GoalsView';
import { SearchView } from '@modules/finances/ui/views/SearchView';
import { AnalysisView } from '@modules/finances/ui/views/AnalysisView';
import { SettingsView } from '@modules/finances/ui/views/SettingsView';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';

const translations = esJson as Record<string, string>;
const t = (key: string, vars?: Record<string, string>) => {
  let v = translations[key] ?? key;
  Object.entries(vars ?? {}).forEach(([k, val]) => {
    v = v.replace(`{${k}}`, val);
  });
  return v;
};

jest.mock('@core/i18n/I18nContext', () => ({
  useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory: (n: string) => n }),
}));

const mockUpdateSettings = jest.fn();
jest.mock('@core/settings/SettingsContext', () => {
  const format = jest.requireActual('@shared/utils/format');
  return {
    useFormat: () => ({
      locale: 'es',
      currency: 'EUR',
      money: (n: number) => format.formatMoney(n, 'EUR', 'es'),
      percent: (n: number, d?: number) => format.formatPercent(n, 'es', d),
      monthName: (m: number, s?: 'long' | 'short') => format.monthName(m, 'es', s),
      monthLabel: (y: number, m: number) => format.monthLabel(y, m, 'es'),
      date: (d: string) => format.formatDate(d, 'es'),
      range: (a: string, b: string) => format.formatRange(a, b, 'es'),
    }),
    useOptionalSettings: () => null,
    useSettings: () => ({
      settings: {
        currency: 'EUR',
        locale: 'es',
        monthStartDay: 1,
        defaultAccountId: 'a1',
        notificationsEnabled: false,
        currentPeriod: { year: 2026, month: 3, start: '2026-03-01', end: '2026-03-31' },
      },
      updateSettings: mockUpdateSettings,
    }),
  };
});

jest.mock('@shared/hooks/useAuth', () => ({ useAuth: () => ({ logoutEverywhere: jest.fn() }) }));
jest.mock('@core/context/ApiContext', () => ({ useApi: jest.fn() }));
jest.mock('@modules/finances/application/FinancesContext', () => ({ useFinances: jest.fn() }));

const { useApi } = jest.requireMock('@core/context/ApiContext') as { useApi: jest.Mock };
const { useFinances } = jest.requireMock('@modules/finances/application/FinancesContext') as {
  useFinances: jest.Mock;
};

const accounts = [
  {
    id: 'a1',
    name: 'Principal',
    type: 'checking',
    initialBalance: 0,
    balance: 900,
    color: '#000',
    icon: '🏦',
    archived: false,
    isDefault: true,
    createdAt: '',
  },
  {
    id: 'a2',
    name: 'Efectivo',
    type: 'cash',
    initialBalance: 50,
    balance: 50,
    color: '#000',
    icon: '💵',
    archived: false,
    isDefault: false,
    createdAt: '',
  },
];
const categories = [
  { id: 'c1', name: 'Ocio', color: '#f00', icon: '🎉' },
  { id: 'c2', name: 'Ahorro', color: '#0f0', icon: '🐷' },
];
const refresh = jest.fn().mockResolvedValue(undefined);
const refreshAccounts = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  useFinances.mockReturnValue({
    year: 2026,
    month: 3,
    categories,
    accounts,
    budgets: [
      {
        categoryId: 'c1',
        categoryName: 'Ocio',
        limit: 100,
        spent: 85,
        remaining: 15,
        percentage: 85,
        level: 'warning',
      },
    ],
    refresh,
    refreshAccounts,
  });
});

describe('MonthAlerts', () => {
  it('translates API alerts and can dismiss them', () => {
    render(
      <MonthAlerts
        alerts={[
          {
            kind: 'available',
            level: 'warning',
            categoryName: null,
            spent: 90,
            limit: 100,
            percentage: 90,
          },
          {
            kind: 'category_budget',
            level: 'danger',
            categoryName: 'Ropa',
            spent: 60,
            limit: 50,
            percentage: 120,
          },
        ]}
      />
    );
    expect(screen.getByText(t('app.alert.globalWarning', { pct: '90' }))).toBeInTheDocument();
    expect(
      screen.getByText(t('app.alert.budgetDanger', { category: 'Ropa', pct: '120' }))
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: t('app.alert.dismiss') })[0]);
    expect(screen.queryByText(t('app.alert.globalWarning', { pct: '90' }))).toBeNull();
  });

  it('renders nothing without alerts', () => {
    const { container } = render(<MonthAlerts alerts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('BudgetProgress', () => {
  it('shows spending against each budget', () => {
    const onManage = jest.fn();
    render(
      <BudgetProgress
        budgets={[
          {
            categoryId: 'c1',
            categoryName: 'Ocio',
            limit: 100,
            spent: 120,
            remaining: -20,
            percentage: 120,
            level: 'danger',
          },
        ]}
        onManage={onManage}
      />
    );
    expect(screen.getByRole('progressbar', { name: 'Ocio' })).toHaveAttribute(
      'aria-valuenow',
      '120'
    );
    expect(screen.getByText(/Te has pasado/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(t('app.budgets.manage')));
    expect(onManage).toHaveBeenCalled();
  });
});

describe('AccountsView', () => {
  const accountApi = {
    getAll: jest.fn(),
    transfers: jest.fn(),
    create: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    createTransfer: jest.fn().mockResolvedValue({}),
    deleteTransfer: jest.fn(),
  };

  beforeEach(() => {
    accountApi.getAll.mockResolvedValue({ accounts, total: 950 });
    accountApi.transfers.mockResolvedValue([
      {
        id: 'tr1',
        fromAccountId: 'a1',
        fromAccountName: 'Principal',
        toAccountId: 'a2',
        toAccountName: 'Efectivo',
        amount: 20,
        date: '2026-03-02',
        description: null,
        createdAt: '',
      },
    ]);
    useApi.mockReturnValue({ accountApi });
  });

  it('lists accounts with balances, total and transfers', async () => {
    render(<AccountsView />);
    expect(await screen.findByText('Efectivo', { selector: '.entity-name' })).toBeInTheDocument();
    expect(screen.getByText(/950,00/)).toBeInTheDocument();
    expect(screen.getByText('Principal → Efectivo')).toBeInTheDocument();
    expect(screen.getByText(t('app.accounts.default'))).toBeInTheDocument();
  });

  it('creates an account and refreshes balances and months', async () => {
    render(<AccountsView />);
    await screen.findByText('Efectivo', { selector: '.entity-name' });
    fireEvent.change(screen.getAllByPlaceholderText(t('app.accounts.name')).at(-1)!, {
      target: { value: 'Tarjeta' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('app.accounts.add') }));
    await waitFor(() =>
      expect(accountApi.create).toHaveBeenCalledWith({
        name: 'Tarjeta',
        type: 'checking',
        initialBalance: 0,
      })
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledWith({ invalidate: true }));
    expect(refreshAccounts).toHaveBeenCalled();
  });

  it('transfers money between accounts', async () => {
    render(<AccountsView />);
    await screen.findByText('Efectivo', { selector: '.entity-name' });
    fireEvent.change(screen.getAllByPlaceholderText(t('app.transaction.form.amount'))[0], {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('app.accounts.transfer') }));
    await waitFor(() =>
      expect(accountApi.createTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ fromAccountId: 'a1', toAccountId: 'a2', amount: 30 })
      )
    );
  });

  it('shows API errors (e.g. deleting an account with movements)', async () => {
    accountApi.delete.mockRejectedValueOnce(new Error('La cuenta tiene movimientos.'));
    render(<AccountsView />);
    await screen.findByText('Efectivo', { selector: '.entity-name' });
    fireEvent.click(screen.getByRole('button', { name: `${t('app.common.delete')} Efectivo` }));
    expect(await screen.findByText('La cuenta tiene movimientos.')).toBeInTheDocument();
  });
});

describe('BudgetsView', () => {
  const budgetApi = {
    getAll: jest.fn(),
    set: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    budgetApi.getAll.mockResolvedValue([
      { id: 'b1', categoryId: 'c1', categoryName: 'Ocio', amount: 100 },
    ]);
    useApi.mockReturnValue({ budgetApi });
  });

  it('shows the limit and this month spending, and saves a new limit', async () => {
    render(<BudgetsView />);
    const input = await screen.findByDisplayValue('100');
    expect(screen.getByText(/85,00 € de 100,00 €/)).toBeInTheDocument();
    const ahorro = screen.getByLabelText(`${t('app.budgets.limitFor')} Ahorro`);
    fireEvent.change(ahorro, { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: t('app.common.save') }));
    await waitFor(() => expect(budgetApi.set).toHaveBeenCalledWith('c2', 200));
    expect(input).toBeInTheDocument();
  });

  it('clearing the value removes the budget', async () => {
    render(<BudgetsView />);
    const input = await screen.findByDisplayValue('100');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(budgetApi.delete).toHaveBeenCalledWith('b1'));
  });
});

describe('GoalsView', () => {
  const goalApi = {
    getAll: jest.fn(),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn(),
  };

  beforeEach(() => {
    goalApi.getAll.mockResolvedValue([
      {
        id: 'g1',
        name: 'Viaje',
        target: 3000,
        targetDate: '2026-12-31',
        categoryId: 'c9',
        categoryName: 'Viaje',
        icon: '✈️',
        color: '#10b981',
        archived: false,
        createdAt: '',
        progress: {
          saved: 600,
          remaining: 2400,
          percentage: 20,
          monthsLeft: 10,
          monthlyNeeded: 240,
          completed: false,
        },
      },
    ]);
    useApi.mockReturnValue({ goalApi });
  });

  it('shows progress and the monthly saving needed', async () => {
    render(<GoalsView />);
    expect(await screen.findByRole('progressbar', { name: 'Viaje' })).toHaveAttribute(
      'aria-valuenow',
      '20'
    );
    expect(screen.getByText(/240,00 €\/mes/)).toBeInTheDocument();
  });

  it('creates a goal', async () => {
    render(<GoalsView />);
    await screen.findByText(/Viaje/, { selector: '.goal-name' });
    fireEvent.change(screen.getByPlaceholderText(t('app.goals.name')), {
      target: { value: 'Moto' },
    });
    fireEvent.change(screen.getByPlaceholderText(t('app.goals.target')), {
      target: { value: '2000' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('app.goals.create') }));
    await waitFor(() =>
      expect(goalApi.create).toHaveBeenCalledWith({
        name: 'Moto',
        target: 2000,
        targetDate: null,
        category: undefined,
      })
    );
  });
});

describe('SearchView', () => {
  const search = jest.fn();

  beforeEach(() => {
    search.mockResolvedValue({
      items: [
        {
          id: 't1',
          description: 'Cine',
          amount: 12,
          type: 'EXPENSE',
          category: 'Ocio',
          date: '2026-03-04',
          createdAt: '',
          notes: null,
          categoryIcon: '🎉',
        },
      ],
      total: 1,
      totals: { income: 0, expenses: 12, saving: 0 },
    });
    useApi.mockReturnValue({ transactionApi: { search } });
  });

  it('searches with filters (debounced text) and opens a result for editing', async () => {
    jest.useFakeTimers();
    const onEdit = jest.fn();
    render(<SearchView onEdit={onEdit} />);
    await waitFor(() =>
      expect(search).toHaveBeenCalledWith({ sort: 'date_desc', limit: 50, offset: 0 })
    );
    fireEvent.change(screen.getByLabelText(t('app.search.placeholder')), {
      target: { value: 'cine' },
    });
    fireEvent.change(screen.getByLabelText(t('app.search.type')), { target: { value: 'EXPENSE' } });
    jest.advanceTimersByTime(350);
    jest.useRealTimers();
    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'cine', type: 'EXPENSE' })
      )
    );
    fireEvent.click(await screen.findByText('Cine'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    expect(screen.getByText(t('app.search.results', { count: '1' }))).toBeInTheDocument();
  });
});

describe('AnalysisView', () => {
  it('shows category trends and the net worth chart', async () => {
    useApi.mockReturnValue({
      insightsApi: {
        trends: jest.fn().mockResolvedValue({
          year: 2026,
          month: 3,
          categories: [
            {
              categoryName: 'Ocio',
              current: 120,
              previous: 90,
              average3: 60,
              changeVsPreviousPct: 33.3,
              changeVsAveragePct: 100,
            },
          ],
        }),
        netWorth: jest.fn().mockResolvedValue([
          { year: 2026, month: 2, available: 1000, saved: 0, netWorth: 1000 },
          { year: 2026, month: 3, available: 800, saved: 200, netWorth: 1000 },
        ]),
      },
    });
    render(<AnalysisView />);
    const row = (await screen.findByText('Ocio')).closest('tr')!;
    expect(within(row).getByText(/▲ 33%/)).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: t('app.analysis.netWorthTitle') })
    ).toBeInTheDocument();
  });
});

describe('SettingsView', () => {
  it('saves settings and reloads the months when the start day changes', async () => {
    mockUpdateSettings.mockResolvedValue({ notificationsEnabled: false, monthStartDay: 25 });
    useApi.mockReturnValue({ dataApi: { exportAll: jest.fn() } });
    render(<SettingsView onOpenProfile={jest.fn()} onStartTour={jest.fn()} />);
    const day = screen.getByDisplayValue(t('app.settings.calendarMonth'));
    fireEvent.change(day, { target: { value: '25' } });
    await waitFor(() => expect(mockUpdateSettings).toHaveBeenCalledWith({ monthStartDay: 25 }));
    await waitFor(() => expect(refresh).toHaveBeenCalledWith({ invalidate: true }));
    expect(await screen.findByText(t('app.settings.saved'))).toBeInTheDocument();
  });
});

describe('ImportModal', () => {
  const importFn = jest.fn();

  beforeEach(() => {
    useApi.mockReturnValue({ transactionApi: { import: importFn } });
    importFn.mockImplementation((_rows: unknown, opts: { dryRun?: boolean }) =>
      Promise.resolve({
        dryRun: !!opts.dryRun,
        imported: 1,
        duplicates: 0,
        invalid: 0,
        rows: [
          {
            index: 0,
            status: 'imported',
            date: '2026-03-02',
            description: 'MERCADONA',
            amount: 54.3,
            type: 'EXPENSE',
            categoryName: 'Alimentación',
            categorySource: 'keywords',
          },
        ],
      })
    );
  });

  it('reads a CSV, previews the categories and imports', async () => {
    const onImported = jest.fn();
    render(
      <ImportModal accounts={accounts as never} onClose={jest.fn()} onImported={onImported} />
    );
    const csv = 'Fecha;Concepto;Importe\n02/03/2026;MERCADONA;-54,30\n';
    const file = new File([csv], 'banco.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode(csv).buffer,
    });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });

    expect(await screen.findByText(/1 movimientos leídos/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('app.import.preview') }));
    await waitFor(() =>
      expect(importFn).toHaveBeenCalledWith(
        [{ date: '2026-03-02', description: 'MERCADONA', amount: -54.3, category: null }],
        { accountId: 'a1', dryRun: true }
      )
    );
    expect(await screen.findByText('Alimentación')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('app.import.confirm', { count: '1' }) }));
    await waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(importFn).toHaveBeenLastCalledWith(expect.any(Array), {
      accountId: 'a1',
      dryRun: false,
    });
  });
});
