import {
  TwoFactorChallengeRecord,
  TwoFactorRecord,
  TwoFactorRepository,
} from '@domain/ports/two-factor';
import { Db } from '../database';

interface TwoFactorRow {
  user_id: string;
  secret_enc: string;
  created_at: string;
  enabled_at: string | null;
  last_used_step: number | null;
  failed_attempts: number;
  locked_until: string | null;
}

interface ChallengeRow {
  token_hash: string;
  user_id: string;
  expires_at: string;
  attempts: number;
}

export class SqliteTwoFactorRepository implements TwoFactorRepository {
  constructor(private readonly db: Db) {}

  find(userId: string): TwoFactorRecord | null {
    const row = this.db.prepare('SELECT * FROM user_two_factor WHERE user_id = ?').get(userId) as
      | TwoFactorRow
      | undefined;
    return row
      ? {
          userId: row.user_id,
          secretEncrypted: row.secret_enc,
          createdAt: row.created_at,
          enabledAt: row.enabled_at,
          lastUsedStep: row.last_used_step,
          failedAttempts: row.failed_attempts,
          lockedUntil: row.locked_until,
        }
      : null;
  }

  save(record: TwoFactorRecord): void {
    this.db
      .prepare(
        `INSERT INTO user_two_factor
           (user_id, secret_enc, created_at, enabled_at, last_used_step, failed_attempts, locked_until)
         VALUES (@userId, @secretEncrypted, @createdAt, @enabledAt, @lastUsedStep, @failedAttempts, @lockedUntil)
         ON CONFLICT(user_id) DO UPDATE SET
           secret_enc = excluded.secret_enc,
           created_at = excluded.created_at,
           enabled_at = excluded.enabled_at,
           last_used_step = excluded.last_used_step,
           failed_attempts = excluded.failed_attempts,
           locked_until = excluded.locked_until`
      )
      .run(record);
  }

  delete(userId: string): void {
    this.db.prepare('DELETE FROM user_two_factor WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM two_factor_recovery_codes WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM two_factor_challenges WHERE user_id = ?').run(userId);
  }

  replaceRecoveryCodes(userId: string, codeHashes: string[]): void {
    this.db.prepare('DELETE FROM two_factor_recovery_codes WHERE user_id = ?').run(userId);
    const insert = this.db.prepare(
      'INSERT INTO two_factor_recovery_codes (user_id, code_hash) VALUES (?, ?)'
    );
    for (const hash of codeHashes) insert.run(userId, hash);
  }

  useRecoveryCode(userId: string, codeHash: string, at: string): boolean {
    return (
      this.db
        .prepare(
          `UPDATE two_factor_recovery_codes SET used_at = ?
           WHERE user_id = ? AND code_hash = ? AND used_at IS NULL`
        )
        .run(at, userId, codeHash).changes === 1
    );
  }

  remainingRecoveryCodes(userId: string): number {
    return (
      this.db
        .prepare(
          'SELECT COUNT(*) AS n FROM two_factor_recovery_codes WHERE user_id = ? AND used_at IS NULL'
        )
        .get(userId) as { n: number }
    ).n;
  }

  saveChallenge(record: TwoFactorChallengeRecord): void {
    this.db
      .prepare(
        `INSERT INTO two_factor_challenges (token_hash, user_id, expires_at, attempts)
         VALUES (@tokenHash, @userId, @expiresAt, @attempts)`
      )
      .run(record);
  }

  findChallenge(tokenHash: string): TwoFactorChallengeRecord | null {
    const row = this.db
      .prepare('SELECT * FROM two_factor_challenges WHERE token_hash = ?')
      .get(tokenHash) as ChallengeRow | undefined;
    return row
      ? {
          tokenHash: row.token_hash,
          userId: row.user_id,
          expiresAt: row.expires_at,
          attempts: row.attempts,
        }
      : null;
  }

  countChallengeAttempt(tokenHash: string): void {
    this.db
      .prepare('UPDATE two_factor_challenges SET attempts = attempts + 1 WHERE token_hash = ?')
      .run(tokenHash);
  }

  deleteChallenge(tokenHash: string): void {
    this.db.prepare('DELETE FROM two_factor_challenges WHERE token_hash = ?').run(tokenHash);
  }

  deleteExpiredChallenges(now: string): void {
    this.db.prepare('DELETE FROM two_factor_challenges WHERE expires_at < ?').run(now);
  }
}
