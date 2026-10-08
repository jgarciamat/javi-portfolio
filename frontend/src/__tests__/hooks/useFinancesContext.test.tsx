import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinancesProvider, useFinances } from '../../modules/finances/application/FinancesContext';
import type { MonthOverview } from '../../modules/finances/domain/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@shared/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@core/context/ApiContext', () => ({ useApi: jest.fn() }));
jest.mock('@core/settings/SettingsContext', () => ({ useOptionalSettings: jest.fn() }));

const { useApi } = jest.requireMock('@core/context/ApiContext') as { useApi: jest.Mock };
const { useAuth } = jest.requireMock('@shared/hooks/useAuth') as { useAuth: jest.Mock };
const { useOptionalSettings } = jest.requireMock('@core/settings/SettingsContext') as {
  useOptionalSettings: jest.Mock;
};

const monthGet = jest.fn();
const txCreate = jest.fn();
const txDelete = jest.fn();
const txPatch = jest.fn();
const txUpdate = jest.fn();
const catGetAll = jest.fn();
const catCreate = jest.fn();
const catUpdate = jest.fn();
const catDelete = jest.fn();
const accGetAll = jest.fn();

const apis = {
  monthApi: { get: monthGet },
  transactionApi: { create: txCreate, delete: txDelete, patch: txPatch, update: txUpdate },
  categoryApi: { getAll: catGetAll, create: catCreate, update: catUpdate, delete: catDelete },
  accountApi: { getAll: accGetAll },
};

const settings = {
  settings: {
    currency: 'EUR',
    locale: 'es',
    monthStartDay: 1,
    defaultAccountId: 'a1',
    notificationsEnabled: false,
    currentPeriod: { year: 2026, month: 3, start: '2026-03-01', end: '2026-03-31' },
  },
};

