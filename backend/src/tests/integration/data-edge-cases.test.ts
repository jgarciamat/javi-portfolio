import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
} from '../helpers/testApp';

describe('Data edge cases', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const api = () => ({
    get: (url: string) => request(ctx.app).get(url).set(user.auth),
    post: (url: string, body: object) => request(ctx.app).post(url).set(user.auth).send(body),
    patch: (url: string, body: object) => request(ctx.app).patch(url).set(user.auth).send(body),
    put: (url: string, body: object) => request(ctx.app).put(url).set(user.auth).send(body),
    del: (url: string) => request(ctx.app).delete(url).set(user.auth),
  });

  it('lists and deletes transfers, then deletes the emptied account', async () => {
    const { get, post, del } = api();
    const accounts = (await post('/api/accounts', { name: 'Hucha', type: 'savings' }).expect(201))
      .body as { id: string; name: string }[];
    const main = accounts.find((a) => a.name !== 'Hucha')!;
    const piggy = accounts.find((a) => a.name === 'Hucha')!;
    const transfer = await post('/api/transfers', {
      fromAccountId: main.id,
      toAccountId: piggy.id,
      amount: 5,
      date: '2026-03-10',
    }).expect(201);
    expect((await get('/api/transfers').expect(200)).body).toHaveLength(1);

    await del(`/api/accounts/${piggy.id}`).expect(409);
    await del(`/api/transfers/${transfer.body.id}`).expect(204);
    const again = await del(`/api/transfers/${transfer.body.id}`).expect(404);
    expect(again.body.code).toBe('TRANSFER_NOT_FOUND');
    await del(`/api/accounts/${piggy.id}`).expect(204);
    expect((await get('/api/accounts').expect(200)).body.accounts).toHaveLength(1);
  });

  it('reports what uses a category and refuses to reassign it to itself', async () => {
    const { get, del } = api();
    const tx = await addTransaction(ctx, user, { category: 'Ocio' });
    expect(tx.status).toBe(201);
    const id = tx.body.categoryId as string;
    const usage = await get(`/api/categories/${id}/usage`).expect(200);
    expect(usage.body).toMatchObject({ transactions: 1 });
    const same = await del(`/api/categories/${id}?reassignTo=${id}`).expect(400);
    expect(same.body.code).toBe('SAME_CATEGORY');
  });

  it('deletes alerts and goals', async () => {
    const { get, post, del } = api();
    const alert = await post('/api/custom-alerts', {
      name: 'Ocio alto',
      metric: 'category_amount',
      operator: 'gte',
      threshold: 50,
      category: 'Ocio',
    }).expect(201);
    const goal = await post('/api/goals', { name: 'Viaje', target: 500 }).expect(201);
    await del(`/api/custom-alerts/${alert.body.id}`).expect(204);
    await del(`/api/goals/${goal.body.id}`).expect(204);
    expect((await get('/api/custom-alerts').expect(200)).body).toEqual([]);
    expect((await get('/api/goals').expect(200)).body).toEqual([]);
  });

  it('needs a category for recurring rules and can move them between accounts', async () => {
    const { post, patch } = api();
    const missing = await post('/api/recurring-rules', {
      description: 'Gimnasio',
      amount: 30,
      type: 'EXPENSE',
      startYear: 2026,
      startMonth: 3,
    }).expect(400);
    expect(missing.body.code).toBe('CATEGORY_REQUIRED');

    const rule = await post('/api/recurring-rules', {
      description: 'Gimnasio',
      amount: 30,
      type: 'EXPENSE',
      category: 'Salud',
      startYear: 2026,
      startMonth: 3,
    }).expect(201);
    const accounts = (await api().get('/api/accounts').expect(200)).body.accounts;
    const moved = await patch(`/api/recurring-rules/${rule.body.id}`, {
      accountId: accounts[0].id,
    }).expect(200);
    expect(moved.body.accountId).toBe(accounts[0].id);
    const cleared = await patch(`/api/recurring-rules/${rule.body.id}`, { accountId: null }).expect(
      200
    );
    expect(cleared.body.accountId).toBeNull();
  });

  it('imports explicit types and identical rows, and explains invalid ones', async () => {
    const res = await api()
      .post('/api/transactions/import', {
        rows: [
          { date: '2026-03-01', description: 'Nómina', amount: 1500, type: 'income' },
          { date: '2026-03-02', description: 'Pan', amount: -2 },
          { date: '2026-03-02', description: 'Pan', amount: -2 },
          { date: '2026-03-03', description: '   ', amount: -5 },
          { date: '2026-03-03', description: 'Nada', amount: 0 },
          { date: '2026-03-03', description: 'Raro', amount: -1, type: 'gift' },
        ],
      })
      .expect(201);
    // Identical rows in one file are distinct movements (their position is part of the fingerprint).
    expect(res.body).toMatchObject({ imported: 3, duplicates: 0, invalid: 3 });
    expect(res.body.rows.filter((r: { status: string }) => r.status === 'invalid')).toEqual([
      expect.objectContaining({ error: 'Descripción vacía' }),
      expect.objectContaining({ error: 'Importe inválido' }),
      expect.objectContaining({ error: expect.stringContaining('Tipo de movimiento inválido') }),
    ]);
  });

  it('caps the rows of one import', async () => {
    const rows = Array.from({ length: 5001 }, (_, i) => ({
      date: '2026-03-01',
      description: `Fila ${i}`,
      amountCents: -100,
    }));
    await expect(
      ctx.container.importer.import(user.id, rows, { dryRun: true })
    ).rejects.toMatchObject({
      code: 'TOO_MANY_ROWS',
    });
  });

  it('exports rules, alerts, budgets and transfers too', async () => {
    const { post } = api();
    await post('/api/recurring-rules', {
      description: 'Netflix',
      amount: 12,
      type: 'EXPENSE',
      category: 'Ocio',
      startYear: 2026,
      startMonth: 3,
    }).expect(201);
    await post('/api/custom-alerts', {
      name: 'Gasto',
      metric: 'expenses_pct',
      operator: 'gte',
      threshold: 80,
    }).expect(201);
    await api().put('/api/budgets', { category: 'Ocio', amount: 100 }).expect(200);
    const res = await api().get('/api/export').expect(200);
    expect(res.body.recurringRules[0]).toMatchObject({ description: 'Netflix', amount: 12 });
    expect(res.body.customAlerts[0]).toMatchObject({ name: 'Gasto' });
    expect(res.body.budgets[0]).toMatchObject({ amount: 100 });
  });
});
