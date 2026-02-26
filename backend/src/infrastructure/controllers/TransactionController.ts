import { Response } from 'express';
import { AuthRequest } from '@infrastructure/express/authMiddleware';
import { SqliteTransactionRepository } from '@infrastructure/persistence/SqliteTransactionRepository';
import { Transaction } from '@domain/entities/Transaction';

export class TransactionController {
    constructor(
        private readonly transactionRepo: SqliteTransactionRepository,
    ) { }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const transaction = Transaction.create(req.body);

            // Validate available balance for EXPENSE and SAVING types
            if (transaction.type.isExpense() || transaction.type.isSaving()) {
                const txYear = transaction.date.getFullYear();
                const txMonth = transaction.date.getMonth() + 1;

                // Sum of all months before this one
                const carryover = this.transactionRepo.computeCarryover(userId, txYear, txMonth);

                // Current month's balance (before this new transaction)
                const monthTxs = await this.transactionRepo.findByUserAndMonth(userId, txYear, txMonth);
                let monthIncome = 0, monthExpenses = 0, monthSaving = 0;
                for (const tx of monthTxs) {
                    if (tx.type.isIncome()) monthIncome += tx.amount.value;
                    else if (tx.type.isExpense()) monthExpenses += tx.amount.value;
                    else if (tx.type.isSaving()) monthSaving += tx.amount.value;
                }
                const monthBalance = monthIncome - monthExpenses - monthSaving;
                const available = Math.round((carryover + monthBalance) * 100) / 100;

                if (transaction.amount.value > available) {
                    res.status(400).json({
                        error: `Saldo insuficiente. Saldo disponible: ${available.toFixed(2)} €`,
                    });
                    return;
                }
            }

            await this.transactionRepo.saveForUser(transaction, userId);
            res.status(201).json(transaction.toJSON());
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const { year, month } = req.query as Record<string, string>;
            let transactions;
            if (year && month) {
                transactions = await this.transactionRepo.findByUserAndMonth(
                    userId, parseInt(year), parseInt(month)
                );
            } else {
                const now = new Date();
                transactions = await this.transactionRepo.findByUserAndMonth(
                    userId, now.getFullYear(), now.getMonth() + 1
                );
            }
            res.json(transactions.map((t) => t.toJSON()));
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const tx = await this.transactionRepo.findById(req.params.id);
            if (!tx) { res.status(404).json({ error: 'No encontrado' }); return; }
            await this.transactionRepo.delete(req.params.id);
            res.status(204).send();
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async summary(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const { year, month } = req.query as Record<string, string>;
            const now = new Date();
            const y = year ? parseInt(year) : now.getFullYear();
            const m = month ? parseInt(month) : now.getMonth() + 1;

            const transactions = await this.transactionRepo.findByUserAndMonth(userId, y, m);
            let totalIncome = 0;
            let totalExpenses = 0;
            let totalSaving = 0;
            const expensesByCategory: Record<string, number> = {};
            const incomeByCategory: Record<string, number> = {};
            const savingByCategory: Record<string, number> = {};

            for (const tx of transactions) {
                if (tx.type.isIncome()) {
                    totalIncome += tx.amount.value;
                    incomeByCategory[tx.category] = (incomeByCategory[tx.category] ?? 0) + tx.amount.value;
                } else if (tx.type.isExpense()) {
                    totalExpenses += tx.amount.value;
                    expensesByCategory[tx.category] = (expensesByCategory[tx.category] ?? 0) + tx.amount.value;
                } else if (tx.type.isSaving()) {
                    totalSaving += tx.amount.value;
                    savingByCategory[tx.category] = (savingByCategory[tx.category] ?? 0) + tx.amount.value;
                }
            }
            const balance = totalIncome - totalExpenses - totalSaving;
            res.json({
                totalIncome: Math.round(totalIncome * 100) / 100,
                totalExpenses: Math.round(totalExpenses * 100) / 100,
                totalSaving: Math.round(totalSaving * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                expensesByCategory,
                incomeByCategory,
                savingByCategory,
                transactionCount: transactions.length,
                year: y,
                month: m,
            });
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async annual(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const y = parseInt(req.params.year);
            if (isNaN(y)) { res.status(400).json({ error: 'Año inválido' }); return; }

            const transactions = await this.transactionRepo.findByUserAndYear(userId, y);

            const months: Record<number, { income: number; expenses: number; saving: number; balance: number }> = {};
            for (let m = 1; m <= 12; m++) {
                months[m] = { income: 0, expenses: 0, saving: 0, balance: 0 };
            }

            for (const tx of transactions) {
                const month = tx.date.getMonth() + 1;
                const bucket = months[month];
                if (!bucket) continue;
                if (tx.type.isIncome()) bucket.income += tx.amount.value;
                else if (tx.type.isExpense()) bucket.expenses += tx.amount.value;
                else if (tx.type.isSaving()) bucket.saving += tx.amount.value;
            }

            for (const bucket of Object.values(months)) {
                bucket.income = Math.round(bucket.income * 100) / 100;
                bucket.expenses = Math.round(bucket.expenses * 100) / 100;
                bucket.saving = Math.round(bucket.saving * 100) / 100;
                bucket.balance = Math.round((bucket.income - bucket.expenses - bucket.saving) * 100) / 100;
            }

            res.json({ year: y, months });
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }
}
