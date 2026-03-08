import { GetFinancialSummary } from '@application/use-cases/GetFinancialSummary';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { Transaction } from '@domain/entities/Transaction';

function makeRepo(overrides: Partial<ITransactionRepository> = {}): jest.Mocked<ITransactionRepository> {
    return {
        save: jest.fn(),
        saveForUser: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn().mockResolvedValue([]),
        findByType: jest.fn(),
        findByCategory: jest.fn(),
        findByDateRange: jest.fn().mockResolvedValue([]),
        findByUserAndMonth: jest.fn(),
        computeCarryover: jest.fn(),
        delete: jest.fn(),
        patchTransaction: jest.fn(),
        ...overrides,
    } as jest.Mocked<ITransactionRepository>;
}

function makeTx(type: 'income' | 'expense', amount: number, category = 'Alimentación'): Transaction {
    return Transaction.create({ description: 'tx', amount, type, category });
}

describe('GetFinancialSummary', () => {
    it('returns summary with totals from all transactions (no date filter)', async () => {
        const txs = [makeTx('income', 1000, 'Salario'), makeTx('expense', 300, 'Alimentación')];
        const repo = makeRepo({ findAll: jest.fn().mockResolvedValue(txs) });
        const useCase = new GetFinancialSummary(repo);

        const result = await useCase.execute();

        expect(result.totalIncome).toBe(1000);
        expect(result.totalExpenses).toBe(300);
        expect(result.balance).toBe(700);
        expect(result.savingsRate).toBeCloseTo(70, 0);
        expect(result.transactionCount).toBe(2);
        expect(result.incomeByCategory['Salario']).toBe(1000);
        expect(result.expensesByCategory['Alimentación']).toBe(300);
    });

    it('uses date range when from and to are provided', async () => {
        const txs = [makeTx('income', 500)];
        const repo = makeRepo({ findByDateRange: jest.fn().mockResolvedValue(txs) });
        const useCase = new GetFinancialSummary(repo);

        const result = await useCase.execute('2025-01-01', '2025-01-31');

        expect(result.totalIncome).toBe(500);
        expect(repo.findByDateRange).toHaveBeenCalled();
    });

    it('returns savingsRate of 0 when there is no income', async () => {
        const txs = [makeTx('expense', 200)];
        const repo = makeRepo({ findAll: jest.fn().mockResolvedValue(txs) });
        const useCase = new GetFinancialSummary(repo);

        const result = await useCase.execute();

        expect(result.savingsRate).toBe(0);
    });

    it('returns empty summary when no transactions exist', async () => {
        const repo = makeRepo();
        const useCase = new GetFinancialSummary(repo);

        const result = await useCase.execute();

        expect(result.totalIncome).toBe(0);
        expect(result.totalExpenses).toBe(0);
        expect(result.balance).toBe(0);
        expect(result.transactionCount).toBe(0);
    });
});
