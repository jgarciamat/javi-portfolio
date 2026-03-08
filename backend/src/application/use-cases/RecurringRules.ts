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

        // Backfill: create transactions for every past/current/next-visible month the rule applies to.
        // The app allows viewing up to 1 month ahead of today, so we fill up to currentMonth+1.
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        // maxVisibleOrd = currentMonth + 1 (wrapping December → January of next year)
        const maxVisibleYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const maxVisibleMonth = currentMonth === 12 ? 1 : currentMonth + 1;

        const startOrdinal = dto.startYear * 12 + dto.startMonth;
        const endOrdinal = maxVisibleYear * 12 + maxVisibleMonth;

        for (let ord = startOrdinal; ord <= endOrdinal; ord++) {
            const year = Math.floor((ord - 1) / 12);
            const month = ((ord - 1) % 12) + 1;

            if (!rule.appliesTo(year, month)) continue;

            // Use UTC date to avoid timezone shifts when serialising to ISO string
            const date = new Date(Date.UTC(year, month - 1, 1));
            const tx = Transaction.create({
                description: dto.description,
                amount: dto.amount,
                type: dto.type,
                category: dto.category,
                date,
            });
            await this.transactionRepo.saveForUser(tx, dto.userId, rule.id);
        }

        return rule;
    }
}

export class GetRecurringRules {
    constructor(
        private readonly repo: IRecurringRuleRepository,
        private readonly transactionRepo: ITransactionRepository,
    ) { }

    async execute(userId: string): Promise<RecurringRule[]> {
        const rules = this.repo.findByUserId(userId);

        // Backfill any active rules that are missing transactions for past/current/next-visible months.
        // The app allows viewing up to 1 month ahead of today, so we fill up to currentMonth+1.
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const maxVisibleYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const maxVisibleMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const maxVisibleOrd = maxVisibleYear * 12 + maxVisibleMonth;

        for (const rule of rules) {
            if (!rule.active) continue;

            const startOrd = rule.startYear * 12 + rule.startMonth;
            const endOrd = rule.endYear !== null && rule.endMonth !== null
                ? Math.min(rule.endYear * 12 + rule.endMonth, maxVisibleOrd)
                : maxVisibleOrd;

            for (let ord = startOrd; ord <= endOrd; ord++) {
                const year = Math.floor((ord - 1) / 12);
                const month = ((ord - 1) % 12) + 1;

                if (!rule.appliesTo(year, month)) continue;

                // Use UTC date to avoid timezone shifts when serialising to ISO string
                const date = new Date(Date.UTC(year, month - 1, 1));
                const tx = Transaction.create({
                    description: rule.description,
                    amount: rule.amount,
                    type: rule.type,
                    category: rule.category,
                    date,
                });
                // ON CONFLICT(user_id, recurring_rule_id, year, month) DO NOTHING ensures idempotency
                await this.transactionRepo.saveForUser(tx, userId, rule.id);
            }
        }

        return rules;
    }
}

export class UpdateRecurringRule {
    constructor(
        private readonly repo: IRecurringRuleRepository,
        private readonly transactionRepo: ITransactionRepository,
    ) { }

    async execute(id: string, userId: string, changes: Partial<{
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
    }>): Promise<RecurringRule> {
        const existing = this.repo.findById(id);
        if (!existing) throw new Error('Recurring rule not found');
        if (existing.userId !== userId) throw new Error('Forbidden');

        const updated = this.repo.update(id, changes);
        if (!updated) throw new Error('Recurring rule not found');

        // Backfill any newly covered past months when startYear/startMonth moves earlier
        const prevStartOrd = existing.startYear * 12 + existing.startMonth;
        const newStartOrd = updated.startYear * 12 + updated.startMonth;

        if (newStartOrd < prevStartOrd && updated.active) {
            const now = new Date();
            const currentOrd = now.getFullYear() * 12 + (now.getMonth() + 1);
            // Only fill newly uncovered range: from new start up to (but not including) old start
            const fillUpTo = Math.min(prevStartOrd - 1, currentOrd);

            for (let ord = newStartOrd; ord <= fillUpTo; ord++) {
                const year = Math.floor((ord - 1) / 12);
                const month = ((ord - 1) % 12) + 1;

                if (!updated.appliesTo(year, month)) continue;

                const date = new Date(Date.UTC(year, month - 1, 1)); // Use UTC date to avoid timezone shifts when serialising to ISO string
                const tx = Transaction.create({
                    description: updated.description,
                    amount: updated.amount,
                    type: updated.type,
                    category: updated.category,
                    date,
                });
                await this.transactionRepo.saveForUser(tx, userId, updated.id);
            }
        }

        return updated;
    }
}

export type DeleteScope = 'none' | 'from_current' | 'all';

export class DeleteRecurringRule {
    constructor(
        private readonly repo: IRecurringRuleRepository,
        private readonly transactionRepo: ITransactionRepository,
    ) { }

    async execute(id: string, userId: string, scope: DeleteScope = 'none'): Promise<void> {
        const existing = this.repo.findById(id);
        if (!existing) throw new Error('Recurring rule not found');
        if (existing.userId !== userId) throw new Error('Forbidden');

        if (scope === 'all') {
            await this.transactionRepo.deleteByRecurringRule(id, userId);
        } else if (scope === 'from_current') {
            // "from_current" keeps the current month's transaction and removes from next month onward
            const now = new Date();
            let nextYear = now.getFullYear();
            let nextMonth = now.getMonth() + 2; // +1 for 1-based, +1 for next month
            if (nextMonth > 12) { nextMonth = 1; nextYear++; }
            await this.transactionRepo.deleteByRecurringRule(id, userId, nextYear, nextMonth);
        }
        // scope === 'none': keep all transactions

        this.repo.delete(id);
    }
}
