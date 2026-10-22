import {
  CryptoPriceAlert,
  CryptoSeasonResult,
  CryptoSimOrder,
  CryptoSimPortfolio,
  CryptoSimPosition,
  CryptoSimProfile,
  CryptoSimRepository,
} from '@domain/ports/repositories';
import { Db } from '../database';

const PORTFOLIO = `id, user_id AS userId, kind, season, initial_cents AS initialCents,
  cash_cents AS cashCents, fee_bps AS feeBps, started_at AS startedAt, closed_at AS closedAt`;

const POSITION = `id, user_id AS userId, portfolio_id AS portfolioId, symbol, direction, quantity,
  entry_price AS entryPrice, amount_cents AS amountCents, entry_fee_cents AS entryFeeCents,
  open_type AS openType, opened_at AS openedAt, exit_price AS exitPrice,
  exit_fee_cents AS exitFeeCents, proceeds_cents AS proceedsCents, pnl_cents AS pnlCents,
  close_type AS closeType, closed_at AS closedAt, slot`;

const ORDER = `id, user_id AS userId, portfolio_id AS portfolioId, symbol, side, direction, type,
  price, amount_cents AS amountCents, reserved_cents AS reservedCents, position_id AS positionId,
  created_at AS createdAt, take_profit AS takeProfit, stop_loss AS stopLoss, slot`;

const RESULT = `user_id AS userId, season, initial_cents AS initialCents, final_cents AS finalCents,
  trades, wins, active_days AS activeDays, reached_at AS reachedAt, ranked, alias, premium, place,
  prize_days AS prizeDays, created_at AS createdAt`;

const ALERT = `id, user_id AS userId, symbol, condition, price, created_at AS createdAt,
  triggered_at AS triggeredAt`;

type ResultRow = Omit<CryptoSeasonResult, 'ranked' | 'premium'> & {
  ranked: number;
  premium: number;
};
const toResult = (r: ResultRow): CryptoSeasonResult => ({
  ...r,
  ranked: r.ranked === 1,
  premium: r.premium === 1,
});

export class SqliteCryptoSimRepository implements CryptoSimRepository {
  constructor(private readonly db: Db) {}

  // ─── Portfolios ──────────────────────────────────────────────────────────

  portfolio(userId: string, id: string): CryptoSimPortfolio | null {
    return (
      (this.db
        .prepare(`SELECT ${PORTFOLIO} FROM crypto_sim_portfolios WHERE user_id = ? AND id = ?`)
        .get(userId, id) as CryptoSimPortfolio | undefined) ?? null
    );
  }

  portfolios(userId: string): CryptoSimPortfolio[] {
    return this.db
      .prepare(
        `SELECT ${PORTFOLIO} FROM crypto_sim_portfolios WHERE user_id = ? AND closed_at IS NULL
         ORDER BY kind = 'practice', started_at, rowid`
      )
      .all(userId) as CryptoSimPortfolio[];
  }

  seasonPortfolio(userId: string, season: string): CryptoSimPortfolio | null {
    return (
      (this.db
        .prepare(
          `SELECT ${PORTFOLIO} FROM crypto_sim_portfolios
           WHERE user_id = ? AND kind = 'season' AND season = ?`
        )
        .get(userId, season) as CryptoSimPortfolio | undefined) ?? null
    );
  }

