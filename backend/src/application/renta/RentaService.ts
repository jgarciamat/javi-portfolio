import { PaymentRequiredError } from '@domain/errors';
import { RentaAccess } from '@domain/model/Subscription';
import { RentaUsageRepository } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { rentaCampaignOf } from '@domain/services/plans';
import { EntitlementService } from '@application/billing/EntitlementService';

/**
 * The income tax return calculator: three calculations per Renta campaign on the free plan, no
 * limit with Premium or with the one-month pass. Reading a draft needs two months of paid Premium or the pass.
 */
export class RentaService {
  constructor(
    private readonly usage: RentaUsageRepository,
    private readonly entitlements: EntitlementService,
    private readonly clock: Clock
  ) {}

  /** Calculations made in the current campaign (what the free plan limits). */
  usedThisCampaign(userId: string): number {
    return this.usage.count(userId, rentaCampaignOf(this.clock.now()));
  }

  /** Counts a calculation; refused (402) when the plan has no more of them this campaign. */
  register(userId: string): { used: number } {
    const campaign = rentaCampaignOf(this.clock.now());
    if (this.entitlements.rentaAccess(userId).passUntil === null) {
      this.entitlements.assertCanCreate(
        userId,
        'rentaCalculations',
        this.usage.count(userId, campaign)
      );
    }
    return { used: this.usage.increment(userId, campaign) };
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
