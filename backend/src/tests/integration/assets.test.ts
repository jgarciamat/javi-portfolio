import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

describe('Assets, debts and the net worth', () => {
  let ctx: TestContext;
  let user: TestUser;

  const post = (path: string, body: unknown, who = user) =>
    request(ctx.app)
      .post(path)
      .set(who.auth)
      .send(body as object);
  const netWorth = async () =>
    (await request(ctx.app).get('/api/stats/net-worth?months=3').set(user.auth).expect(200)).body;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-04-11T12:00:00Z' });
    user = await createUser(ctx);
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 1000,
      date: '2026-02-01',
    });
  });

  it('creates, values, lists and deletes assets', async () => {
    const created = await post('/api/assets', {
      name: ' Fondo indexado ',
      kind: 'investment',
      value: 1000,
      date: '2026-02-15',
    }).expect(201);
    expect(created.body).toMatchObject({
      name: 'Fondo indexado',
      kind: 'investment',
      value: 1000,
      valueDate: '2026-02-15',
      previousValue: null,
    });
    const updated = await post(`/api/assets/${created.body.id}/values`, { value: 1200 }).expect(
      200
    );
    expect(updated.body).toMatchObject({
      value: 1200,
      valueDate: '2026-04-11',
      previousValue: 1000,
    });
    expect(updated.body.history).toHaveLength(2);
    // Same date again replaces it.
    const again = await post(`/api/assets/${created.body.id}/values`, { value: 1300 }).expect(200);
    expect(again.body.history).toHaveLength(2);
    expect(again.body.value).toBe(1300);
    const list = (await request(ctx.app).get('/api/assets').set(user.auth).expect(200)).body;
    expect(list).toHaveLength(1);
    await request(ctx.app).delete(`/api/assets/${created.body.id}`).set(user.auth).expect(204);
    await request(ctx.app).delete(`/api/assets/${created.body.id}`).set(user.auth).expect(404);
    await post(`/api/assets/${created.body.id}/values`, { value: 1 }).expect(404);
  });

  it('adds assets and takes debts off the net worth month by month', async () => {
    expect((await netWorth()).map((p: { netWorth: number }) => p.netWorth)).toEqual([
      1000, 1000, 1000,
    ]);
    await post('/api/assets', {
      name: 'Fondo',
      kind: 'investment',
      value: 500,
      date: '2026-03-10',
    }).expect(201);
    await post('/api/assets', {
      name: 'Préstamo coche',
      kind: 'debt',
      value: 200,
      date: '2026-04-05',
    }).expect(201);
    const points = await netWorth();
    expect(points[0]).toMatchObject({ month: 2, assets: 0, debts: 0, netWorth: 1000 });
    expect(points[1]).toMatchObject({ month: 3, assets: 500, debts: 0, netWorth: 1500 });
    expect(points[2]).toMatchObject({ month: 4, assets: 500, debts: 200, netWorth: 1300 });
  });

  it('keeps the interest and minimum payment of a debt', async () => {
    const debt = await post('/api/assets', {
      name: 'Tarjeta',
      kind: 'debt',
      value: 1500,
      interestRate: 19.5,
      minPayment: 60,
    }).expect(201);
    expect(debt.body).toMatchObject({ interestRate: 19.5, minPayment: 60 });
    const changed = await request(ctx.app)
      .patch(`/api/assets/${debt.body.id}/terms`)
      .set(user.auth)
      .send({ interestRate: 12, minPayment: null })
      .expect(200);
    expect(changed.body).toMatchObject({ interestRate: 12, minPayment: null, value: 1500 });
    // Only debts have terms: they are ignored on other kinds and cannot be set afterwards.
    const fund = await post('/api/assets', {
      name: 'Fondo',
      kind: 'investment',
      value: 10,
      interestRate: 3,
      minPayment: 5,
    }).expect(201);
    expect(fund.body).toMatchObject({ interestRate: null, minPayment: null });
    await request(ctx.app)
      .patch(`/api/assets/${fund.body.id}/terms`)
      .set(user.auth)
      .send({ interestRate: 1, minPayment: 1 })
      .expect(400);
    await request(ctx.app)
      .patch('/api/assets/nope/terms')
      .set(user.auth)
      .send({ interestRate: 1, minPayment: 1 })
      .expect(404);
    await request(ctx.app)
      .patch(`/api/assets/${debt.body.id}/terms`)
      .set(user.auth)
      .send({ interestRate: 101, minPayment: 1 })
      .expect(400);
  });

  it('validates the input and limits how many there are', async () => {
    await post('/api/assets', { name: '', kind: 'investment', value: 1 }).expect(400);
    await post('/api/assets', { name: 'x', kind: 'crypto', value: 1 }).expect(400);
    await post('/api/assets', { name: 'x', kind: 'other', value: -1 }).expect(400);
    for (let i = 0; i < 30; i++) {
      await post('/api/assets', { name: `a${i}`, kind: 'other', value: 1 }).expect(201);
    }
    const res = await post('/api/assets', { name: 'one more', kind: 'other', value: 1 }).expect(
      400
    );
    expect(res.body.code).toBe('TOO_MANY_ASSETS');
  });

  it('is private, and the free plan keeps one element of any kind', async () => {
    const other = await createUser(ctx, 'otra@example.com');
    const mine = await post('/api/assets', { name: 'Mío', kind: 'debt', value: 1 }).expect(201);
    expect((await request(ctx.app).get('/api/assets').set(other.auth)).body).toEqual([]);
    expireTrial(ctx, user);
    // The one it has stays fully usable...
    expect(
      (await request(ctx.app).get('/api/assets').set(user.auth).expect(200)).body
    ).toHaveLength(1);
    await post(`/api/assets/${mine.body.id}/values`, { value: 2 }).expect(200);
    await request(ctx.app)
      .patch(`/api/assets/${mine.body.id}/terms`)
      .set(user.auth)
      .send({ interestRate: 5, minPayment: 10 })
      .expect(200);
    // ...but a second one needs Premium.
    const refused = await post('/api/assets', { name: 'x', kind: 'other', value: 1 }).expect(402);
    expect(refused.body.code).toBe('PLAN_LIMIT');
    expect(refused.body.details).toEqual({ resource: 'assets', limit: 1 });
    expect((await request(ctx.app).get('/api/billing').set(user.auth)).body.usage.assets).toBe(1);
    await request(ctx.app).delete(`/api/assets/${mine.body.id}`).set(user.auth).expect(204);
    await post('/api/assets', { name: 'x', kind: 'investment', value: 1 }).expect(201);
    // The net worth is still a Premium insight.
    await request(ctx.app).get('/api/stats/net-worth?months=3').set(user.auth).expect(402);
  });
});
