import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser, expireTrial } from '../helpers/testApp';

interface Payment {
  ruleId: string;
  amount: number;
  day: number;
  accountId: string | null;
  active: boolean;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  lastInstalmentYear: number | null;
  lastInstalmentMonth: number | null;
  nextDate: string | null;
  remainingPayments: number | null;
  paid: number;
  coversInterest: boolean;
}
interface AssetBody {
  id: string;
  name: string;
  kind: string;
  debtType: string | null;
  initialValue: number | null;
  value: number;
  valueDate: string | null;
  previousValue: number | null;
  history: { date: string; value: number }[];
  payment: Payment | null;
  paidOff: boolean;
}
interface RuleBody {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  accountId: string | null;
  day: number | null;
  active: boolean;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  debt: { id: string; name: string } | null;
}
interface TxRow {
  id: string;
  date: string;
  amount: number;
  type: string;
  category: string;
  accountId: string;
  recurringRuleId: string | null;
}

/** A debt paid every month by an automatic operation (README, «Deudas que se pagan solas»). */
describe('Debts paid every month', () => {
  let ctx: TestContext;
  let user: TestUser;
  let bank: { id: string; balance: number };

  const api = (who = user) => ({
    get: (path: string) => request(ctx.app).get(`/api${path}`).set(who.auth),
    post: (path: string, body: object) =>
      request(ctx.app).post(`/api${path}`).set(who.auth).send(body),
    patch: (path: string, body: object) =>
      request(ctx.app).patch(`/api${path}`).set(who.auth).send(body),
    del: (path: string) => request(ctx.app).delete(`/api${path}`).set(who.auth),
  });
  const accountsOf = async (who = user) =>
    (await api(who).get('/accounts').expect(200)).body as {
      accounts: { id: string; name: string; balance: number; isDefault: boolean }[];
      total: number;
    };
  /** Balance at the end of the current month (later payments are already generated). */
  const balanceOf = async (id: string, who = user) => {
    const now = ctx.clock.now();
    const query = `?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`;
    const list = (await api(who).get(`/accounts${query}`).expect(200)).body as {
      accounts: { id: string; balance: number }[];
    };
    return list.accounts.find((a) => a.id === id)!.balance;
  };
  const assets = async (who = user) =>
    (await api(who).get('/assets').expect(200)).body as AssetBody[];
  const asset = async (id: string, who = user) => (await assets(who)).find((a) => a.id === id)!;
  const rules = async (who = user) =>
    (await api(who).get('/recurring-rules').expect(200)).body as RuleBody[];
  const payments = async (who = user) =>
    (
      (await api(who).get('/transactions/search?limit=200&sort=date_asc').expect(200)).body
        .items as TxRow[]
    ).filter((t) => t.recurringRuleId);
  const netWorth = async (months = 6) =>
    (await api().get(`/stats/net-worth?months=${months}`).expect(200)).body as {
      year: number;
      month: number;
      debts: number;
    }[];
  const at = (iso: string) => ctx.clock.set(`${iso}T12:00:00Z`);
  const newAccount = async (name: string, type = 'checking', who = user, initialBalance = 0) => {
    await api(who).post('/accounts', { name, type, initialBalance }).expect(201);
    return (await accountsOf(who)).accounts.find((a) => a.name === name)!;
  };

  const mortgage = (payment: object = {}, extra: object = {}) =>
    api().post('/assets', {
      name: 'Hipoteca',
      kind: 'debt',
      debtType: 'mortgage',
      value: 1000,
      initialValue: 5000,
      payment: { amount: 300, day: 20, accountId: bank.id, ...payment },
      ...extra,
    });

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
    // Premium for the whole test (the net worth needs it; the clock moves months ahead).
    const sub = ctx.container.repos.subscriptions.get(user.id)!;
    ctx.container.repos.subscriptions.save({ ...sub, trialEndsAt: '2030-01-01T00:00:00.000Z' });
    bank = await newAccount('Cripto', 'crypto', user, 2000);
  });

  it('creates the automatic operation from the chosen account and lowers what is owed', async () => {
    const created = (await mortgage().expect(201)).body as AssetBody;
    expect(created).toMatchObject({
      kind: 'debt',
      debtType: 'mortgage',
      initialValue: 5000,
      value: 1000,
      paidOff: false,
      payment: {
        amount: 300,
        day: 20,
        accountId: bank.id,
        active: true,
        startYear: 2026,
        startMonth: 3,
        // 300 + 300 + 300 + 100: the operation ends with the last payment needed.
        endYear: 2026,
        endMonth: 6,
        nextDate: '2026-03-20',
        remainingPayments: 4,
        paid: 0,
        coversInterest: true,
      },
    });
    const [rule] = await rules();
    expect(rule).toMatchObject({
      description: 'Cuota Hipoteca',
      type: 'EXPENSE',
      category: 'Vivienda',
      accountId: bank.id,
      day: 20,
      frequency: 'monthly',
      debt: { id: created.id, name: 'Hipoteca' },
    });
    // This month's and next month's payments exist already, on the payment day and account.
    expect((await payments()).map((t) => [t.date, t.amount, t.accountId])).toEqual([
      ['2026-03-20', 300, bank.id],
      ['2026-04-20', 300, bank.id],
    ]);
    expect(await balanceOf(bank.id)).toBe(2000 - 300);

    // The day after the payment the debt owes 300 less; the history shows each step.
    at('2026-03-21');
    expect(await asset(created.id)).toMatchObject({
      value: 700,
      previousValue: 1000,
      valueDate: '2026-03-20',
      history: [
        { date: '2026-03-15', value: 1000 },
        { date: '2026-03-20', value: 700 },
      ],
      payment: { nextDate: '2026-04-20', remainingPayments: 3, paid: 300 },
    });

    // The last payment is only what is left, and then it stops by itself.
    at('2026-07-01');
    const paid = await asset(created.id);
    expect(paid).toMatchObject({ value: 0, paidOff: true });
    expect(paid.payment).toMatchObject({ nextDate: null, remainingPayments: 0, paid: 1000 });
    await api().get('/months/2027/2').expect(200);
    expect((await payments()).map((t) => [t.date, t.amount])).toEqual([
      ['2026-03-20', 300],
      ['2026-04-20', 300],
      ['2026-05-20', 300],
      ['2026-06-20', 100],
    ]);
    expect(await balanceOf(bank.id)).toBe(1000);
  });

  it('net worth month by month follows what was owed each month', async () => {
    await mortgage().expect(201);
    at('2026-06-01');
    const points = await netWorth(4);
    expect(points.map((p) => [p.month, p.debts])).toEqual([
      [3, 700],
      [4, 400],
      [5, 100],
      [6, 0],
    ]);
  });

  it('is idempotent: generating again never pays twice', async () => {
    const created = (await mortgage().expect(201)).body as AssetBody;
    at('2026-05-25');
    for (let i = 0; i < 3; i++) {
      await api().get('/months/2026/5').expect(200);
      await api().get('/months/2026/6').expect(200);
      await assets();
    }
    expect((await asset(created.id)).value).toBe(100);
    expect(await payments()).toHaveLength(4);
  });

  it('splits each payment into interest and principal when the debt has a rate', async () => {
    // 12 % a year: 1 % of what is owed each month goes to interest.
    const created = (await mortgage({ amount: 510 }, { interestRate: 12 }).expect(201))
      .body as AssetBody;
    expect(created.payment).toMatchObject({ remainingPayments: 2, endMonth: 4 });
    at('2026-03-21');
    expect((await asset(created.id)).value).toBe(500); // 1000 + 10 − 510
    at('2026-04-21');
    const paid = await asset(created.id);
    expect(paid).toMatchObject({ value: 0, paidOff: true });
    // The last payment was what was left plus its interest.
    expect((await payments()).map((t) => t.amount)).toEqual([510, 505]);
  });

  it('warns when the payment does not cover the interest and keeps it open', async () => {
    const created = (await mortgage({ amount: 5 }, { interestRate: 12 }).expect(201))
      .body as AssetBody;
    expect(created.payment).toMatchObject({
      coversInterest: false,
      remainingPayments: null,
      endYear: null,
      nextDate: '2026-03-20',
    });
  });

  it('a payment bigger than what is owed pays it off at once', async () => {
    const created = (await mortgage({ amount: 5000 }).expect(201)).body as AssetBody;
    expect(created.payment).toMatchObject({ remainingPayments: 1, endMonth: 3 });
    expect((await payments()).map((t) => t.amount)).toEqual([1000]);
  });

  it('never creates payments for days already gone: the first one is the next to come', async () => {
    const created = (await mortgage({ day: 10, startYear: 2025, startMonth: 1 }).expect(201))
      .body as AssetBody;
    expect(created.payment).toMatchObject({
      startYear: 2026,
      startMonth: 4,
      nextDate: '2026-04-10',
    });
    expect((await payments()).map((t) => t.date)).toEqual(['2026-04-10']);
    // A later first month is kept, and the day falls back to the month's last day.
    const later = (
      await api()
        .post('/assets', {
          name: 'Coche',
          kind: 'debt',
          debtType: 'car',
          value: 600,
          payment: { amount: 100, day: 31, accountId: bank.id, startYear: 2026, startMonth: 9 },
        })
        .expect(201)
    ).body as AssetBody;
    expect(later.payment).toMatchObject({ startMonth: 9, nextDate: '2026-09-30' });
    expect((await rules()).find((r) => r.debt?.name === 'Coche')!.category).toBe('Deudas');
  });

  it('respects the instalments left', async () => {
    const created = (await mortgage({ instalments: 2 }).expect(201)).body as AssetBody;
    expect(created.payment).toMatchObject({
      lastInstalmentYear: 2026,
      lastInstalmentMonth: 4,
      endMonth: 4,
      remainingPayments: 2,
    });
    at('2026-06-01');
    await api().get('/months/2026/7').expect(200);
    expect((await asset(created.id)).value).toBe(400);
    expect(await payments()).toHaveLength(2);
    expect((await asset(created.id)).payment).toMatchObject({
      nextDate: null,
      remainingPayments: 0,
    });
  });

  it('a value written by hand is the new starting point; future payments follow it', async () => {
    const created = (await mortgage().expect(201)).body as AssetBody;
    at('2026-03-25');
    // The bank says it is 900 now (interest, fees…): the payments go on from there.
    const updated = (await api().post(`/assets/${created.id}/values`, { value: 900 }).expect(200))
      .body as AssetBody;
    expect(updated).toMatchObject({
      value: 900,
      payment: { remainingPayments: 3, endMonth: 6, nextDate: '2026-04-20' },
    });
    // Past months are not rewritten.
    expect(updated.history).toEqual([
      { date: '2026-03-15', value: 1000 },
      { date: '2026-03-20', value: 700 },
      { date: '2026-03-25', value: 900 },
    ]);
    at('2026-06-21');
    await api().get('/months/2026/7').expect(200);
    expect((await payments()).map((t) => t.amount)).toEqual([300, 300, 300, 300]);
    expect((await asset(created.id)).value).toBe(0);
  });

  it('a debt paid off and raised again by hand starts paying again', async () => {
    const created = (await mortgage({ amount: 5000 }).expect(201)).body as AssetBody;
    at('2026-04-01');
    expect((await asset(created.id)).paidOff).toBe(true);
    const raised = (await api().post(`/assets/${created.id}/values`, { value: 200 }).expect(200))
      .body as AssetBody;
    expect(raised).toMatchObject({
      paidOff: false,
      payment: { endMonth: 4, nextDate: '2026-04-20' },
    });
    expect((await payments()).map((t) => [t.date, t.amount])).toEqual([
      ['2026-03-20', 1000],
      ['2026-04-20', 200],
    ]);
  });

  it('editing amount, day or account applies to the payments to come only', async () => {
    const other = await newAccount('Nómina');
    const created = (await mortgage().expect(201)).body as AssetBody;
    at('2026-03-21');
    const changed = (
      await api()
        .patch(`/assets/${created.id}/debt`, {
          payment: { amount: 350, day: 5, accountId: other.id },
          initialValue: null,
          interestRate: null,
          debtType: 'personal',
        })
        .expect(200)
    ).body as AssetBody;
    expect(changed).toMatchObject({
      debtType: 'personal',
      initialValue: null,
      payment: { amount: 350, day: 5, accountId: other.id, nextDate: '2026-04-05' },
    });
    expect((await payments()).map((t) => [t.date, t.amount, t.accountId])).toEqual([
      ['2026-03-20', 300, bank.id],
      ['2026-04-05', 350, other.id],
    ]);
    const [rule] = await rules();
    expect(rule).toMatchObject({ amount: 350, day: 5, accountId: other.id, startMonth: 3 });
    // A new first month and the instalments left are counted from the next payment.
    const moved = (
      await api()
        .patch(`/assets/${created.id}/debt`, {
          payment: { amount: 100, day: 5, startYear: 2026, startMonth: 6, instalments: 2 },
        })
        .expect(200)
    ).body as AssetBody;
    expect(moved.payment).toMatchObject({
      accountId: other.id,
      startMonth: 6,
      nextDate: '2026-06-05',
      lastInstalmentMonth: 7,
      endMonth: 7,
    });
    // Leaving the instalments out keeps them; only changing the rate keeps everything else.
    const same = (
      await api()
        .patch(`/assets/${created.id}/debt`, { payment: { amount: 100, day: 5 } })
        .expect(200)
    ).body as AssetBody;
    expect(same.payment).toMatchObject({ lastInstalmentMonth: 7, startMonth: 6 });
    const rated = (await api().patch(`/assets/${created.id}/debt`, { interestRate: 6 }).expect(200))
      .body as AssetBody;
    expect(rated).toMatchObject({ interestRate: 6, debtType: 'personal' });
    const cleared = (
      await api()
        .patch(`/assets/${created.id}/debt`, {
          payment: { amount: 100, day: 5, instalments: null },
        })
        .expect(200)
    ).body as AssetBody;
    expect(cleared.payment).toMatchObject({ lastInstalmentMonth: null });
  });

  it('adds or stops the monthly payment of an existing debt', async () => {
    const debt = (
      await api().post('/assets', { name: 'Préstamo', kind: 'debt', value: 900 }).expect(201)
    ).body as AssetBody;
    expect(debt).toMatchObject({ debtType: 'other', payment: null, paidOff: false });
    // Without a payment nothing happens to it.
    expect(
      (await api().patch(`/assets/${debt.id}/debt`, { payment: null }).expect(200)).body.payment
    ).toBeNull();
    const paying = (
      await api()
        .patch(`/assets/${debt.id}/debt`, { payment: { amount: 300, day: 20 } })
        .expect(200)
    ).body as AssetBody;
    const main = (await accountsOf()).accounts.find((a) => a.isDefault)!;
    expect(paying.payment).toMatchObject({ accountId: main.id, nextDate: '2026-03-20' });
    expect((await rules())[0]).toMatchObject({ category: 'Deudas', description: 'Cuota Préstamo' });

    at('2026-04-25');
    await api().get('/months/2026/5').expect(200);
    expect((await asset(debt.id)).value).toBe(300);
    const stopped = (await api().patch(`/assets/${debt.id}/debt`, { payment: null }).expect(200))
      .body as AssetBody;
    // It keeps what it owes and its history; past payments stay as movements, coming ones go.
    expect(stopped).toMatchObject({ payment: null, paidOff: false, value: 300 });
    expect(stopped.history.map((h) => [h.date, h.value])).toEqual([
      ['2026-03-15', 900],
      ['2026-03-20', 600],
      ['2026-04-20', 300],
    ]);
    expect(await rules()).toEqual([]);
    expect((await payments()).map((t) => t.date)).toEqual([]);
    const kept = (
      (await api().get('/transactions/search?limit=200&sort=date_asc').expect(200)).body
        .items as TxRow[]
    ).map((t) => [t.date, t.amount]);
    expect(kept).toEqual([
      ['2026-03-20', 300],
      ['2026-04-20', 300],
    ]);
    const points = await netWorth(2);
    expect(points.map((p) => p.debts)).toEqual([600, 300]);
  });

  it('pausing it from the automatic operations keeps the debt; resuming skips the paused months', async () => {
    const created = (await mortgage({ amount: 100 }).expect(201)).body as AssetBody;
    const [rule] = await rules();
    at('2026-03-21');
    const paused = (await api().patch(`/recurring-rules/${rule.id}`, { active: false }).expect(200))
      .body as RuleBody;
    expect(paused).toMatchObject({ active: false, debt: { name: 'Hipoteca' } });
    // The March payment was made and stays; April's is not coming any more.
    expect((await payments()).map((t) => t.date)).toEqual(['2026-03-20']);
    expect((await asset(created.id)).payment).toMatchObject({ active: false, nextDate: null });

    at('2026-06-10');
    const resumed = (await api().patch(`/recurring-rules/${rule.id}`, { active: true }).expect(200))
      .body as RuleBody;
    expect(resumed).toMatchObject({ active: true, startYear: 2026, startMonth: 6 });
    expect((await payments()).map((t) => t.date)).toEqual([
      '2026-03-20',
      '2026-06-20',
      '2026-07-20',
    ]);
    expect((await asset(created.id)).value).toBe(900);
  });

  it('the type and dates of its operation are the debt’s; the rest can change there', async () => {
    const created = (await mortgage().expect(201)).body as AssetBody;
    const [rule] = await rules();
    const edited = (
      await api()
        .patch(`/recurring-rules/${rule.id}`, {
          description: 'Banco hipoteca',
          amount: 500,
          type: 'INCOME',
          frequency: 'yearly',
          startYear: 2020,
          startMonth: 1,
          endYear: 2030,
          endMonth: 1,
          category: 'Otros',
        })
        .expect(200)
    ).body as RuleBody;
    expect(edited).toMatchObject({
      description: 'Banco hipoteca',
      amount: 500,
      type: 'EXPENSE',
      category: 'Otros',
      startYear: 2026,
      startMonth: 3,
      endYear: 2026,
      endMonth: 4,
    });
    expect((await asset(created.id)).payment).toMatchObject({ amount: 500, remainingPayments: 2 });
  });

  it('removing its operation leaves the debt as it was, valued by hand', async () => {
    const created = (await mortgage().expect(201)).body as AssetBody;
    const [rule] = await rules();
    at('2026-04-21');
    await api().get('/months/2026/5').expect(200);
    await api().del(`/recurring-rules/${rule.id}?scope=from_current`).expect(204);
    const left = await asset(created.id);
    expect(left).toMatchObject({ value: 400, payment: null });
    expect(left.history.map((h) => h.value)).toEqual([1000, 700, 400]);
    expect(await payments()).toEqual([]);
  });

  it('removing the operation with all its movements takes their payments back', async () => {
    const created = (await mortgage().expect(201)).body as AssetBody;
    const [rule] = await rules();
    at('2026-04-21');
    await api().del(`/recurring-rules/${rule.id}?scope=all`).expect(204);
    expect((await asset(created.id)).value).toBe(1000);
  });

  it('removing the debt removes its operation and the payments to come, never the past ones', async () => {
    const created = (await mortgage().expect(201)).body as AssetBody;
    at('2026-03-21');
    await api().del(`/assets/${created.id}`).expect(204);
    expect(await rules()).toEqual([]);
    expect(await assets()).toEqual([]);
    const left = (
      (await api().get('/transactions/search?limit=200&sort=date_asc').expect(200)).body
        .items as TxRow[]
    ).map((t) => [t.date, t.recurringRuleId]);
    expect(left).toEqual([['2026-03-20', null]]);
    expect(await balanceOf(bank.id)).toBe(1700);
  });

  it('a deleted payment does not count, and an edited one counts as edited', async () => {
    const created = (await mortgage().expect(201)).body as AssetBody;
    at('2026-04-25');
    const [march, april] = await payments();
    await api().patch(`/transactions/${march.id}`, { amount: 250 }).expect(200);
    await api().del(`/transactions/${april.id}`).expect(204);
    expect((await asset(created.id)).value).toBe(750);
    // The removed month is not generated again.
    await api().get('/months/2026/4').expect(200);
    expect((await asset(created.id)).value).toBe(750);
  });

  it('validates the debt and its payment', async () => {
    const bad = (body: object) =>
      api().post('/assets', { name: 'X', kind: 'debt', value: 10, ...body });
    await bad({ payment: { amount: 0, day: 5 } }).expect(400);
    await bad({ payment: { amount: 10, day: 0 } }).expect(400);
    await bad({ payment: { amount: 10, day: 32 } }).expect(400);
    await bad({ payment: { amount: 10, day: 5.5 } }).expect(400);
    await bad({ payment: { amount: 10, day: 5, instalments: 0 } }).expect(400);
    await bad({ debtType: 'casino' }).expect(400);
    await bad({ initialValue: -1 }).expect(400);
    expect(
      (await bad({ payment: { amount: 10, day: 5, accountId: 'nope' } }).expect(404)).body.code
    ).toBe('ACCOUNT_NOT_FOUND');
    // Investments and goods have no debt data and no payment.
    const fund = (
      await api()
        .post('/assets', {
          name: 'Fondo',
          kind: 'investment',
          value: 10,
          debtType: 'mortgage',
          initialValue: 5,
          payment: { amount: 10, day: 5 },
        })
        .expect(201)
    ).body as AssetBody;
    expect(fund).toMatchObject({ debtType: null, initialValue: null, payment: null });
    expect(await rules()).toEqual([]);
    await api().patch(`/assets/${fund.id}/debt`, { interestRate: 3 }).expect(400);
    await api().patch('/assets/nope/debt', { interestRate: 3 }).expect(404);
    expect(await assets()).toHaveLength(1);
  });

  it('an archived account cannot be chosen; another user’s neither', async () => {
    const other = await createUser(ctx);
    const theirs = await newAccount('Suya', 'checking', other);
    expect((await mortgage({ accountId: theirs.id }).expect(404)).body.code).toBe(
      'ACCOUNT_NOT_FOUND'
    );
    const spare = await newAccount('Vieja', 'savings');
    await api().patch(`/accounts/${spare.id}`, { archived: true }).expect(200);
    expect((await mortgage({ accountId: spare.id }).expect(400)).body.code).toBe(
      'ACCOUNT_ARCHIVED'
    );
    expect(await assets()).toEqual([]);
    // Nobody else sees or changes the debt.
    const created = (await mortgage().expect(201)).body as AssetBody;
    await api(other).patch(`/assets/${created.id}/debt`, { payment: null }).expect(404);
    await api(other).post(`/assets/${created.id}/values`, { value: 1 }).expect(404);
    await api(other).del(`/assets/${created.id}`).expect(404);
    expect(await api(other).get('/assets').expect(200)).toHaveProperty('body', []);
  });

  it('the free plan limit of automatic operations applies to monthly payments', async () => {
    expireTrial(ctx, user);
    for (let i = 0; i < 5; i++) {
      await api()
        .post('/recurring-rules', {
          description: `Regla ${i}`,
          amount: 1,
          type: 'EXPENSE',
          category: 'Otros',
          startYear: 2026,
          startMonth: 3,
        })
        .expect(201);
    }
    expect((await mortgage().expect(402)).body.code).toBe('PLAN_LIMIT');
    const debt = (
      await api().post('/assets', { name: 'Deuda', kind: 'debt', value: 100 }).expect(201)
    ).body as AssetBody;
    expect(
      (
        await api()
          .patch(`/assets/${debt.id}/debt`, { payment: { amount: 1, day: 1 } })
          .expect(402)
      ).body.code
    ).toBe('PLAN_LIMIT');
    expect(await assets()).toHaveLength(1);
  });

  it('in a shared household it pays from a household account', async () => {
    const owner = await createUser(ctx);
    const shared = await newAccount('Común', 'checking', owner, 500);
    const { code } = (await api(owner).post('/household/invite', {}).expect(201)).body;
    await api().post('/household/join', { code }).expect(204);
    await mortgage({ accountId: shared.id }).expect(201);
    expect(await balanceOf(shared.id, owner)).toBe(200);
    expect((await rules(owner))[0].debt).toMatchObject({ name: 'Hipoteca' });
  });

  it('names the payments in English for English users', async () => {
    await api().patch('/settings', { locale: 'en' }).expect(200);
    await mortgage().expect(201);
    expect((await rules())[0].description).toBe('Hipoteca payment');
  });

  it('old debts become «other» debts and keep working', async () => {
    const debt = (
      await api().post('/assets', { name: 'Vieja', kind: 'debt', value: 50 }).expect(201)
    ).body as AssetBody;
    const flat = (
      await api().post('/assets', { name: 'Piso', kind: 'property', value: 50 }).expect(201)
    ).body as AssetBody;
    expect(debt.debtType).toBe('other');
    expect(flat.debtType).toBeNull();
  });
});
