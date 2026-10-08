import { Migration } from '../migrator';

/**
 * No refunds after buying: the user asks Premium to start at once and
 * acknowledges losing the 14-day right of withdrawal. Replaces the withdrawal
 * window of migration 6 with the record of that request.
 */
export const immediateStart: Migration = {
  version: 7,
  name: 'immediate start instead of withdrawal window',
  up(db) {
    db.exec(`
      ALTER TABLE subscriptions DROP COLUMN contract_started_at;
      ALTER TABLE subscriptions DROP COLUMN withdrawn_at;
      ALTER TABLE subscriptions ADD COLUMN withdrawal_waived_at TEXT;
    `);
  },
};
