import { CustomAlert } from '@domain/entities/CustomAlert';

describe('CustomAlert entity', () => {
    const base = {
        userId: 'u1',
        name: 'Gastos altos',
        metric: 'expenses_pct',
        operator: 'gte',
        threshold: 80,
    };

    // ── create() ─────────────────────────────────────────────────────────────

    it('creates a valid alert with defaults', () => {
        const alert = CustomAlert.create(base);
        expect(alert.name).toBe('Gastos altos');
        expect(alert.metric).toBe('expenses_pct');
        expect(alert.operator).toBe('gte');
        expect(alert.threshold).toBe(80);
        expect(alert.category).toBeNull();
        expect(alert.active).toBe(true);
        expect(alert.id).toBeTruthy();
        expect(alert.createdAt).toBeInstanceOf(Date);
    });

    it('trims whitespace from name', () => {
        const alert = CustomAlert.create({ ...base, name: '  Alerta  ' });
        expect(alert.name).toBe('Alerta');
    });

    it('defaults active to true', () => {
        const alert = CustomAlert.create(base);
        expect(alert.active).toBe(true);
    });

    it('respects explicit active=false', () => {
        const alert = CustomAlert.create({ ...base, active: false });
        expect(alert.active).toBe(false);
    });

    it('creates a category_pct alert with category', () => {
        const alert = CustomAlert.create({
            ...base,
            metric: 'category_pct',
            category: 'Ocio',
        });
        expect(alert.category).toBe('Ocio');
    });

    it('sets category to null for non-category metrics', () => {
        const alert = CustomAlert.create({ ...base, metric: 'balance_amount', threshold: 500 });
        expect(alert.category).toBeNull();
    });

    it('accepts lte operator', () => {
        const alert = CustomAlert.create({ ...base, operator: 'lte' });
        expect(alert.operator).toBe('lte');
    });

    // ── Validation errors ─────────────────────────────────────────────────────

    it('throws for empty name', () => {
        expect(() => CustomAlert.create({ ...base, name: '' })).toThrow('name cannot be empty');
        expect(() => CustomAlert.create({ ...base, name: '   ' })).toThrow('name cannot be empty');
    });

    it('throws for invalid metric', () => {
        expect(() => CustomAlert.create({ ...base, metric: 'invalid_metric' })).toThrow('metric must be one of');
    });

    it('throws for invalid operator', () => {
        expect(() => CustomAlert.create({ ...base, operator: 'gt' })).toThrow('operator must be one of');
    });

    it('throws for NaN threshold', () => {
        expect(() => CustomAlert.create({ ...base, threshold: NaN })).toThrow('threshold must be a number');
    });

    it('throws for negative threshold', () => {
        expect(() => CustomAlert.create({ ...base, threshold: -1 })).toThrow('non-negative');
    });

    it('throws for category_pct without category', () => {
        expect(() => CustomAlert.create({ ...base, metric: 'category_pct' }))
            .toThrow('category is required for category_pct');
    });

    it('throws for category_pct with empty category', () => {
        expect(() => CustomAlert.create({ ...base, metric: 'category_pct', category: '   ' }))
            .toThrow('category is required for category_pct');
    });

    it('creates a category_amount alert with category', () => {
        const alert = CustomAlert.create({ ...base, metric: 'category_amount', category: 'Ocio', threshold: 150 });
        expect(alert.metric).toBe('category_amount');
        expect(alert.category).toBe('Ocio');
    });

    it('throws for category_amount without category', () => {
        expect(() => CustomAlert.create({ ...base, metric: 'category_amount', threshold: 150 }))
            .toThrow('category is required for category_amount');
    });

    it('throws for category_amount with empty category', () => {
        expect(() => CustomAlert.create({ ...base, metric: 'category_amount', category: '   ', threshold: 150 }))
            .toThrow('category is required for category_amount');
    });

    // ── reconstitute() ────────────────────────────────────────────────────────

    it('reconstitutes an alert from persisted props', () => {
        const props = {
            id: 'fixed-id',
            userId: 'u1',
            name: 'Balance bajo',
            metric: 'balance_amount' as const,
            operator: 'lte' as const,
            threshold: 200,
            category: null,
            active: false,
            createdAt: new Date('2025-01-01'),
        };
        const alert = CustomAlert.reconstitute(props);
        expect(alert.id).toBe('fixed-id');
        expect(alert.active).toBe(false);
        expect(alert.threshold).toBe(200);
        expect(alert.createdAt).toEqual(new Date('2025-01-01'));
    });

    // ── withActive / withProps ────────────────────────────────────────────────

    it('withActive returns new alert with updated active state', () => {
        const alert = CustomAlert.create(base);
        const toggled = alert.withActive(false);
        expect(toggled.active).toBe(false);
        expect(alert.active).toBe(true); // original unchanged
        expect(toggled.id).toBe(alert.id);
    });

    it('withProps returns new alert with updated fields', () => {
        const alert = CustomAlert.create(base);
        const updated = alert.withProps({ threshold: 90, name: 'Nuevo nombre' });
        expect(updated.threshold).toBe(90);
        expect(updated.name).toBe('Nuevo nombre');
        expect(alert.threshold).toBe(80); // original unchanged
    });

    // ── toJSON() ─────────────────────────────────────────────────────────────

    it('serialises createdAt as ISO string in toJSON()', () => {
        const alert = CustomAlert.create(base);
        const json = alert.toJSON();
        expect(typeof json.createdAt).toBe('string');
        expect(() => new Date(json.createdAt)).not.toThrow();
    });

    it('toJSON returns all fields', () => {
        const alert = CustomAlert.create({ ...base, threshold: 50 });
        const json = alert.toJSON();
        expect(json).toMatchObject({
            userId: 'u1',
            name: 'Gastos altos',
            metric: 'expenses_pct',
            operator: 'gte',
            threshold: 50,
            category: null,
            active: true,
        });
    });
});
