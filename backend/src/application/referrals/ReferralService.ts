import { randomInt } from 'crypto';
import { ReferralRepository } from '@domain/ports/repositories';
import { Clock, MetricsRecorder } from '@domain/ports/services';
import { EntitlementService } from '@application/billing/EntitlementService';
import { canonicalInbox, isDisposableEmail } from '@domain/services/email-identity';

/** Free Premium days of every reward (the invited friend gets one too). */
export const REFERRAL_REWARD_DAYS = 30;
/** Months an inviter can earn in a calendar year: one per friend who counts. */
export const REFERRAL_MAX_PER_YEAR = 6;
/** Months an inviter can receive in a calendar month; the rest wait for the next one. */
export const REFERRAL_MAX_PER_MONTH = 3;
/**
 * Invitations one user can have attached in total, so that farming accounts pays nothing more
 * (friends who never finish the first steps do not block it).
 */
export const MAX_INVITED_PER_USER = 100;
/** The invited friend must have written down movements on this many different days… */
export const ACTIVE_DAYS_GOAL = 3;
/** …within this many days from signing up: something a script cannot do in a minute. */
export const ACTIVE_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The "friends needed in total for each month" table that app versions before the one month
 * per friend rule still draw: 1 friend → 1 month… up to the yearly maximum.
 */
export const REFERRAL_TIERS: readonly number[] = Array.from(
  { length: REFERRAL_MAX_PER_YEAR },
  (_, i) => i + 1
);

/** What an invited user has created, for the first steps that make the invitation count. */
export interface FirstStepsCounts {
  movements: number;
  budgets: number;
  goals: number;
  automations: number;
}

/** The first steps an invited user must complete: 3 movements, a budget, a goal and an automation. */
export const FIRST_STEPS_GOALS: FirstStepsCounts = {
  movements: 3,
  budgets: 1,
  goals: 1,
  automations: 1,
};

export type FirstStepId = keyof FirstStepsCounts;

export interface FirstStepProgress {
  id: FirstStepId;
  /** What the user has (capped at the goal) and what is asked for. */
  count: number;
  goal: number;
  done: boolean;
}

/** For an invited user: whether their free month arrived and what is missing for it. */
export interface InviteeStatus {
  rewarded: boolean;
  steps: FirstStepProgress[];
  /** Different days with movements in the first month (capped at the goal). */
  activeDays: { count: number; goal: number };
  /** False with a throwaway e-mail address: the invitation gives no month until it changes. */
  eligible: boolean;
}

export function firstStepsProgress(counts: FirstStepsCounts): FirstStepProgress[] {
  return (Object.keys(FIRST_STEPS_GOALS) as FirstStepId[]).map((id) => {
    const goal = FIRST_STEPS_GOALS[id];
    return { id, count: Math.min(counts[id], goal), goal, done: counts[id] >= goal };
  });
}

/** No 0/O/1/I: codes are read out and typed by hand. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const ATTEMPTS = 8;

export interface ReferralSummary {
  code: string;
  /** Friends who completed the first steps / who have not yet. */
  qualified: number;
  pending: number;
  rewardDays: number;
  /** Months of Premium earned this calendar year. */
  rewardsEarned: number;
  /** Friends who count but whose month waits for next month (or next year), over the limits. */
  waiting: number;
  /** Friends still needed for the next month: 1, as every friend gives one (0 when maxed). */
  missing: number;
  /** Friends needed in total for the next month; `null` once this year's months are earned. */
  nextAt: number | null;
  /** This year's months have all been earned. */
  maxed: boolean;
  /** Months that can be earned per calendar year, and per calendar month. */
  maxRewards: number;
  perMonth: number;
  /** For app versions that draw a table: 1 friend → 1 month, 2 → 2… */
  tiers: number[];
  /** Set when this user was invited: their own free month and its first steps. */
  invited: InviteeStatus | null;
}

/** What the user has created that counts for the first steps. */
export type FirstStepsCounter = (userId: string) => FirstStepsCounts;

/** What the program needs to know about an account to tell a real friend from a farmed one. */
export interface ReferralPeople {
  /** E-mail and signup time; null when the account no longer exists. */
  accountOf(userId: string): { email: string; createdAt: string } | null;
  /** Different days in [from, to) with movements written down by the user. */
  activeDays(userId: string, from: string, to: string): number;
}

export class ReferralService {
  constructor(
    private readonly referrals: ReferralRepository,
    private readonly entitlements: EntitlementService,
    private readonly metrics: MetricsRecorder,
    private readonly clock: Clock,
    private readonly firstSteps: FirstStepsCounter,
    private readonly people: ReferralPeople
  ) {}

  private newCode(): string {
    return Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  }

  /** The user's invitation code, created the first time it is asked for. */
  codeFor(userId: string): string {
    const existing = this.referrals.codeOf(userId);
    if (existing) return existing;
    for (let i = 0; i < ATTEMPTS; i++) {
      const code = this.newCode();
      if (this.referrals.saveCode(userId, code)) return code;
    }
    throw new Error('Could not create a referral code');
  }

  private inboxOf(userId: string): string | null {
    return canonicalInbox(this.people.accountOf(userId)?.email);
  }

  private disposable(userId: string): boolean {
    return isDisposableEmail(this.people.accountOf(userId)?.email);
  }

