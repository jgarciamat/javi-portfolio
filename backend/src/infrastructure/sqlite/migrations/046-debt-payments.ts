import { Migration } from '../migrator';

/**
 * Debts paid every month by an automatic operation (README, «Deudas que se pagan solas»):
 *
 * - `recurring_rules.day`: day of the month of each movement (null, as every rule so far: the
 *   first day of the period).
 * - `assets.debt_type`: mortgage, personal loan, car loan, card or other. The debts kept so far
 *   become «other»; investments and goods have none.
 * - `assets.initial_cents`: what was borrowed (optional, for the progress).
 * - `assets.payment_rule_id`: the automatic operation that pays it (one per debt). Removing the
 *   operation leaves the debt as a debt valued by hand.
 * - `assets.payment_end_*`: the last instalment when the person gave how many are left.
 */
export const debtPayments: Migration = {
  version: 46,
  name: 'debts paid by an automatic operation',
  up(db) {
    db.exec(`
      ALTER TABLE recurring_rules
        ADD COLUMN day INTEGER CHECK (day IS NULL OR day BETWEEN 1 AND 31);
      ALTER TABLE assets ADD COLUMN debt_type TEXT
        CHECK (debt_type IS NULL OR debt_type IN ('mortgage','personal','car','card','other'));
      ALTER TABLE assets ADD COLUMN initial_cents INTEGER
        CHECK (initial_cents IS NULL OR initial_cents >= 0);
      ALTER TABLE assets ADD COLUMN payment_rule_id TEXT
        REFERENCES recurring_rules(id) ON DELETE SET NULL;
      ALTER TABLE assets ADD COLUMN payment_end_year INTEGER;
      ALTER TABLE assets ADD COLUMN payment_end_month INTEGER;
      CREATE UNIQUE INDEX idx_assets_payment_rule ON assets(payment_rule_id)
        WHERE payment_rule_id IS NOT NULL;
      UPDATE assets SET debt_type = 'other' WHERE kind = 'debt';
    `);
  },
};
