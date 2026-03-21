import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SqlMasterRow } from './row-types';

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

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
  `);

  // Migration: recreate transactions table if CHECK constraint doesn't include SAVING
  migrateTransactionsTable(db);
  // Migration: add email verification columns if missing
  migrateUsersEmailVerification(db);
  // Migration: add notes column to transactions if missing
  migrateTransactionsNotes(db);
  // Migration: add password reset token columns if missing
  migrateUsersPasswordReset(db);
  // Migration: add reset_email_sent column if missing
  migrateUsersResetEmailSent(db);
  // Migration: add recurring_rules table if missing
  migrateRecurringRules(db);
  // Migration: add recurring_rule_id column to transactions if missing
  migrateTransactionsRecurringRuleId(db);
  // Migration: add custom_alerts table if missing
  migrateCustomAlerts(db);
}

function migrateTransactionsTable(db: Database.Database): void {
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get() as SqlMasterRow | undefined;
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
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as SqlMasterRow | undefined;
  if (!info) return;
  if (!info.sql.includes('email_verified')) {
    db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`);
  }
  if (!info.sql.includes('verification_token')) {
    db.exec(`ALTER TABLE users ADD COLUMN verification_token TEXT`);
  }
  if (!info.sql.includes('avatar_url')) {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  }
}

function migrateTransactionsNotes(db: Database.Database): void {
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get() as SqlMasterRow | undefined;
  if (!info) return;
  if (!info.sql.includes('notes')) {
    db.exec(`ALTER TABLE transactions ADD COLUMN notes TEXT`);
  }
}

function migrateUsersPasswordReset(db: Database.Database): void {
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as SqlMasterRow | undefined;
  if (!info) return;
  if (!info.sql.includes('reset_token')) {
    db.exec(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
  }
  if (!info.sql.includes('reset_token_expires_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN reset_token_expires_at TEXT`);
  }
}

function migrateUsersResetEmailSent(db: Database.Database): void {
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as SqlMasterRow | undefined;
  if (!info) return;
  if (!info.sql.includes('reset_email_sent')) {
    db.exec(`ALTER TABLE users ADD COLUMN reset_email_sent INTEGER NOT NULL DEFAULT 0`);
  }
}

function migrateTransactionsRecurringRuleId(db: Database.Database): void {
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get() as SqlMasterRow | undefined;
  if (!info) return;
  if (!info.sql.includes('recurring_rule_id')) {
    db.exec(`ALTER TABLE transactions ADD COLUMN recurring_rule_id TEXT`);
  }
  // Unique constraint to prevent duplicate backfill entries for the same rule+month
  const idxInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_transactions_recurring_unique'").get();
  if (!idxInfo) {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_unique ON transactions(user_id, recurring_rule_id, year, month) WHERE recurring_rule_id IS NOT NULL`);
  }
}

function migrateRecurringRules(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE','SAVING')),
      category    TEXT NOT NULL,
      start_year  INTEGER NOT NULL,
      start_month INTEGER NOT NULL,
      end_year    INTEGER,
      end_month   INTEGER,
      frequency   TEXT NOT NULL DEFAULT 'monthly' CHECK(frequency IN ('monthly','bimonthly')),
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recurring_rules_user_id ON recurring_rules(user_id);
  `);
}

function migrateCustomAlerts(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_alerts (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      metric     TEXT NOT NULL,
      operator   TEXT NOT NULL CHECK(operator IN ('gte','lte')),
      threshold  REAL NOT NULL,
      category   TEXT,
      color      TEXT NOT NULL DEFAULT '#6366f1',
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_custom_alerts_user_id ON custom_alerts(user_id);
  `);

  // Add color column to existing databases that don't have it yet
  const cols = db.prepare("PRAGMA table_info(custom_alerts)").all() as { name: string }[];
  if (cols.length > 0 && !cols.some((c) => c.name === 'color')) {
    db.exec("ALTER TABLE custom_alerts ADD COLUMN color TEXT NOT NULL DEFAULT '#6366f1'");
  }
}
