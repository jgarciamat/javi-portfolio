import { AutonomoUsageRepository, QuarterDraftRecord } from '@domain/ports/repositories';
import { Db } from '../database';

const WHERE = 'WHERE user_id = ? AND year = ? AND quarter = ?';

export class SqliteAutonomoUsageRepository implements AutonomoUsageRepository {
  constructor(private readonly db: Db) {}

  count(userId: string, year: number, quarter: number): number {
    return this.record(userId, year, quarter).uses;
  }

  record(userId: string, year: number, quarter: number): QuarterDraftRecord {
    const row = this.db
      .prepare(`SELECT uses, territory, territory_extra FROM autonomo_quarter_drafts ${WHERE}`)
      .get(userId, year, quarter) as
      { uses: number; territory: string | null; territory_extra: number } | undefined;
    return {
      uses: row?.uses ?? 0,
      territory: row?.territory ?? null,
      territoryExtra: row?.territory_extra === 1,
    };
  }

  increment(userId: string, year: number, quarter: number, territory = 'general'): number {
    this.db
      .prepare(
        `INSERT INTO autonomo_quarter_drafts (user_id, year, quarter, uses, territory)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(user_id, year, quarter) DO UPDATE
         SET uses = uses + 1, territory = excluded.territory`
      )
      .run(userId, year, quarter, territory);
    return this.count(userId, year, quarter);
  }

  useTerritoryExtra(userId: string, year: number, quarter: number, territory: string): void {
    this.db
      .prepare(`UPDATE autonomo_quarter_drafts SET territory_extra = 1, territory = ? ${WHERE}`)
      .run(territory, userId, year, quarter);
  }
}
