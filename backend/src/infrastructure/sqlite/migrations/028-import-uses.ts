import { Migration } from '../migrator';

/** How many bank statements each user has imported (the free plan allows one). */
export const importUses: Migration = {
  version: 28,
  name: 'bank statement imports',
  up(db) {
    db.exec(`
      CREATE TABLE import_uses (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        uses    INTEGER NOT NULL DEFAULT 0
      );
    `);
  },
};
