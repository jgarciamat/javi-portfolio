import {
  CryptoSimAccount,
  CryptoSimOrder,
  CryptoSimPosition,
  CryptoSimRepository,
} from '@domain/ports/repositories';
import { Db } from '../database';

const POSITION = `id, user_id AS userId, symbol, quantity, entry_price AS entryPrice,
  amount_cents AS amountCents, entry_fee_cents AS entryFeeCents, open_type AS openType,
  opened_at AS openedAt, exit_price AS exitPrice, exit_fee_cents AS exitFeeCents,
  proceeds_cents AS proceedsCents, pnl_cents AS pnlCents, close_type AS closeType,
  closed_at AS closedAt`;

const ORDER = `id, user_id AS userId, symbol, side, type, price, amount_cents AS amountCents,
  reserved_cents AS reservedCents, position_id AS positionId, created_at AS createdAt`;

export class SqliteCryptoSimRepository implements CryptoSimRepository {
  constructor(private readonly db: Db) {}

  account(userId: string): CryptoSimAccount | null {
    return (
      (this.db
        .prepare(
          `SELECT user_id AS userId, initial_cents AS initialCents, cash_cents AS cashCents,
                  fee_bps AS feeBps, started_at AS startedAt
           FROM crypto_sim_accounts WHERE user_id = ?`
        )
        .get(userId) as CryptoSimAccount | undefined) ?? null
    );
  }

  saveAccount(a: CryptoSimAccount): void {
    this.db
      .prepare(
        `INSERT INTO crypto_sim_accounts (user_id, initial_cents, cash_cents, fee_bps, started_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET initial_cents = excluded.initial_cents,
           cash_cents = excluded.cash_cents, fee_bps = excluded.fee_bps,
           started_at = excluded.started_at`
      )
      .run(a.userId, a.initialCents, a.cashCents, a.feeBps, a.startedAt);
  }

  positions(userId: string): CryptoSimPosition[] {
    return this.db
      .prepare(
        `SELECT ${POSITION} FROM crypto_sim_positions WHERE user_id = ?
         ORDER BY COALESCE(closed_at, opened_at) DESC, rowid DESC`
      )
      .all(userId) as CryptoSimPosition[];
  }

  position(userId: string, id: string): CryptoSimPosition | null {
    return (
      (this.db
        .prepare(`SELECT ${POSITION} FROM crypto_sim_positions WHERE user_id = ? AND id = ?`)
        .get(userId, id) as CryptoSimPosition | undefined) ?? null
    );
  }

  countPositions(userId: string): { open: number; total: number } {
    return this.db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(closed_at IS NULL), 0) AS open
         FROM crypto_sim_positions WHERE user_id = ?`
      )
      .get(userId) as { open: number; total: number };
  }

  insertPosition(p: CryptoSimPosition): void {
    this.db
      .prepare(
        `INSERT INTO crypto_sim_positions (id, user_id, symbol, quantity, entry_price, amount_cents,
           entry_fee_cents, open_type, opened_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        p.id,
        p.userId,
        p.symbol,
        p.quantity,
        p.entryPrice,
        p.amountCents,
        p.entryFeeCents,
        p.openType,
        p.openedAt
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

  orders(userId: string): CryptoSimOrder[] {
    return this.db
      .prepare(
        `SELECT ${ORDER} FROM crypto_sim_orders WHERE user_id = ? ORDER BY created_at DESC, rowid DESC`
      )
      .all(userId) as CryptoSimOrder[];
  }

  insertOrder(o: CryptoSimOrder): void {
    this.db
      .prepare(
        `INSERT INTO crypto_sim_orders (id, user_id, symbol, side, type, price, amount_cents,
           reserved_cents, position_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        o.id,
        o.userId,
        o.symbol,
        o.side,
        o.type,
        o.price,
        o.amountCents,
        o.reservedCents,
        o.positionId,
        o.createdAt
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

  clear(userId: string): void {
    this.db.prepare('DELETE FROM crypto_sim_orders WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM crypto_sim_positions WHERE user_id = ?').run(userId);
  }
}
