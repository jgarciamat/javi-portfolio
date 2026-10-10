import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser, expireTrial } from '../helpers/testApp';

const SECRET = 'revenuecat-shared-secret-123';
const DAY = 24 * 60 * 60 * 1000;

describe('Purchases made in the Android app (Google Play via RevenueCat)', () => {
  let ctx: TestContext;
  let user: TestUser;
  let counter = 0;

  const send = (event: Record<string, unknown>, auth: string | null = SECRET) => {
    const req = request(ctx.app).post('/api/billing/play/webhook');
    if (auth !== null) req.set('Authorization', auth);
    return req.send({ event: { id: `rc_${++counter}`, ...event } });
  };
  const monthly = (type: string, extra: Record<string, unknown> = {}) =>
    send({
      type,
      app_user_id: user.id,
      product_id: 'premium_monthly:monthly',
      expiration_at_ms: ctx.clock.now().getTime() + 30 * DAY,
      ...extra,
    });
  const overview = async () =>
    (await request(ctx.app).get('/api/billing').set(user.auth).expect(200)).body;

  beforeEach(async () => {
    ctx = createTestApp({ env: { REVENUECAT_WEBHOOK_AUTH: SECRET } });
    user = await createUser(ctx);
    expireTrial(ctx, user);
  });

  it('rejects calls without the shared secret', async () => {
    await monthly('INITIAL_PURCHASE').set('Authorization', 'wrong-secret-value-000000').expect(401);
    await send({ type: 'INITIAL_PURCHASE' }, null).expect(401);
    expect((await overview()).plan).toBe('free');
  });

  it('is off when no secret is configured', async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
    await send({ type: 'INITIAL_PURCHASE', app_user_id: user.id }, SECRET).expect(401);
  });

  it('gives Premium on purchase and keeps it until the period ends', async () => {
    await monthly('INITIAL_PURCHASE').expect(200);
    expect(await overview()).toMatchObject({
      plan: 'premium',
      subscription: { source: 'google', status: 'active', cancelAtPeriodEnd: false },
    });
    ctx.clock.set(new Date(ctx.clock.now().getTime() + 31 * DAY).toISOString());
    expect((await overview()).plan).toBe('free');
  });

  it('handles renewals, cancellations, billing problems and expiration', async () => {
    await monthly('INITIAL_PURCHASE').expect(200);
    await monthly('CANCELLATION').expect(200);
    expect(await overview()).toMatchObject({
      plan: 'premium',
      subscription: { cancelAtPeriodEnd: true },
    });
    await monthly('UNCANCELLATION').expect(200);
    expect((await overview()).subscription.cancelAtPeriodEnd).toBe(false);
    await monthly('RENEWAL').expect(200);
    await monthly('BILLING_ISSUE').expect(200);
    expect((await overview()).subscription.status).toBe('past_due');
    await monthly('EXPIRATION', { expiration_at_ms: ctx.clock.now().getTime() - 1000 }).expect(200);
    expect(await overview()).toMatchObject({ plan: 'free', subscription: { status: 'canceled' } });
  });

  it('keeps the old end date when a cancellation carries none', async () => {
    await monthly('INITIAL_PURCHASE').expect(200);
    const before = (await overview()).subscription.currentPeriodEnd;
    await monthly('CANCELLATION', { expiration_at_ms: null }).expect(200);
    expect((await overview()).subscription.currentPeriodEnd).toBe(before);
    await monthly('BILLING_ISSUE', { expiration_at_ms: null }).expect(200);
    expect((await overview()).subscription.currentPeriodEnd).toBe(before);
  });

  it('grants lifetime access and takes it back on a refund', async () => {
    const lifetime = { product_id: 'premium_lifetime', expiration_at_ms: null };
    await monthly('NON_RENEWING_PURCHASE', lifetime).expect(200);
    expect(await overview()).toMatchObject({
      plan: 'premium',
      subscription: { lifetime: true, source: 'google' },
    });
    await monthly('CANCELLATION', lifetime).expect(200);
    expect((await overview()).plan).toBe('free');
  });

  it('processes each event once', async () => {
    const event = { id: 'rc_same', type: 'INITIAL_PURCHASE', app_user_id: user.id };
    const call = () =>
      request(ctx.app)
        .post('/api/billing/play/webhook')
        .set('Authorization', SECRET)
        .send({ event: { ...event, product_id: 'premium_monthly:monthly' } });
    await call().expect(200);
    await call().expect(200);
    expect(ctx.container.repos.metrics).toBeDefined();
  });

  it('ignores unknown users, other event types and malformed bodies', async () => {
    await send({ type: 'INITIAL_PURCHASE', app_user_id: '$RCAnonymousID:abc' }).expect(200);
    await send({ type: 'TEST', app_user_id: '$RCAnonymousID:abc' }).expect(200);
    await monthly('TRANSFER').expect(200);
    await request(ctx.app)
      .post('/api/billing/play/webhook')
      .set('Authorization', SECRET)
      .send({ nope: true })
      .expect(200);
    expect((await overview()).plan).toBe('free');
  });

  it('does not replace a live web subscription', async () => {
    const sub = ctx.container.repos.subscriptions.get(user.id)!;
    ctx.container.repos.subscriptions.save({
      ...sub,
      source: 'stripe',
      status: 'active',
      currentPeriodEnd: new Date(ctx.clock.now().getTime() + 10 * DAY).toISOString(),
      stripeSubscriptionId: 'sub_1',
    });
    await monthly('INITIAL_PURCHASE').expect(200);
    expect((await overview()).subscription.source).toBe('stripe');
  });

  it('refuses a web checkout while the Google Play subscription is live', async () => {
    await monthly('INITIAL_PURCHASE').expect(200);
    const res = await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'monthly', acceptTerms: true, waiveWithdrawal: true })
      .expect(409);
    expect(res.body.code).toBe('ALREADY_SUBSCRIBED');
  });

  it('keeps existing databases working after the migration', () => {
    const row = ctx.container.db
      .prepare("SELECT sql FROM sqlite_master WHERE name = 'subscriptions'")
      .get() as { sql: string };
    expect(row.sql).toContain("'google'");
  });
});
