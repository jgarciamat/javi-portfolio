import request from 'supertest';
import { CategorySuggester, FinancialAdvisor } from '@domain/ports/services';
import { StaticOfferCatalog } from '@infrastructure/offers/JsonOfferCatalog';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

const DAY = 24 * 60 * 60 * 1000;

const webhook = (ctx: TestContext, event: Record<string, unknown>, signature = 'valid') =>
  request(ctx.app)
    .post('/api/billing/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', signature)
    .send(JSON.stringify(event));

const subscriptionEvent = (user: TestUser, overrides: Record<string, unknown> = {}) => ({
  id: `evt_${Math.random().toString(36).slice(2)}`,
  type: 'subscription_changed',
  userId: user.id,
  customerId: 'cus_1',
  subscriptionId: 'sub_1',
  status: 'active',
  currentPeriodEnd: '2026-04-15T12:00:00Z',
  cancelAtPeriodEnd: false,
  ...overrides,
});

describe('Plans and limits', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const billing = async () =>
    (await request(ctx.app).get('/api/billing').set(user.auth).expect(200)).body;

  it('publishes the plans without authentication', async () => {
    const res = await request(ctx.app).get('/api/billing/plans').expect(200);
    expect(res.body).toMatchObject({
      currency: 'EUR',
      trialDays: 14,
      paymentsEnabled: true,
      prices: { monthly: 2.99, yearly: 24.99, lifetime: 49 },
      lifetime: { available: true, remaining: 100 },
      limits: {
        free: {
          resources: { accounts: 2, budgets: 3 },
          features: { import: false, forecast: false },
        },
        premium: { resources: { accounts: null }, aiMonthlyQuota: 10 },
      },
    });
  });

  it('gives every new user a 14-day Premium trial that then falls back to free', async () => {
    expect(await billing()).toMatchObject({
      plan: 'premium',
      trialDaysLeft: 14,
      subscription: { status: 'trialing', source: 'trial', canManage: false },
      usage: { accounts: 1, budgets: 0, movements: 0 },
      ai: { used: 0, quota: 10 },
    });
    ctx.clock.set(new Date(ctx.clock.now().getTime() + 15 * DAY).toISOString());
    expect(await billing()).toMatchObject({
      plan: 'free',
      trialDaysLeft: 0,
      limits: { resources: { accounts: 2 } },
    });
  });

  it('reports how many movements the user has registered', async () => {
    await addTransaction(ctx, user, { amount: 5 });
    await addTransaction(ctx, user, { amount: 7 });
    expect((await billing()).usage.movements).toBe(2);
  });

  it('answers 402 with the limit when the free plan is full', async () => {
    expireTrial(ctx, user);
    await request(ctx.app)
      .post('/api/accounts')
      .set(user.auth)
      .send({ name: 'Efectivo', type: 'cash' })
      .expect(201);
    const third = await request(ctx.app)
      .post('/api/accounts')
      .set(user.auth)
      .send({ name: 'Tarjeta', type: 'card' })
      .expect(402);
    expect(third.body).toMatchObject({
      code: 'PLAN_LIMIT',
      details: { resource: 'accounts', limit: 2 },
    });

    for (const category of ['Ocio', 'Vivienda', 'Alimentación']) {
      await request(ctx.app)
        .put('/api/budgets')
        .set(user.auth)
        .send({ category, amount: 100 })
        .expect(200);
    }
    // Changing an existing budget is still allowed; a fourth one is not.
    await request(ctx.app)
      .put('/api/budgets')
      .set(user.auth)
      .send({ category: 'Ocio', amount: 150 })
      .expect(200);
    const fourth = await request(ctx.app)
      .put('/api/budgets')
      .set(user.auth)
      .send({ category: 'Salario', amount: 100 })
      .expect(402);
    expect(fourth.body.details).toEqual({ resource: 'budgets', limit: 3 });

    await request(ctx.app)
      .post('/api/goals')
      .set(user.auth)
      .send({ name: 'Viaje', target: 1000 })
      .expect(201);
    const goal = await request(ctx.app)
      .post('/api/goals')
      .set(user.auth)
      .send({ name: 'Coche', target: 1000 })
      .expect(402);
    expect(goal.body.details.resource).toBe('goals');
  });

  it('keeps what was created during the trial but blocks adding more', async () => {
    const created = await request(ctx.app)
      .post('/api/accounts')
      .set(user.auth)
      .send({ name: 'Efectivo', type: 'cash' })
      .expect(201);
    const extra = { id: created.body.find((a: { name: string }) => a.name === 'Efectivo').id };
    await request(ctx.app)
      .patch(`/api/accounts/${extra.id}`)
      .set(user.auth)
      .send({ archived: true })
      .expect(200);
    await request(ctx.app)
      .post('/api/accounts')
      .set(user.auth)
      .send({ name: 'Tarjeta', type: 'card' })
      .expect(201);
    expireTrial(ctx, user);

    // Three accounts were created during the trial; the free plan allows two.
    const list = await request(ctx.app).get('/api/accounts').set(user.auth).expect(200);
    expect(list.body.accounts).toHaveLength(3);
    await request(ctx.app)
      .patch(`/api/accounts/${extra.id}`)
      .set(user.auth)
      .send({ name: 'Cartera' })
      .expect(200);
    const unarchive = await request(ctx.app)
      .patch(`/api/accounts/${extra.id}`)
      .set(user.auth)
      .send({ archived: false })
      .expect(402);
    expect(unarchive.body.code).toBe('PLAN_LIMIT');
  });

  it('limits recurring rules and alerts on the free plan', async () => {
    expireTrial(ctx, user);
    const rule = (n: number) =>
      request(ctx.app)
        .post('/api/recurring-rules')
        .set(user.auth)
        .send({
          description: `Regla ${n}`,
          amount: 10,
          type: 'EXPENSE',
          category: 'Ocio',
          startYear: 2026,
          startMonth: 3,
        });
    for (const n of [1, 2, 3]) await rule(n).expect(201);
    expect((await rule(4).expect(402)).body.details.resource).toBe('recurringRules');

    const alert = (n: number) =>
      request(ctx.app)
        .post('/api/custom-alerts')
        .set(user.auth)
        .send({ name: `Alerta ${n}`, metric: 'expenses_pct', operator: 'gte', threshold: 80 });
    for (const n of [1, 2, 3]) await alert(n).expect(201);
    expect((await alert(4).expect(402)).body.details.resource).toBe('customAlerts');
  });

  it('keeps import and the analysis view for Premium', async () => {
    expireTrial(ctx, user);
    const imported = await request(ctx.app)
      .post('/api/transactions/import')
      .set(user.auth)
      .send({ rows: [{ date: '2026-03-01', description: 'X', amount: -1 }], dryRun: true })
      .expect(402);
    expect(imported.body).toMatchObject({
      code: 'PREMIUM_REQUIRED',
      details: { feature: 'import' },
    });
    await request(ctx.app).get('/api/stats/trends/2026/3').set(user.auth).expect(402);
    await request(ctx.app).get('/api/stats/net-worth').set(user.auth).expect(402);
  });
});

