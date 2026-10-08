import { NotFoundError } from '@domain/errors';
import { CategoryBudget } from '@domain/model/CategoryBudget';
import { CustomAlert, CustomAlertInput, CustomAlertProps } from '@domain/model/CustomAlert';
import { Goal, GoalInput, GoalProgress, GoalProps, computeGoalProgress } from '@domain/model/Goal';
import {
  BudgetView,
  CategoryBudgetRepository,
  CustomAlertRepository,
  GoalRepository,
  TransactionRepository,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { Cents } from '@domain/shared/money';
import { todayDateOnly } from '@domain/shared/period';
import { CategoryRef, CategoryResolver } from '@application/shared/resolvers';
import { EntitlementService } from '@application/billing/EntitlementService';

// ─── Custom alerts ───────────────────────────────────────────────────────────

export interface AlertView extends CustomAlertProps {
  categoryName: string | null;
}

export type AlertInput = Omit<CustomAlertInput, 'categoryId'> & CategoryRef;

export class CustomAlertService {
  constructor(
    private readonly alerts: CustomAlertRepository,
    private readonly categories: CategoryResolver,
    private readonly entitlements: EntitlementService,
    private readonly clock: Clock
  ) {}

  private view(userId: string, alert: CustomAlert): AlertView {
    const p = alert.toPrimitives();
    return {
      ...p,
      categoryName: p.categoryId ? this.categories.requireById(userId, p.categoryId).name : null,
    };
  }

  private require(userId: string, id: string): CustomAlert {
    const alert = this.alerts.findById(userId, id);
    if (!alert) throw new NotFoundError('Alerta no encontrada', 'ALERT_NOT_FOUND');
    return alert;
  }

  /** undefined → not sent (keep), null → no category, string → resolved category id. */
  private categoryChange(userId: string, input: AlertInput): string | null | undefined {
    if (input.categoryId === undefined && input.category === undefined) return undefined;
    return this.categories.resolveOptional(userId, input)?.id ?? null;
  }

  list(userId: string): AlertView[] {
    return this.alerts.listByUser(userId).map((a) => this.view(userId, a));
  }

  create(userId: string, input: AlertInput): AlertView {
    this.entitlements.assertCanCreate(
      userId,
      'customAlerts',
      this.alerts.listByUser(userId).length
    );
    const { category: _name, ...rest } = input;
    const alert = CustomAlert.create(
      userId,
      { ...rest, categoryId: this.categoryChange(userId, input) ?? null },
      this.clock.now()
    );
    this.alerts.save(alert);
    return this.view(userId, alert);
  }

  update(userId: string, id: string, input: AlertInput): AlertView {
    const { category: _name, categoryId: _id, ...rest } = input;
    const categoryId = this.categoryChange(userId, input);
    const updated = this.require(userId, id).update(
      categoryId === undefined ? rest : { ...rest, categoryId }
    );
    this.alerts.save(updated);
    return this.view(userId, updated);
  }

  delete(userId: string, id: string): void {
    this.require(userId, id);
    this.alerts.delete(userId, id);
  }
}

// ─── Category budgets ────────────────────────────────────────────────────────

export class BudgetService {
  constructor(
    private readonly budgets: CategoryBudgetRepository,
    private readonly categories: CategoryResolver,
    private readonly entitlements: EntitlementService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  list(userId: string): BudgetView[] {
    return this.budgets.listByUser(userId);
  }

  /** Creates or replaces the monthly limit of a category. */
  set(userId: string, ref: CategoryRef, amountCents: Cents): BudgetView {
    return this.uow.run(() => {
      const category = this.categories.resolve(userId, ref);
      const existing = this.budgets.findByCategory(userId, category.id);
      if (!existing) {
        this.entitlements.assertCanCreate(
          userId,
          'budgets',
          this.budgets.listByUser(userId).length
        );
      }
      const budget = existing
        ? existing.withAmount(amountCents)
        : CategoryBudget.create(userId, category.id, amountCents, this.clock.now());
      this.budgets.save(budget);
      return { id: budget.id, categoryId: category.id, categoryName: category.name, amountCents };
    });
  }

  delete(userId: string, id: string): void {
    if (!this.budgets.findById(userId, id)) {
      throw new NotFoundError('Presupuesto no encontrado', 'BUDGET_NOT_FOUND');
    }
    this.budgets.delete(userId, id);
  }
}

// ─── Savings goals ───────────────────────────────────────────────────────────

export interface GoalView extends GoalProps {
  categoryName: string;
  progress: GoalProgress;
}

export type GoalRequest = Partial<Omit<GoalInput, 'categoryId'>> & CategoryRef;

export class GoalService {
  constructor(
    private readonly goals: GoalRepository,
    private readonly transactions: TransactionRepository,
    private readonly categories: CategoryResolver,
    private readonly entitlements: EntitlementService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  private views(userId: string, goals: Goal[]): GoalView[] {
    const saved = this.transactions.savedByCategory(userId);
    const today = todayDateOnly(this.clock.now());
    return goals.map((g) => {
      const p = g.toPrimitives();
      return {
        ...p,
        categoryName: this.categories.requireById(userId, p.categoryId).name,
        progress: computeGoalProgress(p, saved[p.categoryId] ?? 0, today),
      };
    });
  }

  private require(userId: string, id: string): Goal {
    const goal = this.goals.findById(userId, id);
    if (!goal) throw new NotFoundError('Meta no encontrada', 'GOAL_NOT_FOUND');
    return goal;
  }

  list(userId: string): GoalView[] {
    return this.views(userId, this.goals.listByUser(userId));
  }

  /** Without a category, the goal gets its own one named after it. */
  create(userId: string, input: GoalRequest): GoalView {
    this.entitlements.assertCanCreate(userId, 'goals', this.goals.listByUser(userId).length);
    const goal = this.uow.run(() => {
      const category =
        this.categories.resolveOptional(userId, input) ??
        this.categories.findOrCreate(userId, input.name ?? '');
      const created = Goal.create(
        userId,
        { ...(input as GoalInput), categoryId: category.id },
        this.clock.now()
      );
      this.goals.save(created);
      return created;
    });
    return this.views(userId, [goal])[0];
  }

  update(userId: string, id: string, input: GoalRequest): GoalView {
    const goal = this.uow.run(() => {
      const category = this.categories.resolveOptional(userId, input);
      const { category: _ignored, ...changes } = input;
      const updated = this.require(userId, id).update({
        ...changes,
        categoryId: category?.id ?? undefined,
      });
      this.goals.save(updated);
      return updated;
    });
    return this.views(userId, [goal])[0];
  }

  delete(userId: string, id: string): void {
    this.require(userId, id);
    this.goals.delete(userId, id);
  }
}
