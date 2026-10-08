import { createHash, randomUUID } from 'crypto';
import { Migration } from '../migrator';
import { Db } from '../database';
import { toCents } from '@domain/shared/money';
import { periodOfDate, toDateOnly } from '@domain/shared/period';
import { normalizeText } from '@domain/shared/text';

/**
 * v2 data model:
 *  - amounts as INTEGER cents
 *  - movements, rules and alerts reference categories by id (no more name strings)
 *  - accounts + transfers; every user gets a default "Principal" account
 *  - dates stored as YYYY-MM-DD (no time / timezone drift)
 *  - verification, reset and refresh tokens stored as SHA-256 hashes
 *  - user settings, category budgets and savings goals
 *  - indexes for the per-user queries
 */
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

interface OldUser {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  created_at: string;
  email_verified: number;
  verification_token: string | null;
  avatar_url: string | null;
  reset_token: string | null;
  reset_token_expires_at: string | null;
  google_id: string | null;
}

interface OldTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  created_at: string;
  notes: string | null;
  recurring_rule_id: string | null;
}

interface OldRule {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  start_year: number;
  start_month: number;
  end_year: number | null;
  end_month: number | null;
  frequency: string;
  active: number;
  created_at: string;
}

interface OldAlert {
  id: string;
  user_id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  category: string | null;
  color: string;
  active: number;
  created_at: string;
}

function safeDate(value: string, fallback: string): string {
  try {
    return toDateOnly(value);
  } catch {
    return toDateOnly(fallback);
  }
}

function createNewTables(db: Db): void {
  db.exec(`
    CREATE TABLE users_v2 (
      id                            TEXT PRIMARY KEY,
      email                         TEXT NOT NULL UNIQUE,
      name                          TEXT NOT NULL,
      password_hash                 TEXT,
      created_at                    TEXT NOT NULL,
      email_verified                INTEGER NOT NULL DEFAULT 0,
      verification_token_hash       TEXT,
      verification_token_expires_at TEXT,
      avatar_url                    TEXT,
      reset_token_hash              TEXT,
      reset_token_expires_at        TEXT,
      google_id                     TEXT,
      session_version               INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE accounts (
      id                    TEXT PRIMARY KEY,
      user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name                  TEXT NOT NULL,
      type                  TEXT NOT NULL DEFAULT 'checking'
                            CHECK(type IN ('checking','savings','cash','card','investment','other')),
      initial_balance_cents INTEGER NOT NULL DEFAULT 0,
      color                 TEXT NOT NULL DEFAULT '#6366f1',
      icon                  TEXT NOT NULL DEFAULT '🏦',
      archived              INTEGER NOT NULL DEFAULT 0,
      created_at            TEXT NOT NULL,
      UNIQUE(user_id, name)
    );

    CREATE TABLE user_settings (
      user_id               TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      currency              TEXT NOT NULL DEFAULT 'EUR',
      locale                TEXT NOT NULL DEFAULT 'es',
      month_start_day       INTEGER NOT NULL DEFAULT 1 CHECK(month_start_day BETWEEN 1 AND 28),
      default_account_id    TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      notifications_enabled INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE recurring_rules_v2 (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description  TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),
      type         TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE','SAVING')),
      category_id  TEXT NOT NULL REFERENCES categories(id),
      account_id   TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      start_year   INTEGER NOT NULL,
      start_month  INTEGER NOT NULL,
      end_year     INTEGER,
      end_month    INTEGER,
      frequency    TEXT NOT NULL DEFAULT 'monthly'
                   CHECK(frequency IN ('monthly','bimonthly','quarterly','yearly')),
      active       INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE transactions_v2 (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id        TEXT NOT NULL REFERENCES accounts(id),
      category_id       TEXT NOT NULL REFERENCES categories(id),
      year              INTEGER NOT NULL,
      month             INTEGER NOT NULL,
      date              TEXT NOT NULL,
      description       TEXT NOT NULL,
      description_key   TEXT NOT NULL,
      amount_cents      INTEGER NOT NULL CHECK(amount_cents >= 0),
      type              TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE','SAVING')),
      notes             TEXT,
      recurring_rule_id TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
      import_hash       TEXT,
      created_at        TEXT NOT NULL
    );

    CREATE TABLE custom_alerts_v2 (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      metric      TEXT NOT NULL,
      operator    TEXT NOT NULL CHECK(operator IN ('gte','lte')),
      threshold   REAL NOT NULL,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      color       TEXT NOT NULL DEFAULT '#6366f1',
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE refresh_tokens_v2 (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE transfers (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_account_id TEXT NOT NULL REFERENCES accounts(id),
      to_account_id   TEXT NOT NULL REFERENCES accounts(id),
      amount_cents    INTEGER NOT NULL CHECK(amount_cents > 0),
      date            TEXT NOT NULL,
      description     TEXT,
      created_at      TEXT NOT NULL
    );

    CREATE TABLE category_budgets (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id  TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      created_at   TEXT NOT NULL,
      UNIQUE(user_id, category_id)
    );

    CREATE TABLE goals (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      target_cents INTEGER NOT NULL CHECK(target_cents > 0),
      target_date  TEXT,
      category_id  TEXT NOT NULL REFERENCES categories(id),
      icon         TEXT NOT NULL DEFAULT '🎯',
      color        TEXT NOT NULL DEFAULT '#10b981',
      archived     INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL
    );
  `);
}

