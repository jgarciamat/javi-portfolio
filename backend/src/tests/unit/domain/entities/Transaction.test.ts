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
});
