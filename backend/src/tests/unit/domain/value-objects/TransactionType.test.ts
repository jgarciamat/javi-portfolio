import { TransactionType } from '@domain/value-objects/TransactionType';

describe('TransactionType', () => {
    describe('creation', () => {
        it('should create INCOME type', () => {
            const t = TransactionType.create('INCOME');
            expect(t.value).toBe('INCOME');
            expect(t.isIncome()).toBe(true);
            expect(t.isExpense()).toBe(false);
        });

        it('should create EXPENSE type', () => {
            const t = TransactionType.create('EXPENSE');
            expect(t.value).toBe('EXPENSE');
            expect(t.isIncome()).toBe(false);
            expect(t.isExpense()).toBe(true);
        });

        it('should be case-insensitive', () => {
            const t = TransactionType.create('income');
            expect(t.value).toBe('INCOME');
        });

        it('should throw for invalid type', () => {
            expect(() => TransactionType.create('TRANSFER' as any)).toThrow(
                'Invalid transaction type: TRANSFER'
            );
        });

        it('should throw for empty type', () => {
            expect(() => TransactionType.create('')).toThrow(
                'TransactionType cannot be empty'
            );
        });
    });

    describe('factory methods', () => {
        it('should create income via static method', () => {
            const t = TransactionType.income();
            expect(t.isIncome()).toBe(true);
        });

        it('should create expense via static method', () => {
            const t = TransactionType.expense();
            expect(t.isExpense()).toBe(true);
        });
    });

    describe('equality', () => {
        it('should be equal when same type', () => {
            expect(TransactionType.income().equals(TransactionType.income())).toBe(true);
        });

        it('should not be equal when different type', () => {
            expect(TransactionType.income().equals(TransactionType.expense())).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return string value', () => {
            expect(TransactionType.income().toString()).toBe('INCOME');
            expect(TransactionType.expense().toString()).toBe('EXPENSE');
        });
    });
});
