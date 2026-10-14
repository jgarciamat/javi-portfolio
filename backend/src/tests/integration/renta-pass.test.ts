import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser, expireTrial } from '../helpers/testApp';

const DAY = 24 * 60 * 60 * 1000;
const SECRET = 'revenuecat-shared-secret-123';

const webhook = (ctx: TestContext, event: Record<string, unknown>) =>
  request(ctx.app)
    .post('/api/billing/webhook')
    .set('stripe-signature', 'valid')
    .set('content-type', 'application/json')
    .send(JSON.stringify(event));

describe('Reading a tax return draft: two months of Premium, or the one-month pass', () => {
  let ctx: TestContext;
  let user: TestUser;
  let counter = 0;

  const draft = () => request(ctx.app).post('/api/renta/draft').set(user.auth);
  const billing = async () =>
    (await request(ctx.app).get('/api/billing').set(user.auth).expect(200)).body;
  const goForward = (days: number) =>
    ctx.clock.set(new Date(ctx.clock.now().getTime() + days * DAY).toISOString());
  const subscribe = () =>
    ctx.container.repos.subscriptions.save({
      ...ctx.container.repos.subscriptions.get(user.id)!,
      source: 'stripe',
      status: 'active',
      currentPeriodEnd: new Date(ctx.clock.now().getTime() + 400 * DAY).toISOString(),
      updatedAt: ctx.clock.now().toISOString(),
    });
  const buyPass = () =>
    webhook(ctx, {
      id: `evt_pass_${++counter}`,
      type: 'renta_pass_purchased',
      userId: user.id,
      customerId: 'cus_1',
    }).expect(200);
  const play = (event: Record<string, unknown>) =>
    request(ctx.app)
      .post('/api/billing/play/webhook')
      .set('Authorization', SECRET)
      .send({
        event: {
          id: `rc_${++counter}`,
          app_user_id: user.id,
          product_id: 'renta_pass_1m',
          ...event,
        },
      });

  beforeEach(async () => {
    ctx = createTestApp({
      now: '2026-03-15T12:00:00Z',
      env: { REVENUECAT_WEBHOOK_AUTH: SECRET },
    });
    user = await createUser(ctx);
  });

  it('is not included in the 14-day trial', async () => {
    const refused = await draft().expect(402);
    expect(refused.body.code).toBe('RENTA_DRAFT_LOCKED');
    expect((await billing()).renta).toEqual({
      draft: { allowed: false, reason: null },
      eligibleOn: null,
      passUntil: null,
    });
  });

  it('is not included for the free plan, and needs a session', async () => {
    expireTrial(ctx, user);
    await draft().expect(402);
    await request(ctx.app).post('/api/renta/draft').expect(401);
  });

  it('is included once paid Premium is more than two months old', async () => {
    subscribe();
    const early = await billing();
    expect(early.renta.draft.allowed).toBe(false);
    expect(early.renta.eligibleOn).toBe(
      new Date(Date.parse('2026-03-15T12:00:00Z') + 60 * DAY).toISOString()
    );
    await draft().expect(402);

    goForward(61);
    expect((await billing()).renta).toMatchObject({
      draft: { allowed: true, reason: 'premium' },
      eligibleOn: null,
    });
    expect((await draft().expect(201)).body.draft.reason).toBe('premium');
  });

  it('counts from the first payment, not from each renewal', async () => {
    subscribe();
    goForward(40);
    subscribe();
    goForward(25);
    expect((await billing()).renta.draft.allowed).toBe(true);
  });

  it('is included at once for the founder plan', async () => {
    ctx.container.repos.subscriptions.save({
      ...ctx.container.repos.subscriptions.get(user.id)!,
      source: 'lifetime',
      lifetime: true,
      status: 'active',
    });
    expect((await billing()).renta.draft).toEqual({ allowed: true, reason: 'premium' });
  });

  it('loses the right when Premium ends', async () => {
    subscribe();
    goForward(61);
    ctx.container.repos.subscriptions.save({
      ...ctx.container.repos.subscriptions.get(user.id)!,
      status: 'canceled',
    });
    expect((await billing()).renta.draft.allowed).toBe(false);
  });

  it('gives access for a month with the pass, and lets the calculator run without limit', async () => {
    expireTrial(ctx, user);
    await buyPass();
    const overview = await billing();
    expect(overview.renta.draft).toEqual({ allowed: true, reason: 'pass' });
    expect(overview.renta.passUntil).toBe(
      new Date(Date.parse('2026-03-15T12:00:00Z') + 30 * DAY).toISOString()
    );
    await draft().expect(201);
    for (let i = 0; i < 3; i++)
      await request(ctx.app).post('/api/renta/calculation').set(user.auth).expect(201);

    goForward(31);
    expect((await billing()).renta.passUntil).toBeNull();
    await draft().expect(402);
    await request(ctx.app).post('/api/renta/calculation').set(user.auth).expect(402);
  });

  it('adds a second pass after the first one', async () => {
    await buyPass();
    goForward(10);
    await buyPass();
    expect((await billing()).renta.passUntil).toBe(
      new Date(Date.parse('2026-03-15T12:00:00Z') + 60 * DAY).toISOString()
    );
  });

  it('takes the pass back when the payment is refunded, and ignores unknown buyers', async () => {
    await buyPass();
    await webhook(ctx, {
      id: 'evt_refund',
      type: 'renta_pass_refunded',
      userId: user.id,
      customerId: 'cus_1',
    }).expect(200);
    expect((await billing()).renta.passUntil).toBeNull();
    await webhook(ctx, {
      id: 'evt_refund_nobody',
      type: 'renta_pass_refunded',
      userId: null,
      customerId: 'cus_unknown',
    }).expect(200);
    await webhook(ctx, {
      id: 'evt_pass_nobody',
      type: 'renta_pass_purchased',
      userId: null,
      customerId: 'cus_unknown',
    }).expect(200);
  });

  it('opens the payment page for the pass with the terms accepted', async () => {
    await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'renta_pass', acceptTerms: false, waiveWithdrawal: true })
      .expect(400);
    const res = await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'renta_pass', acceptTerms: true, waiveWithdrawal: true })
      .expect(200);
    expect(res.body.url).toBe('https://checkout.test/renta_pass');
    expect(ctx.payments.checkouts.at(-1)).toMatchObject({ kind: 'renta_pass', trialEnd: null });
    expect((await billing()).catalog).toMatchObject({
      prices: { rentaPass: 10 },
      rentaPass: { available: true },
    });
  });

  it('does not sell the pass to someone who already has the reader included', async () => {
    subscribe();
    goForward(61);
    const refused = await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'renta_pass', acceptTerms: true, waiveWithdrawal: true })
      .expect(409);
    expect(refused.body.code).toBe('ALREADY_INCLUDED');
  });

  describe('bought in the Android app', () => {
    it('gives the pass without touching the subscription', async () => {
      expireTrial(ctx, user);
      await play({ type: 'NON_RENEWING_PURCHASE' }).expect(200);
      const overview = await billing();
      expect(overview.renta.draft).toEqual({ allowed: true, reason: 'pass' });
      expect(overview.plan).toBe('free');
    });

    it('takes it back on a refund and ignores other events', async () => {
      await play({ type: 'NON_RENEWING_PURCHASE' }).expect(200);
      await play({ type: 'TEST' }).expect(200);
      expect((await billing()).renta.passUntil).not.toBeNull();
      await play({ type: 'CANCELLATION' }).expect(200);
      expect((await billing()).renta.passUntil).toBeNull();
    });
  });
});

describe('Local development', () => {
  it('opens the draft reader to everybody, without a pass', async () => {
    const ctx = createTestApp({ env: { RENTA_DRAFT_OPEN: 'true' } });
    const user = await createUser(ctx);
    const res = await request(ctx.app).post('/api/renta/draft').set(user.auth).expect(201);
    expect(res.body.draft.allowed).toBe(true);
    const closed = createTestApp({ env: { RENTA_DRAFT_OPEN: 'false' } });
    const other = await createUser(closed);
    await request(closed.app).post('/api/renta/draft').set(other.auth).expect(402);
  });
});
