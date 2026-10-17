import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
} from '../helpers/testApp';

const SUB = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'BPublicKey', auth: 'authSecret' },
};

describe('Push notifications', () => {
  let ctx: TestContext;
  let user: TestUser;

  const subscribe = (body: unknown = SUB, who = user) =>
    request(ctx.app)
      .post('/api/push/subscribe')
      .set(who.auth)
      .send(body as object);

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-31T08:00:00Z' });
    user = await createUser(ctx);
  });

  it('tells the app whether push is configured and the public key to subscribe with', async () => {
    const on = await request(ctx.app).get('/api/push/key').set(user.auth).expect(200);
    expect(on.body).toEqual({ enabled: true, publicKey: 'test-public-key' });
    ctx.push.enabled = false;
    ctx.push.publicKey = () => null as never;
    const off = await request(ctx.app).get('/api/push/key').set(user.auth).expect(200);
    expect(off.body.enabled).toBe(false);
    await request(ctx.app).get('/api/push/key').expect(401);
  });

  it('subscribes a device, sends a test notification and unsubscribes', async () => {
    await subscribe().expect(204);
    await subscribe().expect(204);
    const res = await request(ctx.app).post('/api/push/test').set(user.auth).expect(200);
    expect(res.body.sent).toBe(1);
    expect(ctx.push.sent).toHaveLength(1);
    expect(ctx.push.sent[0].payload.body).toContain('funcionan');
    await request(ctx.app)
      .post('/api/push/unsubscribe')
      .set(user.auth)
      .send({ endpoint: SUB.endpoint })
      .expect(204);
    expect((await request(ctx.app).post('/api/push/test').set(user.auth)).body.sent).toBe(0);
  });

  it('validates the subscription and refuses it when push is off', async () => {
    await subscribe({ endpoint: 'nope', keys: SUB.keys }).expect(400);
    await subscribe({ endpoint: SUB.endpoint }).expect(400);
    // Only the browsers' push services: no other host, IP, port, credentials or plain http.
    for (const endpoint of [
      'https://push.example.test/send/abc',
      'http://fcm.googleapis.com/fcm/send/abc',
      'https://fcm.googleapis.com:8443/fcm/send/abc',
      'https://user:pass@fcm.googleapis.com/fcm/send/abc',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/x',
      'https://evil-fcm.googleapis.com.example.com/x',
      'https://storage.googleapis.com/bucket',
      'https://notify.windows.com.evil.test/x',
    ]) {
      const refused = await subscribe({ endpoint, keys: SUB.keys }).expect(400);
      expect(refused.body.code).toBe('VALIDATION_ERROR');
    }
    for (const endpoint of [
      'https://fcm.googleapis.com:443/fcm/send/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://wns2-db5p.notify.windows.com/w/?token=abc',
      'https://web.push.apple.com/QAbc',
      'https://api.push.apple.com/3/device/abc',
    ]) {
      await subscribe({ endpoint, keys: SUB.keys }).expect(204);
    }
    ctx.push.enabled = false;
    const res = await subscribe().expect(400);
    expect(res.body.code).toBe('PUSH_DISABLED');
  });

  it('forgets a subscription the push service says is gone, and survives a failing one', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await subscribe().expect(204);
    ctx.push.fail = true;
    expect((await request(ctx.app).post('/api/push/test').set(user.auth)).body.sent).toBe(0);
    expect(error).toHaveBeenCalled();
    ctx.push.fail = false;
    ctx.push.gone.add(SUB.endpoint);
    expect((await request(ctx.app).post('/api/push/test').set(user.auth)).body.sent).toBe(0);
    ctx.push.gone.clear();
    expect((await request(ctx.app).post('/api/push/test').set(user.auth)).body.sent).toBe(0);
    error.mockRestore();
  });

  it('never sends to an endpoint of an unknown host saved before the check', async () => {
    ctx.container.repos.push.save(
      {
        id: 'legacy',
        userId: user.id,
        endpoint: 'http://127.0.0.1:8080/x',
        p256dh: 'p',
        auth: 'a',
      },
      ctx.clock.now().toISOString()
    );
    expect((await request(ctx.app).post('/api/push/test').set(user.auth)).body.sent).toBe(0);
    expect(ctx.push.sent).toHaveLength(0);
    expect(ctx.container.repos.push.listByUser(user.id)).toHaveLength(0);
  });

  it('does not let another user take over an endpoint without its keys', async () => {
    const other = await createUser(ctx, 'intruso@example.com');
    await subscribe().expect(204);
    await subscribe(
      { endpoint: SUB.endpoint, keys: { p256dh: 'BOther', auth: 'other' } },
      other
    ).expect(204);
    expect(ctx.container.repos.push.listByUser(user.id)).toHaveLength(1);
    expect(ctx.container.repos.push.listByUser(other.id)).toHaveLength(0);
    // The owner can renew its own keys.
    await subscribe({ endpoint: SUB.endpoint, keys: { p256dh: 'BNew', auth: 'new' } }).expect(204);
    expect(ctx.container.repos.push.listByUser(user.id)[0]).toMatchObject({ p256dh: 'BNew' });
    // The same browser (same keys) subscribed by whoever signs in on it next moves over.
    await subscribe(
      { endpoint: SUB.endpoint, keys: { p256dh: 'BNew', auth: 'new' } },
      other
    ).expect(204);
    expect(ctx.container.repos.push.listByUser(user.id)).toHaveLength(0);
    expect(ctx.container.repos.push.listByUser(other.id)).toHaveLength(1);
  });

  it('keeps subscriptions private to their owner', async () => {
    const other = await createUser(ctx, 'otra@example.com');
    await subscribe().expect(204);
    expect((await request(ctx.app).post('/api/push/test').set(other.auth)).body.sent).toBe(0);
    await request(ctx.app)
      .post('/api/push/unsubscribe')
      .set(other.auth)
      .send({ endpoint: SUB.endpoint })
      .expect(204);
    expect((await request(ctx.app).post('/api/push/test').set(user.auth)).body.sent).toBe(1);
  });
});

