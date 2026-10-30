import request from 'supertest';
import { openDatabase } from '@infrastructure/sqlite/database';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import { RECORDS_PER_MINUTE } from '@infrastructure/http/routes/crypto.routes';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

// Every price here is made up: the fake market answers what each test sets.
const candle = (iso: string, open: number, high: number, low: number) => ({
  time: Date.parse(iso),
  open,
  high,
  low,
  close: open,
  volume: 1,
});

describe('Crypto console: a trade registered by hand (practice)', () => {
  let ctx: TestContext;
  let user: TestUser;
  let practice: string;
  const get = (path: string) => request(ctx.app).get(`/api${path}`).set(user.auth);
  const post = (path: string, body: unknown) =>
    request(ctx.app)
      .post(`/api${path}`)
      .set(user.auth)
      .send(body as object);
  const record = (body: Record<string, unknown> = {}) =>
    post('/crypto/sim/recorded', {
      portfolioId: practice,
      symbol: 'BTC',
      entryPrice: 40_000,
      amount: 1000,
      ...body,
    });
  const read = () => get(`/crypto/sim?portfolio=${practice}`).expect(200);

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
    practice = (await post('/crypto/sim/practice', {}).expect(201)).body.portfolio.id as string;
  });

  it('opens at the entry given, pays the commission and follows the price live', async () => {
    const { body } = await record().expect(201);
    expect(body.open).toEqual([
      expect.objectContaining({
        symbol: 'BTC',
        slot: 1,
        direction: 'long',
        quantity: 0.025,
        entryPrice: 40_000,
        invested: 1000,
        entryFee: 1,
        openType: 'market',
        openedAt: '2026-03-15T12:00:00.000Z',
        recorded: true,
        currentPrice: 50_000,
        // 0,025 BTC at 50.000 = 1.250 €, minus 1,25 € of commission, against 1.001 € paid.
        value: 1248.75,
        pnl: 247.75,
        pnlPercent: 24.75,
      }),
    ]);
    expect(body.account.cash).toBe(98_999);
    expect(body.summary).toMatchObject({ equity: 100_247.75, unrealized: 247.75 });
    // Not played in the console: no badge for it.
    expect(body.badges).toEqual([]);

    ctx.market.prices.set('BTC', 38_000);
    const lower = (await read()).body.open[0];
    expect(lower).toMatchObject({ currentPrice: 38_000, pnl: -51.95 });

    // From here it is an ordinary position: closed at the market, kept in the history.
    const closed = await post('/crypto/sim/orders', {
      action: 'sell',
      portfolioId: practice,
      positionId: lower.id,
      type: 'market',
    }).expect(201);
    expect(closed.body.open).toEqual([]);
    expect(closed.body.closed[0]).toMatchObject({
      recorded: true,
      entryPrice: 40_000,
      exitPrice: 38_000,
      closeType: 'market',
      pnl: -51.95,
    });
    expect(closed.body.account.cash).toBe(98_999 + 949.05);
  });

  it('accepts an entry far from the price, but not an absurd one', async () => {
    await record({ entryPrice: 20_000, amount: 10 }).expect(201);
    const absurd = await record({ entryPrice: 100, amount: 10 }).expect(400);
    expect(absurd.body.code).toBe('CRYPTO_PRICE_OUT_OF_RANGE');
  });

  it('checks take profit and stop loss against the entry, and against the price now', async () => {
    const tpSide = await record({ takeProfit: 39_000 }).expect(400);
    expect(tpSide.body.code).toBe('CRYPTO_TAKE_PROFIT_SIDE');
    const slSide = await record({ stopLoss: 41_000 }).expect(400);
    expect(slSide.body.code).toBe('CRYPTO_STOP_LOSS_SIDE');
    // Entered now at 40.000 with the price at 50.000: a take profit at 45.000 is reached already.
    const reached = await record({ takeProfit: 45_000 }).expect(400);
    expect(reached.body).toMatchObject({
      code: 'CRYPTO_TAKE_PROFIT_SIDE',
      details: { current: 50_000 },
    });
    const short = await record({ direction: 'short', entryPrice: 52_000, stopLoss: 49_000 }).expect(
      400
    );
    expect(short.body.code).toBe('CRYPTO_STOP_LOSS_SIDE');
    expect((await read()).body.open).toEqual([]);

    const { body } = await record({ takeProfit: 60_000, stopLoss: 35_000 }).expect(201);
    const id = body.open[0].id;
    expect(
      body.pending.map((o: { type: string; price: number; positionId: string }) => [
        o.type,
        o.price,
        o.positionId,
      ])
    ).toEqual(
      expect.arrayContaining([
        ['limit', 60_000, id],
        ['stop', 35_000, id],
      ])
    );
    ctx.market.prices.set('BTC', 61_000);
    const filled = (await read()).body;
    expect(filled.closed[0]).toMatchObject({ id, recorded: true, closeType: 'limit' });
    expect(filled.fills[0]).toMatchObject({ type: 'limit', price: 61_000, sameCandle: false });
  });

  describe('with a moment in the past', () => {
    it('closes at the take profit reached since then, at the time of its candle', async () => {
      ctx.market.setCandles('BTC', [
        // Before the entry: it does not count.
        candle('2026-03-15T08:00:00Z', 50_000, 50_100, 30_000),
        candle('2026-03-15T10:00:00Z', 50_000, 50_500, 49_000),
        candle('2026-03-15T11:00:00Z', 50_000, 56_000, 50_000),
      ]);
      const { body } = await record({
        openedAt: '2026-03-15T09:00:00Z',
        takeProfit: 55_000,
        stopLoss: 35_000,
      }).expect(201);
      expect(body.open).toEqual([]);
      expect(body.closed[0]).toMatchObject({
        recorded: true,
        openedAt: '2026-03-15T09:00:00.000Z',
        closedAt: '2026-03-15T11:00:00.000Z',
        exitPrice: 55_000,
        closeType: 'limit',
      });
      expect(body.fills).toEqual([
        expect.objectContaining({
          type: 'limit',
          price: 55_000,
          at: '2026-03-15T11:00:00.000Z',
          slot: 1,
          sameCandle: false,
        }),
      ]);
      expect(body.account.cash).toBeCloseTo(98_999 + 1373.62, 2);
    });

    it('takes the stop loss when both were reached in the same candle', async () => {
      ctx.market.setCandles('BTC', [candle('2026-03-15T10:00:00Z', 50_000, 56_000, 34_000)]);
      const { body } = await record({
        openedAt: '2026-03-15T09:00:00+01:00',
        takeProfit: 55_000,
        stopLoss: 35_000,
      }).expect(201);
      expect(body.closed[0]).toMatchObject({ closeType: 'stop', exitPrice: 35_000 });
      expect(body.fills[0]).toMatchObject({ type: 'stop', sameCandle: true });
    });

    it('allows exits the price already passed: the candles decide', async () => {
      ctx.market.setCandles('BTC', [candle('2026-03-15T11:00:00Z', 50_000, 50_000, 50_000)]);
      const { body } = await record({
        openedAt: '2026-03-15T10:30:00Z',
        takeProfit: 45_000,
      }).expect(201);
      // The candle opened past the take profit: filled at its opening price, like any gap.
      expect(body.closed[0]).toMatchObject({ closeType: 'limit', exitPrice: 50_000 });
    });

    it('stays open when nothing was reached, and a short with its guarantee', async () => {
      ctx.market.setCandles('BTC', [candle('2026-03-15T10:00:00Z', 50_000, 51_000, 49_000)]);
      const long = await record({
        openedAt: '2026-03-15T09:00:00Z',
        takeProfit: 60_000,
        stopLoss: 30_000,
      }).expect(201);
      expect(long.body.open[0]).toMatchObject({
        openedAt: '2026-03-15T09:00:00.000Z',
        recorded: true,
      });
      expect(long.body.fills).toEqual([]);
      const short = await record({
        direction: 'short',
        entryPrice: 30_000,
        openedAt: '2026-03-15T09:00:00Z',
      }).expect(201);
      expect(short.body.open).toHaveLength(2);
      ctx.market.setCandles('BTC', [candle('2026-03-15T10:00:00Z', 50_000, 61_000, 49_000)]);
      const liquidated = (await read()).body;
      expect(liquidated.closed[0]).toMatchObject({
        direction: 'short',
        closeType: 'liquidation',
        exitPrice: 60_000,
      });
    });

    it('needs the moment between the last 30 days and now', async () => {
      const future = await record({ openedAt: '2026-03-15T12:10:00Z' }).expect(400);
      expect(future.body.code).toBe('CRYPTO_RECORD_FUTURE');
      const old = await record({ openedAt: '2026-02-13T11:59:00Z' }).expect(400);
      expect(old.body).toMatchObject({ code: 'CRYPTO_RECORD_TOO_OLD', details: { days: 30 } });
      await record({ openedAt: '2026-02-13T12:00:00Z', amount: 10 }).expect(201);
      // A clock a little ahead counts as now.
      const ahead = await record({ openedAt: '2026-03-15T12:03:00Z', amount: 10 }).expect(201);
      expect(ahead.body.open.map((o: { openedAt: string }) => o.openedAt)).toContain(
        '2026-03-15T12:00:00.000Z'
      );
      await record({ openedAt: 'yesterday' }).expect(400);
      await record({ openedAt: '2026-03-15T09:00:00' }).expect(400);
    });
  });

  it('refuses a short whose guarantee would be used up already', async () => {
    const gone = await record({ direction: 'short', entryPrice: 25_000 }).expect(400);
    expect(gone.body).toMatchObject({
      code: 'CRYPTO_RECORD_LIQUIDATED',
      details: { current: 50_000 },
    });
    const { body } = await record({ direction: 'short', entryPrice: 26_000 }).expect(201);
    expect(body.open[0]).toMatchObject({ direction: 'short', liquidationPrice: 52_000 });
  });

  it('never in the official portfolio: it would be cheating in the ranking', async () => {
    const official = (await get('/crypto/sim').expect(200)).body.portfolio.id;
    const refused = await record({ portfolioId: official }).expect(400);
    expect(refused.body.code).toBe('CRYPTO_RECORD_OFFICIAL');
    expect(refused.body.error).toContain('ranking');
    await post('/crypto/sim/recorded', {
      symbol: 'BTC',
      entryPrice: 40_000,
      amount: 1000,
    }).expect(400);
    expect((await get('/crypto/sim').expect(200)).body.open).toEqual([]);
  });

  it('keeps the rules of any purchase: money, two per coin, a portfolio of its own', async () => {
    const broke = await record({ amount: 100_000 }).expect(400);
    expect(broke.body).toMatchObject({ code: 'CRYPTO_NO_BALANCE', details: { kind: 'practice' } });
    await record().expect(201);
    await record().expect(201);
    const full = await record().expect(409);
    expect(full.body.code).toBe('CRYPTO_COIN_FULL');
    const other = await createUser(ctx);
    await request(ctx.app)
      .post('/api/crypto/sim/recorded')
      .set(other.auth)
      .send({ portfolioId: practice, symbol: 'ETH', entryPrice: 1000, amount: 10 })
      .expect(404);
  });

  it('needs prices that are up to date', async () => {
    ctx.market.stale = true;
    expect((await record().expect(503)).body.code).toBe('CRYPTO_PRICES_STALE');
    ctx.market.stale = false;
    ctx.market.down = true;
    await record().expect(503);
  });

  it('checks the shape of what is sent', async () => {
    await record({ type: 'market' }).expect(400);
    await record({ entryPrice: 0 }).expect(400);
    await record({ entryPrice: -5 }).expect(400);
    await record({ amount: 0.5 }).expect(400);
    await record({ symbol: 'NOPE' }).expect(400);
    await record({ direction: 'sideways' }).expect(400);
    await record({ portfolioId: 'nope' }).expect(400);
    await request(ctx.app).post('/api/crypto/sim/recorded').send({}).expect(401);
  });

  it('goes in the export of personal data', async () => {
    await record().expect(201);
    await post('/crypto/sim/orders', {
      action: 'buy',
      portfolioId: practice,
      symbol: 'ETH',
      type: 'market',
      amount: 100,
    }).expect(201);
    const exported = (await get('/export').expect(200)).body as {
      cryptoSimulator: {
        portfolios: { kind: string; operations: Record<string, unknown>[] }[];
      };
    };
    const ops = exported.cryptoSimulator.portfolios.find((p) => p.kind === 'practice')!.operations;
    expect(ops.map((o) => [o.symbol, o.recordedByHand])).toEqual(
      expect.arrayContaining([
        ['BTC', true],
        ['ETH', false],
      ])
    );
  });

  it('limits how many a person registers per minute outside tests', async () => {
    const live = createTestApp({ env: { NODE_ENV: 'development' } });
    const person = await createUser(live);
    const send = () =>
      request(live.app)
        .post('/api/crypto/sim/recorded')
        .set(person.auth)
        .send({ portfolioId: 'nope' });
    for (let i = 0; i < RECORDS_PER_MINUTE; i++) await send().expect(400);
    expect((await send().expect(429)).body.code).toBe('RATE_LIMITED');
  });
});

