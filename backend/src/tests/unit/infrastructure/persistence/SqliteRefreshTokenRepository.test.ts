import Database from 'better-sqlite3';
import { SqliteRefreshTokenRepository } from '@infrastructure/persistence/SqliteRefreshTokenRepository';
import { RefreshTokenRecord } from '@domain/repositories/IRefreshTokenRepository';
import { v4 as uuidv4 } from 'uuid';

function createSchema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            email         TEXT UNIQUE NOT NULL,
            name          TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL,
            email_verified INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id         TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token      TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rt_token   ON refresh_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_rt_user_id ON refresh_tokens(user_id);
    `);
    db.prepare("INSERT INTO users (id,email,name,password_hash,created_at,email_verified) VALUES ('u1','a@b.com','Test','hash','2025-01-01',0)").run();
    db.prepare("INSERT INTO users (id,email,name,password_hash,created_at,email_verified) VALUES ('u2','b@b.com','Test2','hash','2025-01-01',0)").run();
}

function makeRecord(overrides: Partial<RefreshTokenRecord> = {}): RefreshTokenRecord {
    return {
        id: overrides.id ?? uuidv4(),
        userId: overrides.userId ?? 'u1',
        token: overrides.token ?? 'token-' + uuidv4(),
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 3600 * 1000),
        createdAt: overrides.createdAt ?? new Date(),
    };
}

describe('SqliteRefreshTokenRepository', () => {
    let db: Database.Database;
    let repo: SqliteRefreshTokenRepository;

    beforeEach(() => {
        db = new Database(':memory:');
        createSchema(db);
        repo = new SqliteRefreshTokenRepository(db);
    });

    afterEach(() => {
        db.close();
    });

    describe('save', () => {
        it('inserts a refresh token record', async () => {
            const record = makeRecord({ token: 'my-token' });
            await repo.save(record);
            const found = await repo.findByToken('my-token');
            expect(found).not.toBeNull();
            expect(found!.userId).toBe('u1');
        });
    });

    describe('findByToken', () => {
        it('returns null when token not found', async () => {
            const result = await repo.findByToken('nonexistent');
            expect(result).toBeNull();
        });

        it('returns the correct record', async () => {
            const record = makeRecord({ userId: 'u2', token: 'tok-u2' });
            await repo.save(record);
            const found = await repo.findByToken('tok-u2');
            expect(found!.userId).toBe('u2');
            expect(found!.token).toBe('tok-u2');
        });
    });

    describe('deleteByToken', () => {
        it('removes the token', async () => {
            const record = makeRecord({ token: 'delete-me' });
            await repo.save(record);
            await repo.deleteByToken('delete-me');
            const found = await repo.findByToken('delete-me');
            expect(found).toBeNull();
        });
    });

    describe('deleteByUserId', () => {
        it('removes all tokens for a user', async () => {
            await repo.save(makeRecord({ userId: 'u1', token: 'tok-a' }));
            await repo.save(makeRecord({ userId: 'u1', token: 'tok-b' }));
            await repo.save(makeRecord({ userId: 'u2', token: 'tok-c' }));
            await repo.deleteByUserId('u1');
            expect(await repo.findByToken('tok-a')).toBeNull();
            expect(await repo.findByToken('tok-b')).toBeNull();
            // u2 token should remain
            expect(await repo.findByToken('tok-c')).not.toBeNull();
        });
    });

    describe('deleteExpired', () => {
        it('removes only expired tokens', async () => {
            const expired = makeRecord({ token: 'expired', expiresAt: new Date(Date.now() - 1000) });
            const valid = makeRecord({ token: 'valid', expiresAt: new Date(Date.now() + 3600 * 1000) });
            await repo.save(expired);
            await repo.save(valid);
            await repo.deleteExpired();
            expect(await repo.findByToken('expired')).toBeNull();
            expect(await repo.findByToken('valid')).not.toBeNull();
        });
    });
});
