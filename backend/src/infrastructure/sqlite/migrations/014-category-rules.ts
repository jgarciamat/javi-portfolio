import { Migration } from '../migrator';

/**
 * "Always put movements like this in that category": a text found in the description and the
 * category it maps to. Deleting a category deletes its rules.
 */
export const categoryRules: Migration = {
  version: 14,
  name: 'category rules',
  up(db) {
    db.exec(`
      CREATE TABLE category_rules (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pattern     TEXT NOT NULL,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        created_at  TEXT NOT NULL,
        UNIQUE (user_id, pattern)
      );
      CREATE INDEX idx_category_rules_user ON category_rules(user_id);
    `);
  },
};