describe('migration 045 (positions registered by hand)', () => {
  it('marks every position kept so far as opened by the simulator', () => {
    const db = openDatabase(':memory:');
    migrate(
      db,
      migrations.filter((m) => m.version < 45)
    );
    db.exec(`
      INSERT INTO users (id, email, name, password_hash, created_at, email_verified)
        VALUES ('u1', 'u1@example.com', 'Uno', 'x', '2026-01-01T00:00:00Z', 1);
      INSERT INTO crypto_sim_portfolios (id, user_id, kind, season, initial_cents, cash_cents,
        fee_bps, started_at) VALUES ('f1', 'u1', 'practice', NULL, 10000000, 9000000, 10,
        '2026-10-01T00:00:00Z');
      INSERT INTO crypto_sim_positions (id, user_id, portfolio_id, symbol, quantity, entry_price,
        amount_cents, entry_fee_cents, open_type, opened_at)
        VALUES ('p1', 'u1', 'f1', 'BTC', 0.1, 50000, 500000, 500, 'market', '2026-10-01T09:00:00Z');
    `);
    migrate(db, migrations);
    expect(db.prepare('SELECT id, recorded FROM crypto_sim_positions').all()).toEqual([
      { id: 'p1', recorded: 0 },
    ]);
    expect(() => db.exec(`UPDATE crypto_sim_positions SET recorded = 2`)).toThrow(/CHECK/);
  });
});
