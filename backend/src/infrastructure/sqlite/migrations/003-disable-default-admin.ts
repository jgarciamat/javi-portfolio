import bcrypt from 'bcryptjs';
import { Migration } from '../migrator';

/**
 * Versions ≤ 1.10 created `admin@admin.com` with the password `admin` on every
 * start (also in production, and the repository is public). If that account still
 * has the default password, remove the password and close its sessions. The row
 * and its data are kept: nobody can sign in with it anymore unless an owner of
 * the e-mail resets it (admin@admin.com is not a real mailbox).
 */
export const DEFAULT_ADMIN_ID = 'admin-fixed-id-0000-0000-000000000001';

export const disableDefaultAdmin: Migration = {
  version: 3,
  name: 'disable seeded admin account with default password',
  up(db) {
    const row = db
      .prepare('SELECT id, password_hash FROM users WHERE id = ? OR email = ?')
      .get(DEFAULT_ADMIN_ID, 'admin@admin.com') as
      | { id: string; password_hash: string | null }
      | undefined;
    if (!row?.password_hash) return;
    if (!bcrypt.compareSync('admin', row.password_hash)) return;
    db.prepare(
      'UPDATE users SET password_hash = NULL, session_version = session_version + 1 WHERE id = ?'
    ).run(row.id);
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(row.id);
  },
};
