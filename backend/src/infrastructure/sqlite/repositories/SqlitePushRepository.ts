import { PushRepository, PushSubscriptionRecord } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqlitePushRepository implements PushRepository {
  constructor(private readonly db: Db) {}

  /**
   * An endpoint already saved only changes owner when the keys match too: the same browser
   * subscribed again by whoever signed in on it. Knowing someone's endpoint is not enough.
   */
  save(s: PushSubscriptionRecord, createdAt: string): void {
    this.db
      .prepare(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
         VALUES (@id, @userId, @endpoint, @p256dh, @auth, @createdAt)
         ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh,
           auth = excluded.auth
         WHERE push_subscriptions.user_id = excluded.user_id
            OR (push_subscriptions.p256dh = excluded.p256dh AND push_subscriptions.auth = excluded.auth)`
      )
      .run({ ...s, createdAt });
  }

  remove(userId: string, endpoint: string): void {
    this.db
      .prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
      .run(userId, endpoint);
  }

  removeEndpoint(endpoint: string): void {
    this.db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  }

  listByUser(userId: string): PushSubscriptionRecord[] {
    return this.db
      .prepare(
        'SELECT id, user_id AS userId, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?'
      )
      .all(userId) as PushSubscriptionRecord[];
  }

  subscribedUsers(): string[] {
    return (
      this.db.prepare('SELECT DISTINCT user_id AS id FROM push_subscriptions').all() as {
        id: string;
      }[]
    ).map((r) => r.id);
  }

  claim(userId: string, kind: string, key: string, at: string): boolean {
    return (
      this.db
        .prepare('INSERT OR IGNORE INTO push_log (user_id, kind, key, sent_at) VALUES (?, ?, ?, ?)')
        .run(userId, kind, key, at).changes > 0
    );
  }
}
