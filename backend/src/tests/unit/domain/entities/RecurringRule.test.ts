import { RecurringRule } from '@domain/entities/RecurringRule';

describe('RecurringRule entity', () => {
    const base = {
        userId: 'u1',
        description: 'Salario',
        amount: 1500,
        type: 'income',
        category: 'Salario',
        startYear: 2026,
        startMonth: 1,
    };

    it('creates a valid rule with defaults', () => {
        const rule = RecurringRule.create(base);
        expect(rule.description).toBe('Salario');
        expect(rule.amount).toBe(1500);
        expect(rule.type).toBe('INCOME');
        expect(rule.frequency).toBe('monthly');
        expect(rule.active).toBe(true);
        expect(rule.endYear).toBeNull();
        expect(rule.endMonth).toBeNull();
    });

    it('normalises type to uppercase', () => {
        const rule = RecurringRule.create({ ...base, type: 'expense' });
        expect(rule.type).toBe('EXPENSE');
    });

    it('accepts bimonthly frequency', () => {
        const rule = RecurringRule.create({ ...base, frequency: 'bimonthly' });
        expect(rule.frequency).toBe('bimonthly');
    });

    it('accepts explicit end date', () => {
        const rule = RecurringRule.create({ ...base, endYear: 2026, endMonth: 12 });
        expect(rule.endYear).toBe(2026);
        expect(rule.endMonth).toBe(12);
    });

    it('throws for empty description', () => {
        expect(() => RecurringRule.create({ ...base, description: '' })).toThrow('description cannot be empty');
    });

    it('throws for non-positive amount', () => {
        expect(() => RecurringRule.create({ ...base, amount: 0 })).toThrow('positive number');
        expect(() => RecurringRule.create({ ...base, amount: -5 })).toThrow('positive number');
    });

    it('throws for invalid type', () => {
        expect(() => RecurringRule.create({ ...base, type: 'DONATION' })).toThrow('type must be one of');
    });

    it('throws when end date is before start date', () => {
        expect(() => RecurringRule.create({ ...base, startYear: 2026, startMonth: 6, endYear: 2026, endMonth: 3 }))
            .toThrow('End date cannot be before start date');
    });

    it('throws for invalid startMonth', () => {
        expect(() => RecurringRule.create({ ...base, startMonth: 13 })).toThrow('startMonth must be between 1 and 12');
    });

    // ── appliesTo ─────────────────────────────────────────────────────────────

    describe('appliesTo', () => {
        it('returns true for month within range (monthly)', () => {
            const rule = RecurringRule.create({ ...base, startYear: 2026, startMonth: 1 });
            expect(rule.appliesTo(2026, 3)).toBe(true);
        });

        it('returns false before start month', () => {
            const rule = RecurringRule.create({ ...base, startYear: 2026, startMonth: 3 });
            expect(rule.appliesTo(2026, 2)).toBe(false);
        });

        it('returns false after end month', () => {
            const rule = RecurringRule.create({ ...base, startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 6 });
            expect(rule.appliesTo(2026, 7)).toBe(false);
        });

        it('returns true exactly on end month', () => {
            const rule = RecurringRule.create({ ...base, startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 6 });
            expect(rule.appliesTo(2026, 6)).toBe(true);
        });

        it('returns false when inactive', () => {
            const rule = RecurringRule.create({ ...base, active: false });
            expect(rule.appliesTo(2026, 3)).toBe(false);
        });

        it('bimonthly: fires on start month', () => {
            const rule = RecurringRule.create({ ...base, startYear: 2026, startMonth: 1, frequency: 'bimonthly' });
            expect(rule.appliesTo(2026, 1)).toBe(true);
        });

        it('bimonthly: skips month after start', () => {
            const rule = RecurringRule.create({ ...base, startYear: 2026, startMonth: 1, frequency: 'bimonthly' });
            expect(rule.appliesTo(2026, 2)).toBe(false);
        });

        it('bimonthly: fires 2 months after start', () => {
            const rule = RecurringRule.create({ ...base, startYear: 2026, startMonth: 1, frequency: 'bimonthly' });
            expect(rule.appliesTo(2026, 3)).toBe(true);
        });

        it('returns true forever when no end date', () => {
            const rule = RecurringRule.create({ ...base, startYear: 2026, startMonth: 1 });
            expect(rule.appliesTo(2040, 12)).toBe(true);
        });
    });

    it('toJSON returns plain object with all fields', () => {
        const rule = RecurringRule.create(base);
        const json = rule.toJSON();
        expect(json.description).toBe('Salario');
        expect(json.type).toBe('INCOME');
        expect(json.active).toBe(true);
        expect(typeof json.createdAt).toBe('string');
    });
});
