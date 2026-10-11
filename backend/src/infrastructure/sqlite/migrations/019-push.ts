import { Migration } from '../migrator';

/** Web Push subscriptions (one per browser or installed app) and what has been sent to whom. */
export const push: Migration = {
  version: 19,
  name: 'push notifications',
  up(db) {
    db.exec(`
      CREATE TABLE push_subscriptions (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint   TEXT NOT NULL UNIQUE,
        p256dh     TEXT NOT NULL,
        auth       TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

      CREATE TABLE push_log (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind    TEXT NOT NULL,
        key     TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        PRIMARY KEY (user_id, kind, key)
      );
    `);
  },
};
