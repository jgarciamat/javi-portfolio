import { render, screen } from '@testing-library/react';
import { CategoryChart } from '@modules/finances/ui/components/CategoryChart';
import type { FinancialSummary } from '@modules/finances/domain/types';

const summary: FinancialSummary = {
    totalIncome: 500,
    totalExpenses: 200,
    totalSaving: 100,
    balance: 200,
    transactionCount: 5,
    expensesByCategory: { Food: 150, Transport: 50 },
    incomeByCategory: { Salary: 500 },
    savingByCategory: { Savings: 100 },
};

const emptySummary: FinancialSummary = {
    totalIncome: 0, totalExpenses: 0, totalSaving: 0, balance: 0, transactionCount: 0,
    expensesByCategory: {}, incomeByCategory: {}, savingByCategory: {},
};

describe('CategoryChart', () => {
    test('renders expense categories with percentages', () => {
        render(<CategoryChart summary={summary} />);
        expect(screen.getByText('Food')).toBeInTheDocument();
        expect(screen.getByText('Transport')).toBeInTheDocument();
        // Check titles
        expect(screen.getByText('Gastos por categoría')).toBeInTheDocument();
    });

    test('renders income categories', () => {
        render(<CategoryChart summary={summary} />);
        expect(screen.getByText('Salary')).toBeInTheDocument();
        expect(screen.getByText('Ingresos por categoría')).toBeInTheDocument();
    });

    test('renders saving categories', () => {
        render(<CategoryChart summary={summary} />);
        expect(screen.getByText('Savings')).toBeInTheDocument();
        expect(screen.getByText('Ahorros por categoría')).toBeInTheDocument();
    });

    test('renders nothing (no chart titles) when all categories empty', () => {
        render(<CategoryChart summary={emptySummary} />);
        expect(screen.queryByText('Gastos por categoría')).toBeNull();
        expect(screen.queryByText('Ingresos por categoría')).toBeNull();
    });

    test('shows 0% percentage when total is zero', () => {
        const onlyExpenses: FinancialSummary = {
            ...emptySummary,
            totalExpenses: 0,
            expensesByCategory: { Food: 0 },
        };
        render(<CategoryChart summary={onlyExpenses} />);
        expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
    });
});
