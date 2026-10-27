import request from 'supertest';
import { DataVersions } from '@domain/ports/services';
import { StatsService } from '@application/insights/InsightsServices';
import { MoneyLeakService } from '@application/insights/MoneyLeakService';
import {
  presentForecast,
  presentMoneyLeaks,
  presentSubscriptions,
} from '@infrastructure/http/presenters';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

/** Never keeps anything: the statistics worked out from scratch, as before the cache. */
const noCache: DataVersions = { of: () => null };

describe('Statistics kept until the data changes (A03)', () => {
  let ctx: TestContext;
  let user: TestUser;
  let reference: { stats: StatsService; leaks: MoneyLeakService };

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-05-20T10:00:00Z' });
    const c = ctx.container;
    reference = {
      stats: new StatsService(
        c.repos.transactions,
        c.repos.accounts,
        c.repos.settings,
        c.transactions,
        c.entitlements,
        c.repos.rules,
        ctx.clock,
        c.repos.assets,
        c.repos.categories,
        noCache
      ),
      leaks: new MoneyLeakService(
        c.repos.transactions,
        c.repos.rules,
        c.repos.categoryRules,
        c.repos.leakDecisions,
        c.entitlements,
        c.repos.funnel,
        ctx.clock,
        noCache
      ),
    };
    user = await createUser(ctx);
  });

  const api = (who: TestUser, path: string) => request(ctx.app).get(path).set(who.auth).expect(200);
  const send = (
    who: TestUser,
    method: 'post' | 'patch' | 'put' | 'delete',
    path: string,
    body?: object
  ) =>
    request(ctx.app)
      [method](path)
      .set(who.auth)
      .send(body ?? {});
  const add = (who: TestUser, body: Record<string, unknown>) =>
    addTransaction(ctx, who, body).then((res) => {
      expect(res.status).toBe(201);
      return res;
    });

  /**
   * The API answers (asked twice: the second one comes from the cache) are, byte by byte, what
   * the statistics give when worked out from scratch with the data as it is now. Returns the
   * three answers together.
   */
  async function expectFresh(who: TestUser, exclude: string[] = []): Promise<string> {
    const query = `/api/stats/forecast?months=6${exclude.length ? `&exclude=${exclude}` : ''}`;
    const first = (await api(who, query)).text;
    const second = (await api(who, query)).text;
    const id = (who as TestUser & { dataId?: string }).dataId ?? who.id;
    expect(first).toBe(
      JSON.stringify(presentForecast(reference.stats.forecast(id, { months: 6, exclude })))
    );
    expect(second).toBe(first);

    const subs = (await api(who, '/api/stats/subscriptions')).text;
    expect(subs).toBe(JSON.stringify(presentSubscriptions(reference.stats.subscriptions(id))));

    await api(who, '/api/stats/money-leaks');
    const leaks = (await api(who, '/api/stats/money-leaks')).text;
    expect(leaks).toBe(
      JSON.stringify(presentMoneyLeaks(reference.leaks.view(id, { count: false })))
    );
    return `${first}\n${subs}\n${leaks}`;
  }

  async function seed(who: TestUser): Promise<{ savings: string; card: string }> {
    const accounts = (
      await send(who, 'post', '/api/accounts', { name: 'Ahorro', initialBalance: 1234.56 }).expect(
        201
      )
    ).body as { id: string; name: string }[];
    await send(who, 'post', '/api/accounts', { name: 'Tarjeta', initialBalance: -20.05 }).expect(
      201
    );
    const all = (await api(who, '/api/accounts')).body.accounts as { id: string; name: string }[];
    const savings = accounts.find((a) => a.name === 'Ahorro')!.id;
    const card = all.find((a) => a.name === 'Tarjeta')!.id;
    for (const [description, amount, type, category, frequency] of [
      ['Nómina', 1850.33, 'INCOME', 'Salario', 'monthly'],
      ['Alquiler', 720, 'EXPENSE', 'Vivienda', 'monthly'],
      ['Agua', 31.47, 'EXPENSE', 'Vivienda', 'bimonthly'],
      ['IBI', 98.1, 'EXPENSE', 'Vivienda', 'quarterly'],
      ['Seguro hogar', 180, 'EXPENSE', 'Vivienda', 'yearly'],
    ] as const) {
      await send(who, 'post', '/api/recurring-rules', {
        description,
        amount,
        type,
        category,
        frequency,
        startYear: 2025,
        startMonth: 6,
      }).expect(201);
    }
    // Months with movements, an empty month (2026-02) and subscriptions the detector finds.
    const days = ['2025-11', '2025-12', '2026-01', '2026-03', '2026-04', '2026-05'];
    for (const [i, month] of days.entries()) {
      for (const [description, amount, category, accountId] of [
        ['Mercadona', 43.27 + i, 'Supermercado', savings],
        ['Gasolinera', 55.5 - i, 'Transporte', card],
        ['Cena', 28.05, 'Restaurantes', savings],
      ] as const) {
        await add(who, {
          description,
          amount,
          category,
          accountId,
          date: `${month}-0${(i % 7) + 2}`,
        });
      }
    }
    // A subscription charged every month, February too.
    for (const month of ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']) {
      await add(who, {
        description: 'Netflix',
        amount: 12.99,
        category: 'Ocio',
        date: `${month}-03`,
      });
    }
    for (const month of ['2026-04', '2026-05']) {
      await add(who, {
        description: 'Netflix',
        amount: 13.99,
        category: 'Ocio',
        date: `${month}-03`,
      });
    }
    await add(who, {
      description: 'Sofá',
      amount: 899.99,
      category: 'Hogar',
      date: '2026-05-10',
    });
    await add(who, {
      description: 'Traspaso a ahorro',
      amount: 100,
      type: 'EXPENSE',
      category: 'Otros',
      date: '2026-05-11',
    });
    await send(who, 'post', '/api/transfers', {
      fromAccountId: card,
      toAccountId: savings,
      amount: 50.5,
      date: '2026-05-12',
    }).expect(201);
    return { savings, card };
  }

  it('answers the same as working it out from scratch after every kind of write', async () => {
    const { savings } = await seed(user);
    let last = await expectFresh(user);
    const changed = async (exclude: string[] = []): Promise<void> => {
      const now = await expectFresh(user, exclude);
      expect(now).not.toBe(last);
      last = now;
    };
    // Writes the statistics do not show (or may not): still the same as from scratch.
    const fresh = async (): Promise<void> => {
      last = await expectFresh(user);
    };

    // Movements: create, edit, delete, in bulk, undo (created again) and import.
    const created = (await add(user, { amount: 7.77, date: '2026-05-19' })).body;
    await changed();
    await send(user, 'patch', `/api/transactions/${created.id}`, { amount: 8.88 }).expect(200);
    await changed();
    await send(user, 'delete', `/api/transactions/${created.id}`).expect(204);
    await changed();
    await add(user, { amount: 8.88, date: '2026-05-19' });
    await changed();
    const month = (await api(user, '/api/months/2026/5')).body.transactions as {
      id: string;
      description: string;
      recurringRuleId: string | null;
    }[];
    const sofa = month.find((t) => t.description === 'Sofá')!;
    await send(user, 'patch', '/api/transactions/bulk', {
      ids: [sofa.id],
      changes: { accountId: savings },
    }).expect(200);
    await fresh();
    await send(user, 'post', '/api/transactions/bulk-delete', { ids: [sofa.id] }).expect(200);
    await changed();
    await send(user, 'post', '/api/transactions/import', {
      rows: [
        { date: '2026-05-15', description: 'FARMACIA CENTRO', amount: -15.4 },
        { date: '2026-05-16', description: 'BIZUM RECIBIDO', amount: 30 },
      ],
    }).expect(201);
    await changed();

    // A movement of an automatic operation deleted (the rule skips that month from then on).
    const rent = month.find((t) => t.description === 'Alquiler' && t.recurringRuleId)!;
    await send(user, 'delete', `/api/transactions/${rent.id}`).expect(204);
    await changed();

    // Automatic operations: create, edit, «what if I cancel…» and delete.
    const rule = (
      await send(user, 'post', '/api/recurring-rules', {
        description: 'Gimnasio',
        amount: 39.9,
        type: 'EXPENSE',
        category: 'Deporte',
        startYear: 2026,
        startMonth: 5,
      }).expect(201)
    ).body as { id: string };
    await changed();
    await send(user, 'patch', `/api/recurring-rules/${rule.id}`, { amount: 45 }).expect(200);
    await changed();
    await changed([rule.id]);
    await send(user, 'delete', `/api/recurring-rules/${rule.id}?scope=all`).expect(204);
    await changed();

    // Accounts and transfers.
    const extra = (
      await send(user, 'post', '/api/accounts', { name: 'Hucha', initialBalance: 10 }).expect(201)
    ).body as { id: string; name: string }[];
    await changed();
    const piggy = extra.find((a) => a.name === 'Hucha')!.id;
    await send(user, 'patch', `/api/accounts/${piggy}`, { initialBalance: 99.99 }).expect(200);
    await changed();
    await send(user, 'delete', `/api/accounts/${piggy}`).expect(204);
    await changed();
    const transfer = (
      await send(user, 'post', '/api/transfers', {
        fromAccountId: savings,
        toAccountId: (await api(user, '/api/accounts')).body.accounts[0].id,
        amount: 1,
        date: '2026-05-13',
      }).expect(201)
    ).body as { id: string };
    await fresh();
    await send(user, 'delete', `/api/transfers/${transfer.id}`).expect(204);
    await fresh();

    // Categories (rename, delete moving the movements), category rules, budgets and goals.
    const categories = (await api(user, '/api/categories')).body as { id: string; name: string }[];
    const leisure = categories.find((c) => c.name === 'Ocio')!;
    await send(user, 'patch', `/api/categories/${leisure.id}`, { name: 'Suscripciones' }).expect(
      200
    );
    await changed();
    const transport = categories.find((c) => c.name === 'Transporte')!;
    const other = categories.find((c) => c.name === 'Otros')!;
    await send(user, 'delete', `/api/categories/${transport.id}?reassignTo=${other.id}`).expect(
      204
    );
    await fresh();
    await send(user, 'post', '/api/category-rules', {
      pattern: 'farmacia',
      categoryId: other.id,
    }).expect(201);
    await fresh();
    await send(user, 'put', '/api/budgets', { category: 'Otros', amount: 100 }).expect(200);
    await fresh();
    await send(user, 'post', '/api/goals', {
      name: 'Viaje',
      target: 500,
      category: 'Ahorro',
    }).expect(201);
    await fresh();

    // «Tu dinero perdido»: a decision and its undo.
    const leaks = (await api(user, '/api/stats/money-leaks')).body.findings as { id: string }[];
    expect(leaks.length).toBeGreaterThan(0);
    await send(user, 'put', `/api/stats/money-leaks/${leaks[0].id}`, {
      status: 'dismissed',
    }).expect(200);
    await changed();
    await send(user, 'delete', `/api/stats/money-leaks/${leaks[0].id}`).expect(204);
    await changed();

    // Sample data in and out.
    await send(user, 'post', '/api/sample-data').expect(201);
    await changed();
    await send(user, 'delete', '/api/sample-data').expect(200);
    await changed();

    // Settings: the first day of the month.
    await send(user, 'patch', '/api/settings', { monthStartDay: 25 }).expect(200);
    await changed();

    // A new day, a new month (the automatic operations are added) and the end of the trial.
    ctx.clock.set('2026-05-21T10:00:00Z');
    await changed();
    ctx.clock.set('2026-06-02T10:00:00Z');
    await changed();
    expireTrial(ctx, user);
    await changed();
  });

  it('keeps the answers until something changes, and only for their user', async () => {
    const other = await createUser(ctx);
    await seed(user);
    await add(other, { description: 'Libro', amount: 19.9, date: '2026-05-02' });
    const spy = jest.spyOn(ctx.container.repos.transactions, 'listSubscriptionCandidates');
    expect(await expectFresh(user)).not.toBe(await expectFresh(other));
    const forecast = async (who: TestUser) => (await api(who, '/api/stats/forecast?months=6')).text;
    const mine = await forecast(user);
    const theirs = await forecast(other);
    expect(theirs).not.toBe(mine);
    spy.mockClear();
    // From the cache: neither the forecast nor the subscriptions read the movements again.
    expect(await forecast(user)).toBe(mine);
    expect(await forecast(other)).toBe(theirs);
    await api(user, '/api/stats/subscriptions');
    expect(spy).not.toHaveBeenCalled();
    // Another user's write leaves this user's answers alone (and still from the cache).
    await add(other, { amount: 3, date: '2026-05-03' });
    expect(await forecast(user)).toBe(mine);
    expect(spy).not.toHaveBeenCalled();
    expect(await forecast(other)).not.toBe(theirs);
    expect(spy).toHaveBeenCalledTimes(1);
    await expectFresh(other);
  });

  it('keeps one answer for the whole household', async () => {
    const partner = await createUser(ctx);
    await seed(user);
    const { code } = (await send(user, 'post', '/api/household/invite').expect(201)).body;
    await send(partner, 'post', '/api/household/join', { code }).expect(204);
    const before = await expectFresh(user);
    expect(await expectFresh({ ...partner, dataId: user.id } as TestUser)).toBe(before);
    // The partner writes on the shared data: the owner's next answer has it.
    await add(partner, { amount: 12.34, date: '2026-05-19' });
    const after = await expectFresh(user);
    expect(after).not.toBe(before);
    expect(await expectFresh({ ...partner, dataId: user.id } as TestUser)).toBe(after);
  });
});
