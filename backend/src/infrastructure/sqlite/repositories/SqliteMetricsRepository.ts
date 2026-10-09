import { Clock, MetricName, MetricsRecorder } from '@domain/ports/services';
import { Db } from '../database';

export interface MetricRow {
  name: string;
  count: number;
}

/** Daily counters stored in SQLite. */
export class SqliteMetricsRepository implements MetricsRecorder {
  constructor(private readonly db: Db, private readonly clock: Clock) {}

  record(name: MetricName): void {
    const day = this.clock.now().toISOString().slice(0, 10);
    this.db
      .prepare(
        `INSERT INTO metrics (day, name, count) VALUES (?, ?, 1)
         ON CONFLICT (day, name) DO UPDATE SET count = count + 1`
      )
      .run(day, name);
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
