import {
  BINANCE_HOSTS,
  BinanceMarketData,
  CallBudget,
  LIVE_CALLS_PER_MINUTE,
  LIVE_TTL,
  RATE_KEPT_FOR_MS,
  RATE_RETRY_MS,
  ReferenceRate,
  THIN_EURO_VOLUME,
  convertCandle,
  convertTicker,
  pairsOf,
  parseKline,
  parseTicker,
  toEuros,
} from '@infrastructure/market/BinanceMarketData';
import { DemoMarketData, demoCandle, demoPrice } from '@infrastructure/market/DemoMarketData';
import { MarketCache, STALE_FOR_MS } from '@infrastructure/market/MarketCache';
import {
  CRYPTO_SYMBOLS,
  EURO_PAIRS,
  INTERVAL_MS,
  MARKET_SOURCE_VERSION,
  quoteOf,
} from '@domain/services/crypto-market';
import { ExchangeRates } from '@domain/ports/services';

const PAIRS = pairsOf(EURO_PAIRS);
/** Made-up ECB rate: 1 € = 1,25 US$ (so 10 USDT are 8 €). */
const fixedRate = (rate = 1.25): ExchangeRates & { calls: number } => {
  const rates = {
    calls: 0,
    rate: async () => {
      rates.calls++;
      return rate;
    },
  };
  return rates;
};

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
    expect(parseTicker(ticker('BTCEUR'), PAIRS)).toEqual({
      symbol: 'BTC',
      price: 100.5,
      changePercent24h: -2.5,
      high24h: 110,
      low24h: 90,
      bid: 100.4,
      ask: 100.6,
      volume24h: 12345.5,
      quote: 'EUR',
    });
    expect(
      parseTicker(
        { ...ticker('BTCEUR'), bidPrice: '0', askPrice: 'x', quoteVolume: undefined },
        PAIRS
      )
    ).toMatchObject({ bid: null, ask: null, volume24h: null });
    expect(parseTicker(ticker('NEARUSDT'), PAIRS)).toMatchObject({ symbol: 'NEAR', quote: 'USDT' });
    expect(parseTicker(null, PAIRS)).toBeNull();
    expect(parseTicker(ticker('FAKEEUR'), PAIRS)).toBeNull();
    // Only the pair of the plan: NEAR in euros and BTC in USDT were not asked for.
    expect(parseTicker(ticker('NEAREUR'), PAIRS)).toBeNull();
    expect(parseTicker(ticker('BTCUSDT'), PAIRS)).toBeNull();
    expect(parseTicker({ ...ticker('BTCEUR'), symbol: 7 }, PAIRS)).toBeNull();
    expect(parseTicker(ticker('BTCEUR', 'abc'), PAIRS)).toBeNull();
    expect(parseTicker({ ...ticker('BTCEUR'), priceChangePercent: 3 }, PAIRS)).toBeNull();
  });
});

describe('the plan of sources', () => {
  it('keeps the liquid euro pairs and quotes the rest in USDT', () => {
    expect(MARKET_SOURCE_VERSION).toBe(2);
    expect(EURO_PAIRS).toEqual(['BTC', 'ETH']);
    expect(quoteOf('BTC', EURO_PAIRS)).toBe('EUR');
    expect(quoteOf('NEAR', EURO_PAIRS)).toBe('USDT');
    expect(PAIRS.get('NEARUSDT')).toEqual({ symbol: 'NEAR', quote: 'USDT' });
    expect(PAIRS.get('BONKUSDT')).toEqual({ symbol: 'BONK', quote: 'USDT' });
    expect(PAIRS.has('NEAREUR')).toBe(false);
    // One pair per coin.
    expect(PAIRS.size).toBe(CRYPTO_SYMBOLS.length);
    expect([...pairsOf([]).keys()].every((p) => p.endsWith('USDT'))).toBe(true);
  });

  it('converts USDT to euros with one rounding that keeps candles valid', () => {
    expect(toEuros(10, 1.25)).toBe(8);
    expect(toEuros(4.888, 1.1205)).toBe(4.362338242);
    expect(toEuros(0.00000441, 1.1205)).toBe(0.000003935742972);
    const c = convertCandle(
      { time: 1, open: 1.3, high: 1.31, low: 1.29, close: 1.305, volume: 7 },
      1.1205
    );
    expect(c.volume).toBe(7);
    expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
    expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
    const t = parseTicker(
      { ...ticker('NEARUSDT', '5'), bidPrice: '0', askPrice: '0', quoteVolume: 'x' },
      PAIRS
    )!;
    expect(convertTicker(t, 1.25)).toMatchObject({
      price: 4,
      bid: null,
      ask: null,
      volume24h: null,
    });
  });
});

