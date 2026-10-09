import {
  HouseholdInviteRecord,
  HouseholdMemberRecord,
  HouseholdRepository,
} from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteHouseholdRepository implements HouseholdRepository {
  constructor(private readonly db: Db) {}

  ownerOf(memberId: string): string | null {
    const row = this.db
      .prepare('SELECT owner_id FROM household_members WHERE member_id = ?')
      .get(memberId) as { owner_id: string } | undefined;
    return row?.owner_id ?? null;
  }

  membersOf(ownerId: string): HouseholdMemberRecord[] {
    const rows = this.db
      .prepare(
        'SELECT member_id, joined_at FROM household_members WHERE owner_id = ? ORDER BY joined_at'
      )
      .all(ownerId) as { member_id: string; joined_at: string }[];
    return rows.map((r) => ({ memberId: r.member_id, joinedAt: r.joined_at }));
  }

  addMember(memberId: string, ownerId: string, joinedAt: string): void {
    this.db
      .prepare('INSERT INTO household_members (member_id, owner_id, joined_at) VALUES (?, ?, ?)')
      .run(memberId, ownerId, joinedAt);
  }

  removeMember(memberId: string): boolean {
    return (
      this.db.prepare('DELETE FROM household_members WHERE member_id = ?').run(memberId).changes > 0
    );
  }

  saveInvite(ownerId: string, codeHash: string, createdAt: string, expiresAt: string): void {
    this.db
      .prepare(
        `INSERT INTO household_invites (owner_id, code_hash, created_at, expires_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (owner_id) DO UPDATE SET
           code_hash = excluded.code_hash,
           created_at = excluded.created_at,
           expires_at = excluded.expires_at`
      )
      .run(ownerId, codeHash, createdAt, expiresAt);
  }

  findInvite(codeHash: string): HouseholdInviteRecord | null {
    const row = this.db
      .prepare('SELECT owner_id, expires_at FROM household_invites WHERE code_hash = ?')
      .get(codeHash) as { owner_id: string; expires_at: string } | undefined;
    return row ? { ownerId: row.owner_id, expiresAt: row.expires_at } : null;
  }

  pendingInvite(ownerId: string): HouseholdInviteRecord | null {
    const row = this.db
      .prepare('SELECT owner_id, expires_at FROM household_invites WHERE owner_id = ?')
      .get(ownerId) as { owner_id: string; expires_at: string } | undefined;
    return row ? { ownerId: row.owner_id, expiresAt: row.expires_at } : null;
  }

  deleteInvite(ownerId: string): void {
    this.db.prepare('DELETE FROM household_invites WHERE owner_id = ?').run(ownerId);
  }
}
