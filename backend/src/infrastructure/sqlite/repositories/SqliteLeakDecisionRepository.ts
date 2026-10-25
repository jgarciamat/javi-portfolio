import { LeakDecisionRepository } from '@domain/ports/repositories';
import { LeakDecision } from '@domain/services/money-leaks';
import { Db, inChunks, placeholders } from '../database';

interface DecisionRow {
  finding_id: string;
  fingerprint: string;
  kind: LeakDecision['kind'];
  status: LeakDecision['status'];
  annual_cents: number;
  decided_at: string;
  recovered_at: string | null;
}

const toDecision = (r: DecisionRow): LeakDecision => ({
  findingId: r.finding_id,
  fingerprint: r.fingerprint,
  kind: r.kind,
  status: r.status,
  annualCents: r.annual_cents,
  decidedAt: r.decided_at,
  recoveredAt: r.recovered_at,
});

/** Decisions on «Tu dinero perdido» (table `money_leak_decisions`, migration 041). */
export class SqliteLeakDecisionRepository implements LeakDecisionRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): LeakDecision[] {
    const rows = this.db
      .prepare('SELECT * FROM money_leak_decisions WHERE user_id = ? ORDER BY decided_at')
      .all(userId) as DecisionRow[];
    return rows.map(toDecision);
  }

  save(userId: string, decision: LeakDecision, max: number): void {
    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO money_leak_decisions
             (user_id, finding_id, fingerprint, kind, status, annual_cents, decided_at, recovered_at)
           VALUES (@userId, @findingId, @fingerprint, @kind, @status, @annualCents, @decidedAt,
                   @recoveredAt)
           ON CONFLICT (user_id, finding_id) DO UPDATE SET
             fingerprint = excluded.fingerprint, kind = excluded.kind, status = excluded.status,
             annual_cents = excluded.annual_cents, decided_at = excluded.decided_at,
             recovered_at = excluded.recovered_at`
        )
        .run({ userId, ...decision });
      this.db
        .prepare(
          `DELETE FROM money_leak_decisions WHERE user_id = ? AND finding_id NOT IN (
             SELECT finding_id FROM money_leak_decisions WHERE user_id = ?
              ORDER BY decided_at DESC, finding_id LIMIT ?)`
        )
        .run(userId, userId, max);
    })();
  }

  delete(userId: string, findingId: string): boolean {
    return (
      this.db
        .prepare('DELETE FROM money_leak_decisions WHERE user_id = ? AND finding_id = ?')
        .run(userId, findingId).changes > 0
    );
  }

  deleteMany(userId: string, findingIds: string[]): void {
    inChunks(findingIds, 500, (chunk) => {
      this.db
        .prepare(
          `DELETE FROM money_leak_decisions WHERE user_id = ? AND finding_id IN (${placeholders(
            chunk.length
          )})`
        )
        .run(userId, ...chunk);
    });
  }
}
