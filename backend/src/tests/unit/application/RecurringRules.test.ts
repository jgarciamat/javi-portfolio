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
        deleteByRecurringRule: jest.fn().mockResolvedValue(undefined),
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
    it('returns all rules for user', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const rule = makeRule({ startYear: 2099, startMonth: 1 }); // future start → no backfill
        repo.findByUserId.mockReturnValue([rule]);
        const result = await new GetRecurringRules(repo, txRepo).execute('u1');
        expect(result).toHaveLength(1);
        expect(repo.findByUserId).toHaveBeenCalledWith('u1');
    });

    it('backfills missing months for active rules on get', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        let startYear = currentYear;
        let startMonth = currentMonth - 1;
        if (startMonth <= 0) { startMonth += 12; startYear -= 1; }

        const rule = makeRule({ startYear, startMonth });
        repo.findByUserId.mockReturnValue([rule]);
        await new GetRecurringRules(repo, txRepo).execute('u1');
        // Should attempt to backfill 2 months (startMonth and currentMonth)
        expect(txRepo.saveForUser).toHaveBeenCalledTimes(2);
    });

    it('does not backfill inactive rules', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const now = new Date();
        const rule = makeRule({ startYear: now.getFullYear(), startMonth: now.getMonth() + 1, active: false });
        repo.findByUserId.mockReturnValue([rule]);
        await new GetRecurringRules(repo, txRepo).execute('u1');
        expect(txRepo.saveForUser).not.toHaveBeenCalled();
    });
});

describe('UpdateRecurringRule', () => {
    it('updates and returns the rule', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const rule = makeRule();
        const updated = makeRule({ description: 'Salario actualizado' });
        repo.findById.mockReturnValue(rule);
        repo.update.mockReturnValue(updated);
        const result = await new UpdateRecurringRule(repo, txRepo).execute(rule.id, 'u1', { description: 'Salario actualizado' });
        expect(result.description).toBe('Salario actualizado');
    });

    it('throws when rule not found', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        repo.findById.mockReturnValue(null);
        await expect(new UpdateRecurringRule(repo, txRepo).execute('missing', 'u1', {})).rejects.toThrow('not found');
    });

    it('throws Forbidden when userId does not match', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        repo.findById.mockReturnValue(makeRule());
        await expect(new UpdateRecurringRule(repo, txRepo).execute('id', 'otherUser', {})).rejects.toThrow('Forbidden');
    });

    it('backfills transactions when startMonth moves earlier', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Original rule starts this month
        const original = makeRule({ startYear: currentYear, startMonth: currentMonth });
        // Updated rule starts 2 months earlier
        let newStartYear = currentYear;
        let newStartMonth = currentMonth - 2;
        if (newStartMonth <= 0) { newStartMonth += 12; newStartYear -= 1; }

        const updatedRule = makeRule({ startYear: newStartYear, startMonth: newStartMonth });
        repo.findById.mockReturnValue(original);
        repo.update.mockReturnValue(updatedRule);

        await new UpdateRecurringRule(repo, txRepo).execute(original.id, 'u1', { startYear: newStartYear, startMonth: newStartMonth });

        // Should backfill 2 months (the 2 months before the original start)
        expect(txRepo.saveForUser).toHaveBeenCalledTimes(2);
    });

    it('does not backfill when startMonth moves later', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const original = makeRule({ startYear: currentYear, startMonth: currentMonth - 1 <= 0 ? 1 : currentMonth - 1 });
        const updatedRule = makeRule({ startYear: currentYear, startMonth: currentMonth });
        repo.findById.mockReturnValue(original);
        repo.update.mockReturnValue(updatedRule);

        await new UpdateRecurringRule(repo, txRepo).execute(original.id, 'u1', { startMonth: currentMonth });

        expect(txRepo.saveForUser).not.toHaveBeenCalled();
    });
});

describe('DeleteRecurringRule', () => {
    it('deletes the rule with default scope=none (no transactions removed)', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const rule = makeRule();
        repo.findById.mockReturnValue(rule);
        await new DeleteRecurringRule(repo, txRepo).execute(rule.id, 'u1');
        expect(repo.delete).toHaveBeenCalledWith(rule.id);
        expect(txRepo.deleteByRecurringRule).not.toHaveBeenCalled();
    });

    it('scope=none: keeps all transactions', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const rule = makeRule();
        repo.findById.mockReturnValue(rule);
        await new DeleteRecurringRule(repo, txRepo).execute(rule.id, 'u1', 'none');
        expect(txRepo.deleteByRecurringRule).not.toHaveBeenCalled();
        expect(repo.delete).toHaveBeenCalledWith(rule.id);
    });

    it('scope=all: deletes all transactions for the rule', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const rule = makeRule();
        repo.findById.mockReturnValue(rule);
        await new DeleteRecurringRule(repo, txRepo).execute(rule.id, 'u1', 'all');
        expect(txRepo.deleteByRecurringRule).toHaveBeenCalledWith(rule.id, 'u1');
        expect(repo.delete).toHaveBeenCalledWith(rule.id);
    });

    it('scope=from_current: deletes transactions from next month onward (keeps current month)', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        const rule = makeRule();
        repo.findById.mockReturnValue(rule);
        const now = new Date();
        let nextMonth = now.getMonth() + 2; // +1 for 1-based, +1 for next month
        let nextYear = now.getFullYear();
        if (nextMonth > 12) { nextMonth = 1; nextYear++; }
        await new DeleteRecurringRule(repo, txRepo).execute(rule.id, 'u1', 'from_current');
        expect(txRepo.deleteByRecurringRule).toHaveBeenCalledWith(rule.id, 'u1', nextYear, nextMonth);
        expect(repo.delete).toHaveBeenCalledWith(rule.id);
    });

    it('throws when rule not found', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        repo.findById.mockReturnValue(null);
        await expect(new DeleteRecurringRule(repo, txRepo).execute('missing', 'u1')).rejects.toThrow('not found');
    });

    it('throws Forbidden when userId does not match', async () => {
        const repo = makeRepo();
        const txRepo = makeTxRepo();
        repo.findById.mockReturnValue(makeRule());
        await expect(new DeleteRecurringRule(repo, txRepo).execute('id', 'otherUser')).rejects.toThrow('Forbidden');
    });
});
