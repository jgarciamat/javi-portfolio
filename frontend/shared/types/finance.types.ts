export type TransactionType = 'INCOME' | 'EXPENSE';

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

export interface FinancialSummary {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    savingsRate: number;
    expensesByCategory: Record<string, number>;
    incomeByCategory: Record<string, number>;
    transactionCount: number;
}

export interface ApiError {
    error: string;
}
