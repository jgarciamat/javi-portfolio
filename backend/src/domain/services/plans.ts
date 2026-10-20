import { PlanId } from '@domain/model/Subscription';

/** Things a user creates that the free plan limits. */
export type LimitedResource =
  | 'accounts'
  | 'budgets'
  | 'goals'
  | 'recurringRules'
  | 'customAlerts'
  | 'rentaCalculations'
  | 'autonomoDrafts'
  | 'autonomoPdfs'
  | 'assets'
  | 'imports';

/** Capabilities only available in Premium. */
export type PremiumFeature =
  'insights' | 'aiAdvisor' | 'forecast' | 'household' | 'inbox' | 'capture' | 'investCourse';

/** Months of the outlook the free plan sees (Premium sees up to 12 and tries «what if…»). */
export const FREE_FORECAST_MONTHS = 1;
/** Detected subscriptions the free plan sees in full (the rest come back locked). */
export const FREE_SUBSCRIPTIONS_SHOWN = 3;

export interface PlanLimits {
  resources: Record<LimitedResource, number>;
  features: Record<PremiumFeature, boolean>;
  /** AI analyses per calendar month (the monthly report counts as one); free users get a taste. */
  aiMonthlyQuota: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    resources: {
      accounts: 3,
      budgets: 5,
      goals: 2,
      recurringRules: 5,
      customAlerts: 3,
      // The tax return calculator: three calculations per Renta campaign (they start again each one).
      rentaCalculations: 3,
      // The self-employed tax drafts (VAT, income tax advance, contribution): one per quarter,
      // only for the current quarter.
      autonomoDrafts: 1,
      // ...and one of those drafts downloaded as a PDF (in total).
      autonomoPdfs: 1,
      // Investments, property and debts (any kind, in total).
      assets: 3,
      // Bank statement imports (in total; previews do not count).
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
      rentaCalculations: Infinity,
      autonomoDrafts: Infinity,
      autonomoPdfs: Infinity,
      assets: Infinity,
      imports: Infinity,
    },
    features: {
      insights: true,
      aiAdvisor: true,
      forecast: true,
      household: true,
      inbox: true,
      capture: true,
      investCourse: true,
    },
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

/**
 * The Renta campaign a date belongs to, named after the year it opens: it opens in April, so
 * from April of one year to March of the next the free calculations are those of that campaign.
 */
export function rentaCampaignOf(now: Date): number {
  return now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/** The calendar quarter a date belongs to. */
export function quarterOf(now: Date): { year: number; quarter: 1 | 2 | 3 | 4 } {
  return {
    year: now.getUTCFullYear(),
    quarter: (Math.floor(now.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4,
  };
}

/** Last day (of the month after a quarter) to file that quarter's forms: 20th, or 30 January. */
const FILING_LAST_DAY: Record<1 | 2 | 3 | 4, number> = { 1: 20, 2: 20, 3: 20, 4: 30 };

/**
 * The quarters the free plan can draft on a date: the current one and, while its filing window
 * is open (1–20 April, July and October; 1–30 January), the one that has just ended.
 */
export function freeDraftQuarters(now: Date): { year: number; quarter: 1 | 2 | 3 | 4 }[] {
  const current = quarterOf(now);
  const month = now.getUTCMonth();
  if (month % 3 !== 0) return [current];
  const ended =
    current.quarter === 1
      ? { year: current.year - 1, quarter: 4 as const }
      : { year: current.year, quarter: (current.quarter - 1) as 1 | 2 | 3 };
  return now.getUTCDate() <= FILING_LAST_DAY[ended.quarter] ? [current, ended] : [current];
}
