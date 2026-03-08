import Database from 'better-sqlite3';
import { Transaction } from '@domain/entities/Transaction';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { TransactionId } from '@domain/value-objects/TransactionId';
import { Amount } from '@domain/value-objects/Amount';
import { TransactionType } from '@domain/value-objects/TransactionType';
import { TransactionRow, BalanceRow } from './row-types';

export class SqliteTransactionRepository implements ITransactionRepository {
    constructor(private readonly db: Database.Database) { }

    async save(transaction: Transaction): Promise<void> {
        const j = transaction.toJSON();
        // Extract year/month from the date string directly (YYYY-MM-...) to avoid
        // timezone shifts from Date.getFullYear() / getMonth()
        const [yearStr, monthStr] = j.date.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        this.db
            .prepare(`
        INSERT INTO transactions (id, user_id, year, month, description, amount, type, category, date, created_at, notes)
        VALUES (@id, @userId, @year, @month, @description, @amount, @type, @category, @date, @createdAt, @notes)
        ON CONFLICT(id) DO NOTHING
      `)
            .run({
                id: j.id,
                userId: '',
                year,
                month,
                description: j.description,
                amount: j.amount,
                type: j.type,
                category: j.category,
                date: j.date,
                createdAt: j.createdAt,
                notes: j.notes ?? null,
            });
    }

    async saveForUser(transaction: Transaction, userId: string, recurringRuleId?: string): Promise<void> {
        const j = transaction.toJSON();
        const [yearStr, monthStr] = j.date.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        this.db
            .prepare(`
        INSERT INTO transactions (id, user_id, year, month, description, amount, type, category, date, created_at, notes, recurring_rule_id)
        VALUES (@id, @userId, @year, @month, @description, @amount, @type, @category, @date, @createdAt, @notes, @recurringRuleId)
        ON CONFLICT(id) DO NOTHING
        ON CONFLICT(user_id, recurring_rule_id, year, month) WHERE recurring_rule_id IS NOT NULL DO NOTHING
      `)
            .run({
                id: j.id,
                userId,
                year,
                month,
                description: j.description,
                amount: j.amount,
                type: j.type,
                category: j.category,
                date: j.date,
                createdAt: j.createdAt,
                notes: j.notes ?? null,
                recurringRuleId: recurringRuleId ?? null,
            });
    }

    async findById(id: string): Promise<Transaction | null> {
        const row = this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TransactionRow | undefined;
        return row ? this.toEntity(row) : null;
    }

    async findAll(): Promise<Transaction[]> {
        const rows = this.db
            .prepare('SELECT * FROM transactions ORDER BY date DESC')
            .all() as TransactionRow[];
        return rows.map((r) => this.toEntity(r));
    }

    async findByUserAndMonth(userId: string, year: number, month: number): Promise<Transaction[]> {
        const rows = this.db
            .prepare('SELECT * FROM transactions WHERE user_id = ? AND year = ? AND month = ? ORDER BY date DESC')
            .all(userId, year, month) as TransactionRow[];
        return rows.map((r) => this.toEntity(r));
    }

    async findByUserAndYear(userId: string, year: number): Promise<Transaction[]> {
        const rows = this.db
            .prepare('SELECT * FROM transactions WHERE user_id = ? AND year = ? ORDER BY month ASC, date ASC')
            .all(userId, year) as TransactionRow[];
        return rows.map((r) => this.toEntity(r));
    }

    /** Returns the net balance (income - expenses - saving) for all months strictly before year/month */
    computeCarryover(userId: string, year: number, month: number): number {
        const row = this.db.prepare(`
            SELECT
                COALESCE(SUM(CASE WHEN type = 'INCOME'  THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = 'SAVING'  THEN amount ELSE 0 END), 0) AS balance
            FROM transactions
            WHERE user_id = ?
              AND (year < ? OR (year = ? AND month < ?))
        `).get(userId, year, year, month) as BalanceRow | undefined;
        return Math.round(((row?.balance ?? 0) * 100)) / 100;
    }

    async findByType(type: string): Promise<Transaction[]> {
        const rows = this.db
            .prepare('SELECT * FROM transactions WHERE type = ? ORDER BY date DESC')
            .all(type.toUpperCase()) as TransactionRow[];
        return rows.map((r) => this.toEntity(r));
    }

    async findByCategory(category: string): Promise<Transaction[]> {
        const rows = this.db
            .prepare('SELECT * FROM transactions WHERE lower(category) = lower(?) ORDER BY date DESC')
            .all(category) as TransactionRow[];
        return rows.map((r) => this.toEntity(r));
    }

    async findByDateRange(from: Date, to: Date): Promise<Transaction[]> {
        const rows = this.db
            .prepare('SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC')
            .all(from.toISOString(), to.toISOString()) as TransactionRow[];
        return rows.map((r) => this.toEntity(r));
    }

    async delete(id: string): Promise<void> {
        this.db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    }

    async patchTransaction(id: string, changes: { notes?: string | null }): Promise<Transaction | null> {
        const tx = await this.findById(id);
        if (!tx) return null;
        tx.patch(changes);
        const sets: string[] = [];
        const params: Record<string, unknown> = { id };
        if ('notes' in changes) { sets.push('notes = @notes'); params.notes = changes.notes ?? null; }
        if (sets.length > 0) {
            this.db.prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = @id`).run(params);
        }
        return tx;
    }

    async updateTransaction(id: string, changes: {
        description?: string;
        amount?: number;
        type?: string;
        category?: string;
        date?: string;
        notes?: string | null;
    }): Promise<Transaction | null> {
        const tx = await this.findById(id);
        if (!tx) return null;
        tx.update(changes);
        const sets: string[] = [];
        const params: Record<string, unknown> = { id };
        if (changes.description !== undefined) { sets.push('description = @description'); params.description = tx.description; }
        if (changes.amount !== undefined) { sets.push('amount = @amount'); params.amount = tx.amount.value; }
        if (changes.type !== undefined) { sets.push('type = @type'); params.type = tx.type.value; }
        if (changes.category !== undefined) { sets.push('category = @category'); params.category = tx.category; }
        if (changes.date !== undefined) { sets.push('date = @date'); params.date = tx.date.toISOString(); }
        if ('notes' in changes) { sets.push('notes = @notes'); params.notes = changes.notes ?? null; }
        if (sets.length > 0) {
            this.db.prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = @id`).run(params);
        }
        return tx;
    }

    private toEntity(row: TransactionRow): Transaction {
        return Transaction.reconstitute({
            id: TransactionId.create(row.id),
            description: row.description,
            amount: Amount.create(row.amount),
            type: TransactionType.create(row.type),
            category: row.category,
            date: new Date(row.date),
            createdAt: new Date(row.created_at),
            notes: row.notes ?? null,
        });
    }
}
