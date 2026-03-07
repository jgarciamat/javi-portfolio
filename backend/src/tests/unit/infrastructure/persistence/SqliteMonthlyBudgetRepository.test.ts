import Database from 'better-sqlite3';
import { SqliteMonthlyBudgetRepository } from '@infrastructure/persistence/SqliteMonthlyBudgetRepository';
import { MonthlyBudget } from '@domain/entities/MonthlyBudget';

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
        CREATE TABLE IF NOT EXISTS monthly_budgets (
            id             TEXT PRIMARY KEY,
            user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            year           INTEGER NOT NULL,
            month          INTEGER NOT NULL,
            initial_amount REAL NOT NULL DEFAULT 0,
            created_at     TEXT NOT NULL,
            updated_at     TEXT NOT NULL,
            UNIQUE(user_id, year, month)
        );
    `);
    db.prepare("INSERT INTO users (id,email,name,password_hash,created_at,email_verified) VALUES ('u1','a@b.com','Test','hash','2025-01-01',0)").run();
}

function makeBudget(overrides: Partial<{ id: string; year: number; month: number; initialAmount: number }> = {}): MonthlyBudget {
    return MonthlyBudget.create({
        id: overrides.id ?? 'budget-1',
        userId: 'u1',
        year: overrides.year ?? 2025,
        month: overrides.month ?? 3,
        initialAmount: overrides.initialAmount ?? 1000,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
    });
}

describe('SqliteMonthlyBudgetRepository', () => {
    let db: Database.Database;
    let repo: SqliteMonthlyBudgetRepository;

    beforeEach(() => {
        db = new Database(':memory:');
        createSchema(db);
        repo = new SqliteMonthlyBudgetRepository(db);
    });

    afterEach(() => {
        db.close();
    });

    describe('save', () => {
        it('inserts a new budget', async () => {
            const budget = makeBudget();
            await repo.save(budget);
            const found = await repo.findByUserAndMonth('u1', 2025, 3);
            expect(found).not.toBeNull();
            expect(found!.initialAmount).toBe(1000);
        });

        it('updates existing budget on conflict', async () => {
            const budget = makeBudget();
            await repo.save(budget);
            const updated = makeBudget({ initialAmount: 2000 });
            await repo.save(updated);
            const found = await repo.findByUserAndMonth('u1', 2025, 3);
            expect(found!.initialAmount).toBe(2000);
        });
    });

    describe('findByUserAndMonth', () => {
        it('returns null when not found', async () => {
            const result = await repo.findByUserAndMonth('u1', 2025, 1);
            expect(result).toBeNull();
        });

        it('returns correct budget', async () => {
            await repo.save(makeBudget({ month: 1, initialAmount: 500 }));
            await repo.save(makeBudget({ id: 'b2', month: 2, initialAmount: 600 }));
            const found = await repo.findByUserAndMonth('u1', 2025, 2);
            expect(found!.initialAmount).toBe(600);
        });
    });

    describe('findAllByUser', () => {
        it('returns empty array when no budgets', async () => {
            const result = await repo.findAllByUser('u1');
            expect(result).toHaveLength(0);
        });

        it('returns all budgets ordered by year/month descending', async () => {
            await repo.save(makeBudget({ id: 'b1', year: 2025, month: 1, initialAmount: 500 }));
            await repo.save(makeBudget({ id: 'b2', year: 2025, month: 3, initialAmount: 1000 }));
            await repo.save(makeBudget({ id: 'b3', year: 2024, month: 12, initialAmount: 800 }));
            const all = await repo.findAllByUser('u1');
            expect(all).toHaveLength(3);
            // Most recent first
            expect(all[0].year).toBe(2025);
            expect(all[0].month).toBe(3);
        });
    });
});
