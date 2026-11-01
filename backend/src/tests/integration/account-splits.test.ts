import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

interface AccountRow {
  id: string;
  name: string;
  balance: number;
  archived: boolean;
  isDefault: boolean;
}
interface Split {
  accountId: string;
  accountName?: string;
  amount: number;
}
interface TxRow {
  id: string;
  date: string;
  amount: number;
  accountId: string;
  accountName: string;
  splits: Split[];
  recurringRuleId: string | null;
}

/** A movement or an automatic operation split between several accounts (500 € + 300 €). */
describe('Movements split between accounts', () => {
  let ctx: TestContext;
  let user: TestUser;
  let main: AccountRow;
  let checking: AccountRow;
  let cash: AccountRow;

  const accounts = async (who = user) =>
    (await request(ctx.app).get('/api/accounts').set(who.auth).expect(200)).body as {
      accounts: AccountRow[];
      totalCents?: number;
      total: number;
    };
  const balances = async (who = user) =>
    Object.fromEntries((await accounts(who)).accounts.map((a) => [a.name, a.balance]));
  const createAccount = async (name: string, type = 'checking', who = user) => {
    const res = await request(ctx.app)
      .post('/api/accounts')
      .set(who.auth)
      .send({ name, type, initialBalance: 1000 })
      .expect(201);
    return (res.body as AccountRow[]).find((a) => a.name === name) as AccountRow;
  };

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
    main = (await accounts()).accounts.find((a) => a.isDefault) as AccountRow;
    checking = await createAccount('Corriente');
    cash = await createAccount('Efectivo', 'cash');
  });

  const split800 = () => [
    { accountId: checking.id, amount: 500 },
    { accountId: cash.id, amount: 300 },
  ];
  const post = (body: Record<string, unknown> = {}, who = user) =>
    request(ctx.app)
      .post('/api/transactions')
      .set(who.auth)
      .send({
        description: 'Cuenta común',
        amount: 800,
        type: 'EXPENSE',
        category: 'Hogar',
        date: '2026-03-10',
        ...body,
      });
  const patch = (id: string, body: Record<string, unknown>) =>
    request(ctx.app).patch(`/api/transactions/${id}`).set(user.auth).send(body);
  const month = async (period = '2026/3') =>
    (await request(ctx.app).get(`/api/months/${period}`).set(user.auth).expect(200)).body;

  describe('a movement', () => {
    it('counts once in the month and each part in its own account', async () => {
      const res = await post({ accountId: main.id, splits: split800() }).expect(201);
      expect(res.body).toMatchObject({
        amount: 800,
        // The movement is noted under its first part's account (the one sent is not used).
        accountId: checking.id,
        accountName: 'Corriente',
        splits: [
          { accountId: checking.id, accountName: 'Corriente', amount: 500 },
          { accountId: cash.id, accountName: 'Efectivo', amount: 300 },
        ],
      });
      expect(await balances()).toEqual({ Principal: 0, Corriente: 500, Efectivo: 700 });
      const overview = await month();
      expect(overview.summary.totalExpenses).toBe(800);
      expect(overview.summary.transactionCount).toBe(1);
      expect(overview.summary.expensesByCategory).toEqual({ Hogar: 800 });
      expect(overview.transactions[0].splits).toHaveLength(2);
      // The month's available money is the total of the accounts, as always.
      expect(overview.available).toBe(2000 - 800);
      expect((await accounts()).total).toBe(1200);
    });

    it('an income adds each part to its account; a movement in one account has no parts', async () => {
      await post({ type: 'INCOME', category: 'Salario', splits: split800() }).expect(201);
      const single = (await post({ amount: 10 }).expect(201)).body;
      expect(single.splits).toEqual([]);
      expect(await balances()).toEqual({ Principal: -10, Corriente: 1500, Efectivo: 1300 });
    });

    it('refuses parts that do not add up or are not right, with their own codes', async () => {
      const code = async (splits: unknown, extra: Record<string, unknown> = {}) =>
        (await post({ splits, ...extra }).expect(400)).body.code;
      expect(await code([{ accountId: cash.id, amount: 800 }])).toBe('SPLIT_TOO_FEW');
      expect(
        await code([
          { accountId: cash.id, amount: 400 },
          { accountId: cash.id, amount: 400 },
        ])
      ).toBe('SPLIT_DUPLICATE_ACCOUNT');
      const mismatch = await post({
        splits: [
          { accountId: checking.id, amount: 500 },
          { accountId: cash.id, amount: 200 },
        ],
      }).expect(400);
      expect(mismatch.body).toMatchObject({
        code: 'SPLIT_SUM_MISMATCH',
        details: { totalCents: 80000, splitCents: 70000 },
      });
      // A cent off is off too.
      expect(
        await code([
          { accountId: checking.id, amount: 500 },
          { accountId: cash.id, amount: 299.99 },
        ])
      ).toBe('SPLIT_SUM_MISMATCH');
      expect(
        await code([
          { accountId: checking.id, amount: 800 },
          { accountId: cash.id, amount: 0 },
        ])
      ).toBe('VALIDATION_ERROR');
      expect(await code([{ accountId: checking.id, amount: 1, extra: true }])).toBe(
        'VALIDATION_ERROR'
      );
      const eleven = Array.from({ length: 11 }, (_, i) => ({ accountId: `a${i}`, amount: 1 }));
      expect(
        (await post({ amount: 11, splits: eleven }).expect(404)).body.code // unknown accounts first
      ).toBe('ACCOUNT_NOT_FOUND');
      expect(await balances()).toEqual({ Principal: 0, Corriente: 1000, Efectivo: 1000 });
    });

    it('only splits between active accounts of the user', async () => {
      const other = await createUser(ctx);
      const theirs = (await accounts(other)).accounts[0];
      const res = await post({
        splits: [
          { accountId: checking.id, amount: 500 },
          { accountId: theirs.id, amount: 300 },
        ],
      }).expect(404);
      expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
      await request(ctx.app)
        .patch(`/api/accounts/${cash.id}`)
        .set(user.auth)
        .send({ archived: true })
        .expect(200);
      expect((await post({ splits: split800() }).expect(400)).body.code).toBe('ACCOUNT_ARCHIVED');
      expect((await balances(other)).Principal).toBe(0);
    });

    it('editing: the amount needs new parts, other changes keep them', async () => {
      const tx = (await post({ splits: split800() }).expect(201)).body as TxRow;
      expect((await patch(tx.id, { amount: 900 }).expect(400)).body.code).toBe(
        'SPLIT_SUM_MISMATCH'
      );
      // What an older app sends when editing the concept: the whole form, account included.
      const renamed = await patch(tx.id, {
        description: 'Aportación',
        amount: 800,
        accountId: checking.id,
      }).expect(200);
      expect(renamed.body.splits).toHaveLength(2);
      const resplit = await patch(tx.id, {
        amount: 900,
        splits: [
          { accountId: cash.id, amount: 600 },
          { accountId: checking.id, amount: 300 },
        ],
      }).expect(200);
      expect(resplit.body).toMatchObject({ accountId: cash.id, amount: 900 });
      expect(await balances()).toEqual({ Principal: 0, Corriente: 700, Efectivo: 400 });
    });

    it('editing: naming another account moves it whole; no parts leaves the first account', async () => {
      const tx = (await post({ splits: split800() }).expect(201)).body as TxRow;
      const moved = await patch(tx.id, { accountId: main.id }).expect(200);
      expect(moved.body).toMatchObject({ accountId: main.id, splits: [] });
      expect(await balances()).toEqual({ Principal: -800, Corriente: 1000, Efectivo: 1000 });

      const again = (await post({ splits: split800() }).expect(201)).body as TxRow;
      const joined = await patch(again.id, { splits: null }).expect(200);
      expect(joined.body).toMatchObject({ accountId: checking.id, splits: [] });
      const empty = (await post({ splits: split800() }).expect(201)).body as TxRow;
      expect((await patch(empty.id, { splits: [] }).expect(200)).body.splits).toEqual([]);
    });

    it('editing keeps a part whose account was archived since', async () => {
      const tx = (await post({ splits: split800() }).expect(201)).body as TxRow;
      await request(ctx.app)
        .patch(`/api/accounts/${cash.id}`)
        .set(user.auth)
        .send({ archived: true })
        .expect(200);
      const res = await patch(tx.id, { description: 'Otra', splits: split800() }).expect(200);
      expect(res.body.splits).toHaveLength(2);
      // New parts that keep that account are fine; a movement that did not have it cannot use it.
      expect(
        (
          await patch(tx.id, {
            splits: [
              { accountId: main.id, amount: 400 },
              { accountId: cash.id, amount: 400 },
            ],
          }).expect(200)
        ).body.splits
      ).toHaveLength(2);
      const other = (await post({ amount: 10 }).expect(201)).body as TxRow;
      expect(
        (
          await patch(other.id, {
            amount: 10,
            splits: [
              { accountId: main.id, amount: 5 },
              { accountId: cash.id, amount: 5 },
            ],
          }).expect(400)
        ).body.code
      ).toBe('ACCOUNT_ARCHIVED');
    });

    it('removing it gives each account its part back', async () => {
      const tx = (await post({ splits: split800() }).expect(201)).body as TxRow;
      await request(ctx.app).delete(`/api/transactions/${tx.id}`).set(user.auth).expect(204);
      expect(await balances()).toEqual({ Principal: 0, Corriente: 1000, Efectivo: 1000 });
      const tx2 = (await post({ splits: split800() }).expect(201)).body as TxRow;
      await request(ctx.app)
        .post('/api/transactions/bulk-delete')
        .set(user.auth)
        .send({ ids: [tx2.id] })
        .expect(200);
      expect(await balances()).toEqual({ Principal: 0, Corriente: 1000, Efectivo: 1000 });
    });

    it('moving many movements to an account moves the split ones whole', async () => {
      const tx = (await post({ splits: split800() }).expect(201)).body as TxRow;
      await request(ctx.app)
        .patch('/api/transactions/bulk')
        .set(user.auth)
        .send({ ids: [tx.id], changes: { accountId: checking.id } })
        .expect(200);
      expect(await balances()).toEqual({ Principal: 0, Corriente: 200, Efectivo: 1000 });
      const tx2 = (await post({ splits: split800() }).expect(201)).body as TxRow;
      // Another change keeps the parts.
      await request(ctx.app)
        .patch('/api/transactions/bulk')
        .set(user.auth)
        .send({ ids: [tx2.id], changes: { notes: 'Nota' } })
        .expect(200);
      expect(await balances()).toEqual({ Principal: 0, Corriente: -300, Efectivo: 700 });
    });

    it('a search by account finds it in every account it has a part in, by that part', async () => {
      await post({ splits: split800() }).expect(201);
      await post({ amount: 20, accountId: cash.id }).expect(201);
      await post({ amount: 5, type: 'INCOME', category: 'Salario', accountId: main.id }).expect(
        201
      );
      const search = async (accountId: string) =>
        (
          await request(ctx.app)
            .get(`/api/transactions/search?accountId=${accountId}`)
            .set(user.auth)
            .expect(200)
        ).body;
      const inCash = await search(cash.id);
      expect(inCash.total).toBe(2);
      expect(inCash.totals.expenses).toBe(320);
      // The movement is listed whole, with its parts.
      expect(inCash.items.map((t: TxRow) => t.amount).sort()).toEqual([20, 800]);
      const inChecking = await search(checking.id);
      expect(inChecking).toMatchObject({ total: 1, totals: { expenses: 500 } });
      expect((await search(main.id)).totals).toEqual({ income: 5, expenses: 0, saving: 0 });
      const all = (await request(ctx.app).get('/api/transactions/search').set(user.auth)).body;
      expect(all.totals.expenses).toBe(820);
    });

    it('an account with a part cannot be removed, only archived', async () => {
      await post({ splits: split800() }).expect(201);
      const res = await request(ctx.app)
        .delete(`/api/accounts/${cash.id}`)
        .set(user.auth)
        .expect(409);
      expect(res.body.code).toBe('ACCOUNT_IN_USE');
      await request(ctx.app)
        .patch(`/api/accounts/${cash.id}`)
        .set(user.auth)
        .send({ archived: true })
        .expect(200);
      // Archived, its part is still its own (and out of the total of the active accounts).
      expect((await balances()).Efectivo).toBe(700);
      expect((await accounts()).total).toBe(0 + 500);
    });

    it('keeps its parts when the month start day changes, and in the data export', async () => {
      await post({ splits: split800(), date: '2026-03-20' }).expect(201);
      await request(ctx.app)
        .patch('/api/settings')
        .set(user.auth)
        .send({ monthStartDay: 15 })
        .expect(200);
      const [moved] = (await request(ctx.app).get('/api/transactions/search').set(user.auth)).body
        .items as (TxRow & { month: number })[];
      expect(moved.splits).toHaveLength(2);
      expect(await balances()).toEqual({ Principal: 0, Corriente: 500, Efectivo: 700 });
      const exported = (await request(ctx.app).get('/api/export').set(user.auth)).body;
      expect(exported.transactions[0].splits).toEqual([
        { account: 'Corriente', amount: 500 },
        { account: 'Efectivo', amount: 300 },
      ]);
    });

    it('in a shared household the parts are in the household accounts', async () => {
      const owner = await createUser(ctx);
      const ownA = (await accounts(owner)).accounts[0];
      const ownB = await createAccount('Común', 'checking', owner);
      const { code } = (
        await request(ctx.app).post('/api/household/invite').set(owner.auth).expect(201)
      ).body;
      await request(ctx.app).post('/api/household/join').set(user.auth).send({ code }).expect(204);
      // The member's own accounts are not the household's.
      expect(
        (
          await post({
            splits: [
              { accountId: checking.id, amount: 500 },
              { accountId: ownB.id, amount: 300 },
            ],
          }).expect(404)
        ).body.code
      ).toBe('ACCOUNT_NOT_FOUND');
      await post({
        splits: [
          { accountId: ownA.id, amount: 500 },
          { accountId: ownB.id, amount: 300 },
        ],
      }).expect(201);
      expect(await balances(owner)).toEqual({ Principal: -500, Común: 700 });
    });
  });

  describe('an automatic operation', () => {
    const createRule = (body: Record<string, unknown> = {}) =>
      request(ctx.app)
        .post('/api/recurring-rules')
        .set(user.auth)
        .send({
          description: 'Cuenta común',
          amount: 800,
          type: 'EXPENSE',
          category: 'Hogar',
          startYear: 2026,
          startMonth: 1,
          ...body,
        });
    const patchRule = (id: string, body: Record<string, unknown>) =>
      request(ctx.app).patch(`/api/recurring-rules/${id}`).set(user.auth).send(body);
    const generated = async () =>
      (
        (
          await request(ctx.app)
            .get('/api/transactions/search?limit=200&sort=date_asc')
            .set(user.auth)
            .expect(200)
        ).body.items as TxRow[]
      ).filter((t) => t.recurringRuleId);
    const partsByDate = async () =>
      Object.fromEntries(
        (await generated()).map((t) => [
          t.date,
          t.splits.length
            ? t.splits.map((s) => `${s.accountName} ${s.amount}`).join(' + ')
            : t.accountName,
        ])
      );
    const archive = (id: string, archived = true) =>
      request(ctx.app).patch(`/api/accounts/${id}`).set(user.auth).send({ archived });

    it('generates every movement with the same parts', async () => {
      const rule = (await createRule({ splits: split800() }).expect(201)).body;
      expect(rule).toMatchObject({
        accountId: checking.id,
        splits: [
          { accountId: checking.id, amount: 500 },
          { accountId: cash.id, amount: 300 },
        ],
      });
      // January to April (today is in March; the next month is noted ahead).
      expect(Object.values(await partsByDate())).toEqual(
        new Array(4).fill('Corriente 500 + Efectivo 300')
      );
      expect(await balances()).toEqual({ Principal: 0, Corriente: -1000, Efectivo: -200 });
      const listed = (await request(ctx.app).get('/api/recurring-rules').set(user.auth)).body;
      expect(listed[0].splits).toHaveLength(2);
      expect(
        (await month()).summary.expensesByCategory // counted once, whole
      ).toEqual({ Hogar: 800 });
    });

    it('refuses parts that do not add up, also when only the amount changes', async () => {
      expect(
        (
          await createRule({
            splits: [
              { accountId: checking.id, amount: 500 },
              { accountId: cash.id, amount: 200 },
            ],
          }).expect(400)
        ).body.code
      ).toBe('SPLIT_SUM_MISMATCH');
      const rule = (await createRule({ splits: split800() }).expect(201)).body;
      expect((await patchRule(rule.id, { amount: 900 }).expect(400)).body.code).toBe(
        'SPLIT_SUM_MISMATCH'
      );
      // Pausing (what the card sends) keeps them.
      expect((await patchRule(rule.id, { active: false }).expect(200)).body.splits).toHaveLength(2);
    });

    it('changing only the parts applies from the next month', async () => {
      const rule = (await createRule({ splits: split800() }).expect(201)).body;
      await patchRule(rule.id, {
        splits: [
          { accountId: checking.id, amount: 400 },
          { accountId: cash.id, amount: 400 },
        ],
      }).expect(200);
      expect(await partsByDate()).toEqual({
        '2026-01-01': 'Corriente 500 + Efectivo 300',
        '2026-02-01': 'Corriente 500 + Efectivo 300',
        '2026-03-01': 'Corriente 500 + Efectivo 300',
        '2026-04-01': 'Corriente 400 + Efectivo 400',
      });
      // Back to one account: from the next month too.
      await patchRule(rule.id, { splits: null, accountId: main.id }).expect(200);
      expect((await partsByDate())['2026-04-01']).toBe('Principal');
      expect((await partsByDate())['2026-03-01']).toBe('Corriente 500 + Efectivo 300');
    });

    it('changing the amount with new parts redoes this month too', async () => {
      const rule = (await createRule({ splits: split800() }).expect(201)).body;
      await patchRule(rule.id, {
        amount: 1000,
        splits: [
          { accountId: checking.id, amount: 700 },
          { accountId: cash.id, amount: 300 },
        ],
      }).expect(200);
      const parts = await partsByDate();
      expect(parts['2026-02-01']).toBe('Corriente 500 + Efectivo 300');
      expect(parts['2026-03-01']).toBe('Corriente 700 + Efectivo 300');
      expect(parts['2026-04-01']).toBe('Corriente 700 + Efectivo 300');
    });

    it('splitting an operation in one account applies from the next month', async () => {
      const rule = (await createRule({ accountId: checking.id }).expect(201)).body;
      await patchRule(rule.id, { splits: split800() }).expect(200);
      const parts = await partsByDate();
      expect(parts['2026-03-01']).toBe('Corriente');
      expect(parts['2026-04-01']).toBe('Corriente 500 + Efectivo 300');
    });

    it('an account of its parts cannot be archived nor removed while it is active', async () => {
      const rule = (await createRule({ splits: split800(), startMonth: 7 }).expect(201)).body;
      const archived = await archive(cash.id).expect(409);
      expect(archived.body).toMatchObject({
        code: 'ACCOUNT_HAS_RECURRING',
        details: { rules: ['Cuenta común'] },
      });
      expect(
        (await request(ctx.app).delete(`/api/accounts/${cash.id}`).set(user.auth).expect(409)).body
          .code
      ).toBe('ACCOUNT_HAS_RECURRING');
      // Paused, the account can go: its part goes to the default account.
      await patchRule(rule.id, { active: false }).expect(200);
      await request(ctx.app).delete(`/api/accounts/${cash.id}`).set(user.auth).expect(204);
      const [listed] = (await request(ctx.app).get('/api/recurring-rules').set(user.auth)).body;
      expect(listed.splits).toEqual([
        { accountId: checking.id, amount: 500 },
        { accountId: main.id, amount: 300 },
      ]);
    });

    it('a removed part in the default account is put together with it', async () => {
      const rule = (
        await createRule({
          startMonth: 7,
          splits: [
            { accountId: main.id, amount: 500 },
            { accountId: cash.id, amount: 300 },
          ],
        }).expect(201)
      ).body;
      await patchRule(rule.id, { active: false }).expect(200);
      await request(ctx.app).delete(`/api/accounts/${cash.id}`).set(user.auth).expect(204);
      const [listed] = (await request(ctx.app).get('/api/recurring-rules').set(user.auth)).body;
      expect(listed).toMatchObject({ accountId: main.id, splits: [], amount: 800 });
    });

    it('a part in an account archived meanwhile goes to the default account from tomorrow', async () => {
      const rule = (await createRule({ splits: split800() }).expect(201)).body;
      // Old data: archived while the rule was active (it is blocked now).
      const repo = ctx.container.repos.accounts;
      repo.save(repo.findById(user.id, cash.id)!.update({ archived: true }));
      ctx.container.materializer.invalidate(user.id);
      await request(ctx.app).get('/api/months/2026/5').set(user.auth).expect(200);
      expect(await partsByDate()).toEqual({
        '2026-01-01': 'Corriente 500 + Efectivo 300',
        '2026-02-01': 'Corriente 500 + Efectivo 300',
        '2026-03-01': 'Corriente 500 + Efectivo 300',
        '2026-04-01': 'Corriente 500 + Principal 300',
        '2026-05-01': 'Corriente 500 + Principal 300',
      });
      // Both parts gone to the default one: a single account for the months generated next (the
      // ones already moved to the default account stay as they are).
      repo.save(repo.findById(user.id, checking.id)!.update({ archived: true }));
      ctx.container.materializer.invalidate(user.id);
      await request(ctx.app).get('/api/months/2026/6').set(user.auth).expect(200);
      const parts = await partsByDate();
      expect(parts['2026-05-01']).toBe('Corriente 500 + Principal 300');
      expect(parts['2026-06-01']).toBe('Principal');
      expect(rule.splits).toHaveLength(2);
    });

    it('a debt is paid from one account', async () => {
      const debt = await request(ctx.app)
        .post('/api/assets')
        .set(user.auth)
        .send({
          name: 'Préstamo',
          kind: 'debt',
          value: 5000,
          debtType: 'personal',
          payment: { amount: 300, day: 5, accountId: checking.id },
        })
        .expect(201);
      const ruleId = (await request(ctx.app).get('/api/recurring-rules').set(user.auth)).body[0]
        .id as string;
      const res = await patchRule(ruleId, {
        amount: 300,
        splits: [
          { accountId: checking.id, amount: 200 },
          { accountId: cash.id, amount: 100 },
        ],
      }).expect(400);
      expect(res.body.code).toBe('SPLIT_NOT_FOR_DEBT');
      // Saving the form without parts is fine.
      await patchRule(ruleId, { amount: 300, splits: null }).expect(200);
      expect(debt.body.id).toBeTruthy();
    });
  });
});
