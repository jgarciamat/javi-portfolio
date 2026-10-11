import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

describe('Shared expenses', () => {
  let ctx: TestContext;
  let user: TestUser;

  const post = (path: string, body: unknown, who = user) =>
    request(ctx.app)
      .post(path)
      .set(who.auth)
      .send(body as object);
  const createGroup = async (members = ['Ana', 'Ben', 'Cai']) =>
    (await post('/api/splits', { name: 'Piso', members }).expect(201)).body;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  it('creates a group, records who paid and shows the balances and the payments to settle', async () => {
    const group = await createGroup();
    const [ana, ben, cai] = group.members as { id: string; name: string }[];
    expect(group.members.map((m: { balance: number }) => m.balance)).toEqual([0, 0, 0]);

    const dinner = await post(`/api/splits/${group.id}/expenses`, {
      description: 'Cena',
      amount: 90,
      paidBy: ana.id,
      date: '2026-03-10',
    }).expect(201);
    expect(dinner.body.members.map((m: { balance: number }) => m.balance)).toEqual([60, -30, -30]);

    const taxi = await post(`/api/splits/${group.id}/expenses`, {
      description: 'Taxi',
      amount: 30,
      paidBy: ben.id,
      participants: [ana.id, ben.id],
    }).expect(201);
    expect(taxi.body.transfers).toEqual([
      { from: cai.id, to: ana.id, amount: 30 },
      { from: ben.id, to: ana.id, amount: 15 },
    ]);
    expect(taxi.body.expenses).toHaveLength(2);

    const settled = await post(`/api/splits/${group.id}/settlements`, {
      from: cai.id,
      to: ana.id,
      amount: 30,
    }).expect(201);
    expect(settled.body.members.find((m: { id: string }) => m.id === cai.id).balance).toBe(0);
    expect(settled.body.expenses.find((e: { settlement: boolean }) => e.settlement)).toMatchObject({
      description: 'Pago',
      amount: 30,
    });

    const list = (await request(ctx.app).get('/api/splits').set(user.auth).expect(200)).body;
    expect(list).toEqual([{ id: group.id, name: 'Piso', members: 3, expenses: 2 }]);
  });

  it('deletes an expense and a group', async () => {
    const group = await createGroup();
    const added = await post(`/api/splits/${group.id}/expenses`, {
      description: 'Cena',
      amount: 10,
      paidBy: group.members[0].id,
    }).expect(201);
    const expenseId = added.body.expenses[0].id;
    const after = await request(ctx.app)
      .delete(`/api/splits/${group.id}/expenses/${expenseId}`)
      .set(user.auth)
      .expect(200);
    expect(after.body.expenses).toEqual([]);
    await request(ctx.app)
      .delete(`/api/splits/${group.id}/expenses/${expenseId}`)
      .set(user.auth)
      .expect(404);
    await request(ctx.app).delete(`/api/splits/${group.id}`).set(user.auth).expect(204);
    await request(ctx.app).delete(`/api/splits/${group.id}`).set(user.auth).expect(404);
    await request(ctx.app).get(`/api/splits/${group.id}`).set(user.auth).expect(404);
  });

  it('validates people, amounts and limits', async () => {
    await post('/api/splits', { name: 'Solo', members: ['Ana'] }).expect(400);
    await post('/api/splits', { name: 'Repes', members: ['Ana', 'ana'] }).expect(400);
    await post('/api/splits', { name: '', members: ['Ana', 'Ben'] }).expect(400);
    const group = await createGroup();
    const [ana, ben] = group.members as { id: string }[];
    const stranger = '00000000-0000-4000-8000-000000000000';
    await post(`/api/splits/${group.id}/expenses`, {
      description: 'x',
      amount: 5,
      paidBy: stranger,
    }).expect(400);
    await post(`/api/splits/${group.id}/expenses`, {
      description: 'x',
      amount: 5,
      paidBy: ana.id,
      participants: [stranger],
    }).expect(400);
    await post(`/api/splits/${group.id}/expenses`, {
      description: 'x',
      amount: 0,
      paidBy: ana.id,
    }).expect(400);
    await post(`/api/splits/${group.id}/settlements`, {
      from: ana.id,
      to: ana.id,
      amount: 5,
    }).expect(400);
    await post(`/api/splits/${group.id}/settlements`, {
      from: ana.id,
      to: stranger,
      amount: 5,
    }).expect(400);
    await post(`/api/splits/${stranger}/expenses`, {
      description: 'x',
      amount: 5,
      paidBy: ben.id,
    }).expect(404);
    for (let i = 0; i < 19; i++)
      await post('/api/splits', { name: `g${i}`, members: ['A', 'B'] }).expect(201);
    const res = await post('/api/splits', { name: 'one more', members: ['A', 'B'] }).expect(400);
    expect(res.body.code).toBe('TOO_MANY_GROUPS');
  });

  it('limits the expenses of a group', async () => {
    const group = await createGroup(['Ana', 'Ben']);
    for (let i = 0; i < 500; i++) {
      ctx.container.repos.splits.addExpense(
        group.id,
        {
          id: String(i).padStart(36, '0'),
          description: 'x',
          amountCents: 100,
          paidBy: group.members[0].id,
          date: '2026-03-01',
          settlement: false,
          shares: [{ memberId: group.members[0].id, shareCents: 100 }],
        },
        '2026-03-01T00:00:00Z'
      );
    }
    const res = await post(`/api/splits/${group.id}/expenses`, {
      description: 'x',
      amount: 1,
      paidBy: group.members[0].id,
    }).expect(400);
    expect(res.body.code).toBe('TOO_MANY_EXPENSES');
  });

  it('is private', async () => {
    const group = await createGroup();
    const other = await createUser(ctx, 'otra@example.com');
    await request(ctx.app).get(`/api/splits/${group.id}`).set(other.auth).expect(404);
    expect((await request(ctx.app).get('/api/splits').set(other.auth)).body).toEqual([]);
  });
});
