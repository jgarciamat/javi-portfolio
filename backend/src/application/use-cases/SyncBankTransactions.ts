import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { Transaction } from '@domain/entities/Transaction';
import { OpenBankingService, BankTransaction } from '@infrastructure/openbanking/OpenBankingService';

/** Maps bank transaction remittance info / creditor name to a category */
function inferCategory(tx: BankTransaction): string {
    const text = `${tx.remittanceInfo} ${tx.creditorName ?? ''} ${tx.debtorName ?? ''}`.toLowerCase();

    if (text.includes('nomina') || text.includes('nómina') || text.includes('salario')) return 'Salario';
    if (text.includes('alquiler') || text.includes('rent') || text.includes('arrendamiento')) return 'Vivienda';
    if (text.includes('mercadona') || text.includes('lidl') || text.includes('carrefour') || text.includes('supermercado')) return 'Alimentación';
    if (text.includes('netflix') || text.includes('spotify') || text.includes('hbo') || text.includes('amazon prime')) return 'Suscripciones';
    if (text.includes('gasolina') || text.includes('repsol') || text.includes('cepsa') || text.includes('bp')) return 'Transporte';
    if (text.includes('gym') || text.includes('gimnasio') || text.includes('médico') || text.includes('farmacia')) return 'Salud';
    if (text.includes('restaurante') || text.includes('bar ') || text.includes('cafeteria')) return 'Restaurantes';

    return tx.type === 'income' ? 'Otros ingresos' : 'Otros gastos';
}

export interface SyncResult {
    synced: number;
    skipped: number;
    transactions: { description: string; amount: number; type: string; category: string; date: string }[];
}

export class SyncBankTransactions {
    constructor(
        private readonly transactionRepo: ITransactionRepository,
        private readonly openBankingService: OpenBankingService,
    ) { }

    async execute(accountId: string, dateFrom?: string, dateTo?: string): Promise<SyncResult> {
        const bankTxs = await this.openBankingService.getTransactions(accountId, dateFrom, dateTo);

        let synced = 0;
        let skipped = 0;
        const result: SyncResult['transactions'] = [];

        for (const bankTx of bankTxs) {
            try {
                const description = bankTx.creditorName ?? bankTx.debtorName ?? bankTx.remittanceInfo ?? 'Transacción bancaria';
                const category = inferCategory(bankTx);

                const tx = Transaction.create({
                    description: description.slice(0, 100),
                    amount: bankTx.amount,
                    type: bankTx.type,
                    category,
                    date: new Date(bankTx.bookingDate),
                    notes: `Importado desde banco | Ref: ${bankTx.transactionId}`,
                });

                await this.transactionRepo.save(tx);
                synced++;
                result.push({
                    description: tx.description,
                    amount: tx.amount.value,
                    type: bankTx.type,
                    category,
                    date: bankTx.bookingDate,
                });
            } catch {
                skipped++;
            }
        }

        return { synced, skipped, transactions: result };
    }
}
