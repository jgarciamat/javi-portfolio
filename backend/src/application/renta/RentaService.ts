import { PaymentRequiredError } from '@domain/errors';
import { RentaAccess } from '@domain/model/Subscription';
import { RentaUsageRepository } from '@domain/ports/repositories';
import { EntitlementService } from '@application/billing/EntitlementService';

/**
 * The income tax return calculator: one calculation on the free plan, no limit with Premium
 * or with the one-month pass. Reading a draft needs two months of paid Premium or the pass.
 */
export class RentaService {
  constructor(
    private readonly usage: RentaUsageRepository,
    private readonly entitlements: EntitlementService
  ) {}

  /** Counts a calculation; refused (402) when the plan has no more of them. */
  register(userId: string): { used: number } {
    if (this.entitlements.rentaAccess(userId).passUntil === null) {
      this.entitlements.assertCanCreate(userId, 'rentaCalculations', this.usage.count(userId));
    }
    return { used: this.usage.increment(userId) };
  }

  access(userId: string): RentaAccess {
    return this.entitlements.rentaAccess(userId);
  }

  /** Asked before reading a draft: refused (402) with what is missing when it is not included. */
  useDraft(userId: string): RentaAccess {
    const access = this.entitlements.rentaAccess(userId);
    if (!access.draft.allowed) {
      throw new PaymentRequiredError(
        'RENTA_DRAFT_LOCKED',
        'Leer tu borrador está incluido con más de 2 meses de Premium o con el pase de 1 mes',
        { eligibleOn: access.eligibleOn }
      );
    }
    return access;
  }
}
