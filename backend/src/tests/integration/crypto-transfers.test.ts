import request from 'supertest';
import { randomUUID } from 'crypto';
import { openDatabase } from '@infrastructure/sqlite/database';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import { transferWording } from '@application/crypto/CryptoTransferService';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

// Every price and amount here is made up: the fake market answers what each test sets.
describe('Crypto console: a practice result added to an account', () => {
  let ctx: TestContext;
  let user: TestUser;
  const as = (u: TestUser) => ({
    get: (path: string) => request(ctx.app).get(`/api${path}`).set(u.auth),
    post: (path: string, body: unknown = {}) =>
      request(ctx.app)
        .post(`/api${path}`)
        .set(u.auth)
        .send(body as object),
    patch: (path: string, body: unknown) =>
      request(ctx.app)
        .patch(`/api${path}`)
        .set(u.auth)
        .send(body as object),
    del: (path: string) => request(ctx.app).delete(`/api${path}`).set(u.auth),
  });
  const me = () => as(user);

  const practiceOf = async (u: TestUser) =>
    (await as(u).post('/crypto/sim/practice').expect(201)).body.portfolio.id as string;
  /** Buys 1.000 € of BTC at 50.000 and, unless `open`, sells at `out` (0,10 % each way). */
  const trade = async (
    u: TestUser,
    portfolioId: string | undefined,
    out: number,
    options: { open?: boolean } = {}
  ): Promise<string> => {
    ctx.market.prices.set('BTC', 50_000);
    const bought = await as(u)
      .post('/crypto/sim/orders', {
        action: 'buy',
        symbol: 'BTC',
        type: 'market',
        amount: 1000,
        ...(portfolioId ? { portfolioId } : {}),
      })
      .expect(201);
    const id = bought.body.open[0].id as string;
    if (options.open) return id;
    ctx.market.prices.set('BTC', out);
    await as(u)
      .post('/crypto/sim/orders', {
        action: 'sell',
        positionId: id,
        type: 'market',
        ...(portfolioId ? { portfolioId } : {}),
      })
      .expect(201);
    return id;
  };
  const account = async (u: TestUser, body: Record<string, unknown>) =>
    ((await as(u).post('/accounts', body).expect(201)).body as { id: string; name: string }[]).find(
      (a) => a.name === body.name
    )!.id;
  const accounts = async (u: TestUser) =>
    (await as(u).get('/accounts').expect(200)).body as {
      accounts: { id: string; name: string; type: string; balance: number }[];
      total: number;
    };
  const transfer = (u: TestUser, positionId: string, accountId: string) =>
    as(u).post(`/crypto/sim/positions/${positionId}/transfer`, { accountId });
  const movements = (userId: string) =>
    ctx.container.db
      .prepare(
        `SELECT t.description, t.notes, t.amount_cents AS cents, t.type, t.date, t.account_id AS accountId,
                c.name AS category
           FROM transactions t JOIN categories c ON c.id = t.category_id
          WHERE t.user_id = ? ORDER BY t.created_at`
      )
      .all(userId) as Record<string, unknown>[];
  const links = () =>
    (
      ctx.container.db.prepare('SELECT COUNT(*) AS n FROM crypto_sim_transfers').get() as {
        n: number;
      }
    ).n;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
  });

  it('adds a gain once as an income of the crypto account, and the total of the accounts changes', async () => {
    const practice = await practiceOf(user);
    const position = await trade(user, practice, 55_000);
    const wallet = await account(user, { name: 'Exchange', type: 'crypto', initialBalance: 200 });
    const before = await accounts(user);
    // The outlook is kept while the data does not change (VersionedCache).
    const outlook = async () => (await me().get('/stats/forecast').expect(200)).body;
    const outlookBefore = await outlook();
    expect(await outlook()).toEqual(outlookBefore);

    const { body } = await transfer(user, position, wallet).expect(201);
    // 0,02 BTC: bought for 1.000 € + 1 € of commission, sold for 1.100 € - 1,10 €.
    expect(body.portfolio.id).toBe(practice);
    expect(body.closed[0]).toMatchObject({
      id: position,
      pnl: 97.9,
      transfer: { accountId: wallet, accountName: 'Exchange', amount: 97.9 },
    });
    expect(body.closed[0].transfer.at).toBe('2026-03-15T12:00:00.000Z');

    const after = await accounts(user);
    expect(after.accounts.find((a) => a.id === wallet)!.balance).toBe(297.9);
    expect(after.total).toBeCloseTo(before.total + 97.9, 2);
    expect(movements(user.id)).toEqual([
      {
        description: 'Consola crypto (práctica): BTC +97,90 €',
        notes: expect.stringContaining('Dinero de práctica del simulador'),
        cents: 9790,
        type: 'INCOME',
        date: '2026-03-15',
        accountId: wallet,
        category: 'Consola crypto',
      },
    ]);
    // The month and the cached figures see it at once (the movement moves the data stamp).
    const month = (await me().get('/months/2026/3').expect(200)).body;
    expect(month.summary.totalIncome).toBe(97.9);
    expect(month.available).toBeCloseTo(before.total + 97.9, 2);
    expect(await outlook()).not.toEqual(outlookBefore);

    // Once: the second time says where it went and writes nothing.
    const again = await transfer(user, position, wallet).expect(409);
    expect(again.body).toMatchObject({
      code: 'CRYPTO_ALREADY_TRANSFERRED',
      details: { accountId: wallet, accountName: 'Exchange' },
    });
    expect(movements(user.id)).toHaveLength(1);
    expect((await accounts(user)).total).toBe(after.total);
    // The portfolio keeps saying it after any other answer.
    const view = (await me().get(`/crypto/sim?portfolio=${practice}`).expect(200)).body;
    expect(view.closed[0].transfer).toMatchObject({ accountName: 'Exchange', amount: 97.9 });
  });

  it('takes a loss from the account as an expense, to the account chosen among several', async () => {
    const practice = await practiceOf(user);
    const position = await trade(user, practice, 45_000);
    await account(user, { name: 'Cripto 1', type: 'crypto' });
    const second = await account(user, { name: 'Cripto 2', type: 'crypto', initialBalance: 500 });

    const { body } = await transfer(user, position, second).expect(201);
    // Sold for 900 € - 0,90 €: 101,90 € less than the 1.001 € paid.
    expect(body.closed[0].transfer).toMatchObject({ accountName: 'Cripto 2', amount: -101.9 });
    const list = await accounts(user);
    expect(list.accounts.find((a) => a.name === 'Cripto 2')!.balance).toBe(398.1);
    expect(list.accounts.find((a) => a.name === 'Cripto 1')!.balance).toBe(0);
    expect(movements(user.id)).toMatchObject([
      { description: 'Consola crypto (práctica): BTC -101,90 €', cents: 10190, type: 'EXPENSE' },
    ]);
  });

  it('never adds the official portfolio of the month (the ranking)', async () => {
    const position = await trade(user, undefined, 55_000);
    const wallet = await account(user, { name: 'Exchange', type: 'crypto' });
    const res = await transfer(user, position, wallet).expect(400);
    expect(res.body.code).toBe('CRYPTO_TRANSFER_OFFICIAL');
    expect(movements(user.id)).toEqual([]);
    expect(links()).toBe(0);
    // Nor does the official portfolio carry the field filled.
    const view = (await me().get('/crypto/sim').expect(200)).body;
    expect(view.closed[0].transfer).toBeNull();
  });

  it('refuses an open operation and one with nothing to add', async () => {
    const practice = await practiceOf(user);
    const wallet = await account(user, { name: 'Exchange', type: 'crypto' });
    const open = await trade(user, practice, 0, { open: true });
    expect((await transfer(user, open, wallet).expect(400)).body.code).toBe('CRYPTO_TRANSFER_OPEN');

    // A closed operation that neither gained nor lost (written straight, the market rarely does).
    const repo = ctx.container.repos.cryptoSim;
    const even = { ...repo.position(user.id, open)!, id: randomUUID(), slot: null };
    repo.insertPosition(even);
    repo.closePosition(user.id, even.id, {
      exitPrice: 50_000,
      exitFeeCents: 0,
      proceedsCents: 1001_00,
      pnlCents: 0,
      closeType: 'market',
      closedAt: '2026-03-15T12:00:00.000Z',
    });
    expect((await transfer(user, even.id, wallet).expect(400)).body.code).toBe(
      'CRYPTO_TRANSFER_ZERO'
    );
    expect(movements(user.id)).toEqual([]);
  });

  it('only to an active account of type Criptomonedas of the person', async () => {
    const practice = await practiceOf(user);
    const position = await trade(user, practice, 55_000);
    const savings = await account(user, { name: 'Ahorro', type: 'savings' });
    const archived = await account(user, { name: 'Vieja', type: 'crypto' });
    await me().patch(`/accounts/${archived}`, { archived: true }).expect(200);
    const other = await createUser(ctx);
    const theirs = await account(other, { name: 'Ajena', type: 'crypto' });

    expect((await transfer(user, position, savings).expect(400)).body.code).toBe(
      'CRYPTO_TRANSFER_ACCOUNT_TYPE'
    );
    expect((await transfer(user, position, archived).expect(400)).body.code).toBe(
      'ACCOUNT_ARCHIVED'
    );
    expect((await transfer(user, position, theirs).expect(404)).body.code).toBe(
      'ACCOUNT_NOT_FOUND'
    );
    // Nor somebody else's operation into one's own account.
    const mine = await account(user, { name: 'Exchange', type: 'crypto' });
    const theirPractice = await practiceOf(other);
    const theirPosition = await trade(other, theirPractice, 55_000);
    expect((await transfer(user, theirPosition, mine).expect(404)).body.code).toBe(
      'CRYPTO_POSITION_NOT_FOUND'
    );
    expect(movements(user.id)).toEqual([]);
    expect(movements(other.id)).toEqual([]);
  });

  it('validates the request strictly', async () => {
    const practice = await practiceOf(user);
    const position = await trade(user, practice, 55_000);
    const wallet = await account(user, { name: 'Exchange', type: 'crypto' });
    await me().post(`/crypto/sim/positions/${position}/transfer`, {}).expect(400);
    await me()
      .post(`/crypto/sim/positions/${position}/transfer`, { accountId: wallet, amount: 1_000_000 })
      .expect(400);
    await me().post(`/crypto/sim/positions/not-a-uuid/transfer`, { accountId: wallet }).expect(400);
    await request(ctx.app)
      .post(`/api/crypto/sim/positions/${position}/transfer`)
      .send({ accountId: wallet })
      .expect(401);
    expect(movements(user.id)).toEqual([]);
  });

  it('refuses accounts in another currency (the simulator works in euros)', async () => {
    const practice = await practiceOf(user);
    const position = await trade(user, practice, 55_000);
    const wallet = await account(user, { name: 'Exchange', type: 'crypto' });
    await me().patch('/settings', { currency: 'USD' }).expect(200);
    const res = await transfer(user, position, wallet).expect(400);
    expect(res.body).toMatchObject({
      code: 'CRYPTO_TRANSFER_CURRENCY',
      details: { currency: 'USD' },
    });
    expect(movements(user.id)).toEqual([]);
  });

  it('writes in English for people who use the app in English', async () => {
    const practice = await practiceOf(user);
    const position = await trade(user, practice, 45_000);
    const wallet = await account(user, { name: 'Exchange', type: 'crypto' });
    await me().patch('/settings', { locale: 'en' }).expect(200);
    await transfer(user, position, wallet).expect(201);
    expect(movements(user.id)).toMatchObject([
      {
        description: 'Crypto console (practice): BTC -€101.90',
        notes: expect.stringContaining('Practice money from the Crypto console simulator'),
        category: 'Crypto console',
      },
    ]);
  });

  it('frees the operation when its movement is deleted, and keeps the movement when practice starts again', async () => {
    const practice = await practiceOf(user);
    const position = await trade(user, practice, 55_000);
    const wallet = await account(user, { name: 'Exchange', type: 'crypto' });
    await transfer(user, position, wallet).expect(201);
    const [{ id }] = ctx.container.db
      .prepare('SELECT id FROM transactions WHERE user_id = ?')
      .all(user.id) as { id: string }[];

    await me().del(`/transactions/${id}`).expect(204);
    expect(links()).toBe(0);
    const view = (await me().get(`/crypto/sim?portfolio=${practice}`).expect(200)).body;
    expect(view.closed[0].transfer).toBeNull();
    // Moved to another account later, it says the account it is in now.
    await transfer(user, position, wallet).expect(201);
    const other = await account(user, { name: 'Ledger', type: 'crypto' });
    const [moved] = ctx.container.db
      .prepare('SELECT id FROM transactions WHERE user_id = ?')
      .all(user.id) as { id: string }[];
    await me().patch(`/transactions/${moved.id}`, { accountId: other }).expect(200);
    expect(
      (await me().get(`/crypto/sim?portfolio=${practice}`).expect(200)).body.closed[0].transfer
    ).toMatchObject({ accountId: other, accountName: 'Ledger' });

    // «Start again»: the operation goes, the movement stays where the person put it.
    await me().post('/crypto/sim/reset', { portfolioId: practice }).expect(200);
    expect(links()).toBe(0);
    expect(movements(user.id)).toHaveLength(1);
    // Deleting the account that has it is still refused (it has a movement).
    await me().del(`/accounts/${other}`).expect(409);
  });

  it('inside a household: the own practice result goes to an account of the shared data', async () => {
    const owner = await createUser(ctx);
    const code = (await as(owner).post('/household/invite').expect(201)).body.code as string;
    await as(user).post('/household/join', { code }).expect(204);
    const shared = await account(owner, { name: 'Cripto casa', type: 'crypto' });

    const practice = await practiceOf(user);
    const position = await trade(user, practice, 55_000);
    await transfer(user, position, shared).expect(201);
    expect(movements(owner.id)).toMatchObject([{ cents: 9790, accountId: shared }]);
    expect(movements(user.id)).toEqual([]);
    // The owner cannot add the member's operation (the simulator is personal).
    expect((await transfer(owner, position, shared).expect(404)).body.code).toBe(
      'CRYPTO_POSITION_NOT_FOUND'
    );
  });

  it('goes in the personal data export with the movement it made', async () => {
    const practice = await practiceOf(user);
    const position = await trade(user, practice, 55_000);
    const wallet = await account(user, { name: 'Exchange', type: 'crypto' });
    await transfer(user, position, wallet).expect(201);
    const exported = (await me().get('/export').expect(200)).body as {
      cryptoSimulator: {
        portfolios: { kind: string; operations: Record<string, unknown>[] }[];
      };
    };
    const ops = exported.cryptoSimulator.portfolios.find((p) => p.kind === 'practice')!.operations;
    expect(ops[0]).toMatchObject({
      id: position,
      addedAsMovementId: expect.any(String),
      addedToAccountAt: '2026-03-15T12:00:00.000Z',
    });
  });

  it('limits how many a person adds per minute outside tests', async () => {
    const live = createTestApp({ env: { NODE_ENV: 'development' } });
    const person = await createUser(live);
    const send = () =>
      request(live.app)
        .post(`/api/crypto/sim/positions/${randomUUID()}/transfer`)
        .set(person.auth)
        .send({ accountId: 'missing' });
    for (let i = 0; i < 10; i++) await send().expect(404);
    expect((await send().expect(429)).body.code).toBe('RATE_LIMITED');
  });

  it('words the movement as practice money in both languages', () => {
    const position = {
      symbol: 'ETH',
      direction: 'short' as const,
      pnlCents: 123_456,
      closedAt: '2026-03-14T10:00:00.000Z',
    };
    expect(transferWording(position, 'es')).toEqual({
      description: 'Consola crypto (práctica): ETH +1234,56 €',
      notes:
        'Dinero de práctica del simulador de la Consola crypto: no es una operación real ni dinero de un exchange. Resultado de la operación de práctica de ETH en corto cerrada el 2026-03-14.',
    });
    expect(transferWording({ ...position, direction: 'long' }, 'en').notes).toContain(
      'ETH long practice trade closed on 2026-03-14'
    );
  });
});

