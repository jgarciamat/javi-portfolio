import {
  Clock,
  FunnelEvent,
  FunnelRecorder,
  MetricName,
  MetricsRecorder,
} from '@domain/ports/services';
import { Db } from '../database';

export interface MetricRow {
  name: string;
  count: number;
}

/** Product counters that are also funnel steps: they count in both, without origin. */
const FUNNEL_STEPS: Partial<Record<MetricName, FunnelEvent>> = {
  email_verified: 'email_verified',
  checkout_started: 'checkout_start',
  purchase: 'premium',
  subscription_cancelled: 'cancel',
};

/** Daily counters stored in SQLite. */
export class SqliteMetricsRepository implements MetricsRecorder {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
    private readonly funnel?: FunnelRecorder
  ) {}

  record(name: MetricName): void {
    const day = this.clock.now().toISOString().slice(0, 10);
    this.db
      .prepare(
        `INSERT INTO metrics (day, name, count) VALUES (?, ?, 1)
         ON CONFLICT (day, name) DO UPDATE SET count = count + 1`
      )
      .run(day, name);
    const step = FUNNEL_STEPS[name];
    if (step) this.funnel?.record(step);
  }

  /** Totals per counter for the days in [from, to] (YYYY-MM-DD). */
  totals(from: string, to: string): MetricRow[] {
    return this.db
      .prepare(
        `SELECT name, SUM(count) AS count FROM metrics
         WHERE day >= ? AND day <= ? GROUP BY name ORDER BY name`
      )
      .all(from, to) as MetricRow[];
  }
}
