import { Transaction } from '@domain/entities/Transaction';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';

export class InMemoryTransactionRepository implements ITransactionRepository {
    private transactions: Map<string, Transaction> = new Map();

    async save(transaction: Transaction): Promise<void> {
        this.transactions.set(transaction.id.value, transaction);
    }

    async findById(id: string): Promise<Transaction | null> {
        return this.transactions.get(id) ?? null;
    }

    async findAll(): Promise<Transaction[]> {
        return Array.from(this.transactions.values()).sort(
            (a, b) => b.date.getTime() - a.date.getTime()
        );
    }

    async findByType(type: string): Promise<Transaction[]> {
        return (await this.findAll()).filter(
            (tx) => tx.type.value === type.toUpperCase()
        );
    }

    async findByCategory(category: string): Promise<Transaction[]> {
        return (await this.findAll()).filter(
            (tx) => tx.category.toLowerCase() === category.toLowerCase()
        );
    }

    async findByDateRange(from: Date, to: Date): Promise<Transaction[]> {
        return (await this.findAll()).filter(
            (tx) => tx.date >= from && tx.date <= to
        );
    }

    async delete(id: string): Promise<void> {
        this.transactions.delete(id);
    }
}
