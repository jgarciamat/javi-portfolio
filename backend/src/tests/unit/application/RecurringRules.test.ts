import { CreateRecurringRule, GetRecurringRules, UpdateRecurringRule, DeleteRecurringRule } from '@application/use-cases/RecurringRules';
import { IRecurringRuleRepository } from '@domain/repositories/IRecurringRuleRepository';
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
    it('creates and saves a rule', () => {
        const repo = makeRepo();
        const rule = new CreateRecurringRule(repo).execute({
            userId: 'u1',
            description: 'Netflix',
            amount: 12.99,
            type: 'EXPENSE',
            category: 'Ocio',
            startYear: 2026,
            startMonth: 1,
        });
        expect(rule.description).toBe('Netflix');
        expect(repo.save).toHaveBeenCalledWith(rule);
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
