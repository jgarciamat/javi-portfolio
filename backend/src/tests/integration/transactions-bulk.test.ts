import request from 'supertest';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
} from '../helpers/testApp';

describe('Bulk transactions API', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const add = async (body: Record<string, unknown> = {}) =>
    (await addTransaction(ctx, user, body)).body as { id: string; notes: string | null };
  const month = async (year = 2026, m = 3, who = user) =>
    (await request(ctx.app).get(`/api/months/${year}/${m}`).set(who.auth).expect(200)).body;
  const bulkDelete = (body: object, who = user) =>
    request(ctx.app).post('/api/transactions/bulk-delete').set(who.auth).send(body);
  const bulkPatch = (body: object, who = user) =>
    request(ctx.app).patch('/api/transactions/bulk').set(who.auth).send(body);

  it('deletes many movements at once and is idempotent', async () => {
    const a = await add({ amount: 10 });
    const b = await add({ amount: 20 });
    const keep = await add({ amount: 5 });
    const res = await bulkDelete({ ids: [a.id, b.id, a.id] }).expect(200);
    expect(res.body).toEqual({ applied: [a.id, b.id], skipped: [] });
    const m = await month();
    expect(m.transactions.map((t: { id: string }) => t.id)).toEqual([keep.id]);
    expect(m.summary.totalExpenses).toBe(5);

    const again = await bulkDelete({ ids: [a.id] }).expect(200);
    expect(again.body.applied).toEqual([]);
    expect(again.body.skipped).toEqual([
      expect.objectContaining({ id: a.id, code: 'TRANSACTION_NOT_FOUND' }),
    ]);
  });

  it('validates the payload strictly and caps the number of ids', async () => {
    await bulkDelete({ ids: [] }).expect(400);
    await bulkDelete({ ids: ['x'], extra: true }).expect(400);
    const many = Array.from({ length: 501 }, (_, i) => `id-${i}`);
    expect((await bulkDelete({ ids: many }).expect(400)).body.code).toBe('VALIDATION_ERROR');
    await bulkPatch({ ids: ['x'], changes: {} }).expect(400);
    await bulkPatch({ ids: ['x'], changes: { amount: 3 } }).expect(400);
    await bulkPatch({ ids: ['x'], changes: { type: 'OTHER' } }).expect(400);
  });

  it('never touches movements of another user', async () => {
    const other = await createUser(ctx, 'other@example.com');
    const mine = await add();
    const res = await bulkDelete({ ids: [mine.id] }, other).expect(200);
    expect(res.body.applied).toEqual([]);
    expect(res.body.skipped[0].code).toBe('TRANSACTION_NOT_FOUND');
    const patched = await bulkPatch({ ids: [mine.id], changes: { notes: 'hack' } }, other);
    expect(patched.body.applied).toEqual([]);
    expect((await month()).transactions).toHaveLength(1);
  });

  it('changes category, type, date and notes of many movements', async () => {
    const a = await add({ notes: 'previa' });
    const b = await add();
    const res = await bulkPatch({
      ids: [a.id, b.id],
      changes: { category: 'Viajes', type: 'income', date: '2026-04-02', notes: 'lote' },
    }).expect(200);
    expect(res.body.applied).toEqual([a.id, b.id]);
    const april = await month(2026, 4);
    expect(april.transactions).toHaveLength(2);
    expect(
      april.transactions.every(
        (t: { category: string; type: string; notes: string }) =>
          t.category === 'Viajes' && t.type === 'INCOME' && t.notes === 'lote'
      )
    ).toBe(true);
    expect(april.summary.totalIncome).toBe(20);
    expect((await month()).transactions).toHaveLength(0);
  });

  it('appends notes to the current ones or clears them', async () => {
    const a = await add({ notes: 'previa' });
    const b = await add();
    await bulkPatch({
      ids: [a.id, b.id],
      changes: { notes: 'extra', notesMode: 'append' },
    }).expect(200);
    const notes = (await month()).transactions.map((t: { notes: string }) => t.notes).sort();
    expect(notes).toEqual(['extra', 'previa extra']);
    await bulkPatch({ ids: [a.id, b.id], changes: { notes: null } }).expect(200);
    expect((await month()).transactions.every((t: { notes: null }) => t.notes === null)).toBe(true);
  });

  it('moves movements to another account and rejects unknown ones as a whole', async () => {
    const created = (
      await request(ctx.app)
        .post('/api/accounts')
        .set(user.auth)
        .send({ name: 'Hucha', type: 'savings' })
        .expect(201)
    ).body as { id: string; name: string }[];
    const piggy = created.find((acc) => acc.name === 'Hucha')!;
    const a = await add();
    await bulkPatch({ ids: [a.id], changes: { accountId: piggy.id } }).expect(200);
    expect((await month()).transactions[0].accountName).toBe('Hucha');
    const missing = await bulkPatch({ ids: [a.id], changes: { accountId: 'nope' } });
    expect(missing.status).toBe(404);
    const noCat = await bulkPatch({ ids: [a.id], changes: { categoryId: 'nope' } });
    expect(noCat.body.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('skips the movements that break a rule and applies the rest', async () => {
    await add({ type: 'INCOME', category: 'Salario', amount: 1000 });
    await add({ type: 'INCOME', category: 'Salario', amount: 250, date: '2026-02-05' });
    const small = await add({ type: 'SAVING', category: 'Ahorro', amount: 200 });
    const big = await add({ type: 'SAVING', category: 'Ahorro', amount: 300 });
    const res = await bulkPatch({
      ids: [small.id, big.id],
      changes: { date: '2026-02-10' },
    }).expect(200);
    expect(res.body.applied).toEqual([small.id]);
    expect(res.body.skipped).toEqual([
      expect.objectContaining({ id: big.id, code: 'INSUFFICIENT_BALANCE' }),
    ]);
    expect((await month(2026, 2)).summary.totalSaving).toBe(200);
    expect((await month()).summary.totalSaving).toBe(300);
  });

  it('keeps recurring rules from regenerating deleted or moved movements', async () => {
    await request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({
        description: 'Gimnasio',
        amount: 30,
        type: 'EXPENSE',
        category: 'Salud',
        startYear: 2026,
        startMonth: 3,
      })
      .expect(201);
    const generated = (await month()).transactions[0] as { id: string };
    await bulkDelete({ ids: [generated.id] }).expect(200);
    expect((await month()).transactions).toHaveLength(0);

    const april = (await month(2026, 4)).transactions[0] as { id: string };
    await bulkPatch({ ids: [april.id], changes: { date: '2026-05-20' } }).expect(200);
    expect((await month(2026, 4)).transactions).toHaveLength(0);
    const may = (await month(2026, 5)).transactions as { recurringRuleId: string | null }[];
    expect(may).toHaveLength(2);
    expect(may.filter((t) => t.recurringRuleId === null)).toHaveLength(1);
  });

  it('skips notes that would grow too long and rolls back everything on unexpected errors', async () => {
    const long = await add({ notes: 'x'.repeat(990) });
    const short = await add();
    const res = await bulkPatch({
      ids: [long.id, short.id],
      changes: { notes: 'y'.repeat(20), notesMode: 'append' },
    }).expect(200);
    expect(res.body.applied).toEqual([short.id]);
    expect(res.body.skipped[0]).toMatchObject({ id: long.id, code: 'VALIDATION_ERROR' });

    const repo = ctx.container.repos.transactions;
    const original = repo.delete.bind(repo);
    let calls = 0;
    const spy = jest.spyOn(repo, 'delete').mockImplementation((userId, id) => {
      if (++calls === 2) throw new Error('disk full');
      return original(userId, id);
    });
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await bulkDelete({ ids: [long.id, short.id] }).expect(500);
    spy.mockRestore();
    quiet.mockRestore();
    expect((await month()).transactions).toHaveLength(2);
  });

  it('works on the household data for a member', async () => {
    const partner = await createUser(ctx);
    const { code } = (
      await request(ctx.app).post('/api/household/invite').set(user.auth).expect(201)
    ).body as { code: string };
    await request(ctx.app).post('/api/household/join').set(partner.auth).send({ code }).expect(204);
    const shared = await add();
    const res = await bulkPatch({ ids: [shared.id], changes: { notes: 'del hogar' } }, partner);
    expect(res.body.applied).toEqual([shared.id]);
    expect((await month()).transactions[0].notes).toBe('del hogar');
  });
});