describe('Payments', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const plan = async () =>
    (await request(ctx.app).get('/api/billing').set(user.auth).expect(200)).body;

  it('starts checkout keeping the remaining trial and remembers the customer', async () => {
    const res = await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'yearly', acceptTerms: true, waiveWithdrawal: true })
      .expect(200);
    expect(res.body.url).toBe('https://checkout.test/yearly');
    const [checkout] = ctx.payments.checkouts;
    expect(checkout).toMatchObject({ userId: user.id, email: user.email, kind: 'yearly' });
    expect(checkout.trialEnd?.toISOString()).toBe('2026-03-29T12:00:00.000Z');
    expect(checkout.successUrl).toBe('http://localhost:5173/?billing=success');

    await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'monthly', acceptTerms: true, waiveWithdrawal: true });
    expect(ctx.payments.checkouts[1].customerId).toBe('cus_1');
    expect((await plan()).subscription.canManage).toBe(true);
  });

  it('rejects webhooks with a bad signature', async () => {
    const res = await webhook(ctx, subscriptionEvent(user), 'forged').expect(400);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('activates, renews and cancels Premium from webhooks, once per event', async () => {
    expireTrial(ctx, user);
    expect((await plan()).plan).toBe('free');

    const activated = subscriptionEvent(user);
    await webhook(ctx, activated).expect(200);
    await webhook(ctx, { ...activated, status: 'canceled' }).expect(200); // same id: ignored
    expect(await plan()).toMatchObject({
      plan: 'premium',
      subscription: {
        status: 'active',
        source: 'stripe',
        currentPeriodEnd: '2026-04-15T12:00:00.000Z',
      },
    });

    const again = await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'monthly', acceptTerms: true, waiveWithdrawal: true })
      .expect(409);
    expect(again.body.code).toBe('ALREADY_SUBSCRIBED');

    // A failed renewal keeps Premium for a few days of grace.
    await webhook(ctx, subscriptionEvent(user, { status: 'past_due' })).expect(200);
    ctx.clock.set('2026-04-16T12:00:00Z');
    expect((await plan()).plan).toBe('premium');
    ctx.clock.set('2026-04-19T12:00:00Z');
    expect((await plan()).plan).toBe('free');

    await webhook(ctx, subscriptionEvent(user, { status: 'canceled' })).expect(200);
    expect((await plan()).subscription.status).toBe('canceled');
  });

  it('ignores a late cancellation of a previous subscription', async () => {
    await webhook(ctx, subscriptionEvent(user, { subscriptionId: 'sub_new' })).expect(200);
    await webhook(ctx, subscriptionEvent(user, { subscriptionId: 'sub_old', status: 'canceled' }));
    expireTrial(ctx, user);
    expect(await plan()).toMatchObject({ plan: 'premium', subscription: { status: 'active' } });
  });

  it('opens the customer portal only for paying customers', async () => {
    const none = await request(ctx.app).post('/api/billing/portal').set(user.auth).expect(404);
    expect(none.body.code).toBe('NO_BILLING_ACCOUNT');
    await webhook(ctx, subscriptionEvent(user, { customerId: 'cus_9' }));
    const res = await request(ctx.app).post('/api/billing/portal').set(user.auth).expect(200);
    expect(res.body.url).toBe('https://portal.test/cus_9');
  });

  it('lifetime purchase gives Premium forever and stops the recurring plan', async () => {
    await webhook(ctx, subscriptionEvent(user)).expect(200);
    await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'lifetime', acceptTerms: true, waiveWithdrawal: true })
      .expect(200);
    await webhook(ctx, {
      id: 'evt_lifetime',
      type: 'lifetime_purchased',
      userId: user.id,
      customerId: 'cus_1',
    }).expect(200);
    expect(ctx.payments.cancelled).toEqual([{ subscriptionId: 'sub_1', atPeriodEnd: true }]);

    ctx.clock.set('2036-01-01T00:00:00Z');
    expect(await plan()).toMatchObject({
      plan: 'premium',
      subscription: { lifetime: true, source: 'lifetime' },
      catalog: { lifetime: { remaining: 99 } },
    });
    const again = await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'monthly', acceptTerms: true, waiveWithdrawal: true })
      .expect(409);
    expect(again.body.code).toBe('ALREADY_PREMIUM');
  });

  it('closes the founder offer when the places are gone', async () => {
    const soldOut = createTestApp({ env: { FOUNDER_LIMIT: '0' } });
    const buyer = await createUser(soldOut);
    const res = await request(soldOut.app)
      .post('/api/billing/checkout')
      .set(buyer.auth)
      .send({ kind: 'lifetime', acceptTerms: true, waiveWithdrawal: true })
      .expect(400);
    expect(res.body.code).toBe('FOUNDER_SOLD_OUT');
  });

  it('cancels the subscription when the account is deleted', async () => {
    await webhook(ctx, subscriptionEvent(user)).expect(200);
    await request(ctx.app).delete('/api/profile/account').set(user.auth).expect(204);
    expect(ctx.payments.cancelled).toEqual([{ subscriptionId: 'sub_1', atPeriodEnd: false }]);
  });

  it('keeps the account when the subscription cannot be cancelled', async () => {
    await webhook(ctx, subscriptionEvent(user)).expect(200);
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(ctx.payments, 'cancelSubscription').mockRejectedValue(new Error('Stripe down'));
    const res = await request(ctx.app).delete('/api/profile/account').set(user.auth).expect(400);
    expect(res.body.code).toBe('BILLING_UNAVAILABLE');
    await request(ctx.app).get('/api/profile').set(user.auth).expect(200);
    logged.mockRestore();
  });

  it('applies a lifetime purchase even if the old plan cannot be stopped', async () => {
    await webhook(ctx, subscriptionEvent(user)).expect(200);
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(ctx.payments, 'cancelSubscription').mockRejectedValue(new Error('Stripe down'));
    await webhook(ctx, {
      id: 'evt_life_2',
      type: 'lifetime_purchased',
      userId: user.id,
      customerId: 'cus_1',
    }).expect(200);
    expect(logged).toHaveBeenCalledWith(
      '[billing] could not stop the old subscription',
      expect.any(Error)
    );
    expect(await plan()).toMatchObject({ subscription: { lifetime: true } });
    logged.mockRestore();
  });

  it('ignores payments it cannot link to a user', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await webhook(ctx, {
      id: 'evt_orphan_checkout',
      type: 'checkout_completed',
      userId: null,
      customerId: null,
    }).expect(200);
    await webhook(ctx, {
      id: 'evt_orphan_life',
      type: 'lifetime_purchased',
      userId: 'nobody',
      customerId: 'cus_unknown',
    }).expect(200);
    await webhook(
      ctx,
      subscriptionEvent(
        { ...user, id: 'nobody' },
        {
          id: 'evt_orphan_sub',
          customerId: 'cus_unknown',
          subscriptionId: 'sub_unknown',
        }
      )
    ).expect(200);
    expect(warn.mock.calls.map((c) => c[0])).toEqual([
      '[billing] lifetime purchase evt_orphan_life without a known user',
      '[billing] subscription sub_unknown without a known user',
    ]);
    expect(await plan()).toMatchObject({ subscription: { lifetime: false } });
    warn.mockRestore();
  });

  it('remembers the customer of a first checkout only once', async () => {
    await webhook(ctx, {
      id: 'evt_first',
      type: 'checkout_completed',
      userId: user.id,
      customerId: 'cus_first',
    }).expect(200);
    await webhook(ctx, {
      id: 'evt_second',
      type: 'checkout_completed',
      userId: user.id,
      customerId: 'cus_second',
    }).expect(200);
    const res = await request(ctx.app).post('/api/billing/portal').set(user.auth).expect(200);
    expect(res.body.url).toBe('https://portal.test/cus_first');
  });
});

