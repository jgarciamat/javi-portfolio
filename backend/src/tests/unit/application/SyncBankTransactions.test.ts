import { SyncBankTransactions } from '@application/use-cases/SyncBankTransactions';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { OpenBankingService, BankTransaction } from '@infrastructure/openbanking/OpenBankingService';

function makeRepo(): jest.Mocked<ITransactionRepository> {
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
    } as jest.Mocked<ITransactionRepository>;
}

function makeBankTx(overrides: Partial<BankTransaction> = {}): BankTransaction {
    return {
        transactionId: 'tx-1',
        bookingDate: '2025-03-10',
        valueDate: '2025-03-10',
        amount: 100,
        currency: 'EUR',
        remittanceInfo: 'nómina',
        type: 'income',
        ...overrides,
    };
}

describe('SyncBankTransactions', () => {
    it('syncs transactions from the bank and saves them', async () => {
        const bankTxs = [makeBankTx(), makeBankTx({ transactionId: 'tx-2', type: 'expense', remittanceInfo: 'supermercado' })];
        const openBanking = { getTransactions: jest.fn().mockResolvedValue(bankTxs) } as unknown as OpenBankingService;
        const repo = makeRepo();
        const useCase = new SyncBankTransactions(repo, openBanking);

        const result = await useCase.execute('acc-1', '2025-03-01', '2025-03-31');

        expect(result.synced).toBe(2);
        expect(result.skipped).toBe(0);
        expect(repo.save).toHaveBeenCalledTimes(2);
    });

    it('skips transactions that fail to save', async () => {
        const bankTxs = [makeBankTx()];
        const openBanking = { getTransactions: jest.fn().mockResolvedValue(bankTxs) } as unknown as OpenBankingService;
        const repo = makeRepo();
        repo.save.mockRejectedValue(new Error('DB error'));
        const useCase = new SyncBankTransactions(repo, openBanking);

        const result = await useCase.execute('acc-1');

        expect(result.synced).toBe(0);
        expect(result.skipped).toBe(1);
    });

    it('infers correct categories from bank remittance info', async () => {
        const cases: Array<{ remittanceInfo: string; creditorName?: string; expectedCategory: string; type: 'income' | 'expense' }> = [
            { remittanceInfo: 'nomina empresa', expectedCategory: 'Salario', type: 'income' },
            { remittanceInfo: 'alquiler piso', expectedCategory: 'Vivienda', type: 'expense' },
            { remittanceInfo: 'mercadona compra', expectedCategory: 'Alimentación', type: 'expense' },
            { remittanceInfo: 'Netflix suscripcion', expectedCategory: 'Suscripciones', type: 'expense' },
            { remittanceInfo: 'gasolina repsol', expectedCategory: 'Transporte', type: 'expense' },
            { remittanceInfo: 'gimnasio gym', expectedCategory: 'Salud', type: 'expense' },
            { remittanceInfo: 'restaurante la tasca', expectedCategory: 'Restaurantes', type: 'expense' },
            { remittanceInfo: 'random payment', expectedCategory: 'Otros gastos', type: 'expense' },
            { remittanceInfo: 'random income', expectedCategory: 'Otros ingresos', type: 'income' },
        ];

        for (const c of cases) {
            const bankTx = makeBankTx({ remittanceInfo: c.remittanceInfo, creditorName: c.creditorName, type: c.type });
            const openBanking = { getTransactions: jest.fn().mockResolvedValue([bankTx]) } as unknown as OpenBankingService;
            const repo = makeRepo();
            const useCase = new SyncBankTransactions(repo, openBanking);

            const result = await useCase.execute('acc-1');

            expect(result.transactions[0].category).toBe(c.expectedCategory);
        }
    });

    it('uses creditorName when remittanceInfo is empty', async () => {
        const bankTx = makeBankTx({ remittanceInfo: '', creditorName: 'Some Shop', type: 'expense' });
        const openBanking = { getTransactions: jest.fn().mockResolvedValue([bankTx]) } as unknown as OpenBankingService;
        const repo = makeRepo();
        const useCase = new SyncBankTransactions(repo, openBanking);

        const result = await useCase.execute('acc-1');

        expect(result.transactions[0].description).toBe('Some Shop');
    });
});
