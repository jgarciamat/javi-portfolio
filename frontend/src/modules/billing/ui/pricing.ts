import type { LimitedResource, PremiumFeature } from '../domain/types';

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
};

export const FEATURE_KEYS: Record<PremiumFeature, string> = {
  import: 'billing.feature.import',
  insights: 'billing.feature.insights',
  aiAdvisor: 'billing.feature.aiAdvisor',
};

export const PREMIUM_BENEFITS = [
  'billing.benefit.unlimited',
  'billing.benefit.import',
  'billing.benefit.insights',
  'billing.benefit.ai',
  'billing.benefit.support',
];
