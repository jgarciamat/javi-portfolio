import { Migration } from '../migrator';

/**
 * Creator affiliate program (docs/afiliacion). Creators get a code; a new user who signs up
 * with it and agrees is attributed to it (user → code, nothing else); the user's first
 * Premium payment becomes a sale with its commission. A deleted account keeps its sale only
 * as an anonymous accounting record (`user_id` set to NULL).
 */
export const creatorAffiliates: Migration = {
  version: 36,
  name: 'creator affiliate program',
  up(db) {
    db.exec(`
      CREATE TABLE creator_affiliates (
        code       TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        cap_cents  INTEGER,
        active     INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE creator_attributions (
        user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        code       TEXT NOT NULL REFERENCES creator_affiliates(code),
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_creator_attributions_code ON creator_attributions(code);

      CREATE TABLE creator_sales (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
        code             TEXT NOT NULL REFERENCES creator_affiliates(code),
        plan             TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly', 'lifetime')),
        provider         TEXT NOT NULL CHECK (provider IN ('stripe', 'google')),
        commission_cents INTEGER NOT NULL,
        sold_at          TEXT NOT NULL,
        reversed_at      TEXT,
        paid_at          TEXT,
        paid_cents       INTEGER,
        clawed_at        TEXT
      );
      CREATE INDEX idx_creator_sales_code ON creator_sales(code);
    `);
  },
};
