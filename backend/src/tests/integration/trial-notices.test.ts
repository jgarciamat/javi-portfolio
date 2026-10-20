import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

// The trial of a user created at this moment ends on 2026-03-29 at 12:00 UTC.
const START = '2026-03-15T12:00:00Z';
const PUSH = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/trial1',
  keys: { p256dh: 'BPublicKey', auth: 'authSecret' },
};

describe('Trial end notices', () => {
  let ctx: TestContext;
  let user: TestUser;

  const mails = () => ctx.email.sent.filter((s) => s.kind === 'trial');
  const at = (iso: string) => ctx.clock.set(iso);
  const run = () => ctx.container.trialNotices.run();
  const funnel = () =>
    ctx.container.db
      .prepare("SELECT detail, count FROM funnel_daily WHERE event = 'trial_notice' ORDER BY 1")
      .all();
  const patchSubscription = (changes: Record<string, unknown>, who = user) =>
    ctx.container.repos.subscriptions.save({
      ...ctx.container.repos.subscriptions.get(who.id)!,
      ...changes,
    });

  beforeEach(async () => {
    ctx = createTestApp({ now: START });
    user = await createUser(ctx);
  });

  it('writes two days before, on the last day and once after the end, each only once', async () => {
    at('2026-03-26T08:00:00Z');
    expect(await run()).toBe(0);

    at('2026-03-27T08:00:00Z');
    expect(await run()).toBe(1);
    at('2026-03-27T09:00:00Z');
    expect(await run()).toBe(0);

    at('2026-03-28T08:00:00Z');
    expect(await run()).toBe(0);

    at('2026-03-29T08:00:00Z');
    expect(await run()).toBe(1);
    // The trial ends at noon; at 10:00 UTC the same morning nothing more goes out.
    at('2026-03-29T10:00:00Z');
    expect(await run()).toBe(0);

    // After the end there is no e-mail (push only), so nothing goes out and nothing is retried.
    at('2026-03-30T08:00:00Z');
    expect(await run()).toBe(0);
    at('2026-03-31T08:00:00Z');
    expect(await run()).toBe(0);

    expect(mails().map((m) => [m.to, m.trial?.kind])).toEqual([
      [user.email, 'ends_soon'],
      [user.email, 'last_day'],
    ]);
    expect(mails()[0].trial?.endsAt).toBe('2026-03-29T12:00:00.000Z');
    expect(funnel()).toEqual([
      { detail: 'ends_soon:email', count: 1 },
      { detail: 'last_day:email', count: 1 },
    ]);
  });

  it('sends only in the morning window', async () => {
    at('2026-03-27T05:00:00Z');
    expect(await run()).toBe(0);
    at('2026-03-27T14:00:00Z');
    expect(await run()).toBe(0);
    at('2026-03-27T10:00:00Z');
    expect(await run()).toBe(1);
  });

  it('does not write about a trial that ended long ago', async () => {
    at('2026-04-02T08:00:00Z');
    expect(await run()).toBe(0);
    expect(mails()).toHaveLength(0);
  });

  it('counts what the user has created, never names or amounts', async () => {
    for (const name of ['Ocio', 'Comida']) {
      await request(ctx.app)
        .post('/api/budgets')
        .set(user.auth)
        .send({ category: name, limit: 100 });
    }
    at('2026-03-27T08:00:00Z');
    await run();
    const usage = mails()[0].trial!.usage;
    expect(usage.accounts).toBeGreaterThanOrEqual(1);
    expect(Object.keys(usage).sort()).toEqual(['accounts', 'budgets', 'goals', 'recurringRules']);
  });

  it('also notifies the devices that allowed push, with a link to the plans', async () => {
    await request(ctx.app).post('/api/push/subscribe').set(user.auth).send(PUSH).expect(204);
    at('2026-03-27T08:00:00Z');
    expect(await run()).toBe(2);
    expect(ctx.push.sent).toHaveLength(1);
    expect(ctx.push.sent[0].payload).toMatchObject({
      title: 'Tu prueba de Premium termina el 29 de marzo',
      url: '/pricing',
    });
    at('2026-03-29T08:00:00Z');
    await run();
    expect(ctx.push.sent[1].payload.title).toBe('Hoy termina tu prueba de Premium');
    at('2026-03-30T08:00:00Z');
    await run();
    expect(ctx.push.sent[2].payload.title).toBe('Tu prueba de Premium ha terminado');
    expect(funnel()).toContainEqual({ detail: 'ended:push', count: 1 });
  });

  it('writes in English when the user chose it', async () => {
    await request(ctx.app).patch('/api/settings').set(user.auth).send({ locale: 'en' }).expect(200);
    await request(ctx.app).post('/api/push/subscribe').set(user.auth).send(PUSH).expect(204);
    for (const day of ['27', '29', '30']) {
      at(`2026-03-${day}T08:00:00Z`);
      await run();
    }
    expect(ctx.push.sent.map((p) => p.payload.title)).toEqual([
      'Your Premium trial ends on 29 March',
      'Your Premium trial ends today',
      'Your Premium trial has ended',
    ]);
  });

  it('skips push when it is off or the device fails, and keeps the e-mail', async () => {
    await request(ctx.app).post('/api/push/subscribe').set(user.auth).send(PUSH).expect(204);
    ctx.push.enabled = false;
    at('2026-03-27T08:00:00Z');
    expect(await run()).toBe(1);
    expect(ctx.push.sent).toHaveLength(0);
  });

  it('does not write to people who pay, who are cancelling or who turned the notices off', async () => {
    at('2026-03-27T08:00:00Z');
    patchSubscription({ lifetime: true });
    expect(await run()).toBe(0);
    patchSubscription({ lifetime: false, cancelAtPeriodEnd: true });
    expect(await run()).toBe(0);
    patchSubscription({
      cancelAtPeriodEnd: false,
      status: 'active',
      source: 'stripe',
      currentPeriodEnd: '2026-06-01T00:00:00.000Z',
    });
    expect(await run()).toBe(0);
    patchSubscription({ source: 'google' });
    expect(await run()).toBe(0);
    patchSubscription({ status: 'trialing', source: 'trial', currentPeriodEnd: null });
    await request(ctx.app)
      .patch('/api/settings')
      .set(user.auth)
      .send({ trialNotices: false })
      .expect(200);
    expect(await run()).toBe(0);
    expect(mails()).toHaveLength(0);
    // Turned on again: the notice that is due goes out.
    const on = await request(ctx.app)
      .patch('/api/settings')
      .set(user.auth)
      .send({ trialNotices: true })
      .expect(200);
    expect(on.body.trialNotices).toBe(true);
    expect(await run()).toBe(1);
  });

  it('has the notices on by default', async () => {
    const settings = await request(ctx.app).get('/api/settings').set(user.auth).expect(200);
    expect(settings.body.trialNotices).toBe(true);
  });

  it('does not send e-mail to an unverified address', async () => {
    ctx.container.db.prepare('UPDATE users SET email_verified = 0 WHERE id = ?').run(user.id);
    at('2026-03-27T08:00:00Z');
    expect(await run()).toBe(0);
    expect(mails()).toHaveLength(0);
    // Nothing was delivered, so the mark is taken back and a verified address gets it later.
    ctx.container.db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(user.id);
    at('2026-03-27T09:00:00Z');
    expect(await run()).toBe(1);
  });

  it('tries again an hour later when the e-mail provider fails', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const send = jest
      .spyOn(ctx.email, 'sendTrialNotice')
      .mockRejectedValueOnce(new Error('provider down'));
    at('2026-03-27T08:00:00Z');
    expect(await run()).toBe(0);
    expect(error).toHaveBeenCalled();
    send.mockRestore();
    at('2026-03-27T09:00:00Z');
    expect(await run()).toBe(1);
    error.mockRestore();
  });

  it('works for users without saved settings row (defaults)', async () => {
    ctx.container.db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(user.id);
    at('2026-03-27T08:00:00Z');
    expect(await run()).toBe(1);
  });

  it('skips candidates whose subscription row vanished or changed meanwhile', async () => {
    const service = ctx.container.trialNotices;
    at('2026-03-27T08:00:00Z');
    jest.spyOn(ctx.container.repos.subscriptions, 'get').mockReturnValue(null);
    expect(await service.run()).toBe(0);
  });
});
