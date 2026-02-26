import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Update the import path below to the correct relative path for your project structure.
// For example, if FinancesContext.tsx is at src/modules/finances/application/FinancesContext.tsx:
import { FinancesProvider, useFinances } from '../../modules/finances/application/FinancesContext';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetAll = jest.fn();
const mockGetSummary = jest.fn();
const mockGetCarryover = jest.fn();
const mockCreateTx = jest.fn();
const mockDeleteTx = jest.fn();
const mockGetAllCats = jest.fn();
const mockCreateCat = jest.fn();
const mockDeleteCat = jest.fn();

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}));

// useApi is a jest.fn() so we can call mockReturnValue with stable objects
jest.mock('@core/context/ApiContext', () => ({
    useApi: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useApi } = require('@core/context/ApiContext') as { useApi: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require('@shared/hooks/useAuth') as { useAuth: jest.Mock };

// ── Helper component ──────────────────────────────────────────────────────────

function Consumer() {
    const ctx = useFinances();
    return (
        <div>
            <div data-testid="year">{ctx.year}</div>
            <div data-testid="month">{ctx.month}</div>
            <div data-testid="tx-count">{ctx.transactions.length}</div>
            <div data-testid="cat-count">{ctx.categories.length}</div>
            <div data-testid="loading">{String(ctx.loading)}</div>
            <div data-testid="error">{ctx.error ?? ''}</div>
            <div data-testid="carryover">{ctx.carryover ?? 'null'}</div>
            <div data-testid="balance">{ctx.summary?.balance ?? 'null'}</div>
            <button onClick={ctx.goToPrev}>prev</button>
            <button onClick={ctx.goToNext}>next</button>
            <button onClick={() => ctx.addTransaction({ description: 'New', amount: 50, type: 'INCOME', category: 'Salary' })}>add-tx</button>
            <button onClick={() => ctx.removeTransaction('t1')}>del-tx</button>
            <button onClick={() => ctx.addCategory({ name: 'Food', icon: '🍔' })}>add-cat</button>
            <button onClick={() => ctx.removeCategory('c1')}>del-cat</button>
            <button onClick={ctx.refresh}>refresh</button>
        </div>
    );
}

function Wrapper() {
    return (
        <FinancesProvider>
            <Consumer />
        </FinancesProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FinancesContext / FinancesProvider', () => {
    // Stable API object references — same instance across all renders in a test
    const stableTransactionApi = { getAll: mockGetAll, getSummary: mockGetSummary, create: mockCreateTx, delete: mockDeleteTx };
    const stableCategoryApi = { getAll: mockGetAllCats, create: mockCreateCat, delete: mockDeleteCat };
    const stableBudgetApi = { getCarryover: mockGetCarryover };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAll.mockResolvedValue([{ id: 't1', description: 'Bus', amount: 10, type: 'EXPENSE', category: 'Transport', date: '2025-01-05', createdAt: '2025-01-05' }]);
        mockGetSummary.mockResolvedValue({ totalIncome: 500, totalExpenses: 10, totalSaving: 0, balance: 490, expensesByCategory: {}, incomeByCategory: {}, savingByCategory: {}, transactionCount: 1 });
        mockGetCarryover.mockResolvedValue({ carryover: 100, year: 2025, month: 1 });
        mockGetAllCats.mockResolvedValue([{ id: 'c1', name: 'Transport', color: '#ff0000', icon: '🚗' }]);
        mockCreateTx.mockResolvedValue({ id: 't2', description: 'New', amount: 50, type: 'INCOME', category: 'Salary', date: '2025-01-10', createdAt: '2025-01-10' });
        mockDeleteTx.mockResolvedValue(undefined);
        mockCreateCat.mockResolvedValue({ id: 'c2', name: 'Food', color: '#00ff00', icon: '🍔' });
        mockDeleteCat.mockResolvedValue(undefined);

        useApi.mockReturnValue({
            transactionApi: stableTransactionApi,
            categoryApi: stableCategoryApi,
            budgetApi: stableBudgetApi,
        });

        useAuth.mockReturnValue({ token: 'tok-test', user: { name: 'Tester' } });
    });

    test('loads transactions, summary and categories on mount', async () => {
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
        expect(screen.getByTestId('balance').textContent).toBe('490');
        expect(screen.getByTestId('carryover').textContent).toBe('100');
        await waitFor(() => expect(screen.getByTestId('cat-count').textContent).toBe('1'));
    });

    test('goToPrev decrements month', async () => {
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
        const initialMonth = parseInt(screen.getByTestId('month').textContent ?? '0', 10);
        fireEvent.click(screen.getByText('prev'));
        const newMonth = parseInt(screen.getByTestId('month').textContent ?? '0', 10);
        if (initialMonth === 1) {
            expect(newMonth).toBe(12);
        } else {
            expect(newMonth).toBe(initialMonth - 1);
        }
    });

    test('goToNext increments month', async () => {
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
        const initialMonth = parseInt(screen.getByTestId('month').textContent ?? '0', 10);
        fireEvent.click(screen.getByText('next'));
        const newMonth = parseInt(screen.getByTestId('month').textContent ?? '0', 10);
        if (initialMonth === 12) {
            expect(newMonth).toBe(1);
        } else {
            expect(newMonth).toBe(initialMonth + 1);
        }
    });

    test('addTransaction calls API and refreshes', async () => {
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
        fireEvent.click(screen.getByText('add-tx'));
        await waitFor(() => expect(mockCreateTx).toHaveBeenCalledTimes(1));
        expect(mockGetAll).toHaveBeenCalledTimes(2); // initial + after add
    });

    test('removeTransaction calls API and refreshes', async () => {
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
        fireEvent.click(screen.getByText('del-tx'));
        await waitFor(() => expect(mockDeleteTx).toHaveBeenCalledWith('t1'));
    });

    test('addCategory adds and sorts categories', async () => {
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('cat-count').textContent).toBe('1'));
        fireEvent.click(screen.getByText('add-cat'));
        await waitFor(() => expect(screen.getByTestId('cat-count').textContent).toBe('2'));
    });

    test('removeCategory removes from list', async () => {
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('cat-count').textContent).toBe('1'));
        fireEvent.click(screen.getByText('del-cat'));
        await waitFor(() => expect(screen.getByTestId('cat-count').textContent).toBe('0'));
    });

    test('shows error when fetchMonth fails', async () => {
        mockGetAll.mockRejectedValueOnce(new Error('Network error'));
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Network error'));
    });

    test('shows generic error string when non-Error thrown', async () => {
        mockGetAll.mockRejectedValueOnce('something bad');
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Error al cargar datos'));
    });

    test('fetchCategories silently on error', async () => {
        mockGetAllCats.mockRejectedValueOnce(new Error('cats fail'));
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('cat-count').textContent).toBe('0'));
    });

    test('refresh re-fetches data', async () => {
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
        fireEvent.click(screen.getByText('refresh'));
        await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));
    });

    test('goToPrev wraps year when month is January', async () => {
        // Navigate to January by going prev until month=1, then verify year wraps
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
        // Click prev until we reach month 1
        let currentMonth = parseInt(screen.getByTestId('month').textContent ?? '6', 10);
        // Navigate backwards until month === 1
        while (currentMonth > 1) {
            fireEvent.click(screen.getByText('prev'));
            await waitFor(() => {
                currentMonth = parseInt(screen.getByTestId('month').textContent ?? '1', 10);
            });
        }
        // Now we're at month=1, one more prev should go to December of previous year
        const yearBeforeWrap = parseInt(screen.getByTestId('year').textContent ?? '2025', 10);
        fireEvent.click(screen.getByText('prev'));
        await waitFor(() => expect(screen.getByTestId('month').textContent).toBe('12'));
        expect(parseInt(screen.getByTestId('year').textContent ?? '0', 10)).toBe(yearBeforeWrap - 1);
    });

    test('goToNext wraps year when month is December', async () => {
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
        // Navigate forward to December
        let currentMonth = parseInt(screen.getByTestId('month').textContent ?? '6', 10);
        while (currentMonth < 12) {
            fireEvent.click(screen.getByText('next'));
            await waitFor(() => {
                currentMonth = parseInt(screen.getByTestId('month').textContent ?? '12', 10);
            });
        }
        // Now at month=12, one more next should go to January of next year
        const yearBeforeWrap = parseInt(screen.getByTestId('year').textContent ?? '2025', 10);
        fireEvent.click(screen.getByText('next'));
        await waitFor(() => expect(screen.getByTestId('month').textContent).toBe('1'));
        expect(parseInt(screen.getByTestId('year').textContent ?? '0', 10)).toBe(yearBeforeWrap + 1);
    });

    test('useFinances throws when used outside FinancesProvider', () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
        function Bare() { useFinances(); return null; }
        expect(() => render(<Bare />)).toThrow('useFinances must be used within a FinancesProvider');
        consoleError.mockRestore();
    });

    test('fetchCategories does not fetch when token is null', async () => {
        useAuth.mockReturnValue({ token: null, user: null });
        render(<Wrapper />);
        await new Promise((r) => setTimeout(r, 50));
        expect(mockGetAllCats).not.toHaveBeenCalled();
    });

    test('fetchCategories sorts categories alphabetically', async () => {
        // Provide multiple categories out of order to trigger the sort comparator
        mockGetAllCats.mockResolvedValueOnce([
            { id: 'c2', name: 'Zucchini', color: '#0000ff', icon: '🥒' },
            { id: 'c1', name: 'Apple', color: '#ff0000', icon: '🍎' },
            { id: 'c3', name: 'Mango', color: '#00ff00', icon: '🥭' },
        ]);
        render(<Wrapper />);
        await waitFor(() => expect(screen.getByTestId('cat-count').textContent).toBe('3'));
    });

    test('applies cached data immediately on second visit to same month', async () => {
        render(<Wrapper />);
        // Wait for initial month data to load (populates cache)
        await waitFor(() => expect(screen.getByTestId('tx-count').textContent).toBe('1'));
        expect(mockGetAll).toHaveBeenCalledTimes(1);

        // Navigate to next month
        fireEvent.click(screen.getByText('next'));
        await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));

        // Navigate back to original month — cache hit, applyMonthData(cached) is called
        fireEvent.click(screen.getByText('prev'));
        await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(3));
        // Transactions are still visible (applied from cache before re-fetch)
        expect(screen.getByTestId('tx-count').textContent).toBe('1');
    });
});
