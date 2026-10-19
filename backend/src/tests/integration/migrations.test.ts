import bcrypt from 'bcryptjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';
import { openDatabase, Db } from '@infrastructure/sqlite/database';
import { migrate, prunePreMigrationCopies } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import { baseline } from '@infrastructure/sqlite/migrations/001-baseline';
import { dropUploadedPictures } from '@infrastructure/sqlite/migrations/033-drop-uploaded-pictures';

/** Builds a database exactly as v1.10 left it, with representative data. */
function legacyDatabase(file = ':memory:'): Db {
  const db = openDatabase(file);
  baseline.up(db);
  const adminHash = bcrypt.hashSync('admin', 4);
  const userHash = bcrypt.hashSync('Secret-123', 4);
  db.exec(`
    INSERT INTO users (id, email, name, password_hash, created_at, email_verified, verification_token)
      VALUES ('admin-fixed-id-0000-0000-000000000001', 'admin@admin.com', 'Admin', '${adminHash}', '2026-01-01T00:00:00Z', 1, NULL),
             ('u1', 'Ana@Example.com', 'Ana', '${userHash}', '2026-01-01T00:00:00Z', 1, NULL),
             ('u2', 'google@example.com', 'G', '', '2026-01-01T00:00:00Z', 0, 'raw-verification-token');
    INSERT INTO categories (id, user_id, name, color, icon) VALUES ('c1', 'u1', 'Ocio', '#ec4899', '🎉');
    INSERT INTO recurring_rules (id, user_id, description, amount, type, category, start_year, start_month, frequency, active, created_at)
      VALUES ('r1', 'u1', 'Gym', 29.9, 'EXPENSE', 'Salud', 2026, 1, 'monthly', 1, '2026-01-01T00:00:00Z');
    INSERT INTO transactions (id, user_id, year, month, description, amount, type, category, date, created_at, notes, recurring_rule_id)
      VALUES ('t1', 'u1', 2026, 3, 'Cine', 12.35, 'EXPENSE', 'Ocio', '2026-03-04T11:00:00.000Z', '2026-03-04T11:00:00Z', 'con amigos', NULL),
             ('t2', 'u1', 2026, 3, 'Gym', 29.9, 'EXPENSE', 'Salud', '2026-03-01T00:00:00.000Z', '2026-03-01T00:00:00Z', NULL, 'r1'),
             ('t3', 'u1', 2026, 2, 'Viejo', 5, 'EXPENSE', 'Ocio', '2026-02-01T00:00:00.000Z', '2026-02-01T00:00:00Z', NULL, 'deleted-rule'),
             ('t4', 'u1', 2026, 3, 'Nómina', 1500.1, 'INCOME', 'Salario', '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00Z', NULL, NULL);
    INSERT INTO custom_alerts (id, user_id, name, metric, operator, threshold, category, color, active, created_at)
      VALUES ('a1', 'u1', 'Ocio', 'category_amount', 'gte', 100, 'Ocio', '#ff0000', 1, '2026-01-01T00:00:00Z');
    INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
      VALUES ('rt1', 'u1', 'legacy-refresh-jwt', '2099-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
             ('rt2', 'admin-fixed-id-0000-0000-000000000001', 'admin-refresh', '2099-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
  `);
  return db;
}

const sha256 = (v: string): string => createHash('sha256').update(v).digest('hex');

