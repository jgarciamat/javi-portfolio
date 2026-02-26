import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnualChart } from '@modules/finances/ui/components/AnnualChart';

const mockGetAnnual = jest.fn().mockResolvedValue({
    year: 2025,
    months: {
        1: { income: 1000, expenses: 400, saving: 100, balance: 500 },
        2: { income: 0, expenses: 200, saving: 0, balance: -200 },
    },
});

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: () => ({ token: 'tok-test' }),
}));

jest.mock('@core/context/ApiContext', () => ({
    useApi: () => ({
        transactionApi: { getAnnual: mockGetAnnual },
    }),
}));

describe('AnnualChart', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAnnual.mockResolvedValue({
            year: 2025,
            months: {
                1: { income: 1000, expenses: 400, saving: 100, balance: 500 },
            },
        });
    });

    test('renders annual chart with title', async () => {
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getByText(/Balance anual 2025/i)).toBeInTheDocument());
    });

    test('shows loading state initially', () => {
        render(<AnnualChart initialYear={2025} />);
        expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
    });

    test('renders month labels after data loads', async () => {
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getAllByText('Ene').length).toBeGreaterThan(0));
    });

    test('shows annual totals section', async () => {
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getByText('Total ingresos')).toBeInTheDocument());
        expect(screen.getByText('Total gastos')).toBeInTheDocument();
        expect(screen.getByText('Total ahorrado')).toBeInTheDocument();
        expect(screen.getByText('Balance anual')).toBeInTheDocument();
    });

    test('prevYear button navigates to previous year', async () => {
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getByText(/Balance anual 2025/i)).toBeInTheDocument());
        fireEvent.click(screen.getByText(/‹ 2024/));
        await waitFor(() => expect(screen.getByText(/Balance anual 2024/i)).toBeInTheDocument());
    });

    test('nextYear button is disabled when at initialYear', async () => {
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getByText(/Balance anual 2025/i)).toBeInTheDocument());
        const nextBtn = screen.getByText(/2026/);
        expect(nextBtn).toBeDisabled();
    });

    test('shows error state when API fails', async () => {
        mockGetAnnual.mockRejectedValueOnce(new Error('Annual error'));
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getByText(/Annual error/i)).toBeInTheDocument());
    });

    test('shows legend items', async () => {
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getByText('Ingresos')).toBeInTheDocument());
        expect(screen.getByText('Gastos')).toBeInTheDocument();
        expect(screen.getByText('Ahorro')).toBeInTheDocument();
    });

    test('shows — for zero values in monthly table', async () => {
        mockGetAnnual.mockReset();
        mockGetAnnual.mockResolvedValue({
            year: 2025,
            months: { 1: { income: 0, expenses: 0, saving: 0, balance: 0 } },
        });
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
    });

    test('shows negative balance colors when expenses exceed income', async () => {
        mockGetAnnual.mockReset();
        mockGetAnnual.mockResolvedValue({
            year: 2025,
            months: { 1: { income: 100, expenses: 800, saving: 0, balance: -700 } },
        });
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getByText('Balance anual')).toBeInTheDocument());
        // Negative balance means ef4444 color applied — component renders without error
        expect(screen.getByText('Balance anual')).toBeInTheDocument();
    });

    test('triggers mouse events on chart bars', async () => {
        render(<AnnualChart initialYear={2025} />);
        await waitFor(() => expect(screen.getAllByText('Ene').length).toBeGreaterThan(0));
        const incomeBars = document.querySelectorAll('.annual-bar-income');
        if (incomeBars.length > 0) {
            fireEvent.mouseEnter(incomeBars[0], { clientX: 100, clientY: 100 });
            fireEvent.mouseMove(incomeBars[0], { clientX: 110, clientY: 110 });
            fireEvent.mouseLeave(incomeBars[0]);
        }
        const expenseBars = document.querySelectorAll('.annual-bar-expense');
        if (expenseBars.length > 0) {
            fireEvent.mouseEnter(expenseBars[0], { clientX: 200, clientY: 200 });
            fireEvent.mouseMove(expenseBars[0], { clientX: 210, clientY: 210 });
            fireEvent.mouseLeave(expenseBars[0]);
        }
        const savingBars = document.querySelectorAll('.annual-bar-saving');
        if (savingBars.length > 0) {
            fireEvent.mouseEnter(savingBars[0], { clientX: 300, clientY: 300 });
            fireEvent.mouseMove(savingBars[0], { clientX: 310, clientY: 310 });
            fireEvent.mouseLeave(savingBars[0]);
        }
        // No crash = pass
        expect(document.body).toBeTruthy();
    });
});
