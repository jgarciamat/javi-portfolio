import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

interface AccountRow {
  id: string;
  name: string;
  balance: number;
  archived: boolean;
  isDefault: boolean;
}
interface TxRow {
  date: string;
  accountId: string;
  accountName: string;
  recurringRuleId: string | null;
}

/** The account each automatic operation is noted in (the owner's «Cuenta» of the rule). */
describe('Recurring rules and their account', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
  });

  const accounts = async (who = user, query = '') =>
    (await request(ctx.app).get(`/api/accounts${query}`).set(who.auth).expect(200)).body as {
      accounts: AccountRow[];
      total: number;
    };
  const account = async (name: string, who = user) =>
    (await accounts(who)).accounts.find((a) => a.name === name) as AccountRow;
  const principal = async (who = user) =>
    (await accounts(who)).accounts.find((a) => a.isDefault) as AccountRow;

  const createAccount = async (name: string, type = 'crypto', who = user) => {
    await request(ctx.app)
      .post('/api/accounts')
      .set(who.auth)
      .send({ name, type, initialBalance: 1000 })
      .expect(201);
    return account(name, who);
  };

  const createRule = (body: Record<string, unknown> = {}, who = user) =>
    request(ctx.app)
      .post('/api/recurring-rules')
      .set(who.auth)
      .send({
        description: 'Alquiler',
        amount: 800,
        type: 'EXPENSE',
        category: 'Vivienda',
        startYear: 2026,
        startMonth: 1,
        ...body,
      });
  const patchRule = (id: string, body: Record<string, unknown>) =>
    request(ctx.app).patch(`/api/recurring-rules/${id}`).set(user.auth).send(body);

  const generated = async () => {
    const res = await request(ctx.app)
      .get('/api/transactions/search?limit=200&sort=date_asc')
      .set(user.auth)
      .expect(200);
    return (res.body.items as TxRow[]).filter((t) => t.recurringRuleId);
  };
  const byDate = async () =>
    Object.fromEntries((await generated()).map((t) => [t.date, t.accountName]));

  it('without an account the movements go to the default account, as before', async () => {
    const main = await principal();
    const rule = (await createRule().expect(201)).body;
    expect(rule.accountId).toBeNull();
    const items = await generated();
    expect(items).toHaveLength(4);
    expect(items.every((t) => t.accountId === main.id)).toBe(true);
  });

  it('notes the movements in the chosen account, whose balance and the total change', async () => {
    const main = await principal();
    const crypto = await createAccount('Cripto');
    const before = await accounts(user, '?year=2026&month=3');

    const rule = (await createRule({ accountId: crypto.id }).expect(201)).body;
    expect(rule.accountId).toBe(crypto.id);
    const items = await generated();
    expect(items.map((t) => t.accountName)).toEqual(['Cripto', 'Cripto', 'Cripto', 'Cripto']);

    // At the end of March: January, February and March are charged (April is later).
    const after = await accounts(user, '?year=2026&month=3');
    const balance = (list: typeof after, id: string) =>
      list.accounts.find((a) => a.id === id)?.balance;
    expect(balance(after, crypto.id)).toBe(1000 - 3 * 800);
    expect(balance(after, main.id)).toBe(balance(before, main.id));
    expect(after.total).toBe(before.total - 3 * 800);

    // An income adds to the account it names.
    await createRule({
      description: 'Staking',
      amount: 50,
      type: 'INCOME',
      category: 'Otros',
      startMonth: 3,
      accountId: crypto.id,
    }).expect(201);
    const withIncome = await accounts(user, '?year=2026&month=3');
    expect(balance(withIncome, crypto.id)).toBe(1000 - 3 * 800 + 50);
    expect(withIncome.total).toBe(before.total - 3 * 800 + 50);
  });

  it('refuses accounts of someone else or archived, on create and on edit', async () => {
    const stranger = await createUser(ctx);
    const theirs = await createAccount('Suya', 'checking', stranger);
    const old = await createAccount('Vieja');
    await request(ctx.app)
      .patch(`/api/accounts/${old.id}`)
      .set(user.auth)
      .send({ archived: true })
      .expect(200);

    expect((await createRule({ accountId: theirs.id }).expect(404)).body.code).toBe(
      'ACCOUNT_NOT_FOUND'
    );
    expect((await createRule({ accountId: old.id }).expect(400)).body.code).toBe(
      'ACCOUNT_ARCHIVED'
    );
    await createRule({ accountId: 'no-such-account' }).expect(404);

    const rule = (await createRule().expect(201)).body;
    expect((await patchRule(rule.id, { accountId: theirs.id }).expect(404)).body.code).toBe(
      'ACCOUNT_NOT_FOUND'
    );
    expect((await patchRule(rule.id, { accountId: old.id }).expect(400)).body.code).toBe(
      'ACCOUNT_ARCHIVED'
    );
    // Nothing of the stranger's moved.
    expect((await account('Suya', stranger)).balance).toBe(1000);
  });

  it('changing the account moves this and the coming months only; the past stays', async () => {
    const crypto = await createAccount('Cripto');
    const savings = await createAccount('Ahorro', 'savings');
    const rule = (await createRule({ accountId: crypto.id }).expect(201)).body;

    const res = await patchRule(rule.id, { accountId: savings.id }).expect(200);
    expect(res.body.accountId).toBe(savings.id);
    expect(await byDate()).toEqual({
      '2026-01-01': 'Cripto',
      '2026-02-01': 'Cripto',
      '2026-03-01': 'Ahorro',
      '2026-04-01': 'Ahorro',
    });

    // Back to «the default account» (null).
    const reset = await patchRule(rule.id, { accountId: null }).expect(200);
    expect(reset.body.accountId).toBeNull();
    expect((await byDate())['2026-04-01']).toBe((await principal()).name);
  });

  const archive = (id: string, archived = true, who = user) =>
    request(ctx.app).patch(`/api/accounts/${id}`).set(who.auth).send({ archived });

  it('an account used by active rules cannot be archived nor deleted; paused ones do not block', async () => {
    const crypto = await createAccount('Cripto');
    const rule = (await createRule({ accountId: crypto.id }).expect(201)).body;
    await createRule({ description: 'Gimnasio', amount: 30, accountId: crypto.id }).expect(201);

    const refused = await archive(crypto.id).expect(409);
    expect(refused.body).toMatchObject({
      code: 'ACCOUNT_HAS_RECURRING',
      details: { rules: expect.arrayContaining(['Alquiler', 'Gimnasio']) },
    });
    expect(refused.body.error).toMatch(/Alquiler|Gimnasio/);
    expect(refused.body.error).toContain('Cambia su cuenta o páusalas');
    const deleting = await request(ctx.app)
      .delete(`/api/accounts/${crypto.id}`)
      .set(user.auth)
      .expect(409);
    expect(deleting.body.code).toBe('ACCOUNT_HAS_RECURRING');
    expect((await account('Cripto')).archived).toBe(false);

    // Moved to another account or paused, they no longer block.
    await patchRule(rule.id, { accountId: null }).expect(200);
    const gym = (await request(ctx.app).get('/api/recurring-rules').set(user.auth)).body.find(
      (r: { description: string }) => r.description === 'Gimnasio'
    );
    await patchRule(gym.id, { active: false }).expect(200);
    await archive(crypto.id).expect(200);
    // Archiving again (already archived) or unarchiving never asks.
    await archive(crypto.id).expect(200);
    await archive(crypto.id, false).expect(200);
  });

  it('an active rule on an account archived some other way: its coming movements go to the default one', async () => {
    const crypto = await createAccount('Cripto');
    const rule = (await createRule({ accountId: crypto.id }).expect(201)).body;
    await request(ctx.app).get('/api/months/2026/6').set(user.auth).expect(200);
    // Archived before this was blocked (old data): straight in the database.
    const repo = ctx.container.repos.accounts;
    const stored = repo.findById(user.id, crypto.id)!;
    repo.save(stored.update({ archived: true }));
    ctx.container.materializer.invalidate(user.id);

    await request(ctx.app).get('/api/months/2026/3').set(user.auth).expect(200);
    const main = (await principal()).name;
    const moved = {
      '2026-01-01': 'Cripto',
      '2026-02-01': 'Cripto',
      // Today is 15 March: the charge of this month already happened and stays.
      '2026-03-01': 'Cripto',
      '2026-04-01': main,
      '2026-05-01': main,
      '2026-06-01': main,
    };
    expect(await byDate()).toEqual(moved);
    // Idempotent.
    ctx.container.materializer.invalidate(user.id);
    await request(ctx.app).get('/api/months/2026/3').set(user.auth).expect(200);
    expect(await byDate()).toEqual(moved);

    // The rule keeps its account: editing something else with it does not fail.
    const edited = await patchRule(rule.id, { accountId: crypto.id, description: 'Piso' }).expect(
      200
    );
    expect(edited.body).toMatchObject({ accountId: crypto.id, description: 'Piso' });
    expect((await byDate())['2026-04-01']).toBe(main);

    // Unarchived: what was moved stays where it is; months generated later use it again.
    repo.save(repo.findById(user.id, crypto.id)!.update({ archived: false }));
    ctx.container.materializer.invalidate(user.id);
    await request(ctx.app).get('/api/months/2026/7').set(user.auth).expect(200);
    expect(await byDate()).toMatchObject({ '2026-04-01': main, '2026-07-01': 'Cripto' });
  });

  it('a deleted account leaves the rule on the default account', async () => {
    const crypto = await createAccount('Cripto');
    // Starts later and paused: nothing is noted yet, so the account can still be deleted.
    const rule = (await createRule({ accountId: crypto.id, startMonth: 7 }).expect(201)).body;
    await request(ctx.app).delete(`/api/accounts/${crypto.id}`).set(user.auth).expect(409);
    await patchRule(rule.id, { active: false }).expect(200);
    expect(await generated()).toHaveLength(0);
    await request(ctx.app).delete(`/api/accounts/${crypto.id}`).set(user.auth).expect(204);

    const [listed] = (await request(ctx.app).get('/api/recurring-rules').set(user.auth)).body;
    expect(listed).toMatchObject({ id: rule.id, accountId: null });
    await patchRule(rule.id, { active: true }).expect(200);
    await request(ctx.app).get('/api/months/2026/7').set(user.auth).expect(200);
    expect(await byDate()).toEqual({ '2026-07-01': (await principal()).name });
  });

  it('in a shared household the accounts are the household ones', async () => {
    const owner = await createUser(ctx);
    const own = await createAccount('Mía', 'checking', user);
    const shared = await createAccount('Cripto común', 'crypto', owner);
    const { code } = (
      await request(ctx.app).post('/api/household/invite').set(owner.auth).expect(201)
    ).body;
    await request(ctx.app).post('/api/household/join').set(user.auth).send({ code }).expect(204);

    expect((await createRule({ accountId: own.id }).expect(404)).body.code).toBe(
      'ACCOUNT_NOT_FOUND'
    );
    await createRule({ accountId: shared.id }).expect(201);
    expect((await account('Cripto común', owner)).balance).toBe(1000 - 4 * 800);
    // Neither of the two can archive it while the rule is active.
    expect((await archive(shared.id, true, owner).expect(409)).body.code).toBe(
      'ACCOUNT_HAS_RECURRING'
    );
    await archive(shared.id).expect(409);
  });
});
