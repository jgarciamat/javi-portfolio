import { ImportUsageRepository } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteImportUsageRepository implements ImportUsageRepository {
  constructor(private readonly db: Db) {}

  count(userId: string): number {
    const row = this.db.prepare('SELECT uses FROM import_uses WHERE user_id = ?').get(userId) as
      | { uses: number }
      | undefined;
    return row?.uses ?? 0;
  }

  increment(userId: string): number {
    this.db
      .prepare(
        `INSERT INTO import_uses (user_id, uses) VALUES (?, 1)
         ON CONFLICT(user_id) DO UPDATE SET uses = uses + 1`
      )
      .run(userId);
    return this.count(userId);
  }
}
