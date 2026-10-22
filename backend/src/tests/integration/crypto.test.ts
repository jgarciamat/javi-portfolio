import request from 'supertest';
import { loadConfig } from '@config/env';
import { MAX_PENDING_ORDERS, PENDING_MS } from '@domain/services/crypto-sim';
import { buildContainer } from '@infrastructure/container';
import { openDatabase } from '@infrastructure/sqlite/database';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import {
  STRONG_PASSWORD,
  TestContext,
  TestUser,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';
import { madridMonth, nextMonth } from '@domain/services/crypto-season';

// Every price here is made up: the fake market answers what each test sets.
const candle = (iso: string, open: number, high: number, low: number) => ({
  time: Date.parse(iso),
  open,
  high,
  low,
  close: open,
  volume: 1,
});

describe('Crypto console', () => {
  let ctx: TestContext;
  let user: TestUser;
  const get = (path: string) => request(ctx.app).get(`/api${path}`).set(user.auth);
  const post = (path: string, body: unknown) =>
    request(ctx.app)
      .post(`/api${path}`)
      .set(user.auth)
      .send(body as object);
  const buy = (body: Record<string, unknown>) =>
    post('/crypto/sim/orders', {
      action: 'buy',
      symbol: 'BTC',
      type: 'market',
      amount: 1000,
      ...body,
    });
  const sell = (positionId: string, body: Record<string, unknown> = {}) =>
    post('/crypto/sim/orders', { action: 'sell', positionId, type: 'market', ...body });
  const later = (ms: number) =>
    ctx.clock.set(new Date(ctx.clock.now().getTime() + ms).toISOString());

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
  });

  describe('market data', () => {
    it('uses invented data when configured so (development and end-to-end tests)', async () => {
      const db = openDatabase(':memory:');
      migrate(db, migrations);
      const demo = buildContainer(db, loadConfig({ NODE_ENV: 'test', CRYPTO_MARKET: 'demo' }));
      const coins = await demo.cryptoMarket.coins();
      expect(coins.market).toMatchObject({ available: true, source: 'demo' });
      expect(coins.coins.every((c) => c.price! > 0)).toBe(true);
      expect(buildContainer(db, loadConfig({ NODE_ENV: 'test' })).cryptoSim).toBeDefined();
    });

    it('needs a session', async () => {
      await request(ctx.app).get('/api/crypto/coins').expect(401);
      await request(ctx.app).get('/api/crypto/sim').expect(401);
    });

    it('lists every coin, with prices when the source answers', async () => {
      const res = await get('/crypto/coins').expect(200);
      expect(res.headers['cache-control']).toBe('private, max-age=15');
      expect(res.body.coins).toHaveLength(20);
      expect(res.body.coins[0]).toEqual({
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 50_000,
        changePercent24h: 1.5,
        high24h: 51_000,
        low24h: 48_500,
        bid: 49_999,
        ask: 50_001,
        volume24h: 1_000_000,
      });
      expect(res.body.coins[2]).toMatchObject({ symbol: 'BNB', price: null });
      expect(res.body.market).toEqual({
        available: true,
        source: 'binance',
        updatedAt: '2026-03-15T12:00:00.000Z',
        stale: false,
      });
      ctx.market.down = true;
      const down = await get('/crypto/coins').expect(200);
      expect(down.body.market).toMatchObject({ available: false, updatedAt: null });
      expect(down.body.coins[0].price).toBeNull();
    });

    it('gives the last 500 candles of a coin and size, and 503 when there are none', async () => {
      const many = Array.from({ length: 600 }, (_, i) =>
        candle(
          new Date(Date.parse('2026-03-01T00:00:00Z') + i * 3_600_000).toISOString(),
          1,
          2,
          0.5
        )
      );
      ctx.market.setCandles('ETH', many);
      const res = await get('/crypto/candles?symbol=ETH&interval=1h').expect(200);
      expect(res.body.candles).toHaveLength(500);
      expect(res.body.candles[0].time).toBe(many[100].time);
      expect(res.body).toMatchObject({
        symbol: 'ETH',
        interval: '1h',
        market: { available: true },
      });
      ctx.market.down = true;
      expect((await get('/crypto/candles?symbol=ETH&interval=1h').expect(503)).body.code).toBe(
        'MARKET_UNAVAILABLE'
      );
    });

    it('accepts only coins and sizes of the list', async () => {
      await get('/crypto/candles?symbol=FAKE&interval=1h').expect(400);
      await get('/crypto/candles?symbol=BTC&interval=2h').expect(400);
      await get('/crypto/candles?symbol=BTC&interval=1h&extra=1').expect(400);
    });
  });

  describe('simulator', () => {
    it('starts with 10.000 € of play money and a 0,10 % commission', async () => {
      const { body } = await get('/crypto/sim').expect(200);
      expect(body.account).toEqual({
        initial: 10_000,
        cash: 10_000,
        reserved: 0,
        feeBps: 10,
        startedAt: '2026-03-15T12:00:00.000Z',
      });
      expect(body.summary).toEqual({
        equity: 10_000,
        realized: 0,
        unrealized: 0,
        total: 0,
        totalPercent: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: null,
      });
      // The 14-day trial is Premium: 100 pending orders; the free plan, 20.
      expect(body.limits).toEqual({ pending: 100, open: 50, operations: 1000, pendingDays: 30 });
      expect(body.portfolio).toMatchObject({ kind: 'season', season: '2026-03' });
      expect(body.season).toMatchObject({
        month: '2026-03',
        startsAt: '2026-02-28T23:00:00.000Z',
        endsAt: '2026-03-31T22:00:00.000Z',
        daysLeft: 16,
        endingSoon: false,
        history: [],
      });
      expect(body.market).toMatchObject({ available: true, stale: false, source: 'binance' });
    });

    it('buys at market, shows the gain not yet realized and sells with a gain', async () => {
      const bought = await buy({ amount: 1000 }).expect(201);
      expect(bought.body.account.cash).toBe(8999);
      const [position] = bought.body.open;
      expect(position).toMatchObject({
        symbol: 'BTC',
        quantity: 0.02,
        entryPrice: 50_000,
        invested: 1000,
        entryFee: 1,
        openType: 'market',
        currentPrice: 50_000,
        value: 999,
        exitFee: 1,
        pnl: -2,
        pnlPercent: -0.2,
      });
      ctx.market.prices.set('BTC', 55_000);
      const now = (await get('/crypto/sim').expect(200)).body;
      expect(now.open[0]).toMatchObject({ value: 1098.9, pnl: 97.9 });
      expect(now.summary).toMatchObject({ equity: 10_097.9, unrealized: 97.9, total: 97.9 });

      const sold = await sell(position.id).expect(201);
      expect(sold.body.open).toEqual([]);
      expect(sold.body.closed[0]).toMatchObject({
        symbol: 'BTC',
        entryPrice: 50_000,
        exitPrice: 55_000,
        invested: 1000,
        fees: 2.1,
        proceeds: 1098.9,
        pnl: 97.9,
        pnlPercent: 9.78,
        openType: 'market',
        closeType: 'market',
      });
      expect(sold.body.account.cash).toBe(10_097.9);
      expect(sold.body.summary).toMatchObject({ realized: 97.9, trades: 1, wins: 1, winRate: 100 });
      expect((await sell(position.id).expect(404)).body.code).toBe('CRYPTO_POSITION_NOT_FOUND');
    });

    it('refuses a purchase without enough play money or below 1 €', async () => {
      expect((await buy({ amount: 10_000 }).expect(400)).body.code).toBe('CRYPTO_NO_BALANCE');
      await buy({ amount: 0.5 }).expect(400);
      expect((await buy({ amount: 9990 }).expect(201)).body.account.cash).toBe(0.01);
    });

    it('validates the orders strictly', async () => {
      await buy({ symbol: 'FAKE' }).expect(400);
      await buy({ price: 40_000 }).expect(400);
      await buy({ type: 'limit' }).expect(400);
      await buy({ extra: true }).expect(400);
      await buy({ amount: -5 }).expect(400);
      await sell('not-a-uuid').expect(400);
      await post('/crypto/sim/orders', { action: 'transfer' }).expect(400);
      const missing = await sell('00000000-0000-4000-8000-000000000000').expect(404);
      expect(missing.body.code).toBe('CRYPTO_POSITION_NOT_FOUND');
    });

    it('refuses pending orders that would fill at once or are far from the price', async () => {
      const wouldFill = await buy({ type: 'limit', price: 51_000 }).expect(400);
      expect(wouldFill.body).toMatchObject({
        code: 'CRYPTO_ORDER_WOULD_FILL',
        details: { current: 50_000 },
      });
      await buy({ type: 'stop', price: 49_000 }).expect(400);
      expect((await buy({ type: 'limit', price: 1 }).expect(400)).body.code).toBe(
        'CRYPTO_PRICE_OUT_OF_RANGE'
      );
    });

    it('keeps a pending purchase with its money reserved until the price reaches it', async () => {
      const placed = await buy({ type: 'limit', price: 45_000, amount: 900 }).expect(201);
      expect(placed.body.account).toMatchObject({ cash: 9099.1, reserved: 900.9 });
      expect(placed.body.summary.equity).toBe(10_000);
      const [order] = placed.body.pending;
      expect(order).toMatchObject({
        symbol: 'BTC',
        side: 'buy',
        type: 'limit',
        price: 45_000,
        amount: 900,
        reserved: 900.9,
        positionId: null,
        createdAt: '2026-03-15T12:00:00.000Z',
        expiresAt: '2026-04-14T12:00:00.000Z',
        currentPrice: 50_000,
      });

      later(5 * 60_000);
      ctx.market.setCandles('BTC', [
        candle('2026-03-15T12:01:00Z', 49_000, 49_500, 46_000),
        candle('2026-03-15T12:02:00Z', 46_000, 46_000, 44_000),
      ]);
      const { body } = await get('/crypto/sim').expect(200);
      expect(ctx.market.candleCalls).toContain('BTC:1m');
      expect(body.pending).toEqual([]);
      expect(body.fills).toEqual([
        {
          orderId: order.id,
          symbol: 'BTC',
          side: 'buy',
          direction: 'long',
          type: 'limit',
          price: 45_000,
          at: '2026-03-15T12:02:00.000Z',
        },
      ]);
      expect(body.open[0]).toMatchObject({
        quantity: 0.02,
        entryPrice: 45_000,
        entryFee: 0.9,
        openType: 'limit',
        openedAt: '2026-03-15T12:02:00.000Z',
      });
      expect(body.account).toMatchObject({ cash: 9099.1, reserved: 0 });
      expect((await get('/crypto/sim').expect(200)).body.fills).toEqual([]);
    });

    it('fills a pending order with the current price too', async () => {
      await buy({ type: 'stop', price: 52_000 }).expect(201);
      later(60_000);
      ctx.market.prices.set('BTC', 52_500);
      const { body } = await get('/crypto/sim').expect(200);
      expect(body.open[0]).toMatchObject({ entryPrice: 52_500, openType: 'stop' });
    });

    it('closes a purchase with its stop or its limit, whichever comes first', async () => {
      const position = (await buy({ amount: 1000 }).expect(201)).body.open[0];
      await sell(position.id, { type: 'limit', price: 60_000 }).expect(201);
      const both = await sell(position.id, { type: 'stop', price: 45_000 }).expect(201);
      expect(both.body.pending.map((o: { type: string }) => o.type).sort()).toEqual([
        'limit',
        'stop',
      ]);
      const twice = await sell(position.id, { type: 'stop', price: 44_000 }).expect(400);
      expect(twice.body.code).toBe('CRYPTO_DUPLICATE_ORDER');
      await sell(position.id, { type: 'stop', price: 51_000 }).expect(400);

      later(10 * 60_000);
      ctx.market.setCandles('BTC', [
        candle('2026-03-15T12:03:00Z', 50_000, 50_000, 44_000),
        candle('2026-03-15T12:04:00Z', 50_000, 61_000, 50_000),
      ]);
      const { body } = await get('/crypto/sim').expect(200);
      expect(body.pending).toEqual([]);
      expect(body.closed[0]).toMatchObject({ exitPrice: 45_000, closeType: 'stop' });
      expect(body.closed[0].pnl).toBeLessThan(0);
      expect(body.summary).toMatchObject({ trades: 1, wins: 0, losses: 1, winRate: 0 });
      expect(body.fills).toHaveLength(1);
    });

    it('takes the stop when the stop and the limit are reached in the same candle', async () => {
      const position = (await buy({}).expect(201)).body.open[0];
      await sell(position.id, { type: 'limit', price: 55_000 }).expect(201);
      await sell(position.id, { type: 'stop', price: 48_000 }).expect(201);
      later(5 * 60_000);
      ctx.market.setCandles('BTC', [candle('2026-03-15T12:02:00Z', 50_000, 56_000, 47_000)]);
      const { body } = await get('/crypto/sim').expect(200);
      expect(body.closed[0]).toMatchObject({ exitPrice: 48_000, closeType: 'stop' });
    });

    it('selling at market removes the pending orders of that purchase', async () => {
      const position = (await buy({}).expect(201)).body.open[0];
      await sell(position.id, { type: 'limit', price: 60_000 }).expect(201);
      const sold = await sell(position.id).expect(201);
      expect(sold.body.pending).toEqual([]);
    });

    it('cancels a pending order and gives the reserved money back', async () => {
      const placed = await buy({ type: 'limit', price: 40_000 }).expect(201);
      const id = placed.body.pending[0].id;
      const cancelled = await request(ctx.app)
        .delete(`/api/crypto/sim/orders/${id}`)
        .set(user.auth)
        .expect(200);
      expect(cancelled.body.pending).toEqual([]);
      expect(cancelled.body.account).toMatchObject({ cash: 10_000, reserved: 0 });
      const again = await request(ctx.app)
        .delete(`/api/crypto/sim/orders/${id}`)
        .set(user.auth)
        .expect(404);
      expect(again.body.code).toBe('CRYPTO_ORDER_NOT_FOUND');
      await request(ctx.app).delete('/api/crypto/sim/orders/nope').set(user.auth).expect(400);
    });

    it('cancelling a pending sale gives nothing back (nothing was reserved)', async () => {
      const position = (await buy({}).expect(201)).body.open[0];
      const placed = await sell(position.id, { type: 'limit', price: 60_000 }).expect(201);
      const cash = placed.body.account.cash;
      const res = await request(ctx.app)
        .delete(`/api/crypto/sim/orders/${placed.body.pending[0].id}`)
        .set(user.auth)
        .expect(200);
      expect(res.body.account.cash).toBe(cash);
    });

    it('lets a pending order expire after 30 days and returns the money', async () => {
      // A 31-day month, so the order expires before the season ends.
      ctx.clock.set('2026-01-01T12:00:00Z');
      await buy({ type: 'limit', price: 40_000 }).expect(201);
      later(PENDING_MS + 60_000);
      const { body } = await get('/crypto/sim').expect(200);
      expect(body.pending).toEqual([]);
      expect(body.fills[0]).toMatchObject({ type: 'expired', price: null });
      expect(body.account.cash).toBe(10_000);
      expect(ctx.market.candleCalls).toContain('BTC:1h');
    });

    it('limits the pending orders (20 on the free plan) and the open purchases', async () => {
      expireTrial(ctx, user);
      for (let i = 0; i < MAX_PENDING_ORDERS; i++) {
        await buy({ type: 'limit', price: 40_000 - i, amount: 10 }).expect(201);
      }
      const full = await buy({ type: 'limit', price: 30_000, amount: 10 }).expect(400);
      expect(full.body.code).toBe('CRYPTO_TOO_MANY_PENDING');
      expect(full.body.error).toContain('con Premium, hasta 100');
      const position = (await buy({ amount: 10 }).expect(201)).body.open[0];
      const sale = await sell(position.id, { type: 'limit', price: 60_000 }).expect(400);
      expect(sale.body.code).toBe('CRYPTO_TOO_MANY_PENDING');

      for (let i = 0; i < 49; i++) await buy({ amount: 10 }).expect(201);
      expect((await buy({ amount: 10 }).expect(400)).body.code).toBe('CRYPTO_TOO_MANY_OPEN');
    });

    it('stops at 1.000 operations in a month', async () => {
      const repo = ctx.container.repos.cryptoSim;
      const portfolioId = (await get('/crypto/sim').expect(200)).body.portfolio.id as string;
      for (let i = 0; i < 1000; i++) {
        repo.insertPosition({
          id: `p${i}`,
          userId: user.id,
          portfolioId,
          symbol: 'BTC',
          direction: 'long',
          quantity: 1,
          entryPrice: 1,
          amountCents: 100,
          entryFeeCents: 0,
          openType: 'market',
          openedAt: '2026-03-01T00:00:00.000Z',
          exitPrice: null,
          exitFeeCents: null,
          proceedsCents: null,
          pnlCents: null,
          closeType: null,
          closedAt: null,
        });
      }
      const full = await buy({ amount: 10 }).expect(400);
      expect(full.body.code).toBe('CRYPTO_HISTORY_FULL');
      expect(full.body.error).toContain('este mes');
    });

    it('never restarts the official season and has no commission setting any more', async () => {
      await buy({}).expect(201);
      const reset = await post('/crypto/sim/reset', { initial: 100_000, feeBps: 50 }).expect(400);
      expect(reset.body.code).toBe('CRYPTO_SEASON_NO_RESET');
      await post('/crypto/sim/reset', { initial: 5000 }).expect(400);
      await request(ctx.app)
        .patch('/api/crypto/sim/settings')
        .set(user.auth)
        .send({ feeBps: 100 })
        .expect(404);
      expect((await get('/crypto/sim').expect(200)).body.open).toHaveLength(1);
    });

    it('does not trade with prices that are not up to date, but still shows the portfolio', async () => {
      await buy({}).expect(201);
      ctx.market.stale = true;
      expect((await buy({}).expect(503)).body.code).toBe('CRYPTO_PRICES_STALE');
      ctx.market.stale = false;
      ctx.market.prices.delete('ETH');
      expect((await buy({ symbol: 'ETH' }).expect(503)).body.code).toBe('CRYPTO_PRICES_STALE');
      ctx.market.down = true;
      const { body } = await get('/crypto/sim').expect(200);
      expect(body.market).toMatchObject({ available: false, updatedAt: null });
      expect(body.open[0]).toMatchObject({ currentPrice: null, value: null, pnl: null });
      expect(body.summary).toMatchObject({ equity: null, unrealized: null, total: null });
      expect((await buy({}).expect(503)).body.code).toBe('CRYPTO_PRICES_STALE');
    });

    it('keeps pending orders when the source is down and resolves them later', async () => {
      await buy({ type: 'limit', price: 45_000 }).expect(201);
      ctx.market.down = true;
      later(60_000);
      expect((await get('/crypto/sim').expect(200)).body.pending).toHaveLength(1);
      ctx.market.down = false;
      ctx.market.prices.set('BTC', 44_000);
      expect((await get('/crypto/sim').expect(200)).body.open).toHaveLength(1);
    });

    it('does not fill with a last price older than two minutes', async () => {
      await buy({ type: 'limit', price: 45_000 }).expect(201);
      ctx.market.prices.set('BTC', 44_000);
      const tickers = ctx.market.tickers.bind(ctx.market);
      ctx.market.tickers = async () => ({
        ...(await tickers()),
        updatedAt: '2026-03-15T11:00:00.000Z',
      });
      later(60_000);
      expect((await get('/crypto/sim').expect(200)).body.pending).toHaveLength(1);
    });

    it('keeps each person apart', async () => {
      const other = await createUser(ctx);
      const position = (await buy({}).expect(201)).body.open[0];
      const foreign = await request(ctx.app)
        .post('/api/crypto/sim/orders')
        .set(other.auth)
        .send({ action: 'sell', positionId: position.id, type: 'market' })
        .expect(404);
      expect(foreign.body.code).toBe('CRYPTO_POSITION_NOT_FOUND');
      const theirs = await request(ctx.app).get('/api/crypto/sim').set(other.auth).expect(200);
      expect(theirs.body.open).toEqual([]);
    });
  });

  describe('take profit and stop loss', () => {
    it('leaves a limit and a stop sale with a market purchase', async () => {
      const { body } = await buy({ takeProfit: 60_000, stopLoss: 45_000 }).expect(201);
      const position = body.open[0].id;
      expect(
        body.pending.map((o: { type: string; price: number; positionId: string }) => [
          o.type,
          o.price,
          o.positionId,
        ])
      ).toEqual(
        expect.arrayContaining([
          ['limit', 60_000, position],
          ['stop', 45_000, position],
        ])
      );
    });

    it('checks that they are on the right side of the price', async () => {
      expect((await buy({ takeProfit: 49_000 }).expect(400)).body.code).toBe(
        'CRYPTO_TAKE_PROFIT_SIDE'
      );
      expect((await buy({ stopLoss: 51_000 }).expect(400)).body.code).toBe('CRYPTO_STOP_LOSS_SIDE');
      expect((await buy({ stopLoss: 1 }).expect(400)).body.code).toBe('CRYPTO_PRICE_OUT_OF_RANGE');
      await post('/crypto/sim/orders', {
        action: 'sell',
        positionId: '00000000-0000-4000-8000-000000000000',
        type: 'market',
        takeProfit: 1,
      }).expect(400);
      expect((await get('/crypto/sim').expect(200)).body.open).toEqual([]);
    });

    it('counts them among the pending orders', async () => {
      expireTrial(ctx, user);
      for (let i = 0; i < MAX_PENDING_ORDERS - 1; i++) {
        await buy({ type: 'limit', price: 40_000 - i, amount: 10 }).expect(201);
      }
      const full = await buy({ amount: 10, takeProfit: 60_000, stopLoss: 45_000 }).expect(400);
      expect(full.body.code).toBe('CRYPTO_TOO_MANY_PENDING');
      expect((await get('/crypto/sim').expect(200)).body.open).toEqual([]);
    });

    it('a pending purchase keeps them and leaves them once filled', async () => {
      const placed = await buy({
        type: 'limit',
        price: 45_000,
        takeProfit: 52_000,
        stopLoss: 40_000,
      }).expect(201);
      expect(placed.body.pending[0]).toMatchObject({ takeProfit: 52_000, stopLoss: 40_000 });
      expect(
        (await buy({ type: 'limit', price: 45_000, takeProfit: 44_000 }).expect(400)).body.code
      ).toBe('CRYPTO_TAKE_PROFIT_SIDE');
      later(5 * 60_000);
      ctx.market.setCandles('BTC', [candle('2026-03-15T12:02:00Z', 46_000, 46_000, 44_000)]);
      const { body } = await get('/crypto/sim').expect(200);
      expect(body.open).toHaveLength(1);
      expect(body.pending.map((o: { type: string }) => o.type).sort()).toEqual(['limit', 'stop']);
      expect(body.pending[0]).toMatchObject({
        side: 'sell',
        createdAt: '2026-03-15T12:02:00.000Z',
      });
      // Only the take profit, or neither.
      await buy({ type: 'stop', price: 52_000, takeProfit: 55_000 }).expect(201);
      await buy({ type: 'stop', price: 53_000, stopLoss: 49_000 }).expect(201);
    });
  });

  describe('short positions (1x, play money)', () => {
    const short = (body: Record<string, unknown> = {}) => buy({ direction: 'short', ...body });

    it('gains when the price falls and keeps the amount as its guarantee', async () => {
      const opened = await short({ amount: 1000 }).expect(201);
      expect(opened.body.account.cash).toBe(8999);
      expect(opened.body.open[0]).toMatchObject({
        direction: 'short',
        quantity: 0.02,
        entryPrice: 50_000,
        liquidationPrice: 100_000,
        value: 999,
        pnl: -2,
      });
      ctx.market.prices.set('BTC', 45_000);
      const now = (await get('/crypto/sim').expect(200)).body;
      expect(now.open[0]).toMatchObject({ value: 1099.1, pnl: 98.1 });
      const closed = await sell(now.open[0].id).expect(201);
      expect(closed.body.closed[0]).toMatchObject({
        direction: 'short',
        exitPrice: 45_000,
        proceeds: 1099.1,
        pnl: 98.1,
        closeType: 'market',
      });
      expect(closed.body.account.cash).toBe(10_098.1);
    });

    it('loses when the price rises, with take profit below and stop loss above', async () => {
      expect((await short({ takeProfit: 55_000 }).expect(400)).body.code).toBe(
        'CRYPTO_TAKE_PROFIT_SIDE'
      );
      expect((await short({ stopLoss: 45_000 }).expect(400)).body.code).toBe(
        'CRYPTO_STOP_LOSS_SIDE'
      );
      const { body } = await short({ takeProfit: 40_000, stopLoss: 55_000 }).expect(201);
      expect(
        body.pending.map((o: { side: string; type: string; direction: string }) => [
          o.side,
          o.type,
          o.direction,
        ])
      ).toEqual(
        expect.arrayContaining([
          ['buy', 'limit', 'short'],
          ['buy', 'stop', 'short'],
        ])
      );
      later(5 * 60_000);
      ctx.market.setCandles('BTC', [candle('2026-03-15T12:02:00Z', 50_000, 56_000, 49_000)]);
      const after = (await get('/crypto/sim').expect(200)).body;
      expect(after.closed[0]).toMatchObject({
        direction: 'short',
        exitPrice: 55_000,
        closeType: 'stop',
      });
      expect(after.closed[0].pnl).toBeLessThan(0);
      expect(after.fills[0]).toMatchObject({ side: 'buy', direction: 'short', type: 'stop' });
    });

    it('closes by itself when the price doubles, never losing more than the guarantee', async () => {
      const opened = await short({ amount: 1000 }).expect(201);
      later(5 * 60_000);
      ctx.market.setCandles('BTC', [candle('2026-03-15T12:02:00Z', 50_000, 120_000, 49_000)]);
      const { body } = await get('/crypto/sim').expect(200);
      expect(body.open).toEqual([]);
      expect(body.closed[0]).toMatchObject({
        exitPrice: 100_000,
        closeType: 'liquidation',
        proceeds: 0,
        pnl: -1001,
      });
      expect(body.fills[0]).toMatchObject({
        orderId: opened.body.open[0].id,
        type: 'liquidation',
      });
      expect(body.account.cash).toBe(8999);
    });

    it('opens pending shorts with a limit above or a stop below the price', async () => {
      expect((await short({ type: 'limit', price: 49_000 }).expect(400)).body.code).toBe(
        'CRYPTO_ORDER_WOULD_FILL'
      );
      const placed = await short({ type: 'limit', price: 52_000, stopLoss: 60_000 }).expect(201);
      expect(placed.body.pending[0]).toMatchObject({ side: 'sell', direction: 'short' });
      await short({ type: 'stop', price: 48_000 }).expect(201);
      later(5 * 60_000);
      ctx.market.setCandles('BTC', [candle('2026-03-15T12:02:00Z', 50_000, 53_000, 50_000)]);
      const { body } = await get('/crypto/sim').expect(200);
      expect(body.open[0]).toMatchObject({ direction: 'short', entryPrice: 52_000 });
      expect(
        body.pending.find((o: { positionId: string | null }) => o.positionId === body.open[0].id)
      ).toMatchObject({ side: 'buy', type: 'stop', price: 60_000 });
      const cover = await sell(body.open[0].id, { type: 'limit', price: 45_000 }).expect(201);
      expect(
        cover.body.pending.some(
          (o: { side: string; type: string }) => o.side === 'buy' && o.type === 'limit'
        )
      ).toBe(true);
      await short({ direction: 'sideways' }).expect(400);
    });
  });

  describe('calendar months', () => {
    it('counts months in Spanish time', () => {
      expect(madridMonth(new Date('2026-03-31T22:30:00Z'))).toBe('2026-04');
      expect(madridMonth(new Date('2026-03-31T21:30:00Z'))).toBe('2026-03');
      expect(nextMonth('2026-12')).toBe('2027-01');
      expect(nextMonth('2026-03')).toBe('2026-04');
    });
  });

  describe('personal data', () => {
    it('goes in the data export and is deleted with the account', async () => {
      const position = (await buy({}).expect(201)).body.open[0];
      await sell(position.id, { type: 'limit', price: 60_000 }).expect(201);
      const exported = await get('/export').expect(200);
      expect(exported.body.cryptoSimulator).toMatchObject({
        ranking: null,
        portfolios: [
          {
            kind: 'season',
            season: '2026-03',
            initial: 10_000,
            cash: 8999,
            feeBps: 10,
            operations: [
              { symbol: 'BTC', invested: 1000, entryFee: 1, exitFee: null, result: null },
            ],
            pendingOrders: [
              { side: 'sell', type: 'limit', price: 60_000, amount: null, reserved: 0 },
            ],
          },
        ],
        seasonResults: [],
        badges: [{ badge: 'firstTrade' }],
        priceAlerts: [],
      });

      await request(ctx.app)
        .delete('/api/profile/account')
        .set(user.auth)
        .send({ password: STRONG_PASSWORD })
        .expect(204);
      const count = (table: string) =>
        (ctx.container.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
      expect(count('crypto_sim_portfolios')).toBe(0);
      expect(count('crypto_sim_badges')).toBe(0);
      expect(count('crypto_sim_equity_days')).toBe(0);
      expect(count('crypto_sim_positions')).toBe(0);
      expect(count('crypto_sim_orders')).toBe(0);
    });

    it('exports nothing for somebody who never opened the simulator', async () => {
      expect((await get('/export').expect(200)).body.cryptoSimulator).toBeNull();
    });
  });
});
