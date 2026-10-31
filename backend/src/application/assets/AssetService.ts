import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError } from '@domain/errors';
import { RecurringRule } from '@domain/model/RecurringRule';
import {
  Asset,
  AssetKind,
  AssetRepository,
  RecurringRuleRepository,
  SettingsRepository,
  TransactionRepository,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { DebtType, debtOwedAt } from '@domain/services/debt';
import { Cents } from '@domain/shared/money';
import { Period, addMonths, currentPeriod, toDateOnly, todayDateOnly } from '@domain/shared/period';
import { EntitlementService } from '@application/billing/EntitlementService';
import { RecurringMaterializer } from '@application/recurring/RecurringMaterializer';
import { AccountResolver, CategoryResolver } from '@application/shared/resolvers';
import { DebtPayments } from './DebtPayments';

export const MAX_ASSETS = 30;

/** How a debt is paid every month (it becomes an automatic operation). */
export interface DebtPaymentInput {
  amountCents: Cents;
  /** Day of the month of each payment (1..31; past the end of a short month, its last day). */
  day: number;
  /** Account the money comes out of (any active one; the default one if missing). */
  accountId?: string | null;
  /** Month of the first payment (default: the next one still to come). */
  start?: Period | null;
  /** Instalments left from the first payment on (optional). */
  instalments?: number | null;
}

export interface DebtPaymentView {
  ruleId: string;
  amountCents: Cents;
  day: number;
  accountId: string | null;
  /** False while the operation is paused. */
  active: boolean;
  start: Period;
  end: Period | null;
  /** Last instalment, when the person gave how many are left. */
  lastInstalment: Period | null;
  nextDate: string | null;
  remainingPayments: number | null;
  paidCents: Cents;
  coversInterest: boolean;
}

export interface AssetView {
  id: string;
  name: string;
  kind: AssetKind;
  interestRate: number | null;
  minPaymentCents: Cents | null;
  debtType: DebtType | null;
  initialCents: Cents | null;
  /** Latest value, its date and the one before it (to show the change). */
  valueCents: Cents;
  valueDate: string | null;
  previousCents: Cents | null;
  history: { date: string; valueCents: Cents }[];
  /** Debts paid by an automatic operation. */
  payment: DebtPaymentView | null;
  /** A debt with an automatic payment that owes nothing any more. */
  paidOff: boolean;
}

export interface AssetInput {
  name: string;
  kind: AssetKind;
  valueCents: Cents;
  date?: string | null;
  interestRate?: number | null;
  minPaymentCents?: Cents | null;
  debtType?: DebtType | null;
  initialCents?: Cents | null;
  payment?: DebtPaymentInput | null;
}

/** Changes to a debt: what is left out stays as it is; `payment: null` stops paying it. */
export interface DebtChanges {
  debtType?: DebtType;
  initialCents?: Cents | null;
  interestRate?: number | null;
  payment?: DebtPaymentInput | null;
}

/** Collaborators for debts that are paid every month by an automatic operation. */
export interface DebtCollaborators {
  rules: RecurringRuleRepository;
  transactions: TransactionRepository;
  settings: SettingsRepository;
  categories: CategoryResolver;
  accounts: AccountResolver;
  materializer: RecurringMaterializer;
  debts: DebtPayments;
}

/** The category of a debt's payments: the home one for a mortgage, «Deudas» for the rest. */
const PAYMENT_CATEGORY = {
  mortgage: { name: 'Vivienda', icon: '🏠' },
  other: { name: 'Deudas', icon: '💳' },
};

/**
 * Investments, property and debts valued by hand (the free plan can keep a few; part of the net
 * worth). A debt can also be paid every month by an automatic operation: its payments lower what
 * is owed by themselves (README, «Deudas que se pagan solas»).
 */
export class AssetService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly entitlements: EntitlementService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly debt: DebtCollaborators
  ) {}

  list(userId: string): AssetView[] {
    // The payments made so far must exist to know what is owed (generation is lazy).
    const { monthStartDay } = this.debt.settings.get(userId);
    this.debt.materializer.ensureUpTo(userId, currentPeriod(monthStartDay, this.clock.now()));
    const values = this.assets.valuesByUser(userId);
    const rules = new Map(this.debt.rules.listByUser(userId).map((r) => [r.id, r]));
    const today = todayDateOnly(this.clock.now());
    return this.assets.listByUser(userId).map((a) => {
      const own = values.filter((v) => v.assetId === a.id);
      const rule = a.paymentRuleId ? (rules.get(a.paymentRuleId) ?? null) : null;
      const payments = rule ? this.debt.debts.payments(userId, rule.id) : [];
      const history = rule
        ? this.paidHistory(own, payments, a.interestRate, today)
        : own.map((v) => ({ date: v.date, valueCents: v.valueCents }));
      const last = history[history.length - 1];
      const schedule = rule ? this.debt.debts.schedule(a, rule, own, payments) : null;
      return {
        id: a.id,
        name: a.name,
        kind: a.kind,
        interestRate: a.interestRate,
        minPaymentCents: a.minPaymentCents,
        debtType: a.debtType,
        initialCents: a.initialCents,
        valueCents: last?.valueCents ?? 0,
        valueDate: last?.date ?? null,
        previousCents: history.length > 1 ? history[history.length - 2].valueCents : null,
        history,
        payment:
          rule && schedule
            ? {
                ruleId: rule.id,
                amountCents: rule.amountCents,
                day: rule.day ?? 1,
                accountId: rule.accountId,
                active: rule.active,
                start: rule.start,
                end: rule.end,
                lastInstalment: a.paymentEnd,
                nextDate: schedule.nextDate,
                remainingPayments: schedule.remainingPayments,
                paidCents: schedule.paidCents,
                coversInterest: schedule.coversInterest,
              }
            : null,
        paidOff: schedule !== null && schedule.owedCents === 0,
      };
    });
  }

  /** What was owed after each value written down and each payment made so far. */
  private paidHistory(
    own: { date: string; valueCents: Cents }[],
    payments: { date: string; amountCents: Cents }[],
    ratePct: number | null,
    today: string
  ): { date: string; valueCents: Cents }[] {
    const first = own.reduce((min, v) => (v.date < min ? v.date : min), today);
    const dates = new Set([
      ...own.filter((v) => v.date <= today).map((v) => v.date),
      ...payments.filter((p) => p.date >= first && p.date <= today).map((p) => p.date),
    ]);
    return [...dates]
      .sort()
      .map((date) => ({ date, valueCents: debtOwedAt(own, payments, ratePct, date) }));
  }

  private view(userId: string, id: string): AssetView {
    return this.list(userId).find((a) => a.id === id) as AssetView;
  }

  private require(userId: string, id: string): Asset {
    const asset = this.assets.findById(userId, id);
    if (!asset) throw new NotFoundError('Elemento no encontrado', 'ASSET_NOT_FOUND');
    return asset;
  }

  private assertCanAddPayment(userId: string): void {
    this.entitlements.assertCanCreate(
      userId,
      'recurringRules',
      this.debt.rules.listByUser(userId).length
    );
  }

  create(userId: string, input: AssetInput): AssetView {
    const name = input.name.trim();
    if (!name || name.length > 60)
      throw new ValidationError('El nombre debe tener entre 1 y 60 caracteres');
    const count = this.assets.listByUser(userId).length;
    this.entitlements.assertCanCreate(userId, 'assets', count);
    if (count >= MAX_ASSETS) {
      throw new ValidationError(`Máximo ${MAX_ASSETS} elementos`, 'TOO_MANY_ASSETS');
    }
    const isDebt = input.kind === 'debt';
    const payment = isDebt ? (input.payment ?? null) : null;
    if (payment) this.assertCanAddPayment(userId);
    const asset: Asset = {
      id: randomUUID(),
      userId,
      name,
      kind: input.kind,
      interestRate: isDebt ? (input.interestRate ?? null) : null,
      minPaymentCents: isDebt ? (input.minPaymentCents ?? null) : null,
      debtType: isDebt ? (input.debtType ?? 'other') : null,
      initialCents: isDebt ? (input.initialCents ?? null) : null,
      paymentRuleId: null,
      paymentEnd: null,
      createdAt: this.clock.now().toISOString(),
    };
    this.uow.run(() => {
      this.assets.save(asset);
      this.setValueUnchecked(asset.id, input.valueCents, input.date);
      if (payment) this.attachPayment(userId, asset, payment);
    });
    if (payment) this.refreshMovements(userId);
    return this.view(userId, asset.id);
  }

  /** Records what the asset is worth on a date (today by default). */
  setValue(userId: string, id: string, valueCents: Cents, date?: string | null): AssetView {
    const asset = this.require(userId, id);
    this.uow.run(() => {
      this.setValueUnchecked(id, valueCents, date);
      this.debt.debts.resync(userId, asset);
    });
    if (asset.paymentRuleId) this.refreshMovements(userId);
    return this.view(userId, id);
  }

  /** Interest rate and minimum payment of a debt. */
  setTerms(
    userId: string,
    id: string,
    terms: { interestRate: number | null; minPaymentCents: Cents | null }
  ): AssetView {
    const asset = this.requireDebt(userId, id);
    this.uow.run(() => {
      const next = { ...asset, ...terms };
      this.assets.save(next);
      this.debt.debts.resync(userId, next);
    });
    if (asset.paymentRuleId) this.refreshMovements(userId);
    return this.view(userId, id);
  }

  /** Kind, amount borrowed, interest and how it is paid every month. */
  updateDebt(userId: string, id: string, changes: DebtChanges): AssetView {
    const asset = this.requireDebt(userId, id);
    if (changes.payment && !asset.paymentRuleId) this.assertCanAddPayment(userId);
    this.uow.run(() => {
      const next: Asset = {
        ...asset,
        debtType: changes.debtType ?? asset.debtType,
        initialCents:
          changes.initialCents !== undefined ? changes.initialCents : asset.initialCents,
        interestRate:
          changes.interestRate !== undefined ? changes.interestRate : asset.interestRate,
      };
      this.assets.save(next);
      if (changes.payment === null) {
        // Stops paying it by itself: it keeps what it owes and is valued by hand again.
        if (next.paymentRuleId) this.dropRule(userId, next.paymentRuleId);
      } else if (changes.payment && next.paymentRuleId)
        this.changePayment(userId, next, changes.payment);
      else if (changes.payment) this.attachPayment(userId, next, changes.payment);
      else this.debt.debts.resync(userId, next);
    });
    this.refreshMovements(userId);
    return this.view(userId, id);
  }

  /**
   * Removes the element. A debt's automatic operation goes with it: the payments already made
   * stay as normal movements, the ones still to come are removed.
   */
  delete(userId: string, id: string): void {
    const asset = this.require(userId, id);
    this.uow.run(() => {
      if (asset.paymentRuleId) this.dropRule(userId, asset.paymentRuleId);
      this.assets.delete(userId, id);
    });
    if (asset.paymentRuleId) this.debt.materializer.invalidate(userId);
  }

  private requireDebt(userId: string, id: string): Asset {
    const asset = this.require(userId, id);
    if (asset.kind !== 'debt') throw new ValidationError('Solo las deudas tienen condiciones');
    return asset;
  }

  private setValueUnchecked(assetId: string, valueCents: Cents, date?: string | null): void {
    this.assets.setValue({
      assetId,
      date: date ? toDateOnly(date) : todayDateOnly(this.clock.now()),
      valueCents,
    });
  }

  /** The last instalment, `instalments` payments from `start` on. */
  private lastInstalment(start: Period, instalments: number | null | undefined): Period | null {
    return instalments ? addMonths(start, instalments - 1) : null;
  }

  /** Creates the automatic operation (an expense on the chosen account) that pays the debt. */
  private attachPayment(userId: string, asset: Asset, payment: DebtPaymentInput): void {
    const { monthStartDay, locale } = this.debt.settings.get(userId);
    const account = this.debt.accounts.resolveForMovement(userId, payment.accountId);
    const category = PAYMENT_CATEGORY[asset.debtType === 'mortgage' ? 'mortgage' : 'other'];
    const start = this.debt.debts.firstFuturePeriod(
      userId,
      payment.start ?? currentPeriod(monthStartDay, this.clock.now()),
      payment.day
    );
    const rule = RecurringRule.create(
      userId,
      {
        description: locale === 'en' ? `${asset.name} payment` : `Cuota ${asset.name}`,
        amountCents: payment.amountCents,
        type: 'EXPENSE',
        categoryId: this.debt.categories.findOrCreate(userId, category.name, category.icon).id,
        accountId: account.id,
        start,
        frequency: 'monthly',
        day: payment.day,
      },
      this.clock.now()
    );
    this.debt.rules.save(rule);
    const linked: Asset = {
      ...asset,
      paymentRuleId: rule.id,
      paymentEnd: this.lastInstalment(start, payment.instalments),
    };
    this.assets.save(linked);
    this.debt.debts.resync(userId, linked);
  }

  /** New amount, day, account, first payment or instalments: they apply to what is to come. */
  private changePayment(userId: string, asset: Asset, payment: DebtPaymentInput): void {
    const rule = this.debt.rules.findById(userId, asset.paymentRuleId as string) as RecurringRule;
    const accountId =
      payment.accountId !== undefined && payment.accountId !== rule.accountId
        ? this.debt.accounts.resolveForMovement(userId, payment.accountId).id
        : rule.accountId;
    // A running operation keeps its start (the payments made are history); a new first payment
    // can only be one still to come.
    const start = payment.start
      ? this.debt.debts.firstFuturePeriod(userId, payment.start, payment.day)
      : rule.start;
    this.debt.rules.save(
      rule.update({
        amountCents: payment.amountCents,
        day: payment.day,
        accountId,
        start,
        end: null,
      })
    );
    const next: Asset = {
      ...asset,
      paymentEnd:
        payment.instalments !== undefined
          ? this.lastInstalment(
              this.debt.debts.firstFuturePeriod(userId, start, payment.day),
              payment.instalments
            )
          : asset.paymentEnd,
    };
    this.assets.save(next);
    this.debt.debts.resync(userId, next);
  }

  /** Removes a debt's operation: past payments stay (as normal movements), coming ones go. */
  private dropRule(userId: string, ruleId: string): void {
    this.debt.transactions.deleteByRuleAfter(userId, ruleId, this.debt.debts.today());
    this.debt.debts.detach(userId, ruleId);
    this.debt.rules.delete(userId, ruleId);
  }

  /** The materializer makes the payments again with the new terms. */
  private refreshMovements(userId: string): void {
    const { monthStartDay } = this.debt.settings.get(userId);
    this.debt.materializer.invalidate(userId);
    this.debt.materializer.ensureUpTo(
      userId,
      addMonths(currentPeriod(monthStartDay, this.clock.now()), 1)
    );
  }
}
