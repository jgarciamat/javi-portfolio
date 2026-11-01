import { Migration } from '../migrator';

/**
 * A movement or an automatic operation split between several accounts (e.g. 800 € = 500 € from
 * the current account + 300 € from the cash one):
 *
 * - The movement stays one row of `transactions` with its total, so categories, budgets, reports
 *   and counts see it once. Its `account_id` is the first part's account.
 * - `transaction_splits`: its parts, two or more (none for a movement in a single account, as
 *   every movement so far: nothing to fill in). Each account's balance counts only its part.
 *   They go with the movement; an account with parts cannot be removed (like with movements).
 * - `recurring_rule_splits`: the same for an automatic operation; the movements it generates
 *   carry the same parts. They go with the operation.
 */
export const accountSplits: Migration = {
  version: 47,
  name: 'movements and automatic operations split between accounts',
  up(db) {
    db.exec(`
      CREATE TABLE transaction_splits (
        transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        account_id     TEXT NOT NULL REFERENCES accounts(id),
        amount_cents   INTEGER NOT NULL CHECK (amount_cents > 0),
        position       INTEGER NOT NULL,
        PRIMARY KEY (transaction_id, account_id)
      );
      CREATE INDEX idx_transaction_splits_account ON transaction_splits(account_id);
      CREATE TABLE recurring_rule_splits (
        rule_id      TEXT NOT NULL REFERENCES recurring_rules(id) ON DELETE CASCADE,
        account_id   TEXT NOT NULL REFERENCES accounts(id),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        position     INTEGER NOT NULL,
        PRIMARY KEY (rule_id, account_id)
      );
      CREATE INDEX idx_recurring_rule_splits_account ON recurring_rule_splits(account_id);
    `);
  },
};
