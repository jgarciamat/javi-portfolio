import request from 'supertest';
import { Transaction } from '@domain/model/Transaction';
import { findingId } from '@domain/services/money-leaks';
import { TestContext, TestUser, createTestApp, createUser, expireTrial } from '../helpers/testApp';

// Every merchant, amount and date below is made up.
type Row = [description: string, date: string, euros: number, category?: string, type?: string];

/** Saves movements straight in the repository (faster than one request each). */
function seed(ctx: TestContext, user: TestUser, rows: Row[], monthStartDay = 1): void {
  const { repos } = ctx.container;
  const accountId = repos.accounts.listByUser(user.id)[0].id;
  for (const [description, date, euros, category = 'Ocio', type = 'EXPENSE'] of rows) {
    const categoryId = repos.categories.findByName(user.id, category)!.id;
    repos.transactions.save(
      Transaction.create(
        {
          userId: user.id,
          accountId,
          categoryId,
          description,
          amountCents: Math.round(euros * 100),
          type,
          date,
        },
        monthStartDay,
        ctx.clock.now()
      )
    );
  }
}

/** Day 5 of each month from `from` (YYYY-MM), `count` months. */
const monthly = (description: string, from: string, count: number, euros: number): Row[] =>
  Array.from({ length: count }, (_, i) => {
    const [y, m] = from.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + i, 5));
    return [description, d.toISOString().slice(0, 10), euros];
  });

const leaks = (ctx: TestContext, user: TestUser) =>
  request(ctx.app).get('/api/stats/money-leaks').set(user.auth);
const decide = (ctx: TestContext, user: TestUser, id: string, status: string) =>
  request(ctx.app).put(`/api/stats/money-leaks/${id}`).set(user.auth).send({ status });

const funnel = (ctx: TestContext, event: string) =>
  ctx.container.db
    .prepare('SELECT detail, count FROM funnel_daily WHERE event = ? ORDER BY detail')
    .all(event);

