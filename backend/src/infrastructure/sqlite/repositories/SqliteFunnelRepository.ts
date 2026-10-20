import { Clock, FunnelDimensions, FunnelEvent, FunnelRecorder } from '@domain/ports/services';
import { OTHER, UNKNOWN } from '@application/analytics/origin';
import { Db } from '../database';

export interface FunnelRow {
  day: string;
  event: string;
  source: string;
  campaign: string;
  detail: string;
  count: number;
}

/**
 * Distinct rows one day may hold. Past it, new combinations are added to `(other)`, so made-up
 * campaigns or guides sent in a loop cannot grow the table.
 */
export const MAX_ROWS_PER_DAY = 1000;

/** Months of counters kept; older days are deleted (docs/analitica.md). */
export const FUNNEL_RETENTION_MONTHS = 25;

/** Anonymous daily funnel counters in SQLite (table `funnel_daily`). */
export class SqliteFunnelRepository implements FunnelRecorder {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
    private readonly logger: Pick<Console, 'warn'> = console
  ) {}

  /** Never throws: a counter that cannot be written must not break the request that counts. */
  record(event: FunnelEvent, dimensions: FunnelDimensions = {}): void {
    try {
      this.increment(event, dimensions);
    } catch (e) {
      this.logger.warn(`[funnel] could not count ${event}: ${(e as Error).message}`);
    }
  }

  private increment(event: FunnelEvent, dimensions: FunnelDimensions): void {
    const day = this.clock.now().toISOString().slice(0, 10);
    const key = {
      day,
      event,
      source: dimensions.source || UNKNOWN,
      campaign: dimensions.campaign ?? '',
      detail: dimensions.detail ?? '',
    };
    this.db.transaction(() => {
      const exists = this.db
        .prepare(
          `SELECT 1 FROM funnel_daily WHERE day = @day AND event = @event AND source = @source
             AND campaign = @campaign AND detail = @detail`
        )
        .get(key);
      if (!exists) {
        const { rows } = this.db
          .prepare('SELECT COUNT(*) AS rows FROM funnel_daily WHERE day = ?')
          .get(day) as { rows: number };
        if (rows >= MAX_ROWS_PER_DAY)
          Object.assign(key, { source: OTHER, campaign: '', detail: '' });
      }
      this.db
        .prepare(
          `INSERT INTO funnel_daily (day, event, source, campaign, detail, count)
           VALUES (@day, @event, @source, @campaign, @detail, 1)
           ON CONFLICT (day, event, source, campaign, detail) DO UPDATE SET count = count + 1`
        )
        .run(key);
    })();
  }

  /** Every counter of the days in [from, to] (YYYY-MM-DD). */
  rows(from: string, to: string): FunnelRow[] {
    return this.db
      .prepare(
        `SELECT day, event, source, campaign, detail, count FROM funnel_daily
         WHERE day >= ? AND day <= ? ORDER BY day, event, source, campaign, detail`
      )
      .all(from, to) as FunnelRow[];
  }

  /** Deletes the days older than the retention period. Returns how many rows went. */
  purgeExpired(): number {
    const limit = new Date(this.clock.now().getTime());
    limit.setUTCMonth(limit.getUTCMonth() - FUNNEL_RETENTION_MONTHS);
    return this.db
      .prepare('DELETE FROM funnel_daily WHERE day < ?')
      .run(limit.toISOString().slice(0, 10)).changes;
  }
}