function migrateUsers(db: Db, now: Date): string[] {
  const users = db.prepare('SELECT * FROM users').all() as OldUser[];
  const insert = db.prepare(`
    INSERT INTO users_v2 (id, email, name, password_hash, created_at, email_verified,
      verification_token_hash, verification_token_expires_at, avatar_url, reset_token_hash,
      reset_token_expires_at, google_id, session_version)
    VALUES (@id, @email, @name, @passwordHash, @createdAt, @emailVerified, @verificationHash,
      @verificationExpires, @avatarUrl, @resetHash, @resetExpires, @googleId, 0)
  `);
  for (const u of users) {
    insert.run({
      id: u.id,
      email: u.email.trim().toLowerCase(),
      name: u.name,
      passwordHash: u.password_hash ? u.password_hash : null,
      createdAt: u.created_at,
      emailVerified: u.email_verified ? 1 : 0,
      verificationHash: u.verification_token ? sha256(u.verification_token) : null,
      // Pending verifications get a fresh 24 h window instead of never expiring.
      verificationExpires: u.verification_token
        ? new Date(now.getTime() + VERIFICATION_TTL_MS).toISOString()
        : null,
      avatarUrl: u.avatar_url,
      resetHash: u.reset_token ? sha256(u.reset_token) : null,
      resetExpires: u.reset_token ? u.reset_token_expires_at : null,
      googleId: u.google_id,
    });
  }
  return users.map((u) => u.id);
}

