import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
} from '../helpers/testApp';

/**
 * Regression tests for the IDOR holes of v1: another user's ids must behave as if
 * they did not exist, and nothing of the owner may change.
 */
describe('Data isolation between users', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let intruder: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    owner = await createUser(ctx, 'owner@example.com');
    intruder = await createUser(ctx, 'intruder@example.com');
  });

  it('transactions of another user cannot be read, edited or deleted', async () => {
    const tx = (await addTransaction(ctx, owner, { description: 'Private', amount: 50 })).body;

    await request(ctx.app)
      .put(`/api/transactions/${tx.id}`)
      .set(intruder.auth)
      .send({ amount: 1 })
      .expect(404);
    await request(ctx.app)
      .patch(`/api/transactions/${tx.id}`)
      .set(intruder.auth)
      .send({ notes: 'x' })
      .expect(404);
    await request(ctx.app).delete(`/api/transactions/${tx.id}`).set(intruder.auth).expect(404);

    const intruderMonth = await request(ctx.app)
      .get('/api/months/2026/3')
      .set(intruder.auth)
      .expect(200);
    expect(intruderMonth.body.transactions).toHaveLength(0);
    const search = await request(ctx.app)
      .get('/api/transactions/search?q=private')
      .set(intruder.auth)
      .expect(200);
    expect(search.body.total).toBe(0);

    const ownerMonth = await request(ctx.app).get('/api/months/2026/3').set(owner.auth).expect(200);
    expect(ownerMonth.body.transactions).toHaveLength(1);
    expect(ownerMonth.body.transactions[0].amount).toBe(50);
    expect(ownerMonth.body.transactions[0].notes).toBeNull();
  });

  it('categories of another user cannot be renamed, deleted or used', async () => {
    const category = (
      await request(ctx.app)
        .post('/api/categories')
        .set(owner.auth)
        .send({ name: 'Secreta' })
        .expect(201)
    ).body;
    await request(ctx.app)
      .patch(`/api/categories/${category.id}`)
      .set(intruder.auth)
      .send({ name: 'x' })
      .expect(404);
    await request(ctx.app).delete(`/api/categories/${category.id}`).set(intruder.auth).expect(404);
    const res = await addTransaction(ctx, intruder, {
      categoryId: category.id,
      category: undefined,
    });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('custom alerts of another user cannot be edited or deleted', async () => {
    const alert = (
      await request(ctx.app)
        .post('/api/custom-alerts')
        .set(owner.auth)
        .send({ name: 'Gasto alto', metric: 'expenses_pct', operator: 'gte', threshold: 80 })
        .expect(201)
    ).body;
    await request(ctx.app)
      .patch(`/api/custom-alerts/${alert.id}`)
      .set(intruder.auth)
      .send({ active: false })
      .expect(404);
    await request(ctx.app).delete(`/api/custom-alerts/${alert.id}`).set(intruder.auth).expect(404);
    const list = await request(ctx.app).get('/api/custom-alerts').set(owner.auth).expect(200);
    expect(list.body[0].active).toBe(true);
  });

  it('recurring rules, goals, budgets, accounts and transfers are private', async () => {
    const rule = (
      await request(ctx.app)
        .post('/api/recurring-rules')
        .set(owner.auth)
        .send({
          description: 'Alquiler',
          amount: 800,
          type: 'EXPENSE',
          category: 'Vivienda',
          startYear: 2026,
          startMonth: 1,
        })
        .expect(201)
    ).body;
    await request(ctx.app)
      .patch(`/api/recurring-rules/${rule.id}`)
      .set(intruder.auth)
      .send({ amount: 1 })
      .expect(404);
    await request(ctx.app).delete(`/api/recurring-rules/${rule.id}`).set(intruder.auth).expect(404);

    const goal = (
      await request(ctx.app)
        .post('/api/goals')
        .set(owner.auth)
        .send({ name: 'Viaje', target: 1000 })
        .expect(201)
    ).body;
    await request(ctx.app).delete(`/api/goals/${goal.id}`).set(intruder.auth).expect(404);

    const budget = (
      await request(ctx.app)
        .put('/api/budgets')
        .set(owner.auth)
        .send({ category: 'Ocio', amount: 100 })
        .expect(200)
    ).body;
    await request(ctx.app).delete(`/api/budgets/${budget.id}`).set(intruder.auth).expect(404);

    const accounts = (await request(ctx.app).get('/api/accounts').set(owner.auth)).body.accounts;
    const ownerAccount = accounts[0].id;
    await request(ctx.app)
      .patch(`/api/accounts/${ownerAccount}`)
      .set(intruder.auth)
      .send({ name: 'x' })
      .expect(404);
    const intruderAccount = (await request(ctx.app).get('/api/accounts').set(intruder.auth)).body
      .accounts[0].id;
    await request(ctx.app)
      .post('/api/transfers')
      .set(intruder.auth)
      .send({
        fromAccountId: ownerAccount,
        toAccountId: intruderAccount,
        amount: 10,
        date: '2026-03-01',
      })
      .expect(404);
    await addTransaction(ctx, intruder, { accountId: ownerAccount }).then((r) =>
      expect(r.status).toBe(404)
    );
  });
});