describe('migration 044 (crypto accounts and practice transfers)', () => {
  it('keeps every account, movement and link to them, and accepts the new type', () => {
    const db = openDatabase(':memory:');
    migrate(
      db,
      migrations.filter((m) => m.version < 44)
    );
    db.exec(`
      INSERT INTO users (id, email, name, password_hash, created_at, email_verified)
        VALUES ('u1', 'ana@example.com', 'Ana', 'x', '2026-01-01T00:00:00Z', 1);
      INSERT INTO accounts (id, user_id, name, type, initial_balance_cents, color, icon, archived, created_at)
        VALUES ('a1', 'u1', 'Principal', 'checking', 1000, '#6366f1', '🏦', 0, '2026-01-01T00:00:00Z'),
               ('a2', 'u1', 'Broker', 'investment', -50, '#000000', '📈', 1, '2026-01-02T00:00:00Z');
      INSERT INTO categories (id, user_id, name, color, icon) VALUES ('c1', 'u1', 'Ocio', '#ec4899', '🎉');
      INSERT INTO transactions (id, user_id, account_id, category_id, year, month, date, description,
        description_key, amount_cents, type, created_at)
        VALUES ('t1', 'u1', 'a2', 'c1', 2026, 3, '2026-03-04', 'Cine', 'cine', 1235, 'EXPENSE', '2026-03-04T11:00:00Z');
      INSERT INTO transfers (id, user_id, from_account_id, to_account_id, amount_cents, date, created_at)
        VALUES ('tr1', 'u1', 'a1', 'a2', 500, '2026-03-05', '2026-03-05T00:00:00Z');
      UPDATE user_settings SET default_account_id = 'a1' WHERE user_id = 'u1';
    `);
    const before = db.prepare('SELECT * FROM accounts ORDER BY id').all();

    expect(migrate(db, migrations).to).toBe(migrations.length);
    expect(db.prepare('SELECT * FROM accounts ORDER BY id').all()).toEqual(before);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    // Still unique by name per person, still indexed, and the type crypto is accepted.
    db.exec(`INSERT INTO accounts (id, user_id, name, type, created_at)
      VALUES ('a3', 'u1', 'Exchange', 'crypto', '2026-03-06T00:00:00Z')`);
    expect(() =>
      db.exec(`INSERT INTO accounts (id, user_id, name, type, created_at)
        VALUES ('a4', 'u1', 'Exchange', 'crypto', '2026-03-06T00:00:00Z')`)
    ).toThrow(/UNIQUE/);
    expect(() =>
      db.exec(`INSERT INTO accounts (id, user_id, name, type, created_at)
        VALUES ('a5', 'u1', 'Rara', 'gold', '2026-03-06T00:00:00Z')`)
    ).toThrow(/CHECK/);
    expect(
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'accounts'")
        .pluck()
        .all()
    ).toContain('idx_accounts_user');
    // The tables that point at the accounts still do (a movement of a missing account fails).
    expect(() =>
      db.exec(`INSERT INTO transactions (id, user_id, account_id, category_id, year, month, date,
        description, description_key, amount_cents, type, created_at)
        VALUES ('t2', 'u1', 'nope', 'c1', 2026, 3, '2026-03-04', 'x', 'x', 1, 'EXPENSE', '2026-03-04T11:00:00Z')`)
    ).toThrow(/FOREIGN KEY/);
    // Removing the person removes the accounts too (ON DELETE CASCADE kept).
    db.exec("DELETE FROM transactions; DELETE FROM transfers; DELETE FROM users WHERE id = 'u1'");
    expect(db.prepare('SELECT COUNT(*) AS n FROM accounts').get()).toEqual({ n: 0 });
  });
});
