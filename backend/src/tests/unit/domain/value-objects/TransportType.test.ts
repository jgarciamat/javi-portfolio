import { TransportType } from '@domain/value-objects/TransportType';

describe('TransportType', () => {
    describe('create', () => {
        it('creates PLANE', () => {
            const t = TransportType.create('PLANE');
            expect(t.value).toBe('PLANE');
            expect(t.isPlane()).toBe(true);
            expect(t.isTruck()).toBe(false);
            expect(t.isVan()).toBe(false);
        });

        it('creates TRUCK', () => {
            const t = TransportType.create('TRUCK');
            expect(t.value).toBe('TRUCK');
            expect(t.isTruck()).toBe(true);
            expect(t.isPlane()).toBe(false);
            expect(t.isVan()).toBe(false);
        });

        it('creates VAN', () => {
            const t = TransportType.create('VAN');
            expect(t.value).toBe('VAN');
            expect(t.isVan()).toBe(true);
            expect(t.isPlane()).toBe(false);
            expect(t.isTruck()).toBe(false);
        });

        it('is case-insensitive', () => {
            expect(TransportType.create('plane').value).toBe('PLANE');
            expect(TransportType.create('truck').value).toBe('TRUCK');
            expect(TransportType.create('van').value).toBe('VAN');
        });

        it('throws for empty string', () => {
            expect(() => TransportType.create('')).toThrow('Transport type cannot be empty');
        });

        it('throws for whitespace-only string', () => {
            expect(() => TransportType.create('   ')).toThrow('Transport type cannot be empty');
        });

        it('throws for invalid value', () => {
            expect(() => TransportType.create('BOAT')).toThrow('Invalid transport type: BOAT');
        });
    });

    describe('equals', () => {
        it('returns true for same type', () => {
            expect(TransportType.create('PLANE').equals(TransportType.create('PLANE'))).toBe(true);
        });

        it('returns false for different types', () => {
            expect(TransportType.create('PLANE').equals(TransportType.create('TRUCK'))).toBe(false);
        });
    });

    describe('toString', () => {
        it('returns string value', () => {
            expect(TransportType.create('VAN').toString()).toBe('VAN');
        });
    });
});
