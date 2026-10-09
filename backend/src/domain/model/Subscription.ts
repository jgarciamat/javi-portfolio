/**
 * Premium entitlement of a user. Sources:
 *  - trial: 14 days granted automatically at sign-up (no card)
 *  - stripe: recurring subscription paid on the web
 *  - lifetime: one-time "founder" purchase
 *  - manual: granted by hand (support, partners)
 */
export const TRIAL_DAYS = 14;
/** Days a failed renewal keeps Premium while the payment provider retries. */
export const PAST_DUE_GRACE_DAYS = 3;
/** Version (date) of the terms of sale the user accepts before paying. */
export const TERMS_VERSION = '2026-10-09';

export type PlanId = 'free' | 'premium';
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
export type SubscriptionSource = 'trial' | 'stripe' | 'lifetime' | 'manual';

export interface SubscriptionProps {
  userId: string;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  lifetime: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  /** When the user asked Premium to start at once, giving up the 14-day withdrawal. */
  withdrawalWaivedAt: string | null;
  updatedAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function newTrial(userId: string, now: Date): SubscriptionProps {
  return {
    userId,
    status: 'trialing',
    source: 'trial',
    trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS).toISOString(),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    lifetime: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    termsAcceptedAt: null,
    termsVersion: null,
    withdrawalWaivedAt: null,
    updatedAt: now.toISOString(),
  };
}

export function emptySubscription(userId: string, now: Date): SubscriptionProps {
  return { ...newTrial(userId, now), status: 'none', source: 'trial', trialEndsAt: null };
}

function isFuture(iso: string | null, now: Date, graceMs = 0): boolean {
  return !!iso && new Date(iso).getTime() + graceMs > now.getTime();
}

export function isTrialActive(sub: SubscriptionProps | null, now: Date): boolean {
  return !!sub && isFuture(sub.trialEndsAt, now);
}

/** The single rule that decides whether a user has Premium right now. */
export function planOf(sub: SubscriptionProps | null, now: Date): PlanId {
  if (!sub) return 'free';
  if (sub.lifetime) return 'premium';
  if (isTrialActive(sub, now)) return 'premium';
  if (sub.status === 'active' || sub.status === 'trialing') {
    return isFuture(sub.currentPeriodEnd, now) ? 'premium' : 'free';
  }
  if (sub.status === 'past_due') {
    return isFuture(sub.currentPeriodEnd, now, PAST_DUE_GRACE_DAYS * DAY_MS) ? 'premium' : 'free';
  }
  return 'free';
}

export function trialDaysLeft(sub: SubscriptionProps | null, now: Date): number {
  if (!isTrialActive(sub, now)) return 0;
  return Math.ceil((new Date(sub!.trialEndsAt!).getTime() - now.getTime()) / DAY_MS);
}
