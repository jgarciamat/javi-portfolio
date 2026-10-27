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
import { LeakDecision, LeakMovement } from '@domain/services/money-leaks';
import { RuleMovement } from '@domain/services/recurring-match';
import { SubscriptionCandidate } from '@domain/services/subscriptions';
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
  /** Every token issued from one sign-in shares the family (rotation). */
  familyId: string;
  /** Absolute end of the family, however often it is refreshed. */
  familyExpiresAt: string;
  /** When the user signed in (password, Google) to start the family. */
  authTime: string;
  /** Set once the token was exchanged for a new one; using it again is a replay. */
  rotatedAt: string | null;
}

export interface RefreshTokenRepository {
  save(record: RefreshTokenRecord): void;
  findByHash(tokenHash: string): RefreshTokenRecord | null;
  markRotated(tokenHash: string, at: string): void;
  deleteByHash(tokenHash: string): void;
  deleteFamily(familyId: string): void;
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

/** "Text found in a description → category" rules the user taught the app. */
export interface CategoryRule {
  id: string;
  userId: string;
  /** Normalised text (see `normalizeText`) searched inside the description. */
  pattern: string;
  categoryId: string;
  createdAt: string;
}

export interface CategoryRuleRepository {
  listByUser(userId: string): CategoryRule[];
  /** One rule per pattern: saving an existing pattern changes its category. */
  save(rule: CategoryRule): CategoryRule;
  delete(userId: string, id: string): boolean;
}

export type AssetKind = 'investment' | 'property' | 'vehicle' | 'other' | 'debt';

export interface Asset {
  id: string;
  userId: string;
  name: string;
  kind: AssetKind;
  /** Debts: yearly interest rate in percent and minimum monthly payment. */
  interestRate: number | null;
  minPaymentCents: number | null;
  createdAt: string;
}

export interface AssetValue {
  assetId: string;
  date: string;
  valueCents: number;
}

export interface AssetRepository {
  listByUser(userId: string): Asset[];
  findById(userId: string, id: string): Asset | null;
  save(asset: Asset): void;
  delete(userId: string, id: string): boolean;
  /** One value per asset and date: setting it again replaces it. */
  setValue(value: AssetValue): void;
  /** Every value of the user's assets, oldest first. */
  valuesByUser(userId: string): AssetValue[];
}

export interface AccountRepository {
  listByUser(userId: string): Account[];
  findById(userId: string, id: string): Account | null;
  save(account: Account): void;
  delete(userId: string, id: string): void;
  /** Movements + transfers that reference the account. */
  countReferences(userId: string, id: string): number;
  /**
   * Net effect of movements and transfers per account (initial balance not included). With
   * `upTo`, only the movements of that period and earlier, and the transfers up to `upTo.endDate`.
   */
  movementBalances(
    userId: string,
    upTo?: { period: Period; endDate: string }
  ): Record<string, Cents>;
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
  /** SAVING per category and period, all time (the saving pace of goals). */
  savingByCategoryAndPeriod(
    userId: string
  ): { categoryId: string; year: number; month: number; cents: Cents }[];
  /**
   * Movements dated from `fromDate` on, the most recent `limit` of them, with their category
   * name (what «Tu dinero perdido» looks at).
   */
  listSince(userId: string, fromDate: string, limit: number): LeakMovement[];
  existingImportHashes(userId: string, hashes: string[]): Set<string>;
  /** Movements added by automatic operations dated between two days (both included). */
  listFromRulesBetween(userId: string, fromDate: string, toDate: string): RuleMovement[];
  /** Most recent category used for each normalised description. */
  lastCategoryByDescription(userId: string, descriptionKeys: string[]): Map<string, string>;
  listByRule(userId: string, ruleId: string): Transaction[];
  deleteByRule(userId: string, ruleId: string, fromPeriod?: Period): number;
  listAllByUser(userId: string): Transaction[];
  /**
   * The expenses not added by an automatic operation, with only what the subscription detector
   * reads (lighter than `listAllByUser` with tens of thousands of movements).
   */
  listSubscriptionCandidates(userId: string): (Omit<SubscriptionCandidate, 'categoryName'> & {
    categoryId: string;
  })[];
  /** Date of the first movement (YYYY-MM-DD), or null without any. */
  firstDate(userId: string): string | null;
  /** Movements of automatic operations of the periods of `year` dated after `today`. */
  scheduledTotals(
    userId: string,
    year: number,
    today: string
  ): { count: number; incomeCents: Cents; expenseCents: Cents; savingCents: Cents };
  exportAll(userId: string): TransactionView[];
  earliestPeriod(userId: string): Period | null;
  /** How many movements the user has in total. */
  count(userId: string): number;
  /** The invented movements of «Pruébalo con datos de ejemplo» (import hash `sample:…`). */
  countSample(userId: string): number;
  /** Removes those invented movements; returns how many. */
  deleteSample(userId: string): number;
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

/** What each user decided about the findings of «Tu dinero perdido» (never the findings). */
export interface LeakDecisionRepository {
  listByUser(userId: string): LeakDecision[];
  /** Creates or replaces the decision on a finding; keeps the newest `max` of the user. */
  save(userId: string, decision: LeakDecision, max: number): void;
  delete(userId: string, findingId: string): boolean;
  /** Forgets decisions on findings that are gone (lazy clean-up). */
  deleteMany(userId: string, findingIds: string[]): void;
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

// ─── Push notifications ──────────────────────────────────────────────────────

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** The one-month passes that include reading a tax return draft. */
export interface RentaPassRepository {
  endsAt(userId: string): string | null;
  set(userId: string, endsAt: string): void;
  remove(userId: string): void;
}

/** How many self-employed tax drafts a user has prepared for each quarter. */
/** The drafts of one quarter: how many, the territory of the last one and its extra draft. */
export interface QuarterDraftRecord {
  uses: number;
  /** Territory of the last draft (null before any, or from before territories were kept). */
  territory: string | null;
  /** The one extra free draft for a change of territory has been used. */
  territoryExtra: boolean;
}

export interface AutonomoUsageRepository {
  count(userId: string, year: number, quarter: number): number;
  record(userId: string, year: number, quarter: number): QuarterDraftRecord;
  /** One more draft of that quarter, made for `territory`; returns how many there are now. */
  increment(userId: string, year: number, quarter: number, territory?: string): number;
  /** The extra draft for a change of territory: it is spent, and `territory` becomes the last. */
  useTerritoryExtra(userId: string, year: number, quarter: number, territory: string): void;
}

/** How many bank statements a user has imported (previews do not count). */
export interface ImportUsageRepository {
  count(userId: string): number;
  /** One more import; returns how many there are now. */
  increment(userId: string): number;
}

/** How many draft PDFs a self-employed user has downloaded. */
export interface AutonomoPdfRepository {
  count(userId: string): number;
  /** One more download; returns how many there are now. */
  increment(userId: string): number;
}

/** How many tax return calculations a user has made in each Renta campaign. */
export interface RentaUsageRepository {
  count(userId: string, campaign: number): number;
  /** One more calculation in that campaign; returns how many there are now. */
  increment(userId: string, campaign: number): number;
}

export type InboxStatus = 'imported' | 'duplicate' | 'unreadable' | 'failed';

export interface InboxMessage {
  id: string;
  receivedAt: string;
  status: InboxStatus;
  description: string | null;
  amountCents: number | null;
}

export interface InboxRepository {
  tokenOf(userId: string): string | null;
  userOf(token: string): string | null;
  /** Replaces the token of the user (a new address). */
  setToken(userId: string, token: string, at: string): void;
  log(userId: string, message: InboxMessage): void;
  /** The latest messages, newest first (older ones are dropped). */
  recent(userId: string, limit: number): InboxMessage[];
}

export interface PushRepository {
  /** One row per endpoint; another user only takes it over with the same keys (same browser). */
  save(subscription: PushSubscriptionRecord, createdAt: string): void;
  remove(userId: string, endpoint: string): void;
  /** Used when the push service says the subscription is gone. */
  removeEndpoint(endpoint: string): void;
  listByUser(userId: string): PushSubscriptionRecord[];
  /** Users with at least one subscription. */
  subscribedUsers(): string[];
  /** Marks a notification as sent; false when that exact one (kind + key) already went out. */
  claim(userId: string, kind: string, key: string, at: string): boolean;
}

// ─── Shared expenses ─────────────────────────────────────────────────────────

export interface SplitGroup {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface SplitMember {
  id: string;
  name: string;
}

export interface SplitExpenseRecord {
  id: string;
  description: string;
  amountCents: Cents;
  paidBy: string;
  date: string;
  settlement: boolean;
  shares: { memberId: string; shareCents: Cents }[];
}

export interface SplitRepository {
  listGroups(userId: string): SplitGroup[];
  findGroup(userId: string, id: string): SplitGroup | null;
  createGroup(group: SplitGroup, members: SplitMember[]): void;
  deleteGroup(userId: string, id: string): boolean;
  members(groupId: string): SplitMember[];
  expenses(groupId: string): SplitExpenseRecord[];
  addExpense(groupId: string, expense: SplitExpenseRecord, createdAt: string): void;
  deleteExpense(groupId: string, expenseId: string): boolean;
}

// ─── Self-employed ───────────────────────────────────────────────────────────

export type VatRate = 0 | 4 | 10 | 21;

export interface BusinessCategory {
  categoryId: string;
  vatRate: VatRate;
}

export interface BusinessCategoryRepository {
  listByUser(userId: string): BusinessCategory[];
  set(userId: string, categoryId: string, vatRate: VatRate): void;
  remove(userId: string, categoryId: string): void;
}

// ─── Weekly digest ───────────────────────────────────────────────────────────

export interface DigestRecipient {
  userId: string;
  email: string;
  name: string;
  locale: 'es' | 'en';
  currency: string;
}

export interface DigestRepository {
  /** Verified users who asked for the digest and have not had one since `notSentSince`. */
  due(notSentSince: string): DigestRecipient[];
  markSent(userId: string, at: string): void;
}

// ─── Trial end notices ───────────────────────────────────────────────────────

export interface TrialNoticeCandidate {
  userId: string;
  email: string;
  name: string;
  locale: 'es' | 'en';
  emailVerified: boolean;
  trialEndsAt: string;
}

export interface TrialNoticeRepository {
  /**
   * Users still on the free trial (no paid plan, not lifetime, not cancelling) whose trial ends
   * between `from` and `to`, and who have not turned the notices off.
   */
  candidates(from: string, to: string): TrialNoticeCandidate[];
  /** Marks a notice as sent; false when that notice already went out to the user. */
  claim(userId: string, kind: string, at: string): boolean;
  /** Takes the mark back when nothing could be delivered, so the next run tries again. */
  release(userId: string, kind: string): void;
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

// ─── Referrals ───────────────────────────────────────────────────────────────

export interface ReferralRecord {
  referredId: string;
  referrerId: string;
  createdAt: string;
  rewardedAt: string | null;
}

export interface ReferralRepository {
  codeOf(userId: string): string | null;
  /** Stores a new code; false when the code is already taken. */
  saveCode(userId: string, code: string): boolean;
  userByCode(code: string): string | null;
  /** Records who invited a user (a user can only be invited once). */
  addReferral(record: ReferralRecord): boolean;
  findByReferred(referredId: string): ReferralRecord | null;
  /** Marks the invited user as having completed the first steps. */
  markRewarded(referredId: string, at: string): void;
  /** Invited users who completed the first steps (`qualified`) and those who have not yet. */
  counts(referrerId: string): { qualified: number; pending: number };
  /** Invited users still waiting to complete the first steps. */
  pendingReferred(referrerId: string): string[];
  /** Months of Premium already granted to the inviter for their invitations. */
  rewardsGranted(userId: string): number;
  setRewardsGranted(userId: string, count: number): void;
}

// ─── Creator affiliate program (docs/afiliacion) ─────────────────────────────

export type CreatorPlan = 'monthly' | 'yearly' | 'lifetime';
export type CreatorSaleProvider = 'stripe' | 'google';

export interface CreatorAffiliateRecord {
  /** Upper case, what goes in `?aff=`. */
  code: string;
  /** A handle or alias: the creator's legal name, tax id and bank details stay out of here. */
  name: string;
  /** Own cap per calendar year; null uses the program's. */
  capCents: number | null;
  active: boolean;
  createdAt: string;
}

/** A first Premium payment of a user who signed up with a creator's code (and agreed to it). */
export interface CreatorSaleRecord {
  id: number;
  code: string;
  plan: CreatorPlan;
  provider: CreatorSaleProvider;
  /** Commission in force when it was sold. */
  commissionCents: number;
  soldAt: string;
  /** Refunded or charged back. */
  reversedAt: string | null;
  paidAt: string | null;
  /** What was paid for it (after the caps). */
  paidCents: number | null;
  /** A reversal after paying, deducted from a later payment. */
  clawedAt: string | null;
}

export interface CreatorRepository {
  affiliate(code: string): CreatorAffiliateRecord | null;
  affiliates(): CreatorAffiliateRecord[];
  /** False when the code already exists. */
  addAffiliate(record: CreatorAffiliateRecord): boolean;
  /** False when the code does not exist. */
  setActive(code: string, active: boolean): boolean;
  /** A user is attributed once, at sign-up. */
  attribute(userId: string, code: string, at: string): boolean;
  attributionOf(userId: string): { code: string; createdAt: string } | null;
  /** Users attributed to each code (accounts deleted since are not counted). */
  signupsByCode(): Record<string, number>;
  /** Only the first sale of a user counts: false when there was one already. */
  addSale(userId: string, sale: Omit<CreatorSaleRecord, 'id'>): boolean;
  saleOf(userId: string): CreatorSaleRecord | null;
  markReversed(id: number, at: string): void;
  sales(): CreatorSaleRecord[];
  markPaid(paid: { id: number; cents: number }[], clawed: number[], at: string): void;
  /** Consent withdrawn: the attribution goes, a sale stays only as an anonymous record. */
  forget(userId: string): void;
}

// ─── Household ───────────────────────────────────────────────────────────────

export interface HouseholdMemberRecord {
  memberId: string;
  joinedAt: string;
}

export interface HouseholdInviteRecord {
  ownerId: string;
  expiresAt: string;
}

export interface HouseholdRepository {
  /** Owner of the data this user works on (null when the user works on their own). */
  ownerOf(memberId: string): string | null;
  membersOf(ownerId: string): HouseholdMemberRecord[];
  addMember(memberId: string, ownerId: string, joinedAt: string): void;
  removeMember(memberId: string): boolean;
  /** Replaces the pending invitation of the owner. */
  saveInvite(ownerId: string, codeHash: string, createdAt: string, expiresAt: string): void;
  findInvite(codeHash: string): HouseholdInviteRecord | null;
  pendingInvite(ownerId: string): HouseholdInviteRecord | null;
  deleteInvite(ownerId: string): void;
}

// ─── Data export ─────────────────────────────────────────────────────────────

/**
 * Read-only view of the records that have no repository read fit for the GDPR export
 * (assets, splits, inbox, billing, referrals…). Sections are plain JSON, amounts in euros.
 */
export interface PersonalDataReader {
  sectionsFor(userId: string): Record<string, unknown>;
}

// ─── Crypto simulator (play money) ───────────────────────────────────────────

/** A play-money portfolio: the official one of a monthly season, or a practice one. */
export interface CryptoSimPortfolio {
  id: string;
  userId: string;
  kind: 'season' | 'practice';
  /** YYYY-MM (Spain) of an official portfolio; null for practice. */
  season: string | null;
  initialCents: Cents;
  cashCents: Cents;
  feeBps: number;
  startedAt: string;
  /** When its season ended (frozen); always null for practice. */
  closedAt: string | null;
}

/** One purchase of the simulator: open while `closedAt` is null. */
export interface CryptoSimPosition {
  id: string;
  userId: string;
  portfolioId: string;
  symbol: string;
  /** `long`: bought; `short`: sold, with the amount kept as its guarantee (1x). */
  direction: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  amountCents: Cents;
  entryFeeCents: Cents;
  openType: 'market' | 'limit' | 'stop';
  openedAt: string;
  exitPrice: number | null;
  exitFeeCents: Cents | null;
  proceedsCents: Cents | null;
  pnlCents: Cents | null;
  /** `season`: closed at the last price when its season ended. */
  closeType: 'market' | 'limit' | 'stop' | 'liquidation' | 'season' | null;
  closedAt: string | null;
  /** Its number among the operations of the coin (#1, #2); null on the oldest closed ones. */
  slot: number | null;
}

/** An order waiting for a price: a purchase (`amountCents`) or the sale of `positionId`. */
export interface CryptoSimOrder {
  id: string;
  userId: string;
  portfolioId: string;
  symbol: string;
  side: 'buy' | 'sell';
  /** Direction of the position it opens or closes. */
  direction: 'long' | 'short';
  type: 'limit' | 'stop';
  price: number;
  amountCents: Cents | null;
  reservedCents: Cents;
  positionId: string | null;
  createdAt: string;
  /** Take profit and stop loss to leave once a pending purchase is filled. */
  takeProfit: number | null;
  stopLoss: number | null;
  /** Number of a pending purchase among the operations of the coin; null on take profit and stop loss. */
  slot: number | null;
}

/** The ranking alias (null until the person changes it) and the daily practice restarts. */
export interface CryptoSimProfile {
  userId: string;
  alias: string | null;
  practiceDay: string | null;
  practiceActions: number;
  updatedAt: string;
}

/** The frozen result of a finished season. */
export interface CryptoSeasonResult {
  userId: string;
  season: string;
  initialCents: Cents;
  finalCents: Cents;
  trades: number;
  wins: number;
  activeDays: number;
  reachedAt: string | null;
  /** The person had asked to appear in the ranking when the season ended. */
  ranked: boolean;
  alias: string | null;
  premium: boolean;
  /** 1-5 when it entered the top 5 of the month. */
  place: number | null;
  prizeDays: number;
  createdAt: string;
}

export interface CryptoPriceAlert {
  id: string;
  userId: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  createdAt: string;
  triggeredAt: string | null;
}

export interface CryptoSimRepository {
  // Portfolios
  portfolio(userId: string, id: string): CryptoSimPortfolio | null;
  /** The ones in use (not frozen): the official one of the season and the practice ones. */
  portfolios(userId: string): CryptoSimPortfolio[];
  seasonPortfolio(userId: string, season: string): CryptoSimPortfolio | null;
  insertPortfolio(portfolio: CryptoSimPortfolio): void;
  savePortfolio(portfolio: CryptoSimPortfolio): void;
  deletePortfolio(userId: string, id: string): boolean;
  /** Official portfolios not frozen yet whose season is before `season` (or exactly it). */
  seasonPortfoliosBefore(season: string): CryptoSimPortfolio[];
  seasonPortfoliosOf(season: string): CryptoSimPortfolio[];
  /** Deletes the frozen official portfolios (and their operations) of seasons before `season`. */
  purgeSeasonsBefore(season: string): number;

