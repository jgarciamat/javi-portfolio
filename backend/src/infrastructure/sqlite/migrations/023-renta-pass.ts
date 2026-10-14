import { Migration } from '../migrator';

/**
 * Reading a tax return draft is for people who have paid for Premium for more than two months,
 * or who bought a one-month pass: `paid_since` is when the paid Premium began (the 14-day trial does
 * not count) and `renta_passes` holds the passes.
 */
export const rentaPass: Migration = {
  version: 23,
  name: 'paid premium since and tax return passes',
  up(db) {
    db.exec(`
      ALTER TABLE subscriptions ADD COLUMN paid_since TEXT;
      UPDATE subscriptions SET paid_since = updated_at
       WHERE source != 'trial' AND (lifetime = 1 OR status IN ('active', 'past_due'));

      CREATE TABLE renta_passes (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        ends_at TEXT NOT NULL
      );
    `);
  },
};