describe('Money leaks («Tu dinero perdido»)', () => {
  let ctx: TestContext;
  let user: TestUser;
  const gym = findingId('rec:fitbox:monthly:0');

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-10-24T12:00:00Z' });
    user = await createUser(ctx);
  });

  it('needs a session and shows an empty state without movements', async () => {
    await request(ctx.app).get('/api/stats/money-leaks').expect(401);
    const res = await leaks(ctx, user).expect(200);
    expect(res.body).toEqual({
      coverage: {
        level: 'none',
        from: null,
        to: null,
        days: 0,
        movements: 0,
        yearlyReady: false,
      },
      total: { annual: 0, oneOff: 0, count: 0 },
      byKind: {
        recurring: { count: 0, annual: 0 },
        increase: { count: 0, annual: 0 },
        duplicate: { count: 0, annual: 0 },
        small: { count: 0, annual: 0 },
      },
      findings: [],
      count: 0,
      locked: false,
      reviewed: { count: 0, cancelMonthly: 0, recoveredAnnual: 0 },
    });
    expect(funnel(ctx, 'dp_found')).toEqual([]);
  });

  it('finds what repeats, with the figures in euros and the evidence', async () => {
    seed(ctx, user, [
      ...monthly('FITBOX', '2025-08', 15, 39.9),
      ['ELECTRO MARKET', '2026-09-12', 89],
      ['ELECTRO MARKET', '2026-09-12', 89],
    ]);
    const { body } = await leaks(ctx, user).expect(200);
    expect(body.coverage).toMatchObject({ level: 'partial', movements: 17, yearlyReady: true });
    expect(body.total).toEqual({ annual: 470, oneOff: 89, count: 1 });
    expect(body.count).toBe(2);
    expect(body.findings[0]).toEqual({
      id: gym,
      kind: 'recurring',
      confidence: 'high',
      status: 'new',
      label: 'FITBOX',
      essential: false,
      cadence: 'monthly',
      amount: 39.9,
      previousAmount: null,
      annual: 478.8,
      oneOff: 0,
      count: 15,
      firstDate: '2025-08-05',
      lastDate: '2026-10-05',
      nextDate: '2026-11-04',
      perMonth: null,
      evidence: expect.arrayContaining([{ date: '2026-10-05', amount: 39.9 }]),
    });
    expect(body.findings[1]).toMatchObject({ kind: 'duplicate', oneOff: 89, annual: 0 });
    expect(funnel(ctx, 'dp_found')).toEqual([{ detail: '1-2', count: 1 }]);
  });

  it('leaves out what a recurring rule already covers', async () => {
    seed(ctx, user, monthly('FITBOX', '2026-05', 6, 39.9));
    await request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({
        description: 'Fitbox',
        type: 'EXPENSE',
        category: 'Ocio',
        amount: 39.9,
        startYear: 2026,
        startMonth: 11,
      })
      .expect(201);
    expect((await leaks(ctx, user).expect(200)).body.findings).toEqual([]);
  });

  it('saves a decision, counts it and undoes it', async () => {
    seed(ctx, user, monthly('FITBOX', '2025-08', 15, 39.9));
    const kept = await decide(ctx, user, gym, 'cancel').expect(200);
    expect(kept.body).toMatchObject({ id: gym, status: 'cancel' });
    const after = (await leaks(ctx, user).expect(200)).body;
    expect(after).toMatchObject({
      total: { annual: 0, count: 0 },
      count: 0,
      reviewed: { count: 1, cancelMonthly: 39.9, recoveredAnnual: 0 },
    });
    expect(after.findings[0].status).toBe('cancel');
    await decide(ctx, user, gym, 'keep').expect(200);
    await request(ctx.app).delete(`/api/stats/money-leaks/${gym}`).set(user.auth).expect(204);
    expect((await leaks(ctx, user).expect(200)).body.findings[0].status).toBe('new');
    // Undoing twice is harmless.
    await request(ctx.app).delete(`/api/stats/money-leaks/${gym}`).set(user.auth).expect(204);
    expect(funnel(ctx, 'dp_confirm')).toEqual([
      { detail: 'cancel:recurring', count: 1 },
      { detail: 'keep:recurring', count: 1 },
    ]);
  });

  it('counts dismissed and unrecognised charges and refuses a decision a kind has not', async () => {
    seed(ctx, user, [
      ...monthly('FITBOX', '2025-08', 15, 39.9),
      ['ELECTRO MARKET', '2026-09-12', 89],
      ['ELECTRO MARKET', '2026-09-12', 89],
    ]);
    const duplicate = findingId('dup:electro market:8900:2026-09-12');
    const refused = await decide(ctx, user, duplicate, 'keep').expect(400);
    expect(refused.body.code).toBe('LEAK_STATUS_INVALID');
    await decide(ctx, user, duplicate, 'not_mine').expect(200);
    await decide(ctx, user, gym, 'dismissed').expect(200);
    expect(funnel(ctx, 'dp_ignore')).toEqual([
      { detail: 'dismissed:recurring', count: 1 },
      { detail: 'not_mine:duplicate', count: 1 },
    ]);
    const body = (await leaks(ctx, user).expect(200)).body;
    expect(body.total).toEqual({ annual: 0, oneOff: 0, count: 0 });
    expect(body.reviewed.count).toBe(2);
  });

  it('validates the id and the body, and only knows visible findings', async () => {
    await decide(ctx, user, 'not-an-id', 'keep').expect(400);
    await request(ctx.app)
      .put(`/api/stats/money-leaks/${gym}`)
      .set(user.auth)
      .send({ status: 'recovered' })
      .expect(400);
    await request(ctx.app)
      .put(`/api/stats/money-leaks/${gym}`)
      .set(user.auth)
      .send({ status: 'keep', extra: 1 })
      .expect(400);
    const missing = await decide(ctx, user, 'abcdef0123456789', 'keep').expect(404);
    expect(missing.body.code).toBe('LEAK_NOT_FOUND');
    await request(ctx.app).delete('/api/stats/money-leaks/XYZ').set(user.auth).expect(400);
  });

  it('keeps every user apart', async () => {
    const other = await createUser(ctx);
    seed(ctx, user, monthly('FITBOX', '2025-08', 15, 39.9));
    await decide(ctx, other, gym, 'keep').expect(404);
    await request(ctx.app).delete(`/api/stats/money-leaks/${gym}`).set(other.auth).expect(204);
    expect((await leaks(ctx, other).expect(200)).body.findings).toEqual([]);
    expect((await leaks(ctx, user).expect(200)).body.findings[0].status).toBe('new');
  });

  it('shows the free plan the whole figure, the 3 most expensive and every double charge', async () => {
    seed(ctx, user, [
      ...monthly('FITBOX', '2025-08', 15, 39.9),
      ...monthly('STREAMFLIX', '2026-05', 6, 13.99),
      ...monthly('CLOUDY', '2026-05', 6, 2.99),
      ...monthly('PRENSA DIGITAL', '2026-05', 6, 7.99),
      ['ELECTRO MARKET', '2026-09-12', 89],
      ['ELECTRO MARKET', '2026-09-12', 89],
      ['LIBROS LUNA', '2026-09-01', 25],
      ['LIBROS LUNA', '2026-09-02', 25],
    ]);
    const premium = (await leaks(ctx, user).expect(200)).body;
    expect(premium).toMatchObject({ count: 6, locked: false });
    expireTrial(ctx, user);
    const free = (await leaks(ctx, user).expect(200)).body;
    expect(free).toMatchObject({ count: 6, locked: true, total: premium.total });
    expect(free.findings.map((f: { label: string }) => f.label)).toEqual([
      'FITBOX',
      'STREAMFLIX',
      'PRENSA DIGITAL',
      'ELECTRO MARKET',
      'LIBROS LUNA',
    ]);
    // A hidden finding cannot be decided on.
    await decide(ctx, user, findingId('rec:cloudy:monthly:0'), 'keep').expect(404);
    await decide(ctx, user, gym, 'keep').expect(200);
    const after = (await leaks(ctx, user).expect(200)).body;
    expect(after.findings.map((f: { label: string }) => f.label)).toEqual([
      'STREAMFLIX',
      'PRENSA DIGITAL',
      'ELECTRO MARKET',
      'CLOUDY',
      'LIBROS LUNA',
      'FITBOX',
    ]);
  });

  it('checks a cancellation later and says it is no longer charged', async () => {
    seed(ctx, user, monthly('FITBOX', '2025-08', 15, 39.9));
    await decide(ctx, user, gym, 'cancel').expect(200);
    ctx.clock.set('2026-11-14T12:00:00Z');
    expect((await leaks(ctx, user).expect(200)).body.findings[0].status).toBe('cancel');
    ctx.clock.set('2026-11-15T12:00:00Z');
    const body = (await leaks(ctx, user).expect(200)).body;
    expect(body.findings[0].status).toBe('recovered');
    expect(body.reviewed).toEqual({ count: 1, cancelMonthly: 0, recoveredAnnual: 478.8 });
    await leaks(ctx, user).expect(200);
    expect(funnel(ctx, 'dp_recovered')).toEqual([{ detail: 'recurring', count: 1 }]);
    const [saved] = ctx.container.repos.leakDecisions.listByUser(user.id);
    expect(saved).toMatchObject({ status: 'recovered', recoveredAt: '2026-11-15T12:00:00.000Z' });
  });

  it('forgets decisions on findings gone for more than 400 days and keeps at most 500', async () => {
    const decisions = ctx.container.repos.leakDecisions;
    const old = {
      fingerprint: 'rec:viejo:monthly:0',
      kind: 'recurring' as const,
      status: 'keep' as const,
      annualCents: 1200,
      recoveredAt: null,
    };
    decisions.save(
      user.id,
      { ...old, findingId: 'aaaaaaaaaaaaaaaa', decidedAt: '2025-09-01T00:00:00.000Z' },
      500
    );
    decisions.save(
      user.id,
      { ...old, findingId: 'bbbbbbbbbbbbbbbb', decidedAt: '2026-06-01T00:00:00.000Z' },
      500
    );
    await leaks(ctx, user).expect(200);
    expect(decisions.listByUser(user.id).map((d) => d.findingId)).toEqual(['bbbbbbbbbbbbbbbb']);
    decisions.save(
      user.id,
      { ...old, findingId: 'cccccccccccccccc', decidedAt: '2026-07-01T00:00:00.000Z' },
      1
    );
    expect(decisions.listByUser(user.id).map((d) => d.findingId)).toEqual(['cccccccccccccccc']);
  });

  it('works on the shared data of a household', async () => {
    const owner = user;
    const partner = await createUser(ctx);
    seed(ctx, owner, monthly('FITBOX', '2025-08', 15, 39.9));
    const { code } = (await request(ctx.app).post('/api/household/invite').set(owner.auth))
      .body as { code: string };
    await request(ctx.app).post('/api/household/join').set(partner.auth).send({ code }).expect(204);
    await decide(ctx, partner, gym, 'keep').expect(200);
    expect((await leaks(ctx, owner).expect(200)).body.findings[0].status).toBe('keep');
  });

  it('exports the decisions and deletes them with the account', async () => {
    seed(ctx, user, monthly('FITBOX', '2025-08', 15, 39.9));
    await decide(ctx, user, gym, 'keep').expect(200);
    const exported = (await request(ctx.app).get('/api/export').set(user.auth).expect(200)).body;
    expect(JSON.stringify(exported)).toContain('rec:fitbox:monthly:0');
    expect(exported.moneyLeakDecisions).toEqual([
      {
        fingerprint: 'rec:fitbox:monthly:0',
        kind: 'recurring',
        status: 'keep',
        annualCents: 47880,
        decidedAt: '2026-10-24T12:00:00.000Z',
        recoveredAt: null,
      },
    ]);
    ctx.container.db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    const left = ctx.container.db
      .prepare('SELECT COUNT(*) AS n FROM money_leak_decisions')
      .get() as { n: number };
    expect(left.n).toBe(0);
  });
});

