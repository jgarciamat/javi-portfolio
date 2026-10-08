import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
} from '../helpers/testApp';

describe('Categories, budgets, alerts and goals', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const categoryId = async (name: string): Promise<string> => {
    const list = (await request(ctx.app).get('/api/categories').set(user.auth)).body;
    return list.find((c: { name: string }) => c.name === name).id;
  };

  describe('categories', () => {
    it('renaming keeps every movement attached', async () => {
      await addTransaction(ctx, user, { category: 'Ocio', amount: 25 });
      const id = await categoryId('Ocio');
      await request(ctx.app)
        .patch(`/api/categories/${id}`)
        .set(user.auth)
        .send({ name: 'Diversión' })
        .expect(200);
      const month = (await request(ctx.app).get('/api/months/2026/3').set(user.auth)).body;
      expect(month.transactions[0].category).toBe('Diversión');
      expect(month.summary.expensesByCategory).toEqual({ Diversión: 25 });
    });

    it('rejects duplicated names (case-insensitive)', async () => {
      const res = await request(ctx.app)
        .post('/api/categories')
        .set(user.auth)
        .send({ name: 'ocio' })
        .expect(409);
      expect(res.body.code).toBe('CATEGORY_EXISTS');
    });

    it('refuses to delete a category in use unless its data is reassigned', async () => {
      await addTransaction(ctx, user, { category: 'Ocio', amount: 10 });
      await request(ctx.app)
        .put('/api/budgets')
        .set(user.auth)
        .send({ category: 'Ocio', amount: 100 })
        .expect(200);
      const ocio = await categoryId('Ocio');
      const blocked = await request(ctx.app)
        .delete(`/api/categories/${ocio}`)
        .set(user.auth)
        .expect(409);
      expect(blocked.body.code).toBe('CATEGORY_IN_USE');
      expect(blocked.body.details.usage).toMatchObject({ transactions: 1, budgets: 1 });

      const otros = await categoryId('Otros');
      await request(ctx.app)
        .delete(`/api/categories/${ocio}?reassignTo=${otros}`)
        .set(user.auth)
        .expect(204);
      const month = (await request(ctx.app).get('/api/months/2026/3').set(user.auth)).body;
      expect(month.transactions[0].category).toBe('Otros');
      expect(month.budgets[0].categoryName).toBe('Otros');
    });

    it('deletes unused categories directly', async () => {
      const id = await categoryId('Ropa');
      await request(ctx.app).delete(`/api/categories/${id}`).set(user.auth).expect(204);
    });
  });

  describe('category budgets', () => {
    it('reports spending per budget and raises alerts at 80% and 100%', async () => {
      await request(ctx.app)
        .put('/api/budgets')
        .set(user.auth)
        .send({ category: 'Ocio', amount: 100 })
        .expect(200);
      await request(ctx.app)
        .put('/api/budgets')
        .set(user.auth)
        .send({ category: 'Ropa', amount: 50 })
        .expect(200);
      await addTransaction(ctx, user, { category: 'Ocio', amount: 85 });
      await addTransaction(ctx, user, { category: 'Ropa', amount: 60 });
      const month = (await request(ctx.app).get('/api/months/2026/3').set(user.auth)).body;
      expect(month.budgets).toEqual([
        expect.objectContaining({
          categoryName: 'Ropa',
          spent: 60,
          limit: 50,
          remaining: -10,
          level: 'danger',
          percentage: 120,
        }),
        expect.objectContaining({
          categoryName: 'Ocio',
          spent: 85,
          level: 'warning',
          percentage: 85,
        }),
      ]);
      expect(
        month.alerts.map((a: { kind: string; level: string }) => `${a.kind}:${a.level}`)
      ).toEqual(['category_budget:danger', 'category_budget:warning']);
    });

    it('updating the same category replaces the limit; budgets can be deleted', async () => {
      await request(ctx.app)
        .put('/api/budgets')
        .set(user.auth)
        .send({ category: 'Ocio', amount: 100 });
      const updated = await request(ctx.app)
        .put('/api/budgets')
        .set(user.auth)
        .send({ category: 'Ocio', amount: 150 });
      const list = (await request(ctx.app).get('/api/budgets').set(user.auth)).body;
      expect(list).toEqual([expect.objectContaining({ categoryName: 'Ocio', amount: 150 })]);
      await request(ctx.app).delete(`/api/budgets/${updated.body.id}`).set(user.auth).expect(204);
    });

    it('warns when spending reaches the available money', async () => {
      await addTransaction(ctx, user, { type: 'INCOME', category: 'Salario', amount: 100 });
      await addTransaction(ctx, user, { amount: 90 });
      const month = (await request(ctx.app).get('/api/months/2026/3').set(user.auth)).body;
      expect(month.alerts).toEqual([
        expect.objectContaining({
          kind: 'available',
          level: 'warning',
          spent: 90,
          limit: 100,
          percentage: 90,
        }),
      ]);
    });
  });

  describe('custom alerts', () => {
    it('validates category metrics and returns the category name', async () => {
      const missing = await request(ctx.app)
        .post('/api/custom-alerts')
        .set(user.auth)
        .send({ name: 'Ocio alto', metric: 'category_amount', operator: 'gte', threshold: 100 })
        .expect(400);
      expect(missing.body.error).toMatch(/categoría/);
      const created = await request(ctx.app)
        .post('/api/custom-alerts')
        .set(user.auth)
        .send({
          name: 'Ocio alto',
          metric: 'category_amount',
          operator: 'gte',
          threshold: 100,
          category: 'Ocio',
        })
        .expect(201);
      expect(created.body).toMatchObject({ category: 'Ocio', color: '#6366f1', active: true });
      const patched = await request(ctx.app)
        .patch(`/api/custom-alerts/${created.body.id}`)
        .set(user.auth)
        .send({ threshold: 150, active: false })
        .expect(200);
      expect(patched.body).toMatchObject({ threshold: 150, active: false, category: 'Ocio' });
    });
  });

  describe('savings goals', () => {
    it('tracks progress from SAVING movements of the goal category', async () => {
      ctx.clock.set('2026-03-15T12:00:00Z');
      const goal = await request(ctx.app)
        .post('/api/goals')
        .set(user.auth)
        .send({ name: 'Viaje a Japón', target: 3000, targetDate: '2026-12-31' })
        .expect(201);
      expect(goal.body.categoryName).toBe('Viaje a Japón');
      await addTransaction(ctx, user, { type: 'INCOME', category: 'Salario', amount: 2000 });
      await addTransaction(ctx, user, { type: 'SAVING', category: 'Viaje a Japón', amount: 600 });
      const [g] = (await request(ctx.app).get('/api/goals').set(user.auth)).body;
      expect(g.progress).toEqual({
        saved: 600,
        remaining: 2400,
        percentage: 20,
        monthsLeft: 10,
        monthlyNeeded: 240,
        completed: false,
      });
    });

    it('can use an existing category and be archived', async () => {
      const goal = await request(ctx.app)
        .post('/api/goals')
        .set(user.auth)
        .send({ name: 'Colchón', target: 5000, category: 'Ahorro' })
        .expect(201);
      expect(goal.body.categoryName).toBe('Ahorro');
      const archived = await request(ctx.app)
        .patch(`/api/goals/${goal.body.id}`)
        .set(user.auth)
        .send({ archived: true });
      expect(archived.body.archived).toBe(true);
    });
  });
});

