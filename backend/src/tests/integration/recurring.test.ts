import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

describe('Recurring rules API', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
  });

  const createRule = (body: Record<string, unknown> = {}) =>
    request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({
        description: 'Alquiler',
        amount: 800,
        type: 'EXPENSE',
        category: 'Vivienda',
        startYear: 2026,
        startMonth: 1,
        ...body,
      });

  const monthTx = async (year: number, month: number) =>
    (await request(ctx.app).get(`/api/months/${year}/${month}`).set(user.auth).expect(200)).body
      .transactions;

  const generated = async () => {
    const res = await request(ctx.app)
      .get('/api/transactions/search?limit=200&sort=date_asc')
      .set(user.auth);
    return res.body.items.filter((t: { recurringRuleId: string | null }) => t.recurringRuleId);
  };

  it('backfills from the start month up to next month when created', async () => {
    const rule = (await createRule().expect(201)).body;
    expect(rule).toMatchObject({
      amount: 800,
      category: 'Vivienda',
      frequency: 'monthly',
      startYear: 2026,
    });
    const items = await generated();
    expect(items.map((t: { date: string }) => t.date)).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
    ]);
  });

  it('listing rules has no side effects', async () => {
    await createRule().expect(201);
    const before = (await generated()).length;
    await request(ctx.app).get('/api/recurring-rules').set(user.auth).expect(200);
    expect((await generated()).length).toBe(before);
  });

  it('generates movements lazily when a later month is viewed (no need to open the rules tab)', async () => {
    await createRule().expect(201);
    ctx.clock.set('2026-07-10T12:00:00Z');
    expect(await monthTx(2026, 6)).toHaveLength(1);
    const carry = (await request(ctx.app).get('/api/months/2026/7').set(user.auth)).body.carryover;
    expect(carry).toBe(-800 * 6);
  });

  it('supports bimonthly, quarterly and yearly frequencies and an end date', async () => {
    await createRule({ description: 'Agua', amount: 40, frequency: 'bimonthly' }).expect(201);
    await createRule({
      description: 'Seguro',
      amount: 300,
      frequency: 'yearly',
      startMonth: 2,
    }).expect(201);
    await createRule({
      description: 'Gym',
      amount: 30,
      frequency: 'monthly',
      endYear: 2026,
      endMonth: 2,
    }).expect(201);
    const items = await generated();
    const by = (d: string) =>
      items
        .filter((t: { description: string }) => t.description === d)
        .map((t: { date: string }) => t.date);
    expect(by('Agua')).toEqual(['2026-01-01', '2026-03-01']);
    expect(by('Seguro')).toEqual(['2026-02-01']);
    expect(by('Gym')).toEqual(['2026-01-01', '2026-02-01']);
  });

  it('does not regenerate a movement the user deleted', async () => {
    await createRule().expect(201);
    const [march] = await monthTx(2026, 3);
    await request(ctx.app).delete(`/api/transactions/${march.id}`).set(user.auth).expect(204);
    ctx.clock.set('2026-05-15T12:00:00Z');
    expect(await monthTx(2026, 3)).toHaveLength(0);
    expect(await monthTx(2026, 5)).toHaveLength(1);
  });

  it('a generated movement moved to another month is detached and not duplicated', async () => {
    await createRule().expect(201);
    const [march] = await monthTx(2026, 3);
    await request(ctx.app)
      .put(`/api/transactions/${march.id}`)
      .set(user.auth)
      .send({ date: '2026-02-28' })
      .expect(200);
    const feb = await monthTx(2026, 2);
    expect(feb).toHaveLength(2);
    expect(await monthTx(2026, 3)).toHaveLength(0);
  });

  it('editing a rule updates this and future months, keeping the past', async () => {
    const rule = (await createRule().expect(201)).body;
    const res = await request(ctx.app)
      .patch(`/api/recurring-rules/${rule.id}`)
      .set(user.auth)
      .send({ amount: 850, description: 'Alquiler nuevo' })
      .expect(200);
    expect(res.body.amount).toBe(850);
    expect((await monthTx(2026, 2))[0]).toMatchObject({ amount: 800, description: 'Alquiler' });
    expect((await monthTx(2026, 3))[0]).toMatchObject({
      amount: 850,
      description: 'Alquiler nuevo',
    });
    expect((await monthTx(2026, 4))[0]).toMatchObject({ amount: 850 });
  });

  it('validates updates with the same rules as creation', async () => {
    const rule = (await createRule().expect(201)).body;
    await request(ctx.app)
      .patch(`/api/recurring-rules/${rule.id}`)
      .set(user.auth)
      .send({ amount: -1 })
      .expect(400);
    await request(ctx.app)
      .patch(`/api/recurring-rules/${rule.id}`)
      .set(user.auth)
      .send({ startMonth: 13 })
      .expect(400);
    const inverted = await request(ctx.app)
      .patch(`/api/recurring-rules/${rule.id}`)
      .set(user.auth)
      .send({ endYear: 2025, endMonth: 1 })
      .expect(400);
    expect(inverted.body.code).toBe('INVALID_RANGE');
  });

  it('deactivating removes current and future generated movements; moving the start earlier backfills', async () => {
    const rule = (await createRule({ startMonth: 2 }).expect(201)).body;
    await request(ctx.app)
      .patch(`/api/recurring-rules/${rule.id}`)
      .set(user.auth)
      .send({ active: false })
      .expect(200);
    expect(await monthTx(2026, 3)).toHaveLength(0);
    expect(await monthTx(2026, 2)).toHaveLength(1);

    await request(ctx.app)
      .patch(`/api/recurring-rules/${rule.id}`)
      .set(user.auth)
      .send({ active: true, startYear: 2025, startMonth: 11 })
      .expect(200);
    expect(await monthTx(2025, 11)).toHaveLength(1);
    expect(await monthTx(2026, 3)).toHaveLength(1);
  });

  it.each([
    ['none', 4],
    ['from_current', 3],
    ['all', 0],
  ])('delete with scope %s keeps %i movements', async (scope, expected) => {
    const rule = (await createRule().expect(201)).body;
    await request(ctx.app)
      .delete(`/api/recurring-rules/${rule.id}?scope=${scope}`)
      .set(user.auth)
      .expect(204);
    const res = await request(ctx.app).get('/api/transactions/search?q=alquiler').set(user.auth);
    expect(res.body.total).toBe(expected);
  });
});
