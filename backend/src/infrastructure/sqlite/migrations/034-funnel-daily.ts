import { Migration } from '../migrator';

/**
 * Anonymous daily funnel counters (docs/analitica.md): how many times each step happened per
 * day and origin. No user id, IP, user agent or device id: only labels and a number.
 */
export const funnelDaily: Migration = {
  version: 34,
  name: 'funnel daily counters',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS funnel_daily (
        day      TEXT NOT NULL,
        event    TEXT NOT NULL,
        source   TEXT NOT NULL DEFAULT '',
        campaign TEXT NOT NULL DEFAULT '',
        detail   TEXT NOT NULL DEFAULT '',
        count    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, event, source, campaign, detail)
      ) WITHOUT ROWID;
    `);
  },
};
