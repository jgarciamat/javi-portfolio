import { Migration } from '../migrator';

/**
 * Shared household: a user (the owner) lets another user (the member) work on the same
 * data. The member's own data stays untouched and comes back when they leave.
 * One pending invitation per owner, stored hashed.
 */
export const household: Migration = {
  version: 10,
  name: 'shared household',
  up(db) {
    db.exec(`
      CREATE TABLE household_members (
        member_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        owner_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TEXT NOT NULL
      );
      CREATE INDEX idx_household_members_owner ON household_members(owner_id);

      CREATE TABLE household_invites (
        owner_id   TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        code_hash  TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
    `);
  },
};
