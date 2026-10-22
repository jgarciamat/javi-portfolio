import {
  BINANCE_HOSTS,
  BinanceMarketData,
  parseKline,
  parseTicker,
} from '@infrastructure/market/BinanceMarketData';
import { DemoMarketData, demoPrice } from '@infrastructure/market/DemoMarketData';
import { MarketCache, STALE_FOR_MS } from '@infrastructure/market/MarketCache';
import { CRYPTO_SYMBOLS, INTERVAL_MS } from '@domain/services/crypto-market';

// Made-up rows in the shape of the public API (strings for the numbers).
const kline = (time: number, o = '10', h = '12', l = '9', c = '11', v = '3.5') => [
  time,
  o,
  h,
  l,
  c,
  v,
  time + 59_999,
  '0',
];
const ticker = (symbol: string, last = '100.5') => ({
  symbol,
  lastPrice: last,
  priceChangePercent: '-2.5',
  highPrice: '110',
  lowPrice: '90',
  bidPrice: '100.4',
  askPrice: '100.6',
  quoteVolume: '12345.5',
});
const reply = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});
const quiet = { warn: jest.fn() };

describe('parsing the public market data', () => {
  it('reads a candle and refuses malformed or impossible ones', () => {
    expect(parseKline(kline(1000))).toEqual({
      time: 1000,
      open: 10,
      high: 12,
      low: 9,
      close: 11,
      volume: 3.5,
    });
    expect(parseKline('row')).toBeNull();
    expect(parseKline(['x', '1', '1', '1', '1', '1'])).toBeNull();
    expect(parseKline(kline(1, '0'))).toBeNull();
    expect(parseKline(kline(1, '10', '12', '9', '11', '-1'))).toBeNull();
    expect(parseKline([1, '10', '12', '9', '11', 5])).toBeNull();
    expect(parseKline(kline(1, '10', '8', '9', '11'))).toBeNull();
    expect(parseKline(kline(1, '10', '12', '10.5', '11'))).toBeNull();
  });

  it('reads a coin of the list and refuses others', () => {
    expect(parseTicker(ticker('BTCEUR'))).toEqual({
      symbol: 'BTC',
      price: 100.5,
      changePercent24h: -2.5,
      high24h: 110,
      low24h: 90,
      bid: 100.4,
      ask: 100.6,
      volume24h: 12345.5,
    });
    expect(
      parseTicker({ ...ticker('BTCEUR'), bidPrice: '0', askPrice: 'x', quoteVolume: undefined })
    ).toMatchObject({ bid: null, ask: null, volume24h: null });
    expect(parseTicker(null)).toBeNull();
    expect(parseTicker(ticker('FAKEEUR'))).toBeNull();
    expect(parseTicker({ ...ticker('BTCEUR'), symbol: 7 })).toBeNull();
    expect(parseTicker(ticker('BTCEUR', 'abc'))).toBeNull();
    expect(parseTicker({ ...ticker('BTCEUR'), priceChangePercent: 3 })).toBeNull();
  });
});

