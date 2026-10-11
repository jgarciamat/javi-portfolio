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

  it('is private and Premium', async () => {
    const other = await createUser(ctx, 'otra@example.com');
    await post('/api/assets', { name: 'Mío', kind: 'other', value: 1 }).expect(201);
    expect((await request(ctx.app).get('/api/assets').set(other.auth)).body).toEqual([]);
    expireTrial(ctx, user);
    await request(ctx.app).get('/api/assets').set(user.auth).expect(402);
    await post('/api/assets', { name: 'x', kind: 'other', value: 1 }).expect(402);
  });
});
