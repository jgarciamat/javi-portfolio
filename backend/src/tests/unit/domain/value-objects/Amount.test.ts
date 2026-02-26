import { Amount } from '@domain/value-objects/Amount';

describe('Amount', () => {
    describe('creation', () => {
        it('should create a valid amount', () => {
            const a = Amount.create(100);
            expect(a.value).toBe(100);
        });

        it('should round to 2 decimal places', () => {
            const a = Amount.create(10.005);
            expect(a.value).toBe(10.01);
        });

        it('should allow zero', () => {
            const a = Amount.create(0);
            expect(a.value).toBe(0);
        });

        it('should throw for negative amount', () => {
            expect(() => Amount.create(-1)).toThrow('Amount cannot be negative');
        });

        it('should throw for NaN', () => {
            expect(() => Amount.create(NaN)).toThrow('Amount must be a valid number');
        });
    });

    describe('operations', () => {
        it('should add two amounts', () => {
            const result = Amount.create(100).add(Amount.create(50));
            expect(result.value).toBe(150);
        });

        it('should subtract two amounts', () => {
            const result = Amount.create(100).subtract(Amount.create(30));
            expect(result.value).toBe(70);
        });
    });

    describe('equality', () => {
        it('should be equal when same value', () => {
            expect(Amount.create(100).equals(Amount.create(100))).toBe(true);
        });

        it('should not be equal when different values', () => {
            expect(Amount.create(100).equals(Amount.create(200))).toBe(false);
        });
    });

    describe('toString', () => {
        it('should format to 2 decimal places', () => {
            expect(Amount.create(50).toString()).toBe('50.00');
            expect(Amount.create(99.9).toString()).toBe('99.90');
        });
    });
});