  /** Days with movements in the first month of the account, capped at the goal. */
  private activeDays(userId: string): number {
    const account = this.people.accountOf(userId);
    if (!account) return 0;
    const from = new Date(account.createdAt);
    const to = new Date(from.getTime() + ACTIVE_WINDOW_DAYS * DAY_MS);
    const days = this.people.activeDays(userId, from.toISOString(), to.toISOString());
    return Math.min(days, ACTIVE_DAYS_GOAL);
  }

  /** First steps done, real use on different days and an e-mail that is not a throwaway one. */
  private qualifies(userId: string): boolean {
    return (
      firstStepsProgress(this.firstSteps(userId)).every((step) => step.done) &&
      this.activeDays(userId) >= ACTIVE_DAYS_GOAL &&
      !this.disposable(userId)
    );
  }

  summary(userId: string): ReferralSummary {
    // Friends (and the user, if invited) may have finished their first steps since the last look,
    // and months that waited for a new month may be due now.
    for (const referredId of this.referrals.pendingReferred(userId)) this.reward(referredId);
    this.reward(userId);
    this.payInviter(userId);
    const { qualified, pending } = this.referrals.counts(userId);
    const earned = this.referrals.inviterMonthsSince(userId, this.yearStart());
    const maxed = earned >= REFERRAL_MAX_PER_YEAR;
    return {
      code: this.codeFor(userId),
      qualified,
      pending,
      rewardDays: REFERRAL_REWARD_DAYS,
      rewardsEarned: earned,
      waiting: this.referrals.unsettledForInviter(userId).length,
      missing: maxed ? 0 : 1,
      nextAt: maxed ? null : qualified + 1,
      maxed,
      maxRewards: REFERRAL_MAX_PER_YEAR,
      perMonth: REFERRAL_MAX_PER_MONTH,
      tiers: [...REFERRAL_TIERS],
      invited: this.inviteeStatus(userId),
    };
  }

  /** Only the invited user's own progress: nothing about who invited them. */
  private inviteeStatus(userId: string): InviteeStatus | null {
    const referral = this.referrals.findByReferred(userId);
    if (!referral) return null;
    return {
      rewarded: referral.rewardedAt !== null,
      steps: firstStepsProgress(this.firstSteps(userId)),
      activeDays: { count: this.activeDays(userId), goal: ACTIVE_DAYS_GOAL },
      eligible: !this.disposable(userId),
    };
  }

  /**
   * Remembers who invited a new user. Unknown codes, self-invitations (also with another spelling
   * of the inviter's inbox), a second account on an inbox the inviter already brought and
   * invitations over the cap are ignored silently.
   */
  attach(referredId: string, rawCode: string): void {
    const referrerId = this.referrals.userByCode(rawCode.trim().toUpperCase());
    if (!referrerId || referrerId === referredId) return;
    const inbox = this.inboxOf(referredId);
    const known = [referrerId, ...this.referrals.referredBy(referrerId)];
    if (inbox && known.some((id) => this.inboxOf(id) === inbox)) return;
    const { qualified, pending } = this.referrals.counts(referrerId);
    if (qualified + pending >= MAX_INVITED_PER_USER) return;
    this.referrals.addReferral({
      referredId,
      referrerId,
      createdAt: this.clock.now().toISOString(),
      rewardedAt: null,
    });
  }

  /**
   * Called for an invited user: once the invitation counts (first steps, three days of use, a
   * real inbox) they get their free month and the inviter's month is queued. Both are added
   * after any Premium already paid for, so nobody loses days in the overlap.
   */
  reward(referredId: string): void {
    const referral = this.referrals.findByReferred(referredId);
    if (!referral || referral.rewardedAt || !this.qualifies(referredId)) return;
    this.referrals.markRewarded(referredId, this.clock.now().toISOString());
    this.entitlements.grantDays(referredId, REFERRAL_REWARD_DAYS, { afterPaidPeriod: true });
    this.metrics.record('referral_joined');
    this.payInviter(referral.referrerId);
  }

  private yearStart(): string {
    return `${this.clock.now().toISOString().slice(0, 4)}-01-01`;
  }

  /**
   * One month per friend who counts, oldest first, while this calendar month (3) and year (6)
   * allow it; the rest wait. An inviter with a throwaway inbox gets nothing until it changes.
   * Lifetime users have everything already: their friends are settled without a month.
   */
  private payInviter(inviterId: string): void {
    const queue = this.referrals.unsettledForInviter(inviterId);
    if (queue.length === 0 || this.disposable(inviterId)) return;
    const now = this.clock.now().toISOString();
    let month = this.referrals.inviterMonthsSince(inviterId, `${now.slice(0, 7)}-01`);
    let year = this.referrals.inviterMonthsSince(inviterId, this.yearStart());
    for (const referredId of queue) {
      if (month >= REFERRAL_MAX_PER_MONTH || year >= REFERRAL_MAX_PER_YEAR) return;
      const given = this.entitlements.grantDays(inviterId, REFERRAL_REWARD_DAYS, {
        afterPaidPeriod: true,
      });
      this.referrals.settleForInviter(referredId, now, given);
      if (!given) continue;
      this.referrals.setRewardsGranted(inviterId, this.referrals.rewardsGranted(inviterId) + 1);
      month++;
      year++;
    }
  }
}