  // Operations
  positions(portfolioId: string): CryptoSimPosition[];
  position(userId: string, id: string): CryptoSimPosition | null;
  countPositions(portfolioId: string): { open: number; total: number };
  insertPosition(position: CryptoSimPosition): void;
  /** Closes an open position; false when it was already closed (or is not the user's). */
  closePosition(
    userId: string,
    id: string,
    close: Pick<
      CryptoSimPosition,
      'exitPrice' | 'exitFeeCents' | 'proceedsCents' | 'pnlCents' | 'closeType' | 'closedAt'
    >
  ): boolean;
  orders(portfolioId: string): CryptoSimOrder[];
  order(userId: string, id: string): CryptoSimOrder | null;
  insertOrder(order: CryptoSimOrder): void;
  /** Removes a pending order; false when it is no longer there. */
  deleteOrder(userId: string, id: string): boolean;
  deleteOrdersOfPosition(userId: string, positionId: string): number;
  /** «Start again» of a practice portfolio: every position and order goes. */
  clear(portfolioId: string): void;

  // Ranking, seasons and badges
  profile(userId: string): CryptoSimProfile | null;
  saveProfile(profile: CryptoSimProfile): void;
  /**
   * Everybody with an official portfolio of `season` (all of them are in the ranking), with the
   * alias they chose (null when they never changed it) and the name of their profile.
   */
  rankingCandidates(
    season: string
  ): { portfolio: CryptoSimPortfolio; alias: string | null; name: string }[];
  /** The alias the person chose (null when they never changed it) and the name of their profile. */
  rankingIdentity(userId: string): { alias: string | null; name: string };
  /** False when the result of that season was already frozen. */
  insertResult(result: CryptoSeasonResult): boolean;
  results(userId: string, limit: number): CryptoSeasonResult[];
  seasonResults(season: string): CryptoSeasonResult[];
  setPlace(userId: string, season: string, place: number, prizeDays: number): void;
  /** Finished seasons with frozen results whose ranking is not closed yet. */
  seasonsToClose(before: string): string[];
  /** Marks the ranking of a season as closed; false when it already was. */
  claimSeasonClose(season: string, at: string): boolean;
  badges(userId: string): { badge: string; earnedAt: string }[];
  addBadge(userId: string, badge: string, at: string): void;
  /** Operations of every portfolio of the user: opened, closed and closed at a take profit. */
  badgeFacts(userId: string): { opened: number; closed: number; takeProfit: number };
  saveEquityDay(portfolioId: string, day: string, equityCents: Cents): void;
  equityDays(portfolioId: string): { day: string; equityCents: Cents }[];

  // Price alerts
  alerts(userId: string): CryptoPriceAlert[];
  insertAlert(alert: CryptoPriceAlert): void;
  deleteAlert(userId: string, id: string): boolean;
  waitingAlerts(): CryptoPriceAlert[];
  /** Marks an alert as sent; false when another run already did. */
  triggerAlert(id: string, at: string): boolean;
  purgeAlerts(triggeredBefore: string): number;
}
