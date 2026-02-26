import { MonthlyBudget, MonthlyBudgetProps } from '@domain/entities/MonthlyBudget';

const baseProps: MonthlyBudgetProps = {
    id: 'budget-id-001',
    userId: 'user-id-001',
    year: 2024,
    month: 3,
    initialAmount: 500,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
};

describe('MonthlyBudget entity', () => {
    describe('create', () => {
        it('should create a valid budget', () => {
            const budget = MonthlyBudget.create({ ...baseProps });
            expect(budget.id).toBe('budget-id-001');
            expect(budget.userId).toBe('user-id-001');
            expect(budget.year).toBe(2024);
            expect(budget.month).toBe(3);
            expect(budget.initialAmount).toBe(500);
        });

        it('should allow month=1 (January)', () => {
            const budget = MonthlyBudget.create({ ...baseProps, month: 1 });
            expect(budget.month).toBe(1);
        });

        it('should allow month=12 (December)', () => {
            const budget = MonthlyBudget.create({ ...baseProps, month: 12 });
            expect(budget.month).toBe(12);
        });

        it('should throw when month < 1', () => {
            expect(() => MonthlyBudget.create({ ...baseProps, month: 0 })).toThrow('Month must be between 1 and 12');
        });

        it('should throw when month > 12', () => {
            expect(() => MonthlyBudget.create({ ...baseProps, month: 13 })).toThrow('Month must be between 1 and 12');
        });
    });

    describe('updateAmount', () => {
        it('should update the initial amount', () => {
            const budget = MonthlyBudget.create({ ...baseProps });
            budget.updateAmount(1000);
            expect(budget.initialAmount).toBe(1000);
        });

        it('should update the updatedAt timestamp', () => {
            const before = new Date();
            const budget = MonthlyBudget.create({ ...baseProps });
            budget.updateAmount(999);
            expect(budget.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });
    });

    describe('label', () => {
        it('should return YYYY-MM format', () => {
            const budget = MonthlyBudget.create({ ...baseProps });
            expect(budget.label).toBe('2024-03');
        });

        it('should pad single-digit months', () => {
            const budget = MonthlyBudget.create({ ...baseProps, month: 1 });
            expect(budget.label).toBe('2024-01');
        });
    });

    describe('toJSON', () => {
        it('should return all public fields', () => {
            const budget = MonthlyBudget.create({ ...baseProps });
            const json = budget.toJSON();
            expect(json).toEqual({
                id: 'budget-id-001',
                userId: 'user-id-001',
                year: 2024,
                month: 3,
                initialAmount: 500,
                label: '2024-03',
            });
        });
    });
});
