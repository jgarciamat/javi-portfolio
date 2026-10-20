import { TrialNoticeCandidate, TrialNoticeRepository } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteTrialNoticeRepository implements TrialNoticeRepository {
  constructor(private readonly db: Db) {}

  candidates(from: string, to: string): TrialNoticeCandidate[] {
    return this.db
      .prepare(
        `SELECT u.id AS userId, u.email AS email, u.name AS name,
                COALESCE(s.locale, 'es') AS locale, u.email_verified AS emailVerified,
                b.trial_ends_at AS trialEndsAt
           FROM subscriptions b
           JOIN users u ON u.id = b.user_id
           LEFT JOIN user_settings s ON s.user_id = b.user_id
          WHERE b.source = 'trial' AND b.lifetime = 0 AND b.cancel_at_period_end = 0
            AND b.status IN ('none', 'trialing')
            AND b.trial_ends_at >= @from AND b.trial_ends_at <= @to
            AND COALESCE(s.trial_notices, 1) = 1`
      )
      .all({ from, to })
      .map((r) => {
        const row = r as Omit<TrialNoticeCandidate, 'emailVerified'> & { emailVerified: number };
        return { ...row, emailVerified: row.emailVerified === 1 };
      });
  }

  claim(userId: string, kind: string, at: string): boolean {
    return (
      this.db
        .prepare('INSERT OR IGNORE INTO trial_notice_log (user_id, kind, sent_at) VALUES (?, ?, ?)')
        .run(userId, kind, at).changes > 0
    );
  }

  release(userId: string, kind: string): void {
    this.db
      .prepare('DELETE FROM trial_notice_log WHERE user_id = ? AND kind = ?')
      .run(userId, kind);
  }
}
