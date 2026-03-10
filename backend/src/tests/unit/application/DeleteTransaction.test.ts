import { DeleteTransaction } from '@application/use-cases/DeleteTransaction';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { Transaction } from '@domain/entities/Transaction';

function makeRepo(overrides: Partial<ITransactionRepository> = {}): jest.Mocked<ITransactionRepository> {
    return {
        save: jest.fn(),
        saveForUser: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        findByType: jest.fn(),
        findByCategory: jest.fn(),
        findByDateRange: jest.fn(),
        findByUserAndMonth: jest.fn(),
        computeCarryover: jest.fn(),
        delete: jest.fn(),
        patchTransaction: jest.fn(),
        deleteByRecurringRule: jest.fn(),
        deleteAllByUser: jest.fn(),
        ...overrides,
    } as jest.Mocked<ITransactionRepository>;
}

const existingTx = Transaction.create({ description: 'Coffee', amount: 3.5, type: 'expense', category: 'Food' });

describe('DeleteTransaction', () => {
    it('deletes a transaction when it exists', async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(existingTx) });
        const useCase = new DeleteTransaction(repo);

        await useCase.execute(existingTx.id.value);

        expect(repo.delete).toHaveBeenCalledWith(existingTx.id.value);
    });

    it('throws when the transaction does not exist', async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new DeleteTransaction(repo);

        await expect(useCase.execute('non-existent-id'))
            .rejects.toThrow('Transaction with id non-existent-id not found');
    });
});
