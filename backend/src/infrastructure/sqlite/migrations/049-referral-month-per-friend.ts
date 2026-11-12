import { Migration } from '../migrator';

/**
 * Invitations pay one month per friend (at most 3 a month and 6 a year): each friend now records
 * when the inviter's side was settled and whether it gave a month. Friends who already counted
 * are settled under the old tiers: the months already given are kept (marked on the earliest
 * friends, as many as months were given) and the rest give nothing more.
 */
export const referralMonthPerFriend: Migration = {
  version: 49,
  name: 'one referral month per friend',
  up(db) {
    db.exec(`
      ALTER TABLE referrals ADD COLUMN inviter_settled_at TEXT;
      ALTER TABLE referrals ADD COLUMN inviter_month INTEGER NOT NULL DEFAULT 0;

      UPDATE referrals SET inviter_settled_at = rewarded_at WHERE rewarded_at IS NOT NULL;

      UPDATE referrals SET inviter_month = 1 WHERE referred_id IN (
        SELECT referred_id FROM (
          SELECT r.referred_id,
                 ROW_NUMBER() OVER (
                   PARTITION BY r.referrer_id ORDER BY r.rewarded_at, r.referred_id
                 ) AS n,
                 COALESCE(c.rewards_granted, 0) AS granted
          FROM referrals r
          LEFT JOIN referral_codes c ON c.user_id = r.referrer_id
          WHERE r.rewarded_at IS NOT NULL
        ) WHERE n <= granted
      );
    `);
  },
};
