import { CreateTransaction } from '@application/use-cases/CreateTransaction';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { Transaction } from '@domain/entities/Transaction';

function makeRepo(): jest.Mocked<ITransactionRepository> {
    return {
        save: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        findByType: jest.fn(),
        findByCategory: jest.fn(),
        findByDateRange: jest.fn(),
        findByUserAndMonth: jest.fn(),
        computeCarryover: jest.fn(),
        delete: jest.fn(),
        patchTransaction: jest.fn(),
    } as jest.Mocked<ITransactionRepository>;
}

describe('CreateTransaction', () => {
    it('creates and saves a transaction', async () => {
        const repo = makeRepo();
        const useCase = new CreateTransaction(repo);

        const result = await useCase.execute({
            description: 'Coffee',
            amount: 3.5,
            type: 'expense',
            category: 'Food',
        });

        expect(result).toBeInstanceOf(Transaction);
        expect(result.description).toBe('Coffee');
        expect(result.amount.value).toBe(3.5);
        expect(repo.save).toHaveBeenCalledWith(result);
    });

    it('uses provided date when given', async () => {
        const repo = makeRepo();
        const useCase = new CreateTransaction(repo);
        const dateStr = '2025-06-15';

        const result = await useCase.execute({
            description: 'Rent',
            amount: 800,
            type: 'expense',
            category: 'Vivienda',
            date: dateStr,
        });

        expect(result.date.toISOString().startsWith('2025-06-15')).toBe(true);
    });
});
