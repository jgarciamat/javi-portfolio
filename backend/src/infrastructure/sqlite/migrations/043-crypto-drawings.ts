import { Migration } from '../migrator';

/**
 * Drawings on the crypto console's chart: one row per person and coin with its list as JSON
 * (at most DRAWINGS_MAX, validated by the API before it is written). Additive: nothing existing
 * changes, and the rows go with the account.
 */
export const cryptoDrawings: Migration = {
  version: 43,
  name: 'crypto chart drawings',
  up(db) {
    db.exec(`
      CREATE TABLE crypto_drawings (
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol     TEXT NOT NULL,
        drawings   TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, symbol)
      ) WITHOUT ROWID;
    `);
  },
};
