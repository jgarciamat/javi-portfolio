// ─── Finances domain types (amounts are decimal numbers in the user currency) ──
import type { Asset as FixedAsset } from './depreciation';
import type { Subsidy } from './subsidies';
import type { AgrarianModulesInput } from './agrarianModules';
import type { ObjectiveInput } from './objectiveModules';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'SAVING';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  /** Category name (unique per user). */
  category: string;
  categoryId?: string;
  categoryColor?: string;
  categoryIcon?: string;
  accountId?: string;
  accountName?: string;
  /** Calendar date, YYYY-MM-DD. */
  date: string;
  /** Budgeting period the movement belongs to. */
  year?: number;
  month?: number;
  createdAt: string;
  notes: string | null;
  recurringRuleId?: string | null;
}

export interface CreateTransactionDTO {
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId?: string | null;
  date?: string;
  notes?: string | null;
}

export interface UpdateTransactionDTO {
  description?: string;
  amount?: number;
  type?: TransactionType;
  category?: string;
  accountId?: string | null;
  date?: string;
  notes?: string | null;
}

/** One change applied to many movements at once (PATCH /transactions/bulk). */
export interface BulkTransactionChanges {
  categoryId?: string;
  type?: TransactionType;
  accountId?: string;
  date?: string;
  notes?: string | null;
  /** `append` adds the text after the current notes of each movement. */
  notesMode?: 'replace' | 'append';
}

/** What a bulk operation did: the ids changed and the ones left alone, with the reason. */
export interface BulkResult {
  applied: string[];
  skipped: { id: string; code: string; reason: string }[];
}

export interface Category {
  id: string;
  /** Owner (the API sends it; the app does not use it). */
  userId?: string;
  name: string;
  color: string;
  icon: string;
}

export interface CreateCategoryDTO {
  name: string;
  icon: string;
  color?: string;
}

export interface CategoryUsage {
  transactions: number;
  recurringRules: number;
  customAlerts: number;
  budgets: number;
  goals: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalSaving: number;
  balance: number;
  expensesByCategory: Record<string, number>;
  incomeByCategory: Record<string, number>;
  savingByCategory: Record<string, number>;
  transactionCount: number;
  /** The period the figures cover (the month summaries carry it). */
  year?: number;
  month?: number;
}

// ─── Month overview (GET /months/:year/:month) ─────────────────────────────────

export type BudgetLevel = 'ok' | 'warning' | 'danger';

export interface BudgetLine {
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  level: BudgetLevel;
}

export interface MonthAlert {
  kind: 'available' | 'category_budget';
  level: Exclude<BudgetLevel, 'ok'>;
  categoryName: string | null;
  spent: number;
  limit: number;
  percentage: number;
}

export interface MonthOverview {
  year: number;
  month: number;
  /** First and last day of the period (YYYY-MM-DD); differs from the calendar month with a custom start day. */
  start: string;
  end: string;
  isCurrent: boolean;
  transactions: Transaction[];
  summary: FinancialSummary;
  carryover: number;
  available: number;
  budgets: BudgetLine[];
  alerts: MonthAlert[];
}

export interface MonthData {
  income: number;
  expenses: number;
  saving: number;
  balance: number;
}

