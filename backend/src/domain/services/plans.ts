import { PlanId } from '@domain/model/Subscription';

/** Things a user creates that the free plan limits. */
export type LimitedResource = 'accounts' | 'budgets' | 'goals' | 'recurringRules' | 'customAlerts';

/** Capabilities only available in Premium. */
export type PremiumFeature = 'import' | 'insights' | 'aiAdvisor' | 'forecast' | 'household';

export interface PlanLimits {
  resources: Record<LimitedResource, number>;
  features: Record<PremiumFeature, boolean>;
  /** AI analyses per calendar month (the monthly report counts as one); free users get a taste. */
  aiMonthlyQuota: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    resources: { accounts: 2, budgets: 3, goals: 1, recurringRules: 3, customAlerts: 3 },
    features: {
      import: false,
      insights: false,
      aiAdvisor: false,
      forecast: false,
      household: false,
    },
    aiMonthlyQuota: 1,
  },
  premium: {
    resources: {
      accounts: Infinity,
      budgets: Infinity,
      goals: Infinity,
      recurringRules: Infinity,
      customAlerts: Infinity,
    },
    features: { import: true, insights: true, aiAdvisor: true, forecast: true, household: true },
    aiMonthlyQuota: 10,
  },
};

/** JSON-friendly limits (Infinity → null). */
export function serializableLimits(limits: PlanLimits): {
  resources: Record<LimitedResource, number | null>;
  features: Record<PremiumFeature, boolean>;
  aiMonthlyQuota: number;
} {
  return {
    resources: Object.fromEntries(
      Object.entries(limits.resources).map(([k, v]) => [k, Number.isFinite(v) ? v : null])
    ) as Record<LimitedResource, number | null>,
    features: limits.features,
    aiMonthlyQuota: limits.aiMonthlyQuota,
  };
}
