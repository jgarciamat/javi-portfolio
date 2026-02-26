import { MonthlyBudget } from '@domain/entities/MonthlyBudget';

export interface IMonthlyBudgetRepository {
    save(budget: MonthlyBudget): Promise<void>;
    findByUserAndMonth(userId: string, year: number, month: number): Promise<MonthlyBudget | null>;
    findAllByUser(userId: string): Promise<MonthlyBudget[]>;
}
