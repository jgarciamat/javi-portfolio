export type PlanId = 'free' | 'premium';
export type CheckoutKind = 'monthly' | 'yearly' | 'lifetime';

/** What the buyer agrees to before paying (the API requires both). */
export interface CheckoutConsent {
  acceptTerms: boolean;
  /** Premium starts at once, so the 14-day right of withdrawal is lost. */
  waiveWithdrawal: boolean;
}
export type LimitedResource = 'accounts' | 'budgets' | 'goals' | 'recurringRules' | 'customAlerts';
export type PremiumFeature = 'import' | 'insights' | 'aiAdvisor' | 'forecast';

export interface PlanLimits {
  /** null = unlimited */
  resources: Record<LimitedResource, number | null>;
  features: Record<PremiumFeature, boolean>;
  aiMonthlyQuota: number;
}

export interface PlanCatalog {
  currency: 'EUR';
  trialDays: number;
  paymentsEnabled: boolean;
  prices: { monthly: number; yearly: number; lifetime: number };
  lifetime: { available: boolean; remaining: number };
  limits: { free: PlanLimits; premium: PlanLimits };
}

export interface BillingOverview {
  plan: PlanId;
  trialDaysLeft: number;
  subscription: {
    status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
    source: 'trial' | 'stripe' | 'lifetime' | 'manual';
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    lifetime: boolean;
    canManage: boolean;
  };
  limits: PlanLimits;
  usage: Record<LimitedResource, number>;
  ai: { used: number; quota: number };
  catalog: PlanCatalog;
}

/** Why the paywall was opened. */
export type UpgradeReason =
  | { kind: 'limit'; resource: LimitedResource; limit: number }
  | { kind: 'feature'; feature: PremiumFeature }
  | { kind: 'generic' };

export interface LocalizedText {
  es: string;
  en: string;
}

export interface AffiliateOffer {
  id: string;
  category: 'savings' | 'investing' | 'banking' | 'insurance' | 'other';
  name: string;
  icon: string;
  title: LocalizedText;
  description: LocalizedText;
  highlight: LocalizedText | null;
  url: string;
  active: boolean;
}

export interface OffersResponse {
  enabled: boolean;
  offers: AffiliateOffer[];
}
