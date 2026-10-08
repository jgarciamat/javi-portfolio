import { randomUUID } from 'crypto';
import { ConflictError } from '@domain/errors';
import { Category, DEFAULT_CATEGORIES } from '@domain/model/Category';
import { CategoryRepository, CategoryUsage } from '@domain/ports/repositories';
import { Db } from '../database';

interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
}

const toCategory = (r: CategoryRow): Category =>
  Category.reconstitute({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    color: r.color,
    icon: r.icon,
  });

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): Category[] {
    const rows = this.db
      .prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name COLLATE NOCASE')
      .all(userId) as CategoryRow[];
    return rows.map(toCategory);
  }

  findById(userId: string, id: string): Category | null {
    const row = this.db
      .prepare('SELECT * FROM categories WHERE user_id = ? AND id = ?')
      .get(userId, id) as CategoryRow | undefined;
    return row ? toCategory(row) : null;
  }

  findByName(userId: string, name: string): Category | null {
    // Exact match first, then case-insensitive (old data may differ only by case).
    const row = this.db
      .prepare(
        `SELECT * FROM categories WHERE user_id = ? AND name = ? COLLATE NOCASE
         ORDER BY (name = ?) DESC LIMIT 1`
      )
      .get(userId, name.trim(), name.trim()) as CategoryRow | undefined;
    return row ? toCategory(row) : null;
  }

  save(category: Category): void {
    const p = category.toPrimitives();
    try {
      this.db
        .prepare(
          `INSERT INTO categories (id, user_id, name, color, icon) VALUES (@id, @userId, @name, @color, @icon)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, icon = excluded.icon`
        )
        .run(p);
    } catch (e) {
      if (e instanceof Error && e.message.includes('UNIQUE')) {
        throw new ConflictError('Ya existe una categoría con ese nombre', 'CATEGORY_EXISTS');
      }
      throw e;
    }
  }

  delete(userId: string, id: string): void {
    this.db.prepare('DELETE FROM categories WHERE user_id = ? AND id = ?').run(userId, id);
  }

  usage(userId: string, id: string): CategoryUsage {
    const count = (table: string): number =>
      (
        this.db
          .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ? AND category_id = ?`)
          .get(userId, id) as { n: number }
      ).n;
    return {
      transactions: count('transactions'),
      recurringRules: count('recurring_rules'),
      customAlerts: count('custom_alerts'),
      budgets: count('category_budgets'),
      goals: count('goals'),
    };
  }

  reassign(userId: string, fromId: string, toId: string): void {
    for (const table of ['transactions', 'recurring_rules', 'custom_alerts', 'goals']) {
      this.db
        .prepare(`UPDATE ${table} SET category_id = ? WHERE user_id = ? AND category_id = ?`)
        .run(toId, userId, fromId);
    }
    // A category has at most one budget: keep the target's budget if it already has one.
    const targetHasBudget = this.db
      .prepare('SELECT 1 FROM category_budgets WHERE user_id = ? AND category_id = ?')
      .get(userId, toId);
    if (targetHasBudget) {
      this.db
        .prepare('DELETE FROM category_budgets WHERE user_id = ? AND category_id = ?')
        .run(userId, fromId);
    } else {
      this.db
        .prepare(
          'UPDATE category_budgets SET category_id = ? WHERE user_id = ? AND category_id = ?'
        )
        .run(toId, userId, fromId);
    }
  }

  seedDefaults(userId: string): void {
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO categories (id, user_id, name, color, icon) VALUES (?, ?, ?, ?, ?)'
    );
    for (const c of DEFAULT_CATEGORIES) insert.run(randomUUID(), userId, c.name, c.color, c.icon);
  }
}
