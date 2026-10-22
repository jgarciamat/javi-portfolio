import request from 'supertest';
import { BinanceMarketData } from '@infrastructure/market/BinanceMarketData';
import { createTestApp, createUser, TestContext, TestUser } from '../helpers/testApp';

/**
 * A coin quoted in USDT through the real adapter (fake HTTP, made-up numbers): the price of the
 * list, the chart and the simulator are the same conversion, and a pending stop is resolved
 * with the converted candles. Made-up ECB rate: 1 € = 1,25 US$ (5 USDT are 4 €).
 */
const kline = (iso: string, open: number, high: number, low: number, close: number) => [
  Date.parse(iso),
  String(open),
  String(high),
  String(low),
  String(close),
  '100',
];
const ticker = (symbol: string, last: number) => ({
  symbol,
  lastPrice: String(last),
  priceChangePercent: '1',
  highPrice: String(last * 1.1),
  lowPrice: String(last * 0.9),
  bidPrice: String(last),
  askPrice: String(last),
  quoteVolume: '1000000',
});

describe('Crypto console with a coin quoted in USDT', () => {
  let ctx: TestContext;
  let user: TestUser;
  let nearLast = 5;
  let nearCandles: unknown[] = [];
  const asked: string[] = [];
  const http = (async (url: string) => {
    asked.push(url);
    const body = url.includes('/ticker/24hr')
      ? [ticker('BTCEUR', 50_000), ticker('NEARUSDT', nearLast)]
      : url.includes('symbol=NEARUSDT')
        ? nearCandles
        : [];
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  const get = (path: string) => request(ctx.app).get(`/api${path}`).set(user.auth);
  const order = (body: Record<string, unknown>) =>
    request(ctx.app).post('/api/crypto/sim/orders').set(user.auth).send(body);
  const later = (ms: number) =>
    ctx.clock.set(new Date(ctx.clock.now().getTime() + ms).toISOString());

  beforeEach(async () => {
    nearLast = 5;
    nearCandles = [kline('2026-03-15T11:59:00Z', 5, 5, 5, 5)];
    ctx = createTestApp({
      now: '2026-03-15T12:00:00Z',
      marketData: (clock) =>
        new BinanceMarketData(
          http,
          ['https://a.test'],
          () => clock.now().getTime(),
          { warn: () => undefined },
          { rates: { rate: async () => 1.25 } }
        ),
    });
    user = await createUser(ctx);
  });

  it('shows, buys and stops out at the same converted prices', async () => {
    const coins = await get('/crypto/coins').expect(200);
    expect(coins.body.market.usdPerEur).toBe(1.25);
    const near = coins.body.coins.find((c: { symbol: string }) => c.symbol === 'NEAR');
    expect(near).toMatchObject({ price: 4, quote: 'USDT', volume24h: 800_000 });
    expect(asked.some((u) => u.includes('NEAREUR'))).toBe(false);

    const bought = await order({
      action: 'buy',
      symbol: 'NEAR',
      type: 'market',
      amount: 1000,
      stopLoss: 3.7,
    }).expect(201);
    const position = bought.body.open[0];
    expect(position).toMatchObject({ symbol: 'NEAR', entryPrice: 4 });

    // 4,65 USDT (3,72 €) does not reach the stop of 3,70 €; 4,60 USDT (3,68 €) does.
    later(5 * 60_000);
    nearLast = 4.75;
    nearCandles = [
      kline('2026-03-15T12:01:00Z', 5, 5, 4.65, 4.7),
      kline('2026-03-15T12:03:00Z', 4.7, 4.75, 4.6, 4.75),
    ];
    const chart = await get('/crypto/candles?symbol=NEAR&interval=1m').expect(200);
    expect(chart.body.quote).toBe('USDT');
    expect(chart.body.candles.map((c: { low: number }) => c.low)).toEqual([3.72, 3.68]);

    later(60_000);
    const { body } = await get('/crypto/sim').expect(200);
    expect(body.open).toEqual([]);
    expect(body.closed[0]).toMatchObject({
      symbol: 'NEAR',
      exitPrice: 3.7,
      closeType: 'stop',
      closedAt: '2026-03-15T12:03:00.000Z',
    });
  });
});
