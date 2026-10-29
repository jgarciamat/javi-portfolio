import request from 'supertest';
import { BinanceMarketData } from '@infrastructure/market/BinanceMarketData';
import { LIVE_PER_MINUTE } from '@infrastructure/http/routes/crypto.routes';
import { TestContext, createTestApp, createUser } from '../helpers/testApp';

// Every price here is made up: the fake market answers what each test sets.
const candle = (iso: string, open: number, close: number) => ({
  time: Date.parse(iso),
  open,
  high: Math.max(open, close) + 1,
  low: Math.min(open, close) - 1,
  close,
  volume: 2,
});

describe('Crypto console: the live tick of the chart', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestApp({ now: '2026-03-15T12:00:30Z' });
    ctx.market.setCandles('BTC', [
      candle('2026-03-15T11:58:00Z', 49_900, 49_950),
      candle('2026-03-15T11:59:00Z', 49_950, 50_010),
      candle('2026-03-15T12:00:00Z', 50_010, 50_020),
    ]);
    ctx.market.setCandles('NEAR', [candle('2026-03-15T12:00:00Z', 4, 4.2)]);
  });

  const get = async (path: string, ctxApp = ctx) => {
    const user = await createUser(ctxApp);
    return request(ctxApp.app).get(`/api${path}`).set(user.auth);
  };

  it('needs a session', async () => {
    await request(ctx.app).get('/api/crypto/live?symbol=BTC&interval=1m').expect(401);
  });

  it('gives the last price and the candle in progress with the one before, never cached', async () => {
    const res = await get('/crypto/live?symbol=BTC&interval=1m');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({
      symbol: 'BTC',
      interval: '1m',
      quote: 'EUR',
      price: 50_020,
      candles: [
        candle('2026-03-15T11:59:00Z', 49_950, 50_010),
        candle('2026-03-15T12:00:00Z', 50_010, 50_020),
      ],
      market: {
        available: true,
        source: 'binance',
        updatedAt: '2026-03-15T12:00:30.000Z',
        stale: false,
        usdPerEur: null,
      },
    });
    // A few hundred bytes, against tens of KB for the whole series.
    expect(JSON.stringify(res.body).length).toBeLessThan(600);
  });

  it('says the rate a USDT coin was converted with, the same as its candles', async () => {
    const tick = await get('/crypto/live?symbol=NEAR&interval=15m');
    const series = await get('/crypto/candles?symbol=NEAR&interval=15m');
    expect(tick.body).toMatchObject({ quote: 'USDT', price: 4.2, market: { usdPerEur: 1.1 } });
    expect(tick.body.market.usdPerEur).toBe(series.body.market.usdPerEur);
    expect(tick.body.candles.at(-1)).toEqual(series.body.candles.at(-1));
  });

  it('accepts only coins and sizes of the list', async () => {
    for (const query of [
      'symbol=FAKE&interval=1m',
      'symbol=BTC&interval=2m',
      'symbol=BTC',
      'symbol=BTC&interval=1m&extra=1',
      'symbol=btc%27--&interval=1m',
    ])
      expect((await get(`/crypto/live?${query}`)).status).toBe(400);
  });

  it('answers 503 when the source is down and nothing is kept', async () => {
    ctx.market.down = true;
    const res = await get('/crypto/live?symbol=BTC&interval=1m');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('MARKET_UNAVAILABLE');
  });

  it('shares one request to the source between everybody watching the same coin and size', async () => {
    const http = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        [Date.parse('2026-03-15T11:59:00Z'), '50000', '50100', '49900', '50050', '3', 0, '0'],
        [Date.parse('2026-03-15T12:00:00Z'), '50050', '50080', '50000', '50070', '1', 0, '0'],
      ],
    });
    const shared = createTestApp({
      now: '2026-03-15T12:00:30Z',
      marketData: (clock) =>
        new BinanceMarketData(http, ['https://a.test'], () => clock.now().getTime(), {
          warn: jest.fn(),
        }),
    });
    const people = await Promise.all([1, 2, 3, 4, 5].map(() => createUser(shared)));
    const answers = await Promise.all(
      people.map((p) =>
        request(shared.app).get('/api/crypto/live?symbol=BTC&interval=1m').set(p.auth)
      )
    );
    expect(answers.map((a) => a.body.price)).toEqual([50_070, 50_070, 50_070, 50_070, 50_070]);
    expect(http).toHaveBeenCalledTimes(1);
    // Two seconds later, one more for all of them.
    shared.clock.set('2026-03-15T12:00:32Z');
    for (const p of people)
      await request(shared.app).get('/api/crypto/live?symbol=BTC&interval=1m').set(p.auth);
    expect(http).toHaveBeenCalledTimes(2);
  });

  it('limits ticks per person outside tests, apart from the other reads and from other people', async () => {
    const live = createTestApp({ env: { NODE_ENV: 'development' } });
    live.market.setCandles('BTC', [candle('2026-03-15T12:00:00Z', 1, 2)]);
    const [ana, bea] = [await createUser(live), await createUser(live)];
    const tick = (who: typeof ana) =>
      request(live.app).get('/api/crypto/live?symbol=BTC&interval=1m').set(who.auth);
    for (let i = 0; i < LIVE_PER_MINUTE; i++) await tick(ana).expect(200);
    expect((await tick(ana).expect(429)).body.code).toBe('RATE_LIMITED');
    // Her other reads and somebody else's ticks are untouched.
    await request(live.app).get('/api/crypto/coins').set(ana.auth).expect(200);
    await request(live.app)
      .get('/api/crypto/candles?symbol=BTC&interval=1m')
      .set(ana.auth)
      .expect(200);
    await tick(bea).expect(200);
  });

  it('does not use up the general limit of a network: several people behind one IP keep working', async () => {
    const live = createTestApp({ env: { NODE_ENV: 'development' } });
    live.market.setCandles('BTC', [candle('2026-03-15T12:00:00Z', 1, 2)]);
    const people = await Promise.all([1, 2, 3, 4, 5, 6].map(() => createUser(live)));
    // 6 × 60 = 360 ticks from one IP: more than the general 300 a minute.
    for (const p of people)
      for (let i = 0; i < LIVE_PER_MINUTE; i++)
        await request(live.app)
          .get('/api/crypto/live?symbol=BTC&interval=1m')
          .set(p.auth)
          .expect(200);
    await request(live.app).get('/api/crypto/sim').set(people[0].auth).expect(200);
  });
});