describe('BinanceMarketData', () => {
  it('asks the public host for candles in euros and caches them', async () => {
    const http = jest.fn().mockResolvedValue(reply([kline(2000), kline(1000), 'junk']));
    let now = 0;
    const market = new BinanceMarketData(http, ['https://a.test'], () => now, quiet);
    const first = await market.candles('BTC', '1h');
    expect(first.data.map((c) => c.time)).toEqual([1000, 2000]);
    expect(first).toMatchObject({ source: 'binance', stale: false });
    expect(http.mock.calls[0][0]).toBe(
      'https://a.test/klines?symbol=BTCEUR&interval=1h&limit=1000'
    );
    await market.candles('BTC', '1h');
    expect(http).toHaveBeenCalledTimes(1);
    now += 61_000;
    await market.candles('BTC', '1h');
    expect(http).toHaveBeenCalledTimes(2);
  });

  it('uses the next host when the first does not answer', async () => {
    const http = jest
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(reply([ticker('BTCEUR'), ticker('ETHEUR', '5')]));
    const market = new BinanceMarketData(
      http,
      ['https://a.test', 'https://b.test'],
      Date.now,
      quiet
    );
    const feed = await market.tickers();
    expect(feed.data.map((t) => t.symbol)).toEqual(['BTC', 'ETH']);
    expect(http.mock.calls[1][0]).toMatch(/^https:\/\/b\.test\/ticker\/24hr\?symbols=%5B%22BTCEUR/);
  });

  it('shows an older copy marked stale when the source fails, and fails without one', async () => {
    let now = 0;
    const http = jest.fn().mockResolvedValueOnce(reply([ticker('BTCEUR')]));
    const market = new BinanceMarketData(http, ['https://a.test'], () => now, quiet);
    await market.tickers();
    http.mockResolvedValue(reply({}, false, 500));
    now += 20_000;
    expect(await market.tickers()).toMatchObject({
      stale: true,
      updatedAt: new Date(0).toISOString(),
    });
    now += STALE_FOR_MS;
    await expect(market.tickers()).rejects.toMatchObject({ code: 'MARKET_UNAVAILABLE' });
    await expect(market.candles('ETH', '1d')).rejects.toMatchObject({ code: 'MARKET_UNAVAILABLE' });
    expect(quiet.warn).toHaveBeenCalled();
  });

  it('treats an answer without valid rows as a failure', async () => {
    const http = jest.fn().mockResolvedValue(reply({ message: 'nope' }));
    const market = new BinanceMarketData(http, ['https://a.test'], Date.now, quiet);
    await expect(market.candles('BTC', '5m')).rejects.toMatchObject({ code: 'MARKET_UNAVAILABLE' });
    await expect(market.tickers()).rejects.toMatchObject({ code: 'MARKET_UNAVAILABLE' });
    await expect(new BinanceMarketData(http, [], Date.now, quiet).tickers()).rejects.toMatchObject({
      code: 'MARKET_UNAVAILABLE',
    });
  });

  it('defaults to the public data host first', () => {
    expect(BINANCE_HOSTS[0]).toBe('https://data-api.binance.vision/api/v3');
    expect(new BinanceMarketData().source).toBe('binance');
  });
});

describe('MarketCache', () => {
  it('shares one request between callers that miss at the same time', async () => {
    const cache = new MarketCache('demo');
    let calls = 0;
    const load = async () => ++calls;
    const [a, b] = await Promise.all([cache.get('k', 1000, load), cache.get('k', 1000, load)]);
    expect([a.data, b.data, calls]).toEqual([1, 1, 1]);
    expect(a.source).toBe('demo');
  });
});

describe('DemoMarketData', () => {
  const now = Date.parse('2026-03-15T12:34:00Z');
  const demo = new DemoMarketData(() => now);

  it('invents candles that end now and agree with each other', async () => {
    const feed = await demo.candles('BTC', '1h');
    expect(feed).toMatchObject({ source: 'demo', stale: false });
    expect(feed.data).toHaveLength(1000);
    const last = feed.data.at(-1)!;
    expect(last.time).toBe(Date.parse('2026-03-15T12:00:00Z'));
    expect(last.close).toBeCloseTo(demoPrice('BTC', now));
    for (const c of feed.data) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
    }
    expect(feed.data[1].time - feed.data[0].time).toBe(INTERVAL_MS['1h']);
  });

  it('gives a price and a daily change for every coin', async () => {
    const feed = await demo.tickers();
    expect(feed.data.map((t) => t.symbol)).toEqual(CRYPTO_SYMBOLS);
    for (const t of feed.data) {
      expect(t.price).toBeGreaterThan(0);
      expect(t.high24h).toBeGreaterThanOrEqual(t.low24h);
      expect(Number.isFinite(t.changePercent24h)).toBe(true);
    }
    expect(new DemoMarketData().source).toBe('demo');
  });
});
