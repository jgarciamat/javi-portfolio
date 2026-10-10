import request from 'supertest';
import { FinancialAdvisor } from '@domain/ports/services';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

describe('Import', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const rows = [
    { date: '2026-03-01', description: 'NOMINA EMPRESA SL', amount: 1800 },
    { date: '2026-03-02', description: 'MERCADONA VALENCIA', amount: -54.3 },
    { date: '2026-03-03', description: 'Bar Pepe', amount: -3.2 },
    { date: '2026-03-03', description: 'Bar Pepe', amount: -3.2 },
    { date: '2026-03-04', description: 'Regalo tía', amount: -20, category: 'Regalos' },
    { date: 'not a date', description: 'roto', amount: -1 },
  ];

  it('previews categories without writing anything (dry run)', async () => {
    await addTransaction(ctx, user, {
      description: 'Bar Pepe',
      category: 'Ocio',
      date: '2026-02-01',
    });
    const res = await request(ctx.app)
      .post('/api/transactions/import')
      .set(user.auth)
      .send({ rows, dryRun: true })
      .expect(200);
    expect(res.body).toMatchObject({ dryRun: true, imported: 5, invalid: 1, duplicates: 0 });
    const byIndex = (i: number) => res.body.rows.find((r: { index: number }) => r.index === i);
    expect(byIndex(0)).toMatchObject({
      type: 'INCOME',
      categoryName: 'Salario',
      categorySource: 'keywords',
      amount: 1800,
    });
    expect(byIndex(1)).toMatchObject({
      type: 'EXPENSE',
      categoryName: 'Alimentación',
      amount: 54.3,
    });
    expect(byIndex(2)).toMatchObject({ categoryName: 'Ocio', categorySource: 'history' });
    expect(byIndex(4)).toMatchObject({ categoryName: 'Regalos', categorySource: 'file' });
    expect(byIndex(5)).toMatchObject({ status: 'invalid' });
    const month = (await request(ctx.app).get('/api/months/2026/3').set(user.auth)).body;
    expect(month.transactions).toHaveLength(0);
  });

  it('imports and skips duplicates when the same file is imported again', async () => {
    const first = await request(ctx.app)
      .post('/api/transactions/import')
      .set(user.auth)
      .send({ rows })
      .expect(201);
    expect(first.body).toMatchObject({ imported: 5, duplicates: 0, invalid: 1 });
    const again = await request(ctx.app)
      .post('/api/transactions/import')
      .set(user.auth)
      .send({ rows })
      .expect(201);
    expect(again.body).toMatchObject({ imported: 0, duplicates: 5 });
    const month = (await request(ctx.app).get('/api/months/2026/3').set(user.auth)).body;
    expect(month.transactions).toHaveLength(5);
    expect(month.summary.totalExpenses).toBe(80.7);
  });
});

describe('Export', () => {
  it('returns every piece of user data as a JSON attachment', async () => {
    const ctx = createTestApp();
    const user = await createUser(ctx);
    await addTransaction(ctx, user, { amount: 9.99, description: 'Netflix' });
    await request(ctx.app).post('/api/goals').set(user.auth).send({ name: 'Moto', target: 2000 });
    const res = await request(ctx.app).get('/api/export').set(user.auth).expect(200);
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="money-manager-2026-03-15.json"/
    );
    expect(res.body).toMatchObject({ format: 'money-manager-export', version: 2 });
    expect(res.body.profile.email).toBe(user.email);
    expect(res.body.transactions).toEqual([
      expect.objectContaining({
        description: 'Netflix',
        amount: 9.99,
        category: 'Ocio',
        account: 'Principal',
      }),
    ]);
    expect(res.body.goals[0]).toMatchObject({ name: 'Moto', target: 2000 });
    expect(res.body.categories.length).toBeGreaterThan(10);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash|tokenHash/);
  });
});

