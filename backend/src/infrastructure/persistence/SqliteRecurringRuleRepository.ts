import Database from 'better-sqlite3';
import { RecurringRule, RecurringFrequency, RecurringType } from '@domain/entities/RecurringRule';
import { IRecurringRuleRepository } from '@domain/repositories/IRecurringRuleRepository';
import { RecurringRuleRow } from './row-types';

export class SqliteRecurringRuleRepository implements IRecurringRuleRepository {
    constructor(private readonly db: Database.Database) { }

    private rowToEntity(row: RecurringRuleRow): RecurringRule {
        return RecurringRule.reconstitute({
            id: row.id,
            userId: row.user_id,
            description: row.description,
            amount: row.amount,
            type: row.type as RecurringType,
            category: row.category,
            startYear: row.start_year,
            startMonth: row.start_month,
            endYear: row.end_year,
            endMonth: row.end_month,
            frequency: row.frequency as RecurringFrequency,
            active: row.active === 1,
            createdAt: new Date(row.created_at),
        });
    }

    save(rule: RecurringRule): void {
        this.db.prepare(`
            INSERT INTO recurring_rules
                (id, user_id, description, amount, type, category,
                 start_year, start_month, end_year, end_month, frequency, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            rule.id,
            rule.userId,
            rule.description,
            rule.amount,
            rule.type,
            rule.category,
            rule.startYear,
            rule.startMonth,
            rule.endYear,
            rule.endMonth,
            rule.frequency,
            rule.active ? 1 : 0,
            rule.createdAt.toISOString(),
        );
    }

    findById(id: string): RecurringRule | null {
        const row = this.db.prepare(
            'SELECT * FROM recurring_rules WHERE id = ?'
        ).get(id) as RecurringRuleRow | undefined;
        return row ? this.rowToEntity(row) : null;
    }

    findByUserId(userId: string): RecurringRule[] {
        const rows = this.db.prepare(
            'SELECT * FROM recurring_rules WHERE user_id = ? ORDER BY created_at ASC'
        ).all(userId) as RecurringRuleRow[];
        return rows.map((r) => this.rowToEntity(r));
    }

    update(id: string, changes: Partial<{
        description: string;
        amount: number;
        type: string;
        category: string;
        startYear: number;
        startMonth: number;
        endYear: number | null;
        endMonth: number | null;
        frequency: string;
        active: boolean;
    }>): RecurringRule | null {
        const existing = this.findById(id);
        if (!existing) return null;

        const sets: string[] = [];
        const values: unknown[] = [];

        if (changes.description !== undefined) { sets.push('description = ?'); values.push(changes.description); }
        if (changes.amount !== undefined) { sets.push('amount = ?'); values.push(changes.amount); }
        if (changes.type !== undefined) { sets.push('type = ?'); values.push(changes.type.toUpperCase()); }
        if (changes.category !== undefined) { sets.push('category = ?'); values.push(changes.category); }
        if (changes.startYear !== undefined) { sets.push('start_year = ?'); values.push(changes.startYear); }
        if (changes.startMonth !== undefined) { sets.push('start_month = ?'); values.push(changes.startMonth); }
        if ('endYear' in changes) { sets.push('end_year = ?'); values.push(changes.endYear ?? null); }
        if ('endMonth' in changes) { sets.push('end_month = ?'); values.push(changes.endMonth ?? null); }
        if (changes.frequency !== undefined) { sets.push('frequency = ?'); values.push(changes.frequency); }
        if (changes.active !== undefined) { sets.push('active = ?'); values.push(changes.active ? 1 : 0); }

        if (sets.length === 0) return existing;

        values.push(id);
        this.db.prepare(`UPDATE recurring_rules SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        return this.findById(id);
    }

    delete(id: string): void {
        this.db.prepare('DELETE FROM recurring_rules WHERE id = ?').run(id);
    }
}
