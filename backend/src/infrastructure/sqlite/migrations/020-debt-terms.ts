import { Migration } from '../migrator';

/** Debts can carry their yearly interest rate and minimum monthly payment (for the payoff plan). */
export const debtTerms: Migration = {
  version: 20,
  name: 'debt terms',
  up(db) {
    db.exec(`
      ALTER TABLE assets ADD COLUMN interest_rate REAL;
      ALTER TABLE assets ADD COLUMN min_payment_cents INTEGER;
    `);
  },
};
