import {
  SplitExpenseRecord,
  SplitGroup,
  SplitMember,
  SplitRepository,
} from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteSplitRepository implements SplitRepository {
  constructor(private readonly db: Db) {}

  listGroups(userId: string): SplitGroup[] {
    return this.db
      .prepare(
        'SELECT id, user_id AS userId, name, created_at AS createdAt FROM split_groups WHERE user_id = ? ORDER BY created_at DESC'
      )
      .all(userId) as SplitGroup[];
  }

  findGroup(userId: string, id: string): SplitGroup | null {
    return (
      (this.db
        .prepare(
          'SELECT id, user_id AS userId, name, created_at AS createdAt FROM split_groups WHERE user_id = ? AND id = ?'
        )
        .get(userId, id) as SplitGroup | undefined) ?? null
    );
  }

  createGroup(group: SplitGroup, members: SplitMember[]): void {
    this.db
      .prepare('INSERT INTO split_groups (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
      .run(group.id, group.userId, group.name, group.createdAt);
    const insert = this.db.prepare(
      'INSERT INTO split_members (id, group_id, name) VALUES (?, ?, ?)'
    );
    for (const m of members) insert.run(m.id, group.id, m.name);
  }

  deleteGroup(userId: string, id: string): boolean {
    return (
      this.db.prepare('DELETE FROM split_groups WHERE user_id = ? AND id = ?').run(userId, id)
        .changes > 0
    );
  }

  members(groupId: string): SplitMember[] {
    return this.db
      .prepare('SELECT id, name FROM split_members WHERE group_id = ? ORDER BY rowid')
      .all(groupId) as SplitMember[];
  }

  expenses(groupId: string): SplitExpenseRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, description, amount_cents AS amountCents, paid_by AS paidBy, date, settlement
           FROM split_expenses WHERE group_id = ? ORDER BY date DESC, created_at DESC`
      )
      .all(groupId) as (Omit<SplitExpenseRecord, 'settlement' | 'shares'> & {
      settlement: number;
    })[];
    const shares = this.db
      .prepare(
        `SELECT s.expense_id AS expenseId, s.member_id AS memberId, s.share_cents AS shareCents
           FROM split_shares s JOIN split_expenses e ON e.id = s.expense_id WHERE e.group_id = ?`
      )
      .all(groupId) as { expenseId: string; memberId: string; shareCents: number }[];
    return rows.map((r) => ({
      ...r,
      settlement: r.settlement === 1,
      shares: shares
        .filter((s) => s.expenseId === r.id)
        .map(({ memberId, shareCents }) => ({ memberId, shareCents })),
    }));
  }

  addExpense(groupId: string, e: SplitExpenseRecord, createdAt: string): void {
    this.db
      .prepare(
        `INSERT INTO split_expenses (id, group_id, description, amount_cents, paid_by, date, settlement, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        e.id,
        groupId,
        e.description,
        e.amountCents,
        e.paidBy,
        e.date,
        e.settlement ? 1 : 0,
        createdAt
      );
    const insert = this.db.prepare(
      'INSERT INTO split_shares (expense_id, member_id, share_cents) VALUES (?, ?, ?)'
    );
    for (const s of e.shares) insert.run(e.id, s.memberId, s.shareCents);
  }

  deleteExpense(groupId: string, expenseId: string): boolean {
    return (
      this.db
        .prepare('DELETE FROM split_expenses WHERE group_id = ? AND id = ?')
        .run(groupId, expenseId).changes > 0
    );
  }
}
