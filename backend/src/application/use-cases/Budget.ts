import { v4 as uuidv4 } from 'uuid';
import { MonthlyBudget } from '@domain/entities/MonthlyBudget';
import { IMonthlyBudgetRepository } from '@domain/repositories/IMonthlyBudgetRepository';

export class SetMonthlyBudget {
    constructor(private readonly repo: IMonthlyBudgetRepository) { }

    async execute(userId: string, year: number, month: number, initialAmount: number): Promise<MonthlyBudget> {
        let budget = await this.repo.findByUserAndMonth(userId, year, month);
        if (budget) {
            budget.updateAmount(initialAmount);
        } else {
            budget = MonthlyBudget.create({
                id: uuidv4(),
                userId,
                year,
                month,
                initialAmount,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        await this.repo.save(budget);
        return budget;
    }
}

export class GetMonthlyBudget {
    constructor(private readonly repo: IMonthlyBudgetRepository) { }

    async execute(userId: string, year: number, month: number): Promise<MonthlyBudget | null> {
        return this.repo.findByUserAndMonth(userId, year, month);
    }

    async getHistory(userId: string): Promise<MonthlyBudget[]> {
        return this.repo.findAllByUser(userId);
    }
}
