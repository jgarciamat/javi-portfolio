import {
  CreatorAffiliateRecord,
  CreatorPlan,
  CreatorRepository,
  CreatorSaleProvider,
  CreatorSaleRecord,
} from '@domain/ports/repositories';
import { Db } from '../database';

interface AffiliateRow {
  code: string;
  name: string;
  cap_cents: number | null;
  active: number;
  created_at: string;
}

interface SaleRow {
  id: number;
  code: string;
  plan: CreatorPlan;
  provider: CreatorSaleProvider;
  commission_cents: number;
  sold_at: string;
  reversed_at: string | null;
  paid_at: string | null;
  paid_cents: number | null;
  clawed_at: string | null;
}

const toAffiliate = (r: AffiliateRow): CreatorAffiliateRecord => ({
  code: r.code,
  name: r.name,
  capCents: r.cap_cents,
  active: r.active === 1,
  createdAt: r.created_at,
});

const toSale = (r: SaleRow): CreatorSaleRecord => ({
  id: r.id,
  code: r.code,
  plan: r.plan,
  provider: r.provider,
  commissionCents: r.commission_cents,
  soldAt: r.sold_at,
  reversedAt: r.reversed_at,
  paidAt: r.paid_at,
  paidCents: r.paid_cents,
  clawedAt: r.clawed_at,
});

const SALE_COLUMNS = `id, code, plan, provider, commission_cents, sold_at, reversed_at, paid_at,
  paid_cents, clawed_at`;

export class SqliteCreatorRepository implements CreatorRepository {
  constructor(private readonly db: Db) {}

  affiliate(code: string): CreatorAffiliateRecord | null {
    const row = this.db.prepare('SELECT * FROM creator_affiliates WHERE code = ?').get(code) as
      AffiliateRow | undefined;
    return row ? toAffiliate(row) : null;
  }

  affiliates(): CreatorAffiliateRecord[] {
    return (
      this.db.prepare('SELECT * FROM creator_affiliates ORDER BY code').all() as AffiliateRow[]
    ).map(toAffiliate);
  }

  addAffiliate(record: CreatorAffiliateRecord): boolean {
    return (
      this.db
        .prepare(
          `INSERT OR IGNORE INTO creator_affiliates (code, name, cap_cents, active, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(record.code, record.name, record.capCents, record.active ? 1 : 0, record.createdAt)
        .changes > 0
    );
  }

  setActive(code: string, active: boolean): boolean {
    return (
      this.db
        .prepare('UPDATE creator_affiliates SET active = ? WHERE code = ?')
        .run(active ? 1 : 0, code).changes > 0
    );
  }

  attribute(userId: string, code: string, at: string): boolean {
    return (
      this.db
        .prepare(
          'INSERT OR IGNORE INTO creator_attributions (user_id, code, created_at) VALUES (?, ?, ?)'
        )
        .run(userId, code, at).changes > 0
    );
  }

  attributionOf(userId: string): { code: string; createdAt: string } | null {
    const row = this.db
      .prepare('SELECT code, created_at FROM creator_attributions WHERE user_id = ?')
      .get(userId) as { code: string; created_at: string } | undefined;
    return row ? { code: row.code, createdAt: row.created_at } : null;
  }

  signupsByCode(): Record<string, number> {
    const rows = this.db
      .prepare('SELECT code, COUNT(*) AS n FROM creator_attributions GROUP BY code')
      .all() as { code: string; n: number }[];
    return Object.fromEntries(rows.map((r) => [r.code, r.n]));
  }

  addSale(userId: string, sale: Omit<CreatorSaleRecord, 'id'>): boolean {
    return (
      this.db
        .prepare(
          `INSERT OR IGNORE INTO creator_sales (user_id, code, plan, provider, commission_cents,
             sold_at, reversed_at, paid_at, paid_cents, clawed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          sale.code,
          sale.plan,
          sale.provider,
          sale.commissionCents,
          sale.soldAt,
          sale.reversedAt,
          sale.paidAt,
          sale.paidCents,
          sale.clawedAt
        ).changes > 0
    );
  }

  saleOf(userId: string): CreatorSaleRecord | null {
    const row = this.db
      .prepare(`SELECT ${SALE_COLUMNS} FROM creator_sales WHERE user_id = ?`)
      .get(userId) as SaleRow | undefined;
    return row ? toSale(row) : null;
  }

  markReversed(id: number, at: string): void {
    this.db.prepare('UPDATE creator_sales SET reversed_at = ? WHERE id = ?').run(at, id);
  }

  sales(): CreatorSaleRecord[] {
    return (
      this.db
        .prepare(`SELECT ${SALE_COLUMNS} FROM creator_sales ORDER BY sold_at, id`)
        .all() as SaleRow[]
    ).map(toSale);
  }

  markPaid(paid: { id: number; cents: number }[], clawed: number[], at: string): void {
    const pay = this.db.prepare(
      'UPDATE creator_sales SET paid_at = ?, paid_cents = ? WHERE id = ? AND paid_at IS NULL'
    );
    const claw = this.db.prepare(
      'UPDATE creator_sales SET clawed_at = ? WHERE id = ? AND clawed_at IS NULL'
    );
    this.db.transaction(() => {
      for (const p of paid) pay.run(at, p.cents, p.id);
      for (const id of clawed) claw.run(at, id);
    })();
  }

  forget(userId: string): void {
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM creator_attributions WHERE user_id = ?').run(userId);
      this.db.prepare('UPDATE creator_sales SET user_id = NULL WHERE user_id = ?').run(userId);
    })();
  }
}
