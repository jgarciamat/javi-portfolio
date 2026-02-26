import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';

export interface FinancialSummary {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    savingsRate: number;
    expensesByCategory: Record<string, number>;
    incomeByCategory: Record<string, number>;
    transactionCount: number;
}

export class GetFinancialSummary {
    constructor(private readonly transactionRepository: ITransactionRepository) { }

    async execute(from?: string, to?: string): Promise<FinancialSummary> {
        let transactions;
        if (from && to) {
            transactions = await this.transactionRepository.findByDateRange(
                new Date(from),
                new Date(to)
            );
        } else {
            transactions = await this.transactionRepository.findAll();
        }

        let totalIncome = 0;
        let totalExpenses = 0;
        const expensesByCategory: Record<string, number> = {};
        const incomeByCategory: Record<string, number> = {};

        for (const tx of transactions) {
            if (tx.type.isIncome()) {
                totalIncome += tx.amount.value;
                incomeByCategory[tx.category] =
                    (incomeByCategory[tx.category] ?? 0) + tx.amount.value;
            } else {
                totalExpenses += tx.amount.value;
                expensesByCategory[tx.category] =
                    (expensesByCategory[tx.category] ?? 0) + tx.amount.value;
            }
        }

        const balance = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

        return {
            totalIncome: Math.round(totalIncome * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            balance: Math.round(balance * 100) / 100,
            savingsRate: Math.round(savingsRate * 100) / 100,
            expensesByCategory,
            incomeByCategory,
            transactionCount: transactions.length,
        };
    }
}
