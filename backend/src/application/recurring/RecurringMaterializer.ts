import { Transaction } from '@domain/model/Transaction';
import { RecurringRule } from '@domain/model/RecurringRule';
import {
  RecurringRuleRepository,
  SettingsRepository,
  TransactionRepository,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import {
  Period,
  addMonths,
  comparePeriods,
  currentPeriod,
  periodOrdinal,
  periodStart,
} from '@domain/shared/period';
import { AccountResolver } from '@application/shared/resolvers';

/** How far ahead of today generated movements may exist. */
export const MAX_MONTHS_AHEAD = 12;

/**
 * Creates the movements of recurring rules. It is idempotent (unique index on
 * rule + period) and remembers periods the user removed (skips).
 *
 * Generation is lazy: it runs before any read that needs a period (month view,
 * annual chart…), so it no longer depends on opening the rules tab as before.
 * An in-memory watermark avoids rescanning the same periods on every request.
 */
export class RecurringMaterializer {
  private readonly watermark = new Map<string, number>();

  constructor(
    private readonly rules: RecurringRuleRepository,
    private readonly transactions: TransactionRepository,
    private readonly settings: SettingsRepository,
    private readonly accounts: AccountResolver,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  /** Forget what was generated for a user (after editing rules or settings). */
  invalidate(userId: string): void {
    this.watermark.delete(userId);
  }

  horizon(monthStartDay: number): Period {
    return addMonths(currentPeriod(monthStartDay, this.clock.now()), MAX_MONTHS_AHEAD);
  }

  ensureUpTo(userId: string, target: Period): number {
    const { monthStartDay } = this.settings.get(userId);
    const limit =
      comparePeriods(target, this.horizon(monthStartDay)) > 0
        ? this.horizon(monthStartDay)
        : target;
    const targetOrd = periodOrdinal(limit);
    if ((this.watermark.get(userId) ?? -1) >= targetOrd) return 0;

    const created = this.uow.run(() => {
      let count = 0;
      for (const rule of this.rules.listByUser(userId)) {
        if (!rule.active) continue;
        count += this.materializeRule(rule, rule.start, limit, monthStartDay);
      }
      return count;
    });
    this.watermark.set(userId, targetOrd);
    return created;
  }

  /** Generates the movements of one rule within [from, to]. */
  materializeRule(rule: RecurringRule, from: Period, to: Period, monthStartDay: number): number {
    const skipped = new Set(this.rules.skippedPeriods(rule.id).map(periodOrdinal));
    const accountId = rule.accountId ?? this.accounts.defaultAccount(rule.userId).id;
    let count = 0;
    for (const period of rule.periodsWithin(from, to)) {
      if (skipped.has(periodOrdinal(period))) continue;
      const tx = Transaction.create(
        {
          userId: rule.userId,
          accountId,
          categoryId: rule.categoryId,
          description: rule.description,
          amountCents: rule.amountCents,
          type: rule.type,
          date: periodStart(period, monthStartDay),
          recurringRuleId: rule.id,
        },
        monthStartDay,
        this.clock.now()
      );
      if (this.transactions.insertIfAbsent(tx)) count++;
    }
    return count;
  }
}
