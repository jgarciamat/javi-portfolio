import { User, UserProps } from '@domain/model/User';
import {
  RefreshTokenRecord,
  RefreshTokenRepository,
  UserRepository,
} from '@domain/ports/repositories';
import { Db } from '../database';

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  created_at: string;
  email_verified: number;
  verification_token_hash: string | null;
  verification_token_expires_at: string | null;
  avatar_url: string | null;
  reset_token_hash: string | null;
  reset_token_expires_at: string | null;
  google_id: string | null;
  session_version: number;
}

function toUser(row: UserRow): User {
  const props: UserProps = {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    emailVerified: row.email_verified === 1,
    verificationTokenHash: row.verification_token_hash,
    verificationTokenExpiresAt: row.verification_token_expires_at,
    avatarUrl: row.avatar_url,
    resetTokenHash: row.reset_token_hash,
    resetTokenExpiresAt: row.reset_token_expires_at,
    googleId: row.google_id,
    sessionVersion: row.session_version,
  };
  return User.reconstitute(props);
}

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  private findOne(where: string, value: string): User | null {
    const row = this.db.prepare(`SELECT * FROM users WHERE ${where} = ?`).get(value) as
      | UserRow
      | undefined;
    return row ? toUser(row) : null;
  }

  findById(id: string): User | null {
    return this.findOne('id', id);
  }

  findByEmail(email: string): User | null {
    return this.findOne('email', email.trim().toLowerCase());
  }

  findByGoogleId(googleId: string): User | null {
    return this.findOne('google_id', googleId);
  }

  findByVerificationTokenHash(hash: string): User | null {
    return this.findOne('verification_token_hash', hash);
  }

  findByResetTokenHash(hash: string): User | null {
    return this.findOne('reset_token_hash', hash);
  }

  save(user: User): void {
    const p = user.toPrimitives();
    this.db
      .prepare(
        `INSERT INTO users (id, email, name, password_hash, created_at, email_verified,
           verification_token_hash, verification_token_expires_at, avatar_url, reset_token_hash,
           reset_token_expires_at, google_id, session_version)
         VALUES (@id, @email, @name, @passwordHash, @createdAt, @emailVerified, @verificationTokenHash,
           @verificationTokenExpiresAt, @avatarUrl, @resetTokenHash, @resetTokenExpiresAt, @googleId,
           @sessionVersion)
         ON CONFLICT(id) DO UPDATE SET
           email = excluded.email,
           name = excluded.name,
           password_hash = excluded.password_hash,
           email_verified = excluded.email_verified,
           verification_token_hash = excluded.verification_token_hash,
           verification_token_expires_at = excluded.verification_token_expires_at,
           avatar_url = excluded.avatar_url,
           reset_token_hash = excluded.reset_token_hash,
           reset_token_expires_at = excluded.reset_token_expires_at,
           google_id = excluded.google_id,
           session_version = excluded.session_version`
      )
      .run({ ...p, emailVerified: p.emailVerified ? 1 : 0 });
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}

interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export class SqliteRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: Db) {}

  save(record: RefreshTokenRecord): void {
    this.db
      .prepare(
        'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(record.id, record.userId, record.tokenHash, record.expiresAt, record.createdAt);
  }

  findByHash(tokenHash: string): RefreshTokenRecord | null {
    const row = this.db
      .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
      .get(tokenHash) as RefreshTokenRow | undefined;
    return row
      ? {
          id: row.id,
          userId: row.user_id,
          tokenHash: row.token_hash,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
        }
      : null;
  }

  extend(tokenHash: string, expiresAt: string): void {
    this.db
      .prepare('UPDATE refresh_tokens SET expires_at = ? WHERE token_hash = ?')
      .run(expiresAt, tokenHash);
  }

  deleteByHash(tokenHash: string): void {
    this.db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
  }

  deleteByUser(userId: string): void {
    this.db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
  }

  deleteExpired(now: Date): number {
    return this.db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?').run(now.toISOString())
      .changes;
  }
}
