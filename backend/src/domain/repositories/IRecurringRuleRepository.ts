import { RecurringRule } from '@domain/entities/RecurringRule';

export interface IRecurringRuleRepository {
    save(rule: RecurringRule): void;
    findById(id: string): RecurringRule | null;
    findByUserId(userId: string): RecurringRule[];
    update(id: string, changes: Partial<{
        description: string;
        amount: number;
        type: string;
        category: string;
        startYear: number;
        startMonth: number;
        endYear: number | null;
        endMonth: number | null;
        frequency: string;
        active: boolean;
    }>): RecurringRule | null;
    delete(id: string): void;
    deleteAllByUser(userId: string): void;
}
