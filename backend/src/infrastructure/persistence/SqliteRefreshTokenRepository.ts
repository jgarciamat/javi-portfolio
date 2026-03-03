import Database from 'better-sqlite3';
import { IRefreshTokenRepository, RefreshTokenRecord } from '@domain/repositories/IRefreshTokenRepository';

interface RefreshTokenRow {
    id: string;
    user_id: string;
    token: string;
    expires_at: string;
    created_at: string;
}

export class SqliteRefreshTokenRepository implements IRefreshTokenRepository {
    constructor(private readonly db: Database.Database) { }

    async save(record: RefreshTokenRecord): Promise<void> {
        this.db.prepare(`
            INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
            VALUES (@id, @userId, @token, @expiresAt, @createdAt)
        `).run({
            id: record.id,
            userId: record.userId,
            token: record.token,
            expiresAt: record.expiresAt.toISOString(),
            createdAt: record.createdAt.toISOString(),
        });
    }

    async findByToken(token: string): Promise<RefreshTokenRecord | null> {
        const row = this.db.prepare(
            'SELECT * FROM refresh_tokens WHERE token = ?'
        ).get(token) as RefreshTokenRow | undefined;

        return row ? this.toRecord(row) : null;
    }

    async deleteByToken(token: string): Promise<void> {
        this.db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
    }

    async deleteByUserId(userId: string): Promise<void> {
        this.db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
    }

    async deleteExpired(): Promise<void> {
        this.db.prepare(
            'DELETE FROM refresh_tokens WHERE expires_at < ?'
        ).run(new Date().toISOString());
    }

    private toRecord(row: RefreshTokenRow): RefreshTokenRecord {
        return {
            id: row.id,
            userId: row.user_id,
            token: row.token,
            expiresAt: new Date(row.expires_at),
            createdAt: new Date(row.created_at),
        };
    }
}
