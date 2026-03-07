import { CheckBudgetAlerts } from '@application/use-cases/CheckBudgetAlerts';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { Transaction } from '@domain/entities/Transaction';

function makeTxRepo(overrides: Partial<ITransactionRepository> = {}): jest.Mocked<ITransactionRepository> {
    return {
        save: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        findByType: jest.fn(),
        findByCategory: jest.fn(),
        findByDateRange: jest.fn(),
        findByUserAndMonth: jest.fn(),
        computeCarryover: jest.fn().mockReturnValue(0),
        delete: jest.fn(),
        patchTransaction: jest.fn(),
        ...overrides,
    } as jest.Mocked<ITransactionRepository>;
}

function makeTx(type: 'income' | 'expense', amount: number, category = 'Alimentación'): Transaction {
    return Transaction.create({ description: 'test', amount, type, category });
}

describe('CheckBudgetAlerts', () => {
    it('returns empty array when budgetAmount <= 0', async () => {
        const repo = makeTxRepo({
            computeCarryover: jest.fn().mockReturnValue(0),
            findByUserAndMonth: jest.fn().mockResolvedValue([]),
        });
        const useCase = new CheckBudgetAlerts(repo);

        const alerts = await useCase.execute('u1', 2025, 3);

        expect(alerts).toEqual([]);
    });

    it('returns no alerts when expenses are below 80%', async () => {
        const repo = makeTxRepo({
            computeCarryover: jest.fn().mockReturnValue(0),
            findByUserAndMonth: jest.fn().mockResolvedValue([
                makeTx('income', 1000),
                makeTx('expense', 500),
            ]),
        });
        const useCase = new CheckBudgetAlerts(repo);

        const alerts = await useCase.execute('u1', 2025, 3);

        expect(alerts.filter(a => a.category === null)).toHaveLength(0);
    });

    it('returns warning when expenses are >= 80% of budget', async () => {
        const repo = makeTxRepo({
            computeCarryover: jest.fn().mockReturnValue(0),
            findByUserAndMonth: jest.fn().mockResolvedValue([
                makeTx('income', 1000),
                makeTx('expense', 850),
            ]),
        });
        const useCase = new CheckBudgetAlerts(repo);

        const alerts = await useCase.execute('u1', 2025, 3);

        const globalAlert = alerts.find(a => a.category === null);
        expect(globalAlert).toBeDefined();
        expect(globalAlert!.level).toBe('warning');
    });

    it('returns danger when expenses exceed budget (>= 100%)', async () => {
        const repo = makeTxRepo({
            computeCarryover: jest.fn().mockReturnValue(0),
            findByUserAndMonth: jest.fn().mockResolvedValue([
                makeTx('income', 1000),
                makeTx('expense', 1100),
            ]),
        });
        const useCase = new CheckBudgetAlerts(repo);

        const alerts = await useCase.execute('u1', 2025, 3);

        const globalAlert = alerts.find(a => a.category === null);
        expect(globalAlert).toBeDefined();
        expect(globalAlert!.level).toBe('danger');
    });

    it('adds category warning when a category > 30% of budget', async () => {
        const repo = makeTxRepo({
            computeCarryover: jest.fn().mockReturnValue(0),
            findByUserAndMonth: jest.fn().mockResolvedValue([
                makeTx('income', 1000),
                makeTx('expense', 400, 'Ocio'),
            ]),
        });
        const useCase = new CheckBudgetAlerts(repo);

        const alerts = await useCase.execute('u1', 2025, 3);

        const catAlert = alerts.find(a => a.category === 'Ocio');
        expect(catAlert).toBeDefined();
    });

    it('adds category danger when a category > 40% of budget', async () => {
        const repo = makeTxRepo({
            computeCarryover: jest.fn().mockReturnValue(0),
            findByUserAndMonth: jest.fn().mockResolvedValue([
                makeTx('income', 1000),
                makeTx('expense', 450, 'Ocio'),
            ]),
        });
        const useCase = new CheckBudgetAlerts(repo);

        const alerts = await useCase.execute('u1', 2025, 3);

        const catAlert = alerts.find(a => a.category === 'Ocio');
        expect(catAlert!.level).toBe('danger');
    });

    it('uses carryover in budget calculation', async () => {
        const repo = makeTxRepo({
            computeCarryover: jest.fn().mockReturnValue(500),
            findByUserAndMonth: jest.fn().mockResolvedValue([
                makeTx('income', 500),
                makeTx('expense', 850),
            ]),
        });
        const useCase = new CheckBudgetAlerts(repo);

        // total budget = 500 carryover + 500 income = 1000, expenses = 850 → 85% → warning
        const alerts = await useCase.execute('u1', 2025, 3);

        const globalAlert = alerts.find(a => a.category === null);
        expect(globalAlert).toBeDefined();
        expect(globalAlert!.level).toBe('warning');
    });
});
