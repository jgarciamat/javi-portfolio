import { Migration } from '../migrator';

/**
 * Payments detected in the bank notifications that each user added, per calendar month
 * (YYYY-MM, by the day in mainland Spain): the free plan adds 15 a month, Premium has no limit.
 */
export const captureMonthUses: Migration = {
  version: 48,
  name: 'payments detected in notifications added per month',
  up(db) {
    db.exec(`
      CREATE TABLE capture_month_uses (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month   TEXT NOT NULL,
        uses    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, month)
      );
    `);
  },
};
