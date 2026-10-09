import { randomInt } from 'crypto';
import { ReferralRepository } from '@domain/ports/repositories';
import { Clock, MetricsRecorder } from '@domain/ports/services';
import { EntitlementService } from '@application/billing/EntitlementService';

/** Free Premium days of every reward (the invited friend gets one too). */
export const REFERRAL_REWARD_DAYS = 30;
/** Extra friends needed for each new reward after the first: 5, then 10, then 15… */
export const REFERRAL_STEP = 5;

/**
 * Friends that must have completed the first steps in total to have earned `n` rewards:
 * 1 for the first, then 5 more for the second (6), 10 more for the third (16), 15 more… (31).
 */
export function friendsForReward(n: number): number {
  if (n <= 0) return 0;
  return 1 + (REFERRAL_STEP * (n - 1) * n) / 2;
}

/** Rewards earned with this many friends who completed the first steps. */
export function rewardsEarned(qualifiedFriends: number): number {
  let n = 0;
  while (friendsForReward(n + 1) <= qualifiedFriends) n++;
  return n;
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
  /** Friends still needed for the next free month. */
  missing: number;
}

/** The first steps an invited user must complete before the invitation counts. */
export type FirstStepsCheck = (userId: string) => boolean;

export class ReferralService {
  constructor(
    private readonly referrals: ReferralRepository,
    private readonly entitlements: EntitlementService,
    private readonly metrics: MetricsRecorder,
    private readonly clock: Clock,
    private readonly completedFirstSteps: FirstStepsCheck
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

  summary(userId: string): ReferralSummary {
    // Friends may have finished their first steps since the last time this was looked at.
    for (const referredId of this.referrals.pendingReferred(userId)) this.reward(referredId);
    const { qualified, pending } = this.referrals.counts(userId);
    const earned = rewardsEarned(qualified);
    return {
      code: this.codeFor(userId),
      qualified,
      pending,
      rewardDays: REFERRAL_REWARD_DAYS,
      rewardsEarned: earned,
      missing: friendsForReward(earned + 1) - qualified,
    };
  }

  /** Remembers who invited a new user. Unknown codes and self-invitations are ignored silently. */
  attach(referredId: string, rawCode: string): void {
    const referrerId = this.referrals.userByCode(rawCode.trim().toUpperCase());
    if (!referrerId || referrerId === referredId) return;
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
