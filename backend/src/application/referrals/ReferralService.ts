import { randomInt } from 'crypto';
import { ReferralRepository } from '@domain/ports/repositories';
import { Clock, MetricsRecorder } from '@domain/ports/services';
import { EntitlementService } from '@application/billing/EntitlementService';

/** Free Premium days each side gets when an invited user verifies the e-mail. */
export const REFERRAL_REWARD_DAYS = 30;
/** Rewards one person can collect for the invitations they send (a year of Premium). */
export const MAX_REFERRAL_REWARDS = 12;

/** No 0/O/1/I: codes are read out and typed by hand. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const ATTEMPTS = 8;

export interface ReferralSummary {
  code: string;
  rewarded: number;
  pending: number;
  rewardDays: number;
  /** Rewards still available for this user. */
  remaining: number;
}

export class ReferralService {
  constructor(
    private readonly referrals: ReferralRepository,
    private readonly entitlements: EntitlementService,
    private readonly metrics: MetricsRecorder,
    private readonly clock: Clock
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
    const { rewarded, pending } = this.referrals.counts(userId);
    return {
      code: this.codeFor(userId),
      rewarded,
      pending,
      rewardDays: REFERRAL_REWARD_DAYS,
      remaining: Math.max(0, MAX_REFERRAL_REWARDS - rewarded),
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

  /** Called when a user verifies the e-mail: if they were invited, both get Premium days (once). */
  reward(referredId: string): void {
    const referral = this.referrals.findByReferred(referredId);
    if (!referral || referral.rewardedAt) return;
    this.referrals.markRewarded(referredId, this.clock.now().toISOString());
    this.entitlements.grantDays(referredId, REFERRAL_REWARD_DAYS);
    if (this.referrals.counts(referral.referrerId).rewarded <= MAX_REFERRAL_REWARDS) {
      this.entitlements.grantDays(referral.referrerId, REFERRAL_REWARD_DAYS);
    }
    this.metrics.record('referral_joined');
  }
}