describe('Scheduled push reminders', () => {
  let ctx: TestContext;
  let user: TestUser;

  const rule = (description: string, amount: number, type = 'EXPENSE') =>
    request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({ description, amount, type, category: 'Vivienda', startYear: 2026, startMonth: 3 })
      .expect(201);

  beforeEach(async () => {
    // Tuesday 31 March, 8:00 UTC: April starts tomorrow.
    ctx = createTestApp({ now: '2026-03-31T08:00:00Z' });
    user = await createUser(ctx);
    await request(ctx.app).post('/api/push/subscribe').set(user.auth).send(SUB).expect(204);
  });

  it('warns the day before the next period charges the automatic expenses, once', async () => {
    await rule('Alquiler', 700);
    await rule('Gimnasio', 30);
    await rule('Nómina', 2000, 'INCOME');
    expect(await ctx.container.reminders.run()).toBe(1);
    expect(ctx.push.sent[0].payload).toMatchObject({
      title: 'Mañana se cobran tus operaciones automáticas',
      body: expect.stringContaining('2 operaciones por'),
    });
    ctx.clock.set('2026-03-31T09:00:00Z');
    expect(await ctx.container.reminders.run()).toBe(0);
  });

  it('says nothing when nothing is charged tomorrow or it is not the morning', async () => {
    expect(await ctx.container.reminders.run()).toBe(0);
    await rule('Alquiler', 700);
    ctx.clock.set('2026-03-31T15:00:00Z');
    expect(await ctx.container.reminders.run()).toBe(0);
    ctx.clock.set('2026-03-25T08:00:00Z');
    expect(await ctx.container.reminders.run()).toBe(0);
  });

  it('sends the Monday summary of last week, in the language of the user', async () => {
    ctx.clock.set('2026-03-09T08:00:00Z');
    await addTransaction(ctx, user, { amount: 40, date: '2026-03-03' });
    await addTransaction(ctx, user, { amount: 20, date: '2026-02-26' });
    expect(await ctx.container.reminders.run()).toBe(1);
    expect(ctx.push.sent[0].payload.body).toContain('+100 %');
    ctx.clock.set('2026-03-09T09:00:00Z');
    expect(await ctx.container.reminders.run()).toBe(0);
    await request(ctx.app).patch('/api/settings').set(user.auth).send({ locale: 'en' }).expect(200);
    ctx.clock.set('2026-03-16T08:00:00Z');
    expect(await ctx.container.reminders.run()).toBe(1);
    expect(ctx.push.sent[1].payload.title).toBe('Your weekly summary');
    expect(ctx.push.sent[1].payload.body).toContain('Last week you spent');
  });

  it('has no comparison to show without a week before, and does nothing when push is off', async () => {
    ctx.clock.set('2026-03-09T08:00:00Z');
    await addTransaction(ctx, user, { amount: 40, date: '2026-03-03' });
    await ctx.container.reminders.run();
    expect(ctx.push.sent[0].payload.body).toMatch(/^La semana pasada gastaste [^(]*\.$/);
    ctx.push.enabled = false;
    ctx.clock.set('2026-03-16T08:00:00Z');
    expect(await ctx.container.reminders.run()).toBe(0);
  });

  it('announces bills in English with a singular movement', async () => {
    await request(ctx.app).patch('/api/settings').set(user.auth).send({ locale: 'en' }).expect(200);
    await rule('Alquiler', 700);
    await ctx.container.reminders.run();
    expect(ctx.push.sent[0].payload.body).toContain('1 movement for');
  });

  it('announces a single bill in Spanish', async () => {
    await rule('Alquiler', 700);
    await ctx.container.reminders.run();
    expect(ctx.push.sent[0].payload.body).toMatch(/^1 operación por 700,00\s€\.$/);
  });

  it('shows a drop in spending without a plus sign, in both languages', async () => {
    ctx.clock.set('2026-03-09T08:00:00Z');
    await addTransaction(ctx, user, { amount: 20, date: '2026-03-03' });
    await addTransaction(ctx, user, { amount: 40, date: '2026-02-26' });
    await ctx.container.reminders.run();
    expect(ctx.push.sent[0].payload.body).toContain('(-50 % respecto a la anterior)');

    await request(ctx.app).patch('/api/settings').set(user.auth).send({ locale: 'en' }).expect(200);
    await addTransaction(ctx, user, { amount: 30, date: '2026-03-10' });
    ctx.clock.set('2026-03-16T08:00:00Z');
    await ctx.container.reminders.run();
    expect(ctx.push.sent[1].payload.body).toBe(
      'Last week you spent €30.00 (+50% vs the week before).'
    );

    ctx.clock.set('2026-03-30T08:00:00Z');
    await ctx.container.reminders.run();
    expect(ctx.push.sent[2].payload.body).toBe('Last week you spent €0.00.');
  });
});
