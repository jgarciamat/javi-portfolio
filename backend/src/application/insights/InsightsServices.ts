import { createHash } from 'crypto';
import { RecurringRule } from '@domain/model/RecurringRule';
import {
  AccountRepository,
  AiUsageRepository,
  CategoryBudgetRepository,
  RecurringRuleRepository,
  SettingsRepository,
  TransactionRepository,
} from '@domain/ports/repositories';
import {
  ProjectedMonth,
  SafeToSpend,
  averageVariable,
  firstShortfall,
  projectMonths,
  safeToSpend,
} from '@domain/services/forecast';
import { Clock, FinancialAdvisor } from '@domain/ports/services';
import {
  Advice,
  AdviceContext,
  generateRuleBasedAdvice,
} from '@domain/services/rule-based-advisor';
import { savingsRate } from '@domain/services/summary';
import { CategoryTrend, computeCategoryTrends } from '@domain/services/trends';
import { Cents, fromCents } from '@domain/shared/money';
import {
  Period,
  addMonths,
  assertValidPeriod,
  comparePeriods,
  currentPeriod,
  periodEnd,
  periodOrdinal,
  periodStart,
  periodsBetween,
  todayDateOnly,
} from '@domain/shared/period';
import { AiAllowance, AiDenial, AiQuota } from '@application/ai/AiAllowance';
import { EntitlementService } from '@application/billing/EntitlementService';
import { TransactionService } from '@application/transactions/TransactionService';

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface NetWorthPoint {
  year: number;
  month: number;
  /** Money available at the end of the period (after savings). */
  availableCents: Cents;
  /** Savings accumulated up to the end of the period. */
  savedCents: Cents;
  /** available + saved. */
  netWorthCents: Cents;
}

export interface ForecastResult extends Period {
  safeToSpend: SafeToSpend;
  /** True when the month-by-month outlook is a Premium feature the user does not have. */
  locked: boolean;
  projection: ProjectedMonth[] | null;
  firstShortfall: Period | null;
  /** Active recurring rules, so the outlook can be tried without any of them. */
  rules: RecurringRule[];
}

/** Past periods used to learn the usual non-recurring spending. */
const VARIABLE_HISTORY = 3;

export class StatsService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly settings: SettingsRepository,
    private readonly transactionService: TransactionService,
    private readonly entitlements: EntitlementService,
    private readonly rules: RecurringRuleRepository,
    private readonly clock: Clock
  ) {}

  /**
   * "Can I reach the end of the month?" for everyone; the month-by-month outlook
   * (with "what if I cancel…" scenarios) is Premium and comes back locked otherwise.
   */
  forecast(userId: string, options: { months: number; exclude: string[] }): ForecastResult {
    const startDay = this.settings.get(userId).monthStartDay;
    const now = this.clock.now();
    const period = currentPeriod(startDay, now);
    const month = this.transactionService.getMonth(userId, period);
    const past = Array.from({ length: VARIABLE_HISTORY }, (_, i) =>
      this.transactions.listByPeriod(userId, addMonths(period, -(i + 1)))
    );
    const variable = averageVariable(past);
    const safe = safeToSpend({
      availableCents: month.availableCents,
      today: todayDateOnly(now),
      periodStart: periodStart(period, startDay),
      periodEnd: periodEnd(period, startDay),
      variable,
    });
    const rules = this.rules.listByUser(userId).filter((r) => r.active);
    const locked = !this.entitlements.limits(userId).features.forecast;
    const projection = locked
      ? null
      : projectMonths({
          from: addMonths(period, 1),
          months: options.months,
          startAvailableCents: safe.projectedEndCents,
          rules,
          variable,
          excludedRuleIds: new Set(options.exclude),
          skipped: new Map(
            rules.map((r) => [
              r.id,
              new Set(this.rules.skippedPeriods(r.id).map((p) => periodOrdinal(p))),
            ])
          ),
        });
    return {
      ...period,
      safeToSpend: safe,
      locked,
      projection,
      firstShortfall: projection ? firstShortfall(projection) : null,
      rules,
    };
  }

  trends(
    userId: string,
    period: Period
  ): { year: number; month: number; categories: CategoryTrend[] } {
    assertValidPeriod(period);
    this.entitlements.assertFeature(userId, 'insights');
    this.transactionService.getMonth(userId, period); // makes sure recurring movements exist
    const totals = this.transactions.categoryTotals(
      userId,
      addMonths(period, -3),
      period,
      'EXPENSE'
    );
    return { ...period, categories: computeCategoryTrends(period, totals) };
  }

  netWorth(userId: string, months: number): NetWorthPoint[] {
    this.entitlements.assertFeature(userId, 'insights');
    const startDay = this.settings.get(userId).monthStartDay;
    const to = currentPeriod(startDay, this.clock.now());
    const from = addMonths(to, -(Math.min(Math.max(months, 1), 120) - 1));
    const earliest = this.transactions.earliestPeriod(userId) ?? from;
    const initial = this.accounts.listByUser(userId).reduce((s, a) => s + a.initialBalanceCents, 0);
    const totals = new Map(
      this.transactions
        .totalsByPeriod(userId, earliest, to)
        .map((t) => [`${t.year}-${t.month}`, t] as const)
    );
    let available = initial;
    let saved = 0;
    const points: NetWorthPoint[] = [];
    const first = comparePeriods(earliest, from) < 0 ? earliest : from;
    for (const p of periodsBetween(first, to)) {
      const t = totals.get(`${p.year}-${p.month}`);
      if (t) {
        available += t.incomeCents - t.expenseCents - t.savingCents;
        saved += t.savingCents;
      }
      if (comparePeriods(p, from) >= 0) {
        points.push({
          ...p,
          availableCents: available,
          savedCents: saved,
          netWorthCents: available + saved,
        });
      }
    }
    return points;
  }
}

