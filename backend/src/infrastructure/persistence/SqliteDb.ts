import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, 'money-manager.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                 TEXT PRIMARY KEY,
      email              TEXT UNIQUE NOT NULL,
      name               TEXT NOT NULL,
      password_hash      TEXT NOT NULL,
      created_at         TEXT NOT NULL,
      email_verified     INTEGER NOT NULL DEFAULT 0,
      verification_token TEXT
    );

    CREATE TABLE IF NOT EXISTS monthly_budgets (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year           INTEGER NOT NULL,
      month          INTEGER NOT NULL,
      initial_amount REAL NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL,
      UNIQUE(user_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id      TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name    TEXT NOT NULL,
      color   TEXT NOT NULL DEFAULT '#6366f1',
      icon    TEXT NOT NULL DEFAULT '💰',
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year        INTEGER NOT NULL,
      month       INTEGER NOT NULL,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE','SAVING')),
      category    TEXT NOT NULL,
      date        TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );
  `);

  // Migration: recreate transactions table if CHECK constraint doesn't include SAVING
  migrateTransactionsTable(db);
  // Migration: add email verification columns if missing
  migrateUsersEmailVerification(db);
}

function migrateTransactionsTable(db: Database.Database): void {
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get() as any;
  if (!info || info.sql.includes('SAVING')) return; // Already migrated or table doesn't exist

  db.pragma('foreign_keys = OFF');
  db.exec(`
        ALTER TABLE transactions RENAME TO transactions_old;

        CREATE TABLE transactions (
          id          TEXT PRIMARY KEY,
          user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          year        INTEGER NOT NULL,
          month       INTEGER NOT NULL,
          description TEXT NOT NULL,
          amount      REAL NOT NULL,
          type        TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE','SAVING')),
          category    TEXT NOT NULL,
          date        TEXT NOT NULL,
          created_at  TEXT NOT NULL
        );

        INSERT INTO transactions SELECT * FROM transactions_old;
        DROP TABLE transactions_old;
    `);
  db.pragma('foreign_keys = ON');
}

function migrateUsersEmailVerification(db: Database.Database): void {
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
  if (!info) return;
  if (!info.sql.includes('email_verified')) {
    db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`);
  }
  if (!info.sql.includes('verification_token')) {
    db.exec(`ALTER TABLE users ADD COLUMN verification_token TEXT`);
  }
}