  insertPortfolio(p: CryptoSimPortfolio): void {
    this.db
      .prepare(
        `INSERT INTO crypto_sim_portfolios (id, user_id, kind, season, initial_cents, cash_cents,
           fee_bps, started_at, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        p.id,
        p.userId,
        p.kind,
        p.season,
        p.initialCents,
        p.cashCents,
        p.feeBps,
        p.startedAt,
        p.closedAt
      );
  }

  savePortfolio(p: CryptoSimPortfolio): void {
    this.db
      .prepare(
        `UPDATE crypto_sim_portfolios SET initial_cents = ?, cash_cents = ?, fee_bps = ?,
           started_at = ?, closed_at = ? WHERE user_id = ? AND id = ?`
      )
      .run(p.initialCents, p.cashCents, p.feeBps, p.startedAt, p.closedAt, p.userId, p.id);
  }

  deletePortfolio(userId: string, id: string): boolean {
    return (
      this.db
        .prepare(
          `DELETE FROM crypto_sim_portfolios WHERE user_id = ? AND id = ? AND kind = 'practice'`
        )
        .run(userId, id).changes > 0
    );
  }

  seasonPortfoliosBefore(season: string): CryptoSimPortfolio[] {
    return this.db
      .prepare(
        `SELECT ${PORTFOLIO} FROM crypto_sim_portfolios
         WHERE kind = 'season' AND closed_at IS NULL AND season < ? ORDER BY season, rowid`
      )
      .all(season) as CryptoSimPortfolio[];
  }

  seasonPortfoliosOf(season: string): CryptoSimPortfolio[] {
    return this.db
      .prepare(
        `SELECT ${PORTFOLIO} FROM crypto_sim_portfolios
         WHERE kind = 'season' AND closed_at IS NULL AND season = ? ORDER BY rowid`
      )
      .all(season) as CryptoSimPortfolio[];
  }

  purgeSeasonsBefore(season: string): number {
    return this.db
      .prepare(
        `DELETE FROM crypto_sim_portfolios
         WHERE kind = 'season' AND closed_at IS NOT NULL AND season < ?`
      )
      .run(season).changes;
  }

  // ─── Operations ──────────────────────────────────────────────────────────

  positions(portfolioId: string): CryptoSimPosition[] {
    return this.db
      .prepare(
        `SELECT ${POSITION} FROM crypto_sim_positions WHERE portfolio_id = ?
         ORDER BY COALESCE(closed_at, opened_at) DESC, rowid DESC`
      )
      .all(portfolioId) as CryptoSimPosition[];
  }

  position(userId: string, id: string): CryptoSimPosition | null {
    return (
      (this.db
        .prepare(`SELECT ${POSITION} FROM crypto_sim_positions WHERE user_id = ? AND id = ?`)
        .get(userId, id) as CryptoSimPosition | undefined) ?? null
    );
  }

  countPositions(portfolioId: string): { open: number; total: number } {
    return this.db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(closed_at IS NULL), 0) AS open
         FROM crypto_sim_positions WHERE portfolio_id = ?`
      )
      .get(portfolioId) as { open: number; total: number };
  }