export interface AnnualSummary {
  year: number;
  openingBalance?: number;
  months: Record<number, MonthData>;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export type TransactionSort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export interface TransactionSearchFilters {
  q?: string;
  type?: TransactionType;
  categoryIds?: string[];
  accountId?: string;
  from?: string;
  to?: string;
  min?: number;
  max?: number;
  sort?: TransactionSort;
  limit?: number;
  offset?: number;
}

export interface TransactionSearchResult {
  items: Transaction[];
  total: number;
  totals: { income: number; expenses: number; saving: number };
}

// ─── Import ──────────────────────────────────────────────────────────────────

export interface ImportRowDTO {
  date: string;
  description: string;
  /** Signed: negative = expense, positive = income. */
  amount: number;
  type?: TransactionType | null;
  category?: string | null;
  notes?: string | null;
}

export interface ImportRowResult {
  index: number;
  status: 'imported' | 'duplicate' | 'invalid';
  date?: string;
  description?: string;
  amount?: number;
  type?: TransactionType;
  categoryName?: string;
  categorySource?: 'rule' | 'file' | 'history' | 'keywords' | 'ai' | 'fallback';
  error?: string;
}

export interface ImportResult {
  dryRun: boolean;
  imported: number;
  duplicates: number;
  invalid: number;
  rows: ImportRowResult[];
}

// ─── Recurring rules ──────────────────────────────────────────────────────────

export type RecurringFrequency = 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';

export interface RecurringRule {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  categoryId?: string;
  accountId?: string | null;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  frequency: RecurringFrequency;
  active: boolean;
  createdAt: string;
}

export interface CreateRecurringRuleDTO {
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId?: string | null;
  startYear: number;
  startMonth: number;
  endYear?: number | null;
  endMonth?: number | null;
  frequency?: RecurringFrequency;
}

export interface UpdateRecurringRuleDTO {
  description?: string;
  amount?: number;
  type?: TransactionType;
  category?: string;
  accountId?: string | null;
  startYear?: number;
  startMonth?: number;
  endYear?: number | null;
  endMonth?: number | null;
  frequency?: RecurringFrequency;
  active?: boolean;
}

// ─── Custom Alerts ────────────────────────────────────────────────────────────

export type CustomAlertMetric =
  | 'expenses_pct'
  | 'income_pct'
  | 'saving_pct'
  | 'balance_pct'
  | 'balance_amount'
  | 'category_pct'
  | 'category_amount';

export type CustomAlertOperator = 'gte' | 'lte';

export interface CustomAlert {
  id: string;
  userId: string;
  name: string;
  metric: CustomAlertMetric;
  operator: CustomAlertOperator;
  threshold: number;
  category: string | null;
  categoryId?: string | null;
  color: string;
  active: boolean;
  createdAt: string;
}

export interface CreateCustomAlertDTO {
  name: string;
  metric: CustomAlertMetric;
  operator: CustomAlertOperator;
  threshold: number;
  category?: string | null;
  color?: string;
  active?: boolean;
}

export interface UpdateCustomAlertDTO {
  name?: string;
  metric?: CustomAlertMetric;
  operator?: CustomAlertOperator;
  threshold?: number;
  category?: string | null;
  color?: string;
  active?: boolean;
}

// ─── Accounts & transfers ────────────────────────────────────────────────────

export type AccountType = 'checking' | 'savings' | 'cash' | 'card' | 'investment' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  balance: number;
  color: string;
  icon: string;
  archived: boolean;
  isDefault: boolean;
  createdAt: string;
}

export interface AccountInput {
  name: string;
  type?: AccountType;
  initialBalance?: number;
  color?: string;
  icon?: string;
  archived?: boolean;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  date: string;
  description: string | null;
  createdAt: string;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string | null;
}

// ─── Budgets & goals ─────────────────────────────────────────────────────────

export interface CategoryBudget {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
}

export interface GoalProgress {
  saved: number;
  remaining: number;
  percentage: number;
  monthsLeft: number | null;
  monthlyNeeded: number | null;
  completed: boolean;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  targetDate: string | null;
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  archived: boolean;
  createdAt: string;
  progress: GoalProgress;
}

export interface GoalInput {
  name?: string;
  target?: number;
  targetDate?: string | null;
  category?: string;
  categoryId?: string;
  icon?: string;
  color?: string;
  archived?: boolean;
}

// ─── Insights ────────────────────────────────────────────────────────────────

export interface CategoryTrend {
  categoryName: string;
  current: number;
  previous: number;
  average3: number;
  changeVsPreviousPct: number | null;
  changeVsAveragePct: number | null;
}

export interface NetWorthPoint {
  year: number;
  month: number;
  available: number;
  saved: number;
  /** Investments, property and other assets valued by hand. */
  assets: number;
  /** Debts valued by hand. */
  debts: number;
  netWorth: number;
}

export type InboxStatus = 'imported' | 'duplicate' | 'unreadable' | 'failed';

