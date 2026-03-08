import { Response } from 'express';
import { GetAIAdvice } from '@application/use-cases/GetAIAdvice';
import { AuthRequest } from '@infrastructure/express/authMiddleware';
import { SqliteTransactionRepository } from '@infrastructure/persistence/SqliteTransactionRepository';
import { SqliteMonthlyBudgetRepository } from '@infrastructure/persistence/SqliteMonthlyBudgetRepository';

export class AIController {
    constructor(
        private readonly getAIAdvice: GetAIAdvice,
        private readonly transactionRepo?: SqliteTransactionRepository,
        private readonly budgetRepo?: SqliteMonthlyBudgetRepository,
    ) { }

    async getAdvice(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { year, month, locale } = req.body as { year: number; month: number; locale?: string };

            if (!year || !month || month < 1 || month > 12) {
                res.status(400).json({ error: 'year y month son requeridos' });
                return;
            }

            // Gather context data from repositories if available
            let totalIncome = 0;
            let totalExpenses = 0;
            let totalSaving = 0;
            let balance = 0;
            let savingsRate = 0;
            let budgetAmount = 0;
            const expensesByCategory: Record<string, number> = {};
            const savingByCategory: Record<string, number> = {};
            const transactions: { description: string; amount: number; type: 'income' | 'expense' | 'saving'; category: string; date: string }[] = [];

            if (this.transactionRepo) {
                const txs = await this.transactionRepo.findByUserAndMonth(req.userId!, year, month);

                for (const tx of txs) {
                    const txType = tx.type.isSaving() ? 'saving' : tx.type.isIncome() ? 'income' : 'expense';
                    if (txType === 'income') {
                        totalIncome += tx.amount.value;
                    } else if (txType === 'saving') {
                        totalSaving += tx.amount.value;
                        savingByCategory[tx.category] = (savingByCategory[tx.category] ?? 0) + tx.amount.value;
                    } else {
                        totalExpenses += tx.amount.value;
                        expensesByCategory[tx.category] = (expensesByCategory[tx.category] ?? 0) + tx.amount.value;
                    }
                    transactions.push({
                        description: tx.description,
                        amount: tx.amount.value,
                        type: txType,
                        category: tx.category,
                        date: tx.date.toISOString().split('T')[0],
                    });
                }

                balance = totalIncome - totalExpenses - totalSaving;
                savingsRate = totalIncome > 0 ? ((totalSaving + Math.max(0, balance)) / totalIncome) * 100 : 0;
            }

            if (this.budgetRepo) {
                const budget = await this.budgetRepo.findByUserAndMonth(req.userId!, year, month);
                budgetAmount = budget?.initialAmount ?? 0;
            }

            const advice = await this.getAIAdvice.execute({
                year,
                month,
                locale: locale ?? 'es',
                totalIncome: Math.round(totalIncome * 100) / 100,
                totalExpenses: Math.round(totalExpenses * 100) / 100,
                totalSaving: Math.round(totalSaving * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                savingsRate: Math.round(savingsRate * 100) / 100,
                budgetAmount,
                expensesByCategory,
                savingByCategory,
                transactions,
            });

            res.json(advice);
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }
}
