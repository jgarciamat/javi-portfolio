import { CreateRecurringRule, GetRecurringRules, UpdateRecurringRule, DeleteRecurringRule } from '@application/use-cases/RecurringRules';
import { IRecurringRuleRepository } from '@domain/repositories/IRecurringRuleRepository';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { RecurringRule } from '@domain/entities/RecurringRule';

function makeRepo(): jest.Mocked<IRecurringRuleRepository> {
    return {
        save: jest.fn(),
        findById: jest.fn(),
        findByUserId: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
}

function makeTxRepo(): jest.Mocked<ITransactionRepository> {
    return {
        save: jest.fn(),
        saveForUser: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn(),
        findAll: jest.fn(),
        findByType: jest.fn(),
        findByCategory: jest.fn(),
        findByDateRange: jest.fn(),
        findByUserAndMonth: jest.fn(),
        computeCarryover: jest.fn(),
        delete: jest.fn(),
        patchTransaction: jest.fn(),
    } as unknown as jest.Mocked<ITransactionRepository>;
}

function makeRule(overrides: Partial<Parameters<typeof RecurringRule.create>[0]> = {}) {
    return RecurringRule.create({
        userId: 'u1',
        description: 'Salario',
        amount: 1500,
        type: 'INCOME',
        category: 'Salario',
        startYear: 2026,
        startMonth: 1,
        ...overrides,
    });
}

describe('CreateRecurringRule', () => {
    it('creates and saves a rule, with no backfill for future-only start', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        // Start in the far future → no backfill months
        const rule = await new CreateRecurringRule(repo, txRepo).execute({
            userId: 'u1',
            description: 'Netflix',
            amount: 12.99,
            type: 'EXPENSE',
            category: 'Ocio',
            startYear: 2099,
            startMonth: 12,
        });
        expect(rule.description).toBe('Netflix');
        expect(repo.save).toHaveBeenCalledWith(rule);
        expect(txRepo.saveForUser).not.toHaveBeenCalled();
    });

    it('creates backfill transactions for past months up to today', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        // Start exactly 2 months ago (monthly) → expect 3 transactions (start, start+1, current)
        let startYear = currentYear;
        let startMonth = currentMonth - 2;
        if (startMonth <= 0) { startMonth += 12; startYear -= 1; }

        await new CreateRecurringRule(repo, txRepo).execute({
            userId: 'u1',
            description: 'Luz',
            amount: 30,
            type: 'EXPENSE',
            category: 'Hogar',
            startYear,
            startMonth,
        });

        expect(txRepo.saveForUser).toHaveBeenCalledTimes(3);
    });

    it('only backfills months within end date range', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        let startYear = currentYear;
        let startMonth = currentMonth - 2;
        if (startMonth <= 0) { startMonth += 12; startYear -= 1; }

        // end 1 month after start → only 2 transactions
        let endYear = startYear;
        let endMonth = startMonth + 1;
        if (endMonth > 12) { endMonth -= 12; endYear += 1; }

        await new CreateRecurringRule(repo, txRepo).execute({
            userId: 'u1',
            description: 'Gym',
            amount: 40,
            type: 'EXPENSE',
            category: 'Salud',
            startYear,
            startMonth,
            endYear,
            endMonth,
        });

        expect(txRepo.saveForUser).toHaveBeenCalledTimes(2);
    });
});

describe('GetRecurringRules', () => {
    it('returns all rules for user', () => {
        const repo = makeRepo();
        const rule = makeRule();
        repo.findByUserId.mockReturnValue([rule]);
        const result = new GetRecurringRules(repo).execute('u1');
        expect(result).toHaveLength(1);
        expect(repo.findByUserId).toHaveBeenCalledWith('u1');
    });
});

describe('UpdateRecurringRule', () => {
    it('updates and returns the rule', () => {
        const repo = makeRepo();
        const rule = makeRule();
        const updated = makeRule({ description: 'Salario actualizado' });
        repo.findById.mockReturnValue(rule);
        repo.update.mockReturnValue(updated);
        const result = new UpdateRecurringRule(repo).execute(rule.id, 'u1', { description: 'Salario actualizado' });
        expect(result.description).toBe('Salario actualizado');
    });

    it('throws when rule not found', () => {
        const repo = makeRepo();
        repo.findById.mockReturnValue(null);
        expect(() => new UpdateRecurringRule(repo).execute('missing', 'u1', {})).toThrow('not found');
    });

    it('throws Forbidden when userId does not match', () => {
        const repo = makeRepo();
        repo.findById.mockReturnValue(makeRule());
        expect(() => new UpdateRecurringRule(repo).execute('id', 'otherUser', {})).toThrow('Forbidden');
    });
});

describe('DeleteRecurringRule', () => {
    it('deletes the rule', () => {
        const repo = makeRepo();
        const rule = makeRule();
        repo.findById.mockReturnValue(rule);
        new DeleteRecurringRule(repo).execute(rule.id, 'u1');
        expect(repo.delete).toHaveBeenCalledWith(rule.id);
    });

    it('throws when rule not found', () => {
        const repo = makeRepo();
        repo.findById.mockReturnValue(null);
        expect(() => new DeleteRecurringRule(repo).execute('missing', 'u1')).toThrow('not found');
    });

    it('throws Forbidden when userId does not match', () => {
        const repo = makeRepo();
        repo.findById.mockReturnValue(makeRule());
        expect(() => new DeleteRecurringRule(repo).execute('id', 'otherUser')).toThrow('Forbidden');
    });
});
