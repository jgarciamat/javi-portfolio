import request from 'supertest';
import { STRONG_PASSWORD, TestContext, createTestApp } from '../helpers/testApp';

const SECRET = 'revenuecat-shared-secret-123';
const DAY = 24 * 60 * 60 * 1000;
const ON = { CREATOR_PROGRAM: 'true', REVENUECAT_WEBHOOK_AUTH: SECRET };

let events = 0;
const stripe = (ctx: TestContext, event: Record<string, unknown>) =>
  request(ctx.app)
    .post('/api/billing/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', 'valid')
    .send(JSON.stringify({ id: `evt_${++events}`, ...event }))
    .expect(200);
const play = (ctx: TestContext, event: Record<string, unknown>) =>
  request(ctx.app)
    .post('/api/billing/play/webhook')
    .set('Authorization', SECRET)
    .send({ event: { id: `rc_${++events}`, ...event } })
    .expect(200);

/** Signs up by e-mail with whatever the app sends as `creator`; returns the new user's id. */
async function signUp(ctx: TestContext, email: string, creator?: unknown): Promise<string> {
  await request(ctx.app)
    .post('/api/auth/register')
    .send({ email, password: STRONG_PASSWORD, name: 'Lola', creator })
    .expect(201);
  return ctx.container.repos.users.findByEmail(email)!.id;
}

