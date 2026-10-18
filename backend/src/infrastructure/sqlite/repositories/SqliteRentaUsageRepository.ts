import { RentaUsageRepository } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteRentaUsageRepository implements RentaUsageRepository {
  constructor(private readonly db: Db) {}

  count(userId: string, campaign: number): number {
    const row = this.db
      .prepare('SELECT uses FROM renta_campaign_uses WHERE user_id = ? AND campaign = ?')
      .get(userId, campaign) as { uses: number } | undefined;
    return row?.uses ?? 0;
  }

  increment(userId: string, campaign: number): number {
    this.db
      .prepare(
        `INSERT INTO renta_campaign_uses (user_id, campaign, uses) VALUES (?, ?, 1)
         ON CONFLICT(user_id, campaign) DO UPDATE SET uses = uses + 1`
      )
      .run(userId, campaign);
    return this.count(userId, campaign);
  }
}
