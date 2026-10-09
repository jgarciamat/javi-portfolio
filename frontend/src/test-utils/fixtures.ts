import type {
  Account,
  AIAdvice,
  AIAnswer,
  Forecast,
  SubscriptionReport,
  BudgetLine,
  Category,
  CategoryBudget,
  CustomAlert,
  FinancialSummary,
  Goal,
  MonthAlert,
  MonthOverview,
  RecurringRule,
  Transaction,
  Transfer,
  UserSettings,
} from '@modules/finances/domain/types';
import type { AuthUser } from '@modules/auth/domain/types';
import type { BillingOverview, PlanCatalog, ReferralSummary } from '@modules/billing/domain/types';

let seq = 0;
const nextId = (prefix: string) => `${prefix}${++seq}`;

export const user = (over: Partial<AuthUser> = {}): AuthUser => ({
  id: 'u1',
  email: 'ana@example.com',
  name: 'Ana',
  avatarUrl: null,
  hasPassword: true,
  ...over,
});

export const category = (over: Partial<Category> = {}): Category => ({
  id: nextId('c'),
  name: 'Ocio',
  color: '#f97316',
  icon: '🎉',
  ...over,
});

export const account = (over: Partial<Account> = {}): Account => ({
  id: nextId('a'),
  name: 'Principal',
  type: 'checking',
  initialBalance: 0,
  balance: 1000,
  color: '#6366f1',
  icon: '🏦',
  archived: false,
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
});

export const transaction = (over: Partial<Transaction> = {}): Transaction => ({
  id: nextId('t'),
  description: 'Cena',
  amount: 40,
  type: 'EXPENSE',
  category: 'Ocio',
  date: '2026-03-10',
  createdAt: '2026-03-10T20:00:00Z',
  notes: null,
  accountId: 'a1',
  accountName: 'Principal',
  ...over,
});

export const summary = (over: Partial<FinancialSummary> = {}): FinancialSummary => ({
  totalIncome: 2000,
  totalExpenses: 500,
  totalSaving: 200,
  balance: 1300,
  expensesByCategory: { Ocio: 300, Alimentación: 200 },
  incomeByCategory: { Salario: 2000 },
  savingByCategory: { Ahorro: 200 },
  transactionCount: 4,
  ...over,
});

export const budgetLine = (over: Partial<BudgetLine> = {}): BudgetLine => ({
  categoryId: 'c-ocio',
  categoryName: 'Ocio',
  limit: 400,
  spent: 300,
  remaining: 100,
  percentage: 75,
  level: 'ok',
  ...over,
});

export const monthAlert = (over: Partial<MonthAlert> = {}): MonthAlert => ({
  kind: 'available',
  level: 'warning',
  categoryName: null,
  spent: 850,
  limit: 1000,
  percentage: 85,
  ...over,
});

export const overview = (over: Partial<MonthOverview> = {}): MonthOverview => ({
  year: 2026,
  month: 3,
  start: '2026-03-01',
  end: '2026-03-31',
  isCurrent: true,
  transactions: [],
  summary: summary(),
  carryover: 500,
  available: 1800,
  budgets: [],
  alerts: [],
  ...over,
});

export const settings = (over: Partial<UserSettings> = {}): UserSettings => ({
  currency: 'EUR',
  locale: 'es',
  monthStartDay: 1,
  defaultAccountId: 'a1',
  notificationsEnabled: false,
  showOffers: true,
  showTour: true,
  currentPeriod: { year: 2026, month: 3, start: '2026-03-01', end: '2026-03-31' },
  ...over,
});

export const customAlert = (over: Partial<CustomAlert> = {}): CustomAlert => ({
  id: nextId('al'),
  userId: 'u1',
  name: 'Gasto alto',
  metric: 'expenses_pct',
  operator: 'gte',
  threshold: 10,
  category: null,
  color: '#ef4444',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
});

export const rule = (over: Partial<RecurringRule> = {}): RecurringRule => ({
  id: nextId('r'),
  userId: 'u1',
  description: 'Alquiler',
  amount: 800,
  type: 'EXPENSE',
  category: 'Vivienda',
  startYear: 2026,
  startMonth: 1,
  endYear: null,
  endMonth: null,
  frequency: 'monthly',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
});

export const budget = (over: Partial<CategoryBudget> = {}): CategoryBudget => ({
  id: nextId('b'),
  categoryId: 'c-ocio',
  categoryName: 'Ocio',
  amount: 400,
  ...over,
});

