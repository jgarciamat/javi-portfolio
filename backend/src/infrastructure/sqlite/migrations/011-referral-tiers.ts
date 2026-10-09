import { Migration } from '../migrator';

/**
 * Invitations now pay off in tiers (1 friend, then 5 more, 10 more…) once the invited
 * user has done the first steps: the inviter's granted rewards are counted here.
 */
export const referralTiers: Migration = {
  version: 11,
  name: 'referral reward tiers',
  up(db) {
    db.exec(`ALTER TABLE referral_codes ADD COLUMN rewards_granted INTEGER NOT NULL DEFAULT 0;`);
  },
};
