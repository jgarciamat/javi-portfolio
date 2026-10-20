import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { UnauthorizedError } from '@domain/errors';
import { SubscriptionProps, emptySubscription } from '@domain/model/Subscription';
import {
  BillingEventRepository,
  SubscriptionRepository,
  UnitOfWork,
  UserRepository,
} from '@domain/ports/repositories';
import { Clock, MetricsRecorder } from '@domain/ports/services';
import { EntitlementService } from './EntitlementService';
import type { CreatorSales } from './BillingService';
import type { CreatorPlan } from '@domain/ports/repositories';

/** What RevenueCat sends for a purchase made in the Android app (only what we use). */
const playEvent = z.object({
  event: z.object({
    id: z.string().min(1),
    type: z.string(),
    app_user_id: z.string().default(''),
    product_id: z.string().default(''),
    expiration_at_ms: z.number().nullable().optional(),
    /** TRIAL, INTRO, NORMAL… (a trial is not a sale). */
    period_type: z.string().nullable().optional(),
    /** Price in USD; 0 for trials, null when unknown. */
    price: z.number().nullable().optional(),
    /** CUSTOMER_SUPPORT is how RevenueCat reports a refund. */
    cancel_reason: z.string().nullable().optional(),
  }),
});

const GRANTING = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
]);
const LIVE = new Set(['active', 'trialing', 'past_due']);

const isLifetimeProduct = (productId: string): boolean => productId.includes('lifetime');
const isRentaPass = (productId: string): boolean => productId.includes('renta');
/**
 * Store payments the creator program looks at. Only the user's first one becomes a sale: a
 * RENEWAL counts when the purchase began with a free trial.
 */
const SALE_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE']);

/** The plan of a store product (`premium_monthly:monthly`, `premium_annual:annual`, …). */
export function playPlanOf(productId: string): CreatorPlan | null {
  const id = productId.toLowerCase();
  if (isLifetimeProduct(id)) return 'lifetime';
  if (id.includes('month')) return 'monthly';
  if (id.includes('year') || id.includes('annual')) return 'yearly';
  return null;
}

type PlayEvent = z.infer<typeof playEvent>['event'];

/**
 * Purchases made inside the Android app. Google Play charges and RevenueCat verifies the
 * purchase; its webhook tells us who has Premium. The app user id is our own user id.
 */
export class PlayBillingService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly events: BillingEventRepository,
    private readonly users: UserRepository,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly metrics: MetricsRecorder,
    private readonly entitlements: EntitlementService,
    /** Value of the Authorization header RevenueCat is configured to send; null = off. */
    private readonly webhookAuth: string | null,
    private readonly creators: CreatorSales,
    private readonly logger: Pick<Console, 'warn'> = console
  ) {}

  get enabled(): boolean {
    return this.webhookAuth !== null;
  }

  handleWebhook(authorization: string | undefined, body: unknown): void {
    if (!this.webhookAuth || !this.authorized(authorization)) {
      throw new UnauthorizedError('Webhook no autorizado');
    }
    const parsed = playEvent.safeParse(body);
    if (!parsed.success) return;
    const { event } = parsed.data;
    if (this.events.wasProcessed(event.id)) return;
    this.uow.run(() => {
      this.apply(event);
      this.events.markProcessed(event.id, `play:${event.type}`, this.clock.now());
    });
  }

  private authorized(header: string | undefined): boolean {
    const expected = Buffer.from(this.webhookAuth as string);
    const given = Buffer.from(header ?? '');
    return given.length === expected.length && timingSafeEqual(given, expected);
  }

  private apply(event: PlayEvent): void {
    if (!this.users.findById(event.app_user_id)) {
      // Anonymous purchasers or tests: nobody to give Premium to.
      if (GRANTING.has(event.type)) {
        this.logger.warn(`[play] ${event.type} ${event.id} without a known user`);
      }
      return;
    }
    if (isRentaPass(event.product_id)) return this.applyRentaPass(event);
    const now = this.clock.now();
    const current =
      this.subscriptions.get(event.app_user_id) ?? emptySubscription(event.app_user_id, now);
    // A live web subscription is never replaced by a store event.
    if (current.source === 'stripe' && LIVE.has(current.status) && !current.lifetime) {
      this.logger.warn(`[play] ${event.id} ignored: ${current.userId} already pays on the web`);
      return;
    }
    const next = this.next(current, event);
    if (!next) return;
    const stopsRenewing =
      event.type === 'CANCELLATION' &&
      !current.lifetime &&
      !isLifetimeProduct(event.product_id) &&
      LIVE.has(current.status) &&
      !current.cancelAtPeriodEnd;
    if (stopsRenewing) this.metrics.record('subscription_cancelled');
    this.subscriptions.save({ ...next, updatedAt: now.toISOString() });
    if (event.type === 'INITIAL_PURCHASE' || event.type === 'NON_RENEWING_PURCHASE') {
      this.metrics.record('purchase');
    }
    this.tellCreators(event);
  }

  /** First real payment (no trial, a known price above 0) or a refund, for the creator program. */
  private tellCreators(event: PlayEvent): void {
    const plan = playPlanOf(event.product_id);
    const paid =
      SALE_EVENTS.has(event.type) && event.period_type !== 'TRIAL' && (event.price ?? 0) > 0;
    if (paid && plan) this.creators.recordSale(event.app_user_id, plan, 'google');
    const refunded =
      event.type === 'CANCELLATION' &&
      (event.cancel_reason === 'CUSTOMER_SUPPORT' || plan === 'lifetime');
    if (refunded) this.creators.reverseSale(event.app_user_id);
  }

  /** The one-month pass for reading a tax return draft: bought once, never touches the subscription. */
  private applyRentaPass(event: PlayEvent): void {
    if (event.type === 'CANCELLATION') {
      this.entitlements.revokeRentaPass(event.app_user_id);
    } else if (GRANTING.has(event.type)) {
      this.entitlements.grantRentaPass(event.app_user_id);
      this.metrics.record('purchase');
    }
  }

  private next(sub: SubscriptionProps, event: PlayEvent): SubscriptionProps | null {
    const lifetime = isLifetimeProduct(event.product_id);
    const end = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
    const base = { ...sub, source: 'google' as const };
    if (GRANTING.has(event.type)) {
      return lifetime
        ? { ...base, lifetime: true, status: 'active', cancelAtPeriodEnd: false }
        : { ...base, status: 'active', currentPeriodEnd: end, cancelAtPeriodEnd: false };
    }
    switch (event.type) {
      case 'CANCELLATION':
        // A refunded lifetime purchase takes the access back; a subscription runs to its end.
        return lifetime
          ? { ...base, lifetime: false, status: 'canceled' }
          : { ...base, cancelAtPeriodEnd: true, currentPeriodEnd: end ?? sub.currentPeriodEnd };
      case 'EXPIRATION':
        return { ...base, status: 'canceled', cancelAtPeriodEnd: false, currentPeriodEnd: end };
      case 'BILLING_ISSUE':
        return { ...base, status: 'past_due', currentPeriodEnd: end ?? sub.currentPeriodEnd };
      default:
        return null;
    }
  }
}
