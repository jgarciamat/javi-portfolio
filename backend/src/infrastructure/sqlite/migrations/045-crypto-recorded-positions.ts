import { Migration } from '../migrator';

/**
 * Crypto console, «Register a trade I already opened» (practice portfolios only,
 * docs/consola-crypto.md): a position opened at the entry price and moment the person gives, not
 * against the market. `recorded` tells them apart on the cards, in the history and in the export
 * of personal data. Every position kept so far was opened by the simulator (0).
 */
export const cryptoRecordedPositions: Migration = {
  version: 45,
  name: 'crypto simulator positions registered at a chosen entry',
  up(db) {
    db.exec(`
      ALTER TABLE crypto_sim_positions
        ADD COLUMN recorded INTEGER NOT NULL DEFAULT 0 CHECK (recorded IN (0, 1));
    `);
  },
};
