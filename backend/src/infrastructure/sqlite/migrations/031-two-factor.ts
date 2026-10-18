import { Migration } from '../migrator';

/**
 * Optional two-factor authentication (TOTP): the secret (encrypted), the single-use
 * recovery codes (hashed) and the short-lived challenges between the password and the
 * code. Everything goes with the user (ON DELETE CASCADE).
 */
export const twoFactor: Migration = {
  version: 31,
  name: 'two-factor authentication',
  up(db) {
    db.exec(`
      CREATE TABLE user_two_factor (
        user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        secret_enc      TEXT NOT NULL,
        created_at      TEXT NOT NULL,
        enabled_at      TEXT,
        last_used_step  INTEGER,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until    TEXT
      );
      CREATE TABLE two_factor_recovery_codes (
        user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        used_at   TEXT,
        PRIMARY KEY (user_id, code_hash)
      );
      CREATE TABLE two_factor_challenges (
        token_hash TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        attempts   INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_two_factor_challenges_user ON two_factor_challenges(user_id);
    `);
  },
};
