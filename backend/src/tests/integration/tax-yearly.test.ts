import request from 'supertest';
import { VatRate } from '@domain/ports/repositories';
import { yearlyTax } from '@domain/services/tax';
import { presentTax } from '@infrastructure/http/presenters';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
} from '../helpers/testApp';

/** /business/tax/:year reads only that year's professional movements from SQL (A03). */
describe('Yearly tax estimate from SQL', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-05-20T10:00:00Z' });
    user = await createUser(ctx);
  });

  const add = async (body: Record<string, unknown>) =>
    expect((await addTransaction(ctx, user, body)).status).toBe(201);

  // The way it was done before: every movement, filtered and added up in JS.
  const before = (year: number) => {
    const rates = new Map(
      ctx.container.repos.business.listByUser(user.id).map((b) => [b.categoryId, b.vatRate])
    );
    return yearlyTax(
      year,
      ctx.container.repos.transactions
        .listAllByUser(user.id)
        .map((t) => t.toPrimitives())
        .filter((t) => rates.has(t.categoryId) && (t.type === 'INCOME' || t.type === 'EXPENSE'))
        .map((t) => ({
          date: t.date,
          type: t.type as 'INCOME' | 'EXPENSE',
          amountCents: t.amountCents,
          vatRate: rates.get(t.categoryId) as VatRate,
        }))
    );
  };
  const expectSame = async (years: number[]) => {
    for (const year of years) {
      const res = await request(ctx.app)
        .get(`/api/business/tax/${year}`)
        .set(user.auth)
        .expect(200);
      expect(res.text).toBe(JSON.stringify(presentTax(before(year))));
    }
  };

  it('gives byte by byte the same estimate as adding up every movement', async () => {
    let n = 0;
    for (const [category, type] of [
      ['Restaurantes', 'EXPENSE'],
      ['Supermercado', 'EXPENSE'],
      ['Transporte', 'EXPENSE'],
      ['Salario', 'INCOME'],
      ['Ocio', 'EXPENSE'],
    ] as const) {
      for (const date of ['2025-12-31', '2026-01-01', '2026-03-31', '2026-04-01', '2026-12-31']) {
        await add({
          description: `Factura ${++n}`,
          amount: Math.round((10 + n * 1.37) * 100) / 100,
          type,
          category,
          date,
        });
      }
    }
    await add({ description: 'Cobro', amount: 1000, type: 'INCOME', category: 'Salario' });
    await add({
      description: 'Al lado',
      amount: 5.01,
      type: 'SAVING',
      category: 'Ahorro',
      date: '2026-03-31',
    });
    await add({ description: 'Enero', amount: 3.33, category: 'Restaurantes', date: '2027-01-01' });
    // Without professional categories: all at zero.
    await expectSame([2026]);

    const categories = (await request(ctx.app).get('/api/categories').set(user.auth)).body as {
      id: string;
      name: string;
    }[];
    for (const [name, vatRate] of [
      ['Restaurantes', 10],
      ['Supermercado', 4],
      ['Transporte', 0],
      ['Salario', 21],
      ['Ahorro', 21],
    ] as const) {
      const id = categories.find((c) => c.name === name)!.id;
      await request(ctx.app)
        .put(`/api/business/categories/${id}`)
        .set(user.auth)
        .send({ vatRate })
        .expect(204);
    }
    await expectSame([2024, 2025, 2026, 2027]);
    expect(ctx.container.tax.yearly(user.id, 2026).totals.incomeBaseCents).toBeGreaterThan(0);
  });
});
