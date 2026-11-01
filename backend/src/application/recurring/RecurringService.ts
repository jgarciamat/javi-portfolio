import { NotFoundError, ValidationError } from '@domain/errors';
import { AccountSplit } from '@domain/model/AccountSplit';
import { RecurringRule, RecurringRuleInput, RecurringRuleProps } from '@domain/model/RecurringRule';
import {
  RecurringRuleRepository,
  SettingsRepository,
  TransactionRepository,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { Cents } from '@domain/shared/money';
import { Period, addMonths, comparePeriods, currentPeriod } from '@domain/shared/period';
import { AccountResolver, CategoryRef, CategoryResolver } from '@application/shared/resolvers';
import { EntitlementService } from '@application/billing/EntitlementService';
import type { DebtPayments } from '@application/assets/DebtPayments';
import { Asset } from '@domain/ports/repositories';
import { RecurringMaterializer } from './RecurringMaterializer';

export type DeleteScope = 'none' | 'from_current' | 'all';

export interface RuleInput extends CategoryRef {
  description?: string;
  amountCents?: Cents;
  type?: string;
  accountId?: string | null;
  /** Split between several accounts (see TransactionService's NewTransactionInput.splits). */
  splits?: AccountSplit[] | null;
  start?: Period;
  end?: Period | null;
  frequency?: string;
  active?: boolean;
}

export interface RuleView extends RecurringRuleProps {
  categoryName: string;
  /** The debt the rule pays every month (its dates and type are the debt's). */
  debt: { id: string; name: string } | null;
}

export class RecurringService {
  constructor(
    private readonly rules: RecurringRuleRepository,
    private readonly transactions: TransactionRepository,
    private readonly settings: SettingsRepository,
    private readonly categories: CategoryResolver,
    private readonly accounts: AccountResolver,
    private readonly materializer: RecurringMaterializer,
    private readonly entitlements: EntitlementService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly debts?: DebtPayments
  ) {}

  private view(userId: string, rule: RecurringRule, debt: Asset | null): RuleView {
    return {
      ...rule.toPrimitives(),
      categoryName: this.categories.requireById(userId, rule.categoryId).name,
      debt: debt ? { id: debt.id, name: debt.name } : null,
    };
  }

  private debtOf(userId: string, ruleId: string): Asset | null {
    return this.debts?.debtOf(userId, ruleId) ?? null;
  }

  private today(userId: string): Period {
    return currentPeriod(this.settings.get(userId).monthStartDay, this.clock.now());
  }

  /** Read-only: listing rules no longer creates movements as a side effect. */
  list(userId: string): RuleView[] {
    const debts = this.debts?.debtsByRule(userId) ?? new Map<string, Asset>();
    return this.rules.listByUser(userId).map((r) => this.view(userId, r, debts.get(r.id) ?? null));
  }

  private require(userId: string, id: string): RecurringRule {
    const rule = this.rules.findById(userId, id);
    if (!rule) throw new NotFoundError('Regla no encontrada', 'RULE_NOT_FOUND');
    return rule;
  }

  /**
   * `current` is the rule being edited: keeping the account it already has is always allowed,
   * even if that account was archived since (its movements go to the default one meanwhile), so
   * editing anything else never fails because of it.
   */
  private resolveRefs(
    userId: string,
    input: RuleInput,
    current?: RecurringRule
  ): Partial<RecurringRuleInput> {
    const resolved: Partial<RecurringRuleInput> = {
      description: input.description,
      amountCents: input.amountCents,
      type: input.type,
      start: input.start,
      end: input.end,
      frequency: input.frequency,
      active: input.active,
    };
    if (input.categoryId || input.category)
      resolved.categoryId = this.categories.resolve(userId, input).id;
    if (input.splits !== undefined) {
      // New parts: the rule's account is the first part's (the one named is not used).
      resolved.splits = input.splits?.length
        ? this.accounts.resolveSplits(userId, input.splits, current?.splits)
        : null;
    }
    if (
      !resolved.splits &&
      input.accountId !== undefined &&
      input.accountId !== current?.accountId
    ) {
      resolved.accountId = input.accountId
        ? this.accounts.resolveForMovement(userId, input.accountId).id
        : null;
    }
    return Object.fromEntries(Object.entries(resolved).filter(([, v]) => v !== undefined));
  }

  create(userId: string, input: RuleInput): RuleView {
    this.entitlements.assertCanCreate(
      userId,
      'recurringRules',
      this.rules.listByUser(userId).length
    );
    const rule = this.uow.run(() => {
      const refs = this.resolveRefs(userId, input);
      if (!refs.categoryId)
        throw new ValidationError('La categoría es obligatoria', 'CATEGORY_REQUIRED');
      const created = RecurringRule.create(userId, refs as RecurringRuleInput, this.clock.now());
      this.rules.save(created);
      return created;
    });
    this.materializer.invalidate(userId);
    this.materializer.ensureUpTo(userId, addMonths(this.today(userId), 1));
    return this.view(userId, rule, null);
  }

  /**
   * Changes apply from the current period on: generated movements of this and
   * future periods are regenerated with the new values, past ones are history and
   * stay as they are. If the start moves earlier, the newly covered past periods
   * are filled in. A change of account alone applies from the next period: this
   * period's movement stays in the account it was noted in.
   */
  update(userId: string, id: string, input: RuleInput): RuleView {
    const debt = this.debtOf(userId, id);
    if (debt) return this.updateDebtRule(userId, id, input, debt);
    const today = this.today(userId);
    const startDay = this.settings.get(userId).monthStartDay;
    const updated = this.uow.run(() => {
      const before = this.require(userId, id);
      const after = before.update(this.resolveRefs(userId, input, before));
      this.rules.save(after);
      const scheduleChanged =
        comparePeriods(before.start, after.start) !== 0 ||
        JSON.stringify(before.end) !== JSON.stringify(after.end) ||
        before.frequency !== after.frequency ||
        before.active !== after.active;
      // Anything but the accounts: this month's movement is redone too, as always.
      const otherChanged =
        scheduleChanged || RecurringRule.contentChanged(before, after, { ignoreAccounts: true });
      if (otherChanged) {
        this.transactions.deleteByRule(userId, id, today);
        this.rules.clearSkipsFrom(id, today);
      } else if (RecurringRule.accountsChanged(before, after)) {
        // Only the account: the coming months go to the new one; this month's movement and the
        // past ones stay in the account they were noted in (and removed months stay removed).
        this.transactions.deleteByRule(userId, id, addMonths(today, 1));
      }
      if (comparePeriods(after.start, before.start) < 0 && after.active) {
        this.materializer.materializeRule(after, after.start, addMonths(today, -1), startDay);
      }
      return after;
    });
    this.materializer.invalidate(userId);
    this.materializer.ensureUpTo(userId, addMonths(today, 1));
    return this.view(userId, updated, null);
  }

  /**
   * A rule that pays a debt: its type, frequency and dates are the debt's (they are left as they
   * are); description, amount, category, account and pausing apply to the payments still to
   * come. Payments already made are never removed. Resumed, it starts again with the next
   * payment day (the months it was paused are not filled in).
   */
  private updateDebtRule(userId: string, id: string, input: RuleInput, debt: Asset): RuleView {
    // Its amount changes with what is left of the debt, so it is paid from one account.
    if (input.splits?.length) {
      throw new ValidationError(
        'El pago de una deuda sale de una sola cuenta',
        'SPLIT_NOT_FOR_DEBT'
      );
    }
    const debts = this.debts as DebtPayments;
    const updated = this.uow.run(() => {
      const before = this.require(userId, id);
      const changes = this.resolveRefs(
        userId,
        {
          description: input.description,
          amountCents: input.amountCents,
          categoryId: input.categoryId,
          category: input.category,
          accountId: input.accountId,
          active: input.active,
        },
        before
      );
      if (changes.active && !before.active) {
        changes.start = debts.firstFuturePeriod(userId, before.start, before.day ?? 1);
        changes.end = null;
      }
      this.rules.save(before.update(changes));
      debts.resync(userId, debt);
      return this.require(userId, id);
    });
    this.materializer.invalidate(userId);
    this.materializer.ensureUpTo(userId, addMonths(this.today(userId), 1));
    return this.view(userId, updated, debt);
  }

  /**
   * - none: keep every generated movement (they become regular movements)
   * - from_current: keep up to the current period, remove later ones
   * - all: remove every movement the rule generated
   */
  delete(userId: string, id: string, scope: DeleteScope = 'none'): void {
    const today = this.today(userId);
    this.uow.run(() => {
      this.require(userId, id);
      if (scope === 'all') this.transactions.deleteByRule(userId, id);
      if (scope === 'from_current') this.transactions.deleteByRule(userId, id, addMonths(today, 1));
      // A debt it paid keeps what it owed after the payments that stay, valued by hand again.
      this.debts?.detach(userId, id);
      this.rules.delete(userId, id);
    });
    this.materializer.invalidate(userId);
  }
}
