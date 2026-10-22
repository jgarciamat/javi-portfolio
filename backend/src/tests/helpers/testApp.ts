import request from 'supertest';
import { Express } from 'express';
import { loadConfig } from '@config/env';
import {
  BillingEvent,
  CategorySuggester,
  CheckoutRequest,
  Clock,
  CryptoMarketData,
  FinancialAdvisor,
  GoogleIdentity,
  GoogleIdentityVerifier,
  ExchangeRates,
  PushPayload,
  PushSender,
  OfferCatalog,
  PaymentGateway,
} from '@domain/ports/services';
import { UnauthorizedError, UnavailableError, ValidationError } from '@domain/errors';
import {
  CryptoInterval,
  CryptoSymbol,
  EURO_PAIRS,
  MarketCandle,
  MarketFeed,
  MarketQuote,
  MarketTicker,
  quoteOf,
} from '@domain/services/crypto-market';
import { BcryptPasswordHasher } from '@infrastructure/auth/JwtTokenService';
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
  push: FakePushSender;
  market: FakeCryptoMarket;
}

/** Push sender that records what it is asked to send; `gone` endpoints answer as removed. */
export class FakePushSender implements PushSender {
  enabled = true;
  sent: { endpoint: string; payload: PushPayload }[] = [];
  gone = new Set<string>();
  fail = false;

  publicKey(): string {
    return 'test-public-key';
  }

  async send(subscription: { endpoint: string }, payload: PushPayload): Promise<'sent' | 'gone'> {
    if (this.fail) throw new Error('push service down');
    if (this.gone.has(subscription.endpoint)) return 'gone';
    this.sent.push({ endpoint: subscription.endpoint, payload });
    return 'sent';
  }
}

/**
 * Crypto market double (no Internet): prices and candles set by the test, made-up numbers in
 * euros (those of the coins quoted in USDT pass for already converted at `usdPerEur`).
 * `down` makes every call fail like a source that does not answer.
 */
export class FakeCryptoMarket implements CryptoMarketData {
  readonly source = 'binance' as const;
  prices = new Map<CryptoSymbol, number>([
    ['BTC', 50_000],
    ['ETH', 2_000],
  ]);
  series = new Map<string, MarketCandle[]>();
  stale = false;
  down = false;
  candleCalls: string[] = [];
  usdPerEur = 1.1;

  constructor(private readonly clock: Clock) {}

  quoteOf(symbol: CryptoSymbol): MarketQuote {
    return quoteOf(symbol, EURO_PAIRS);
  }

  /** Candles of a coin for every size the simulator may ask for. */
  setCandles(symbol: CryptoSymbol, candles: MarketCandle[]): void {
    this.series.set(symbol, candles);
  }

  async candles(
    symbol: CryptoSymbol,
    interval: CryptoInterval
  ): Promise<MarketFeed<MarketCandle[]>> {
    this.candleCalls.push(`${symbol}:${interval}`);
    if (this.down) throw new UnavailableError('down', 'MARKET_UNAVAILABLE');
    return this.feed(this.series.get(symbol) ?? [], this.quoteOf(symbol) === 'USDT');
  }

  async tickers(): Promise<MarketFeed<MarketTicker[]>> {
    if (this.down) throw new UnavailableError('down', 'MARKET_UNAVAILABLE');
    return this.feed(
      [...this.prices].map(([symbol, price]) => ({
        symbol,
        price,
        changePercent24h: 1.5,
        high24h: price * 1.02,
        low24h: price * 0.97,
        bid: price - 1,
        ask: price + 1,
        volume24h: 1_000_000,
        quote: this.quoteOf(symbol),
      })),
      [...this.prices.keys()].some((symbol) => this.quoteOf(symbol) === 'USDT')
    );
  }

  private feed<T>(data: T, converted: boolean): MarketFeed<T> {
    return {
      data,
      source: 'binance',
      updatedAt: this.clock.now().toISOString(),
      stale: this.stale,
      ...(converted ? { usdPerEur: this.usdPerEur } : {}),
    };
  }
}

export const STRONG_PASSWORD = 'Sup3r-secret!';

export function createTestApp(
  options: {
    now?: string;
    advisor?: FinancialAdvisor | null;
    categorySuggester?: CategorySuggester | null;
    offers?: OfferCatalog;
    rates?: ExchangeRates;
    market?: FakeCryptoMarket;
    /** A real market adapter (with a fake HTTP) in place of the double, which stays unused. */
    marketData?: (clock: Clock) => CryptoMarketData;
    pushEnabled?: boolean;
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
  const push = new FakePushSender();
  push.enabled = options.pushEnabled ?? true;
  const market = options.market ?? new FakeCryptoMarket(clock);
  const container = buildContainer(db, config, {
    // Cheap rounds even when a test runs with NODE_ENV=development (live rate limits).
    hasher: new BcryptPasswordHasher(4),
    pushSender: push,
    clock,
    email,
    google,
    payments,
    advisor: options.advisor ?? null,
    categorySuggester: options.categorySuggester ?? null,
    offers: options.offers,
    rates: options.rates ?? {
      rate: async (from, to) => (from === 'USD' && to === 'EUR' ? 0.9 : 2),
    },
    market: options.marketData?.(clock) ?? market,
  });
  return { app: createApp(container), container, clock, email, google, payments, push, market };
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
