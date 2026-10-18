import { Migration } from '../migrator';

/**
 * Self-employed tax drafts per quarter (the free plan allows one of the current quarter).
 * `autonomo_drafts` keeps the old lifetime count, which no longer limits anything.
 */
export const autonomoQuarterDrafts: Migration = {
  version: 30,
  name: 'self-employed tax drafts per quarter',
  up(db) {
    db.exec(`
      CREATE TABLE autonomo_quarter_drafts (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year    INTEGER NOT NULL,
        quarter INTEGER NOT NULL,
        uses    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, year, quarter)
      );
    `);
  },
};
