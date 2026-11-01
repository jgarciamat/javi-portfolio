import { sameSplits } from '@domain/model/AccountSplit';
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
  dateInPeriod,
  periodOrdinal,
  periodStart,
  todayDateOnly,
} from '@domain/shared/period';
import { AccountResolver } from '@application/shared/resolvers';
import type { DebtPayments } from '@application/assets/DebtPayments';

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
    private readonly clock: Clock,
    private readonly debts?: DebtPayments
  ) {}

  /**
   * The rule's account (or the account of one of its parts) is no longer usable (archived before
   * archiving was blocked, or old data): its movements still to come, dated after today, go to
   * the default account too. The past ones, those already charged and those the person moved
   * stay. Idempotent; unarchiving does not bring them back.
   */
  private relocateComing(rule: RecurringRule, today: string, monthStartDay: number): void {
    if (!rule.accountId) return;
    const target = this.accounts.forGeneratedSplits(rule.userId, rule.accountId, rule.splits);
    if (target.accountId === rule.accountId && sameSplits(target.splits, rule.splits)) return;
    for (const tx of this.transactions.listByRule(rule.userId, rule.id)) {
      const { date, accountId, splits } = tx.toPrimitives();
      if (date <= today || accountId !== rule.accountId || !sameSplits(splits, rule.splits)) {
        continue;
      }
      this.transactions.save(tx.update(target, monthStartDay));
    }
  }

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

    const today = todayDateOnly(this.clock.now());
    const created = this.uow.run(() => {
      let count = 0;
      for (const rule of this.rules.listByUser(userId)) {
        if (!rule.active) continue;
        this.relocateComing(rule, today, monthStartDay);
        count += this.materializeRule(rule, rule.start, limit, monthStartDay);
      }
      return count;
    });
    this.watermark.set(userId, targetOrd);
    return created;
  }

  /**
   * Generates the movements of one rule within [from, to], on the rule's day (or the first day
   * of the period). A rule that pays a debt pays what is left at most, and nothing once it is
   * paid off (see DebtPayments).
   */
  materializeRule(rule: RecurringRule, from: Period, to: Period, monthStartDay: number): number {
    const skipped = new Set(this.rules.skippedPeriods(rule.id).map(periodOrdinal));
    // Generated with the rule's parts too (each in a usable account).
    const { accountId, splits } = this.accounts.forGeneratedSplits(
      rule.userId,
      rule.accountId,
      rule.splits
    );
    const debt = this.debts?.planner(rule) ?? null;
    let count = 0;
    for (const period of rule.periodsWithin(from, to)) {
      if (skipped.has(periodOrdinal(period))) continue;
      const date = rule.day
        ? dateInPeriod(period, rule.day, monthStartDay)
        : periodStart(period, monthStartDay);
      const amountCents = debt ? debt.amountFor(period, date) : rule.amountCents;
      if (amountCents === null) continue;
      const tx = Transaction.create(
        {
          userId: rule.userId,
          accountId,
          // A debt's payment is never split (its amount changes with what is left).
          splits: debt ? [] : splits,
          categoryId: rule.categoryId,
          description: rule.description,
          amountCents,
          type: rule.type,
          date,
          recurringRuleId: rule.id,
        },
        monthStartDay,
        this.clock.now()
      );
      if (this.transactions.insertIfAbsent(tx)) {
        count++;
        debt?.paid(date, amountCents);
      }
    }
    return count;
  }
}
