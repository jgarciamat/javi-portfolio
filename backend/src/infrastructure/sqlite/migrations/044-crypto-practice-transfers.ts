import { Migration } from '../migrator';

/**
 * Crypto console, the result of a practice operation added to a real account
 * (docs/consola-crypto.md):
 * - Accounts get the type `crypto` (Criptomonedas). SQLite cannot change a CHECK in place, so the
 *   table is rebuilt with the same columns, rows, unique name per user and index. The migrator runs
 *   this with foreign keys off and checks them before committing; the tables pointing at
 *   `accounts(id)` keep pointing at the new one (same name, same ids).
 * - `crypto_sim_transfers`: which closed practice operation was already added to an account, and
 *   the movement it made there. One per operation (its primary key), so it is added only once. It
 *   goes with the operation («Start again», deleting the portfolio) and with the movement (deleting
 *   it in the account frees the operation to be added again, never twice at once).
 */
export const cryptoPracticeTransfers: Migration = {
  version: 44,
  name: 'crypto account type and practice results added to an account',
  up(db) {
    db.exec(`
      CREATE TABLE accounts_v44 (
        id                    TEXT PRIMARY KEY,
        user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name                  TEXT NOT NULL,
        type                  TEXT NOT NULL DEFAULT 'checking'
                              CHECK(type IN ('checking','savings','cash','card','investment','crypto','other')),
        initial_balance_cents INTEGER NOT NULL DEFAULT 0,
        color                 TEXT NOT NULL DEFAULT '#6366f1',
        icon                  TEXT NOT NULL DEFAULT '🏦',
        archived              INTEGER NOT NULL DEFAULT 0,
        created_at            TEXT NOT NULL,
        UNIQUE(user_id, name)
      );
      INSERT INTO accounts_v44 (id, user_id, name, type, initial_balance_cents, color, icon,
        archived, created_at)
      SELECT id, user_id, name, type, initial_balance_cents, color, icon, archived, created_at
        FROM accounts;
      DROP TABLE accounts;
      ALTER TABLE accounts_v44 RENAME TO accounts;
      CREATE INDEX idx_accounts_user ON accounts(user_id);

      CREATE TABLE crypto_sim_transfers (
        position_id    TEXT PRIMARY KEY REFERENCES crypto_sim_positions(id) ON DELETE CASCADE,
        user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id TEXT NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
        created_at     TEXT NOT NULL
      );
      CREATE INDEX idx_crypto_sim_transfers_user ON crypto_sim_transfers(user_id);
    `);
  },
};
