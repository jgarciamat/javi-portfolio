import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

describe('Self-employed: professional categories and quarterly tax', () => {
  let ctx: TestContext;
  let user: TestUser;
  let categories: Record<string, string>;

  const put = (id: string, vatRate: number, who = user) =>
    request(ctx.app).put(`/api/business/categories/${id}`).set(who.auth).send({ vatRate });

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-07-10T12:00:00Z' });
    user = await createUser(ctx);
    const list = (await request(ctx.app).get('/api/categories').set(user.auth)).body as {
      id: string;
      name: string;
    }[];
    categories = Object.fromEntries(list.map((c) => [c.name, c.id]));
  });

  it('marks categories as professional with a VAT rate, changes it and unmarks it', async () => {
    await put(categories['Salario'], 21).expect(204);
    await put(categories['Educación'], 10).expect(204);
    await put(categories['Educación'], 4).expect(204);
    const list = (await request(ctx.app).get('/api/business/categories').set(user.auth).expect(200))
      .body;
    expect(list).toEqual(
      expect.arrayContaining([
        { categoryId: categories['Salario'], categoryName: 'Salario', vatRate: 21 },
        { categoryId: categories['Educación'], categoryName: 'Educación', vatRate: 4 },
      ])
    );
    expect(list).toHaveLength(2);
    await request(ctx.app)
      .delete(`/api/business/categories/${categories['Educación']}`)
      .set(user.auth)
      .expect(204);
    expect(
      (await request(ctx.app).get('/api/business/categories').set(user.auth)).body
    ).toHaveLength(1);
  });

  it('rejects unknown VAT rates and categories', async () => {
    await put(categories['Salario'], 7).expect(400);
    await put('00000000-0000-4000-8000-000000000000', 21).expect(404);
  });

  it('computes each quarter from the professional categories only', async () => {
    await put(categories['Salario'], 21).expect(204);
    await put(categories['Educación'], 21).expect(204);
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 1210,
      date: '2026-02-10',
    });
    await addTransaction(ctx, user, { category: 'Educación', amount: 242, date: '2026-03-02' });
    await addTransaction(ctx, user, { category: 'Ocio', amount: 500, date: '2026-03-03' });
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 605,
      date: '2026-05-10',
    });
    const res = await request(ctx.app).get('/api/business/tax/2026').set(user.auth).expect(200);
    expect(res.body.year).toBe(2026);
    expect(res.body.quarters[0]).toMatchObject({
      quarter: 1,
      incomeBase: 1000,
      vatCollected: 210,
      expenseBase: 200,
      vatPaid: 42,
      vatDue: 168,
      netIncome: 800,
      irpfAdvance: 160,
    });
    expect(res.body.quarters[1]).toMatchObject({ quarter: 2, incomeBase: 500, irpfAdvance: 100 });
    expect(res.body.totals).toMatchObject({ incomeBase: 1500, expenseBase: 200, irpfAdvance: 260 });
  });

  it('is private and Premium', async () => {
    const other = await createUser(ctx, 'otra@example.com');
    await put(categories['Salario'], 21).expect(204);
    expect((await request(ctx.app).get('/api/business/categories').set(other.auth)).body).toEqual(
      []
    );
    expireTrial(ctx, user);
    await request(ctx.app).get('/api/business/categories').set(user.auth).expect(402);
    await request(ctx.app).get('/api/business/tax/2026').set(user.auth).expect(402);
    await put(categories['Salario'], 21).expect(402);
    await request(ctx.app)
      .delete(`/api/business/categories/${categories['Salario']}`)
      .set(user.auth)
      .expect(402);
  });
});
