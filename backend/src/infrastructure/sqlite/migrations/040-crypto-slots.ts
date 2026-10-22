import { Migration } from '../migrator';

/**
 * Crypto console: at most two operations of one coin at once in a portfolio, numbered #1 and #2
 * on the cards and on the chart (docs/consola-crypto.md). The number (`slot`) belongs to an open
 * position or to a pending order that opens one, and a pending order passes it to its position.
 * The operations under way get theirs in the order they started (a portfolio that already had
 * more than two of a coin keeps them all, as #3 and on); the closed ones stay without a number.
 */
export const cryptoSlots: Migration = {
  version: 40,
  name: 'crypto simulator numbered operations per coin',
  up(db) {
    db.exec(`
      ALTER TABLE crypto_sim_positions ADD COLUMN slot INTEGER CHECK (slot > 0);
      ALTER TABLE crypto_sim_orders ADD COLUMN slot INTEGER CHECK (slot > 0);
    `);
    const live = db
      .prepare(
        `SELECT 'position' AS kind, id, portfolio_id AS portfolioId, symbol, opened_at AS at
           FROM crypto_sim_positions WHERE closed_at IS NULL
         UNION ALL
         SELECT 'order', id, portfolio_id, symbol, created_at
           FROM crypto_sim_orders WHERE position_id IS NULL
         ORDER BY portfolioId, symbol, at, id`
      )
      .all() as {
      kind: 'position' | 'order';
      id: string;
      portfolioId: string;
      symbol: string;
      at: string;
    }[];
    const update = {
      position: db.prepare('UPDATE crypto_sim_positions SET slot = ? WHERE id = ?'),
      order: db.prepare('UPDATE crypto_sim_orders SET slot = ? WHERE id = ?'),
    };
    const next = new Map<string, number>();
    for (const row of live) {
      const key = `${row.portfolioId}:${row.symbol}`;
      const slot = (next.get(key) ?? 0) + 1;
      next.set(key, slot);
      update[row.kind].run(slot, row.id);
    }
  },
};
