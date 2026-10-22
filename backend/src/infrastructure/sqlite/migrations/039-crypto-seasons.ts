import { randomUUID } from 'crypto';
import { madridMonth } from '@domain/services/crypto-season';
import { Migration } from '../migrator';

/**
 * Crypto console, monthly seasons (docs/consola-crypto.md):
 * - From one play-money balance per user to several portfolios: the official one of each monthly
 *   season (`season`, YYYY-MM in Spain) and practice ones (`practice`, never ranked). Every
 *   existing balance becomes the official portfolio of the season under way, with its operations
 *   and pending orders; the commission is fixed (0,10 %) from now on.
 * - A position can be closed by the end of its season (`season`).
 * - The frozen result of each season (and its place in the top 5), the voluntary ranking
 *   settings (alias, off by default), badges, daily equity for the charts and price alerts.
 * Everything goes with the user (ON DELETE CASCADE) and in the personal data export.
 */
export function cryptoSeasonsMigration(now: () => Date = () => new Date()): Migration {
  return {
    version: 39,
    name: 'crypto seasons, practice portfolios and ranking',
    up(db): void {
      db.exec(`
        CREATE TABLE crypto_sim_portfolios (
          id            TEXT PRIMARY KEY,
          user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          kind          TEXT NOT NULL CHECK (kind IN ('season', 'practice')),
          season        TEXT CHECK (season GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
          initial_cents INTEGER NOT NULL CHECK (initial_cents > 0),
          cash_cents    INTEGER NOT NULL CHECK (cash_cents >= 0),
          fee_bps       INTEGER NOT NULL CHECK (fee_bps BETWEEN 0 AND 1000),
          started_at    TEXT NOT NULL,
          closed_at     TEXT,
          CHECK ((kind = 'season') = (season IS NOT NULL))
        );
        CREATE UNIQUE INDEX ux_crypto_sim_portfolios_season
          ON crypto_sim_portfolios(user_id, season) WHERE kind = 'season';
        CREATE INDEX idx_crypto_sim_portfolios_user ON crypto_sim_portfolios(user_id, kind);
        CREATE INDEX idx_crypto_sim_portfolios_open ON crypto_sim_portfolios(kind, closed_at, season);
      `);

      const month = madridMonth(now());
      const insert = db.prepare(
        `INSERT INTO crypto_sim_portfolios (id, user_id, kind, season, initial_cents, cash_cents,
           fee_bps, started_at) VALUES (?, ?, 'season', ?, ?, ?, 10, ?)`
      );
      const accounts = db
        .prepare(
          `SELECT user_id AS userId, initial_cents AS initialCents, cash_cents AS cashCents,
                  started_at AS startedAt FROM crypto_sim_accounts`
        )
        .all() as { userId: string; initialCents: number; cashCents: number; startedAt: string }[];
      for (const a of accounts) {
        insert.run(randomUUID(), a.userId, month, a.initialCents, a.cashCents, a.startedAt);
      }

      db.exec(`
        CREATE TABLE crypto_sim_positions_v3 (
          id              TEXT PRIMARY KEY,
          user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          portfolio_id    TEXT NOT NULL REFERENCES crypto_sim_portfolios(id) ON DELETE CASCADE,
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
          close_type      TEXT CHECK (close_type IN ('market', 'limit', 'stop', 'liquidation', 'season')),
          closed_at       TEXT
        );
        INSERT INTO crypto_sim_positions_v3 (id, user_id, portfolio_id, symbol, direction, quantity,
          entry_price, amount_cents, entry_fee_cents, open_type, opened_at, exit_price,
          exit_fee_cents, proceeds_cents, pnl_cents, close_type, closed_at)
        SELECT p.id, p.user_id, f.id, p.symbol, p.direction, p.quantity, p.entry_price,
          p.amount_cents, p.entry_fee_cents, p.open_type, p.opened_at, p.exit_price,
          p.exit_fee_cents, p.proceeds_cents, p.pnl_cents, p.close_type, p.closed_at
        FROM crypto_sim_positions p
        JOIN crypto_sim_portfolios f ON f.user_id = p.user_id AND f.kind = 'season';

        CREATE TABLE crypto_sim_orders_v3 (
          id             TEXT PRIMARY KEY,
          user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          portfolio_id   TEXT NOT NULL REFERENCES crypto_sim_portfolios(id) ON DELETE CASCADE,
          symbol         TEXT NOT NULL,
          side           TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
          direction      TEXT NOT NULL DEFAULT 'long' CHECK (direction IN ('long', 'short')),
          type           TEXT NOT NULL CHECK (type IN ('limit', 'stop')),
          price          REAL NOT NULL CHECK (price > 0),
          amount_cents   INTEGER,
          reserved_cents INTEGER NOT NULL DEFAULT 0 CHECK (reserved_cents >= 0),
          position_id    TEXT REFERENCES crypto_sim_positions_v3(id) ON DELETE CASCADE,
          created_at     TEXT NOT NULL,
          take_profit    REAL CHECK (take_profit > 0),
          stop_loss      REAL CHECK (stop_loss > 0),
          CHECK ((amount_cents IS NULL) = (position_id IS NOT NULL))
        );
        INSERT INTO crypto_sim_orders_v3 (id, user_id, portfolio_id, symbol, side, direction, type,
          price, amount_cents, reserved_cents, position_id, created_at, take_profit, stop_loss)
        SELECT o.id, o.user_id, f.id, o.symbol, o.side, o.direction, o.type, o.price,
          o.amount_cents, o.reserved_cents, o.position_id, o.created_at, o.take_profit, o.stop_loss
        FROM crypto_sim_orders o
        JOIN crypto_sim_portfolios f ON f.user_id = o.user_id AND f.kind = 'season';

        DROP TABLE crypto_sim_orders;
        DROP TABLE crypto_sim_positions;
        DROP TABLE crypto_sim_accounts;
        ALTER TABLE crypto_sim_positions_v3 RENAME TO crypto_sim_positions;
        ALTER TABLE crypto_sim_orders_v3 RENAME TO crypto_sim_orders;
        CREATE INDEX idx_crypto_sim_positions_portfolio ON crypto_sim_positions(portfolio_id, closed_at);
        CREATE INDEX idx_crypto_sim_positions_user ON crypto_sim_positions(user_id);
        CREATE INDEX idx_crypto_sim_orders_portfolio ON crypto_sim_orders(portfolio_id);
        CREATE INDEX idx_crypto_sim_orders_user ON crypto_sim_orders(user_id);
        CREATE INDEX idx_crypto_sim_orders_position ON crypto_sim_orders(position_id);

        -- Voluntary ranking: off by default; the alias is the only thing other people see.
        CREATE TABLE crypto_sim_profiles (
          user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          ranking_opt_in   INTEGER NOT NULL DEFAULT 0 CHECK (ranking_opt_in IN (0, 1)),
          alias            TEXT,
          practice_day     TEXT,
          practice_actions INTEGER NOT NULL DEFAULT 0 CHECK (practice_actions >= 0),
          updated_at       TEXT NOT NULL
        );

        -- The frozen result of each finished season; place 1-5 when it entered the top 5.
        CREATE TABLE crypto_sim_season_results (
          user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          season        TEXT NOT NULL,
          initial_cents INTEGER NOT NULL CHECK (initial_cents > 0),
          final_cents   INTEGER NOT NULL CHECK (final_cents >= 0),
          trades        INTEGER NOT NULL CHECK (trades >= 0),
          wins          INTEGER NOT NULL CHECK (wins >= 0),
          active_days   INTEGER NOT NULL CHECK (active_days >= 0),
          reached_at    TEXT,
          ranked        INTEGER NOT NULL DEFAULT 0 CHECK (ranked IN (0, 1)),
          alias         TEXT,
          premium       INTEGER NOT NULL DEFAULT 0 CHECK (premium IN (0, 1)),
          place         INTEGER CHECK (place BETWEEN 1 AND 5),
          prize_days    INTEGER NOT NULL DEFAULT 0 CHECK (prize_days >= 0),
          created_at    TEXT NOT NULL,
          PRIMARY KEY (user_id, season)
        );
        CREATE INDEX idx_crypto_sim_results_season ON crypto_sim_season_results(season, place);

        -- A season whose ranking was frozen (and whose prize was granted): once per month.
        CREATE TABLE crypto_sim_season_closes (
          season    TEXT PRIMARY KEY,
          closed_at TEXT NOT NULL
        );

        CREATE TABLE crypto_sim_badges (
          user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          badge     TEXT NOT NULL CHECK (badge IN ('firstTrade', 'firstTakeProfit', 'tenTrades', 'positiveMonth')),
          earned_at TEXT NOT NULL,
          PRIMARY KEY (user_id, badge)
        );

        -- Equity of each day of a season (the last value seen that day, Madrid).
        CREATE TABLE crypto_sim_equity_days (
          portfolio_id TEXT NOT NULL REFERENCES crypto_sim_portfolios(id) ON DELETE CASCADE,
          day          TEXT NOT NULL,
          equity_cents INTEGER NOT NULL CHECK (equity_cents >= 0),
          PRIMARY KEY (portfolio_id, day)
        );

        -- Price alerts asked for by the person (Premium), sent once as a service push.
        CREATE TABLE crypto_sim_alerts (
          id           TEXT PRIMARY KEY,
          user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          symbol       TEXT NOT NULL,
          condition    TEXT NOT NULL CHECK (condition IN ('above', 'below')),
          price        REAL NOT NULL CHECK (price > 0),
          created_at   TEXT NOT NULL,
          triggered_at TEXT
        );
        CREATE INDEX idx_crypto_sim_alerts_user ON crypto_sim_alerts(user_id);
        CREATE INDEX idx_crypto_sim_alerts_waiting ON crypto_sim_alerts(triggered_at);
      `);
    },
  };
}

export const cryptoSeasons: Migration = cryptoSeasonsMigration();
