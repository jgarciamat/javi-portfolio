import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAnnualSummary } from '../../modules/finances/application/hooks/useAnnualSummary';

const mockGetAnnual = jest.fn();

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: () => ({ token: 'tok-test' }),
}));

jest.mock('@core/context/ApiContext', () => ({
    useApi: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useApi } = require('@core/context/ApiContext') as { useApi: jest.Mock };

function TestComponent({ year = 2025 }: { year?: number }) {
    const { data, loading, error, refresh } = useAnnualSummary(year);
    return (
        <div>
            <div data-testid="loading">{String(loading)}</div>
            <div data-testid="error">{error ?? ''}</div>
            <div data-testid="months">{data ? Object.keys(data.months).length : 'no'}</div>
            <button onClick={refresh}>refresh</button>
        </div>
    );
}

describe('useAnnualSummary', () => {
    const stableTransactionApi = { getAnnual: mockGetAnnual };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAnnual.mockResolvedValue({
            year: 2025,
            months: { 1: { income: 1000, expenses: 400, saving: 100, balance: 500 } },
        });
        useApi.mockReturnValue({ transactionApi: stableTransactionApi });
    });

    test('fetches annual data on mount', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('months').textContent).toBe('1'));
        expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    test('shows error when fetch fails', async () => {
        mockGetAnnual.mockRejectedValueOnce(new Error('Annual fail'));
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Annual fail'));
    });

    test('shows generic error for non-Error rejection', async () => {
        mockGetAnnual.mockRejectedValueOnce('boom');
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Error al cargar resumen anual'));
    });

    test('refresh re-fetches data', async () => {
        render(<TestComponent />);
        await waitFor(() => expect(screen.getByTestId('months').textContent).toBe('1'));
        fireEvent.click(screen.getByText('refresh'));
        await waitFor(() => expect(mockGetAnnual).toHaveBeenCalledTimes(2));
    });
});
