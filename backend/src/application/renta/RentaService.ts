import { RentaUsageRepository } from '@domain/ports/repositories';
import { EntitlementService } from '@application/billing/EntitlementService';

/** The income tax return calculator: one calculation on the free plan, no limit with Premium. */
export class RentaService {
  constructor(
    private readonly usage: RentaUsageRepository,
    private readonly entitlements: EntitlementService
  ) {}

  /** Counts a calculation; refused (402) when the plan has no more of them. */
  register(userId: string): { used: number } {
    this.entitlements.assertCanCreate(userId, 'rentaCalculations', this.usage.count(userId));
    return { used: this.usage.increment(userId) };
  }
}
