import { render, screen } from '@testing-library/react';
import { CategoryChart } from '@modules/finances/ui/components/CategoryChart';
import type { FinancialSummary } from '@modules/finances/domain/types';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;
const tCategory = (name: string) => {
    const key = `app.categories.${name.replace(/\s+/g, '')}`;
    return translations[key] ?? name;
};

jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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
        expect(screen.getByText(t('app.categoryChart.expenses'))).toBeInTheDocument();
    });

    test('renders income categories', () => {
        render(<CategoryChart summary={summary} />);
        expect(screen.getByText('Salary')).toBeInTheDocument();
        expect(screen.getByText(t('app.categoryChart.income'))).toBeInTheDocument();
    });

    test('renders saving categories', () => {
        render(<CategoryChart summary={summary} />);
        expect(screen.getByText('Savings')).toBeInTheDocument();
        expect(screen.getByText(t('app.categoryChart.saving'))).toBeInTheDocument();
    });

    test('renders nothing (no chart titles) when all categories empty', () => {
        render(<CategoryChart summary={emptySummary} />);
        expect(screen.queryByText(t('app.categoryChart.expenses'))).toBeNull();
        expect(screen.queryByText(t('app.categoryChart.income'))).toBeNull();
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