function createDefaultAccounts(db: Db, userIds: string[], now: Date): Map<string, string> {
  const accountByUser = new Map<string, string>();
  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, user_id, name, type, initial_balance_cents, color, icon, archived, created_at)
    VALUES (?, ?, 'Principal', 'checking', 0, '#6366f1', '🏦', 0, ?)
  `);
  const insertSettings = db.prepare(`
    INSERT INTO user_settings (user_id, currency, locale, month_start_day, default_account_id, notifications_enabled)
    VALUES (?, 'EUR', 'es', 1, ?, 0)
  `);
  for (const userId of userIds) {
    const accountId = randomUUID();
    insertAccount.run(accountId, userId, now.toISOString());
    insertSettings.run(userId, accountId);
    accountByUser.set(userId, accountId);
  }
  return accountByUser;
}

/** Map "userId|name" → category id, creating categories referenced only by name. */
function buildCategoryIndex(db: Db): (userId: string, name: string) => string {
  const index = new Map<string, string>();
  const rows = db.prepare('SELECT id, user_id, name FROM categories').all() as {
    id: string;
    user_id: string;
    name: string;
  }[];
  for (const r of rows) index.set(`${r.user_id}|${r.name}`, r.id);
  const insert = db.prepare(
    "INSERT INTO categories (id, user_id, name, color, icon) VALUES (?, ?, ?, '#94a3b8', '📦')"
  );
  return (userId, rawName) => {
    const name = (rawName ?? '').trim() || 'Otros';
    const key = `${userId}|${name}`;
    const existing = index.get(key);
    if (existing) return existing;
    const id = randomUUID();
    insert.run(id, userId, name);
    index.set(key, id);
    return id;
  };
}

function migrateRules(
  db: Db,
  categoryId: (userId: string, name: string) => string,
  userIds: Set<string>
): Set<string> {
  const rules = db.prepare('SELECT * FROM recurring_rules').all() as OldRule[];
  const insert = db.prepare(`
    INSERT INTO recurring_rules_v2 (id, user_id, description, amount_cents, type, category_id,
      account_id, start_year, start_month, end_year, end_month, frequency, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
  `);
  const kept = new Set<string>();
  for (const r of rules) {
    if (!userIds.has(r.user_id)) continue;
    insert.run(
      r.id,
      r.user_id,
      r.description,
      Math.abs(toCents(r.amount)),
      r.type,
      categoryId(r.user_id, r.category),
      r.start_year,
      r.start_month,
      r.end_year,
      r.end_month,
      r.frequency === 'bimonthly' ? 'bimonthly' : 'monthly',
      r.active ? 1 : 0,
      r.created_at
    );
    kept.add(r.id);
  }
  return kept;
}

function migrateTransactions(
  db: Db,
  categoryId: (userId: string, name: string) => string,
  accountByUser: Map<string, string>,
  ruleIds: Set<string>
): void {
  const rows = db.prepare('SELECT * FROM transactions').all() as OldTransaction[];
  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions_v2 (id, user_id, account_id, category_id, year, month, date,
      description, description_key, amount_cents, type, notes, recurring_rule_id, import_hash, created_at)
    VALUES (@id, @userId, @accountId, @categoryId, @year, @month, @date, @description,
      @descriptionKey, @amountCents, @type, @notes, @ruleId, NULL, @createdAt)
  `);
  for (const t of rows) {
    const accountId = accountByUser.get(t.user_id);
    if (!accountId) continue; // orphan row of a user that no longer exists
    const date = safeDate(t.date, t.created_at);
    const period = periodOfDate(date, 1);
    insert.run({
      id: t.id,
      userId: t.user_id,
      accountId,
      categoryId: categoryId(t.user_id, t.category),
      year: period.year,
      month: period.month,
      date,
      description: t.description,
      descriptionKey: normalizeText(t.description),
      amountCents: Math.abs(toCents(t.amount)),
      type: t.type,
      notes: t.notes,
      ruleId: t.recurring_rule_id && ruleIds.has(t.recurring_rule_id) ? t.recurring_rule_id : null,
      createdAt: t.created_at,
    });
  }
}

