import { Migration } from '../migrator';

/**
 * «Tu dinero perdido» (docs/disenos/dinero-perdido-y-fecha-meta.md, G.1): only what the user
 * decided about each finding. The findings themselves are computed on every read and never
 * stored, nor the descriptions or the amounts of each charge. Additive: no existing data changes.
 */
export const moneyLeakDecisions: Migration = {
  version: 41,
  name: 'money leak decisions',
  up(db) {
    db.exec(`
      CREATE TABLE money_leak_decisions (
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        finding_id   TEXT NOT NULL,
        fingerprint  TEXT NOT NULL,
        kind         TEXT NOT NULL CHECK (kind IN ('recurring','increase','duplicate','small')),
        status       TEXT NOT NULL
                     CHECK (status IN ('keep','cancel','dismissed','not_mine','recovered')),
        annual_cents INTEGER NOT NULL DEFAULT 0,
        decided_at   TEXT NOT NULL,
        recovered_at TEXT,
        PRIMARY KEY (user_id, finding_id)
      ) WITHOUT ROWID;
    `);
  },
};
