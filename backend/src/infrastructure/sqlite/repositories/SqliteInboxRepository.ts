import { InboxMessage, InboxRepository, InboxStatus } from '@domain/ports/repositories';
import { Db } from '../database';

interface MessageRow {
  id: string;
  received_at: string;
  status: string;
  description: string | null;
  amount_cents: number | null;
}

const KEEP = 50;

export class SqliteInboxRepository implements InboxRepository {
  constructor(private readonly db: Db) {}

  tokenOf(userId: string): string | null {
    const row = this.db.prepare('SELECT token FROM inbox_tokens WHERE user_id = ?').get(userId) as
      { token: string } | undefined;
    return row?.token ?? null;
  }

  userOf(token: string): string | null {
    const row = this.db.prepare('SELECT user_id FROM inbox_tokens WHERE token = ?').get(token) as
      { user_id: string } | undefined;
    return row?.user_id ?? null;
  }

  setToken(userId: string, token: string, at: string): void {
    this.db
      .prepare(
        `INSERT INTO inbox_tokens (user_id, token, created_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET token = excluded.token, created_at = excluded.created_at`
      )
      .run(userId, token, at);
  }

  log(userId: string, m: InboxMessage): void {
    this.db
      .prepare(
        `INSERT INTO inbox_messages (id, user_id, received_at, status, description, amount_cents)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(m.id, userId, m.receivedAt, m.status, m.description, m.amountCents);
    this.db
      .prepare(
        `DELETE FROM inbox_messages WHERE user_id = ? AND id NOT IN (
           SELECT id FROM inbox_messages WHERE user_id = ? ORDER BY received_at DESC, rowid DESC LIMIT ?)`
      )
      .run(userId, userId, KEEP);
  }

  recent(userId: string, limit: number): InboxMessage[] {
    const rows = this.db
      .prepare(
        `SELECT id, received_at, status, description, amount_cents FROM inbox_messages
         WHERE user_id = ? ORDER BY received_at DESC, rowid DESC LIMIT ?`
      )
      .all(userId, limit) as MessageRow[];
    return rows.map((r) => ({
      id: r.id,
      receivedAt: r.received_at,
      status: r.status as InboxStatus,
      description: r.description,
      amountCents: r.amount_cents,
    }));
  }
}
