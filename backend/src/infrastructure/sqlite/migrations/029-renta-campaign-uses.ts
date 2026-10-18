import { Migration } from '../migrator';

/**
 * Tax return calculations per Renta campaign (the free plan allows three in each one).
 * `renta_calculations` keeps the old lifetime count, which no longer limits anything.
 */
export const rentaCampaignUses: Migration = {
  version: 29,
  name: 'income tax return calculations per campaign',
  up(db) {
    db.exec(`
      CREATE TABLE renta_campaign_uses (
        user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign INTEGER NOT NULL,
        uses     INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, campaign)
      );
    `);
  },
};
