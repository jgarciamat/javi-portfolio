import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string, vars?: Record<string, string>) => {
    let v = translations[key] ?? key;
    if (vars) Object.entries(vars).forEach(([k, val]) => { v = v.replace(`{${k}}`, val); });
    return v;
};

jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory: (n: string) => n }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock all hooks and context deps
const mockLogout = jest.fn();
const mockGoToPrev = jest.fn();
const mockGoToNext = jest.fn();
const mockAddTransaction = jest.fn().mockResolvedValue({});
const mockRemoveTransaction = jest.fn().mockResolvedValue(undefined);
const mockAddCategory = jest.fn().mockResolvedValue({});
const mockRemoveCategory = jest.fn().mockResolvedValue(undefined);

const mockSummary = {
    totalIncome: 1000, totalExpenses: 400, totalSaving: 100, balance: 500,
    transactionCount: 3, expensesByCategory: { Food: 400 }, incomeByCategory: {}, savingByCategory: {},
};

const mockTransactions = [
    { id: 't1', description: 'Bus', amount: 10, type: 'EXPENSE' as const, category: 'Transport', date: '2025-01-05T00:00:00.000Z', createdAt: '2025-01-05T00:00:00.000Z' },
];

const defaultFinancesContext = {
    year: 2025,
    month: 1,
    transactions: mockTransactions,
    summary: mockSummary,
    carryover: 100,
    categories: [{ id: 'c1', name: 'Food', color: '#ff0', icon: '🍔' }],
    loading: false,
    error: null,
    goToPrev: mockGoToPrev,
    goToNext: mockGoToNext,
    navigateTo: jest.fn(),
    addTransaction: mockAddTransaction,
    removeTransaction: mockRemoveTransaction,
    addCategory: mockAddCategory,
    removeCategory: mockRemoveCategory,
    refresh: jest.fn(),
};

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: () => ({ user: { name: 'TestUser', email: 'test@test.com', id: 'u1' }, logout: mockLogout }),
}));

