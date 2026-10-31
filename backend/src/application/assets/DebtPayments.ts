import { RecurringRule } from '@domain/model/RecurringRule';
import {
  Asset,
  AssetRepository,
  RecurringRuleRepository,
  SettingsRepository,
  TransactionRepository,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import {
  DatedValue,
  DebtPayment,
  coversInterest,
  debtDueOn,
  debtOwedAt,
  paymentsToPayOff,
} from '@domain/services/debt';
import { Cents } from '@domain/shared/money';
import {
  Period,
  addMonths,
  comparePeriods,
  currentPeriod,
  dateInPeriod,
  periodOrdinal,
  todayDateOnly,
} from '@domain/shared/period';

/** How the materializer sizes each payment of a debt's automatic operation. */
export interface DebtPlanner {
  /** The payment of `period` (on `date`); null when nothing is due or the instalments are over. */
  amountFor(period: Period, date: string): Cents | null;
  /** Counts a payment just generated, so the next one sees it. */
  paid(date: string, amountCents: Cents): void;
}

/** Where a debt paid every month stands today. */
export interface DebtSchedule {
  owedCents: Cents;
  /** What the operation has paid so far (payments up to today). */
  paidCents: Cents;
  /** Next payment, while the operation runs and something is owed. */
  nextDate: string | null;
  /** Payments still needed (estimate; limited by the instalments left, if given). */
  remainingPayments: number | null;
  /** False when the payment does not even cover the month's interest. */
  coversInterest: boolean;
}

const later = (a: Period, b: Period): Period => (comparePeriods(a, b) >= 0 ? a : b);
const earlier = (a: Period | null, b: Period | null): Period | null =>
  a === null ? b : b === null ? a : comparePeriods(a, b) <= 0 ? a : b;

/**
 * The link between a debt and the automatic operation that pays it (README, «Deudas que se pagan
 * solas»). What is owed is worked out from the values written down and the operation's movements
 * (domain/services/debt.ts), so nothing is stored after each payment.
 */
export class DebtPayments {
  constructor(
    private readonly assets: AssetRepository,
    private readonly rules: RecurringRuleRepository,
    private readonly transactions: TransactionRepository,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  today(): string {
    return todayDateOnly(this.clock.now());
  }

  debtOf(userId: string, ruleId: string): Asset | null {
    return this.assets.findByPaymentRule(userId, ruleId);
  }

  /** The debt paid by each rule, by rule id. */
  debtsByRule(userId: string): Map<string, Asset> {
    return new Map(
      this.assets
        .listByUser(userId)
        .filter((a) => a.paymentRuleId !== null)
        .map((a) => [a.paymentRuleId as string, a])
    );
  }

  /** The payments of a debt: the expenses its operation generated, with the amounts as edited. */
  payments(userId: string, ruleId: string): DebtPayment[] {
    return this.transactions
      .listByRule(userId, ruleId)
      .map((t) => t.toPrimitives())
      .filter((t) => t.type === 'EXPENSE')
      .map((t) => ({ date: t.date, amountCents: t.amountCents }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /** The payments of every debt that has an automatic operation, by asset id. */
  paymentsByAsset(userId: string, assets: Asset[]): Map<string, DebtPayment[]> {
    return new Map(
      assets
        .filter((a) => a.paymentRuleId !== null)
        .map((a) => [a.id, this.payments(userId, a.paymentRuleId as string)])
    );
  }

  private values(userId: string, assetId: string): DatedValue[] {
    return this.assets.valuesByUser(userId).filter((v) => v.assetId === assetId);
  }

  /** Sizes the payments of a debt's operation (null for any other rule). */
  planner(rule: RecurringRule): DebtPlanner | null {
    const debt = this.debtOf(rule.userId, rule.id);
    if (!debt) return null;
    const values = this.values(rule.userId, debt.id);
    const payments = this.payments(rule.userId, rule.id);
    return {
      amountFor: (period, date): Cents | null => {
        if (debt.paymentEnd && comparePeriods(period, debt.paymentEnd) > 0) return null;
        const due = debtDueOn(values, payments, debt.interestRate, date);
        return due > 0 ? Math.min(rule.amountCents, due) : null;
      },
      paid: (date, amountCents): void => {
        payments.push({ date, amountCents });
      },
    };
  }

  /**
   * The first period, from `start` on, whose payment day is still to come: a debt's operation
   * never creates payments for days already gone (the owed amount written today has them).
   */
  firstFuturePeriod(userId: string, start: Period, day: number): Period {
    const { monthStartDay } = this.settings.get(userId);
    const today = this.today();
    let period = later(start, currentPeriod(monthStartDay, this.clock.now()));
    while (dateInPeriod(period, day, monthStartDay) <= today) period = addMonths(period, 1);
    return period;
  }

  /** Where the debt stands today, given its values and payments. */
  schedule(
    debt: Asset,
    rule: RecurringRule,
    values: DatedValue[],
    payments: DebtPayment[]
  ): DebtSchedule {
    const today = this.today();
    const owedCents = debtOwedAt(values, payments, debt.interestRate, today);
    const paidCents = payments
      .filter((p) => p.date <= today)
      .reduce((sum, p) => sum + p.amountCents, 0);
    const day = rule.day ?? 1;
    const next = this.firstFuturePeriod(rule.userId, rule.start, day);
    const needed = paymentsToPayOff(owedCents, debt.interestRate, rule.amountCents);
    const left = debt.paymentEnd
      ? Math.max(0, periodOrdinal(debt.paymentEnd) - periodOrdinal(next) + 1)
      : null;
    const remainingPayments =
      needed === null ? left : left === null ? needed : Math.min(needed, left);
    const { monthStartDay } = this.settings.get(rule.userId);
    return {
      owedCents,
      paidCents,
      nextDate:
        rule.active && remainingPayments !== 0 ? dateInPeriod(next, day, monthStartDay) : null,
      remainingPayments,
      coversInterest: coversInterest(owedCents, debt.interestRate, rule.amountCents),
    };
  }

  /**
   * After any change to the debt or its operation: the payments still to come are removed (the
   * materializer makes them again with the new terms) and the operation ends with the last
   * payment needed, or the last instalment if that comes first, so the outlook does not count
   * payments that will not happen. Past payments are never touched.
   */
  resync(userId: string, debt: Asset): void {
    const rule = debt.paymentRuleId ? this.rules.findById(userId, debt.paymentRuleId) : null;
    if (!rule) return;
    const today = this.today();
    this.transactions.deleteByRuleAfter(userId, rule.id, today);
    const owed = debtOwedAt(
      this.values(userId, debt.id),
      this.payments(userId, rule.id),
      debt.interestRate,
      today
    );
    const next = this.firstFuturePeriod(userId, rule.start, rule.day ?? 1);
    const needed = paymentsToPayOff(owed, debt.interestRate, rule.amountCents);
    const payoff = needed === null ? null : addMonths(next, needed - 1);
    const end = earlier(payoff, debt.paymentEnd);
    this.rules.save(rule.update({ end: end === null ? null : later(end, rule.start) }));
  }

  /**
   * The operation stops paying the debt (it is being removed): what was owed after each payment
   * so far is written down as values, so the debt and its history stay as they were, and the
   * debt goes back to being updated by hand.
   */
  detach(userId: string, ruleId: string): void {
    const debt = this.debtOf(userId, ruleId);
    if (!debt) return;
    const today = this.today();
    const values = this.values(userId, debt.id);
    const payments = this.payments(userId, ruleId);
    const first = values.reduce((min, v) => (v.date < min ? v.date : min), today);
    const snapshot = payments
      .filter((p) => p.date > first && p.date <= today)
      .map((p) => ({
        assetId: debt.id,
        date: p.date,
        valueCents: debtOwedAt(values, payments, debt.interestRate, p.date),
      }));
    for (const value of snapshot) this.assets.setValue(value);
    this.assets.save({ ...debt, paymentRuleId: null, paymentEnd: null });
  }
}
