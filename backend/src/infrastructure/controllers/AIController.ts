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
            const { year, month } = req.body as { year: number; month: number };

            if (!year || !month || month < 1 || month > 12) {
                res.status(400).json({ error: 'year y month son requeridos' });
                return;
            }

            // Gather context data from repositories if available
            let totalIncome = 0;
            let totalExpenses = 0;
            let balance = 0;
            let savingsRate = 0;
            let budgetAmount = 0;
            const expensesByCategory: Record<string, number> = {};
            const transactions: { description: string; amount: number; type: 'income' | 'expense'; category: string; date: string }[] = [];

            if (this.transactionRepo) {
                const from = new Date(year, month - 1, 1);
                const to = new Date(year, month, 0, 23, 59, 59);
                const txs = await this.transactionRepo.findByDateRange(from, to);

                for (const tx of txs) {
                    const isIncome = tx.type.isIncome();
                    if (isIncome) {
                        totalIncome += tx.amount.value;
                    } else {
                        totalExpenses += tx.amount.value;
                        expensesByCategory[tx.category] = (expensesByCategory[tx.category] ?? 0) + tx.amount.value;
                    }
                    transactions.push({
                        description: tx.description,
                        amount: tx.amount.value,
                        type: isIncome ? 'income' : 'expense',
                        category: tx.category,
                        date: tx.date.toISOString().split('T')[0],
                    });
                }

                balance = totalIncome - totalExpenses;
                savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
            }

            if (this.budgetRepo) {
                const budget = await this.budgetRepo.findByUserAndMonth(req.userId!, year, month);
                budgetAmount = budget?.initialAmount ?? 0;
            }

            const advice = await this.getAIAdvice.execute({
                year,
                month,
                totalIncome: Math.round(totalIncome * 100) / 100,
                totalExpenses: Math.round(totalExpenses * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                savingsRate: Math.round(savingsRate * 100) / 100,
                budgetAmount,
                expensesByCategory,
                transactions,
            });

            res.json(advice);
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }
}
