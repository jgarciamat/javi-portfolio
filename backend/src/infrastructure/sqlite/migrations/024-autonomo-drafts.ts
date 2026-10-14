import { Migration } from '../migrator';

/** How many tax drafts each self-employed user has prepared (the free plan allows one). */
export const autonomoDrafts: Migration = {
  version: 24,
  name: 'self-employed tax drafts',
  up(db) {
    db.exec(`
      CREATE TABLE autonomo_drafts (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        uses    INTEGER NOT NULL DEFAULT 0
      );
    `);
  },
};