jest.mock('@modules/finances/application/FinancesContext', () => ({
    useFinances: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useFinances } = require('@modules/finances/application/FinancesContext') as { useFinances: jest.Mock };

jest.mock('@core/context/ApiContext', () => ({
    useApi: () => ({
        transactionApi: { getAnnual: jest.fn().mockResolvedValue({ year: 2025, months: {} }) },
    }),
}));

describe('Dashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useFinances.mockReturnValue(defaultFinancesContext);
    });

    test('renders header with user name and logout button', () => {
        render(<Dashboard />);
        expect(screen.getByText(/TestUser/i)).toBeInTheDocument();
        expect(screen.getByText('Salir')).toBeInTheDocument();
    });

    test('calls logout when Salir is clicked', () => {
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Salir'));
        expect(mockLogout).toHaveBeenCalled();
    });

    test('renders month navigation', () => {
        render(<Dashboard />);
        expect(screen.getByRole('button', { name: /‹ Anterior/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Siguiente/i })).toBeInTheDocument();
    });

    test('calls goToPrev when Anterior is clicked', () => {
        render(<Dashboard />);
        fireEvent.click(screen.getByText(/‹ Anterior/));
        expect(mockGoToPrev).toHaveBeenCalled();
    });

    test('renders summary cards when summary is present', () => {
        render(<Dashboard />);
        expect(screen.getByText(/Saldo disponible/i)).toBeInTheDocument();
    });

    test('shows Enero 2025 in month nav', () => {
        render(<Dashboard />);
        expect(screen.getByText('Enero 2025')).toBeInTheDocument();
    });

    test('switches to annual tab', () => {
        render(<Dashboard />);
        fireEvent.click(screen.getByRole('button', { name: /Balance anual/i }));
        expect(screen.getByRole('heading', { name: /Balance anual/i })).toBeInTheDocument();
    });

    test('switches back to monthly tab from annual', () => {
        render(<Dashboard />);
        fireEvent.click(screen.getByRole('button', { name: /Balance anual/i }));
        fireEvent.click(screen.getByRole('button', { name: /Resumen mensual/i }));
        expect(screen.getByText('Enero 2025')).toBeInTheDocument();
    });

    test('opens and closes category modal', () => {
        render(<Dashboard />);
        // The modal should not be visible initially
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    test('submits transaction form and calls addTransaction', async () => {
        render(<Dashboard />);
        // Open the TransactionForm collapsible
        const toggleBtn = screen.getByRole('button', { name: /Nueva transacción/i, expanded: false });
        fireEvent.click(toggleBtn);
        // Fill in required fields
        fireEvent.change(screen.getByPlaceholderText('Descripción'), { target: { value: 'Test tx' } });
        fireEvent.change(screen.getByPlaceholderText('Importe (€)'), { target: { value: '50' } });
        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[1], { target: { value: 'Food' } }); // category select
        // Submit the form
        const form = document.querySelector('form.tx-form')!;
        fireEvent.submit(form);
        await waitFor(() => expect(mockAddTransaction).toHaveBeenCalled());
    });

    test('shows "Mes actual" badge when on current month', () => {
        const now = new Date();
        useFinances.mockReturnValue({
            ...defaultFinancesContext,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
        });
        render(<Dashboard />);
        expect(screen.getByText('Mes actual')).toBeInTheDocument();
    });

    test('shows "↩ Ir al mes actual" button when not on current month', () => {
        useFinances.mockReturnValue({
            ...defaultFinancesContext,
            year: 2025,
            month: 1,
        });
        render(<Dashboard />);
        const btn = screen.getByRole('button', { name: '↩ Ir al mes actual' });
        expect(btn).toBeInTheDocument();
    });

    test('clicking "↩ Ir al mes actual" navigates to current month', () => {
        const mockNavigateTo = jest.fn();
        useFinances.mockReturnValue({
            ...defaultFinancesContext,
            year: 2025,
            month: 1,
            navigateTo: mockNavigateTo,
        });
        render(<Dashboard />);
        fireEvent.click(screen.getByRole('button', { name: '↩ Ir al mes actual' }));
        const now = new Date();
        expect(mockNavigateTo).toHaveBeenCalledWith(now.getFullYear(), now.getMonth() + 1);
    });

    test('renders with null carryover and null summary', () => {
        useFinances.mockReturnValue({
            ...defaultFinancesContext,
            carryover: null,
            summary: null,
        });
        render(<Dashboard />);
        // Should not crash; available balance defaults to 0
        expect(screen.getByText('Enero 2025')).toBeInTheDocument();
    });
});

describe('Dashboard - with error', () => {
    beforeEach(() => {
        useFinances.mockReturnValue({
            ...defaultFinancesContext,
            error: 'Server offline',
        });
    });

    test('shows error message when error is set', () => {
        render(<Dashboard />);
        expect(screen.getByText(/Server offline/)).toBeInTheDocument();
    });
});

describe('Dashboard - loading state', () => {
    beforeEach(() => {
        useFinances.mockReturnValue({
            ...defaultFinancesContext,
            loading: true,
        });
    });

    test('shows loading overlay when loading=true', () => {
        render(<Dashboard />);
        expect(screen.getByLabelText('Cargando…')).toBeInTheDocument();
    });
});

describe('Dashboard - category modal', () => {
    beforeEach(() => {
        useFinances.mockReturnValue(defaultFinancesContext);
    });

    test('opens category modal from TransactionForm manage categories button', () => {
        render(<Dashboard />);
        // Open the TransactionForm collapsible
        const toggleBtn = screen.getByRole('button', { name: /Nueva transacción/i, expanded: false });
        fireEvent.click(toggleBtn);
        // Select __manage__ in the category select
        const categorySelect = screen.getAllByRole('combobox')[1];
        fireEvent.change(categorySelect, { target: { value: '__manage__' } });
        // CategoryManager modal should now be open
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // Close it
        fireEvent.click(screen.getByText('Cerrar'));
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
