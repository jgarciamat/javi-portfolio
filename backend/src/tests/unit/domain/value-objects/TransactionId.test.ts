import { TransactionId } from '@domain/value-objects/TransactionId';

describe('TransactionId', () => {
    describe('creation', () => {
        it('should create a TransactionId with provided value', () => {
            const id = TransactionId.create('123e4567-e89b-12d3-a456-426614174000');
            expect(id.value).toBe('123e4567-e89b-12d3-a456-426614174000');
        });

        it('should create a TransactionId with auto-generated UUID', () => {
            const id = TransactionId.generate();
            expect(id.value).toBeDefined();
            expect(id.value.length).toBeGreaterThan(0);
            expect(id.value).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
        });

        it('should throw error for empty id', () => {
            expect(() => TransactionId.create('')).toThrow('TransactionId cannot be empty');
        });

        it('should throw error for null id', () => {
            expect(() => TransactionId.create(null as any)).toThrow('TransactionId cannot be empty');
        });

        it('should throw error for undefined id', () => {
            expect(() => TransactionId.create(undefined as any)).toThrow('TransactionId cannot be empty');
        });
    });

    describe('equality', () => {
        it('should be equal when values are the same', () => {
            const id1 = TransactionId.create('test-id-123');
            const id2 = TransactionId.create('test-id-123');
            expect(id1.equals(id2)).toBe(true);
        });

        it('should not be equal when values are different', () => {
            const id1 = TransactionId.create('test-id-123');
            const id2 = TransactionId.create('test-id-456');
            expect(id1.equals(id2)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the string representation', () => {
            const id = TransactionId.create('test-id-123');
            expect(id.toString()).toBe('test-id-123');
        });
    });
});
