import { Transaction } from '@domain/entities/Transaction';

describe('Transaction entity', () => {
    test('create with valid data', () => {
        const tx = Transaction.create({
            description: 'Compra',
            amount: 12.5,
            type: 'expense',
            category: 'food',
            date: new Date(),
        });

        expect(tx.description).toBe('Compra');
        expect(tx.amount.value).toBe(12.5);
        expect(tx.type.value).toBe('EXPENSE');
        expect(tx.category).toBe('food');
        expect(typeof tx.id.value).toBe('string');
    });

    test('create throws on empty description', () => {
        expect(() =>
            Transaction.create({ description: '  ', amount: 1, type: 'income', category: 'x' })
        ).toThrow(/description/i);
    });

    test('create throws on empty category', () => {
        expect(() =>
            Transaction.create({ description: 'ok', amount: 1, type: 'income', category: ' ' })
        ).toThrow(/category/i);
    });

    test('toJSON outputs serializable values', () => {
        const tx = Transaction.create({
            description: 'Pago',
            amount: 20,
            type: 'income',
            category: 'salary',
            date: new Date('2025-01-01T00:00:00Z'),
        });

        const json = tx.toJSON();
        expect(json).toHaveProperty('id');
        expect(json).toHaveProperty('description', 'Pago');
        expect(json).toHaveProperty('amount', 20);
        expect(json).toHaveProperty('type', 'INCOME');
        expect(json).toHaveProperty('date');
    });

    // ── done / notes ──────────────────────────────────────────────────────────

    test('create defaults done=false and notes=null', () => {
        const tx = Transaction.create({ description: 'Test', amount: 5, type: 'expense', category: 'misc' });
        expect(tx.done).toBe(false);
        expect(tx.notes).toBeNull();
    });

    test('create with done=true and notes sets them', () => {
        const tx = Transaction.create({
            description: 'Paid bill',
            amount: 50,
            type: 'expense',
            category: 'bills',
            done: true,
            notes: 'Paid via bank transfer',
        });
        expect(tx.done).toBe(true);
        expect(tx.notes).toBe('Paid via bank transfer');
    });

    test('toJSON includes done and notes', () => {
        const tx = Transaction.create({
            description: 'Salary',
            amount: 1000,
            type: 'income',
            category: 'work',
            done: true,
            notes: 'Monthly salary',
        });
        const json = tx.toJSON();
        expect(json.done).toBe(true);
        expect(json.notes).toBe('Monthly salary');
    });

    test('toJSON done=false notes=null by default', () => {
        const tx = Transaction.create({ description: 'Bus', amount: 2, type: 'expense', category: 'transport' });
        const json = tx.toJSON();
        expect(json.done).toBe(false);
        expect(json.notes).toBeNull();
    });

    test('patch updates done', () => {
        const tx = Transaction.create({ description: 'Test', amount: 10, type: 'expense', category: 'misc' });
        expect(tx.done).toBe(false);
        tx.patch({ done: true });
        expect(tx.done).toBe(true);
    });

    test('patch updates notes', () => {
        const tx = Transaction.create({ description: 'Test', amount: 10, type: 'expense', category: 'misc' });
        tx.patch({ notes: 'Added a note' });
        expect(tx.notes).toBe('Added a note');
    });

    test('patch can set notes to null', () => {
        const tx = Transaction.create({ description: 'Test', amount: 10, type: 'expense', category: 'misc', notes: 'old note' });
        tx.patch({ notes: null });
        expect(tx.notes).toBeNull();
    });

    test('patch with no changes leaves values unchanged', () => {
        const tx = Transaction.create({ description: 'Test', amount: 10, type: 'expense', category: 'misc', done: true, notes: 'note' });
        tx.patch({});
        expect(tx.done).toBe(true);
        expect(tx.notes).toBe('note');
    });

    test('reconstitute preserves done and notes', () => {
        const original = Transaction.create({
            description: 'Rent',
            amount: 800,
            type: 'expense',
            category: 'housing',
            done: true,
            notes: 'Paid on time',
        });
        const json = original.toJSON();

        const { TransactionId } = require('@domain/value-objects/TransactionId');
        const { Amount } = require('@domain/value-objects/Amount');
        const { TransactionType } = require('@domain/value-objects/TransactionType');

        const restored = Transaction.reconstitute({
            id: TransactionId.create(json.id),
            description: json.description,
            amount: Amount.create(json.amount),
            type: TransactionType.create(json.type),
            category: json.category,
            date: new Date(json.date),
            createdAt: new Date(json.createdAt),
            done: json.done,
            notes: json.notes,
        });

        expect(restored.done).toBe(true);
        expect(restored.notes).toBe('Paid on time');
    });
});
