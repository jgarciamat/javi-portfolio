import request from 'supertest';
import { weeklyDigestEmail } from '@infrastructure/mail/templates';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
} from '../helpers/testApp';

// 2026-03-09 is a Monday.
const MONDAY = '2026-03-09T08:00:00Z';

describe('Weekly digest', () => {
  let ctx: TestContext;
  let user: TestUser;

  const digests = () => ctx.email.sent.filter((s) => s.kind === 'digest');
  const optIn = (who = user) =>
    request(ctx.app).patch('/api/settings').set(who.auth).send({ weeklyDigest: true }).expect(200);

  beforeEach(async () => {
    ctx = createTestApp({ now: MONDAY });
    user = await createUser(ctx);
    await addTransaction(ctx, user, { amount: 40, date: '2026-03-03', category: 'Ocio' });
    await addTransaction(ctx, user, { amount: 60, date: '2026-03-05', category: 'Alimentación' });
    await addTransaction(ctx, user, { amount: 50, date: '2026-02-26', category: 'Ocio' });
    await addTransaction(ctx, user, {
      type: 'INCOME',
      amount: 1000,
      date: '2026-03-02',
      category: 'Salario',
    });
  });

  it('is off until the user asks for it', async () => {
    const settings = (await request(ctx.app).get('/api/settings').set(user.auth)).body;
    expect(settings.weeklyDigest).toBe(false);
    expect(await ctx.container.weeklyDigest.run()).toBe(0);
    expect(digests()).toHaveLength(0);
  });

  it("sends last week's summary once on Monday morning", async () => {
    await optIn();
    expect(await ctx.container.weeklyDigest.run()).toBe(1);
    const [mail] = digests();
    expect(mail.to).toBe(user.email);
    expect(mail.digest).toMatchObject({
      from: '2026-03-02',
      to: '2026-03-08',
      spentCents: 10000,
      previousSpentCents: 5000,
      changePct: 100,
      incomeCents: 100000,
    });
    expect(mail.digest?.topCategories[0]).toEqual({ name: 'Alimentación', cents: 6000 });
    // The same morning, an hour later: nothing more.
    ctx.clock.set('2026-03-09T09:00:00Z');
    expect(await ctx.container.weeklyDigest.run()).toBe(0);
    expect(digests()).toHaveLength(1);
  });

  it('waits for Monday morning and for the next week', async () => {
    await optIn();
    ctx.clock.set('2026-03-10T08:00:00Z');
    expect(await ctx.container.weeklyDigest.run()).toBe(0);
    ctx.clock.set('2026-03-09T20:00:00Z');
    expect(await ctx.container.weeklyDigest.run()).toBe(0);
    ctx.clock.set(MONDAY);
    expect(await ctx.container.weeklyDigest.run()).toBe(1);
    ctx.clock.set('2026-03-16T08:00:00Z');
    expect(await ctx.container.weeklyDigest.run()).toBe(1);
  });

  it('announces the automatic charges of the next period when it starts within a week', async () => {
    ctx.clock.set('2026-03-30T08:00:00Z'); // Monday; April starts in two days
    await request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({
        description: 'Alquiler',
        amount: 700,
        type: 'EXPENSE',
        category: 'Vivienda',
        startYear: 2026,
        startMonth: 3,
      })
      .expect(201);
    await request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({
        description: 'Nómina',
        amount: 2000,
        type: 'INCOME',
        category: 'Salario',
        startYear: 2026,
        startMonth: 3,
      })
      .expect(201);
    await optIn();
    await ctx.container.weeklyDigest.run();
    expect(digests()[0].digest?.upcoming).toEqual({
      date: '2026-04-01',
      items: [{ description: 'Alquiler', amountCents: 70000 }],
      totalCents: 70000,
    });
  });

  it('keeps going when one e-mail fails and tries again later', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await optIn();
    const send = jest
      .spyOn(ctx.email, 'sendWeeklyDigest')
      .mockRejectedValueOnce(new Error('provider down'));
    expect(await ctx.container.weeklyDigest.run()).toBe(0);
    expect(error).toHaveBeenCalled();
    send.mockRestore();
    ctx.clock.set('2026-03-09T09:00:00Z');
    expect(await ctx.container.weeklyDigest.run()).toBe(1);
    error.mockRestore();
  });
});

describe('weekly digest e-mail', () => {
  const digest = {
    from: '2026-03-02',
    to: '2026-03-08',
    spentCents: 12345,
    previousSpentCents: 10000,
    changePct: 23,
    incomeCents: 0,
    topCategories: [{ name: '<b>Ocio</b>', cents: 5000 }],
    upcoming: {
      date: '2026-04-01',
      items: [{ description: 'Alquiler', amountCents: 70000 }],
      totalCents: 70000,
    },
  };

  it('is written in the language of the user, with the amounts in their currency', () => {
    const es = weeklyDigestEmail('es', 'Ana', digest, 'EUR', 'https://app.test');
    expect(es.subject).toContain('resumen semanal');
    expect(es.text).toContain('23 % más que la semana anterior');
    expect(es.text).toContain('Alquiler');
    expect(es.html).toContain('&lt;b&gt;Ocio&lt;/b&gt;');
    const en = weeklyDigestEmail(
      'en',
      'Ann',
      { ...digest, changePct: -10 },
      'USD',
      'https://app.test'
    );
    expect(en.text).toContain('10% less than the week before');
    expect(en.text).toContain('https://app.test');
  });

  it('skips what it has nothing to say about', () => {
    const quiet = weeklyDigestEmail(
      'es',
      'Ana',
      { ...digest, changePct: null, topCategories: [], upcoming: null },
      'EUR',
      'https://app.test'
    );
    expect(quiet.text).not.toContain('más que');
    expect(quiet.text).not.toContain('Donde más');
    expect(quiet.text).not.toContain('automáticas');
    const same = weeklyDigestEmail(
      'en',
      'Ann',
      { ...digest, changePct: 0 },
      'EUR',
      'https://app.test'
    );
    expect(same.text).toContain('The same as the week before.');
  });
});
