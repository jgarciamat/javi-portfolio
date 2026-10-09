export type PlanId = 'free' | 'premium';
export type CheckoutKind = 'monthly' | 'yearly' | 'lifetime';

/** What the buyer agrees to before paying (the API requires both). */
export interface CheckoutConsent {
  acceptTerms: boolean;
  /** Premium starts at once, so the 14-day right of withdrawal is lost. */
  waiveWithdrawal: boolean;
}
export type LimitedResource = 'accounts' | 'budgets' | 'goals' | 'recurringRules' | 'customAlerts';
export type PremiumFeature = 'import' | 'insights' | 'aiAdvisor' | 'forecast' | 'household';

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

export interface HouseholdPerson {
  id: string;
  name: string;
}

/** Who the user shares their data with (a couple: the owner and one member). */
export interface HouseholdStatus {
  role: 'owner' | 'member' | 'none';
  /** The household a member works in. */
  owner: HouseholdPerson | null;
  members: HouseholdPerson[];
  /** An invitation waiting to be used (its code is only shown when created). */
  pendingInvite: { expiresAt: string } | null;
  maxMembers: number;
}

export interface BillingOverview {
  /** Members use the plan of the household owner. */
  household: HouseholdStatus;
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
  /** What the user has created (`movements` is informational, not limited). */
  usage: Record<LimitedResource, number> & { movements: number };
  ai: { used: number; quota: number };
  catalog: PlanCatalog;
}

/** Invitation code of the user and what their invitations have earned. */
export interface ReferralSummary {
  code: string;
  /** Friends who completed the first steps / who have not yet. */
  qualified: number;
  pending: number;
  /** Free Premium days per reward, for each side. */
  rewardDays: number;
  /** Free months earned so far. */
  rewardsEarned: number;
  /** Friends still needed for the next free month. */
  missing: number;
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