describe('Creator affiliate program', () => {
  let ctx: TestContext;
  const attribution = (userId: string) => ctx.container.repos.creators.attributionOf(userId);
  const saleOf = (userId: string) => ctx.container.repos.creators.saleOf(userId);

  beforeEach(() => {
    ctx = createTestApp({ env: ON });
    ctx.container.creators.addAffiliate('ANA', 'Ana Finanzas', null);
  });

  it('attributes a sign-up only when the person ticked the box', async () => {
    const yes = await signUp(ctx, 'si@example.com', { code: 'ana', consent: true });
    expect(attribution(yes)).toMatchObject({ code: 'ANA' });

    for (const [i, creator] of [
      undefined,
      { code: 'ANA' },
      { code: 'ANA', consent: false },
      { code: 'ANA', consent: 'yes' },
      { code: 'ANA', consent: true, userId: 'x' },
      { code: 'X'.repeat(40), consent: true },
      'ANA',
    ].entries()) {
      const id = await signUp(ctx, `no${i}@example.com`, creator);
      expect(attribution(id)).toBeNull();
    }
  });

  it('never attributes an e-mail that already had an account', async () => {
    const id = await signUp(ctx, 'ya@example.com');
    await signUp(ctx, 'ya@example.com', { code: 'ANA', consent: true });
    expect(attribution(id)).toBeNull();
  });

  it('attributes a new Google account, not an existing one', async () => {
    ctx.google.identities.set('g', {
      googleId: 'g-1',
      email: 'gina@gmail.com',
      emailVerified: true,
      name: 'Gina',
    });
    const google = (creator: unknown) =>
      request(ctx.app).post('/api/auth/google').send({ token: 'g', creator }).expect(200);
    const first = await google({ code: 'ANA', consent: true });
    expect(attribution(first.body.user.id)).toMatchObject({ code: 'ANA' });
    ctx.container.creators.forget(first.body.user.id);
    await google({ code: 'ANA', consent: true });
    expect(attribution(first.body.user.id)).toBeNull();
  });

  it('ignores the code while the program is off', async () => {
    ctx = createTestApp();
    ctx.container.creators.addAffiliate('ANA', 'Ana', null);
    const id = await signUp(ctx, 'off@example.com', { code: 'ANA', consent: true });
    expect(attribution(id)).toBeNull();
  });

  it('counts the first paid web invoice and takes it back on a refund', async () => {
    const id = await signUp(ctx, 'web@example.com', { code: 'ANA', consent: true });
    await stripe(ctx, { type: 'premium_paid', userId: id, customerId: 'cus_1', plan: 'yearly' });
    await stripe(ctx, { type: 'premium_paid', userId: id, customerId: 'cus_1', plan: 'monthly' });
    expect(saleOf(id)).toMatchObject({ plan: 'yearly', provider: 'stripe', commissionCents: 700 });

    // Refunds come with the customer only: the subscription row links it to the user.
    const sub = ctx.container.repos.subscriptions.get(id)!;
    ctx.container.repos.subscriptions.save({ ...sub, stripeCustomerId: 'cus_1' });
    await stripe(ctx, { type: 'premium_reversed', userId: null, customerId: 'cus_unknown' });
    expect(saleOf(id)!.reversedAt).toBeNull();
    await stripe(ctx, { type: 'premium_reversed', userId: null, customerId: 'cus_1' });
    expect(saleOf(id)!.reversedAt).not.toBeNull();
  });

  it('ignores payments of unknown users and of users without a code', async () => {
    const plain = await signUp(ctx, 'plain@example.com');
    await stripe(ctx, { type: 'premium_paid', userId: null, customerId: 'cus_x', plan: 'yearly' });
    await stripe(ctx, { type: 'premium_paid', userId: plain, customerId: null, plan: 'yearly' });
    expect(ctx.container.repos.creators.sales()).toEqual([]);
  });

  it('counts the founder plan and its refund', async () => {
    const id = await signUp(ctx, 'founder@example.com', { code: 'ANA', consent: true });
    await stripe(ctx, { type: 'lifetime_purchased', userId: id, customerId: 'cus_9' });
    expect(saleOf(id)).toMatchObject({ plan: 'lifetime', commissionCents: 1000 });
    await stripe(ctx, { type: 'lifetime_refunded', userId: id, customerId: 'cus_9' });
    expect(saleOf(id)!.reversedAt).not.toBeNull();
    await stripe(ctx, { type: 'lifetime_refunded', userId: null, customerId: 'cus_none' });
  });

  it('counts a paid Google Play purchase, not a trial, and takes refunds back', async () => {
    const id = await signUp(ctx, 'play@example.com', { code: 'ANA', consent: true });
    const end = ctx.clock.now().getTime() + 30 * DAY;
    const monthly = { app_user_id: id, product_id: 'premium_monthly:monthly' };
    await play(ctx, { ...monthly, type: 'INITIAL_PURCHASE', period_type: 'TRIAL', price: 0 });
    await play(ctx, { ...monthly, type: 'RENEWAL', period_type: 'NORMAL', price: null });
    expect(saleOf(id)).toBeNull();
    await play(ctx, {
      ...monthly,
      type: 'RENEWAL',
      period_type: 'NORMAL',
      price: 3.79,
      expiration_at_ms: end,
    });
    expect(saleOf(id)).toMatchObject({ plan: 'monthly', provider: 'google', commissionCents: 200 });

    // Stopping the renewal is not a refund; a refund by support is.
    await play(ctx, { ...monthly, type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' });
    expect(saleOf(id)!.reversedAt).toBeNull();
    await play(ctx, { ...monthly, type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT' });
    expect(saleOf(id)!.reversedAt).not.toBeNull();
  });

  it('knows the Play plans and refunds of the founder plan', async () => {
    const yearly = await signUp(ctx, 'annual@example.com', { code: 'ANA', consent: true });
    await play(ctx, {
      type: 'INITIAL_PURCHASE',
      app_user_id: yearly,
      product_id: 'premium_annual:annual',
      price: 32.99,
    });
    expect(saleOf(yearly)).toMatchObject({ plan: 'yearly' });

    const odd = await signUp(ctx, 'odd@example.com', { code: 'ANA', consent: true });
    await play(ctx, { type: 'INITIAL_PURCHASE', app_user_id: odd, product_id: 'pro', price: 5 });
    expect(saleOf(odd)).toBeNull();

    const founder = await signUp(ctx, 'life@example.com', { code: 'ANA', consent: true });
    const life = { app_user_id: founder, product_id: 'premium_lifetime' };
    await play(ctx, { ...life, type: 'NON_RENEWING_PURCHASE', price: 64 });
    expect(saleOf(founder)).toMatchObject({ plan: 'lifetime' });
    await play(ctx, { ...life, type: 'CANCELLATION' });
    expect(saleOf(founder)!.reversedAt).not.toBeNull();
  });

  it('keeps the sale anonymously when the account is deleted, and exports the attribution', async () => {
    const email = 'bye@example.com';
    const id = await signUp(ctx, email, { code: 'ANA', consent: true });
    const sent = [...ctx.email.sent].reverse().find((s) => s.to === email && s.kind === 'verify');
    await request(ctx.app).get('/api/auth/verify-email').query({ token: sent!.token }).expect(200);
    const login = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email, password: STRONG_PASSWORD })
      .expect(200);
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };
    await stripe(ctx, { type: 'premium_paid', userId: id, customerId: null, plan: 'monthly' });

    const exported = await request(ctx.app).get('/api/export').set(auth).expect(200);
    expect(exported.body.creator).toEqual({
      code: 'ANA',
      consentedAt: '2026-03-15T12:00:00.000Z',
      sale: { plan: 'monthly', soldAt: '2026-03-15T12:00:00.000Z', reversedAt: null },
    });

    await request(ctx.app)
      .delete('/api/profile/account')
      .set(auth)
      .send({ password: STRONG_PASSWORD })
      .expect(204);
    expect(attribution(id)).toBeNull();
    expect(ctx.container.repos.creators.sales()).toHaveLength(1);
    expect(ctx.container.creators.report().creators[0]).toMatchObject({ signups: 0, sales: 1 });
  });
});
