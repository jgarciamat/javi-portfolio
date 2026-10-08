import { Migration } from '../migrator';
import { Db } from '../database';

/**
 * Brings any database created by the previous versions of the app (which applied
 * ad-hoc migrations at boot) — or an empty one — to the same known schema.
 * Every statement is idempotent on purpose.
 */
function columns(db: Db, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function tableSql(db: Db, table: string): string | null {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { sql: string } | undefined;
  return row?.sql ?? null;
}

function addColumn(db: Db, table: string, column: string, definition: string): void {
  if (!columns(db, table).has(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export const baseline: Migration = {
  version: 1,
  name: 'baseline schema of v1.x',
  up(db) {
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
    `);

    // Very old databases had a transactions CHECK without SAVING.
    const txSql = tableSql(db, 'transactions');
    if (txSql && !txSql.includes('SAVING')) {
      db.exec(`
        ALTER TABLE transactions RENAME TO transactions_pre_saving;
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
        INSERT INTO transactions (id, user_id, year, month, description, amount, type, category, date, created_at)
          SELECT id, user_id, year, month, description, amount, type, category, date, created_at
          FROM transactions_pre_saving;
        DROP TABLE transactions_pre_saving;
      `);
    }

    addColumn(db, 'users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
    addColumn(db, 'users', 'verification_token', 'TEXT');
    addColumn(db, 'users', 'avatar_url', 'TEXT');
    addColumn(db, 'users', 'reset_token', 'TEXT');
    addColumn(db, 'users', 'reset_token_expires_at', 'TEXT');
    addColumn(db, 'users', 'reset_email_sent', 'INTEGER NOT NULL DEFAULT 0');
    addColumn(db, 'users', 'google_id', 'TEXT');
    addColumn(db, 'transactions', 'notes', 'TEXT');
    addColumn(db, 'transactions', 'recurring_rule_id', 'TEXT');
    addColumn(db, 'custom_alerts', 'color', "TEXT NOT NULL DEFAULT '#6366f1'");
  },
};
