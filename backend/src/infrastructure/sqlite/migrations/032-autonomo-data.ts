import { Migration } from '../migrator';

/**
 * The self-employed form (invoices, quarters, options) saved in the account when the user turns
 * it on. One row per user, encrypted at rest (`payload_enc`, AES-GCM), with a version that
 * increases on every save so two devices cannot overwrite each other unnoticed.
 */
export const autonomoData: Migration = {
  version: 32,
  name: 'autonomo data saved in the account',
  up(db) {
    db.exec(`
      CREATE TABLE autonomo_data (
        user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        payload_enc TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        version     INTEGER NOT NULL
      );
    `);
  },
};
