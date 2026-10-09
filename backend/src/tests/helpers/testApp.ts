import request from 'supertest';
import { Express } from 'express';
import { loadConfig } from '@config/env';
import {
  BillingEvent,
  CategorySuggester,
  CheckoutRequest,
  Clock,
  FinancialAdvisor,
  GoogleIdentity,
  GoogleIdentityVerifier,
  OfferCatalog,
  PaymentGateway,
} from '@domain/ports/services';
import { UnauthorizedError, ValidationError } from '@domain/errors';
import { buildContainer, Container } from '@infrastructure/container';
import { createApp } from '@infrastructure/http/app';
import { ConsoleEmailSender } from '@infrastructure/mail/EmailSenders';
import { openDatabase } from '@infrastructure/sqlite/database';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';

export class MutableClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  set(iso: string): void {
    this.current = new Date(iso);
  }
}

export class FakeGoogleVerifier implements GoogleIdentityVerifier {
  identities = new Map<string, GoogleIdentity>();
  async verify(token: string): Promise<GoogleIdentity> {
    const identity = this.identities.get(token);
    if (!identity) throw new UnauthorizedError('Token de Google inválido', 'GOOGLE_AUTH_FAILED');
    return identity;
  }
}

/** Payment provider double: records checkouts and accepts webhooks signed "valid". */
export class FakePaymentGateway implements PaymentGateway {
  readonly enabled = true;
  checkouts: CheckoutRequest[] = [];
  cancelled: { subscriptionId: string; atPeriodEnd: boolean }[] = [];
  private customers = 0;

  async createCheckout(request: CheckoutRequest): Promise<{ url: string; customerId: string }> {
    this.checkouts.push(request);
    const customerId = request.customerId ?? `cus_${++this.customers}`;
    return { url: `https://checkout.test/${request.kind}`, customerId };
  }

  async createPortal(customerId: string): Promise<{ url: string }> {
    return { url: `https://portal.test/${customerId}` };
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    this.cancelled.push({ subscriptionId, atPeriodEnd });
  }

  async parseWebhook(rawBody: Buffer, signature: string | undefined): Promise<BillingEvent> {
    if (signature !== 'valid') {
      throw new ValidationError('Firma del webhook no válida', 'INVALID_SIGNATURE');
    }
    const event = JSON.parse(rawBody.toString('utf8')) as BillingEvent & {
      currentPeriodEnd?: string | null;
    };
    // Dates travel as ISO strings in the test payloads.
    return 'currentPeriodEnd' in event && typeof event.currentPeriodEnd === 'string'
      ? ({ ...event, currentPeriodEnd: new Date(event.currentPeriodEnd) } as BillingEvent)
      : event;
  }
}

export interface TestContext {
  app: Express;
  container: Container;
  clock: MutableClock;
  email: ConsoleEmailSender;
  google: FakeGoogleVerifier;
  payments: FakePaymentGateway;
}

export const STRONG_PASSWORD = 'Sup3r-secret!';

export function createTestApp(
  options: {
    now?: string;
    advisor?: FinancialAdvisor | null;
    categorySuggester?: CategorySuggester | null;
    offers?: OfferCatalog;
    env?: Record<string, string>;
  } = {}
): TestContext {
  const config = loadConfig({ NODE_ENV: 'test', APP_URL: 'http://localhost:5173', ...options.env });
  const db = openDatabase(':memory:');
  migrate(db, migrations);
  const clock = new MutableClock(new Date(options.now ?? '2026-03-15T12:00:00Z'));
  const email = new ConsoleEmailSender(config.appUrl, true);
  const google = new FakeGoogleVerifier();
  const payments = new FakePaymentGateway();
  const container = buildContainer(db, config, {
    clock,
    email,
    google,
    payments,
    advisor: options.advisor ?? null,
    categorySuggester: options.categorySuggester ?? null,
    offers: options.offers,
  });
  return { app: createApp(container), container, clock, email, google, payments };
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
  refreshToken: string;
  auth: { Authorization: string };
}

let counter = 0;

/** Registers, verifies and logs in a fresh user. */
export async function createUser(
  ctx: TestContext,
  emailAddress?: string,
  referralCode?: string
): Promise<TestUser> {
  const email = emailAddress ?? `user${++counter}@example.com`;
  await request(ctx.app)
    .post('/api/auth/register')
    .send({ email, password: STRONG_PASSWORD, name: 'Test User', referralCode })
    .expect(201);
  const sent = [...ctx.email.sent].reverse().find((s) => s.to === email && s.kind === 'verify');
  await request(ctx.app).get('/api/auth/verify-email').query({ token: sent!.token }).expect(200);
  const login = await request(ctx.app)
    .post('/api/auth/login')
    .send({ email, password: STRONG_PASSWORD })
    .expect(200);
  return {
    id: login.body.user.id,
    email,
    token: login.body.accessToken,
    refreshToken: login.body.refreshToken,
    auth: { Authorization: `Bearer ${login.body.accessToken}` },
  };
}

/** Ends the 14-day trial: the user is on the free plan from now on. */
export function expireTrial(ctx: TestContext, user: TestUser): void {
  const sub = ctx.container.repos.subscriptions.get(user.id)!;
  ctx.container.repos.subscriptions.save({
    ...sub,
    trialEndsAt: new Date(ctx.clock.now().getTime() - 1000).toISOString(),
  });
}

export async function addTransaction(
  ctx: TestContext,
  user: TestUser,
  body: Record<string, unknown>
): Promise<request.Response> {
  return request(ctx.app)
    .post('/api/transactions')
    .set(user.auth)
    .send({
      description: 'Movimiento',
      type: 'EXPENSE',
      category: 'Ocio',
      date: '2026-03-10',
      amount: 10,
      ...body,
    });
}