function migrateAlerts(
  db: Db,
  categoryId: (userId: string, name: string) => string,
  userIds: Set<string>
): void {
  const alerts = db.prepare('SELECT * FROM custom_alerts').all() as OldAlert[];
  const insert = db.prepare(`
    INSERT INTO custom_alerts_v2 (id, user_id, name, metric, operator, threshold, category_id, color, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const a of alerts) {
    if (!userIds.has(a.user_id)) continue;
    insert.run(
      a.id,
      a.user_id,
      a.name,
      a.metric,
      a.operator,
      a.threshold,
      a.category ? categoryId(a.user_id, a.category) : null,
      a.color,
      a.active ? 1 : 0,
      a.created_at
    );
  }
}

function migrateRefreshTokens(db: Db, userIds: Set<string>): void {
  const rows = db.prepare('SELECT * FROM refresh_tokens').all() as {
    id: string;
    user_id: string;
    token: string;
    expires_at: string;
    created_at: string;
  }[];
  const insert = db.prepare(
    'INSERT OR IGNORE INTO refresh_tokens_v2 (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  for (const r of rows) {
    if (!userIds.has(r.user_id)) continue;
    insert.run(r.id, r.user_id, sha256(r.token), r.expires_at, r.created_at);
  }
}

function swapTables(db: Db): void {
  db.exec(`
    DROP TABLE transactions;
    ALTER TABLE transactions_v2 RENAME TO transactions;
    DROP TABLE recurring_rules;
    ALTER TABLE recurring_rules_v2 RENAME TO recurring_rules;
    DROP TABLE custom_alerts;
    ALTER TABLE custom_alerts_v2 RENAME TO custom_alerts;
    DROP TABLE refresh_tokens;
    ALTER TABLE refresh_tokens_v2 RENAME TO refresh_tokens;
    DROP TABLE users;
    ALTER TABLE users_v2 RENAME TO users;
    DELETE FROM categories WHERE user_id NOT IN (SELECT id FROM users);
    DELETE FROM monthly_budgets WHERE user_id NOT IN (SELECT id FROM users);
  `);
}

function createIndexes(db: Db): void {
  db.exec(`
    CREATE INDEX idx_users_google_id          ON users(google_id);
    CREATE INDEX idx_users_verification_token ON users(verification_token_hash);
    CREATE INDEX idx_users_reset_token        ON users(reset_token_hash);
    CREATE INDEX idx_refresh_tokens_user      ON refresh_tokens(user_id);
    CREATE INDEX idx_accounts_user            ON accounts(user_id);
    CREATE INDEX idx_categories_user          ON categories(user_id);
    CREATE INDEX idx_transactions_user_period ON transactions(user_id, year, month);
    CREATE INDEX idx_transactions_user_date   ON transactions(user_id, date);
    CREATE INDEX idx_transactions_user_desc   ON transactions(user_id, description_key);
    CREATE INDEX idx_transactions_category    ON transactions(category_id);
    CREATE INDEX idx_transactions_account     ON transactions(account_id);
    CREATE UNIQUE INDEX idx_transactions_rule_period
      ON transactions(recurring_rule_id, year, month) WHERE recurring_rule_id IS NOT NULL;
    CREATE UNIQUE INDEX idx_transactions_import_hash
      ON transactions(user_id, import_hash) WHERE import_hash IS NOT NULL;
    CREATE INDEX idx_recurring_rules_user     ON recurring_rules(user_id);
    CREATE INDEX idx_custom_alerts_user       ON custom_alerts(user_id);
    CREATE INDEX idx_transfers_user_date      ON transfers(user_id, date);
    CREATE INDEX idx_transfers_from           ON transfers(from_account_id);
    CREATE INDEX idx_transfers_to             ON transfers(to_account_id);
    CREATE INDEX idx_goals_user               ON goals(user_id);
  `);
}

export const coreV2: Migration = {
  version: 2,
  name: 'cents, category ids, accounts, settings, budgets, goals, hashed tokens',
  up(db) {
    const now = new Date();
    createNewTables(db);
    const userIdList = migrateUsers(db, now);
    const userIds = new Set(userIdList);
    const accountByUser = createDefaultAccounts(db, userIdList, now);
    const categoryId = buildCategoryIndex(db);
    const ruleIds = migrateRules(db, categoryId, userIds);
    migrateTransactions(db, categoryId, accountByUser, ruleIds);
    migrateAlerts(db, categoryId, userIds);
    migrateRefreshTokens(db, userIds);
    swapTables(db);
    createIndexes(db);
  },
};
