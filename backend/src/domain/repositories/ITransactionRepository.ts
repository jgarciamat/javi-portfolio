import { Transaction } from '@domain/entities/Transaction';

export interface ITransactionRepository {
    save(transaction: Transaction): Promise<void>;
    findById(id: string): Promise<Transaction | null>;
    findAll(): Promise<Transaction[]>;
    findByType(type: string): Promise<Transaction[]>;
    findByCategory(category: string): Promise<Transaction[]>;
    findByDateRange(from: Date, to: Date): Promise<Transaction[]>;
    delete(id: string): Promise<void>;
}
