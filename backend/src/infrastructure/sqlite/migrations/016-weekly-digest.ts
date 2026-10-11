import { Migration } from '../migrator';

/** Optional Monday summary by e-mail: the user's choice, and when the last one went out. */
export const weeklyDigest: Migration = {
  version: 16,
  name: 'weekly digest',
  up(db) {
    db.exec(`
      ALTER TABLE user_settings ADD COLUMN weekly_digest INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE user_settings ADD COLUMN last_digest_at TEXT;
    `);
  },
};
