import { Transaction } from '@domain/entities/Transaction';

export interface ITransactionRepository {
    save(transaction: Transaction): Promise<void>;
    saveForUser(transaction: Transaction, userId: string, recurringRuleId?: string): Promise<void>;
    deleteByRecurringRule(recurringRuleId: string, userId: string, fromYear?: number, fromMonth?: number): Promise<void>;
    findById(id: string): Promise<Transaction | null>;
    findAll(): Promise<Transaction[]>;
    findByType(type: string): Promise<Transaction[]>;
    findByCategory(category: string): Promise<Transaction[]>;
    findByDateRange(from: Date, to: Date): Promise<Transaction[]>;
    findByUserAndMonth(userId: string, year: number, month: number): Promise<Transaction[]>;
    computeCarryover(userId: string, year: number, month: number): number;
    delete(id: string): Promise<void>;
    patchTransaction(id: string, changes: { notes?: string | null }): Promise<Transaction | null>;
}
