import { Migration } from '../migrator';

/**
 * Crypto console, second round:
 * - Short positions (1x, play money): every purchase has a direction, and a short closed because
 *   its guarantee ran out says so (`liquidation`).
 * - A pending order keeps its direction and, when it opens a position, the take profit and stop
 *   loss it will leave once filled.
 * The two simulator tables are rebuilt (their CHECK rules change); foreign keys are off here.
 */
export const cryptoShorts: Migration = {
  version: 38,
  name: 'crypto simulator shorts and exits',
  up(db) {
    db.exec(`
      CREATE TABLE crypto_sim_positions_v2 (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol          TEXT NOT NULL,
        direction       TEXT NOT NULL DEFAULT 'long' CHECK (direction IN ('long', 'short')),
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
        close_type      TEXT CHECK (close_type IN ('market', 'limit', 'stop', 'liquidation')),
        closed_at       TEXT
      );
      INSERT INTO crypto_sim_positions_v2 (id, user_id, symbol, quantity, entry_price, amount_cents,
        entry_fee_cents, open_type, opened_at, exit_price, exit_fee_cents, proceeds_cents,
        pnl_cents, close_type, closed_at)
      SELECT id, user_id, symbol, quantity, entry_price, amount_cents, entry_fee_cents, open_type,
        opened_at, exit_price, exit_fee_cents, proceeds_cents, pnl_cents, close_type, closed_at
      FROM crypto_sim_positions;

      CREATE TABLE crypto_sim_orders_v2 (
        id             TEXT PRIMARY KEY,
        user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol         TEXT NOT NULL,
        side           TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
        direction      TEXT NOT NULL DEFAULT 'long' CHECK (direction IN ('long', 'short')),
        type           TEXT NOT NULL CHECK (type IN ('limit', 'stop')),
        price          REAL NOT NULL CHECK (price > 0),
        amount_cents   INTEGER,
        reserved_cents INTEGER NOT NULL DEFAULT 0 CHECK (reserved_cents >= 0),
        position_id    TEXT REFERENCES crypto_sim_positions_v2(id) ON DELETE CASCADE,
        created_at     TEXT NOT NULL,
        take_profit    REAL CHECK (take_profit > 0),
        stop_loss      REAL CHECK (stop_loss > 0),
        CHECK ((amount_cents IS NULL) = (position_id IS NOT NULL))
      );
      INSERT INTO crypto_sim_orders_v2 (id, user_id, symbol, side, type, price, amount_cents,
        reserved_cents, position_id, created_at)
      SELECT id, user_id, symbol, side, type, price, amount_cents, reserved_cents, position_id,
        created_at
      FROM crypto_sim_orders;

      DROP TABLE crypto_sim_orders;
      DROP TABLE crypto_sim_positions;
      ALTER TABLE crypto_sim_positions_v2 RENAME TO crypto_sim_positions;
      ALTER TABLE crypto_sim_orders_v2 RENAME TO crypto_sim_orders;
      CREATE INDEX idx_crypto_sim_positions_user ON crypto_sim_positions(user_id, closed_at);
      CREATE INDEX idx_crypto_sim_orders_user ON crypto_sim_orders(user_id);
      CREATE INDEX idx_crypto_sim_orders_position ON crypto_sim_orders(position_id);
    `);
  },
};