describe('migrations', () => {
  it('creates the full schema on an empty database', () => {
    const db = openDatabase(':memory:');
    const result = migrate(db, migrations);
    expect(result).toEqual({ from: 0, to: migrations.length, backupFile: null });
    expect(db.pragma('user_version', { simple: true })).toBe(migrations.length);
    expect(migrate(db, migrations).to).toBe(migrations.length);
  });

  it('indexes every foreign key', () => {
    const db = openDatabase(':memory:');
    migrate(db, migrations);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .pluck()
      .all() as string[];
    const unindexed = tables.flatMap((table) => {
      const leading = (db.pragma(`index_list(${table})`) as { name: string }[]).map(
        (i) => (db.pragma(`index_info(${i.name})`) as { name: string }[])[0]?.name
      );
      return (db.pragma(`foreign_key_list(${table})`) as { from: string }[])
        .filter((fk) => !leading.includes(fk.from))
        .map((fk) => `${table}.${fk.from}`);
    });
    expect(unindexed).toEqual([]);
  });

  describe('upgrading a v1 database', () => {
    let db: Db;

    beforeAll(() => {
      db = legacyDatabase();
      migrate(db, migrations);
    });

    it('converts amounts to integer cents and dates to YYYY-MM-DD', () => {
      const rows = db
        .prepare('SELECT id, amount_cents, date, year, month FROM transactions ORDER BY id')
        .all();
      expect(rows).toEqual([
        { id: 't1', amount_cents: 1235, date: '2026-03-04', year: 2026, month: 3 },
        { id: 't2', amount_cents: 2990, date: '2026-03-01', year: 2026, month: 3 },
        { id: 't3', amount_cents: 500, date: '2026-02-01', year: 2026, month: 2 },
        { id: 't4', amount_cents: 150010, date: '2026-03-01', year: 2026, month: 3 },
      ]);
      expect(db.prepare("SELECT amount_cents FROM recurring_rules WHERE id = 'r1'").get()).toEqual({
        amount_cents: 2990,
      });
    });

    it('links categories by id, creating the ones that only existed as names', () => {
      const rows = db
        .prepare(
          `SELECT t.id, c.name FROM transactions t JOIN categories c ON c.id = t.category_id ORDER BY t.id`
        )
        .all();
      expect(rows).toEqual([
        { id: 't1', name: 'Ocio' },
        { id: 't2', name: 'Salud' },
        { id: 't3', name: 'Ocio' },
        { id: 't4', name: 'Salario' },
      ]);
      const alert = db
        .prepare('SELECT c.name FROM custom_alerts a JOIN categories c ON c.id = a.category_id')
        .get();
      expect(alert).toEqual({ name: 'Ocio' });
    });

    it('gives every user a default account and settings', () => {
      const accounts = db.prepare('SELECT user_id, name FROM accounts ORDER BY user_id').all();
      expect(accounts).toHaveLength(3);
      const missing = db
        .prepare(
          'SELECT COUNT(*) AS n FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id WHERE a.id IS NULL'
        )
        .get() as { n: number };
      expect(missing.n).toBe(0);
      const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get('u1') as {
        default_account_id: string;
        month_start_day: number;
      };
      expect(settings.month_start_day).toBe(1);
      expect(settings.default_account_id).toBeTruthy();
    });

    it('keeps valid rule links and drops links to deleted rules', () => {
      const links = db.prepare('SELECT id, recurring_rule_id FROM transactions ORDER BY id').all();
      expect(links).toEqual([
        { id: 't1', recurring_rule_id: null },
        { id: 't2', recurring_rule_id: 'r1' },
        { id: 't3', recurring_rule_id: null },
        { id: 't4', recurring_rule_id: null },
      ]);
    });

    it('hashes stored tokens and normalises e-mails / Google-only passwords', () => {
      expect(db.prepare("SELECT token_hash FROM refresh_tokens WHERE id = 'rt1'").get()).toEqual({
        token_hash: sha256('legacy-refresh-jwt'),
      });
      // Open sessions become a family of their own, ending 90 days after the sign-in at the
      // earliest and never before their current expiry.
      expect(
        db
          .prepare(
            "SELECT family_id, family_expires_at, auth_time, rotated_at FROM refresh_tokens WHERE id = 'rt1'"
          )
          .get()
      ).toEqual({
        family_id: 'rt1',
        family_expires_at: '2099-01-01T00:00:00.000Z',
        auth_time: '2026-01-01T00:00:00Z',
        rotated_at: null,
      });
      const google = db
        .prepare(
          "SELECT password_hash, verification_token_hash, verification_token_expires_at FROM users WHERE id = 'u2'"
        )
        .get() as Record<string, string | null>;
      expect(google.password_hash).toBeNull();
      expect(google.verification_token_hash).toBe(sha256('raw-verification-token'));
      expect(google.verification_token_expires_at).not.toBeNull();
      expect(db.prepare("SELECT email FROM users WHERE id = 'u1'").get()).toEqual({
        email: 'ana@example.com',
      });
    });

    it('disables the seeded admin account with the default password', () => {
      const admin = db
        .prepare("SELECT password_hash, session_version FROM users WHERE email = 'admin@admin.com'")
        .get();
      expect(admin).toEqual({ password_hash: null, session_version: 1 });
      expect(db.prepare("SELECT COUNT(*) AS n FROM refresh_tokens WHERE id = 'rt2'").get()).toEqual(
        { n: 0 }
      );
      const ana = db.prepare("SELECT password_hash FROM users WHERE id = 'u1'").get() as {
        password_hash: string;
      };
      expect(bcrypt.compareSync('Secret-123', ana.password_hash)).toBe(true);
    });

    it('leaves a consistent database', () => {
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
    });
  });

  it('writes a backup before migrating a database file that has data', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-migrate-'));
    const file = path.join(dir, 'money-manager.db');
    const db = legacyDatabase(file);
    const result = migrate(db, migrations, { databaseFile: file });
    db.close();
    expect(result.backupFile).toMatch(/pre-migration-v0-/);
    const backup = openDatabase(result.backupFile!);
    expect(backup.prepare('SELECT COUNT(*) AS n FROM transactions').get()).toEqual({ n: 4 });
    expect(backup.pragma('user_version', { simple: true })).toBe(0);
    backup.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('prunes pre-migration copies older than 14 days and keeps the rest', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-migrate-'));
    const file = path.join(dir, 'money-manager.db');
    const old = path.join(dir, 'pre-migration-v1-old.db');
    const recent = path.join(dir, 'pre-migration-v2-recent.db');
    const unrelated = path.join(dir, 'other.db');
    for (const f of [old, recent, unrelated]) fs.writeFileSync(f, '');
    for (const f of [old, unrelated])
      fs.utimesSync(f, new Date('2026-01-01'), new Date('2026-01-01'));
    fs.utimesSync(recent, new Date('2026-01-20'), new Date('2026-01-20'));
    expect(prunePreMigrationCopies(file, new Date('2026-01-25T00:00:00Z'))).toEqual([old]);
    expect(fs.existsSync(recent)).toBe(true);
    expect(fs.existsSync(unrelated)).toBe(true);
    expect(prunePreMigrationCopies(':memory:')).toEqual([]);
    expect(prunePreMigrationCopies(path.join(dir, 'missing', 'x.db'))).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('erases uploaded profile pictures and keeps chosen emoji (033, idempotent)', () => {
    const db = openDatabase(':memory:');
    migrate(
      db,
      migrations.filter((m) => m.version < dropUploadedPictures.version)
    );
    const insert = db.prepare(
      `INSERT INTO users (id, email, name, password_hash, created_at, avatar_url)
       VALUES (?, ?, 'U', NULL, '2026-01-01T00:00:00Z', ?)`
    );
    const avatars: Record<string, string | null> = {
      png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
      jpeg: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ',
      link: 'https://example.com/me.webp',
      emoji: '🦊',
      joined: '👩🏽‍💻',
      flag: '🇪🇸',
      none: null,
    };
    for (const [id, avatar] of Object.entries(avatars)) insert.run(id, `${id}@x.es`, avatar);
    const read = (): Record<string, string | null> =>
      Object.fromEntries(
        (
          db.prepare('SELECT id, avatar_url FROM users ORDER BY id').all() as {
            id: string;
            avatar_url: string | null;
          }[]
        ).map((r) => [r.id, r.avatar_url])
      );
    const expected = { ...avatars, png: null, jpeg: null, link: null };

    migrate(db, migrations);
    expect(db.pragma('user_version', { simple: true })).toBe(dropUploadedPictures.version);
    expect(read()).toEqual(expected);

    dropUploadedPictures.up(db);
    expect(read()).toEqual(expected);
    db.close();
  });

  it('turns on secure_delete so deleted rows are overwritten', () => {
    const db = openDatabase(':memory:');
    expect(db.pragma('secure_delete', { simple: true })).toBe(1);
    db.close();
  });

  it('rolls back a migration that fails', () => {
    const db = openDatabase(':memory:');
    const broken = {
      version: 1,
      name: 'broken',
      up: (d: Db) => {
        d.exec('CREATE TABLE half_done (id TEXT)');
        throw new Error('boom');
      },
    };
    expect(() => migrate(db, [broken])).toThrow('boom');
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE name = 'half_done'").get()
    ).toBeUndefined();
    expect(db.pragma('user_version', { simple: true })).toBe(0);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });
});