describe('ReferenceRate', () => {
  it('keeps the last rate for a week while the rates service fails', async () => {
    let now = 0;
    let fail = false;
    const rates: ExchangeRates = {
      rate: async () => {
        if (fail) throw new Error('down');
        return 1.12;
      },
    };
    const rate = new ReferenceRate(rates, () => now);
    expect(await rate.usdPerEur()).toBe(1.12);
    fail = true;
    now += RATE_KEPT_FOR_MS - 1;
    expect(await rate.usdPerEur()).toBe(1.12);
    now += RATE_RETRY_MS;
    await expect(rate.usdPerEur()).rejects.toThrow('down');
    await expect(new ReferenceRate({ rate: async () => 0 }).usdPerEur()).rejects.toThrow(
      'rate missing'
    );
  });
});

describe('ReferenceRate after a failure', () => {
  it('leaves a service that is down alone for a minute instead of asking it every time', async () => {
    let now = 0;
    let fail = false;
    let calls = 0;
    const rates: ExchangeRates = {
      rate: async () => {
        calls++;
        if (fail) throw new Error('down');
        return 1.1;
      },
    };
    const rate = new ReferenceRate(rates, () => now);
    await rate.usdPerEur();
    fail = true;
    now += 1000;
    expect(await rate.usdPerEur()).toBe(1.1);
    expect(calls).toBe(2);
    // Resting: the last rate, without asking.
    for (let i = 0; i < 5; i++) expect(await rate.usdPerEur()).toBe(1.1);
    expect(calls).toBe(2);
    now += RATE_RETRY_MS;
    fail = false;
    expect(await rate.usdPerEur()).toBe(1.1);
    expect(calls).toBe(3);
    // Without any rate, the rest throws the last error at once.
    const none = new ReferenceRate({ rate: async () => Promise.reject(new Error('off')) }, () => 0);
    await expect(none.usdPerEur()).rejects.toThrow('off');
    await expect(none.usdPerEur()).rejects.toThrow('off');
  });
});

describe('CallBudget', () => {
  it('allows so many calls a window and starts again with the next', () => {
    let now = 0;
    const budget = new CallBudget(2, 60_000, () => now);
    expect([budget.take(), budget.take(), budget.take()]).toEqual([true, true, false]);
    now += 59_999;
    expect(budget.take()).toBe(false);
    now += 1;
    expect(budget.take()).toBe(true);
    expect(LIVE_CALLS_PER_MINUTE).toBe(600);
    expect(new CallBudget(1, 1000).take()).toBe(true);
  });
});

