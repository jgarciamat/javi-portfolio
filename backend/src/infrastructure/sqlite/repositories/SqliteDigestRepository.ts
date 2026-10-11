import { DigestRecipient, DigestRepository } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteDigestRepository implements DigestRepository {
  constructor(private readonly db: Db) {}

  due(notSentSince: string): DigestRecipient[] {
    return this.db
      .prepare(
        `SELECT u.id AS userId, u.email AS email, u.name AS name, s.locale AS locale,
                s.currency AS currency
           FROM user_settings s JOIN users u ON u.id = s.user_id
          WHERE s.weekly_digest = 1 AND u.email_verified = 1
            AND (s.last_digest_at IS NULL OR s.last_digest_at < ?)`
      )
      .all(notSentSince) as DigestRecipient[];
  }

  markSent(userId: string, at: string): void {
    this.db
      .prepare('UPDATE user_settings SET last_digest_at = ? WHERE user_id = ?')
      .run(at, userId);
  }
}
