import { Migration } from '../migrator';

/**
 * "Invite a friend": every user can get a code; who joined with whose code is kept until
 * the invited user verifies the e-mail, which gives both a free month of Premium.
 */
export const referrals: Migration = {
  version: 9,
  name: 'referral codes and invitations',
  up(db) {
    db.exec(`
      CREATE TABLE referral_codes (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        code    TEXT NOT NULL UNIQUE
      );

      CREATE TABLE referrals (
        referred_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        referrer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at  TEXT NOT NULL,
        rewarded_at TEXT
      );
      CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
    `);
  },
};