describe('Premium AI', () => {
  const advice = { summary: 'IA', tips: ['t'], positives: [], warnings: [] };

  // Late in the month so the trial is still running when the next month starts.
  const setup = async (advisor: FinancialAdvisor | null) => {
    const ctx = createTestApp({ advisor, now: '2026-03-25T12:00:00Z' });
    const user = await createUser(ctx);
    await addTransaction(ctx, user, { type: 'INCOME', category: 'Salario', amount: 1000 });
    const ask = () =>
      request(ctx.app).post('/api/ai/advice').set(user.auth).send({ year: 2026, month: 3 });
    return { ctx, user, ask };
  };

  const fakeAdvisor = (): FinancialAdvisor => ({
    name: 'fake',
    getAdvice: jest.fn().mockResolvedValue({ advice, usage: { neurons: 25 } }),
  });

  it('gives free users one AI analysis a month and then the rule-based one', async () => {
    const advisor = fakeAdvisor();
    const { ctx, user, ask } = await setup(advisor);
    expireTrial(ctx, user);
    expect((await ask().expect(200)).body).toMatchObject({
      source: 'ai',
      ai: { used: 1, quota: 1 },
    });
    await addTransaction(ctx, user, { amount: 5 }); // other figures: no cache
    expect((await ask().expect(200)).body).toMatchObject({ source: 'rules', reason: 'quota' });
    expect(advisor.getAdvice).toHaveBeenCalledTimes(1);
    ctx.clock.set('2026-04-02T08:00:00Z'); // a new month: one more
    expect((await ask().expect(200)).body.source).toBe('ai');
  });

  it('counts analyses and neurons and stops at the monthly quota', async () => {
    const advisor = fakeAdvisor();
    const { ctx, user, ask } = await setup(advisor);
    expect((await ask()).body).toMatchObject({ source: 'ai', ai: { used: 1, quota: 10 } });
    expect(ctx.container.repos.aiUsage.neuronsOn('2026-03-25')).toBe(25);

    for (let i = 1; i < 10; i++) ctx.container.repos.aiUsage.addUserCall(user.id, '2026-03');
    // Same figures: served from the cache even with the quota spent.
    expect((await ask()).body.source).toBe('ai');
    await addTransaction(ctx, user, { amount: 5 });
    expect((await ask()).body).toMatchObject({ source: 'rules', reason: 'quota' });
    expect(advisor.getAdvice).toHaveBeenCalledTimes(1);

    ctx.clock.set('2026-04-01T08:00:00Z'); // a new month resets the quota
    expect((await ask()).body).toMatchObject({ source: 'ai', ai: { used: 1 } });
  });

  it('stops every AI call when the daily neuron budget is spent', async () => {
    const advisor = fakeAdvisor();
    const { ctx, ask } = await setup(advisor);
    ctx.container.repos.aiUsage.addNeurons('2026-03-25', 9000);
    expect((await ask()).body).toMatchObject({ source: 'rules', reason: 'budget' });
    ctx.clock.set('2026-03-26T00:30:00Z'); // the budget is per UTC day
    expect((await ask()).body.source).toBe('ai');
  });

  it('says when no provider is configured', async () => {
    const { ask } = await setup(null);
    expect((await ask()).body).toMatchObject({ source: 'rules', reason: 'unavailable' });
  });

  it('suggests categories for imported rows nothing else could place', async () => {
    const suggester: CategorySuggester = {
      suggestCategories: jest.fn(async (descriptions: string[]) => ({
        suggestions: descriptions.map((d) => (d.startsWith('KARAOKE') ? 'Ocio' : null)),
        usage: { neurons: 3 },
      })),
    };
    const ctx = createTestApp({ categorySuggester: suggester });
    const user = await createUser(ctx);
    const rows = [
      { date: '2026-03-01', description: 'KARAOKE LUNA 123456789', amount: -12.99 },
      { date: '2026-03-02', description: 'ZXQ 42', amount: -5 },
      { date: '2026-03-03', description: 'MERCADONA VALENCIA', amount: -20 },
    ];
    const send = (dryRun: boolean) =>
      request(ctx.app).post('/api/transactions/import').set(user.auth).send({ rows, dryRun });
    const preview = (await send(true).expect(200)).body.rows;
    expect(preview[0]).toMatchObject({ categoryName: 'Ocio', categorySource: 'ai' });
    expect(preview[1]).toMatchObject({ categoryName: 'Otros', categorySource: 'fallback' });
    expect(preview[2]).toMatchObject({ categorySource: 'keywords' });

    await send(false).expect(201);
    // Keyword matches are not sent and the preview's answers are reused.
    expect(suggester.suggestCategories).toHaveBeenCalledTimes(1);
    expect((suggester.suggestCategories as jest.Mock).mock.calls[0][0]).toEqual([
      'KARAOKE LUNA 123456789',
      'ZXQ 42',
    ]);
    expect(ctx.container.repos.aiUsage.neuronsOn('2026-03-15')).toBe(3);
  });
});

