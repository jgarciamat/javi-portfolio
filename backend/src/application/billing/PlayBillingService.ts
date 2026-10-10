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

/** What RevenueCat sends for a purchase made in the Android app (only what we use). */
const playEvent = z.object({
  event: z.object({
    id: z.string().min(1),
    type: z.string(),
    app_user_id: z.string().default(''),
    product_id: z.string().default(''),
    expiration_at_ms: z.number().nullable().optional(),
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

const isLifetimeProduct = (productId: string) => productId.includes('lifetime');

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
    /** Value of the Authorization header RevenueCat is configured to send; null = off. */
    private readonly webhookAuth: string | null,
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

  private apply(event: z.infer<typeof playEvent>['event']): void {
    if (!this.users.findById(event.app_user_id)) {
      // Anonymous purchasers or tests: nobody to give Premium to.
      if (GRANTING.has(event.type)) {
        this.logger.warn(`[play] ${event.type} ${event.id} without a known user`);
      }
      return;
    }
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
    this.subscriptions.save({ ...next, updatedAt: now.toISOString() });
    if (event.type === 'INITIAL_PURCHASE' || event.type === 'NON_RENEWING_PURCHASE') {
      this.metrics.record('purchase');
    }
  }

  private next(
    sub: SubscriptionProps,
    event: z.infer<typeof playEvent>['event']
  ): SubscriptionProps | null {
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
