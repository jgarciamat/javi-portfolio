import { Migration } from '../migrator';

/**
 * Shared expenses with friends or flatmates: groups of named people, who paid what and how
 * it is split. Settlements are recorded as expenses flagged as such.
 */
export const splitExpenses: Migration = {
  version: 18,
  name: 'split expenses',
  up(db) {
    db.exec(`
      CREATE TABLE split_groups (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_split_groups_user ON split_groups(user_id);

      CREATE TABLE split_members (
        id       TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
        name     TEXT NOT NULL
      );
      CREATE INDEX idx_split_members_group ON split_members(group_id);

      CREATE TABLE split_expenses (
        id           TEXT PRIMARY KEY,
        group_id     TEXT NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
        description  TEXT NOT NULL,
        amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
        paid_by      TEXT NOT NULL REFERENCES split_members(id) ON DELETE CASCADE,
        date         TEXT NOT NULL,
        settlement   INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT NOT NULL
      );
      CREATE INDEX idx_split_expenses_group ON split_expenses(group_id);

      CREATE TABLE split_shares (
        expense_id  TEXT NOT NULL REFERENCES split_expenses(id) ON DELETE CASCADE,
        member_id   TEXT NOT NULL REFERENCES split_members(id) ON DELETE CASCADE,
        share_cents INTEGER NOT NULL CHECK(share_cents >= 0),
        PRIMARY KEY (expense_id, member_id)
      );
    `);
  },
};
