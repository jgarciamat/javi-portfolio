import { Migration } from '../migrator';

const FAMILY_MAX_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Refresh tokens rotate: every token belongs to the family started by one sign-in, which
 * has an absolute end. A used token is kept (rotated_at) to spot it being replayed.
 */
export const refreshRotation: Migration = {
  version: 26,
  name: 'refresh token rotation',
  up(db) {
    db.exec(`
      ALTER TABLE refresh_tokens ADD COLUMN family_id TEXT;
      ALTER TABLE refresh_tokens ADD COLUMN family_expires_at TEXT;
      ALTER TABLE refresh_tokens ADD COLUMN auth_time TEXT;
      ALTER TABLE refresh_tokens ADD COLUMN rotated_at TEXT;
    `);
    const rows = db.prepare('SELECT id, expires_at, created_at FROM refresh_tokens').all() as {
      id: string;
      expires_at: string;
      created_at: string;
    }[];
    const update = db.prepare(
      'UPDATE refresh_tokens SET family_id = ?, family_expires_at = ?, auth_time = ? WHERE id = ?'
    );
    for (const row of rows) {
      // Sessions open before this change keep at least their current expiry.
      const end = Math.max(
        new Date(row.created_at).getTime() + FAMILY_MAX_MS,
        new Date(row.expires_at).getTime()
      );
      update.run(row.id, new Date(end).toISOString(), row.created_at, row.id);
    }
    db.exec('CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);');
  },
};
