import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

describe('Buying Premium: consent, confirmation and refunds', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const webhook = (event: Record<string, unknown>) =>
    request(ctx.app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid')
      .send(JSON.stringify(event))
      .expect(200);
  const checkout = (consent: object) =>
    request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'monthly', ...consent });
  const billing = async () =>
    (await request(ctx.app).get('/api/billing').set(user.auth).expect(200)).body;
  const purchaseEmails = () => ctx.email.sent.filter((s) => s.kind === 'purchase');

  it('needs the terms and the immediate start before paying, and records both', async () => {
    for (const consent of [{}, { acceptTerms: true }, { waiveWithdrawal: true }]) {
      expect((await checkout(consent).expect(400)).body.code).toBe('TERMS_REQUIRED');
    }
    expect(ctx.payments.checkouts).toHaveLength(0);

    await checkout({ acceptTerms: true, waiveWithdrawal: true }).expect(200);
    expect(ctx.container.repos.subscriptions.get(user.id)).toMatchObject({
      termsAcceptedAt: '2026-03-15T12:00:00.000Z',
      termsVersion: '2026-10-09',
      withdrawalWaivedAt: '2026-03-15T12:00:00.000Z',
    });
  });

  it('confirms every purchase by e-mail, once', async () => {
    const completed = { type: 'checkout_completed', userId: user.id, customerId: 'cus_1' };
    await webhook({ id: 'evt_sub', ...completed });
    await webhook({ id: 'evt_sub', ...completed });
    expect(purchaseEmails()).toEqual([{ kind: 'purchase', to: user.email, token: '' }]);

    await webhook({
      id: 'evt_life',
      type: 'lifetime_purchased',
      userId: user.id,
      customerId: 'cus_1',
    });
    expect(purchaseEmails()).toHaveLength(2);

    await webhook({ id: 'evt_orphan', type: 'checkout_completed', userId: null, customerId: null });
    expect(purchaseEmails()).toHaveLength(2);
  });

  it('sends the confirmation in the user language and survives a failed e-mail', async () => {
    await request(ctx.app).patch('/api/settings').set(user.auth).send({ locale: 'en' }).expect(200);
    const send = jest.spyOn(ctx.email, 'sendPurchaseConfirmation');
    await webhook({ id: 'evt_en', type: 'checkout_completed', userId: user.id, customerId: null });
    expect(send).toHaveBeenCalledWith(user.email, 'Test User', 'en');

    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    send.mockRejectedValueOnce(new Error('smtp'));
    await webhook({
      id: 'evt_fail',
      type: 'checkout_completed',
      userId: user.id,
      customerId: null,
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(logged).toHaveBeenCalledWith('[email] purchase confirmation failed', expect.any(Error));
    logged.mockRestore();
  });

  it('only cancels: there is no withdrawal with a refund', async () => {
    expect(await billing()).not.toHaveProperty('withdrawal');
    await request(ctx.app).post('/api/billing/withdraw').set(user.auth).send({}).expect(404);
  });

  it('takes Premium back when the founder payment is refunded from the dashboard', async () => {
    await webhook({
      id: 'evt_life',
      type: 'lifetime_purchased',
      userId: user.id,
      customerId: 'cus_1',
    });
    ctx.clock.set('2030-01-01T00:00:00Z');
    expect((await billing()).plan).toBe('premium');
    await webhook({
      id: 'evt_refund',
      type: 'lifetime_refunded',
      userId: null,
      customerId: 'cus_1',
    });
    expect(await billing()).toMatchObject({ plan: 'free', subscription: { lifetime: false } });
    // A second refund event changes nothing.
    await webhook({
      id: 'evt_refund_2',
      type: 'lifetime_refunded',
      userId: user.id,
      customerId: null,
    });
    expect((await billing()).plan).toBe('free');
  });
});

describe('Guided tour setting', () => {
  it('is on by default and can be turned off', async () => {
    const ctx = createTestApp();
    const user = await createUser(ctx);
    const settings = () => request(ctx.app).get('/api/settings').set(user.auth).expect(200);
    expect((await settings()).body.showTour).toBe(true);
    await request(ctx.app)
      .patch('/api/settings')
      .set(user.auth)
      .send({ showTour: false })
      .expect(200);
    expect((await settings()).body.showTour).toBe(false);
  });
});
