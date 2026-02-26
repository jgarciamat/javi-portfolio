// ─── Finances domain types ────────────────────────────────────────────────────

export type TransactionType = 'INCOME' | 'EXPENSE' | 'SAVING';

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: TransactionType;
    category: string;
    date: string;
    createdAt: string;
}

export interface CreateTransactionDTO {
    description: string;
    amount: number;
    type: TransactionType;
    category: string;
    date?: string;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
}

export interface CreateCategoryDTO {
    name: string;
    icon: string;
    color?: string;
}

export interface FinancialSummary {
    totalIncome: number;
    totalExpenses: number;
    totalSaving: number;
    balance: number;
    expensesByCategory: Record<string, number>;
    incomeByCategory: Record<string, number>;
    savingByCategory: Record<string, number>;
    transactionCount: number;
}

export interface MonthData {
    income: number;
    expenses: number;
    saving: number;
    balance: number;
}

export interface AnnualSummary {
    year: number;
    months: Record<number, MonthData>;
}

export interface CarryoverData {
    carryover: number;
    year: number;
    month: number;
}