/** Receipts forwarded by e-mail: the private address (null while it is not set up) and what happened. */
export interface Inbox {
  address: string | null;
  recent: {
    id: string;
    receivedAt: string;
    status: InboxStatus;
    description: string | null;
    amount: number | null;
  }[];
}

export type AssetKind = 'investment' | 'property' | 'vehicle' | 'other' | 'debt';

/** An investment, property or debt the user values by hand. */
export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  /** Debts: yearly interest rate (%) and minimum monthly payment. */
  interestRate: number | null;
  minPayment: number | null;
  value: number;
  valueDate: string | null;
  /** The value before the latest one (to show the change). */
  previousValue: number | null;
  history: { date: string; value: number }[];
}

export interface SafeToSpend {
  /** Money left in the period (carry-over included). */
  available: number;
  daysLeft: number;
  /** What can be spent per day without going below zero. */
  daily: number;
  /** Estimated money left when the period ends, at the usual pace. */
  projectedEnd: number;
  status: 'ok' | 'tight' | 'over';
}

export interface ProjectedMonth {
  year: number;
  month: number;
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  saving: number;
  balance: number;
  endAvailable: number;
}

export interface ForecastRule {
  id: string;
  description: string;
  type: 'INCOME' | 'EXPENSE' | 'SAVING';
  amount: number;
  frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';
}

export interface Forecast {
  year: number;
  month: number;
  safeToSpend: SafeToSpend;
  /** Free plan: only next month is projected; the longer outlook and «what if…» are Premium. */
  locked: boolean;
  projection: ProjectedMonth[];
  firstShortfall: { year: number; month: number } | null;
  rules: ForecastRule[];
}

/** Answer to a free-form question about the user's figures. */
export interface AIAnswer {
  answer: string;
  ai: { used: number; quota: number };
}

export interface ReportTotals {
  income: number;
  expenses: number;
  saving: number;
  balance: number;
}

export interface AnnualReport {
  year: number;
  currency: string;
  months: { month: number; income: number; expenses: number; saving: number }[];
  quarters: ({ quarter: number } & ReportTotals)[];
  totals: ReportTotals;
  /** Whole-year totals per category, largest first. */
  incomeByCategory: { categoryName: string; amount: number }[];
  expensesByCategory: { categoryName: string; amount: number }[];
}

export interface DetectedSubscription {
  key: string;
  description: string;
  cadence: 'monthly' | 'yearly';
  /** Latest charge. */
  amount: number;
  annualCost: number;
  count: number;
  lastDate: string;
  nextDate: string;
  priceIncrease: { from: number; to: number } | null;
}

export interface SubscriptionReport {
  monthly: number;
  annual: number;
  /** On the free plan only the most expensive ones (see `locked`). */
  subscriptions: DetectedSubscription[];
  /** How many were detected, also those not listed. */
  count: number;
  /** Free plan: the list is cut to the first few; the full list is Premium. */
  locked: boolean;
}

export interface AIAdvice {
  summary: string;
  tips: string[];
  positives: string[];
  warnings: string[];
  source?: 'ai' | 'rules';
  /** Why the rule-based analysis was used instead of the AI one. */
  reason?: 'premium_required' | 'quota' | 'budget' | 'unavailable' | 'no_data' | 'error';
  /** AI analyses used this month. */
  ai?: { used: number; quota: number };
}

// ─── Settings ────────────────────────────────────────────────────────────────

export type Currency = 'EUR' | 'USD' | 'GBP' | 'MXN' | 'ARS' | 'COP' | 'CLP' | 'CHF';

export interface UserSettings {
  /** Owner (the API sends it; the app does not use it). */
  userId?: string;
  currency: Currency;
  locale: 'es' | 'en';
  monthStartDay: number;
  defaultAccountId: string | null;
  notificationsEnabled: boolean;
  /** Partner offers section (affiliate links) visible. */
  showOffers: boolean;
  /** Open the guided tour after signing in. */
  showTour: boolean;
  /** The "first steps" panel of the month view, until the user hides it. */
  showGettingStarted: boolean;
  /** A summary of the week by e-mail every Monday. */
  weeklyDigest: boolean;
  /** Service messages about the end of the free trial (on unless the user turned them off). */
  trialNotices: boolean;
  currentPeriod: { year: number; month: number; start: string; end: string };
}

