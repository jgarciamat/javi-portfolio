import Database from 'better-sqlite3';
import { SqliteCategoryRepository } from '@infrastructure/persistence/SqliteCategoryRepository';
import { Category } from '@domain/entities/Category';

function createSchema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            email         TEXT UNIQUE NOT NULL,
            name          TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL,
            email_verified INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS categories (
            id      TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name    TEXT NOT NULL,
            color   TEXT NOT NULL DEFAULT '#6366f1',
            icon    TEXT NOT NULL DEFAULT '💰',
            UNIQUE(user_id, name)
        );
    `);
    // Insert a test user
    db.prepare("INSERT INTO users (id, email, name, password_hash, created_at, email_verified) VALUES ('u1','a@b.com','Test','hash','2025-01-01',0)").run();
}

describe('SqliteCategoryRepository', () => {
    let db: Database.Database;
    let repo: SqliteCategoryRepository;

    beforeEach(() => {
        db = new Database(':memory:');
        createSchema(db);
        repo = new SqliteCategoryRepository(db);
    });

    afterEach(() => {
        db.close();
    });

    describe('seedForUser', () => {
        it('inserts default categories for a user', () => {
            repo.seedForUser('u1');
            const rows = db.prepare("SELECT * FROM categories WHERE user_id = 'u1'").all();
            expect(rows.length).toBeGreaterThan(0);
        });

        it('is idempotent (INSERT OR IGNORE)', () => {
            repo.seedForUser('u1');
            repo.seedForUser('u1');
            const rows = db.prepare("SELECT * FROM categories WHERE user_id = 'u1'").all();
            // should not double the count
            expect(rows.length).toBeGreaterThan(0);
            const countFirst = rows.length;
            repo.seedForUser('u1');
            const rowsAgain = db.prepare("SELECT * FROM categories WHERE user_id = 'u1'").all();
            expect(rowsAgain.length).toBe(countFirst);
        });
    });

    describe('save', () => {
        it('inserts a new category', async () => {
            const cat = Category.create({ name: 'Viaje', color: '#3b82f6', icon: '✈️' });
            await repo.save(cat, 'u1');
            const found = await repo.findById(cat.id);
            expect(found).not.toBeNull();
            expect(found!.name).toBe('Viaje');
        });

        it('upserts on conflict (same user + name)', async () => {
            const cat = Category.create({ name: 'Viaje', color: '#3b82f6', icon: '✈️' });
            await repo.save(cat, 'u1');
            const updated = Category.reconstitute({ id: cat.id, name: 'Viaje', color: '#ff0000', icon: '🚀' });
            await repo.save(updated, 'u1');
            const found = await repo.findById(cat.id);
            expect(found!.color).toBe('#ff0000');
        });
    });

    describe('findById', () => {
        it('returns null for unknown id', async () => {
            const result = await repo.findById('nope');
            expect(result).toBeNull();
        });

        it('returns category when found', async () => {
            const cat = Category.create({ name: 'Ocio', color: '#ec4899', icon: '🎉' });
            await repo.save(cat, 'u1');
            const found = await repo.findById(cat.id);
            expect(found!.name).toBe('Ocio');
        });
    });

    describe('findByName', () => {
        it('returns category case-insensitively', async () => {
            const cat = Category.create({ name: 'Salud', color: '#22c55e', icon: '💊' });
            await repo.save(cat, 'u1');
            const found = await repo.findByName('SALUD');
            expect(found).not.toBeNull();
            expect(found!.name).toBe('Salud');
        });

        it('returns null when not found', async () => {
            const result = await repo.findByName('Inexistente');
            expect(result).toBeNull();
        });
    });

    describe('findAll', () => {
        it('returns all categories ordered by name', async () => {
            await repo.save(Category.create({ name: 'Zzz', color: '#fff', icon: '😴' }), 'u1');
            await repo.save(Category.create({ name: 'Aaa', color: '#000', icon: '🔤' }), 'u1');
            const all = await repo.findAll();
            expect(all[0].name).toBe('Aaa');
        });
    });

    describe('findAllByUser', () => {
        it('returns only categories belonging to given user', async () => {
            repo.seedForUser('u1');
            const cats = await repo.findAllByUser('u1');
            expect(cats.length).toBeGreaterThan(0);
            // a different user has none
            const none = await repo.findAllByUser('other-user');
            expect(none).toHaveLength(0);
        });
    });

    describe('delete', () => {
        it('removes category by id', async () => {
            const cat = Category.create({ name: 'Temporal', color: '#aaa', icon: '⏰' });
            await repo.save(cat, 'u1');
            await repo.delete(cat.id);
            const found = await repo.findById(cat.id);
            expect(found).toBeNull();
        });
    });
});
