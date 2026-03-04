import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetAlerts } from '@modules/finances/ui/components/BudgetAlerts';
import type { FinancialSummary } from '@modules/finances/domain/types';

// BudgetAlerts does NOT use i18n directly — no need to mock useI18n

const baseSummary: FinancialSummary = {
    balance: 20,
    totalIncome: 400,
    totalExpenses: 380,
    totalSaving: 0,
    transactionCount: 5,
    expensesByCategory: {},
    incomeByCategory: {},
    savingByCategory: {},
};

describe('BudgetAlerts', () => {
    test('renders nothing when summary is null', () => {
        const { container } = render(<BudgetAlerts summary={null} carryover={null} />);
        expect(container.firstChild).toBeNull();
    });

    test('renders nothing when there are no alerts (expenses < 80%)', () => {
        const lowExpenses: FinancialSummary = { ...baseSummary, totalExpenses: 200 };
        const { container } = render(<BudgetAlerts summary={lowExpenses} carryover={0} />);
        expect(container.firstChild).toBeNull();
    });

    test('renders a warning alert at 95% spending', () => {
        // 400 income, 380 expenses → 95% → warning
        render(<BudgetAlerts summary={baseSummary} carryover={0} />);
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts[0]).toHaveClass('alert-card--warning');
    });

    test('renders a danger alert when expenses exceed available', () => {
        const overBudget: FinancialSummary = { ...baseSummary, totalExpenses: 450 };
        render(<BudgetAlerts summary={overBudget} carryover={0} />);
        const alerts = screen.getAllByRole('alert');
        expect(alerts[0]).toHaveClass('alert-card--danger');
    });

    test('shows "Te quedan" with correct remaining amount for warning', () => {
        // 400 income, 380 expenses → remaining = 20
        render(<BudgetAlerts summary={baseSummary} carryover={0} />);
        expect(screen.getByText('20.00€')).toBeInTheDocument();
        expect(screen.getByText(/Te quedan:/i)).toBeInTheDocument();
    });

    test('shows "Te pasas" with correct overspend amount for danger', () => {
        // 400 income, 450 expenses → overspend = 50
        const overBudget: FinancialSummary = { ...baseSummary, totalExpenses: 450 };
        render(<BudgetAlerts summary={overBudget} carryover={0} />);
        expect(screen.getByText(/Te pasas:/i)).toBeInTheDocument();
        expect(screen.getByText('50.00€')).toBeInTheDocument();
    });

    test('renders a dismiss button (✕) per alert', () => {
        render(<BudgetAlerts summary={baseSummary} carryover={0} />);
        const dismissButtons = screen.getAllByLabelText('Cerrar alerta');
        expect(dismissButtons.length).toBeGreaterThan(0);
    });

    test('hides alert after clicking dismiss button', () => {
        render(<BudgetAlerts summary={baseSummary} carryover={0} />);
        const dismissBtn = screen.getAllByLabelText('Cerrar alerta')[0];
        fireEvent.click(dismissBtn);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    test('shows spent amount in the card', () => {
        // 380 expenses → shows "380.00€"
        render(<BudgetAlerts summary={baseSummary} carryover={0} />);
        expect(screen.getByText('380.00€')).toBeInTheDocument();
    });

    test('counts carryover into available budget', () => {
        // 200 carryover + 200 income = 400 available; 380 expenses → 95%
        const lowIncome: FinancialSummary = { ...baseSummary, totalIncome: 200, totalExpenses: 380 };
        render(<BudgetAlerts summary={lowIncome} carryover={200} />);
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
    });

    test('shows category alert when category exceeds 30% of available', () => {
        // 400 available, Comida = 160 → 40% → danger
        const withCat: FinancialSummary = {
            ...baseSummary,
            totalExpenses: 160,
            expensesByCategory: { Comida: 160 },
        };
        render(<BudgetAlerts summary={withCat} carryover={0} />);
        expect(screen.getByText(/"Comida"/)).toBeInTheDocument();
        // Category alerts do not show "Te pasas / Te quedan" — no remainingAmount
        expect(screen.queryByText(/Te pasas:/i)).toBeNull();
        expect(screen.queryByText(/Te quedan:/i)).toBeNull();
    });
});
