import { Migration } from '../migrator';

/** Anonymous daily counters (signups, purchases…): no user ids, only how many times per day. */
export const metrics: Migration = {
  version: 8,
  name: 'aggregated metrics',
  up(db) {
    db.exec(`
      CREATE TABLE metrics (
        day   TEXT NOT NULL,
        name  TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, name)
      );
    `);
  },
};
