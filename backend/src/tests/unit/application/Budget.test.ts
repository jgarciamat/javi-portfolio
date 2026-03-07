import { SetMonthlyBudget, GetMonthlyBudget } from '@application/use-cases/Budget';
import { MonthlyBudget } from '@domain/entities/MonthlyBudget';
import { IMonthlyBudgetRepository } from '@domain/repositories/IMonthlyBudgetRepository';

function makeRepo(overrides: Partial<IMonthlyBudgetRepository> = {}): jest.Mocked<IMonthlyBudgetRepository> {
    return {
        save: jest.fn(),
        findByUserAndMonth: jest.fn(),
        findAllByUser: jest.fn(),
        ...overrides,
    } as jest.Mocked<IMonthlyBudgetRepository>;
}

function makeBudget(overrides: Partial<Parameters<typeof MonthlyBudget.create>[0]> = {}): MonthlyBudget {
    return MonthlyBudget.create({
        id: 'bud-1',
        userId: 'user-1',
        year: 2025,
        month: 3,
        initialAmount: 1000,
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date('2025-03-01'),
        ...overrides,
    });
}

// ── SetMonthlyBudget ──────────────────────────────────────────────────────────

describe('SetMonthlyBudget', () => {
    it('creates a new budget when none exists', async () => {
        const repo = makeRepo({ findByUserAndMonth: jest.fn().mockResolvedValue(null) });
        const useCase = new SetMonthlyBudget(repo);

        const result = await useCase.execute('user-1', 2025, 3, 1500);

        expect(result.initialAmount).toBe(1500);
        expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('updates the amount when a budget already exists', async () => {
        const existing = makeBudget({ initialAmount: 1000 });
        const repo = makeRepo({ findByUserAndMonth: jest.fn().mockResolvedValue(existing) });
        const useCase = new SetMonthlyBudget(repo);

        const result = await useCase.execute('user-1', 2025, 3, 2000);

        expect(result.initialAmount).toBe(2000);
        expect(repo.save).toHaveBeenCalledWith(existing);
    });
});

// ── GetMonthlyBudget ──────────────────────────────────────────────────────────

describe('GetMonthlyBudget', () => {
    it('returns the budget for the given month', async () => {
        const budget = makeBudget();
        const repo = makeRepo({ findByUserAndMonth: jest.fn().mockResolvedValue(budget) });
        const useCase = new GetMonthlyBudget(repo);

        const result = await useCase.execute('user-1', 2025, 3);

        expect(result).toBe(budget);
    });

    it('returns null when no budget exists', async () => {
        const repo = makeRepo({ findByUserAndMonth: jest.fn().mockResolvedValue(null) });
        const useCase = new GetMonthlyBudget(repo);

        const result = await useCase.execute('user-1', 2025, 3);

        expect(result).toBeNull();
    });

    it('returns all budgets for a user via getHistory', async () => {
        const budgets = [makeBudget({ month: 1 }), makeBudget({ month: 2 })];
        const repo = makeRepo({ findAllByUser: jest.fn().mockResolvedValue(budgets) });
        const useCase = new GetMonthlyBudget(repo);

        const result = await useCase.getHistory('user-1');

        expect(result).toHaveLength(2);
        expect(repo.findAllByUser).toHaveBeenCalledWith('user-1');
    });
});
