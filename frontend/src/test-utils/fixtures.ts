import type {
  AutonomoDraft,
  Account,
  AIAdvice,
  AIAnswer,
  AnnualReport,
  Asset,
  Forecast,
  SubscriptionReport,
  LeakFinding,
  MoneyLeaks,
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
import type {
  BillingOverview,
  HouseholdStatus,
  PlanCatalog,
  ReferralSummary,
} from '@modules/billing/domain/types';

let seq = 0;
const nextId = (prefix: string) => `${prefix}${++seq}`;
/** 16 hex characters, like the ids of «Tu dinero perdido». */
const nextHex = () => (++seq).toString(16).padStart(16, '0');

export const user = (over: Partial<AuthUser> = {}): AuthUser => ({
  id: 'u1',
  email: 'ana@example.com',
  name: 'Ana',
  avatar: null,
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
  showGettingStarted: true,
  weeklyDigest: false,
  trialNotices: true,
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
    averageMonthly: null,
    historyMonths: 0,
    savedThisMonth: 0,
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
  ai: { used: 1, quota: 10 },
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

export const report = (over: Partial<AnnualReport> = {}): AnnualReport => ({
  year: 2026,
  currency: 'EUR',
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: i === 0 ? 2000 : 0,
    expenses: i === 0 ? 100 : 0,
    saving: 0,
  })),
  quarters: [
    { quarter: 1, income: 2000, expenses: 100, saving: 0, balance: 1900 },
    { quarter: 2, income: 0, expenses: 0, saving: 0, balance: 0 },
    { quarter: 3, income: 0, expenses: 0, saving: 0, balance: 0 },
    { quarter: 4, income: 0, expenses: 0, saving: 0, balance: 0 },
  ],
  totals: { income: 2000, expenses: 100, saving: 0, balance: 1900 },
  incomeByCategory: [{ categoryName: 'Salario', amount: 2000 }],
  expensesByCategory: [{ categoryName: 'Ocio', amount: 100 }],
  ...over,
});

export const answer = (over: Partial<AIAnswer> = {}): AIAnswer => ({
  answer: 'Gastaste 120 € en ocio.',
  ai: { used: 2, quota: 10 },
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
  count: 2,
  locked: false,
  ...over,
});

/** A finding of «Tu dinero perdido» (made-up merchant and amounts). */
export const leakFinding = (over: Partial<LeakFinding> = {}): LeakFinding => ({
  id: nextHex(),
  kind: 'recurring',
  confidence: 'high',
  status: 'new',
  label: 'FITBOX',
  essential: false,
  cadence: 'monthly',
  amount: 39.9,
  previousAmount: null,
  annual: 478.8,
  oneOff: 0,
  count: 15,
  firstDate: '2025-08-03',
  lastDate: '2026-10-03',
  nextDate: '2026-11-02',
  perMonth: null,
  evidence: [
    { date: '2026-10-03', amount: 39.9 },
    { date: '2026-09-03', amount: 39.9 },
  ],
  ...over,
});

export const moneyLeaks = (over: Partial<MoneyLeaks> = {}): MoneyLeaks => ({
  coverage: {
    level: 'complete',
    from: '2025-08-03',
    to: '2026-10-20',
    days: 444,
    movements: 160,
    yearlyReady: true,
  },
  total: { annual: 470, oneOff: 0, count: 1 },
  byKind: {
    recurring: { count: 1, annual: 478.8 },
    increase: { count: 0, annual: 0 },
    duplicate: { count: 0, annual: 0 },
    small: { count: 0, annual: 0 },
  },
  findings: [leakFinding({ id: '0000000000000001' })],
  count: 1,
  locked: false,
  reviewed: { count: 0, cancelMonthly: 0, recoveredAnnual: 0 },
  ...over,
});

export const referral = (over: Partial<ReferralSummary> = {}): ReferralSummary => ({
  code: 'ABCD2345',
  qualified: 2,
  pending: 1,
  rewardDays: 30,
  rewardsEarned: 1,
  missing: 3,
  nextAt: 5,
  maxed: false,
  maxRewards: 5,
  tiers: [1, 5, 20, 40, 50],
  invited: null,
  ...over,
});

/** The first steps of an invited user, with `counts` of what they have. */
export const inviteeSteps = (
  counts: Partial<Record<'movements' | 'budgets' | 'goals' | 'automations', number>> = {}
) =>
  (
    [
      ['movements', 3],
      ['budgets', 1],
      ['goals', 1],
      ['automations', 1],
    ] as const
  ).map(([id, goal]) => {
    const count = Math.min(counts[id] ?? 0, goal);
    return { id, count, goal, done: count >= goal };
  });

