import {
  SubscriptionProps,
  SubscriptionSource,
  SubscriptionStatus,
} from '@domain/model/Subscription';
import {
  AffiliateClickRepository,
  AiUsageRepository,
  BillingEventRepository,
  SubscriptionRepository,
} from '@domain/ports/repositories';
import { Advice } from '@domain/services/rule-based-advisor';
import { Db } from '../database';

interface SubscriptionRow {
  user_id: string;
  status: string;
  source: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
  lifetime: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  withdrawal_waived_at: string | null;
  updated_at: string;
}

const toSubscription = (r: SubscriptionRow): SubscriptionProps => ({
  userId: r.user_id,
  status: r.status as SubscriptionStatus,
  source: r.source as SubscriptionSource,
  trialEndsAt: r.trial_ends_at,
  currentPeriodEnd: r.current_period_end,
  cancelAtPeriodEnd: r.cancel_at_period_end === 1,
  lifetime: r.lifetime === 1,
  stripeCustomerId: r.stripe_customer_id,
  stripeSubscriptionId: r.stripe_subscription_id,
  termsAcceptedAt: r.terms_accepted_at,
  termsVersion: r.terms_version,
  withdrawalWaivedAt: r.withdrawal_waived_at,
  updatedAt: r.updated_at,
});

export class SqliteSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly db: Db) {}

  private one(where: string, value: string): SubscriptionProps | null {
    const row = this.db.prepare(`SELECT * FROM subscriptions WHERE ${where} = ?`).get(value) as
      | SubscriptionRow
      | undefined;
    return row ? toSubscription(row) : null;
  }

  get(userId: string): SubscriptionProps | null {
    return this.one('user_id', userId);
  }

  findByStripeCustomer(customerId: string): SubscriptionProps | null {
    return this.one('stripe_customer_id', customerId);
  }

  findByStripeSubscription(subscriptionId: string): SubscriptionProps | null {
    return this.one('stripe_subscription_id', subscriptionId);
  }

  save(s: SubscriptionProps): void {
    this.db
      .prepare(
        `INSERT INTO subscriptions (user_id, status, source, trial_ends_at, current_period_end,
           cancel_at_period_end, lifetime, stripe_customer_id, stripe_subscription_id,
           terms_accepted_at, terms_version, withdrawal_waived_at, updated_at)
         VALUES (@userId, @status, @source, @trialEndsAt, @currentPeriodEnd, @cancelAtPeriodEnd,
           @lifetime, @stripeCustomerId, @stripeSubscriptionId, @termsAcceptedAt,
           @termsVersion, @withdrawalWaivedAt, @updatedAt)
         ON CONFLICT(user_id) DO UPDATE SET status = excluded.status, source = excluded.source,
           trial_ends_at = excluded.trial_ends_at, current_period_end = excluded.current_period_end,
           cancel_at_period_end = excluded.cancel_at_period_end, lifetime = excluded.lifetime,
           stripe_customer_id = excluded.stripe_customer_id,
           stripe_subscription_id = excluded.stripe_subscription_id,
           terms_accepted_at = excluded.terms_accepted_at, terms_version = excluded.terms_version,
           withdrawal_waived_at = excluded.withdrawal_waived_at, updated_at = excluded.updated_at`
      )
      .run({ ...s, cancelAtPeriodEnd: s.cancelAtPeriodEnd ? 1 : 0, lifetime: s.lifetime ? 1 : 0 });
  }

  countLifetime(): number {
    return (
      this.db.prepare('SELECT COUNT(*) AS n FROM subscriptions WHERE lifetime = 1').get() as {
        n: number;
      }
    ).n;
  }
}

export class SqliteBillingEventRepository implements BillingEventRepository {
  constructor(private readonly db: Db) {}

  wasProcessed(eventId: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM billing_events WHERE id = ?').get(eventId);
  }

  markProcessed(eventId: string, type: string, at: Date): void {
    this.db
      .prepare('INSERT OR IGNORE INTO billing_events (id, type, processed_at) VALUES (?, ?, ?)')
      .run(eventId, type, at.toISOString());
  }
}

export class SqliteAiUsageRepository implements AiUsageRepository {
  constructor(private readonly db: Db) {}

  neuronsOn(day: string): number {
    const row = this.db.prepare('SELECT neurons FROM ai_daily_usage WHERE day = ?').get(day) as
      | { neurons: number }
      | undefined;
    return row?.neurons ?? 0;
  }

  addNeurons(day: string, neurons: number): void {
    this.db
      .prepare(
        `INSERT INTO ai_daily_usage (day, neurons) VALUES (?, ?)
         ON CONFLICT(day) DO UPDATE SET neurons = neurons + excluded.neurons`
      )
      .run(day, neurons);
  }

  userCalls(userId: string, month: string): number {
    const row = this.db
      .prepare('SELECT calls FROM ai_user_usage WHERE user_id = ? AND month = ?')
      .get(userId, month) as { calls: number } | undefined;
    return row?.calls ?? 0;
  }

  addUserCall(userId: string, month: string): void {
    this.db
      .prepare(
        `INSERT INTO ai_user_usage (user_id, month, calls) VALUES (?, ?, 1)
         ON CONFLICT(user_id, month) DO UPDATE SET calls = calls + 1`
      )
      .run(userId, month);
  }

  getCachedAdvice(userId: string, key: string): Advice | null {
    const row = this.db
      .prepare('SELECT advice_json FROM ai_advice_cache WHERE user_id = ? AND cache_key = ?')
      .get(userId, key) as { advice_json: string } | undefined;
    return row ? (JSON.parse(row.advice_json) as Advice) : null;
  }

  saveCachedAdvice(userId: string, key: string, advice: Advice, at: Date): void {
    this.db
      .prepare(
        `INSERT INTO ai_advice_cache (user_id, cache_key, advice_json, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, cache_key) DO UPDATE SET advice_json = excluded.advice_json,
           created_at = excluded.created_at`
      )
      .run(userId, key, JSON.stringify(advice), at.toISOString());
  }
}

export class SqliteAffiliateClickRepository implements AffiliateClickRepository {
  constructor(private readonly db: Db) {}

  record(userId: string, offerId: string, at: Date): void {
    this.db
      .prepare('INSERT INTO affiliate_clicks (user_id, offer_id, clicked_at) VALUES (?, ?, ?)')
      .run(userId, offerId, at.toISOString());
  }

  countByOffer(since: Date): Record<string, number> {
    const rows = this.db
      .prepare(
        'SELECT offer_id, COUNT(*) AS n FROM affiliate_clicks WHERE clicked_at >= ? GROUP BY offer_id'
      )
      .all(since.toISOString()) as { offer_id: string; n: number }[];
    return Object.fromEntries(rows.map((r) => [r.offer_id, r.n]));
  }
}
