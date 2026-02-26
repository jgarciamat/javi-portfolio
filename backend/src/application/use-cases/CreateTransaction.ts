import { Transaction } from '@domain/entities/Transaction';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';

export interface CreateTransactionDTO {
    description: string;
    amount: number;
    type: string;
    category: string;
    date?: string;
}

export class CreateTransaction {
    constructor(private readonly transactionRepository: ITransactionRepository) { }

    async execute(dto: CreateTransactionDTO): Promise<Transaction> {
        const transaction = Transaction.create({
            description: dto.description,
            amount: dto.amount,
            type: dto.type,
            category: dto.category,
            date: dto.date ? new Date(dto.date) : undefined,
        });
        await this.transactionRepository.save(transaction);
        return transaction;
    }
}
