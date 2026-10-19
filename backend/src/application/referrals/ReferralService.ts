import { randomInt } from 'crypto';
import { ReferralRepository } from '@domain/ports/repositories';
import { Clock, MetricsRecorder } from '@domain/ports/services';
import { EntitlementService } from '@application/billing/EntitlementService';

/** Free Premium days of every reward (the invited friend gets one too). */
export const REFERRAL_REWARD_DAYS = 30;
/**
 * Friends that must have completed the first steps, in total, for each month the inviter earns:
 * the first month with 1 friend, the second with 5, then 20, 40 and 50. No more after the fifth.
 */
export const REFERRAL_TIERS: readonly number[] = [1, 5, 20, 40, 50];
/** Months an inviter can earn at most. */
export const REFERRAL_MAX_REWARDS = REFERRAL_TIERS.length;

/** Friends needed in total for `n` rewards; `null` past the last tier (it cannot be earned). */
export function friendsForReward(n: number): number | null {
  if (n <= 0) return 0;
  return REFERRAL_TIERS[n - 1] ?? null;
}

/** Rewards earned with this many friends who completed the first steps. */
export function rewardsEarned(qualifiedFriends: number): number {
  return REFERRAL_TIERS.filter((friends) => friends <= qualifiedFriends).length;
}

/**
 * Invitations one user can have attached in total. Twice the last tier, so that friends who never
 * finish the first steps do not block it; past it farming accounts pays nothing more.
 */
export const MAX_INVITED_PER_USER = 2 * REFERRAL_TIERS[REFERRAL_TIERS.length - 1];

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
  /** Months of Premium earned so far. */
  rewardsEarned: number;
  /** Friends still needed for the next free month (0 once every month has been earned). */
  missing: number;
  /** Friends needed in total for the next month; `null` once every month has been earned. */
  nextAt: number | null;
  /** Every month has been earned: no more to come from invitations. */
  maxed: boolean;
  maxRewards: number;
  /** Friends needed in total for each month (the table shown to the user). */
  tiers: number[];
  /** Set when this user was invited: their own free month and its first steps. */
  invited: InviteeStatus | null;
}

/** What the user has created that counts for the first steps. */
export type FirstStepsCounter = (userId: string) => FirstStepsCounts;

export class ReferralService {
  constructor(
    private readonly referrals: ReferralRepository,
    private readonly entitlements: EntitlementService,
    private readonly metrics: MetricsRecorder,
    private readonly clock: Clock,
    private readonly firstSteps: FirstStepsCounter
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

  private completedFirstSteps(userId: string): boolean {
    return firstStepsProgress(this.firstSteps(userId)).every((step) => step.done);
  }

  summary(userId: string): ReferralSummary {
    // Friends (and the user, if invited) may have finished their first steps since the last look.
    for (const referredId of this.referrals.pendingReferred(userId)) this.reward(referredId);
    this.reward(userId);
    const { qualified, pending } = this.referrals.counts(userId);
    const earned = rewardsEarned(qualified);
    const nextAt = friendsForReward(earned + 1);
    return {
      code: this.codeFor(userId),
      qualified,
      pending,
      rewardDays: REFERRAL_REWARD_DAYS,
      rewardsEarned: earned,
      missing: nextAt === null ? 0 : nextAt - qualified,
      nextAt,
      maxed: nextAt === null,
      maxRewards: REFERRAL_MAX_REWARDS,
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
    };
  }

  /** Remembers who invited a new user. Unknown codes, self-invitations and invitations over the cap are ignored silently. */
  attach(referredId: string, rawCode: string): void {
    const referrerId = this.referrals.userByCode(rawCode.trim().toUpperCase());
    if (!referrerId || referrerId === referredId) return;
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
   * Called for an invited user: once they have done the first steps the invitation counts, they
   * get their free month and the inviter gets a month whenever a new tier is reached.
   * Months granted before (also under the old tiers) are never taken back: only the months that
   * the tiers give over those already granted are added.
   */
  reward(referredId: string): void {
    const referral = this.referrals.findByReferred(referredId);
    if (!referral || referral.rewardedAt || !this.completedFirstSteps(referredId)) return;
    this.referrals.markRewarded(referredId, this.clock.now().toISOString());
    this.entitlements.grantDays(referredId, REFERRAL_REWARD_DAYS);

    const inviter = referral.referrerId;
    const earned = rewardsEarned(this.referrals.counts(inviter).qualified);
    const granted = this.referrals.rewardsGranted(inviter);
    if (earned > granted) {
      this.entitlements.grantDays(inviter, (earned - granted) * REFERRAL_REWARD_DAYS);
      this.referrals.setRewardsGranted(inviter, earned);
    }
    this.metrics.record('referral_joined');
  }
}