describe('Goal saving pace', () => {
  it('adds the real pace of the goal category to every goal', async () => {
    const ctx = createTestApp({ now: '2026-10-24T12:00:00Z' });
    const user = await createUser(ctx);
    await request(ctx.app)
      .post('/api/goals')
      .set(user.auth)
      .send({ name: 'Viaje', target: 3000, category: 'Ahorro' })
      .expect(201);
    const savings: Row[] = [
      ['Hucha', '2026-04-03', 150, 'Ahorro', 'SAVING'],
      ['Hucha', '2026-05-03', 100, 'Ahorro', 'SAVING'],
      ['Hucha', '2026-07-03', 200, 'Ahorro', 'SAVING'],
      ['Hucha', '2026-08-03', 120, 'Ahorro', 'SAVING'],
      ['Hucha', '2026-09-03', 150, 'Ahorro', 'SAVING'],
      ['Hucha', '2026-10-03', 430, 'Ahorro', 'SAVING'],
    ];
    seed(ctx, user, savings);
    const [goal] = (await request(ctx.app).get('/api/goals').set(user.auth).expect(200)).body;
    expect(goal.progress).toMatchObject({
      saved: 1150,
      averageMonthly: 120,
      historyMonths: 6,
      savedThisMonth: 430,
    });
  });

  it('uses the periods of the user when the month starts on another day', async () => {
    const ctx = createTestApp({ now: '2026-10-24T12:00:00Z' });
    const user = await createUser(ctx);
    await request(ctx.app).patch('/api/settings').set(user.auth).send({ monthStartDay: 25 });
    await request(ctx.app)
      .post('/api/goals')
      .set(user.auth)
      .send({ name: 'Colchón', target: 1000, category: 'Ahorro' })
      .expect(201);
    seed(
      ctx,
      user,
      [
        ['Hucha', '2026-07-30', 30, 'Ahorro', 'SAVING'],
        ['Hucha', '2026-08-26', 100, 'Ahorro', 'SAVING'],
        ['Hucha', '2026-09-10', 50, 'Ahorro', 'SAVING'],
        ['Hucha', '2026-09-26', 70, 'Ahorro', 'SAVING'],
      ],
      25
    );
    const [goal] = (await request(ctx.app).get('/api/goals').set(user.auth).expect(200)).body;
    expect(goal.progress).toMatchObject({
      averageMonthly: 90,
      historyMonths: 2,
      savedThisMonth: 70,
    });
  });
});
