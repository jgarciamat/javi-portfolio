import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '@domain/errors';
import {
  PlanId,
  SubscriptionProps,
  TERMS_VERSION,
  TRIAL_DAYS,
  emptySubscription,
  isTrialActive,
} from '@domain/model/Subscription';
import {
  BillingEventRepository,
  SubscriptionRepository,
  UnitOfWork,
  UserRepository,
} from '@domain/ports/repositories';
import {
  BillingEvent,
  CheckoutKind,
  Clock,
  EmailLocale,
  EmailSender,
  PaymentGateway,
} from '@domain/ports/services';
import { LimitedResource, PLAN_LIMITS, serializableLimits } from '@domain/services/plans';
import { AiAllowance, AiQuota } from '@application/ai/AiAllowance';
import { EntitlementService } from './EntitlementService';

/** How many of each limited resource a user has (active ones). */
export type ResourceCounter = (userId: string) => Record<LimitedResource, number>;

/** What the buyer agrees to before paying (both are required). */
export interface CheckoutConsent {
  /** Accepts the terms of sale. */
  acceptTerms: boolean;
  /** Asks Premium to start at once and acknowledges losing the 14-day withdrawal right. */
  waiveWithdrawal: boolean;
}

/** Work to do after a webhook is stored: provider calls and e-mails run outside the transaction. */
interface FollowUp {
  /** Subscription that must stop renewing (replaced by the founder plan). */
  stopSubscription?: string;
  /** User who just bought and gets the purchase confirmation. */
  confirmPurchase?: string;
}

export interface BillingOptions {
  appUrl: string;
  displayPrices: { monthly: number; yearly: number; lifetime: number };
  founderLimit: number;
  lifetimeConfigured: boolean;
}

export interface PlanCatalog {
  currency: 'EUR';
  trialDays: number;
  paymentsEnabled: boolean;
  prices: { monthly: number; yearly: number; lifetime: number };
  lifetime: { available: boolean; remaining: number };
  limits: {
    free: ReturnType<typeof serializableLimits>;
    premium: ReturnType<typeof serializableLimits>;
  };
}

export interface BillingOverview {
  plan: PlanId;
  trialDaysLeft: number;
  subscription: {
    status: SubscriptionProps['status'];
    source: SubscriptionProps['source'];
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    lifetime: boolean;
    canManage: boolean;
  };
  limits: ReturnType<typeof serializableLimits>;
  usage: Record<LimitedResource, number>;
  ai: AiQuota;
  catalog: PlanCatalog;
}

const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

