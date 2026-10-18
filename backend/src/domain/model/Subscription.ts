/**
 * Premium entitlement of a user. Sources:
 *  - trial: 14 days granted automatically at sign-up (no card)
 *  - stripe: recurring subscription paid on the web
 *  - lifetime: one-time "founder" purchase
 *  - google: subscription or lifetime bought in the Android app (Google Play)
 *  - manual: granted by hand (support, partners)
 */
export const TRIAL_DAYS = 14;
/** Days of paid Premium after which reading a tax return draft is included. */
export const RENTA_DRAFT_PREMIUM_DAYS = 60;
/** Days of unlimited use that the one-time pass gives. */
export const RENTA_PASS_DAYS = 30;
/** Days a failed renewal keeps Premium while the payment provider retries. */
export const PAST_DUE_GRACE_DAYS = 3;
/** Version (date) of the terms of sale the user accepts before paying. */
export const TERMS_VERSION = '2026-10-18';

export type PlanId = 'free' | 'premium';
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
export type SubscriptionSource = 'trial' | 'stripe' | 'lifetime' | 'manual' | 'google';

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
  /** When paid Premium began (the trial does not count); set by the repository. */
  paidSince: string | null;
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
    paidSince: null,
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

export type DraftAccessReason = 'premium' | 'pass';

export interface RentaAccess {
  /** Reading a tax return draft is allowed (and, with a pass, so is calculating without a limit). */
  draft: { allowed: boolean; reason: DraftAccessReason | null };
  /** When paid Premium reaches the two months that include the draft reader; null when it never will. */
  eligibleOn: string | null;
  /** Until when the one-month pass lasts (null: no active pass). */
  passUntil: string | null;
}

/**
 * Who can read a tax return draft: people with paid Premium for more than two months (lifetime
 * included) and people with an active pass. The 14-day trial never gives it.
 */
export function rentaAccessOf(
  sub: SubscriptionProps | null,
  passEndsAt: string | null,
  now: Date
): RentaAccess {
  const passUntil = isFuture(passEndsAt, now) ? passEndsAt : null;
  const paid = !!sub && sub.source !== 'trial' && planOf(sub, now) === 'premium';
  const since = paid && sub!.paidSince ? new Date(sub!.paidSince).getTime() : null;
  const eligibleAt =
    sub?.lifetime && paid ? 0 : since === null ? null : since + RENTA_DRAFT_PREMIUM_DAYS * DAY_MS;
  const included = eligibleAt !== null && eligibleAt <= now.getTime();
  return {
    draft: {
      allowed: included || passUntil !== null,
      reason: included ? 'premium' : passUntil !== null ? 'pass' : null,
    },
    eligibleOn: eligibleAt === null || included ? null : new Date(eligibleAt).toISOString(),
    passUntil,
  };
}
