// ─── Finances domain types (amounts are decimal numbers in the user currency) ──

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

export interface Category {
  id: string;
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
  categorySource?: 'file' | 'history' | 'keywords' | 'ai' | 'fallback';
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
  netWorth: number;
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
  currency: Currency;
  locale: 'es' | 'en';
  monthStartDay: number;
  defaultAccountId: string | null;
  notificationsEnabled: boolean;
  /** Partner offers section (affiliate links) visible. */
  showOffers: boolean;
  /** Open the guided tour after signing in. */
  showTour: boolean;
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
  >
>;
