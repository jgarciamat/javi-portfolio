import { CaptureUsageRepository } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteCaptureUsageRepository implements CaptureUsageRepository {
  constructor(private readonly db: Db) {}

  count(userId: string, month: string): number {
    const row = this.db
      .prepare('SELECT uses FROM capture_month_uses WHERE user_id = ? AND month = ?')
      .get(userId, month) as { uses: number } | undefined;
    return row?.uses ?? 0;
  }

  add(userId: string, month: string, uses: number): number {
    this.db
      .prepare(
        `INSERT INTO capture_month_uses (user_id, month, uses) VALUES (?, ?, ?)
         ON CONFLICT(user_id, month) DO UPDATE SET uses = uses + excluded.uses`
      )
      .run(userId, month, uses);
    return this.count(userId, month);
  }
}
