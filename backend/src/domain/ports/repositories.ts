import { Account } from '@domain/model/Account';
import { Category } from '@domain/model/Category';
import { CategoryBudget } from '@domain/model/CategoryBudget';
import { CustomAlert } from '@domain/model/CustomAlert';
import { Goal } from '@domain/model/Goal';
import { RecurringRule } from '@domain/model/RecurringRule';
import { Transaction } from '@domain/model/Transaction';
import { TransactionType } from '@domain/model/TransactionType';
import { Transfer } from '@domain/model/Transfer';
import { User } from '@domain/model/User';
import { UserSettingsProps } from '@domain/model/UserSettings';
import { SubscriptionProps } from '@domain/model/Subscription';
import { Advice } from '@domain/services/rule-based-advisor';
import { CategoryPeriodTotal } from '@domain/services/trends';
import { Cents } from '@domain/shared/money';
import { Period } from '@domain/shared/period';

/**
 * Every repository method that touches user data takes the owner's id, so a
 * query can never read or change another user's rows (this is what closes the
 * IDOR holes of the previous version).
 *
 * Repositories are synchronous: SQLite runs in-process and a UnitOfWork wraps
 * several calls in one database transaction.
 */
export interface UnitOfWork {
  run<T>(work: () => T): T;
}

export interface UserRepository {
  findById(id: string): User | null;
  findByEmail(email: string): User | null;
  findByGoogleId(googleId: string): User | null;
  findByVerificationTokenHash(hash: string): User | null;
  findByResetTokenHash(hash: string): User | null;
  save(user: User): void;
  delete(id: string): void;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface RefreshTokenRepository {
  save(record: RefreshTokenRecord): void;
  findByHash(tokenHash: string): RefreshTokenRecord | null;
  /** Sliding expiration: active sessions stay alive. */
  extend(tokenHash: string, expiresAt: string): void;
  deleteByHash(tokenHash: string): void;
  deleteByUser(userId: string): void;
  deleteExpired(now: Date): number;
}

export interface CategoryUsage {
  transactions: number;
  recurringRules: number;
  customAlerts: number;
  budgets: number;
  goals: number;
}

export interface CategoryRepository {
  listByUser(userId: string): Category[];
  findById(userId: string, id: string): Category | null;
  /** Case-insensitive lookup. */
  findByName(userId: string, name: string): Category | null;
  save(category: Category): void;
  delete(userId: string, id: string): void;
  usage(userId: string, id: string): CategoryUsage;
  /** Moves every reference (movements, rules, alerts, goals, budgets) to another category. */
  reassign(userId: string, fromId: string, toId: string): void;
  seedDefaults(userId: string): void;
}

export interface AccountRepository {
  listByUser(userId: string): Account[];
  findById(userId: string, id: string): Account | null;
  save(account: Account): void;
  delete(userId: string, id: string): void;
  /** Movements + transfers that reference the account. */
  countReferences(userId: string, id: string): number;
  /** Net effect of movements and transfers per account (initial balance not included). */
  movementBalances(userId: string): Record<string, Cents>;
}

export interface TransferView {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amountCents: Cents;
  date: string;
  description: string | null;
  createdAt: string;
}

export interface TransferRepository {
  listByUser(userId: string, limit: number): TransferView[];
  findById(userId: string, id: string): Transfer | null;
  save(transfer: Transfer): void;
  delete(userId: string, id: string): boolean;
}

export interface TransactionView {
  id: string;
  description: string;
  amountCents: Cents;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  accountId: string;
  accountName: string;
  date: string;
  year: number;
  month: number;
  notes: string | null;
  recurringRuleId: string | null;
  createdAt: string;
}

export type TransactionSort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export interface TransactionSearchFilters {
  text?: string;
  type?: TransactionType;
  categoryIds?: string[];
  accountId?: string;
  from?: string;
  to?: string;
  minCents?: Cents;
  maxCents?: Cents;
  sort: TransactionSort;
  limit: number;
  offset: number;
}

export interface TransactionSearchResult {
  items: TransactionView[];
  total: number;
  totals: { incomeCents: Cents; expenseCents: Cents; savingCents: Cents };
}

export interface PeriodTotals {
  year: number;
  month: number;
  incomeCents: Cents;
  expenseCents: Cents;
  savingCents: Cents;
}

export interface TransactionRepository {
  findById(userId: string, id: string): Transaction | null;
  findView(userId: string, id: string): TransactionView | null;
  save(transaction: Transaction): void;
  /** Inserts unless a row with the same recurring rule+period or import hash exists. */
  insertIfAbsent(transaction: Transaction): boolean;
  delete(userId: string, id: string): boolean;
  listByPeriod(userId: string, period: Period): TransactionView[];
  search(userId: string, filters: TransactionSearchFilters): TransactionSearchResult;
  /** Σ(income − expenses − saving) of every period strictly before `period`. */
  netBefore(userId: string, period: Period): Cents;
  totalsByPeriod(userId: string, from: Period, to: Period): PeriodTotals[];
  categoryTotals(
    userId: string,
    from: Period,
    to: Period,
    type: TransactionType
  ): CategoryPeriodTotal[];
  /** All-time SAVING per category id (used by goals). */
  savedByCategory(userId: string): Record<string, Cents>;
  existingImportHashes(userId: string, hashes: string[]): Set<string>;
  /** Most recent category used for each normalised description. */
  lastCategoryByDescription(userId: string, descriptionKeys: string[]): Map<string, string>;
  listByRule(userId: string, ruleId: string): Transaction[];
  deleteByRule(userId: string, ruleId: string, fromPeriod?: Period): number;
  listAllByUser(userId: string): Transaction[];
  exportAll(userId: string): TransactionView[];
  earliestPeriod(userId: string): Period | null;
}

export interface RecurringRuleRepository {
  listByUser(userId: string): RecurringRule[];
  findById(userId: string, id: string): RecurringRule | null;
  save(rule: RecurringRule): void;
  delete(userId: string, id: string): void;
  /** Remembers that the movement of `period` was removed so it is not generated again. */
  addSkip(ruleId: string, period: Period): void;
  skippedPeriods(ruleId: string): Period[];
  clearSkipsFrom(ruleId: string, from: Period): void;
}

export interface CustomAlertRepository {
  listByUser(userId: string): CustomAlert[];
  findById(userId: string, id: string): CustomAlert | null;
  save(alert: CustomAlert): void;
  delete(userId: string, id: string): void;
}

export interface BudgetView {
  id: string;
  categoryId: string;
  categoryName: string;
  amountCents: Cents;
}

export interface CategoryBudgetRepository {
  listByUser(userId: string): BudgetView[];
  findById(userId: string, id: string): CategoryBudget | null;
  findByCategory(userId: string, categoryId: string): CategoryBudget | null;
  save(budget: CategoryBudget): void;
  delete(userId: string, id: string): void;
}

export interface GoalRepository {
  listByUser(userId: string): Goal[];
  findById(userId: string, id: string): Goal | null;
  save(goal: Goal): void;
  delete(userId: string, id: string): void;
}

export interface SettingsRepository {
  get(userId: string): UserSettingsProps;
  save(settings: UserSettingsProps): void;
}

// ─── Monetization ────────────────────────────────────────────────────────────

export interface SubscriptionRepository {
  get(userId: string): SubscriptionProps | null;
  save(subscription: SubscriptionProps): void;
  findByStripeCustomer(customerId: string): SubscriptionProps | null;
  findByStripeSubscription(subscriptionId: string): SubscriptionProps | null;
  countLifetime(): number;
}

/** Payment provider events already applied (webhooks can be delivered twice). */
export interface BillingEventRepository {
  wasProcessed(eventId: string): boolean;
  markProcessed(eventId: string, type: string, at: Date): void;
}

/**
 * Bookkeeping that keeps the AI free: neurons spent per day (global cap),
 * analyses per user and month (quota) and a persistent answer cache.
 */
export interface AiUsageRepository {
  neuronsOn(day: string): number;
  addNeurons(day: string, neurons: number): void;
  userCalls(userId: string, month: string): number;
  addUserCall(userId: string, month: string): void;
  getCachedAdvice(userId: string, key: string): Advice | null;
  saveCachedAdvice(userId: string, key: string, advice: Advice, at: Date): void;
}

export interface AffiliateClickRepository {
  record(userId: string, offerId: string, at: Date): void;
  countByOffer(since: Date): Record<string, number>;
}
