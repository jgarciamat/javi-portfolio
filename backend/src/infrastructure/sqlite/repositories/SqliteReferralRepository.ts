import { ReferralRecord, ReferralRepository } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteReferralRepository implements ReferralRepository {
  constructor(private readonly db: Db) {}

  codeOf(userId: string): string | null {
    const row = this.db.prepare('SELECT code FROM referral_codes WHERE user_id = ?').get(userId) as
      | { code: string }
      | undefined;
    return row?.code ?? null;
  }

  saveCode(userId: string, code: string): boolean {
    return (
      this.db
        .prepare('INSERT OR IGNORE INTO referral_codes (user_id, code) VALUES (?, ?)')
        .run(userId, code).changes > 0
    );
  }

  userByCode(code: string): string | null {
    const row = this.db.prepare('SELECT user_id FROM referral_codes WHERE code = ?').get(code) as
      | { user_id: string }
      | undefined;
    return row?.user_id ?? null;
  }

  addReferral(record: ReferralRecord): boolean {
    return (
      this.db
        .prepare(
          `INSERT OR IGNORE INTO referrals (referred_id, referrer_id, created_at, rewarded_at)
           VALUES (?, ?, ?, ?)`
        )
        .run(record.referredId, record.referrerId, record.createdAt, record.rewardedAt).changes > 0
    );
  }

  findByReferred(referredId: string): ReferralRecord | null {
    const row = this.db
      .prepare(
        'SELECT referred_id, referrer_id, created_at, rewarded_at FROM referrals WHERE referred_id = ?'
      )
      .get(referredId) as
      | { referred_id: string; referrer_id: string; created_at: string; rewarded_at: string | null }
      | undefined;
    return row
      ? {
          referredId: row.referred_id,
          referrerId: row.referrer_id,
          createdAt: row.created_at,
          rewardedAt: row.rewarded_at,
        }
      : null;
  }

  markRewarded(referredId: string, at: string): void {
    this.db
      .prepare('UPDATE referrals SET rewarded_at = ? WHERE referred_id = ?')
      .run(at, referredId);
  }

  counts(referrerId: string): { rewarded: number; pending: number } {
    const row = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(rewarded_at IS NOT NULL), 0) AS rewarded,
           COALESCE(SUM(rewarded_at IS NULL), 0)     AS pending
         FROM referrals WHERE referrer_id = ?`
      )
      .get(referrerId) as { rewarded: number; pending: number };
    return row;
  }
}
