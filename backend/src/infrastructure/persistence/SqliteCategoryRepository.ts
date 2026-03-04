import Database from 'better-sqlite3';
import { Category } from '@domain/entities/Category';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';
import { CategoryRow } from './row-types';

const DEFAULT_CATEGORIES = [
    { name: 'Agua', color: '#38bdf8', icon: '💧' },
    { name: 'Ahorro', color: '#a78bfa', icon: '🐷' },
    { name: 'Alimentación', color: '#f97316', icon: '🍔' },
    { name: 'Educación', color: '#84cc16', icon: '📚' },
    { name: 'Freelance', color: '#6366f1', icon: '🖥️' },
    { name: 'Gas', color: '#fb923c', icon: '🔥' },
    { name: 'Gastos', color: '#f43f5e', icon: '💸' },
    { name: 'Inversiones', color: '#eab308', icon: '📈' },
    { name: 'Luz', color: '#facc15', icon: '💡' },
    { name: 'Niño', color: '#a78bfa', icon: '🧒' },
    { name: 'Ocio', color: '#ec4899', icon: '🎉' },
    { name: 'Otros', color: '#94a3b8', icon: '📦' },
    { name: 'Ropa', color: '#f59e0b', icon: '👕' },
    { name: 'Salario', color: '#10b981', icon: '💼' },
    { name: 'Salud', color: '#22c55e', icon: '💊' },
    { name: 'Tecnología', color: '#06b6d4', icon: '💻' },
    { name: 'Transporte', color: '#3b82f6', icon: '🚗' },
    { name: 'Vivienda', color: '#8b5cf6', icon: '🏠' },
];

export class SqliteCategoryRepository implements ICategoryRepository {
    constructor(private readonly db: Database.Database) { }

    /** Seeds default categories for a new user */
    seedForUser(userId: string): void {
        const insert = this.db.prepare(`
      INSERT OR IGNORE INTO categories (id, user_id, name, color, icon)
      VALUES (@id, @userId, @name, @color, @icon)
    `);
        for (const cat of DEFAULT_CATEGORIES) {
            const c = Category.create(cat);
            insert.run({ id: c.id, userId, name: c.name, color: c.color, icon: c.icon });
        }
    }

    async save(category: Category, userId?: string): Promise<void> {
        this.db
            .prepare(`
        INSERT INTO categories (id, user_id, name, color, icon)
        VALUES (@id, @userId, @name, @color, @icon)
        ON CONFLICT(user_id, name) DO UPDATE SET color = excluded.color, icon = excluded.icon
      `)
            .run({ id: category.id, userId: userId ?? '', name: category.name, color: category.color, icon: category.icon });
    }

    async findById(id: string): Promise<Category | null> {
        const row = this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow | undefined;
        return row ? this.toEntity(row) : null;
    }

    async findByName(name: string): Promise<Category | null> {
        const row = this.db.prepare('SELECT * FROM categories WHERE lower(name) = lower(?)').get(name) as CategoryRow | undefined;
        return row ? this.toEntity(row) : null;
    }

    async findAll(): Promise<Category[]> {
        const rows = this.db.prepare('SELECT * FROM categories ORDER BY name').all() as CategoryRow[];
        return rows.map((r) => this.toEntity(r));
    }

    async findAllByUser(userId: string): Promise<Category[]> {
        const rows = this.db
            .prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name')
            .all(userId) as CategoryRow[];
        return rows.map((r) => this.toEntity(r));
    }

    async delete(id: string): Promise<void> {
        this.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    }

    private toEntity(row: CategoryRow): Category {
        return Category.reconstitute({ id: row.id, name: row.name, color: row.color, icon: row.icon });
    }
}