export const goal = (over: Partial<Goal> = {}): Goal => ({
  id: nextId('g'),
  name: 'Viaje',
  target: 3000,
  targetDate: '2026-12-31',
  categoryId: 'c-viaje',
  categoryName: 'Viaje',
  icon: '✈️',
  color: '#22c55e',
  archived: false,
  createdAt: '2026-01-01T00:00:00Z',
  progress: {
    saved: 600,
    remaining: 2400,
    percentage: 20,
    monthsLeft: 9,
    monthlyNeeded: 266.67,
    completed: false,
  },
  ...over,
});

export const transfer = (over: Partial<Transfer> = {}): Transfer => ({
  id: nextId('tr'),
  fromAccountId: 'a1',
  fromAccountName: 'Principal',
  toAccountId: 'a2',
  toAccountName: 'Ahorro',
  amount: 100,
  date: '2026-03-05',
  description: null,
  createdAt: '2026-03-05T10:00:00Z',
  ...over,
});

export const advice = (over: Partial<AIAdvice> = {}): AIAdvice => ({
  summary: 'Buen mes',
  tips: ['Ahorra un 10 %'],
  positives: ['Gastos controlados'],
  warnings: ['Ocio alto'],
  source: 'ai',
  ai: { used: 1, quota: 30 },
  ...over,
});

export const forecast = (over: Partial<Forecast> = {}): Forecast => ({
  year: 2026,
  month: 3,
  safeToSpend: { available: 900, daysLeft: 18, daily: 50, projectedEnd: 500, status: 'ok' },
  locked: false,
  projection: [
    {
      year: 2026,
      month: 4,
      income: 2000,
      fixedExpenses: 900,
      variableExpenses: 400,
      saving: 0,
      balance: 700,
      endAvailable: 1200,
    },
    {
      year: 2026,
      month: 5,
      income: 2000,
      fixedExpenses: 900,
      variableExpenses: 400,
      saving: 100,
      balance: 600,
      endAvailable: 1800,
    },
  ],
  firstShortfall: null,
  rules: [
    { id: 'r-rent', description: 'Alquiler', type: 'EXPENSE', amount: 700, frequency: 'monthly' },
    { id: 'r-pay', description: 'Nómina', type: 'INCOME', amount: 2000, frequency: 'monthly' },
  ],
  ...over,
});

export const answer = (over: Partial<AIAnswer> = {}): AIAnswer => ({
  answer: 'Gastaste 120 € en ocio.',
  ai: { used: 2, quota: 30 },
  ...over,
});

export const subscriptions = (over: Partial<SubscriptionReport> = {}): SubscriptionReport => ({
  monthly: 18.99,
  annual: 227.88,
  subscriptions: [
    {
      key: 'netflix',
      description: 'Netflix',
      cadence: 'monthly',
      amount: 13.99,
      annualCost: 167.88,
      count: 4,
      lastDate: '2026-03-05',
      nextDate: '2026-04-04',
      priceIncrease: { from: 12.99, to: 13.99 },
    },
    {
      key: 'seguro coche',
      description: 'Seguro coche',
      cadence: 'yearly',
      amount: 60,
      annualCost: 60,
      count: 2,
      lastDate: '2026-03-02',
      nextDate: '2027-03-02',
      priceIncrease: null,
    },
  ],
  ...over,
});

export const referral = (over: Partial<ReferralSummary> = {}): ReferralSummary => ({
  code: 'ABCD2345',
  rewarded: 2,
  pending: 1,
  rewardDays: 30,
  remaining: 10,
  ...over,
});

export const catalog = (over: Partial<PlanCatalog> = {}): PlanCatalog => ({
  currency: 'EUR',
  trialDays: 14,
  paymentsEnabled: true,
  prices: { monthly: 2.99, yearly: 24.99, lifetime: 49 },
  lifetime: { available: true, remaining: 87 },
  limits: {
    free: {
      resources: { accounts: 2, budgets: 3, goals: 1, recurringRules: 3, customAlerts: 3 },
      features: { import: false, insights: false, aiAdvisor: false, forecast: false },
      aiMonthlyQuota: 0,
    },
    premium: {
      resources: {
        accounts: null,
        budgets: null,
        goals: null,
        recurringRules: null,
        customAlerts: null,
      },
      features: { import: true, insights: true, aiAdvisor: true, forecast: true },
      aiMonthlyQuota: 30,
    },
  },
  ...over,
});

export const billing = (over: Partial<BillingOverview> = {}): BillingOverview => ({
  plan: 'premium',
  trialDaysLeft: 10,
  subscription: {
    status: 'trialing',
    source: 'trial',
    trialEndsAt: '2026-03-25T00:00:00Z',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    lifetime: false,
    canManage: false,
  },
  limits: catalog().limits.premium,
  usage: {
    accounts: 2,
    budgets: 2,
    goals: 0,
    recurringRules: 1,
    customAlerts: 0,
    movements: 5,
  },
  ai: { used: 0, quota: 30 },
  catalog: catalog(),
  ...over,
});