export type SettingsChanges = Partial<
  Pick<
    UserSettings,
    | 'currency'
    | 'locale'
    | 'monthStartDay'
    | 'defaultAccountId'
    | 'notificationsEnabled'
    | 'showOffers'
    | 'showTour'
    | 'showGettingStarted'
    | 'weeklyDigest'
    | 'trialNotices'
  >
>;

/** "Text in the description → category" rule the user taught. */
export interface CategoryRule {
  id: string;
  pattern: string;
  categoryId: string;
  categoryName: string;
}

export type VatRate = 0 | 4 | 10 | 21;

/** A category the self-employed user marks as professional, with the VAT rate of its movements. */
export interface BusinessCategory {
  categoryId: string;
  categoryName: string;
  vatRate: VatRate;
}

export interface QuarterTax {
  incomeBase: number;
  vatCollected: number;
  expenseBase: number;
  vatPaid: number;
  /** Positive: VAT to pay (modelo 303); negative: to offset. */
  vatDue: number;
  netIncome: number;
  /** Advance income-tax payment (modelo 130). */
  irpfAdvance: number;
}

export interface YearTax {
  year: number;
  quarters: (QuarterTax & { quarter: 1 | 2 | 3 | 4 })[];
  totals: QuarterTax;
}

/** A box of an official tax form, with what goes in it. */
export interface TaxBox {
  box: string;
  label: string;
  amount: number;
}

export const EXPENSE_KINDS = [
  'quota',
  'supplies',
  'vehicle',
  'meals',
  'clients',
  'health',
  'staff',
  'training',
  'management',
  'software',
  'rent',
  'advertising',
  'material',
  'other',
  'fines',
] as const;
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

/** What an issued invoice is for VAT (backend autonomo-vat-data.ts, SALE_OPS). */
export const SALE_OPS = [
  'domestic',
  're',
  'intraEU',
  'export',
  'notSubject',
  'oss',
  'ossSubject',
  'reverse',
  'exempt',
  'exemptOccasional',
  'nonVat',
] as const;
export type SaleOp = (typeof SALE_OPS)[number];
/** What a received invoice is for VAT (backend PURCHASE_OPS). */
export const PURCHASE_OPS = [
  'domestic',
  'intraGoods',
  'intraServices',
  'reverse',
  'import',
] as const;
export type PurchaseOp = (typeof PURCHASE_OPS)[number];
export const DEDUCTION_USES = ['common', 'taxed', 'exempt'] as const;
export type DeductionUse = (typeof DEDUCTION_USES)[number];
/** Keys of the modelo 349 (AEAT record design, type 2, position 133). */
export const KEYS_349 = ['E', 'M', 'H', 'A', 'T', 'S', 'I', 'R', 'D', 'C'] as const;
export type Key349 = (typeof KEYS_349)[number];

export interface ManualExpense {
  kind: ExpenseKind;
  /** VAT included; without Spanish VAT on the invoice (intra-EU, reverse charge, import), the base. */
  amount: number;
  vatRate: VatRate;
  days?: number;
  op?: PurchaseOp;
  investment?: boolean;
  use?: DeductionUse;
}

/** One operation of the modelo 349 (euros). */
export interface IntraOp {
  key: Key349;
  vatId: string;
  name: string;
  base: number;
  rectifies?: { year: number; quarter: 1 | 2 | 3 | 4; previous: number } | null;
}

/** Sales without VAT on the invoice, by box of the 303 (bases, euros). */
export interface ManualSales {
  intraEU?: number;
  exports?: number;
  notSubject?: number;
  oss?: number;
  ossSubject?: number;
  reverse?: number;
  exempt?: number;
  exemptOccasional?: number;
  nonVat?: number;
}

export interface CashRates {
  r21: number;
  r10: number;
  r4: number;
}

