import { PlanId } from '@domain/model/Subscription';
import { filingDeadline, spanishDays } from './working-days';

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
  | 'insights'
  | 'aiAdvisor'
  | 'forecast'
  | 'household'
  | 'inbox'
  | 'capture'
  | 'investCourse'
  /** Comforts of the crypto console (statistics, price alerts, season report); no ranking edge. */
  | 'cryptoPro';

/** Months of the outlook the free plan sees (Premium sees up to 12 and tries «what if…»). */
export const FREE_FORECAST_MONTHS = 1;
/** Detected subscriptions the free plan sees in full (the rest come back locked). */
export const FREE_SUBSCRIPTIONS_SHOWN = 3;
/**
 * Findings of «Tu dinero perdido» the free plan sees in full: the most expensive ones. Possible
 * double charges are always shown on top of these (a wrong charge is never behind a payment).
 */
export const FREE_LEAKS_SHOWN = 3;

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
      // Bank statement imports are free and unlimited on every plan (the server still caps the
      // size of each file and how many are sent per hour). Kept as a resource so the apps
      // already installed read it as unlimited.
      imports: Infinity,
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
      cryptoPro: true,
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

/** The calendar quarter of a day (YYYY-MM-DD). */
const quarterOfDay = (day: string): { year: number; quarter: 1 | 2 | 3 | 4 } => ({
  year: Number(day.slice(0, 4)),
  quarter: (Math.floor((Number(day.slice(5, 7)) - 1) / 3) + 1) as 1 | 2 | 3 | 4,
});

/** The calendar quarter a date belongs to, by the day in mainland Spain. */
export const quarterOf = (now: Date): { year: number; quarter: 1 | 2 | 3 | 4 } =>
  quarterOfDay(spanishDays(now)[0]);

/** The current quarter and, while it can still be filed on that day, the one just ended. */
function draftableOn(day: string): { year: number; quarter: 1 | 2 | 3 | 4 }[] {
  const current = quarterOfDay(day);
  const ended =
    current.quarter === 1
      ? { year: current.year - 1, quarter: 4 as const }
      : { year: current.year, quarter: (current.quarter - 1) as 1 | 2 | 3 };
  return day <= filingDeadline(ended.year, ended.quarter) ? [current, ended] : [current];
}

/**
 * The quarters the free plan can draft on a date: the current one and, while its filing window is
 * open, the one that has just ended. The window ends on the real last day (20 April, July and
 * October, 30 January, moved past weekends and holidays: 1 February 2027 for the fourth quarter of
 * 2026), on the day of mainland Spain or of the Canary Islands, whichever is still in time.
 */
export function freeDraftQuarters(now: Date): { year: number; quarter: 1 | 2 | 3 | 4 }[] {
  const out: { year: number; quarter: 1 | 2 | 3 | 4 }[] = [];
  for (const q of spanishDays(now).flatMap(draftableOn)) {
    if (!out.some((o) => o.year === q.year && o.quarter === q.quarter)) out.push(q);
  }
  return out;
}
