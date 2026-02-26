import Database from 'better-sqlite3';
import { MonthlyBudget } from '@domain/entities/MonthlyBudget';
import { IMonthlyBudgetRepository } from '@domain/repositories/IMonthlyBudgetRepository';
import { MonthlyBudgetRow } from './row-types';

export class SqliteMonthlyBudgetRepository implements IMonthlyBudgetRepository {
    constructor(private readonly db: Database.Database) { }

    async save(budget: MonthlyBudget): Promise<void> {
        this.db
            .prepare(`
        INSERT INTO monthly_budgets (id, user_id, year, month, initial_amount, created_at, updated_at)
        VALUES (@id, @userId, @year, @month, @initialAmount, @createdAt, @updatedAt)
        ON CONFLICT(user_id, year, month) DO UPDATE SET
          initial_amount = excluded.initial_amount,
          updated_at     = excluded.updated_at
      `)
            .run({
                id: budget.id,
                userId: budget.userId,
                year: budget.year,
                month: budget.month,
                initialAmount: budget.initialAmount,
                createdAt: new Date().toISOString(),
                updatedAt: budget.updatedAt.toISOString(),
            });
    }

    async findByUserAndMonth(userId: string, year: number, month: number): Promise<MonthlyBudget | null> {
        const row = this.db
            .prepare('SELECT * FROM monthly_budgets WHERE user_id = ? AND year = ? AND month = ?')
            .get(userId, year, month) as MonthlyBudgetRow | undefined;
        return row ? this.toEntity(row) : null;
    }

    async findAllByUser(userId: string): Promise<MonthlyBudget[]> {
        const rows = this.db
            .prepare('SELECT * FROM monthly_budgets WHERE user_id = ? ORDER BY year DESC, month DESC')
            .all(userId) as MonthlyBudgetRow[];
        return rows.map((r) => this.toEntity(r));
    }

    private toEntity(row: MonthlyBudgetRow): MonthlyBudget {
        return MonthlyBudget.create({
            id: row.id,
            userId: row.user_id,
            year: row.year,
            month: row.month,
            initialAmount: row.initial_amount,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}
