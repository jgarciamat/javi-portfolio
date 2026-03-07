import { RecurringRule } from '@domain/entities/RecurringRule';
import { IRecurringRuleRepository } from '@domain/repositories/IRecurringRuleRepository';

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
    constructor(private readonly repo: IRecurringRuleRepository) { }

    execute(dto: CreateRecurringRuleDTO): RecurringRule {
        const rule = RecurringRule.create(dto);
        this.repo.save(rule);
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