describe('Settings', () => {
  it('a custom month start day moves movements to the right period', async () => {
    const ctx = createTestApp({ now: '2026-03-27T12:00:00Z' });
    const user = await createUser(ctx);
    await addTransaction(ctx, user, { date: '2026-03-24', amount: 10 });
    await addTransaction(ctx, user, { date: '2026-03-26', amount: 20 });

    const updated = await request(ctx.app)
      .patch('/api/settings')
      .set(user.auth)
      .send({ monthStartDay: 25, currency: 'usd', locale: 'en' })
      .expect(200);
    expect(updated.body).toMatchObject({ monthStartDay: 25, currency: 'USD', locale: 'en' });
    expect(updated.body.currentPeriod).toEqual({
      year: 2026,
      month: 4,
      start: '2026-03-25',
      end: '2026-04-24',
    });

    const april = (await request(ctx.app).get('/api/months/2026/4').set(user.auth)).body;
    expect(april).toMatchObject({ start: '2026-03-25', end: '2026-04-24', isCurrent: true });
    expect(april.transactions.map((t: { amount: number }) => t.amount)).toEqual([20]);
    const march = (await request(ctx.app).get('/api/months/2026/3').set(user.auth)).body;
    expect(march.transactions.map((t: { amount: number }) => t.amount)).toEqual([10]);

    await request(ctx.app)
      .patch('/api/settings')
      .set(user.auth)
      .send({ monthStartDay: 31 })
      .expect(400);
    await request(ctx.app)
      .patch('/api/settings')
      .set(user.auth)
      .send({ currency: 'XXX' })
      .expect(400);
  });
});

describe('Stats', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-04-10T12:00:00Z' });
    user = await createUser(ctx);
  });

  it('compares each category with the previous month and the 3-month average', async () => {
    await addTransaction(ctx, user, { category: 'Ocio', amount: 30, date: '2026-01-10' });
    await addTransaction(ctx, user, { category: 'Ocio', amount: 60, date: '2026-02-10' });
    await addTransaction(ctx, user, { category: 'Ocio', amount: 90, date: '2026-03-10' });
    await addTransaction(ctx, user, { category: 'Ocio', amount: 120, date: '2026-04-05' });
    const res = await request(ctx.app).get('/api/stats/trends/2026/4').set(user.auth).expect(200);
    expect(res.body.categories).toEqual([
      {
        categoryName: 'Ocio',
        current: 120,
        previous: 90,
        average3: 60,
        changeVsPreviousPct: 33.3,
        changeVsAveragePct: 100,
      },
    ]);
  });

  it('builds the net worth evolution (available + saved)', async () => {
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 1000,
      date: '2026-02-01',
    });
    await addTransaction(ctx, user, {
      type: 'SAVING',
      category: 'Ahorro',
      amount: 200,
      date: '2026-03-01',
    });
    await addTransaction(ctx, user, { amount: 100, date: '2026-04-01' });
    const res = await request(ctx.app)
      .get('/api/stats/net-worth?months=3')
      .set(user.auth)
      .expect(200);
    expect(res.body).toEqual([
      { year: 2026, month: 2, available: 1000, saved: 0, netWorth: 1000 },
      { year: 2026, month: 3, available: 800, saved: 200, netWorth: 1000 },
      { year: 2026, month: 4, available: 700, saved: 200, netWorth: 900 },
    ]);
  });
});

