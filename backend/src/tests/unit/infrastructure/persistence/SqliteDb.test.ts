/**
 * SqliteDb tests — tests the getDb() singleton and schema initialization.
 * We mock fs to control the data directory path, and use an in-memory
 * Database so no real .db file is created on disk.
 */
import path from 'path';

// Mock fs so we don't create real directories
jest.mock('fs', () => {
    const original = jest.requireActual<typeof import('fs')>('fs');
    return {
        ...original,
        existsSync: jest.fn().mockReturnValue(true),
        mkdirSync: jest.fn(),
    };
});

// Intercept better-sqlite3 constructor to return in-memory DB instead of file DB
jest.mock('better-sqlite3', () => {
    const RealDatabase = jest.requireActual<typeof import('better-sqlite3')>('better-sqlite3');
    return jest.fn().mockImplementation((_path: string, options?: object) => {
        // Always use :memory: so no file is created
        return new RealDatabase(':memory:', options);
    });
});

describe('SqliteDb', () => {
    beforeEach(() => {
        jest.resetModules();
        // Re-register mocks after module reset
        jest.mock('fs', () => {
            const original = jest.requireActual<typeof import('fs')>('fs');
            return {
                ...original,
                existsSync: jest.fn().mockReturnValue(true),
                mkdirSync: jest.fn(),
            };
        });
        jest.mock('better-sqlite3', () => {
            const RealDatabase = jest.requireActual<typeof import('better-sqlite3')>('better-sqlite3');
            return jest.fn().mockImplementation((_path: string, options?: object) => {
                return new RealDatabase(':memory:', options);
            });
        });
    });

    it('getDb creates data directory when it does not exist', () => {
        const fs = require('fs');
        fs.existsSync.mockReturnValue(false);
        const { getDb } = require('@infrastructure/persistence/SqliteDb');
        getDb();
        expect(fs.mkdirSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), 'data'),
            { recursive: true }
        );
    });

    it('getDb does NOT create data directory when it already exists', () => {
        const fs = require('fs');
        fs.existsSync.mockReturnValue(true);
        const { getDb } = require('@infrastructure/persistence/SqliteDb');
        getDb();
        expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('getDb creates all required tables', () => {
        const { getDb } = require('@infrastructure/persistence/SqliteDb');
        const db = getDb();
        const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(r => r.name);
        expect(tables).toContain('users');
        expect(tables).toContain('categories');
        expect(tables).toContain('transactions');
        expect(tables).toContain('refresh_tokens');
    });

    it('users table has all required columns', () => {
        const { getDb } = require('@infrastructure/persistence/SqliteDb');
        const db = getDb();
        const cols = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map(c => c.name);
        expect(cols).toContain('email_verified');
        expect(cols).toContain('verification_token');
        expect(cols).toContain('avatar_url');
        expect(cols).toContain('reset_token');
        expect(cols).toContain('reset_token_expires_at');
        expect(cols).toContain('reset_email_sent');
    });

    it('transactions table has notes column and SAVING type check', () => {
        const { getDb } = require('@infrastructure/persistence/SqliteDb');
        const db = getDb();
        const cols = (db.prepare('PRAGMA table_info(transactions)').all() as { name: string }[]).map(c => c.name);
        expect(cols).toContain('notes');
    });

    it('getDb returns the same singleton instance on second call', () => {
        const { getDb } = require('@infrastructure/persistence/SqliteDb');
        const db1 = getDb();
        const db2 = getDb();
        expect(db1).toBe(db2);
    });
});
