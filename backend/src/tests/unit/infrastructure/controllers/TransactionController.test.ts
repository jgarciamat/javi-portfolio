import { Response } from 'express';
import { TransactionController } from '@infrastructure/controllers/TransactionController';
import { SqliteTransactionRepository } from '@infrastructure/persistence/SqliteTransactionRepository';
import { Transaction } from '@domain/entities/Transaction';
import { AuthRequest } from '@infrastructure/express/authMiddleware';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
}

function makeReq(
    overrides: Partial<AuthRequest> = {},
): AuthRequest {
    return {
        userId: 'user1',
        params: {},
        query: {},
        body: {},
        ...overrides,
    } as AuthRequest;
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

// ── mocked repo factory ───────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<SqliteTransactionRepository> {
    return {
        saveForUser: jest.fn(),
        save: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        findByType: jest.fn(),
        findByCategory: jest.fn(),
        findByDateRange: jest.fn(),
        findByUserAndMonth: jest.fn(),
        findByUserAndYear: jest.fn(),
        computeCarryover: jest.fn(),
        delete: jest.fn(),
        patchTransaction: jest.fn(),
    } as unknown as jest.Mocked<SqliteTransactionRepository>;
}

// ── patch() ───────────────────────────────────────────────────────────────────

describe('TransactionController.patch()', () => {
    let repo: jest.Mocked<SqliteTransactionRepository>;
    let controller: TransactionController;

    beforeEach(() => {
        repo = makeRepo();
        controller = new TransactionController(repo);
    });

    test('returns 200 with patched transaction on success', async () => {
        const tx = makeTx({ notes: 'Done note' });
        repo.patchTransaction.mockResolvedValue(tx);

        const req = makeReq({ params: { id: tx.id.value }, body: { notes: 'Done note' } });
        const res = makeRes();

        await controller.patch(req, res as Response);

        expect(repo.patchTransaction).toHaveBeenCalledWith(tx.id.value, { notes: 'Done note' });
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Done note' }));
    });

    test('returns 404 when transaction not found', async () => {
        repo.patchTransaction.mockResolvedValue(null);

        const req = makeReq({ params: { id: 'missing-id' }, body: { notes: 'some note' } });
        const res = makeRes();

        await controller.patch(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'No encontrado' });
    });

    test('returns 500 when repo throws', async () => {
        repo.patchTransaction.mockRejectedValue(new Error('DB error'));

        const req = makeReq({ params: { id: 'any-id' }, body: { notes: null } });
        const res = makeRes();

        await controller.patch(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });

    test('returns 500 with generic message when non-Error thrown', async () => {
        repo.patchTransaction.mockRejectedValue('unexpected');

        const req = makeReq({ params: { id: 'any-id' }, body: {} });
        const res = makeRes();

        await controller.patch(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Error' });
    });

    test('sends only notes when notes is present in body', async () => {
        const tx = makeTx({ notes: 'Just a note' });
        repo.patchTransaction.mockResolvedValue(tx);

        const req = makeReq({ params: { id: tx.id.value }, body: { notes: 'Just a note' } });
        const res = makeRes();

        await controller.patch(req, res as Response);

        expect(repo.patchTransaction).toHaveBeenCalledWith(tx.id.value, { notes: 'Just a note' });
    });
});

// ── create() balance check — SAVING only ─────────────────────────────────────

describe('TransactionController.create() balance check', () => {
    let repo: jest.Mocked<SqliteTransactionRepository>;
    let controller: TransactionController;

    beforeEach(() => {
        repo = makeRepo();
        controller = new TransactionController(repo);
        repo.findByUserAndMonth.mockResolvedValue([]);
        repo.computeCarryover.mockReturnValue(0);
        repo.saveForUser.mockResolvedValue();
    });

    test('EXPENSE does NOT check balance — even with 0 available', async () => {
        const req = makeReq({
            body: { description: 'Groceries', amount: 9999, type: 'expense', category: 'Food', date: '2025-03-01' },
        });
        const res = makeRes();

        await controller.create(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(repo.saveForUser).toHaveBeenCalled();
    });

    test('SAVING is blocked when amount exceeds available balance', async () => {
        repo.computeCarryover.mockReturnValue(0);
        repo.findByUserAndMonth.mockResolvedValue([]);

        const req = makeReq({
            body: { description: 'Savings', amount: 100, type: 'saving', category: 'Savings', date: '2025-03-01' },
        });
        const res = makeRes();

        await controller.create(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Saldo insuficiente/i) }));
        expect(repo.saveForUser).not.toHaveBeenCalled();
    });

    test('SAVING succeeds when amount is within available balance', async () => {
        repo.computeCarryover.mockReturnValue(0);
        // existing income of 500
        const incomeTx = Transaction.create({ description: 'Salary', amount: 500, type: 'income', category: 'Work' });
        repo.findByUserAndMonth.mockResolvedValue([incomeTx]);

        const req = makeReq({
            body: { description: 'Savings', amount: 100, type: 'saving', category: 'Savings', date: '2025-03-01' },
        });
        const res = makeRes();

        await controller.create(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(repo.saveForUser).toHaveBeenCalled();
    });

    test('SAVING balance deducts existing expenses and savings in month', async () => {
        repo.computeCarryover.mockReturnValue(0);
        // income 1000, expense 300, saving 200 → available = 500
        const incomeTx = Transaction.create({ description: 'Salary', amount: 1000, type: 'income', category: 'Work' });
        const expenseTx = Transaction.create({ description: 'Rent', amount: 300, type: 'expense', category: 'Housing' });
        const savingTx = Transaction.create({ description: 'Existing saving', amount: 200, type: 'saving', category: 'Savings' });
        repo.findByUserAndMonth.mockResolvedValue([incomeTx, expenseTx, savingTx]);

        // Try to save 600 (> 500 available)
        const req = makeReq({
            body: { description: 'Big saving', amount: 600, type: 'saving', category: 'Savings', date: '2025-03-01' },
        });
        const res = makeRes();

        await controller.create(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/500\.00/) }));
    });

    test('INCOME does NOT check balance', async () => {
        const req = makeReq({
            body: { description: 'Bonus', amount: 5000, type: 'income', category: 'Work', date: '2025-03-01' },
        });
        const res = makeRes();

        await controller.create(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(repo.computeCarryover).not.toHaveBeenCalled();
    });

    test('create returns 400 when Transaction.create throws (invalid data)', async () => {
        const req = makeReq({ body: { description: '', amount: 10, type: 'expense', category: 'misc' } });
        const res = makeRes();

        await controller.create(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
});

// ── getAll() ──────────────────────────────────────────────────────────────────

describe('TransactionController.getAll()', () => {
    let repo: jest.Mocked<SqliteTransactionRepository>;
    let controller: TransactionController;

    beforeEach(() => {
        repo = makeRepo();
        controller = new TransactionController(repo);
    });

    test('returns 200 with transactions filtered by year+month query params', async () => {
        const tx = makeTx();
        repo.findByUserAndMonth.mockResolvedValue([tx]);

        const req = makeReq({ query: { year: '2025', month: '3' } });
        const res = makeRes();

        await controller.getAll(req, res as Response);

        expect(repo.findByUserAndMonth).toHaveBeenCalledWith('user1', 2025, 3);
        expect(res.json).toHaveBeenCalledWith([expect.objectContaining({ description: 'Coffee' })]);
    });

    test('returns 200 using current month when no query params', async () => {
        const tx = makeTx();
        repo.findByUserAndMonth.mockResolvedValue([tx]);

        const req = makeReq({ query: {} });
        const res = makeRes();

        await controller.getAll(req, res as Response);

        const now = new Date();
        expect(repo.findByUserAndMonth).toHaveBeenCalledWith('user1', now.getFullYear(), now.getMonth() + 1);
    });

    test('returns 500 when repo throws', async () => {
        repo.findByUserAndMonth.mockRejectedValue(new Error('DB fail'));

        const req = makeReq({ query: {} });
        const res = makeRes();

        await controller.getAll(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'DB fail' });
    });
});

// ── delete() ──────────────────────────────────────────────────────────────────

describe('TransactionController.delete()', () => {
    let repo: jest.Mocked<SqliteTransactionRepository>;
    let controller: TransactionController;

    beforeEach(() => {
        repo = makeRepo();
        controller = new TransactionController(repo);
    });

    test('returns 204 when transaction is deleted', async () => {
        const tx = makeTx();
        repo.findById.mockResolvedValue(tx);
        repo.delete.mockResolvedValue();

        const req = makeReq({ params: { id: tx.id.value } });
        const res = makeRes();

        await controller.delete(req, res as Response);

        expect(repo.delete).toHaveBeenCalledWith(tx.id.value);
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.send).toHaveBeenCalled();
    });

    test('returns 404 when transaction not found', async () => {
        repo.findById.mockResolvedValue(null);

        const req = makeReq({ params: { id: 'missing' } });
        const res = makeRes();

        await controller.delete(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'No encontrado' });
    });

    test('returns 500 when repo throws', async () => {
        repo.findById.mockRejectedValue(new Error('DB error'));

        const req = makeReq({ params: { id: 'any' } });
        const res = makeRes();

        await controller.delete(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
});

// ── summary() ─────────────────────────────────────────────────────────────────

describe('TransactionController.summary()', () => {
    let repo: jest.Mocked<SqliteTransactionRepository>;
    let controller: TransactionController;

    beforeEach(() => {
        repo = makeRepo();
        controller = new TransactionController(repo);
    });

    test('returns 200 with correct totals for a given year+month', async () => {
        const income = Transaction.create({ description: 'Salary', amount: 1000, type: 'income', category: 'Work', date: new Date('2025-03-10') });
        const expense = Transaction.create({ description: 'Rent', amount: 400, type: 'expense', category: 'Housing', date: new Date('2025-03-10') });
        const saving = Transaction.create({ description: 'ISA', amount: 200, type: 'saving', category: 'Savings', date: new Date('2025-03-10') });
        repo.findByUserAndMonth.mockResolvedValue([income, expense, saving]);

        const req = makeReq({ query: { year: '2025', month: '3' } });
        const res = makeRes();

        await controller.summary(req, res as Response);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            totalIncome: 1000,
            totalExpenses: 400,
            totalSaving: 200,
            balance: 400,
            year: 2025,
            month: 3,
        }));
    });

    test('uses current date when no query params', async () => {
        repo.findByUserAndMonth.mockResolvedValue([]);

        const req = makeReq({ query: {} });
        const res = makeRes();

        await controller.summary(req, res as Response);

        const now = new Date();
        expect(repo.findByUserAndMonth).toHaveBeenCalledWith('user1', now.getFullYear(), now.getMonth() + 1);
    });

    test('returns 500 when repo throws', async () => {
        repo.findByUserAndMonth.mockRejectedValue(new Error('fail'));

        const req = makeReq({ query: {} });
        const res = makeRes();

        await controller.summary(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ── annual() ──────────────────────────────────────────────────────────────────

describe('TransactionController.annual()', () => {
    let repo: jest.Mocked<SqliteTransactionRepository>;
    let controller: TransactionController;

    beforeEach(() => {
        repo = makeRepo();
        controller = new TransactionController(repo);
    });

    test('returns 200 with monthly breakdown for valid year', async () => {
        const tx = Transaction.create({ description: 'Salary', amount: 1000, type: 'income', category: 'Work', date: new Date('2025-06-10') });
        repo.findByUserAndYear.mockResolvedValue([tx]);

        const req = makeReq({ params: { year: '2025' } });
        const res = makeRes();

        await controller.annual(req, res as Response);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            year: 2025,
            months: expect.objectContaining({
                6: expect.objectContaining({ income: 1000 }),
            }),
        }));
    });

    test('returns 400 for invalid year param', async () => {
        const req = makeReq({ params: { year: 'abc' } });
        const res = makeRes();

        await controller.annual(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Año inválido' });
    });

    test('returns 500 when repo throws', async () => {
        repo.findByUserAndYear.mockRejectedValue(new Error('DB error'));

        const req = makeReq({ params: { year: '2025' } });
        const res = makeRes();

        await controller.annual(req, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
