import { GetTransactions } from '@application/use-cases/GetTransactions';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { Transaction } from '@domain/entities/Transaction';

function makeRepo(overrides: Partial<ITransactionRepository> = {}): jest.Mocked<ITransactionRepository> {
    return {
        save: jest.fn(),
        saveForUser: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn().mockResolvedValue([]),
        findByType: jest.fn().mockResolvedValue([]),
        findByCategory: jest.fn().mockResolvedValue([]),
        findByDateRange: jest.fn().mockResolvedValue([]),
        findByUserAndMonth: jest.fn(),
        computeCarryover: jest.fn(),
        delete: jest.fn(),
        patchTransaction: jest.fn(),
        deleteByRecurringRule: jest.fn(),
        deleteAllByUser: jest.fn(),
        ...overrides,
    } as jest.Mocked<ITransactionRepository>;
}

const tx = Transaction.create({ description: 'Coffee', amount: 3.5, type: 'expense', category: 'Food' });

describe('GetTransactions', () => {
    it('returns all transactions when no filter is provided', async () => {
        const repo = makeRepo({ findAll: jest.fn().mockResolvedValue([tx]) });
        const useCase = new GetTransactions(repo);

        const result = await useCase.execute();

        expect(repo.findAll).toHaveBeenCalled();
        expect(result).toHaveLength(1);
    });

    it('returns all transactions when filter is empty object', async () => {
        const repo = makeRepo({ findAll: jest.fn().mockResolvedValue([tx]) });
        const useCase = new GetTransactions(repo);

        const result = await useCase.execute({});

        expect(repo.findAll).toHaveBeenCalled();
        expect(result).toHaveLength(1);
    });

    it('filters by date range when from and to are provided', async () => {
        const repo = makeRepo({ findByDateRange: jest.fn().mockResolvedValue([tx]) });
        const useCase = new GetTransactions(repo);

        const result = await useCase.execute({ from: '2025-01-01', to: '2025-01-31' });

        expect(repo.findByDateRange).toHaveBeenCalled();
        expect(result).toHaveLength(1);
    });

    it('filters by type', async () => {
        const repo = makeRepo({ findByType: jest.fn().mockResolvedValue([tx]) });
        const useCase = new GetTransactions(repo);

        const result = await useCase.execute({ type: 'expense' });

        expect(repo.findByType).toHaveBeenCalledWith('EXPENSE');
        expect(result).toHaveLength(1);
    });

    it('filters by category', async () => {
        const repo = makeRepo({ findByCategory: jest.fn().mockResolvedValue([tx]) });
        const useCase = new GetTransactions(repo);

        await useCase.execute({ category: 'Food' });

        expect(repo.findByCategory).toHaveBeenCalledWith('Food');
    });
});
