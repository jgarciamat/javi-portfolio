import Database from 'better-sqlite3';
import { User } from '@domain/entities/User';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { UserRow } from './row-types';

export class SqliteUserRepository implements IUserRepository {
    constructor(private readonly db: Database.Database) { }

    async save(user: User): Promise<void> {
        this.db
            .prepare(`
        INSERT INTO users (id, email, name, password_hash, created_at, email_verified, verification_token, avatar_url)
        VALUES (@id, @email, @name, @passwordHash, @createdAt, @emailVerified, @verificationToken, @avatarUrl)
        ON CONFLICT(id) DO UPDATE SET
          email              = excluded.email,
          name               = excluded.name,
          password_hash      = excluded.password_hash,
          email_verified     = excluded.email_verified,
          verification_token = excluded.verification_token,
          avatar_url         = excluded.avatar_url
      `)
            .run({
                id: user.id,
                email: user.email,
                name: user.name,
                passwordHash: user.passwordHash,
                createdAt: user.createdAt.toISOString(),
                emailVerified: user.emailVerified ? 1 : 0,
                verificationToken: user.verificationToken,
                avatarUrl: user.avatarUrl,
            });
    }

    async findById(id: string): Promise<User | null> {
        const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
        return row ? this.toEntity(row) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
        return row ? this.toEntity(row) : null;
    }

    async findByVerificationToken(token: string): Promise<User | null> {
        const row = this.db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token) as UserRow | undefined;
        return row ? this.toEntity(row) : null;
    }

    private toEntity(row: UserRow): User {
        return User.create({
            id: row.id,
            email: row.email,
            name: row.name,
            passwordHash: row.password_hash,
            createdAt: new Date(row.created_at),
            emailVerified: row.email_verified === 1,
            verificationToken: row.verification_token ?? null,
            avatarUrl: row.avatar_url ?? null,
        });
    }
}
