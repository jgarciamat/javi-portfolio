import Database from 'better-sqlite3';
import { SqliteUserRepository } from '@infrastructure/persistence/SqliteUserRepository';
import { User } from '@domain/entities/User';

function createSchema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id                      TEXT PRIMARY KEY,
            email                   TEXT UNIQUE NOT NULL,
            name                    TEXT NOT NULL,
            password_hash           TEXT NOT NULL,
            created_at              TEXT NOT NULL,
            email_verified          INTEGER NOT NULL DEFAULT 0,
            verification_token      TEXT,
            avatar_url              TEXT,
            reset_token             TEXT,
            reset_token_expires_at  TEXT,
            reset_email_sent        INTEGER NOT NULL DEFAULT 0
        );
    `);
}

function makeUser(overrides: Partial<{
    id: string;
    email: string;
    verificationToken: string | null;
    emailVerified: boolean;
    resetToken: string | null;
    resetTokenExpiresAt: Date | null;
    resetEmailSent: boolean;
    avatarUrl: string | null;
}> = {}): User {
    return User.create({
        id: overrides.id ?? 'user-1',
        email: overrides.email ?? 'test@example.com',
        name: 'Test User',
        passwordHash: '$2b$10$fakeHash',
        createdAt: new Date('2025-01-01'),
        emailVerified: overrides.emailVerified ?? false,
        verificationToken: overrides.verificationToken ?? 'verify-token',
        avatarUrl: overrides.avatarUrl ?? null,
        resetToken: overrides.resetToken ?? null,
        resetTokenExpiresAt: overrides.resetTokenExpiresAt ?? null,
        resetEmailSent: overrides.resetEmailSent ?? false,
    });
}

describe('SqliteUserRepository', () => {
    let db: Database.Database;
    let repo: SqliteUserRepository;

    beforeEach(() => {
        db = new Database(':memory:');
        createSchema(db);
        repo = new SqliteUserRepository(db);
    });

    afterEach(() => {
        db.close();
    });

    it('saves and finds user by id', async () => {
        const user = makeUser();
        await repo.save(user);
        const found = await repo.findById('user-1');
        expect(found).not.toBeNull();
        expect(found!.email).toBe('test@example.com');
    });

    it('returns null when user not found by id', async () => {
        const result = await repo.findById('no-such-user');
        expect(result).toBeNull();
    });

    it('finds user by email', async () => {
        const user = makeUser();
        await repo.save(user);
        const found = await repo.findByEmail('test@example.com');
        expect(found).not.toBeNull();
        expect(found!.id).toBe('user-1');
    });

    it('returns null when email not found', async () => {
        const result = await repo.findByEmail('nobody@example.com');
        expect(result).toBeNull();
    });

    it('finds user by verification token', async () => {
        const user = makeUser({ verificationToken: 'token-abc' });
        await repo.save(user);
        const found = await repo.findByVerificationToken('token-abc');
        expect(found).not.toBeNull();
        expect(found!.id).toBe('user-1');
    });

    it('returns null when verification token not found', async () => {
        const result = await repo.findByVerificationToken('nope');
        expect(result).toBeNull();
    });

    it('finds user by reset token', async () => {
        const expiresAt = new Date(Date.now() + 3600 * 1000);
        const user = makeUser({ resetToken: 'reset-tok', resetTokenExpiresAt: expiresAt });
        await repo.save(user);
        const found = await repo.findByResetToken('reset-tok');
        expect(found).not.toBeNull();
        expect(found!.resetToken).toBe('reset-tok');
    });

    it('returns null when reset token not found', async () => {
        const result = await repo.findByResetToken('unknown');
        expect(result).toBeNull();
    });

    it('updates existing user on conflict', async () => {
        const user = makeUser();
        await repo.save(user);
        const updated = User.create({
            id: user.id,
            email: user.email,
            name: 'Updated Name',
            passwordHash: user.passwordHash,
            createdAt: user.createdAt,
            emailVerified: true,
            verificationToken: null,
            avatarUrl: null,
            resetToken: null,
            resetTokenExpiresAt: null,
            resetEmailSent: false,
        });
        await repo.save(updated);
        const found = await repo.findById('user-1');
        expect(found!.name).toBe('Updated Name');
        expect(found!.emailVerified).toBe(true);
    });

    it('preserves avatarUrl and resetEmailSent', async () => {
        const expiresAt = new Date(Date.now() + 3600 * 1000);
        const user = makeUser({ avatarUrl: 'data:image/png;base64,abc', resetEmailSent: true, resetTokenExpiresAt: expiresAt, resetToken: 'r' });
        await repo.save(user);
        const found = await repo.findById('user-1');
        expect(found!.avatarUrl).toBe('data:image/png;base64,abc');
        expect(found!.resetEmailSent).toBe(true);
    });
});
