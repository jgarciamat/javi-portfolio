import { InMemoryTransactionRepository } from '@infrastructure/persistence/InMemoryTransactionRepository';
import { Transaction } from '@domain/entities/Transaction';

function makeTx(overrides: Partial<{
    description: string;
    amount: number;
    type: string;
    category: string;
    date: Date;
    notes: string | null;
}> = {}): Transaction {
    return Transaction.create({
        description: overrides.description ?? 'Compra supermercado',
        amount: overrides.amount ?? 50,
        type: overrides.type ?? 'EXPENSE',
        category: overrides.category ?? 'Alimentación',
        date: overrides.date ?? new Date('2025-03-15'),
        notes: overrides.notes ?? null,
    });
}

describe('InMemoryTransactionRepository', () => {
    let repo: InMemoryTransactionRepository;

    beforeEach(() => {
        repo = new InMemoryTransactionRepository();
    });

    describe('save + findById', () => {
        it('saves and retrieves a transaction by id', async () => {
            const tx = makeTx();
            await repo.save(tx);
            const found = await repo.findById(tx.id.value);
            expect(found).not.toBeNull();
            expect(found!.id.value).toBe(tx.id.value);
        });

        it('returns null for unknown id', async () => {
            const result = await repo.findById('not-here');
            expect(result).toBeNull();
        });
    });

    describe('findAll', () => {
        it('returns empty array when no transactions', async () => {
            const all = await repo.findAll();
            expect(all).toHaveLength(0);
        });

        it('returns transactions sorted by date descending', async () => {
            const tx1 = makeTx({ date: new Date('2025-01-01') });
            const tx2 = makeTx({ date: new Date('2025-03-01') });
            await repo.save(tx1);
            await repo.save(tx2);
            const all = await repo.findAll();
            expect(all[0].date.getTime()).toBeGreaterThan(all[1].date.getTime());
        });
    });

    describe('findByType', () => {
        it('filters transactions by type (case-insensitive input)', async () => {
            await repo.save(makeTx({ type: 'EXPENSE' }));
            await repo.save(makeTx({ type: 'INCOME', description: 'Salario', category: 'Salario', amount: 1000 }));
            const expenses = await repo.findByType('expense');
            expect(expenses).toHaveLength(1);
            expect(expenses[0].type.value).toBe('EXPENSE');
        });
    });

    describe('findByCategory', () => {
        it('filters by category case-insensitively', async () => {
            await repo.save(makeTx({ category: 'Alimentación' }));
            await repo.save(makeTx({ category: 'Salud', description: 'Farmacia', amount: 20 }));
            const result = await repo.findByCategory('alimentación');
            expect(result).toHaveLength(1);
            expect(result[0].category).toBe('Alimentación');
        });
    });

    describe('findByDateRange', () => {
        it('returns transactions within date range', async () => {
            await repo.save(makeTx({ date: new Date('2025-01-10') }));
            await repo.save(makeTx({ date: new Date('2025-03-15') }));
            await repo.save(makeTx({ date: new Date('2025-06-01') }));
            const result = await repo.findByDateRange(new Date('2025-01-01'), new Date('2025-04-01'));
            expect(result).toHaveLength(2);
        });
    });

    describe('findByUserAndMonth', () => {
        it('returns transactions for given year and month', async () => {
            await repo.save(makeTx({ date: new Date('2025-03-15') }));
            await repo.save(makeTx({ date: new Date('2025-04-01') }));
            const result = await repo.findByUserAndMonth('any-user', 2025, 3);
            expect(result).toHaveLength(1);
            expect(result[0].date.getMonth() + 1).toBe(3);
        });
    });

    describe('patchTransaction', () => {
        it('updates notes on existing transaction', async () => {
            const tx = makeTx();
            await repo.save(tx);
            const patched = await repo.patchTransaction(tx.id.value, { notes: 'Updated note' });
            expect(patched).not.toBeNull();
            expect(patched!.notes).toBe('Updated note');
        });

        it('returns null when transaction not found', async () => {
            const result = await repo.patchTransaction('no-such-id', { notes: 'x' });
            expect(result).toBeNull();
        });

        it('sets notes to null', async () => {
            const tx = makeTx({ notes: 'Old note' });
            await repo.save(tx);
            const patched = await repo.patchTransaction(tx.id.value, { notes: null });
            expect(patched!.notes).toBeNull();
        });
    });

    describe('delete', () => {
        it('removes the transaction', async () => {
            const tx = makeTx();
            await repo.save(tx);
            await repo.delete(tx.id.value);
            const found = await repo.findById(tx.id.value);
            expect(found).toBeNull();
        });
    });

    describe('computeCarryover', () => {
        it('always returns 0 for in-memory repo', () => {
            const result = repo.computeCarryover('u1', 2025, 3);
            expect(result).toBe(0);
        });
    });
});
