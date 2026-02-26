import { Transaction } from '@domain/entities/Transaction';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';

export interface GetTransactionsFilter {
    type?: string;
    category?: string;
    from?: string;
    to?: string;
}

export class GetTransactions {
    constructor(private readonly transactionRepository: ITransactionRepository) { }

    async execute(filter?: GetTransactionsFilter): Promise<Transaction[]> {
        if (!filter) {
            return this.transactionRepository.findAll();
        }
        if (filter.from && filter.to) {
            return this.transactionRepository.findByDateRange(
                new Date(filter.from),
                new Date(filter.to)
            );
        }
        if (filter.type) {
            return this.transactionRepository.findByType(filter.type.toUpperCase());
        }
        if (filter.category) {
            return this.transactionRepository.findByCategory(filter.category);
        }
        return this.transactionRepository.findAll();
    }
}