  insertPosition(p: CryptoSimPosition): void {
    this.db
      .prepare(
        `INSERT INTO crypto_sim_positions (id, user_id, portfolio_id, symbol, direction, quantity,
           entry_price, amount_cents, entry_fee_cents, open_type, opened_at, slot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        p.id,
        p.userId,
        p.portfolioId,
        p.symbol,
        p.direction,
        p.quantity,
        p.entryPrice,
        p.amountCents,
        p.entryFeeCents,
        p.openType,
        p.openedAt,
        p.slot
      );
  }

  closePosition(
    userId: string,
    id: string,
    c: Pick<
      CryptoSimPosition,
      'exitPrice' | 'exitFeeCents' | 'proceedsCents' | 'pnlCents' | 'closeType' | 'closedAt'
    >
  ): boolean {
    return (
      this.db
        .prepare(
          `UPDATE crypto_sim_positions SET exit_price = ?, exit_fee_cents = ?, proceeds_cents = ?,
             pnl_cents = ?, close_type = ?, closed_at = ?
           WHERE user_id = ? AND id = ? AND closed_at IS NULL`
        )
        .run(
          c.exitPrice,
          c.exitFeeCents,
          c.proceedsCents,
          c.pnlCents,
          c.closeType,
          c.closedAt,
          userId,
          id
        ).changes > 0
    );
  }

  orders(portfolioId: string): CryptoSimOrder[] {
    return this.db
      .prepare(
        `SELECT ${ORDER} FROM crypto_sim_orders WHERE portfolio_id = ?
         ORDER BY created_at DESC, rowid DESC`
      )
      .all(portfolioId) as CryptoSimOrder[];
  }

  order(userId: string, id: string): CryptoSimOrder | null {
    return (
      (this.db
        .prepare(`SELECT ${ORDER} FROM crypto_sim_orders WHERE user_id = ? AND id = ?`)
        .get(userId, id) as CryptoSimOrder | undefined) ?? null
    );
  }

  insertOrder(o: CryptoSimOrder): void {
    this.db
      .prepare(
        `INSERT INTO crypto_sim_orders (id, user_id, portfolio_id, symbol, side, direction, type,
           price, amount_cents, reserved_cents, position_id, created_at, take_profit, stop_loss,
           slot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        o.id,
        o.userId,
        o.portfolioId,
        o.symbol,
        o.side,
        o.direction,
        o.type,
        o.price,
        o.amountCents,
        o.reservedCents,
        o.positionId,
        o.createdAt,
        o.takeProfit,
        o.stopLoss,
        o.slot
      );
  }

  deleteOrder(userId: string, id: string): boolean {
    return (
      this.db.prepare('DELETE FROM crypto_sim_orders WHERE user_id = ? AND id = ?').run(userId, id)
        .changes > 0
    );
  }

  deleteOrdersOfPosition(userId: string, positionId: string): number {
    return this.db
      .prepare('DELETE FROM crypto_sim_orders WHERE user_id = ? AND position_id = ?')
      .run(userId, positionId).changes;
  }

  clear(portfolioId: string): void {
    this.db.prepare('DELETE FROM crypto_sim_orders WHERE portfolio_id = ?').run(portfolioId);
    this.db.prepare('DELETE FROM crypto_sim_positions WHERE portfolio_id = ?').run(portfolioId);
    this.db.prepare('DELETE FROM crypto_sim_equity_days WHERE portfolio_id = ?').run(portfolioId);
  }

  // ─── Ranking, seasons and badges ─────────────────────────────────────────

  profile(userId: string): CryptoSimProfile | null {
    return (
      (this.db
        .prepare(
          `SELECT user_id AS userId, alias, practice_day AS practiceDay,
                practice_actions AS practiceActions, updated_at AS updatedAt
         FROM crypto_sim_profiles WHERE user_id = ?`
        )
        .get(userId) as CryptoSimProfile | undefined) ?? null
    );
  }

  /** `ranking_opt_in` stays in the table for older servers; nobody reads it since everybody is in. */
  saveProfile(p: CryptoSimProfile): void {
    this.db
      .prepare(
        `INSERT INTO crypto_sim_profiles (user_id, alias, practice_day, practice_actions,
           updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET alias = excluded.alias,
           practice_day = excluded.practice_day, practice_actions = excluded.practice_actions,
           updated_at = excluded.updated_at`
      )
      .run(p.userId, p.alias, p.practiceDay, p.practiceActions, p.updatedAt);
  }

  rankingCandidates(
    season: string
  ): { portfolio: CryptoSimPortfolio; alias: string | null; name: string }[] {
    const rows = this.db
      .prepare(
        `SELECT p.id, p.user_id AS userId, p.kind, p.season, p.initial_cents AS initialCents,
                p.cash_cents AS cashCents, p.fee_bps AS feeBps, p.started_at AS startedAt,
                p.closed_at AS closedAt, r.alias AS alias, u.name AS name
         FROM crypto_sim_portfolios p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN crypto_sim_profiles r ON r.user_id = p.user_id
         WHERE p.kind = 'season' AND p.season = ?`
      )
      .all(season) as (CryptoSimPortfolio & { alias: string | null; name: string })[];
    return rows.map(({ alias, name, ...portfolio }) => ({ portfolio, alias, name }));
  }

  rankingIdentity(userId: string): { alias: string | null; name: string } {
    const row = this.db
      .prepare(
        `SELECT r.alias AS alias, u.name AS name FROM users u
         LEFT JOIN crypto_sim_profiles r ON r.user_id = u.id WHERE u.id = ?`
      )
      .get(userId) as { alias: string | null; name: string } | undefined;
    return { alias: row?.alias ?? null, name: row?.name ?? '' };
  }

  insertResult(r: CryptoSeasonResult): boolean {
    return (
      this.db
        .prepare(
          `INSERT OR IGNORE INTO crypto_sim_season_results (user_id, season, initial_cents,
             final_cents, trades, wins, active_days, reached_at, ranked, alias, premium, place,
             prize_days, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          r.userId,
          r.season,
          r.initialCents,
          r.finalCents,
          r.trades,
          r.wins,
          r.activeDays,
          r.reachedAt,
          r.ranked ? 1 : 0,
          r.alias,
          r.premium ? 1 : 0,
          r.place,
          r.prizeDays,
          r.createdAt
        ).changes > 0
    );
  }

  results(userId: string, limit: number): CryptoSeasonResult[] {
    return (
      this.db
        .prepare(
          `SELECT ${RESULT} FROM crypto_sim_season_results WHERE user_id = ?
           ORDER BY season DESC LIMIT ?`
        )
        .all(userId, limit) as ResultRow[]
    ).map(toResult);
  }

  seasonResults(season: string): CryptoSeasonResult[] {
    return (
      this.db
        .prepare(`SELECT ${RESULT} FROM crypto_sim_season_results WHERE season = ?`)
        .all(season) as ResultRow[]
    ).map(toResult);
  }

  setPlace(userId: string, season: string, place: number, prizeDays: number): void {
    this.db
      .prepare(
        `UPDATE crypto_sim_season_results SET place = ?, prize_days = ?
         WHERE user_id = ? AND season = ?`
      )
      .run(place, prizeDays, userId, season);
  }

  seasonsToClose(before: string): string[] {
    return (
      this.db
        .prepare(
          `SELECT DISTINCT r.season FROM crypto_sim_season_results r
           WHERE r.season < ?
             AND NOT EXISTS (SELECT 1 FROM crypto_sim_season_closes c WHERE c.season = r.season)
             AND NOT EXISTS (SELECT 1 FROM crypto_sim_portfolios p
                             WHERE p.kind = 'season' AND p.season = r.season AND p.closed_at IS NULL)
           ORDER BY r.season`
        )
        .all(before) as { season: string }[]
    ).map((r) => r.season);
  }

  claimSeasonClose(season: string, at: string): boolean {
    return (
      this.db
        .prepare('INSERT OR IGNORE INTO crypto_sim_season_closes (season, closed_at) VALUES (?, ?)')
        .run(season, at).changes > 0
    );
  }

  badges(userId: string): { badge: string; earnedAt: string }[] {
    return this.db
      .prepare(
        `SELECT badge, earned_at AS earnedAt FROM crypto_sim_badges WHERE user_id = ?
         ORDER BY earned_at, badge`
      )
      .all(userId) as { badge: string; earnedAt: string }[];
  }

  addBadge(userId: string, badge: string, at: string): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO crypto_sim_badges (user_id, badge, earned_at) VALUES (?, ?, ?)'
      )
      .run(userId, badge, at);
  }

  badgeFacts(userId: string): { opened: number; closed: number; takeProfit: number } {
    return this.db
      .prepare(
        `SELECT COUNT(*) AS opened,
                COALESCE(SUM(closed_at IS NOT NULL AND close_type <> 'season'), 0) AS closed,
                COALESCE(SUM(close_type = 'limit'), 0) AS takeProfit
         FROM crypto_sim_positions WHERE user_id = ?`
      )
      .get(userId) as { opened: number; closed: number; takeProfit: number };
  }

  saveEquityDay(portfolioId: string, day: string, equityCents: number): void {
    this.db
      .prepare(
        `INSERT INTO crypto_sim_equity_days (portfolio_id, day, equity_cents) VALUES (?, ?, ?)
         ON CONFLICT(portfolio_id, day) DO UPDATE SET equity_cents = excluded.equity_cents`
      )
      .run(portfolioId, day, equityCents);
  }

  equityDays(portfolioId: string): { day: string; equityCents: number }[] {
    return this.db
      .prepare(
        `SELECT day, equity_cents AS equityCents FROM crypto_sim_equity_days
         WHERE portfolio_id = ? ORDER BY day`
      )
      .all(portfolioId) as { day: string; equityCents: number }[];
  }

  // ─── Price alerts ────────────────────────────────────────────────────────

  alerts(userId: string): CryptoPriceAlert[] {
    return this.db
      .prepare(
        `SELECT ${ALERT} FROM crypto_sim_alerts WHERE user_id = ?
         ORDER BY triggered_at IS NOT NULL, created_at DESC, rowid DESC`
      )
      .all(userId) as CryptoPriceAlert[];
  }

  insertAlert(a: CryptoPriceAlert): void {
    this.db
      .prepare(
        `INSERT INTO crypto_sim_alerts (id, user_id, symbol, condition, price, created_at, triggered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(a.id, a.userId, a.symbol, a.condition, a.price, a.createdAt, a.triggeredAt);
  }

  deleteAlert(userId: string, id: string): boolean {
    return (
      this.db.prepare('DELETE FROM crypto_sim_alerts WHERE user_id = ? AND id = ?').run(userId, id)
        .changes > 0
    );
  }

  waitingAlerts(): CryptoPriceAlert[] {
    return this.db
      .prepare(`SELECT ${ALERT} FROM crypto_sim_alerts WHERE triggered_at IS NULL ORDER BY rowid`)
      .all() as CryptoPriceAlert[];
  }

  triggerAlert(id: string, at: string): boolean {
    return (
      this.db
        .prepare(
          'UPDATE crypto_sim_alerts SET triggered_at = ? WHERE id = ? AND triggered_at IS NULL'
        )
        .run(at, id).changes > 0
    );
  }

  purgeAlerts(triggeredBefore: string): number {
    return this.db
      .prepare('DELETE FROM crypto_sim_alerts WHERE triggered_at IS NOT NULL AND triggered_at < ?')
      .run(triggeredBefore).changes;
  }
}