describe('BinanceMarketData live tick', () => {
  const live = (time: number, close: string) => kline(time, '10', '12', '9', close, '1.5');

  it('asks for two candles, shared by everybody for a moment, with a short timeout', async () => {
    const http = jest.fn().mockResolvedValue(reply([live(2000, '11.5'), live(1000, '10')]));
    let now = 0;
    const market = new BinanceMarketData(http, ['https://a.test'], () => now, quiet);
    const [a, b] = await Promise.all([market.live('BTC', '1m'), market.live('BTC', '1m')]);
    expect(http).toHaveBeenCalledTimes(1);
    expect(http.mock.calls[0][0]).toBe('https://a.test/klines?symbol=BTCEUR&interval=1m&limit=2');
    expect(a.data.map((c) => [c.time, c.close])).toEqual([
      [1000, 10],
      [2000, 11.5],
    ]);
    expect(b).toEqual(a);
    expect(a).toMatchObject({ source: 'binance', stale: false });
    now += LIVE_TTL - 1;
    await market.live('BTC', '1m');
    expect(http).toHaveBeenCalledTimes(1);
    now += 1;
    await market.live('BTC', '1m');
    // Another size or coin is its own tick.
    await market.live('BTC', '5m');
    await market.live('ETH', '1m');
    expect(http).toHaveBeenCalledTimes(4);
  });

  it('converts a USDT coin with the same rate as its candles', async () => {
    const http = jest
      .fn()
      .mockResolvedValue(reply([kline(1000, '10', '12.5', '9', '11.25', '40')]));
    const market = new BinanceMarketData(http, ['https://a.test'], () => 0, quiet, {
      rates: fixedRate(),
    });
    const tick = await market.live('NEAR', '1h');
    const series = await market.candles('NEAR', '1h');
    expect(http.mock.calls[0][0]).toBe('https://a.test/klines?symbol=NEARUSDT&interval=1h&limit=2');
    expect(tick.data).toEqual(series.data);
    expect(tick.usdPerEur).toBe(1.25);
    expect(tick.data[0].close).toBe(9);
  });

  it('stops asking the source past the budget: the last tick kept, or the cached series if newer', async () => {
    let now = 0;
    const http = jest
      .fn()
      .mockImplementation(async (url: unknown) =>
        reply(String(url).includes('limit=2') ? [live(1000, '11')] : [kline(0), live(1000, '10.5')])
      );
    const warn = jest.fn();
    const market = new BinanceMarketData(
      http,
      ['https://a.test'],
      () => now,
      { warn },
      { liveCallsPerMinute: 1 }
    );
    expect((await market.live('BTC', '1m')).data.at(-1)!.close).toBe(11);
    now += LIVE_TTL;
    // Over the budget: the tick kept (from 0) is older than the series asked now, so its tail.
    const tail = await market.live('BTC', '1m');
    expect(tail.data.map((c) => c.close)).toEqual([11, 10.5]);
    expect(tail.stale).toBe(false);
    expect(http.mock.calls.filter(([u]) => String(u).includes('limit=2'))).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to the cached series when the source fails, and fails with nothing at all', async () => {
    const http = jest.fn().mockResolvedValue(reply([kline(0), live(1000, '10.5')]));
    const warn = jest.fn();
    const market = new BinanceMarketData(http, ['https://a.test'], () => 0, { warn });
    await market.candles('BTC', '1h');
    http.mockRejectedValue(new Error('timeout'));
    const tick = await market.live('BTC', '1h');
    expect(tick.data.map((c) => c.time)).toEqual([0, 1000]);
    // A failing tick is not logged (the series logs the outage).
    expect(warn).not.toHaveBeenCalled();
    await expect(market.live('ETH', '1h')).rejects.toMatchObject({ code: 'MARKET_UNAVAILABLE' });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^\[market\] candles:ETHEUR:1h/));
  });

  it('keeps the last tick (stale) when the source fails and it is newer than the series', async () => {
    let now = 0;
    const http = jest.fn().mockResolvedValueOnce(reply([kline(0), live(1000, '10.5')]));
    const market = new BinanceMarketData(http, ['https://a.test'], () => now, quiet);
    await market.candles('BTC', '1d');
    now += 1000;
    http.mockResolvedValueOnce(reply([live(1000, '12')]));
    await market.live('BTC', '1d');
    http.mockRejectedValue(new Error('down'));
    now += LIVE_TTL;
    const kept = await market.live('BTC', '1d');
    expect(kept).toMatchObject({ stale: true, updatedAt: new Date(1000).toISOString() });
    expect(kept.data[0].close).toBe(12);
    // Without the series either, the tick still answers.
    const other = new BinanceMarketData(
      jest
        .fn()
        .mockResolvedValueOnce(reply([live(1000, '12')]))
        .mockRejectedValue(new Error('x')),
      ['https://a.test'],
      () => now,
      quiet
    );
    await other.live('ETH', '1m');
    now += LIVE_TTL;
    expect((await other.live('ETH', '1m')).stale).toBe(true);
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

describe('BinanceMarketData with coins quoted in USDT', () => {
  const usdtKline = (time: number) => kline(time, '10', '12.5', '9', '11.25', '40');

  it('asks for the USDT pair and gives the candles in euros, with the rate used', async () => {
    const http = jest.fn().mockResolvedValue(reply([usdtKline(1000)]));
    const rates = fixedRate();
    const market = new BinanceMarketData(http, ['https://a.test'], () => 0, quiet, { rates });
    expect(market.quoteOf('NEAR')).toBe('USDT');
    expect(market.quoteOf('BTC')).toBe('EUR');
    const feed = await market.candles('NEAR', '15m');
    expect(http.mock.calls[0][0]).toBe(
      'https://a.test/klines?symbol=NEARUSDT&interval=15m&limit=1000'
    );
    expect(feed.data).toEqual([{ time: 1000, open: 8, high: 10, low: 7.2, close: 9, volume: 40 }]);
    expect(feed.usdPerEur).toBe(1.25);
    // A coin in euros is not converted and carries no rate.
    http.mockResolvedValue(reply([kline(1000)]));
    const btc = await market.candles('BTC', '15m');
    expect(btc.data[0].close).toBe(11);
    expect(btc.usdPerEur).toBeUndefined();
  });

  it('converts when read: the cached series follows a new rate at once, with no new request', async () => {
    const http = jest.fn().mockResolvedValue(reply([usdtKline(1000)]));
    let rate = 1.25;
    const rates: ExchangeRates = { rate: async () => rate };
    const market = new BinanceMarketData(http, ['https://a.test'], () => 0, quiet, { rates });
    expect((await market.candles('PEPE', '1h')).data[0].close).toBe(9);
    rate = 1.125;
    expect((await market.candles('PEPE', '1h')).data[0].close).toBe(10);
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('gives every price in euros: the USDT ones converted, the percentage as it is', async () => {
    const http = jest
      .fn()
      .mockResolvedValue(reply([ticker('BTCEUR', '50000'), ticker('NEARUSDT', '5')]));
    const market = new BinanceMarketData(http, ['https://a.test'], () => 0, quiet, {
      rates: fixedRate(),
    });
    const feed = await market.tickers();
    const asked = decodeURIComponent(http.mock.calls[0][0] as string);
    expect(asked).toContain('"BTCEUR"');
    expect(asked).toContain('"NEARUSDT"');
    expect(asked).toContain('"BONKUSDT"');
    expect(asked).not.toContain('NEAREUR');
    expect(feed.usdPerEur).toBe(1.25);
    expect(feed.data[0]).toMatchObject({ symbol: 'BTC', price: 50_000, quote: 'EUR' });
    expect(feed.data[1]).toEqual({
      symbol: 'NEAR',
      price: 4,
      changePercent24h: -2.5,
      high24h: 88,
      low24h: 72,
      bid: 80.32,
      ask: 80.48,
      volume24h: 9876.4,
      quote: 'USDT',
    });
  });

  it('without any reference rate, leaves the USDT coins without a price instead of inventing one', async () => {
    const down: ExchangeRates = {
      rate: async () => {
        throw new Error('rates down');
      },
    };
    const warn = jest.fn();
    const http = jest.fn().mockResolvedValue(reply([ticker('BTCEUR'), ticker('NEARUSDT')]));
    const market = new BinanceMarketData(
      http,
      ['https://a.test'],
      () => 0,
      { warn },
      {
        rates: down,
      }
    );
    const feed = await market.tickers();
    expect(feed.data.map((t) => t.symbol)).toEqual(['BTC']);
    expect(feed.usdPerEur).toBeUndefined();
    expect(warn).toHaveBeenCalledWith('[market] reference rate unavailable: rates down');
    http.mockResolvedValue(reply([kline(1000)]));
    await expect(market.candles('NEAR', '1h')).rejects.toMatchObject({
      code: 'MARKET_UNAVAILABLE',
    });
    expect((await market.candles('BTC', '1h')).data).toHaveLength(1);

    const onlyUsdt = new BinanceMarketData(
      jest.fn().mockResolvedValue(reply([ticker('NEARUSDT')])),
      ['https://a.test'],
      () => 0,
      { warn },
      { rates: down }
    );
    await expect(onlyUsdt.tickers()).rejects.toMatchObject({ code: 'MARKET_UNAVAILABLE' });
  });

  it('follows the configured plan: with no euro pairs even BTC comes from USDT', async () => {
    const http = jest.fn().mockResolvedValue(reply([usdtKline(1000)]));
    const market = new BinanceMarketData(http, ['https://a.test'], () => 0, quiet, {
      rates: fixedRate(),
      euroPairs: [],
    });
    expect(market.quoteOf('BTC')).toBe('USDT');
    await market.candles('BTC', '1d');
    expect(http.mock.calls[0][0]).toContain('symbol=BTCUSDT');
  });

  it('reports in the logs, once a day, a coin kept in euros whose euro pair barely trades', async () => {
    let now = 0;
    const warn = jest.fn();
    const thin = { ...ticker('ETHEUR'), quoteVolume: String(THIN_EURO_VOLUME - 1) };
    const http = jest
      .fn()
      .mockResolvedValue(
        reply([thin, { ...ticker('BTCEUR'), quoteVolume: String(THIN_EURO_VOLUME) }])
      );
    const market = new BinanceMarketData(
      http,
      ['https://a.test'],
      () => now,
      { warn },
      {
        rates: fixedRate(),
      }
    );
    await market.tickers();
    now += 20_000;
    await market.tickers();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^\[market\] ETHEUR traded 249999 € in 24 h/);
    now += 24 * 60 * 60 * 1000;
    await market.tickers();
    expect(warn).toHaveBeenCalledTimes(2);
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

  it('gives a live tick that moves every couple of seconds and agrees with the series', async () => {
    let at = Date.parse('2026-03-15T12:34:10Z');
    const ticking = new DemoMarketData(() => at);
    const tick = await ticking.live('BTC', '1m');
    expect(tick.data).toHaveLength(2);
    expect(tick.data.map((c) => c.time)).toEqual([
      Date.parse('2026-03-15T12:33:00Z'),
      Date.parse('2026-03-15T12:34:00Z'),
    ]);
    expect(tick.data).toEqual((await ticking.candles('BTC', '1m')).data.slice(-2));
    const before = tick.data[1];
    at += 2000;
    const after = (await ticking.live('BTC', '1m')).data[1];
    expect(after.close).not.toBe(before.close);
    expect(Math.abs(after.close / before.close - 1)).toBeLessThan(0.002);
    expect(after.high).toBeGreaterThanOrEqual(before.high);
    expect(after.low).toBeLessThanOrEqual(before.low);
    expect(after.volume).toBeGreaterThan(before.volume);
    // At the minute, a new candle opens where the last one closed.
    at = Date.parse('2026-03-15T12:35:00Z');
    const turned = (await ticking.live('BTC', '1m')).data;
    expect(turned[1].time).toBe(at);
    expect(turned[1].open).toBe(turned[0].close);
    expect(demoCandle('BTC', at, 60_000, at)).toMatchObject({ open: turned[1].close, volume: 0 });
  });

  it('gives a price and a daily change for every coin', async () => {
    const feed = await demo.tickers();
    expect(feed.data.map((t) => t.symbol)).toEqual(CRYPTO_SYMBOLS);
    expect(feed.usdPerEur).toBeUndefined();
    expect(demo.quoteOf()).toBe('EUR');
    for (const t of feed.data) {
      expect(t.quote).toBe('EUR');
      expect(t.price).toBeGreaterThan(0);
      expect(t.high24h).toBeGreaterThanOrEqual(t.low24h);
      expect(Number.isFinite(t.changePercent24h)).toBe(true);
    }
    expect(new DemoMarketData().source).toBe('demo');
  });
});
