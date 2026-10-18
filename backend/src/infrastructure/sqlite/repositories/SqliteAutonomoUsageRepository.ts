import { AutonomoUsageRepository } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteAutonomoUsageRepository implements AutonomoUsageRepository {
  constructor(private readonly db: Db) {}

  count(userId: string, year: number, quarter: number): number {
    const row = this.db
      .prepare(
        'SELECT uses FROM autonomo_quarter_drafts WHERE user_id = ? AND year = ? AND quarter = ?'
      )
      .get(userId, year, quarter) as { uses: number } | undefined;
    return row?.uses ?? 0;
  }

  increment(userId: string, year: number, quarter: number): number {
    this.db
      .prepare(
        `INSERT INTO autonomo_quarter_drafts (user_id, year, quarter, uses) VALUES (?, ?, ?, 1)
         ON CONFLICT(user_id, year, quarter) DO UPDATE SET uses = uses + 1`
      )
      .run(userId, year, quarter);
    return this.count(userId, year, quarter);
  }
}
