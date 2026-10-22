import { Migration } from '../migrator';

/**
 * «Consola crypto» (docs/consola-crypto.md): a simulator with play money to learn how buying
 * and selling crypto works. Per user: the virtual balance and its commission, every purchase
 * (open, or closed with its result) and the orders waiting for a price. No real money, no
 * exchange account: everything goes with the user (ON DELETE CASCADE) and «Start again».
 */
export const cryptoSimulator: Migration = {
  version: 37,
  name: 'crypto simulator',
  up(db) {
    db.exec(`
      CREATE TABLE crypto_sim_accounts (
        user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        initial_cents INTEGER NOT NULL CHECK (initial_cents > 0),
        cash_cents    INTEGER NOT NULL CHECK (cash_cents >= 0),
        fee_bps       INTEGER NOT NULL CHECK (fee_bps BETWEEN 0 AND 1000),
        started_at    TEXT NOT NULL
      );

      CREATE TABLE crypto_sim_positions (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol          TEXT NOT NULL,
        quantity        REAL NOT NULL CHECK (quantity > 0),
        entry_price     REAL NOT NULL CHECK (entry_price > 0),
        amount_cents    INTEGER NOT NULL CHECK (amount_cents > 0),
        entry_fee_cents INTEGER NOT NULL CHECK (entry_fee_cents >= 0),
        open_type       TEXT NOT NULL CHECK (open_type IN ('market', 'limit', 'stop')),
        opened_at       TEXT NOT NULL,
        exit_price      REAL,
        exit_fee_cents  INTEGER,
        proceeds_cents  INTEGER,
        pnl_cents       INTEGER,
        close_type      TEXT CHECK (close_type IN ('market', 'limit', 'stop')),
        closed_at       TEXT
      );
      CREATE INDEX idx_crypto_sim_positions_user ON crypto_sim_positions(user_id, closed_at);

      CREATE TABLE crypto_sim_orders (
        id             TEXT PRIMARY KEY,
        user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol         TEXT NOT NULL,
        side           TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
        type           TEXT NOT NULL CHECK (type IN ('limit', 'stop')),
        price          REAL NOT NULL CHECK (price > 0),
        amount_cents   INTEGER,
        reserved_cents INTEGER NOT NULL DEFAULT 0 CHECK (reserved_cents >= 0),
        position_id    TEXT REFERENCES crypto_sim_positions(id) ON DELETE CASCADE,
        created_at     TEXT NOT NULL,
        CHECK ((side = 'buy') = (amount_cents IS NOT NULL AND position_id IS NULL))
      );
      CREATE INDEX idx_crypto_sim_orders_user ON crypto_sim_orders(user_id);
      CREATE INDEX idx_crypto_sim_orders_position ON crypto_sim_orders(position_id);
    `);
  },
};
