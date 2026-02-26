import { Response } from 'express';
import { SetMonthlyBudget, GetMonthlyBudget } from '@application/use-cases/Budget';
import { AuthRequest } from '@infrastructure/express/authMiddleware';
import { SqliteTransactionRepository } from '@infrastructure/persistence/SqliteTransactionRepository';

export class BudgetController {
    constructor(
        private readonly setMonthlyBudget: SetMonthlyBudget,
        private readonly getMonthlyBudget: GetMonthlyBudget,
        private readonly transactionRepo: SqliteTransactionRepository,
    ) { }

    async get(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const year = parseInt(req.params.year);
            const month = parseInt(req.params.month);
            const budget = await this.getMonthlyBudget.execute(userId, year, month);
            res.json(budget ? budget.toJSON() : { initialAmount: 0, year, month });
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async set(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const year = parseInt(req.params.year);
            const month = parseInt(req.params.month);
            const { initialAmount } = req.body;
            const budget = await this.setMonthlyBudget.execute(userId, year, month, initialAmount);
            res.json(budget.toJSON());
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async history(req: AuthRequest, res: Response): Promise<void> {
        try {
            const budgets = await this.getMonthlyBudget.getHistory(req.userId!);
            res.json(budgets.map((b) => b.toJSON()));
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    /** Returns the auto-calculated carry-over balance for a given month. */
    async carryover(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const year = parseInt(req.params.year);
            const month = parseInt(req.params.month);

            if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                res.status(400).json({ error: 'Año o mes inválidos' });
                return;
            }

            const carryover = this.transactionRepo.computeCarryover(userId, year, month);
            res.json({ carryover, year, month });
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }
}
