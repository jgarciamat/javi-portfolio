import { Migration } from '../migrator';

/**
 * Forward a receipt by e-mail: every user has a private address (a token) and the last
 * messages that reached it are kept to show what happened to each one. The text of the
 * e-mails is never stored.
 */
export const inbox: Migration = {
  version: 21,
  name: 'e-mail inbox for receipts',
  up(db) {
    db.exec(`
      CREATE TABLE inbox_tokens (
        user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE inbox_messages (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        received_at  TEXT NOT NULL,
        status       TEXT NOT NULL,
        description  TEXT,
        amount_cents INTEGER
      );
      CREATE INDEX idx_inbox_messages_user ON inbox_messages(user_id, received_at);
    `);
  },
};
