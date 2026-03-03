import Database from 'better-sqlite3';
import { SqliteTransactionRepository } from '@infrastructure/persistence/SqliteTransactionRepository';
import { Transaction } from '@domain/entities/Transaction';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = OFF'); // no users table in memory
    db.exec(`
        CREATE TABLE transactions (
            id          TEXT PRIMARY KEY,
            user_id     TEXT NOT NULL DEFAULT '',
            year        INTEGER NOT NULL,
            month       INTEGER NOT NULL,
            description TEXT NOT NULL,
            amount      REAL NOT NULL,
            type        TEXT NOT NULL,
            category    TEXT NOT NULL,
            date        TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            done        INTEGER NOT NULL DEFAULT 0,
            notes       TEXT
        );
    `);
    return db;
}

function makeTx(overrides: Partial<Parameters<typeof Transaction.create>[0]> = {}): Transaction {
    return Transaction.create({
        description: 'Coffee',
        amount: 3.5,
        type: 'expense',
        category: 'Food',
        date: new Date('2025-03-10T10:00:00Z'),
        ...overrides,
    });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('SqliteTransactionRepository', () => {
    let db: Database.Database;
    let repo: SqliteTransactionRepository;

    beforeEach(() => {
        db = makeDb();
        repo = new SqliteTransactionRepository(db);
    });

    afterEach(() => db.close());

    // ── saveForUser ───────────────────────────────────────────────────────────

    test('saveForUser stores done=false and notes=null by default', async () => {
        const tx = makeTx();
        await repo.saveForUser(tx, 'user1');

        const row = db.prepare('SELECT done, notes FROM transactions WHERE id = ?').get(tx.id.value) as { done: number; notes: string | null };
        expect(row.done).toBe(0);
        expect(row.notes).toBeNull();
    });

    test('saveForUser stores done=true', async () => {
        const tx = makeTx({ done: true });
        await repo.saveForUser(tx, 'user1');

        const row = db.prepare('SELECT done FROM transactions WHERE id = ?').get(tx.id.value) as { done: number };
        expect(row.done).toBe(1);
    });

    test('saveForUser stores notes string', async () => {
        const tx = makeTx({ notes: 'Paid by card' });
        await repo.saveForUser(tx, 'user1');

        const row = db.prepare('SELECT notes FROM transactions WHERE id = ?').get(tx.id.value) as { notes: string };
        expect(row.notes).toBe('Paid by card');
    });

    // ── toEntity (via findById) ───────────────────────────────────────────────

    test('findById returns done=false when stored as 0', async () => {
        const tx = makeTx({ done: false });
        await repo.saveForUser(tx, 'user1');

        const found = await repo.findById(tx.id.value);
        expect(found).not.toBeNull();
        expect(found!.done).toBe(false);
    });

    test('findById returns done=true when stored as 1', async () => {
        const tx = makeTx({ done: true });
        await repo.saveForUser(tx, 'user1');

        const found = await repo.findById(tx.id.value);
        expect(found!.done).toBe(true);
    });

    test('findById returns notes correctly', async () => {
        const tx = makeTx({ notes: 'A note' });
        await repo.saveForUser(tx, 'user1');

        const found = await repo.findById(tx.id.value);
        expect(found!.notes).toBe('A note');
    });

    test('findById returns notes=null when no notes', async () => {
        const tx = makeTx();
        await repo.saveForUser(tx, 'user1');

        const found = await repo.findById(tx.id.value);
        expect(found!.notes).toBeNull();
    });

    test('findById returns null for unknown id', async () => {
        const result = await repo.findById('nonexistent-id');
        expect(result).toBeNull();
    });

    // ── patchTransaction ──────────────────────────────────────────────────────

    test('patchTransaction returns null for unknown id', async () => {
        const result = await repo.patchTransaction('nonexistent', { done: true });
        expect(result).toBeNull();
    });

    test('patchTransaction updates done from false to true', async () => {
        const tx = makeTx({ done: false });
        await repo.saveForUser(tx, 'user1');

        const patched = await repo.patchTransaction(tx.id.value, { done: true });
        expect(patched).not.toBeNull();
        expect(patched!.done).toBe(true);

        // Verify it was actually persisted
        const row = db.prepare('SELECT done FROM transactions WHERE id = ?').get(tx.id.value) as { done: number };
        expect(row.done).toBe(1);
    });

    test('patchTransaction updates notes', async () => {
        const tx = makeTx();
        await repo.saveForUser(tx, 'user1');

        const patched = await repo.patchTransaction(tx.id.value, { notes: 'Updated note' });
        expect(patched!.notes).toBe('Updated note');

        const row = db.prepare('SELECT notes FROM transactions WHERE id = ?').get(tx.id.value) as { notes: string };
        expect(row.notes).toBe('Updated note');
    });

    test('patchTransaction sets notes to null', async () => {
        const tx = makeTx({ notes: 'Old note' });
        await repo.saveForUser(tx, 'user1');

        const patched = await repo.patchTransaction(tx.id.value, { notes: null });
        expect(patched!.notes).toBeNull();
    });

    test('patchTransaction updates both done and notes at once', async () => {
        const tx = makeTx();
        await repo.saveForUser(tx, 'user1');

        const patched = await repo.patchTransaction(tx.id.value, { done: true, notes: 'Both fields' });
        expect(patched!.done).toBe(true);
        expect(patched!.notes).toBe('Both fields');
    });

    test('patchTransaction with empty changes returns entity unchanged', async () => {
        const tx = makeTx({ done: true, notes: 'Keep me' });
        await repo.saveForUser(tx, 'user1');

        const patched = await repo.patchTransaction(tx.id.value, {});
        expect(patched!.done).toBe(true);
        expect(patched!.notes).toBe('Keep me');
    });

    // ── save (generic, no userId) ─────────────────────────────────────────────

    test('save stores transaction with empty user_id', async () => {
        const tx = makeTx({ done: true, notes: 'Generic save' });
        await repo.save(tx);

        const row = db.prepare('SELECT user_id, done, notes FROM transactions WHERE id = ?').get(tx.id.value) as { user_id: string; done: number; notes: string };
        expect(row.user_id).toBe('');
        expect(row.done).toBe(1);
        expect(row.notes).toBe('Generic save');
    });

    // ── findAll ───────────────────────────────────────────────────────────────

    test('findAll returns all stored transactions ordered by date desc', async () => {
        const tx1 = makeTx({ date: new Date('2025-03-01') });
        const tx2 = makeTx({ description: 'Tea', date: new Date('2025-03-10') });
        await repo.saveForUser(tx1, 'user1');
        await repo.saveForUser(tx2, 'user1');

        const all = await repo.findAll();
        expect(all.length).toBe(2);
        // ordered by date desc: tx2 (Mar 10) first
        expect(all[0].description).toBe('Tea');
    });

    test('findAll returns empty array when no transactions', async () => {
        const all = await repo.findAll();
        expect(all).toEqual([]);
    });

    // ── findByUserAndMonth ────────────────────────────────────────────────────

    test('findByUserAndMonth returns only matching user+month', async () => {
        const tx = makeTx({ date: new Date('2025-03-10') });
        const txOtherMonth = makeTx({ description: 'Other', date: new Date('2025-04-01') });
        await repo.saveForUser(tx, 'user1');
        await repo.saveForUser(txOtherMonth, 'user1');

        const results = await repo.findByUserAndMonth('user1', 2025, 3);
        expect(results.length).toBe(1);
        expect(results[0].description).toBe('Coffee');
    });

    test('findByUserAndMonth returns empty for unknown user', async () => {
        const tx = makeTx({ date: new Date('2025-03-10') });
        await repo.saveForUser(tx, 'user1');

        const results = await repo.findByUserAndMonth('other-user', 2025, 3);
        expect(results).toEqual([]);
    });

    // ── findByUserAndYear ─────────────────────────────────────────────────────

    test('findByUserAndYear returns all months for the given year', async () => {
        const txJan = makeTx({ date: new Date('2025-01-15') });
        const txJul = makeTx({ description: 'Tea', date: new Date('2025-07-20') });
        const txOtherYear = makeTx({ description: 'Old', date: new Date('2024-12-01') });
        await repo.saveForUser(txJan, 'user1');
        await repo.saveForUser(txJul, 'user1');
        await repo.saveForUser(txOtherYear, 'user1');

        const results = await repo.findByUserAndYear('user1', 2025);
        expect(results.length).toBe(2);
    });

    // ── computeCarryover ──────────────────────────────────────────────────────

    test('computeCarryover returns 0 when no prior transactions', () => {
        const result = repo.computeCarryover('user1', 2025, 3);
        expect(result).toBe(0);
    });

    test('computeCarryover includes income minus expenses from previous months', async () => {
        const income = makeTx({ description: 'Salary', amount: 1000, type: 'income', date: new Date('2025-01-10') });
        const expense = makeTx({ description: 'Rent', amount: 300, type: 'expense', date: new Date('2025-02-10') });
        await repo.saveForUser(income, 'user1');
        await repo.saveForUser(expense, 'user1');

        // asking for carryover into March: includes Jan + Feb
        const result = repo.computeCarryover('user1', 2025, 3);
        expect(result).toBe(700); // 1000 - 300
    });

    test('computeCarryover does NOT include the current month', async () => {
        const income = makeTx({ description: 'Salary', amount: 1000, type: 'income', date: new Date('2025-03-10') });
        await repo.saveForUser(income, 'user1');

        // current month is March — should not be included
        const result = repo.computeCarryover('user1', 2025, 3);
        expect(result).toBe(0);
    });

    // ── delete ────────────────────────────────────────────────────────────────

    test('delete removes the transaction from the database', async () => {
        const tx = makeTx();
        await repo.saveForUser(tx, 'user1');

        await repo.delete(tx.id.value);

        const found = await repo.findById(tx.id.value);
        expect(found).toBeNull();
    });

    // ── findByType ────────────────────────────────────────────────────────────

    test('findByType returns only transactions of the given type', async () => {
        const expense = makeTx({ type: 'expense' });
        const income = makeTx({ description: 'Salary', type: 'income' });
        await repo.saveForUser(expense, 'user1');
        await repo.saveForUser(income, 'user1');

        const results = await repo.findByType('expense');
        expect(results.length).toBe(1);
        expect(results[0].description).toBe('Coffee');
    });

    // ── findByCategory ────────────────────────────────────────────────────────

    test('findByCategory returns matching transactions case-insensitively', async () => {
        const tx = makeTx({ category: 'Food' });
        await repo.saveForUser(tx, 'user1');

        const results = await repo.findByCategory('food');
        expect(results.length).toBe(1);
    });

    // ── findByDateRange ───────────────────────────────────────────────────────

    test('findByDateRange returns transactions within the date range', async () => {
        const inRange = makeTx({ date: new Date('2025-03-05') });
        const outOfRange = makeTx({ description: 'Old', date: new Date('2025-01-01') });
        await repo.saveForUser(inRange, 'user1');
        await repo.saveForUser(outOfRange, 'user1');

        const results = await repo.findByDateRange(new Date('2025-03-01'), new Date('2025-03-31'));
        expect(results.length).toBe(1);
        expect(results[0].description).toBe('Coffee');
    });
});