describe('Forecast', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-04-11T12:00:00Z' });
    user = await createUser(ctx);
    for (const [date, amount] of [
      ['2026-01-10', 300],
      ['2026-02-10', 300],
      ['2026-03-10', 300],
    ] as const) {
      await addTransaction(ctx, user, { amount, date });
    }
    await addTransaction(ctx, user, {
      type: 'INCOME',
      category: 'Salario',
      amount: 2000,
      date: '2026-04-01',
    });
  });

  const forecast = (query = '') =>
    request(ctx.app).get(`/api/stats/forecast${query}`).set(user.auth);

  it('says how much can be spent per day and how the month will probably end', async () => {
    const res = await forecast().expect(200);
    // Carry-over: −900 (three months of spending); April: +2000 → 1100 available.
    // 20 of the 30 days are left; the usual 300 €/month of spending leaves 200 € still to come.
    expect(res.body.safeToSpend).toEqual({
      available: 1100,
      daysLeft: 20,
      daily: 55,
      projectedEnd: 900,
      status: 'ok',
    });
    expect(res.body).toMatchObject({ year: 2026, month: 4, locked: false });
    expect(res.body.projection).toHaveLength(6);
  });

  it('projects the next months from the recurring rules and lets rules be left out', async () => {
    const rule = await request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({
        description: 'Alquiler',
        type: 'EXPENSE',
        category: 'Vivienda',
        amount: 700,
        startYear: 2026,
        startMonth: 5,
      })
      .expect(201);
    const full = (await forecast('?months=2').expect(200)).body;
    expect(full.rules).toEqual([
      {
        id: rule.body.id,
        description: 'Alquiler',
        type: 'EXPENSE',
        amount: 700,
        frequency: 'monthly',
      },
    ]);
    expect(full.projection[0]).toMatchObject({
      month: 5,
      fixedExpenses: 700,
      variableExpenses: 300,
      balance: -1000,
      endAvailable: -100,
    });
    expect(full.firstShortfall).toEqual({ year: 2026, month: 5 });

    const without = (await forecast(`?months=2&exclude=${rule.body.id},unknown`).expect(200)).body;
    expect(without.projection[0]).toMatchObject({ fixedExpenses: 0, endAvailable: 600 });
    expect(without.firstShortfall).toBeNull();
  });

  it('keeps the month-by-month outlook for Premium and answers the rest for free', async () => {
    expireTrial(ctx, user);
    const res = await forecast().expect(200);
    expect(res.body).toMatchObject({ locked: true, projection: null, firstShortfall: null });
    expect(res.body.safeToSpend.daily).toBe(55);
    await forecast('?months=13').expect(400);
  });
});

describe('Annual report', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-04-20T12:00:00Z' });
    user = await createUser(ctx);
    const add = (body: Record<string, unknown>) => addTransaction(ctx, user, body);
    await add({ type: 'INCOME', category: 'Salario', amount: 2000, date: '2026-01-05' });
    await add({ type: 'INCOME', category: 'Freelance', amount: 500, date: '2026-04-02' });
    await add({ category: 'Ocio', amount: 100, date: '2026-01-20' });
    await add({ category: 'Ocio', amount: 50, date: '2026-05-10' });
    await add({ category: 'Vivienda', amount: 700, date: '2026-02-01' });
    await add({ type: 'SAVING', category: 'Ahorro', amount: 300, date: '2026-03-01' });
    await add({ category: 'Ocio', amount: 999, date: '2025-12-31' }); // another year
  });

  it('adds the year up by month, quarter and category', async () => {
    const res = await request(ctx.app).get('/api/stats/report/2026').set(user.auth).expect(200);
    const { body } = res;
    expect(body).toMatchObject({ year: 2026, currency: 'EUR' });
    expect(body.months).toHaveLength(12);
    expect(body.months[0]).toEqual({ month: 1, income: 2000, expenses: 100, saving: 0 });
    expect(body.months[2]).toEqual({ month: 3, income: 0, expenses: 0, saving: 300 });
    expect(body.quarters).toEqual([
      { quarter: 1, income: 2000, expenses: 800, saving: 300, balance: 900 },
      { quarter: 2, income: 500, expenses: 50, saving: 0, balance: 450 },
      { quarter: 3, income: 0, expenses: 0, saving: 0, balance: 0 },
      { quarter: 4, income: 0, expenses: 0, saving: 0, balance: 0 },
    ]);
    expect(body.totals).toEqual({ income: 2500, expenses: 850, saving: 300, balance: 1350 });
    expect(body.expensesByCategory).toEqual([
      { categoryName: 'Vivienda', amount: 700 },
      { categoryName: 'Ocio', amount: 150 },
    ]);
    expect(body.incomeByCategory).toEqual([
      { categoryName: 'Salario', amount: 2000 },
      { categoryName: 'Freelance', amount: 500 },
    ]);
  });

  it('keeps the report for Premium and validates the year', async () => {
    await request(ctx.app).get('/api/stats/report/abc').set(user.auth).expect(400);
    await request(ctx.app).get('/api/stats/report/2026').expect(401);
    expireTrial(ctx, user);
    await request(ctx.app).get('/api/stats/report/2026').set(user.auth).expect(402);
  });
});

