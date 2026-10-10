import { AiUsageRepository, UnitOfWork } from '@domain/ports/repositories';
import { AiUsage, Clock } from '@domain/ports/services';
import { EntitlementService } from '@application/billing/EntitlementService';

export type AiDenial = 'premium_required' | 'quota' | 'budget';

export interface AiQuota {
  used: number;
  quota: number;
}

/** Cloudflare's free allocation resets at 00:00 UTC. */
const utcDay = (d: Date): string => d.toISOString().slice(0, 10);
const utcMonth = (d: Date): string => d.toISOString().slice(0, 7);

/**
 * Keeps the AI free to run: only Premium users, a monthly number of analyses
 * per user and a global daily budget of neurons below the free allocation.
 */
export class AiAllowance {
  constructor(
    private readonly usage: AiUsageRepository,
    private readonly entitlements: EntitlementService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly dailyNeuronBudget: number
  ) {}

  quota(userId: string): AiQuota {
    return {
      used: this.usage.userCalls(userId, utcMonth(this.clock.now())),
      quota: this.entitlements.limits(userId).aiMonthlyQuota,
    };
  }

  /** null when the call may go ahead. `analysis` calls count towards the user's monthly quota. */
  check(userId: string, kind: 'analysis' | 'background'): AiDenial | null {
    const limits = this.entitlements.limits(userId);
    // Background work (statement categorisation) is Premium; analyses follow the monthly quota,
    // which free users also have (one) so they can see what the AI adds.
    if (kind === 'background' ? !limits.features.aiAdvisor : limits.aiMonthlyQuota <= 0) {
      return 'premium_required';
    }
    if (kind === 'analysis') {
      const { used, quota } = this.quota(userId);
      if (used >= quota) return 'quota';
    }
    if (!this.budgetLeft()) return 'budget';
    return null;
  }

  /** Free-form questions are Premium; they share the monthly quota and the daily budget. */
  checkQuestion(userId: string): AiDenial | null {
    return this.entitlements.limits(userId).features.aiAdvisor
      ? this.check(userId, 'analysis')
      : 'premium_required';
  }

  budgetLeft(): boolean {
    return this.usage.neuronsOn(utcDay(this.clock.now())) < this.dailyNeuronBudget;
  }

  record(userId: string, kind: 'analysis' | 'background', usage: AiUsage): void {
    const now = this.clock.now();
    this.uow.run(() => {
      if (usage.neurons > 0) this.usage.addNeurons(utcDay(now), usage.neurons);
      if (kind === 'analysis') this.usage.addUserCall(userId, utcMonth(now));
    });
  }
}
