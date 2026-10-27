import type { LimitedResource, PlanCatalog, PremiumFeature } from '../domain/types';

/**
 * What the pricing page shows before (or without) the API's answer. Search engines render the page
 * without being allowed to call `/api/` (robots.txt), so the plans and the comparison must not wait
 * for it: they would see an empty page and treat it as a soft 404. The API only refines these
 * values (limits, prices, founder places). Same values as the backend's billing config.
 */
export const DEFAULT_CATALOG: PlanCatalog = {
  currency: 'EUR',
  trialDays: 14,
  paymentsEnabled: true,
  prices: { monthly: 3.49, yearly: 29.99, lifetime: 59, rentaPass: 10 },
  rentaPass: { available: true },
  lifetime: { available: false, remaining: 0 },
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
        // Free and unlimited on every plan.
        imports: null,
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
};

export function formatPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** % saved by paying yearly instead of 12 months. */
export function yearlySavingPct(prices: { monthly: number; yearly: number }): number {
  if (prices.monthly <= 0) return 0;
  return Math.max(0, Math.round((1 - prices.yearly / (prices.monthly * 12)) * 100));
}

export const RESOURCE_KEYS: Record<LimitedResource, string> = {
  accounts: 'billing.resource.accounts',
  budgets: 'billing.resource.budgets',
  goals: 'billing.resource.goals',
  recurringRules: 'billing.resource.recurringRules',
  customAlerts: 'billing.resource.customAlerts',
  rentaCalculations: 'billing.resource.rentaCalculations',
  autonomoDrafts: 'billing.resource.autonomoDrafts',
  autonomoPdfs: 'billing.resource.autonomoPdfs',
  assets: 'billing.resource.assets',
  imports: 'billing.resource.imports',
};

export const FEATURE_KEYS: Record<PremiumFeature, string> = {
  insights: 'billing.feature.insights',
  aiAdvisor: 'billing.feature.aiAdvisor',
  forecast: 'billing.feature.forecast',
  household: 'billing.feature.household',
  inbox: 'billing.feature.inbox',
  capture: 'billing.feature.capture',
  investCourse: 'billing.feature.investCourse',
  cryptoPro: 'billing.feature.cryptoPro',
};

export const PREMIUM_BENEFITS = [
  'billing.benefit.unlimited',
  'billing.benefit.insights',
  'billing.benefit.subscriptions',
  'billing.benefit.forecast',
  'billing.benefit.household',
  'billing.benefit.debts',
  'billing.benefit.renta',
  'billing.benefit.autonomo',
  'billing.benefit.receipts',
  'billing.benefit.course',
  'billing.benefit.videos',
  'billing.benefit.crypto',
  'billing.benefit.ai',
  'billing.benefit.support',
];

/** One row of the plan comparison: what each plan gets, already translated. */
export interface ComparisonRow {
  key: string;
  label: string;
  free: string;
  premium: string;
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** The limited resources, in the order of the comparison; some reset every quarter or campaign. */
const COMPARED_RESOURCES: LimitedResource[] = [
  'accounts',
  'budgets',
  'goals',
  'recurringRules',
  'customAlerts',
  'assets',
  'imports',
  'rentaCalculations',
  'autonomoDrafts',
  'autonomoPdfs',
];
const FREE_RESOURCE_NOTES: Partial<Record<LimitedResource, string>> = {
  rentaCalculations: 'pricing.perCampaign',
  autonomoDrafts: 'pricing.perQuarter',
};

/** Rows with a fixed text for each plan (features that are not limits of the API). */
const STATIC_ROWS: { key: string; free: string; premium: string }[] = [
  {
    key: 'subscriptions',
    free: 'pricing.row.subscriptions.free',
    premium: 'pricing.row.subscriptions.premium',
  },
  { key: 'trends', free: '', premium: '' },
  { key: 'annualReport', free: '', premium: '' },
  { key: 'forecast', free: 'pricing.row.forecast.free', premium: 'pricing.row.forecast.premium' },
  { key: 'inbox', free: '', premium: '' },
  { key: 'capture', free: '', premium: 'pricing.row.capture.premium' },
  { key: 'household', free: '', premium: '' },
  { key: 'renta', free: 'pricing.row.renta.free', premium: 'pricing.row.renta.premium' },
  { key: 'course', free: 'pricing.row.course.free', premium: 'pricing.row.course.premium' },
  { key: 'videos', free: 'pricing.row.videos.free', premium: 'pricing.row.videos.premium' },
  {
    key: 'cryptoConsole',
    free: 'pricing.row.cryptoConsole.free',
    premium: 'pricing.row.cryptoConsole.premium',
  },
];

/** The whole comparison of the pricing page: the API's limits plus the fixed rows. */
export function comparisonRows(catalog: PlanCatalog, t: Translate): ComparisonRow[] {
  const { free, premium } = catalog.limits;
  const limit = (n: number | null, note?: string) =>
    n === null ? t('pricing.unlimited') : note ? t(note, { count: n }) : String(n);
  const text = (key: string) => (key ? t(key) : '');
  const resources = COMPARED_RESOURCES.map((r) => ({
    key: r,
    label: t(`pricing.row.${r}`),
    free: limit(free.resources[r], FREE_RESOURCE_NOTES[r]),
    premium: limit(premium.resources[r]),
  }));
  const fixed = STATIC_ROWS.map((row) => ({
    key: row.key,
    label: t(`pricing.row.${row.key}`),
    free: text(row.free) || '—',
    premium: text(row.premium) || '✓',
  }));
  const ai = [
    {
      key: 'aiAnalyses',
      label: t('pricing.row.aiAnalyses'),
      free: t('pricing.aiQuota', { count: free.aiMonthlyQuota }),
      premium: t('pricing.aiQuota', { count: premium.aiMonthlyQuota }),
    },
    { key: 'aiQuestions', label: t('pricing.row.aiQuestions'), free: '—', premium: '✓' },
  ];
  return [...resources, ...fixed, ...ai];
}