function overview(
  year: number,
  month: number,
  overrides: Partial<MonthOverview> = {}
): MonthOverview {
  return {
    year,
    month,
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-28`,
    isCurrent: year === 2026 && month === 3,
    transactions: [
      {
        id: 't1',
        description: 'Bus',
        amount: 10,
        type: 'EXPENSE',
        category: 'Transporte',
        date: `${year}-${String(month).padStart(2, '0')}-05`,
        createdAt: '2026-03-05T10:00:00Z',
        notes: null,
      },
    ],
    summary: {
      totalIncome: 500,
      totalExpenses: 10,
      totalSaving: 0,
      balance: 490,
      expensesByCategory: { Transporte: 10 },
      incomeByCategory: {},
      savingByCategory: {},
      transactionCount: 1,
    },
    carryover: 100,
    available: 590,
    budgets: [
      {
        categoryId: 'c1',
        categoryName: 'Transporte',
        limit: 50,
        spent: 10,
        remaining: 40,
        percentage: 20,
        level: 'ok',
      },
    ],
    alerts: [],
    ...overrides,
  };
}

// ── Consumer ──────────────────────────────────────────────────────────────────

function Consumer() {
  const ctx = useFinances();
  return (
    <div>
      <div data-testid="period">{`${ctx.year}-${ctx.month}`}</div>
      <div data-testid="tx-count">{ctx.transactions.length}</div>
      <div data-testid="tx-notes">{ctx.transactions[0]?.notes ?? 'null'}</div>
      <div data-testid="carryover">{ctx.carryover ?? 'null'}</div>
      <div data-testid="available">{ctx.available}</div>
      <div data-testid="budgets">{ctx.budgets.length}</div>
      <div data-testid="range">{`${ctx.periodStart}|${ctx.periodEnd}`}</div>
      <div data-testid="current">{String(ctx.isCurrentPeriod)}</div>
      <div data-testid="next-disabled">{String(ctx.isNextDisabled)}</div>
      <div data-testid="accounts">{ctx.accounts.length}</div>
      <div data-testid="error">{ctx.error ?? ''}</div>
      <button onClick={ctx.goToPrev}>prev</button>
      <button onClick={ctx.goToNext}>next</button>
      <button onClick={ctx.goToCurrent}>current</button>
      <button onClick={() => ctx.navigateTo(2027, 3)}>goto-horizon</button>
      <button onClick={() => ctx.navigateTo(2027, 4)}>goto-beyond</button>
      <button onClick={() => ctx.navigateTo(2019, 6)}>goto-2019</button>
      <button
        onClick={() =>
          ctx.addTransaction({
            description: 'New',
            amount: 50,
            type: 'INCOME',
            category: 'Salario',
          })
        }
      >
        add-tx
      </button>
      <button onClick={() => ctx.removeTransaction('t1')}>del-tx</button>
      <button onClick={() => ctx.patchTransaction('t1', { notes: 'Patched note' })}>
        patch-notes
      </button>
      <button onClick={() => ctx.updateCategory('c1', { name: 'Bus' })}>rename-cat</button>
      <button onClick={() => ctx.removeCategory('c1', 'c2')}>del-cat</button>
    </div>
  );
}

const renderProvider = () =>
  render(
    <FinancesProvider>
      <Consumer />
    </FinancesProvider>
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FinancesContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ token: 'tok', logout: jest.fn() });
    useApi.mockReturnValue(apis);
    useOptionalSettings.mockReturnValue(settings);
    monthGet.mockImplementation((y: number, m: number) => Promise.resolve(overview(y, m)));
    catGetAll.mockResolvedValue([{ id: 'c1', name: 'Transporte', color: '#000', icon: '🚗' }]);
    accGetAll.mockResolvedValue({ accounts: [{ id: 'a1', name: 'Principal' }], total: 0 });
    txCreate.mockResolvedValue({ id: 't2' });
    txDelete.mockResolvedValue(undefined);
    txUpdate.mockResolvedValue({ id: 't1' });
    catUpdate.mockResolvedValue({ id: 'c1', name: 'Bus', color: '#000', icon: '🚗' });
    catDelete.mockResolvedValue(undefined);
  });

  test('loads the whole month in a single request, starting at the current period', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
    expect(monthGet).toHaveBeenCalledTimes(1);
    expect(monthGet).toHaveBeenCalledWith(2026, 3);
    expect(screen.getByTestId('period').textContent).toBe('2026-3');
    expect(screen.getByTestId('carryover').textContent).toBe('100');
    expect(screen.getByTestId('available').textContent).toBe('590');
    expect(screen.getByTestId('budgets').textContent).toBe('1');
    expect(screen.getByTestId('range').textContent).toBe('2026-03-01|2026-03-28');
    expect(screen.getByTestId('current').textContent).toBe('true');
    await waitFor(() => expect(screen.getByTestId('accounts').textContent).toBe('1'));
  });

  test('shows API errors', async () => {
    monthGet.mockRejectedValueOnce(new Error('Network fail'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Network fail'));
  });

  test('navigates back past 2026 and forward up to 12 months ahead', async () => {
    renderProvider();
    await waitFor(() => expect(monthGet).toHaveBeenCalledWith(2026, 3));

    fireEvent.click(screen.getByText('goto-2019'));
    await waitFor(() => expect(screen.getByTestId('period').textContent).toBe('2019-6'));

    fireEvent.click(screen.getByText('goto-horizon'));
    await waitFor(() => expect(screen.getByTestId('period').textContent).toBe('2027-3'));
    expect(screen.getByTestId('next-disabled').textContent).toBe('true');
    fireEvent.click(screen.getByText('next'));
    fireEvent.click(screen.getByText('goto-beyond'));
    expect(screen.getByTestId('period').textContent).toBe('2027-3');

    fireEvent.click(screen.getByText('current'));
    await waitFor(() => expect(screen.getByTestId('period').textContent).toBe('2026-3'));
  });

  test('prev / next move one month', async () => {
    renderProvider();
    await waitFor(() => expect(monthGet).toHaveBeenCalledWith(2026, 3));
    fireEvent.click(screen.getByText('prev'));
    await waitFor(() => expect(monthGet).toHaveBeenCalledWith(2026, 2));
    fireEvent.click(screen.getByText('next'));
    fireEvent.click(screen.getByText('next'));
    await waitFor(() => expect(monthGet).toHaveBeenCalledWith(2026, 4));
  });

  test('every mutation drops all cached months (other months may change too)', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
    fireEvent.click(screen.getByText('next'));
    await waitFor(() => expect(monthGet).toHaveBeenCalledWith(2026, 4));
    fireEvent.click(screen.getByText('prev'));
    await waitFor(() => expect(screen.getByTestId('period').textContent).toBe('2026-3'));

    monthGet.mockClear();
    fireEvent.click(screen.getByText('add-tx'));
    await waitFor(() => expect(txCreate).toHaveBeenCalled());
    await waitFor(() => expect(monthGet).toHaveBeenCalledWith(2026, 3));
    expect(accGetAll).toHaveBeenCalledTimes(2);

    // April was cached before the mutation: it must be fetched again.
    monthGet.mockClear();
    fireEvent.click(screen.getByText('next'));
    await waitFor(() => expect(monthGet).toHaveBeenCalledWith(2026, 4));
  });

  test('removeTransaction deletes and reloads', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
    fireEvent.click(screen.getByText('del-tx'));
    await waitFor(() => expect(txDelete).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(monthGet).toHaveBeenCalledTimes(2));
  });

  test('patchTransaction updates the notes in place without reloading', async () => {
    txPatch.mockResolvedValue({ ...overview(2026, 3).transactions[0], notes: 'Patched note' });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
    fireEvent.click(screen.getByText('patch-notes'));
    await waitFor(() => expect(screen.getByTestId('tx-notes').textContent).toBe('Patched note'));
    expect(monthGet).toHaveBeenCalledTimes(1);
  });

  test('renaming or deleting a category with reassignment reloads the month', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
    fireEvent.click(screen.getByText('rename-cat'));
    await waitFor(() => expect(catUpdate).toHaveBeenCalledWith('c1', { name: 'Bus' }));
    await waitFor(() => expect(monthGet).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByText('del-cat'));
    await waitFor(() => expect(catDelete).toHaveBeenCalledWith('c1', 'c2'));
    await waitFor(() => expect(monthGet).toHaveBeenCalledTimes(3));
  });

  test('without settings it falls back to the calendar month', async () => {
    useOptionalSettings.mockReturnValue(null);
    const now = new Date();
    renderProvider();
    await waitFor(() =>
      expect(monthGet).toHaveBeenCalledWith(now.getFullYear(), now.getMonth() + 1)
    );
  });

  test('useFinances throws outside the provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Consumer />)).toThrow(
      'useFinances must be used within a FinancesProvider'
    );
    spy.mockRestore();
  });
});