// ─── AI advice ───────────────────────────────────────────────────────────────

/** Why the rule-based advice was returned instead of the AI one. */
export type AdviceFallbackReason = AiDenial | 'unavailable' | 'no_data' | 'error';

export interface AdviceResult extends Advice {
  source: 'ai' | 'rules';
  reason?: AdviceFallbackReason;
  /** AI analyses used this month by the user. */
  ai: AiQuota;
}

export class AdviceService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly transactions: TransactionRepository,
    private readonly budgets: CategoryBudgetRepository,
    private readonly settings: SettingsRepository,
    private readonly usage: AiUsageRepository,
    private readonly allowance: AiAllowance,
    private readonly advisor: FinancialAdvisor | null,
    private readonly clock: Clock,
    private readonly logger: Pick<Console, 'error'> = console
  ) {}

  buildContext(userId: string, period: Period, locale: 'es' | 'en'): AdviceContext {
    const month = this.transactionService.getMonth(userId, period);
    const s = month.summary;
    const previous = this.transactions
      .totalsByPeriod(userId, addMonths(period, -1), addMonths(period, -1))
      .at(0);
    const toDecimal = (r: Record<string, Cents>): Record<string, number> =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, fromCents(v)]));
    return {
      ...period,
      locale,
      currency: this.settings.get(userId).currency,
      totalIncome: fromCents(s.incomeCents),
      totalExpenses: fromCents(s.expenseCents),
      totalSaving: fromCents(s.savingCents),
      balance: fromCents(s.balanceCents),
      savingsRate: Math.round(savingsRate(s) * 100) / 100,
      budgetAmount: fromCents(
        this.budgets.listByUser(userId).reduce((sum, b) => sum + b.amountCents, 0)
      ),
      expensesByCategory: toDecimal(s.expensesByCategory),
      savingByCategory: toDecimal(s.savingByCategory),
      transactionCount: s.count,
      ...(previous && {
        previous: {
          totalIncome: fromCents(previous.incomeCents),
          totalExpenses: fromCents(previous.expenseCents),
          totalSaving: fromCents(previous.savingCents),
        },
      }),
    };
  }

  /**
   * Premium users get an AI analysis (cached per set of figures, so asking again
   * about the same data is free); everyone else, or when the quota or the daily
   * budget is spent, gets the rule-based analysis with the reason.
   */
  async getAdvice(userId: string, period: Period, locale: 'es' | 'en'): Promise<AdviceResult> {
    const context = this.buildContext(userId, period, locale);
    const rules = (reason: AdviceFallbackReason): AdviceResult => ({
      ...generateRuleBasedAdvice(context),
      source: 'rules',
      reason,
      ai: this.allowance.quota(userId),
    });

    if (!this.advisor) return rules('unavailable');
    if (context.transactionCount === 0) return rules('no_data');
    const key = createHash('sha256')
      .update(`${this.advisor.name}|${JSON.stringify(context)}`)
      .digest('hex');
    const denial = this.allowance.check(userId, 'analysis');
    if (denial === 'premium_required') return rules(denial);
    const cached = this.usage.getCachedAdvice(userId, key);
    if (cached) return { ...cached, source: 'ai', ai: this.allowance.quota(userId) };
    if (denial) return rules(denial);

    try {
      const { advice, usage } = await this.advisor.getAdvice(context);
      this.allowance.record(userId, 'analysis', usage);
      this.usage.saveCachedAdvice(userId, key, advice, this.clock.now());
      return { ...advice, source: 'ai', ai: this.allowance.quota(userId) };
    } catch (e) {
      this.logger.error(`[advice] ${this.advisor.name} failed, using rules`, e);
      return rules('error');
    }
  }
}
