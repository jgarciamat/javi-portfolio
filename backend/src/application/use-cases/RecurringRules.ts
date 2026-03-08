import { RecurringRule } from '@domain/entities/RecurringRule';
import { IRecurringRuleRepository } from '@domain/repositories/IRecurringRuleRepository';
import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';
import { Transaction } from '@domain/entities/Transaction';

export interface CreateRecurringRuleDTO {
    userId: string;
    description: string;
    amount: number;
    type: string;
    category: string;
    startYear: number;
    startMonth: number;
    endYear?: number | null;
    endMonth?: number | null;
    frequency?: 'monthly' | 'bimonthly';
}

export class CreateRecurringRule {
    constructor(
        private readonly repo: IRecurringRuleRepository,
        private readonly transactionRepo: ITransactionRepository,
    ) { }

    async execute(dto: CreateRecurringRuleDTO): Promise<RecurringRule> {
        const rule = RecurringRule.create(dto);
        this.repo.save(rule);

        // Backfill: create transactions for every past/current month the rule applies to
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const startOrdinal = dto.startYear * 12 + dto.startMonth;
        const endOrdinal = currentYear * 12 + currentMonth;

        for (let ord = startOrdinal; ord <= endOrdinal; ord++) {
            const year = Math.floor((ord - 1) / 12);
            const month = ((ord - 1) % 12) + 1;

            if (!rule.appliesTo(year, month)) continue;

            const date = new Date(year, month - 1, 1);
            const tx = Transaction.create({
                description: dto.description,
                amount: dto.amount,
                type: dto.type,
                category: dto.category,
                date,
            });
            await this.transactionRepo.saveForUser(tx, dto.userId);
        }

        return rule;
    }
}

export class GetRecurringRules {
    constructor(private readonly repo: IRecurringRuleRepository) { }

    execute(userId: string): RecurringRule[] {
        return this.repo.findByUserId(userId);
    }
}

export class UpdateRecurringRule {
    constructor(private readonly repo: IRecurringRuleRepository) { }

    execute(id: string, userId: string, changes: Partial<{
        description: string;
        amount: number;
        type: string;
        category: string;
        endYear: number | null;
        endMonth: number | null;
        frequency: string;
        active: boolean;
    }>): RecurringRule {
        const existing = this.repo.findById(id);
        if (!existing) throw new Error('Recurring rule not found');
        if (existing.userId !== userId) throw new Error('Forbidden');
        const updated = this.repo.update(id, changes);
        if (!updated) throw new Error('Recurring rule not found');
        return updated;
    }
}

export class DeleteRecurringRule {
    constructor(private readonly repo: IRecurringRuleRepository) { }

    execute(id: string, userId: string): void {
        const existing = this.repo.findById(id);
        if (!existing) throw new Error('Recurring rule not found');
        if (existing.userId !== userId) throw new Error('Forbidden');
        this.repo.delete(id);
    }
}
