import { Migration } from '../migrator';

/** How many times each user has used the income tax return calculator (the free plan allows one). */
export const rentaCalculations: Migration = {
  version: 22,
  name: 'income tax return calculations',
  up(db) {
    db.exec(`
      CREATE TABLE renta_calculations (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        uses    INTEGER NOT NULL DEFAULT 0
      );
    `);
  },
};