/** Plans, checkout and the payment provider's webhooks. */
export class BillingService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly events: BillingEventRepository,
    private readonly users: UserRepository,
    private readonly entitlements: EntitlementService,
    private readonly allowance: AiAllowance,
    private readonly gateway: PaymentGateway,
    private readonly email: EmailSender,
    private readonly countResources: ResourceCounter,
    private readonly localeOf: (userId: string) => EmailLocale,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly options: BillingOptions,
    private readonly logger: Pick<Console, 'error' | 'warn'> = console
  ) {}

  catalog(): PlanCatalog {
    const remaining = Math.max(this.options.founderLimit - this.subscriptions.countLifetime(), 0);
    return {
      currency: 'EUR',
      trialDays: TRIAL_DAYS,
      paymentsEnabled: this.gateway.enabled,
      prices: this.options.displayPrices,
      lifetime: {
        available: this.gateway.enabled && this.options.lifetimeConfigured && remaining > 0,
        remaining,
      },
      limits: {
        free: serializableLimits(PLAN_LIMITS.free),
        premium: serializableLimits(PLAN_LIMITS.premium),
      },
    };
  }

  overview(userId: string): BillingOverview {
    const status = this.entitlements.status(userId);
    const sub = status.subscription ?? emptySubscription(userId, this.clock.now());
    return {
      plan: status.plan,
      trialDaysLeft: status.trialDaysLeft,
      subscription: {
        status: sub.status,
        source: sub.source,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        lifetime: sub.lifetime,
        canManage: this.gateway.enabled && !!sub.stripeCustomerId,
      },
      limits: serializableLimits(status.limits),
      usage: this.countResources(userId),
      ai: this.allowance.quota(userId),
      catalog: this.catalog(),
    };
  }

  /**
   * Starts the payment page. The buyer must accept the terms and ask Premium to
   * start at once (so the purchase cannot be withdrawn and refunded afterwards).
   */
  async checkout(
    userId: string,
    kind: CheckoutKind,
    consent: CheckoutConsent
  ): Promise<{ url: string }> {
    if (!consent.acceptTerms || !consent.waiveWithdrawal) {
      throw new ValidationError(
        'Acepta las condiciones de contratación y el inicio inmediato para continuar',
        'TERMS_REQUIRED'
      );
    }
    const user = this.users.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado', 'USER_NOT_FOUND');
    const now = this.clock.now();
    const sub = this.subscriptions.get(userId) ?? emptySubscription(userId, now);
    if (sub.lifetime) {
      throw new ConflictError('Ya tienes Premium de por vida', 'ALREADY_PREMIUM');
    }
    if (kind !== 'lifetime' && sub.stripeSubscriptionId && LIVE_STATUSES.has(sub.status)) {
      throw new ConflictError(
        'Ya tienes una suscripción. Puedes cambiarla desde "Gestionar suscripción".',
        'ALREADY_SUBSCRIBED'
      );
    }
    if (kind === 'lifetime' && !this.catalog().lifetime.available) {
      throw new BusinessRuleError('FOUNDER_SOLD_OUT', 'El plan fundador ya no está disponible');
    }
    const { url, customerId } = await this.gateway.createCheckout({
      userId,
      email: user.email,
      kind,
      customerId: sub.stripeCustomerId,
      trialEnd: isTrialActive(sub, now) ? new Date(sub.trialEndsAt!) : null,
      successUrl: `${this.options.appUrl}/?billing=success`,
      cancelUrl: `${this.options.appUrl}/?billing=cancel`,
    });
    // Proof of what was accepted, and the customer for the coming webhooks.
    const fresh = this.subscriptions.get(userId) ?? sub;
    this.subscriptions.save({
      ...fresh,
      stripeCustomerId: customerId ?? fresh.stripeCustomerId,
      termsAcceptedAt: now.toISOString(),
      termsVersion: TERMS_VERSION,
      withdrawalWaivedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    return { url };
  }

  async portal(userId: string): Promise<{ url: string }> {
    const customerId = this.subscriptions.get(userId)?.stripeCustomerId;
    if (!customerId) {
      throw new NotFoundError('No tienes ninguna suscripción que gestionar', 'NO_BILLING_ACCOUNT');
    }
    return this.gateway.createPortal(customerId, `${this.options.appUrl}/?billing=portal`);
  }

  /** Called before deleting an account so nobody keeps being charged. */
  async cancelBeforeAccountDeletion(userId: string): Promise<void> {
    const sub = this.subscriptions.get(userId);
    if (!sub?.stripeSubscriptionId || !LIVE_STATUSES.has(sub.status)) return;
    try {
      await this.gateway.cancelSubscription(sub.stripeSubscriptionId, false);
    } catch (e) {
      this.logger.error('[billing] could not cancel the subscription', e);
      throw new BusinessRuleError(
        'BILLING_UNAVAILABLE',
        'No hemos podido cancelar tu suscripción. Inténtalo de nuevo en unos minutos.'
      );
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    const event = await this.gateway.parseWebhook(rawBody, signature);
    if (event.type === 'ignored' || this.events.wasProcessed(event.id)) return;
    const followUp = this.uow.run(() => {
      const result = this.apply(event);
      this.events.markProcessed(event.id, event.type, this.clock.now());
      return result;
    });
    if (followUp.stopSubscription) {
      // A lifetime purchase replaces the recurring plan: stop its renewals.
      await this.gateway
        .cancelSubscription(followUp.stopSubscription, true)
        .catch((e) => this.logger.error('[billing] could not stop the old subscription', e));
    }
    if (followUp.confirmPurchase) this.confirmPurchase(followUp.confirmPurchase);
  }

  /** Durable confirmation of the purchase and of the immediate start (no withdrawal). */
  private confirmPurchase(userId: string): void {
    const user = this.users.findById(userId)!;
    this.email
      .sendPurchaseConfirmation(user.email, user.name, this.localeOf(userId))
      .catch((e) => this.logger.error('[email] purchase confirmation failed', e));
  }

  private apply(event: Exclude<BillingEvent, { type: 'ignored' }>): FollowUp {
    const now = this.clock.now();
    const stamp = now.toISOString();
    const find = (userId: string | null, customerId: string | null): SubscriptionProps | null => {
      if (userId && this.users.findById(userId)) {
        return this.subscriptions.get(userId) ?? emptySubscription(userId, now);
      }
      return customerId ? this.subscriptions.findByStripeCustomer(customerId) : null;
    };

    switch (event.type) {
      case 'checkout_completed': {
        const sub = find(event.userId, event.customerId);
        if (!sub) return {};
        if (event.customerId && !sub.stripeCustomerId) {
          this.subscriptions.save({ ...sub, stripeCustomerId: event.customerId, updatedAt: stamp });
        }
        return { confirmPurchase: sub.userId };
      }
      case 'lifetime_refunded': {
        const sub = find(event.userId, event.customerId);
        if (sub?.lifetime) {
          this.subscriptions.save({
            ...sub,
            lifetime: false,
            status: 'canceled',
            updatedAt: stamp,
          });
        }
        return {};
      }
      case 'lifetime_purchased': {
        const sub = find(event.userId, event.customerId);
        if (!sub) {
          this.logger.warn(`[billing] lifetime purchase ${event.id} without a known user`);
          return {};
        }
        this.subscriptions.save({
          ...sub,
          lifetime: true,
          source: 'lifetime',
          status: 'active',
          cancelAtPeriodEnd: false,
          stripeCustomerId: sub.stripeCustomerId ?? event.customerId,
          updatedAt: stamp,
        });
        const live =
          sub.stripeSubscriptionId && LIVE_STATUSES.has(sub.status) && !sub.cancelAtPeriodEnd;
        return {
          stopSubscription: live ? sub.stripeSubscriptionId! : undefined,
          confirmPurchase: sub.userId,
        };
      }
      case 'subscription_changed': {
        const sub =
          this.subscriptions.findByStripeSubscription(event.subscriptionId) ??
          find(event.userId, event.customerId);
        if (!sub) {
          this.logger.warn(`[billing] subscription ${event.subscriptionId} without a known user`);
          return {};
        }
        const replacesAnother =
          sub.stripeSubscriptionId && sub.stripeSubscriptionId !== event.subscriptionId;
        // A late event about an old, cancelled subscription must not override the current one.
        if (replacesAnother && event.status === 'canceled' && LIVE_STATUSES.has(sub.status)) {
          return {};
        }
        this.subscriptions.save({
          ...sub,
          source: sub.lifetime ? 'lifetime' : 'stripe',
          status: sub.lifetime ? 'active' : event.status,
          currentPeriodEnd: event.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: event.cancelAtPeriodEnd,
          stripeCustomerId: event.customerId,
          stripeSubscriptionId: event.subscriptionId,
          updatedAt: stamp,
        });
        // Someone with lifetime access who still had a live subscription.
        const stop = sub.lifetime && event.status !== 'canceled' && !event.cancelAtPeriodEnd;
        return { stopSubscription: stop ? event.subscriptionId : undefined };
      }
    }
  }
}
