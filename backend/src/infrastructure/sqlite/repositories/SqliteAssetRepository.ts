import { Asset, AssetKind, AssetRepository, AssetValue } from '@domain/ports/repositories';
import { Db } from '../database';

interface AssetRow {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  created_at: string;
}

const toAsset = (r: AssetRow): Asset => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  kind: r.kind as AssetKind,
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

  save(asset: Asset): void {
    this.db
      .prepare(
        `INSERT INTO assets (id, user_id, name, kind, created_at)
         VALUES (@id, @userId, @name, @kind, @createdAt)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind`
      )
      .run(asset);
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