/** The VAT of a quarter beyond the invoices with VAT (backend QuarterVat). */
export interface QuarterVat {
  sales?: ManualSales | null;
  re?: { r21?: number; r10?: number; r4?: number; tobacco?: number } | null;
  salesFix?: { base: number; vat: number; priorYear?: number } | null;
  reFix?: { base: number; fee: number } | null;
  deductionFix?: { base: number; vat: number } | null;
  intraFix?: { base: number; vat: number } | null;
  reagp?: number;
  investmentAdjust?: number;
  art80?: number;
  importDeferred?: number;
  cash?: {
    invoiced: CashRates;
    collected: CashRates;
    purchasesInvoiced: CashRates;
    purchasesPaid: CashRates;
  } | null;
  intra?: IntraOp[];
}

export interface ManualQuarter {
  income: { r21: number; r10: number; r4: number; r0: number };
  expenses: ManualExpense[];
  vat?: QuarterVat | null;
}

/** The VAT of the year (backend VatOptions). */
export interface VatOptions {
  prorrata?: { provisional: number | null; special: boolean } | null;
  investments?: { year: number; vat: number; pct: number; realEstate: boolean }[];
  offsetStart?: number | null;
  skipOffset?: number[];
  refund?: boolean;
  filed?: (number | null)[];
  reagpVolume?: number;
  regime?: 'general' | 'simplified' | 'reagp';
}

export interface ManualData {
  quarters: [ManualQuarter, ManualQuarter, ManualQuarter, ManualQuarter];
  profile: {
    workArea: number;
    homeArea: number;
    vehicleExclusive: boolean;
    healthPeople: number;
    healthDisability: boolean;
  };
}

/** What an expense typed by hand lets the person deduct. */
export interface ExpenseLine {
  quarter: number;
  kind: ExpenseKind;
  amount: number;
  deductible: number;
  vatDeductible: number;
  note: string;
}

export interface QuarterExtras {
  withheld: number;
  socialSecurity: number;
  vatNotDeductible: number;
  /** Worked out on the device from the activity (depreciation.ts, subsidies.ts), euros. */
  depreciation?: number;
  provisions?: number;
  /** Current grants of the quarter (with the young farmers' aid) and capital grants imputed. */
  subsidies?: number;
  capitalSubsidies?: number;
  /** Flat-rate compensations of the special agricultural regime received (art. 130 LIVA). */
  compensations?: number;
}

/** How the activity is taxed: direct estimation (simplified or normal) or modules. */
export type ActivityMethod = 'simplified' | 'normal' | 'objective';

/** The activity of the year beyond the quarters: assets, grants and the other annual figures. */
export interface ActivityInputs {
  method: ActivityMethod;
  /** Farming, livestock, forestry or fishing: section II of the 130 instead of section I. */
  agrarian: boolean;
  assets: FixedAsset[];
  subsidies: Subsidy[];
  /** Provisions that can be deducted (normal modality only), euros of the year. */
  provisions: number;
  /** Regularisation of the RETA fees: paid (+) or refunded (−) this year (Renta 0196/0197). */
  retaFix: number;
  /** REAGP compensations received in each quarter. */
  compensations: [number, number, number, number];
  /** Result (box 19) of each modelo 130 filed (null: not filed or not known). */
  paid130: [number | null, number | null, number | null, number | null];
  /** Goods or services of the activity taken for personal use, at market value (Renta 0175). */
  selfConsumption?: number;
  /** Change of stock in the year: increase (+, box 0177) or decrease (−, box 0182). */
  stockChange?: number;
  /** Farming in modules: products, CAP aid and correctors (the depreciation comes from the assets). */
  modules?: Omit<AgrarianModulesInput, 'depreciation'> | null;
  /**
   * Other activities in modules (annex II): the activity, its units and indices. Its quarterly
   * payments are those of the modelo 131, kept in `paid130` (box 15 of each 131 filed).
   */
  objective?: ObjectiveInput | null;
}

