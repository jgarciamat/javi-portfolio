import { BusinessRuleError, NotFoundError } from '@domain/errors';
import { Transaction } from '@domain/model/Transaction';
import { TransactionType, balanceEffect } from '@domain/model/TransactionType';
import {
  AccountRepository,
  CategoryBudgetRepository,
  RecurringRuleRepository,
  SettingsRepository,
  TransactionRepository,
  TransactionSearchFilters,
  TransactionSearchResult,
  TransactionView,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import {
  BudgetLine,
  MonthAlert,
  computeBudgetLines,
  computeMonthAlerts,
} from '@domain/services/budget-status';
import { Summary, summarize } from '@domain/services/summary';
import { Cents, fromCents } from '@domain/shared/money';
import {
  Period,
  assertValidPeriod,
  comparePeriods,
  currentPeriod,
  periodEnd,
  periodStart,
  todayDateOnly,
} from '@domain/shared/period';
import { AccountResolver, CategoryRef, CategoryResolver } from '@application/shared/resolvers';
import { RecurringMaterializer } from '@application/recurring/RecurringMaterializer';

export interface MonthOverview {
  year: number;
  month: number;
  start: string;
  end: string;
  isCurrent: boolean;
  transactions: TransactionView[];
  summary: Summary;
  /** Money available before this period (initial balances + every earlier movement). */
  carryoverCents: Cents;
  /** carryover + this period's balance. */
  availableCents: Cents;
  budgets: BudgetLine[];
  alerts: MonthAlert[];
}

export interface AnnualOverview {
  year: number;
  openingBalanceCents: Cents;
  months: Record<
    number,
    { incomeCents: Cents; expenseCents: Cents; savingCents: Cents; balanceCents: Cents }
  >;
}

export interface NewTransactionInput extends CategoryRef {
  description: string;
  amountCents: Cents;
  type: TransactionType | string;
  accountId?: string | null;
  date?: string;
  notes?: string | null;
}

export type TransactionUpdateInput = Partial<NewTransactionInput>;

export class TransactionService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly budgets: CategoryBudgetRepository,
    private readonly rules: RecurringRuleRepository,
    private readonly settings: SettingsRepository,
    private readonly categoryResolver: CategoryResolver,
    private readonly accountResolver: AccountResolver,
    private readonly materializer: RecurringMaterializer,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  private startDay(userId: string): number {
    return this.settings.get(userId).monthStartDay;
  }

  private initialBalances(userId: string): Cents {
    return this.accounts.listByUser(userId).reduce((sum, a) => sum + a.initialBalanceCents, 0);
  }

  carryover(userId: string, period: Period): Cents {
    return this.initialBalances(userId) + this.transactions.netBefore(userId, period);
  }

  /** Materialises recurring movements up to the later of `period` and today's period. */
  private prepare(userId: string, period: Period): void {
    const today = currentPeriod(this.startDay(userId), this.clock.now());
    this.materializer.ensureUpTo(userId, comparePeriods(period, today) > 0 ? period : today);
  }

  getMonth(userId: string, period: Period): MonthOverview {
    assertValidPeriod(period);
    this.prepare(userId, period);
    const startDay = this.startDay(userId);
    const transactions = this.transactions.listByPeriod(userId, period);
    const summary = summarize(transactions);
    const carryoverCents = this.carryover(userId, period);
    const budgets = computeBudgetLines(this.budgets.listByUser(userId), summary.expensesByCategory);
    const today = currentPeriod(startDay, this.clock.now());
    return {
      ...period,
      start: periodStart(period, startDay),
      end: periodEnd(period, startDay),
      isCurrent: comparePeriods(period, today) === 0,
      transactions,
      summary,
      carryoverCents,
      availableCents: carryoverCents + summary.balanceCents,
      budgets,
      alerts: computeMonthAlerts(summary, carryoverCents, budgets),
    };
  }

  /** Savings cannot exceed the money available in their period (rule of the original app). */
  private assertCanSave(userId: string, tx: Transaction, replacing?: Transaction): void {
    if (tx.type !== 'SAVING') return;
    const inPeriod = summarize(this.transactions.listByPeriod(userId, tx.period));
    let available = this.carryover(userId, tx.period) + inPeriod.balanceCents;
    if (replacing && comparePeriods(replacing.period, tx.period) === 0) {
      available -= balanceEffect(replacing.type, replacing.amountCents);
    }
    if (tx.amountCents > available) {
      throw new BusinessRuleError(
        'INSUFFICIENT_BALANCE',
        `Saldo insuficiente. Saldo disponible: ${fromCents(Math.max(0, available)).toFixed(2)}`,
        { availableCents: Math.max(0, available) }
      );
    }
  }

  create(userId: string, input: NewTransactionInput): TransactionView {
    const startDay = this.startDay(userId);
    return this.uow.run(() => {
      const category = this.categoryResolver.resolve(userId, input);
      const account = this.accountResolver.resolveForMovement(userId, input.accountId);
      const tx = Transaction.create(
        {
          userId,
          accountId: account.id,
          categoryId: category.id,
          description: input.description,
          amountCents: input.amountCents,
          type: input.type,
          date: input.date ?? todayDateOnly(this.clock.now()),
          notes: input.notes,
        },
        startDay,
        this.clock.now()
      );
      this.assertCanSave(userId, tx);
      this.transactions.save(tx);
      return this.transactions.findView(userId, tx.id)!;
    });
  }

  private require(userId: string, id: string): Transaction {
    const tx = this.transactions.findById(userId, id);
    if (!tx) throw new NotFoundError('Movimiento no encontrado', 'TRANSACTION_NOT_FOUND');
    return tx;
  }

  update(userId: string, id: string, input: TransactionUpdateInput): TransactionView {
    const startDay = this.startDay(userId);
    return this.uow.run(() => {
      const current = this.require(userId, id);
      const categoryId =
        input.categoryId || (input.category && input.category.trim())
          ? this.categoryResolver.resolve(userId, input).id
          : undefined;
      const accountId =
        input.accountId !== undefined && input.accountId !== null
          ? this.accountResolver.resolveForMovement(userId, input.accountId).id
          : undefined;
      let next = current.update(
        {
          description: input.description,
          amountCents: input.amountCents,
          type: input.type,
          date: input.date,
          notes: input.notes,
          categoryId,
          accountId,
        },
        startDay
      );
      const movedPeriod = comparePeriods(current.period, next.period) !== 0;
      if (current.recurringRuleId && movedPeriod) {
        // The rule must not regenerate the movement in the period it left.
        this.rules.addSkip(current.recurringRuleId, current.period);
        next = next.detachFromRule();
      }
      this.assertCanSave(userId, next, current);
      this.transactions.save(next);
      return this.transactions.findView(userId, id)!;
    });
  }

  delete(userId: string, id: string): void {
    this.uow.run(() => {
      const tx = this.require(userId, id);
      if (tx.recurringRuleId) this.rules.addSkip(tx.recurringRuleId, tx.period);
      this.transactions.delete(userId, id);
    });
  }

  search(userId: string, filters: TransactionSearchFilters): TransactionSearchResult {
    return this.transactions.search(userId, filters);
  }

  annual(userId: string, year: number): AnnualOverview {
    const january = { year, month: 1 };
    const december = { year, month: 12 };
    assertValidPeriod(january);
    this.prepare(userId, december);
    const months: AnnualOverview['months'] = {};
    for (let m = 1; m <= 12; m++) {
      months[m] = { incomeCents: 0, expenseCents: 0, savingCents: 0, balanceCents: 0 };
    }
    for (const t of this.transactions.totalsByPeriod(userId, january, december)) {
      months[t.month] = {
        incomeCents: t.incomeCents,
        expenseCents: t.expenseCents,
        savingCents: t.savingCents,
        balanceCents: t.incomeCents - t.expenseCents - t.savingCents,
      };
    }
    return { year, openingBalanceCents: this.carryover(userId, january), months };
  }
}
