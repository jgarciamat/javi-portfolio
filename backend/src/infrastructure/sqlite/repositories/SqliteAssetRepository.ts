import { Asset, AssetKind, AssetRepository, AssetValue } from '@domain/ports/repositories';
import { DebtType } from '@domain/services/debt';
import { Db } from '../database';

interface AssetRow {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  interest_rate: number | null;
  min_payment_cents: number | null;
  debt_type: string | null;
  initial_cents: number | null;
  payment_rule_id: string | null;
  payment_end_year: number | null;
  payment_end_month: number | null;
  created_at: string;
}

const toAsset = (r: AssetRow): Asset => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  kind: r.kind as AssetKind,
  interestRate: r.interest_rate,
  minPaymentCents: r.min_payment_cents,
  debtType: r.debt_type as DebtType | null,
  initialCents: r.initial_cents,
  paymentRuleId: r.payment_rule_id,
  paymentEnd:
    r.payment_end_year !== null && r.payment_end_month !== null
      ? { year: r.payment_end_year, month: r.payment_end_month }
      : null,
  createdAt: r.created_at,
});

export class SqliteAssetRepository implements AssetRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): Asset[] {
    const rows = this.db
      .prepare('SELECT * FROM assets WHERE user_id = ? ORDER BY created_at, name')
      .all(userId) as AssetRow[];
    return rows.map(toAsset);
  }

  findById(userId: string, id: string): Asset | null {
    const row = this.db
      .prepare('SELECT * FROM assets WHERE user_id = ? AND id = ?')
      .get(userId, id) as AssetRow | undefined;
    return row ? toAsset(row) : null;
  }

  findByPaymentRule(userId: string, ruleId: string): Asset | null {
    const row = this.db
      .prepare('SELECT * FROM assets WHERE user_id = ? AND payment_rule_id = ?')
      .get(userId, ruleId) as AssetRow | undefined;
    return row ? toAsset(row) : null;
  }

  save(asset: Asset): void {
    const { paymentEnd, ...rest } = asset;
    this.db
      .prepare(
        `INSERT INTO assets (id, user_id, name, kind, interest_rate, min_payment_cents, debt_type,
           initial_cents, payment_rule_id, payment_end_year, payment_end_month, created_at)
         VALUES (@id, @userId, @name, @kind, @interestRate, @minPaymentCents, @debtType,
           @initialCents, @paymentRuleId, @paymentEndYear, @paymentEndMonth, @createdAt)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind,
           interest_rate = excluded.interest_rate, min_payment_cents = excluded.min_payment_cents,
           debt_type = excluded.debt_type, initial_cents = excluded.initial_cents,
           payment_rule_id = excluded.payment_rule_id,
           payment_end_year = excluded.payment_end_year,
           payment_end_month = excluded.payment_end_month`
      )
      .run({
        ...rest,
        paymentEndYear: paymentEnd?.year ?? null,
        paymentEndMonth: paymentEnd?.month ?? null,
      });
  }

  delete(userId: string, id: string): boolean {
    return (
      this.db.prepare('DELETE FROM assets WHERE user_id = ? AND id = ?').run(userId, id).changes > 0
    );
  }

  setValue(value: AssetValue): void {
    this.db
      .prepare(
        `INSERT INTO asset_values (asset_id, date, value_cents) VALUES (@assetId, @date, @valueCents)
         ON CONFLICT(asset_id, date) DO UPDATE SET value_cents = excluded.value_cents`
      )
      .run(value);
  }

  valuesByUser(userId: string): AssetValue[] {
    return this.db
      .prepare(
        `SELECT v.asset_id AS assetId, v.date AS date, v.value_cents AS valueCents
         FROM asset_values v JOIN assets a ON a.id = v.asset_id
         WHERE a.user_id = ? ORDER BY v.date`
      )
      .all(userId) as AssetValue[];
  }
}
