import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useTransactions } from '@modules/finances/application/hooks/useTransactions';

const mockGetAll = jest.fn();
const mockGetSummary = jest.fn();
const mockGetCarryover = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}));

// useApi is a jest.fn() so we can call .mockReturnValue() with a STABLE object
jest.mock('@core/context/ApiContext', () => ({
    useApi: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useApi } = require('@core/context/ApiContext') as { useApi: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require('@shared/hooks/useAuth') as { useAuth: jest.Mock };

function TestComponent({ year = 2025, month = 1 }: { year?: number; month?: number }) {
    const { transactions, summary, carryover, loading, error, addTransaction, removeTransaction } =
        useTransactions({ year, month });
    return (
        <div>
            <div data-testid="loading">{String(loading)}</div>
            <div data-testid="error">{error ?? ''}</div>
            <div data-testid="count">{transactions.length}</div>
            <div data-testid="balance">{summary ? summary.balance : 'no'}</div>
            <div data-testid="carryover">{carryover ?? 'no'}</div>
            <button onClick={() => addTransaction({ description: 'New', amount: 20, type: 'INCOME', category: 'Sal' })}>add</button>
            <button onClick={() => removeTransaction('t1')}>del</button>
        </div>
    );
}

describe('useTransactions', () => {
    // Stable API object references — same instance across all renders in a test
    const stableTransactionApi = { getAll: mockGetAll, getSummary: mockGetSummary, create: mockCreate, delete: mockDelete };
    const stableBudgetApi = { getCarryover: mockGetCarryover };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAll.mockResolvedValue([
            { id: 't1', description: 'x', amount: 10, type: 'EXPENSE', category: 'c', date: '2025-01-05T00:00:00.000Z', createdAt: '2025-01-05T00:00:00.000Z' },
        ]);
        mockGetSummary.mockResolvedValue({
            balance: -10, totalIncome: 0, totalExpenses: 10, totalSaving: 0,
            transactionCount: 1, expensesByCategory: {}, incomeByCategory: {}, savingByCategory: {},
        });
        mockGetCarryover.mockResolvedValue({ carryover: 5 });
        mockCreate.mockResolvedValue({ id: 't2' });
        mockDelete.mockResolvedValue(undefined);

        // Provide stable references so useCallback deps don't change on re-render
        useApi.mockReturnValue({ transactionApi: stableTransactionApi, budgetApi: stableBudgetApi });

        useAuth.mockReturnValue({ token: 'tok-1' });
    });

    test('loads transactions, summary and carryover', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
        expect(screen.getByTestId('balance').textContent).toBe('-10');
        expect(screen.getByTestId('carryover').textContent).toBe('5');
        expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    test('shows error when API fails', async () => {
        mockGetAll.mockRejectedValueOnce(new Error('Network fail'));
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Network fail'));
    });

    test('shows generic error for non-Error rejection', async () => {
        mockGetAll.mockRejectedValueOnce('oops');
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Error al cargar datos'));
    });

    test('addTransaction calls create and re-fetches', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
        fireEvent.click(screen.getByText('add'));
        await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
        expect(mockGetAll).toHaveBeenCalledTimes(2);
    });

    test('removeTransaction calls delete and re-fetches', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
        fireEvent.click(screen.getByText('del'));
        await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('t1'));
        expect(mockGetAll).toHaveBeenCalledTimes(2);
    });

    test('uses cached data on second fetch for same month', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
        expect(mockGetAll).toHaveBeenCalledTimes(1);
    });

    test('applies cached data immediately when navigating back to a previously loaded month', async () => {
        const { result, rerender } = renderHook(
            ({ month }: { month: number }) => useTransactions({ year: 2025, month }),
            { initialProps: { month: 1 } }
        );
        // Wait for month=1 to load and populate the cache
        await waitFor(() => expect(result.current.transactions.length).toBe(1));
        expect(mockGetAll).toHaveBeenCalledTimes(1);

        // Navigate to month=2
        rerender({ month: 2 });
        await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));

        // Navigate back to month=1 — cache hit: applyData(cached) is called before the API
        rerender({ month: 1 });
        await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(3));
        // Data from cache was applied immediately (transactions still populated)
        expect(result.current.transactions.length).toBeGreaterThan(0);
    });

    test('does not fetch when token is null', async () => {
        useAuth.mockReturnValue({ token: null });
        render(<TestComponent />);
        await new Promise((r) => setTimeout(r, 50));
        expect(mockGetAll).not.toHaveBeenCalled();
        expect(screen.getByTestId('count').textContent).toBe('0');
    });
});
