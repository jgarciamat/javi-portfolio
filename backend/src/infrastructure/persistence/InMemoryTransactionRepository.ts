import { Transaction } from '@domain/entities/Transaction';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';

export class InMemoryTransactionRepository implements ITransactionRepository {
    private transactions: Map<string, Transaction> = new Map();

    async save(transaction: Transaction): Promise<void> {
        this.transactions.set(transaction.id.value, transaction);
    }

    async saveForUser(transaction: Transaction, _userId: string, _recurringRuleId?: string): Promise<void> {
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

    async patchTransaction(id: string, changes: { notes?: string | null }): Promise<Transaction | null> {
        const tx = this.transactions.get(id);
        if (!tx) return null;
        tx.patch(changes);
        return tx;
    }

    async delete(id: string): Promise<void> {
        this.transactions.delete(id);
    }

    async findByUserAndMonth(_userId: string, year: number, month: number): Promise<Transaction[]> {
        return (await this.findAll()).filter((tx) => {
            const d = tx.date;
            return d.getFullYear() === year && d.getMonth() + 1 === month;
        });
    }

    computeCarryover(_userId: string, _year: number, _month: number): number {
        // For in-memory (tests), carryover is always 0
        return 0;
    }
}