describe('Partner offers', () => {
  const offers = new StaticOfferCatalog([
    {
      id: 'bank-a',
      category: 'banking',
      name: 'Banco A',
      icon: '🏦',
      title: { es: 'Cuenta sin comisiones', en: 'No-fee account' },
      description: { es: 'Descripción', en: 'Description' },
      highlight: null,
      url: 'https://partner.example/a',
      active: true,
    },
    {
      id: 'old',
      category: 'other',
      name: 'Old',
      icon: '🏷️',
      title: { es: 'x', en: 'x' },
      description: { es: 'x', en: 'x' },
      highlight: null,
      url: 'https://partner.example/old',
      active: false,
    },
  ]);

  it('lists active offers, records clicks and respects the setting', async () => {
    const ctx = createTestApp({ offers });
    const user = await createUser(ctx);
    const list = await request(ctx.app).get('/api/offers').set(user.auth).expect(200);
    expect(list.body.enabled).toBe(true);
    expect(list.body.offers.map((o: { id: string }) => o.id)).toEqual(['bank-a']);

    const click = await request(ctx.app)
      .post('/api/offers/bank-a/click')
      .set(user.auth)
      .expect(200);
    expect(click.body.url).toBe('https://partner.example/a');
    expect(ctx.container.repos.affiliateClicks.countByOffer(new Date(0))).toEqual({ 'bank-a': 1 });
    await request(ctx.app).post('/api/offers/old/click').set(user.auth).expect(404);

    await request(ctx.app)
      .patch('/api/settings')
      .set(user.auth)
      .send({ showOffers: false })
      .expect(200);
    const hidden = await request(ctx.app).get('/api/offers').set(user.auth).expect(200);
    expect(hidden.body).toEqual({ enabled: false, offers: [] });
  });
});