export const catalog = (over: Partial<PlanCatalog> = {}): PlanCatalog => ({
  currency: 'EUR',
  trialDays: 14,
  paymentsEnabled: true,
  prices: { monthly: 3.49, yearly: 29.99, lifetime: 59, rentaPass: 10 },
  rentaPass: { available: true },
  lifetime: { available: true, remaining: 87 },
  limits: {
    free: {
      resources: {
        accounts: 3,
        budgets: 5,
        goals: 2,
        recurringRules: 5,
        customAlerts: 3,
        rentaCalculations: 3,
        autonomoDrafts: 1,
        autonomoPdfs: 1,
        assets: 3,
        imports: 1,
      },
      features: {
        insights: false,
        aiAdvisor: false,
        forecast: false,
        household: false,
        inbox: false,
        capture: false,
        investCourse: false,
        cryptoPro: false,
      },
      aiMonthlyQuota: 1,
    },
    premium: {
      resources: {
        accounts: null,
        budgets: null,
        goals: null,
        recurringRules: null,
        customAlerts: null,
        rentaCalculations: null,
        autonomoDrafts: null,
        autonomoPdfs: null,
        assets: null,
        imports: null,
      },
      features: {
        insights: true,
        aiAdvisor: true,
        forecast: true,
        household: true,
        inbox: true,
        capture: true,
        investCourse: true,
        cryptoPro: true,
      },
      aiMonthlyQuota: 10,
    },
  },
  ...over,
});

export const household = (over: Partial<HouseholdStatus> = {}): HouseholdStatus => ({
  role: 'none',
  owner: null,
  members: [],
  pendingInvite: null,
  maxMembers: 1,
  paused: false,
  ...over,
});

export const billing = (over: Partial<BillingOverview> = {}): BillingOverview => ({
  household: household(),
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
  renta: { draft: { allowed: false, reason: null }, eligibleOn: null, passUntil: null },
  usage: {
    accounts: 2,
    budgets: 2,
    goals: 0,
    recurringRules: 1,
    customAlerts: 0,
    rentaCalculations: 0,
    autonomoDrafts: 0,
    autonomoPdfs: 0,
    assets: 0,
    imports: 0,
    movements: 5,
  },
  autonomoQuarters: [],
  ai: { used: 0, quota: 10 },
  catalog: catalog(),
  terms: { version: '2026-10-18', acceptedVersion: null, acceptedAt: null, mustAccept: false },
  ...over,
});

export const asset = (over: Partial<Asset> = {}): Asset => ({
  id: nextId('as'),
  name: 'Fondo',
  kind: 'investment',
  interestRate: null,
  minPayment: null,
  value: 1000,
  valueDate: '2026-03-01',
  previousValue: null,
  history: [],
  ...over,
});

export const autonomoDraft = (over: Partial<AutonomoDraft> = {}): AutonomoDraft => ({
  year: 2026,
  quarter: 1,
  used: 1,
  vat: {
    result: 'pay',
    amountDue: 178,
    accrued: [
      { box: '07', label: 'Base imponible al 21 %', amount: 1000 },
      { box: '08', label: 'Tipo 21 %', amount: 21 },
      { box: '27', label: 'Total cuota devengada', amount: 220 },
    ],
    deductible: [{ box: '29', label: 'Cuotas soportadas', amount: 42 }],
    settlement: [{ box: '71', label: 'Resultado de la liquidación', amount: 178 }],
  },
  irpf: {
    required: true,
    result: 'pay',
    amountDue: 180,
    boxes: [{ box: '04', label: '20 % del rendimiento neto', amount: 180 }],
  },
  reta: {
    monthlyNet: 279,
    bracket: 'R1',
    baseMin: 653.59,
    baseMax: 718.94,
    feeMin: 205.88,
    feeMax: 226.47,
    rate: 0.315,
  },
  deadlines: [{ model: '303', label: 'IVA trimestral', date: '2026-04-20' }],
  expenses: null,
  ...over,
});

/** What the server gives Premium users: fake ids, the real ones are not in the web app. */
export const premiumVideoIds = (over: Record<number, string> = {}): Record<number, string> => ({
  17: 'premium17',
  18: 'premium18',
  ...over,
});
