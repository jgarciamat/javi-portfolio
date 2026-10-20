import { Migration } from '../migrator';

/**
 * Notices about the end of the 14-day trial (docs/marketing/plan-crecimiento.md, D5): the user's
 * choice (on by default: they are service messages about their own trial) and which notice went
 * out to whom, so each one is sent once per user.
 */
export const trialNotices: Migration = {
  version: 35,
  name: 'trial end notices',
  up(db) {
    db.exec(`
      ALTER TABLE user_settings ADD COLUMN trial_notices INTEGER NOT NULL DEFAULT 1;

      CREATE TABLE trial_notice_log (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind    TEXT NOT NULL CHECK(kind IN ('ends_soon','last_day','ended')),
        sent_at TEXT NOT NULL,
        PRIMARY KEY (user_id, kind)
      );
    `);
  },
};