describe('Accounts and transfers', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const accounts = async () =>
    (await request(ctx.app).get('/api/accounts').set(user.auth).expect(200)).body;

  it('computes balances per account and includes initial balances in the carry-over', async () => {
    const created = await request(ctx.app)
      .post('/api/accounts')
      .set(user.auth)
      .send({ name: 'Efectivo', type: 'cash', initialBalance: 200 })
      .expect(201);
    const cash = created.body.find((a: { name: string }) => a.name === 'Efectivo');
    await addTransaction(ctx, user, { amount: 50, accountId: cash.id });
    await addTransaction(ctx, user, { type: 'INCOME', category: 'Salario', amount: 1000 });

    const list = await accounts();
    expect(list.total).toBe(1150);
    expect(list.accounts.find((a: { name: string }) => a.name === 'Efectivo').balance).toBe(150);
    expect(list.accounts.find((a: { name: string }) => a.name === 'Principal').balance).toBe(1000);
    const april = (await request(ctx.app).get('/api/months/2026/4').set(user.auth)).body;
    expect(april.carryover).toBe(1150);
  });

  it('transfers move money between accounts without changing the total', async () => {
    await request(ctx.app)
      .post('/api/accounts')
      .set(user.auth)
      .send({ name: 'Ahorros', type: 'savings' });
    const [main, savings] = (await accounts()).accounts;
    await addTransaction(ctx, user, { type: 'INCOME', category: 'Salario', amount: 500 });
    const transfer = await request(ctx.app)
      .post('/api/transfers')
      .set(user.auth)
      .send({ fromAccountId: main.id, toAccountId: savings.id, amount: 200, date: '2026-03-20' })
      .expect(201);
    expect(transfer.body).toMatchObject({
      fromAccountName: 'Principal',
      toAccountName: 'Ahorros',
      amount: 200,
    });
    let list = await accounts();
    expect(list.total).toBe(500);
    expect(list.accounts.map((a: { balance: number }) => a.balance)).toEqual([300, 200]);

    const same = await request(ctx.app)
      .post('/api/transfers')
      .set(user.auth)
      .send({ fromAccountId: main.id, toAccountId: main.id, amount: 1, date: '2026-03-20' })
      .expect(400);
    expect(same.body.code).toBe('SAME_ACCOUNT');

    await request(ctx.app).delete(`/api/transfers/${transfer.body.id}`).set(user.auth).expect(204);
    list = await accounts();
    expect(list.accounts.map((a: { balance: number }) => a.balance)).toEqual([500, 0]);
  });

  it('protects the default account and accounts with movements', async () => {
    const [main] = (await accounts()).accounts;
    expect(
      (await request(ctx.app).delete(`/api/accounts/${main.id}`).set(user.auth).expect(409)).body
        .code
    ).toBe('DEFAULT_ACCOUNT');
    expect(
      (
        await request(ctx.app)
          .patch(`/api/accounts/${main.id}`)
          .set(user.auth)
          .send({ archived: true })
          .expect(409)
      ).body.code
    ).toBe('DEFAULT_ACCOUNT');

    await request(ctx.app)
      .post('/api/accounts')
      .set(user.auth)
      .send({ name: 'Tarjeta', type: 'card' });
    const card = (await accounts()).accounts[1];
    await addTransaction(ctx, user, { accountId: card.id });
    const inUse = await request(ctx.app)
      .delete(`/api/accounts/${card.id}`)
      .set(user.auth)
      .expect(409);
    expect(inUse.body.code).toBe('ACCOUNT_IN_USE');
    await request(ctx.app)
      .patch(`/api/accounts/${card.id}`)
      .set(user.auth)
      .send({ archived: true })
      .expect(200);
    const archivedUse = await addTransaction(ctx, user, { accountId: card.id });
    expect(archivedUse.body.code).toBe('ACCOUNT_ARCHIVED');
  });

  it('changing the default account through settings is validated', async () => {
    await request(ctx.app).post('/api/accounts').set(user.auth).send({ name: 'Nueva' });
    const nueva = (await accounts()).accounts[1];
    const res = await request(ctx.app)
      .patch('/api/settings')
      .set(user.auth)
      .send({ defaultAccountId: nueva.id });
    expect(res.body.defaultAccountId).toBe(nueva.id);
    await request(ctx.app)
      .patch('/api/settings')
      .set(user.auth)
      .send({ defaultAccountId: 'nope' })
      .expect(404);
  });
});
