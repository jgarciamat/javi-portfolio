import Database from 'better-sqlite3';
import {
    CustomAlert,
    CustomAlertMetric,
    CustomAlertOperator,
} from '@domain/entities/CustomAlert';
import { ICustomAlertRepository } from '@domain/repositories/ICustomAlertRepository';
import { CustomAlertRow } from './row-types';

export class SqliteCustomAlertRepository implements ICustomAlertRepository {
    constructor(private readonly db: Database.Database) { }

    private rowToEntity(row: CustomAlertRow): CustomAlert {
        return CustomAlert.reconstitute({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            metric: row.metric as CustomAlertMetric,
            operator: row.operator as CustomAlertOperator,
            threshold: row.threshold,
            category: row.category,
            color: row.color ?? '#6366f1',
            active: row.active === 1,
            createdAt: new Date(row.created_at),
        });
    }

    save(alert: CustomAlert): void {
        this.db.prepare(`
            INSERT INTO custom_alerts
                (id, user_id, name, metric, operator, threshold, category, color, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            alert.id,
            alert.userId,
            alert.name,
            alert.metric,
            alert.operator,
            alert.threshold,
            alert.category,
            alert.color,
            alert.active ? 1 : 0,
            alert.createdAt.toISOString(),
        );
    }

    findById(id: string): CustomAlert | null {
        const row = this.db.prepare(
            'SELECT * FROM custom_alerts WHERE id = ?'
        ).get(id) as CustomAlertRow | undefined;
        return row ? this.rowToEntity(row) : null;
    }

    findByUserId(userId: string): CustomAlert[] {
        const rows = this.db.prepare(
            'SELECT * FROM custom_alerts WHERE user_id = ? ORDER BY created_at ASC'
        ).all(userId) as CustomAlertRow[];
        return rows.map((r) => this.rowToEntity(r));
    }

    update(id: string, changes: Partial<{
        name: string;
        metric: string;
        operator: string;
        threshold: number;
        category: string | null;
        color: string;
        active: boolean;
    }>): CustomAlert | null {
        const existing = this.findById(id);
        if (!existing) return null;

        const sets: string[] = [];
        const values: unknown[] = [];

        if (changes.name !== undefined) { sets.push('name = ?'); values.push(changes.name); }
        if (changes.metric !== undefined) { sets.push('metric = ?'); values.push(changes.metric); }
        if (changes.operator !== undefined) { sets.push('operator = ?'); values.push(changes.operator); }
        if (changes.threshold !== undefined) { sets.push('threshold = ?'); values.push(changes.threshold); }
        if ('category' in changes) { sets.push('category = ?'); values.push(changes.category ?? null); }
        if (changes.color !== undefined) { sets.push('color = ?'); values.push(changes.color); }
        if (changes.active !== undefined) { sets.push('active = ?'); values.push(changes.active ? 1 : 0); }

        if (sets.length === 0) return existing;

        values.push(id);
        this.db.prepare(`UPDATE custom_alerts SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        return this.findById(id);
    }

    delete(id: string): void {
        this.db.prepare('DELETE FROM custom_alerts WHERE id = ?').run(id);
    }

    deleteAllByUser(userId: string): void {
        this.db.prepare('DELETE FROM custom_alerts WHERE user_id = ?').run(userId);
    }
}
