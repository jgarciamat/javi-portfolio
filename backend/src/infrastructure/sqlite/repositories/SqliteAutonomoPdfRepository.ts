import { AutonomoPdfRepository } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteAutonomoPdfRepository implements AutonomoPdfRepository {
  constructor(private readonly db: Db) {}

  count(userId: string): number {
    const row = this.db.prepare('SELECT uses FROM autonomo_pdfs WHERE user_id = ?').get(userId) as
      { uses: number } | undefined;
    return row?.uses ?? 0;
  }

  increment(userId: string): number {
    this.db
      .prepare(
        `INSERT INTO autonomo_pdfs (user_id, uses) VALUES (?, 1)
         ON CONFLICT(user_id) DO UPDATE SET uses = uses + 1`
      )
      .run(userId);
    return this.count(userId);
  }
}
