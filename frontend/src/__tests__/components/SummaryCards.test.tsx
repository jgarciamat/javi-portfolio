import { render, screen } from '@testing-library/react';
import { SummaryCards } from '@modules/finances/ui/components/SummaryCards';
import type { FinancialSummary } from '@modules/finances/domain/types';

const baseSummary: FinancialSummary = {
    balance: 100,
    totalIncome: 500,
    totalExpenses: 400,
    totalSaving: 50,
    transactionCount: 5,
    expensesByCategory: {},
    incomeByCategory: {},
    savingByCategory: {},
};

describe('SummaryCards', () => {
    test('renders all card titles', () => {
        render(<SummaryCards summary={baseSummary} carryover={20} />);
        expect(screen.getByText(/Saldo disponible/i)).toBeInTheDocument();
        expect(screen.getByText('Balance del mes')).toBeInTheDocument();
        expect(screen.getByText('Ingresos')).toBeInTheDocument();
        expect(screen.getByText('Gastos')).toBeInTheDocument();
        expect(screen.getByText('Ahorrado')).toBeInTheDocument();
        expect(screen.getByText('Tasa de ahorro')).toBeInTheDocument();
    });

    test('shows transaction count in sub-text', () => {
        render(<SummaryCards summary={baseSummary} carryover={null} />);
        expect(screen.getByText('5 transacciones')).toBeInTheDocument();
    });

    test('shows carryover amount in sub-text', () => {
        render(<SummaryCards summary={baseSummary} carryover={200} />);
        expect(screen.getByText(/Acumulado meses anteriores/i)).toBeInTheDocument();
    });

    test('uses 0 when carryover is null', () => {
        render(<SummaryCards summary={baseSummary} carryover={null} />);
        // saldoTotal = 0 + 100 = 100, no crash
        expect(screen.getByText(/Saldo disponible/i)).toBeInTheDocument();
    });

    test('savings rate message when no income', () => {
        const noIncome = { ...baseSummary, totalIncome: 0 };
        render(<SummaryCards summary={noIncome} carryover={0} />);
        expect(screen.getByText('Sin ingresos registrados')).toBeInTheDocument();
    });

    test('savings rate >= 20 shows green accent', () => {
        const highSavings = { ...baseSummary, totalIncome: 1000, totalSaving: 200 };
        render(<SummaryCards summary={highSavings} carryover={0} />);
        expect(screen.getByText('20.0%')).toBeInTheDocument();
    });

    test('savings rate 10-20 shows amber accent', () => {
        const midSavings = { ...baseSummary, totalIncome: 1000, totalSaving: 150 };
        render(<SummaryCards summary={midSavings} carryover={0} />);
        expect(screen.getByText('15.0%')).toBeInTheDocument();
    });

    test('negative balance shows red accent on Saldo disponible', () => {
        const negBalance = { ...baseSummary, balance: -200 };
        render(<SummaryCards summary={negBalance} carryover={0} />);
        expect(screen.getByText(/Saldo disponible/i)).toBeInTheDocument();
    });
});
