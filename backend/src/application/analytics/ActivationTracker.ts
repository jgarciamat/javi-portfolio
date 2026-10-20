import { FunnelRecorder } from '@domain/ports/services';
import { FIRST_STEPS_GOALS, FirstStepId } from '@application/referrals/ReferralService';

/** How many items of one first-step kind the user has (movements, budgets, goals, rules). */
export type FirstStepCount = (userId: string, step: FirstStepId) => number;

const STEPS = Object.keys(FIRST_STEPS_GOALS) as FirstStepId[];

/**
 * Counts the activation steps in the funnel without keeping anything per user: it compares how
 * many items of a kind there were before and after a creation, so a step counts on the day its
 * goal is crossed. Deleting and creating again may count a step twice (accepted: it is rare and
 * the alternative is a per-user flag).
 */
export class ActivationTracker {
  constructor(
    private readonly funnel: FunnelRecorder,
    private readonly count: FirstStepCount
  ) {}

  /** Runs a creation and counts the steps it completes. */
  around<T>(userId: string, step: FirstStepId, create: () => T): T {
    const before = this.before(userId, step);
    const result = create();
    this.after(userId, step, before);
    return result;
  }

  /** Before creating: what there is now. */
  before(userId: string, step: FirstStepId): number {
    return this.count(userId, step);
  }

  /** After creating: counts the first movement, the step reached and the activation, if any. */
  after(userId: string, step: FirstStepId, before: number): void {
    const now = this.count(userId, step);
    if (step === 'movements' && before === 0 && now > 0) this.funnel.record('first_transaction');
    const goal = FIRST_STEPS_GOALS[step];
    if (before >= goal || now < goal) return;
    this.funnel.record('activation_step', { detail: step });
    const others = STEPS.filter((s) => s !== step);
    if (others.every((s) => this.count(userId, s) >= FIRST_STEPS_GOALS[s])) {
      this.funnel.record('activation_done');
    }
  }
}