export interface AutonomoInputs {
  quarters: [QuarterExtras, QuarterExtras, QuarterExtras, QuarterExtras];
  /** Normal modality: no hard-to-justify expenses (the server checks it too). */
  modality?: 'simplified' | 'normal';
  /** Section II of the 130 (farming, livestock, forestry, fishing). */
  agrarian?: boolean;
  /** The activity as typed (assets, grants…): for the annual summary; the server ignores it. */
  activity?: ActivityInputs | null;
  hardToJustify: boolean;
  priorYearNet: number | null;
  exempt130: boolean;
  vatToOffset: number;
  /** The VAT of the year: prorrata, investment goods, what is left to offset, refund. */
  vat?: VatOptions | null;
  /** Income and expenses typed by hand: they replace the movements. */
  manual?: ManualData | null;
  /**
   * Totals up to the quarter before the viewed one: income, expenses and withholdings real (corrected
   * if that 130 had an error), the payments as filed (box 05 of the viewed quarter).
   */
  prior?: { income: number; expenses: number; previousPayments: number; withheld: number } | null;
  /** Boxes 07 and 19 of each modelo 130 as filed (null: not given): only box 05 and 15 use them. */
  filed130?: ({ box07: number; box19: number | null } | null)[] | null;
}

/** The self-employed form saved in the account (the app checks its shape when it reads it). */
export interface AutonomoCloudCopy {
  /** Null when the server cannot decrypt it any more. */
  data: unknown;
  unreadable: boolean;
  updatedAt: string;
  /** Goes up by one on every save: a save says which one it was based on. */
  version: number;
}

export interface AutonomoDraft {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  used: number;
  vat: {
    result: 'pay' | 'offset' | 'refund' | 'zero' | 'noActivity';
    amountDue: number;
    accrued: TaxBox[];
    deductible: TaxBox[];
    settlement: TaxBox[];
    /** «Información adicional» (drafts saved before it have none). */
    info?: TaxBox[];
    /** Percentage of the VAT borne that was deducted. */
    prorrata?: number;
    warnings?: string[];
  };
  /** Intra-EU operations of the quarter (none: null or absent). */
  m349?: Draft349 | null;
  /** The annual summary, with the fourth quarter. */
  m390?: Draft390 | null;
  irpf: {
    required: boolean;
    result: 'pay' | 'negative' | 'zero' | 'notRequired';
    amountDue: number;
    boxes: TaxBox[];
  };
  reta: {
    monthlyNet: number;
    bracket: string;
    baseMin: number;
    baseMax: number;
    feeMin: number;
    feeMax: number;
    rate: number;
    /** The year of the table and false when that year has no order yet (the latest one is used). */
    year?: number;
    known?: boolean;
  };
  deadlines: { model: string; label: string; date: string }[];
  /** Breakdown of the expenses typed by hand (null when the movements were used). */
  expenses: ExpenseLine[] | null;
}

export interface Draft349 {
  required: boolean;
  monthly: boolean;
  operators: { key: Key349; vatId: string; name: string; base: number }[];
  rectifications: {
    key: Key349;
    vatId: string;
    name: string;
    base: number;
    year: number;
    quarter: 1 | 2 | 3 | 4;
    previous: number;
  }[];
  boxes: TaxBox[];
  warnings: {
    code: string;
    name?: string;
    vatId?: string;
    expected?: number;
    got?: number;
    amount?: number;
  }[];
}

export interface Draft390 {
  sections: { id: string; boxes: TaxBox[] }[];
  prorrata: number;
  reconciliation: { quarter: number; computed: number; filed: number | null; difference: number }[];
  warnings: {
    code: string;
    quarter?: number;
    difference?: number;
    expected?: number;
    got?: number;
  }[];
}

export interface SplitGroupSummary {
  id: string;
  name: string;
  members: number;
  expenses: number;
}

export interface SplitExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  settlement: boolean;
  shares: { memberId: string; share: number }[];
}

/** A group of people sharing expenses, with who owes whom. */
export interface SplitGroup {
  id: string;
  name: string;
  /** `balance` > 0: the others owe them; < 0: they owe the others. */
  members: { id: string; name: string; balance: number }[];
  expenses: SplitExpense[];
  transfers: { from: string; to: string; amount: number }[];
}