describe('Subscriptions', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-04-20T12:00:00Z' });
    user = await createUser(ctx);
    for (const [date, amount] of [
      ['2026-01-05', 12.99],
      ['2026-02-05', 12.99],
      ['2026-03-05', 12.99],
      ['2026-04-05', 13.99],
    ] as const) {
      await addTransaction(ctx, user, { description: 'Netflix', amount, date });
    }
    await addTransaction(ctx, user, { description: 'Cena', amount: 40, date: '2026-04-01' });
  });

  it('lists charges that repeat like a subscription with their yearly cost', async () => {
    const res = await request(ctx.app).get('/api/stats/subscriptions').set(user.auth).expect(200);
    expect(res.body).toMatchObject({ monthly: 13.99, annual: 167.88 });
    expect(res.body.subscriptions).toEqual([
      {
        key: 'netflix',
        description: 'Netflix',
        cadence: 'monthly',
        amount: 13.99,
        annualCost: 167.88,
        count: 4,
        lastDate: '2026-04-05',
        nextDate: '2026-05-05',
        priceIncrease: { from: 12.99, to: 13.99 },
      },
    ]);
  });

  it('leaves out what is already a recurring rule and keeps the view for Premium', async () => {
    await request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({
        description: 'Netflix',
        type: 'EXPENSE',
        category: 'Ocio',
        amount: 13.99,
        startYear: 2026,
        startMonth: 5,
      })
      .expect(201);
    const res = await request(ctx.app).get('/api/stats/subscriptions').set(user.auth).expect(200);
    expect(res.body.subscriptions).toEqual([]);
    expireTrial(ctx, user);
    await request(ctx.app).get('/api/stats/subscriptions').set(user.auth).expect(402);
  });
});

describe('AI advice', () => {
  it('uses the AI provider and falls back to rules when it fails', async () => {
    const advisor: FinancialAdvisor = {
      name: 'fake',
      getAdvice: jest
        .fn()
        .mockResolvedValueOnce({
          advice: { summary: 'IA', tips: [], positives: [], warnings: [] },
          usage: { neurons: 20 },
        })
        .mockRejectedValue(new Error('provider down')),
    };
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const ctx = createTestApp({ advisor });
    const user = await createUser(ctx);
    await addTransaction(ctx, user, { type: 'INCOME', category: 'Salario', amount: 1000 });

    const ai = await request(ctx.app)
      .post('/api/ai/advice')
      .set(user.auth)
      .send({ year: 2026, month: 3 })
      .expect(200);
    expect(ai.body).toMatchObject({ summary: 'IA', source: 'ai', ai: { used: 1, quota: 10 } });
    const cached = await request(ctx.app)
      .post('/api/ai/advice')
      .set(user.auth)
      .send({ year: 2026, month: 3 });
    expect(cached.body).toMatchObject({ source: 'ai', ai: { used: 1 } }); // cache hits are free
    expect(advisor.getAdvice).toHaveBeenCalledTimes(1);
    const context = (advisor.getAdvice as jest.Mock).mock.calls[0][0];
    expect(context).toMatchObject({ totalIncome: 1000, currency: 'EUR', transactionCount: 1 });
    expect(JSON.stringify(context)).not.toMatch(/Movimiento/); // descriptions are never sent

    await addTransaction(ctx, user, { amount: 10 });
    const fallback = await request(ctx.app)
      .post('/api/ai/advice')
      .set(user.auth)
      .send({ year: 2026, month: 3, locale: 'en' });
    expect(fallback.body).toMatchObject({ source: 'rules', reason: 'error' });
    expect(fallback.body.summary).toMatch(/income/);
    expect(errorLog).toHaveBeenCalled();
    errorLog.mockRestore();
  });
});
