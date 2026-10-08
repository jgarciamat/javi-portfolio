import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
} from '../helpers/testApp';

describe('Transactions API', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const month = async (year: number, m: number) =>
    (await request(ctx.app).get(`/api/months/${year}/${m}`).set(user.auth).expect(200)).body;

  it('creates a movement, resolving the category by name and creating it when missing', async () => {
    const res = await addTransaction(ctx, user, {
      category: 'Mascotas',
      amount: 12.5,
      description: 'Pienso',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      amount: 12.5,
      category: 'Mascotas',
      type: 'EXPENSE',
      date: '2026-03-10',
    });
    expect(res.body.accountName).toBe('Principal');
    const categories = (await request(ctx.app).get('/api/categories').set(user.auth)).body;
    expect(categories.some((c: { name: string }) => c.name === 'Mascotas')).toBe(true);
  });

  it('stores money exactly (no floating point drift)', async () => {
    for (let i = 0; i < 10; i++) await addTransaction(ctx, user, { amount: 0.1 });
    await addTransaction(ctx, user, { amount: 0.2, type: 'INCOME', category: 'Salario' });
    const m = await month(2026, 3);
    expect(m.summary.totalExpenses).toBe(1);
    expect(m.summary.totalIncome).toBe(0.2);
    expect(m.summary.balance).toBe(-0.8);
  });

  it('validates input with clear error codes', async () => {
    const bad = await addTransaction(ctx, user, { amount: -5 });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('VALIDATION_ERROR');
    const badDate = await addTransaction(ctx, user, { date: '2026-02-30' });
    expect(badDate.body.code).toBe('INVALID_DATE');
    const noCategory = await addTransaction(ctx, user, { category: undefined });
    expect(noCategory.body.code).toBe('CATEGORY_REQUIRED');
  });

  it('returns the whole month in one call: summary, carry-over and available money', async () => {
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 2000,
      date: '2026-02-01',
    });
    await addTransaction(ctx, user, { amount: 500, date: '2026-02-10' });
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 1000,
      date: '2026-03-01',
    });
    await addTransaction(ctx, user, {
      type: 'SAVING',
      category: 'Ahorro',
      amount: 300,
      date: '2026-03-02',
    });
    const m = await month(2026, 3);
    expect(m).toMatchObject({
      year: 2026,
      month: 3,
      start: '2026-03-01',
      end: '2026-03-31',
      isCurrent: true,
    });
    expect(m.carryover).toBe(1500);
    expect(m.summary).toMatchObject({
      totalIncome: 1000,
      totalSaving: 300,
      balance: 700,
      transactionCount: 2,
    });
    expect(m.available).toBe(2200);
  });

  it('does not allow saving more than the available money', async () => {
    await addTransaction(ctx, user, { type: 'INCOME', category: 'Salario', amount: 100 });
    const res = await addTransaction(ctx, user, {
      type: 'SAVING',
      category: 'Ahorro',
      amount: 150,
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_BALANCE');
    expect(res.body.details.availableCents).toBe(10000);
  });

  it('editing a saving does not count its old amount against itself', async () => {
    await addTransaction(ctx, user, { type: 'INCOME', category: 'Salario', amount: 100 });
    const saving = (
      await addTransaction(ctx, user, { type: 'SAVING', category: 'Ahorro', amount: 80 })
    ).body;
    await request(ctx.app)
      .put(`/api/transactions/${saving.id}`)
      .set(user.auth)
      .send({ amount: 95 })
      .expect(200);
    const tooMuch = await request(ctx.app)
      .put(`/api/transactions/${saving.id}`)
      .set(user.auth)
      .send({ amount: 120 });
    expect(tooMuch.body.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('updates, moves between months, patches notes and deletes', async () => {
    const tx = (await addTransaction(ctx, user, { amount: 20 })).body;
    const moved = await request(ctx.app)
      .put(`/api/transactions/${tx.id}`)
      .set(user.auth)
      .send({ date: '2026-02-20', category: 'Transporte', description: 'Taxi' })
      .expect(200);
    expect(moved.body).toMatchObject({
      year: 2026,
      month: 2,
      category: 'Transporte',
      description: 'Taxi',
    });
    expect((await month(2026, 3)).transactions).toHaveLength(0);

    const noted = await request(ctx.app)
      .patch(`/api/transactions/${tx.id}`)
      .set(user.auth)
      .send({ notes: ' nota ' });
    expect(noted.body.notes).toBe('nota');

    await request(ctx.app).delete(`/api/transactions/${tx.id}`).set(user.auth).expect(204);
    await request(ctx.app).delete(`/api/transactions/${tx.id}`).set(user.auth).expect(404);
  });

  it('keeps the legacy endpoints used by older clients', async () => {
    await addTransaction(ctx, user, { amount: 30 });
    const list = await request(ctx.app)
      .get('/api/transactions?year=2026&month=3')
      .set(user.auth)
      .expect(200);
    expect(list.body).toHaveLength(1);
    const summary = await request(ctx.app)
      .get('/api/transactions/summary?year=2026&month=3')
      .set(user.auth);
    expect(summary.body.totalExpenses).toBe(30);
    const carry = await request(ctx.app).get('/api/budget/carryover/2026/4').set(user.auth);
    expect(carry.body.carryover).toBe(-30);
  });

  it('searches by text (accent-insensitive), type, category, dates and amount', async () => {
    await addTransaction(ctx, user, {
      description: 'Café con leche',
      amount: 2.5,
      category: 'Ocio',
    });
    await addTransaction(ctx, user, {
      description: 'Cafetería',
      amount: 8,
      date: '2026-01-05',
      category: 'Ocio',
    });
    await addTransaction(ctx, user, {
      description: 'Nómina',
      amount: 2000,
      type: 'INCOME',
      category: 'Salario',
    });
    const search = (q: string) =>
      request(ctx.app)
        .get(`/api/transactions/search?${q}`)
        .set(user.auth)
        .expect(200)
        .then((r) => r.body);

    expect((await search('q=cafe')).total).toBe(2);
    expect((await search('q=NOMINA')).items[0].description).toBe('Nómina');
    expect((await search('type=INCOME')).total).toBe(1);
    expect((await search('from=2026-02-01')).total).toBe(2);
    expect((await search('min=5&max=10')).items.map((i: { amount: number }) => i.amount)).toEqual([
      8,
    ]);
    const all = await search('sort=amount_desc&limit=2');
    expect(all.items).toHaveLength(2);
    expect(all.total).toBe(3);
    expect(all.totals).toEqual({ income: 2000, expenses: 10.5, saving: 0 });
    expect((await search('q=%25')).total).toBe(0);
  });

  it('builds the annual summary with the opening balance', async () => {
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 100,
      date: '2025-12-01',
    });
    await addTransaction(ctx, user, { amount: 40, date: '2026-01-15' });
    await addTransaction(ctx, user, { amount: 10, date: '2026-03-15' });
    const res = await request(ctx.app)
      .get('/api/transactions/annual/2026')
      .set(user.auth)
      .expect(200);
    expect(res.body.openingBalance).toBe(100);
    expect(res.body.months[1]).toEqual({ income: 0, expenses: 40, saving: 0, balance: -40 });
    expect(res.body.months[3].expenses).toBe(10);
    expect(res.body.months[12]).toEqual({ income: 0, expenses: 0, saving: 0, balance: 0 });
  });

  it('reports malformed JSON and unknown routes cleanly', async () => {
    const res = await request(ctx.app)
      .post('/api/transactions')
      .set(user.auth)
      .set('Content-Type', 'application/json')
      .send('{"bad json');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_JSON');
    await request(ctx.app).get('/api/nope').set(user.auth).expect(404);
  });
});
