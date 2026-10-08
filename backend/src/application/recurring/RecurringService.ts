import { NotFoundError, ValidationError } from '@domain/errors';
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
import { RecurringMaterializer } from './RecurringMaterializer';

export type DeleteScope = 'none' | 'from_current' | 'all';

export interface RuleInput extends CategoryRef {
  description?: string;
  amountCents?: Cents;
  type?: string;
  accountId?: string | null;
  start?: Period;
  end?: Period | null;
  frequency?: string;
  active?: boolean;
}

export interface RuleView extends RecurringRuleProps {
  categoryName: string;
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
    private readonly clock: Clock
  ) {}

  private view(userId: string, rule: RecurringRule): RuleView {
    return {
      ...rule.toPrimitives(),
      categoryName: this.categories.requireById(userId, rule.categoryId).name,
    };
  }

  private today(userId: string): Period {
    return currentPeriod(this.settings.get(userId).monthStartDay, this.clock.now());
  }

  /** Read-only: listing rules no longer creates movements as a side effect. */
  list(userId: string): RuleView[] {
    return this.rules.listByUser(userId).map((r) => this.view(userId, r));
  }

  private require(userId: string, id: string): RecurringRule {
    const rule = this.rules.findById(userId, id);
    if (!rule) throw new NotFoundError('Regla no encontrada', 'RULE_NOT_FOUND');
    return rule;
  }

  private resolveRefs(userId: string, input: RuleInput): Partial<RecurringRuleInput> {
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
    if (input.accountId !== undefined) {
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
    return this.view(userId, rule);
  }

  /**
   * Changes apply from the current period on: generated movements of this and
   * future periods are regenerated with the new values, past ones are history and
   * stay as they are. If the start moves earlier, the newly covered past periods
   * are filled in.
   */
  update(userId: string, id: string, input: RuleInput): RuleView {
    const today = this.today(userId);
    const startDay = this.settings.get(userId).monthStartDay;
    const updated = this.uow.run(() => {
      const before = this.require(userId, id);
      const after = before.update(this.resolveRefs(userId, input));
      this.rules.save(after);
      const scheduleChanged =
        comparePeriods(before.start, after.start) !== 0 ||
        JSON.stringify(before.end) !== JSON.stringify(after.end) ||
        before.frequency !== after.frequency ||
        before.active !== after.active;
      if (scheduleChanged || RecurringRule.contentChanged(before, after)) {
        this.transactions.deleteByRule(userId, id, today);
        this.rules.clearSkipsFrom(id, today);
      }
      if (comparePeriods(after.start, before.start) < 0 && after.active) {
        this.materializer.materializeRule(after, after.start, addMonths(today, -1), startDay);
      }
      return after;
    });
    this.materializer.invalidate(userId);
    this.materializer.ensureUpTo(userId, addMonths(today, 1));
    return this.view(userId, updated);
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
      this.rules.delete(userId, id);
    });
    this.materializer.invalidate(userId);
  }
}
