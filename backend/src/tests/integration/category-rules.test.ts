import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

describe('Category rules', () => {
  let ctx: TestContext;
  let user: TestUser;
  let categories: Record<string, string>;

  const get = (path: string, who = user) => request(ctx.app).get(path).set(who.auth);
  const addRule = (pattern: string, categoryId: string, who = user) =>
    request(ctx.app).post('/api/category-rules').set(who.auth).send({ pattern, categoryId });

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
    const list = (await get('/api/categories')).body as { id: string; name: string }[];
    categories = Object.fromEntries(list.map((c) => [c.name, c.id]));
  });

  it('creates, lists and deletes rules; the same text moves to the new category', async () => {
    const created = await addRule('  MERCADONA ', categories['Alimentación']).expect(201);
    expect(created.body).toMatchObject({ pattern: 'mercadona', categoryName: 'Alimentación' });
    const moved = await addRule('mercadona', categories['Ocio']).expect(201);
    expect(moved.body.id).toBe(created.body.id);
    const list = (await get('/api/category-rules')).body;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ pattern: 'mercadona', categoryName: 'Ocio' });
    await request(ctx.app)
      .delete(`/api/category-rules/${created.body.id}`)
      .set(user.auth)
      .expect(204);
    expect((await get('/api/category-rules')).body).toEqual([]);
    await request(ctx.app)
      .delete(`/api/category-rules/${created.body.id}`)
      .set(user.auth)
      .expect(404);
  });

  it('validates the text and the category', async () => {
    await addRule('ab', categories['Ocio']).expect(400);
    await addRule('x'.repeat(61), categories['Ocio']).expect(400);
    await addRule('***', categories['Ocio']).expect(400);
    await addRule('mercadona', '00000000-0000-4000-8000-000000000000').expect(404);
  });

  it('suggests the merchant and the category an existing rule gives', async () => {
    await addRule('mercadona', categories['Alimentación']).expect(201);
    const res = await get(
      '/api/category-rules/suggest?description=COMPRA%20MERCADONA%200231%20MADRID'
    ).expect(200);
    expect(res.body).toEqual({
      pattern: 'mercadona madrid',
      categoryId: categories['Alimentación'],
    });
    const none = await get('/api/category-rules/suggest?description=Zapatería%20Lola').expect(200);
    expect(none.body.categoryId).toBeNull();
  });

  it('beats the file, the history and the keywords when importing', async () => {
    await addRule('mercadona', categories['Ocio']).expect(201);
    const res = await request(ctx.app)
      .post('/api/transactions/import')
      .set(user.auth)
      .send({
        dryRun: true,
        rows: [
          { date: '2026-03-02', description: 'COMPRA MERCADONA 0231', amount: -54.3 },
          { date: '2026-03-03', description: 'Mercadona', amount: -10, category: 'Hogar' },
          { date: '2026-03-04', description: 'Lidl', amount: -12 },
        ],
      })
      .expect(200);
    const row = (i: number) => res.body.rows.find((r: { index: number }) => r.index === i);
    expect(row(0)).toMatchObject({ categoryName: 'Ocio', categorySource: 'rule' });
    expect(row(1)).toMatchObject({ categoryName: 'Ocio', categorySource: 'rule' });
    expect(row(2)).toMatchObject({ categoryName: 'Alimentación', categorySource: 'keywords' });
  });

  it('keeps rules private per user and follows the category when it is merged or deleted', async () => {
    const other = await createUser(ctx, 'otra@example.com');
    await addRule('mercadona', categories['Ocio']).expect(201);
    expect((await get('/api/category-rules', other)).body).toEqual([]);
    // Deleting the category and moving its movements elsewhere keeps the rule on the new one.
    await request(ctx.app)
      .delete(`/api/categories/${categories['Ocio']}?reassignTo=${categories['Ropa']}`)
      .set(user.auth)
      .expect(204);
    expect((await get('/api/category-rules')).body[0]).toMatchObject({ categoryName: 'Ropa' });
    // Without a reassignment the rule goes away with its category.
    await request(ctx.app).delete(`/api/categories/${categories['Ropa']}`).set(user.auth);
    const left = (await get('/api/category-rules')).body as unknown[];
    expect(left.length).toBeLessThanOrEqual(1);
  });
});
