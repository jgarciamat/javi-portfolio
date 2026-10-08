import { PaymentRequiredError } from '@domain/errors';
import {
  PlanId,
  SubscriptionProps,
  newTrial,
  planOf,
  trialDaysLeft,
} from '@domain/model/Subscription';
import { SubscriptionRepository } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { LimitedResource, PLAN_LIMITS, PlanLimits, PremiumFeature } from '@domain/services/plans';

export interface PlanStatus {
  plan: PlanId;
  limits: PlanLimits;
  subscription: SubscriptionProps | null;
  trialDaysLeft: number;
}

const RESOURCE_LABELS: Record<LimitedResource, string> = {
  accounts: 'cuentas',
  budgets: 'presupuestos',
  goals: 'metas',
  recurringRules: 'movimientos recurrentes',
  customAlerts: 'alertas',
};

/** Answers "what can this user do right now?" and enforces it. */
export class EntitlementService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly clock: Clock
  ) {}

  status(userId: string): PlanStatus {
    const now = this.clock.now();
    const subscription = this.subscriptions.get(userId);
    const plan = planOf(subscription, now);
    return {
      plan,
      limits: PLAN_LIMITS[plan],
      subscription,
      trialDaysLeft: trialDaysLeft(subscription, now),
    };
  }

  plan(userId: string): PlanId {
    return planOf(this.subscriptions.get(userId), this.clock.now());
  }

  limits(userId: string): PlanLimits {
    return PLAN_LIMITS[this.plan(userId)];
  }

  isPremium(userId: string): boolean {
    return this.plan(userId) === 'premium';
  }

  assertFeature(userId: string, feature: PremiumFeature): void {
    if (!this.limits(userId).features[feature]) {
      throw new PaymentRequiredError('PREMIUM_REQUIRED', 'Esta función es parte de Premium', {
        feature,
      });
    }
  }

  /** `current` is how many the user already has; creating one more must stay within the limit. */
  assertCanCreate(userId: string, resource: LimitedResource, current: number): void {
    const limit = this.limits(userId).resources[resource];
    if (current >= limit) {
      throw new PaymentRequiredError(
        'PLAN_LIMIT',
        `Has llegado al máximo del plan gratuito para ${RESOURCE_LABELS[resource]}: ${limit}`,
        { resource, limit }
      );
    }
  }

  /** New users get the trial once; a user that already had any subscription keeps it. */
  grantTrial(userId: string): void {
    if (this.subscriptions.get(userId)) return;
    this.subscriptions.save(newTrial(userId, this.clock.now()));
  }
}
