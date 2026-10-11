import { Migration } from '../migrator';

/**
 * Net worth beyond the accounts: investments, property, vehicles, other assets and debts the
 * user values by hand. Each asset keeps a dated history of values.
 */
export const assets: Migration = {
  version: 15,
  name: 'assets and debts',
  up(db) {
    db.exec(`
      CREATE TABLE assets (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       TEXT NOT NULL,
        kind       TEXT NOT NULL CHECK(kind IN ('investment','property','vehicle','other','debt')),
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_assets_user ON assets(user_id);

      CREATE TABLE asset_values (
        asset_id    TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        date        TEXT NOT NULL,
        value_cents INTEGER NOT NULL CHECK(value_cents >= 0),
        PRIMARY KEY (asset_id, date)
      );
    `);
  },
};
