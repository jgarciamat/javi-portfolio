export type PlanId = 'free' | 'premium';
export type CheckoutKind = 'monthly' | 'yearly' | 'lifetime' | 'renta_pass';

/** What the buyer agrees to before paying (the API requires both). */
export interface CheckoutConsent {
  acceptTerms: boolean;
  /** Premium starts at once, so the 14-day right of withdrawal is lost. */
  waiveWithdrawal: boolean;
}
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
export type PremiumFeature =
  | 'insights'
  | 'aiAdvisor'
  | 'forecast'
  | 'household'
  | 'inbox'
  | 'capture'
  | 'investCourse';

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
  prices: { monthly: number; yearly: number; lifetime: number; rentaPass: number };
  /** The one-month pass that includes reading a tax return draft. */
  rentaPass: { available: boolean };
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
  /** The owner no longer has Premium: nothing is shared until they renew (members see their own data). */
  paused: boolean;
}

/** Who can read a tax return draft: paid Premium for over two months, or the one-month pass. */
export interface RentaAccess {
  draft: { allowed: boolean; reason: 'premium' | 'pass' | null };
  /** When paid Premium reaches the two months that include it. */
  eligibleOn: string | null;
  /** Until when the pass lasts. */
  passUntil: string | null;
}

/** Self-employed drafts prepared for a quarter the free plan can draft today. */
export interface QuarterDraftUsage {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  used: number;
}

/** The terms of sale in force and whether the user has to accept them again. */
export interface TermsStatus {
  version: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  /** Accepted an earlier version: the app asks to accept the current one. */
  mustAccept: boolean;
}

export interface BillingOverview {
  /** Members use the plan of the household owner. */
  household: HouseholdStatus;
  plan: PlanId;
  trialDaysLeft: number;
  subscription: {
    status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
    source: 'trial' | 'stripe' | 'lifetime' | 'manual' | 'google';
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    lifetime: boolean;
    canManage: boolean;
  };
  limits: PlanLimits;
  renta: RentaAccess;
  /** What the user has created (`movements` is informational, not limited). */
  usage: Record<LimitedResource, number> & { movements: number };
  /** Drafts of the current quarter and, while it can be filed, of the one just ended. */
  autonomoQuarters: QuarterDraftUsage[];
  ai: { used: number; quota: number };
  catalog: PlanCatalog;
  terms: TermsStatus;
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
