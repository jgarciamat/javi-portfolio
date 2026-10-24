import { NotFoundError, ValidationError } from '@domain/errors';
import {
  CategoryRuleRepository,
  LeakDecisionRepository,
  RecurringRuleRepository,
  TransactionRepository,
} from '@domain/ports/repositories';
import { Clock, FunnelRecorder } from '@domain/ports/services';
import {
  ALLOWED_DECISIONS,
  LEAK_MAX_ROWS,
  LeakCoverage,
  LeakDecisionStatus,
  LeakFinding,
  LeakReport,
  LeakSummary,
  detectMoneyLeaks,
  merchantKey,
  summarizeLeaks,
  windowStart,
} from '@domain/services/money-leaks';
import { FREE_LEAKS_SHOWN } from '@domain/services/plans';
import { todayDateOnly } from '@domain/shared/period';
import { EntitlementService } from '@application/billing/EntitlementService';

/** «Tu dinero perdido» as the screen shows it; on the free plan only part of the findings. */
export interface MoneyLeaksView extends LeakSummary {
  coverage: LeakCoverage;
  findings: LeakFinding[];
  /** True on the free plan: only the most expensive findings (and every double charge) come. */
  locked: boolean;
}

/** Decisions each user keeps at most (the oldest go first). */
export const MAX_LEAK_DECISIONS = 500;
/** A decision on a finding that has not been seen for this long is forgotten. */
const FORGET_AFTER_DAYS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

const foundBucket = (count: number): string => (count <= 2 ? '1-2' : count <= 5 ? '3-5' : '6+');

/**
 * «Tu dinero perdido» (docs/disenos/dinero-perdido-y-fecha-meta.md): the findings are computed
 * on every read from the movements of the last 25 months, deterministically and without AI;
 * only the user's decisions are stored. The whole figure is for everyone; the free plan sees in
 * full the most expensive findings and every possible double charge, the rest needs Premium.
 */
export class MoneyLeakService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly rules: RecurringRuleRepository,
    private readonly categoryRules: CategoryRuleRepository,
    private readonly decisions: LeakDecisionRepository,
    private readonly entitlements: EntitlementService,
    private readonly funnel: FunnelRecorder,
    private readonly clock: Clock
  ) {}

  /** The findings with the decisions applied; checked cancellations are saved as recovered. */
  private analyse(userId: string): LeakReport {
    const now = this.clock.now();
    const today = todayDateOnly(now);
    const aliases = this.categoryRules.listByUser(userId).map((r) => r.pattern);
    const coveredKeys = new Set(
      this.rules
        .listByUser(userId)
        .filter((r) => r.active)
        .map((r) => merchantKey(r.description, aliases))
        .filter((key): key is string => key !== null)
    );
    const decisions = this.decisions.listByUser(userId);
    const report = detectMoneyLeaks(
      this.transactions.listSince(userId, windowStart(today), LEAK_MAX_ROWS),
      { today, coveredKeys, aliases, decisions }
    );

    const byId = new Map(decisions.map((d) => [d.findingId, d]));
    for (const finding of report.findings) {
      const decision = byId.get(finding.id);
      if (finding.status === 'recovered' && decision?.status === 'cancel') {
        this.decisions.save(
          userId,
          { ...decision, status: 'recovered', recoveredAt: now.toISOString() },
          MAX_LEAK_DECISIONS
        );
        this.funnel.record('dp_recovered', { detail: finding.kind });
      }
    }
    const shown = new Set(report.findings.map((f) => f.id));
    const forgotten = decisions.filter(
      (d) =>
        !shown.has(d.findingId) &&
        now.getTime() - Date.parse(d.decidedAt) > FORGET_AFTER_DAYS * DAY_MS
    );
    if (forgotten.length) {
      this.decisions.deleteMany(
        userId,
        forgotten.map((d) => d.findingId)
      );
    }
    return report;
  }

  /** The findings the plan shows: on the free one the 3 most expensive plus double charges. */
  private visible(
    userId: string,
    findings: LeakFinding[]
  ): { list: LeakFinding[]; locked: boolean } {
    const locked = !this.entitlements.limits(userId).features.insights;
    if (!locked) return { list: findings, locked };
    const priciest = findings
      .filter((f) => f.status === 'new' && f.kind !== 'duplicate')
      .sort((a, b) => b.annualCents - a.annualCents || b.priority - a.priority)
      .slice(0, FREE_LEAKS_SHOWN);
    const shown = new Set(priciest.map((f) => f.id));
    return {
      list: findings.filter((f) => f.status !== 'new' || f.kind === 'duplicate' || shown.has(f.id)),
      locked,
    };
  }

  view(userId: string): MoneyLeaksView {
    const report = this.analyse(userId);
    // The figures are the real ones: the plan only cuts the list, after adding up.
    const summary = summarizeLeaks(report.findings);
    const { list, locked } = this.visible(userId, report.findings);
    if (summary.count > 0) this.funnel.record('dp_found', { detail: foundBucket(summary.count) });
    return { ...summary, coverage: report.coverage, findings: list, locked };
  }

  /**
   * Saves what the user decided about a finding they can see now: an id that is not among the
   * visible findings (another user's, made up, or hidden by the free plan) is not found.
   */
  decide(
    userId: string,
    id: string,
    status: Exclude<LeakDecisionStatus, 'recovered'>
  ): LeakFinding {
    const report = this.analyse(userId);
    const finding = this.visible(userId, report.findings).list.find((f) => f.id === id);
    if (!finding) throw new NotFoundError('Hallazgo no encontrado', 'LEAK_NOT_FOUND');
    if (!ALLOWED_DECISIONS[finding.kind].includes(status)) {
      throw new ValidationError('Esa decisión no vale para este hallazgo', 'LEAK_STATUS_INVALID');
    }
    this.decisions.save(
      userId,
      {
        findingId: finding.id,
        fingerprint: finding.fingerprint,
        kind: finding.kind,
        status,
        annualCents: finding.annualCents || finding.oneOffCents,
        decidedAt: this.clock.now().toISOString(),
        recoveredAt: null,
      },
      MAX_LEAK_DECISIONS
    );
    const event = status === 'keep' || status === 'cancel' ? 'dp_confirm' : 'dp_ignore';
    this.funnel.record(event, { detail: `${status}:${finding.kind}` });
    return { ...finding, status };
  }

  /** «Undo»: the finding goes back to the ones to check. */
  undo(userId: string, id: string): void {
    this.decisions.delete(userId, id);
  }
}
