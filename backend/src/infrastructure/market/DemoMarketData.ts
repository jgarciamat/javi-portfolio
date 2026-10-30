import { CryptoMarketData } from '@domain/ports/services';
import {
  CANDLES_PER_SERIES,
  CRYPTO_SYMBOLS,
  CryptoInterval,
  CryptoSymbol,
  INTERVAL_MS,
  LIVE_CANDLES,
  MarketCandle,
  MarketFeed,
  MarketQuote,
  MarketTicker,
} from '@domain/services/crypto-market';

/** Rough starting prices (euros) so the made-up series look like each coin. */
const BASE: Record<CryptoSymbol, number> = {
  BTC: 60_000,
  ETH: 2_500,
  BNB: 500,
  XRP: 0.5,
  HYPE: 40,
  SOL: 140,
  ADA: 0.4,
  DOGE: 0.12,
  TRX: 0.25,
  LINK: 12,
  DOT: 5,
  LTC: 70,
  BCH: 350,
  AVAX: 25,
  XLM: 0.1,
  SHIB: 0.00001,
  ATOM: 6,
  NEAR: 4,
  SUI: 2,
  APT: 7,
  POL: 0.3,
  PEPE: 0.000008,
  BONK: 0.00002,
};

const HOUR = 3_600_000;
const seedOf = (symbol: string): number =>
  [...symbol].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 997, 7);

/**
 * Made-up but smooth price of a coin at any moment: a few slow waves around its base price and
 * two quick ripples (about a minute and a quarter of a minute), so the live chart moves every
 * couple of seconds as a real one does. The same moment always gives the same price, so candles
 * of every size agree with each other.
 */
export function demoPrice(symbol: CryptoSymbol, at: number): number {
  const s = seedOf(symbol);
  const h = at / HOUR;
  const wave =
    0.08 * Math.sin(h / (90 + s / 10) + s) +
    0.03 * Math.sin(h / (11 + (s % 7)) + s / 3) +
    0.01 * Math.sin(h / 1.3 + s / 5) +
    0.004 * Math.sin(h * 7.7 + s) +
    0.0012 * Math.sin(at / 9_000 + s) +
    0.0005 * Math.sin(at / 2_300 + s / 2);
  return BASE[symbol] * Math.exp(wave);
}

/** Prices looked at inside a candle: its opening, this many moments evenly spread, and now. */
const SAMPLES = 60;

/**
 * One made-up candle from `time` (its opening) up to `now` at most: the prices on a fixed grid
 * of moments of the candle plus the last one, so a candle in progress keeps its high and low
 * (bar a hair between two moments of the grid) and every tick agrees with the full series.
 */
export function demoCandle(
  symbol: CryptoSymbol,
  time: number,
  size: number,
  now: number
): MarketCandle {
  const end = Math.min(time + size, now);
  const step = size / SAMPLES;
  const prices: number[] = [];
  for (let at = time; at < end; at += step) prices.push(demoPrice(symbol, at));
  prices.push(demoPrice(symbol, end));
  return {
    time,
    open: prices[0],
    high: Math.max(...prices),
    low: Math.min(...prices),
    close: prices[prices.length - 1],
    volume: Math.round((1 + Math.abs(Math.sin(time / HOUR))) * 1000 * ((end - time) / size)) / 10,
  };
}

/**
 * Market data invented on the server, for local development and the end-to-end tests (no
 * Internet). Never used in production: the configuration forces the real source there. The
 * prices are invented in euros, so nothing is converted.
 */
export class DemoMarketData implements CryptoMarketData {
  readonly source = 'demo' as const;

  constructor(private readonly now: () => number = Date.now) {}

  quoteOf(): MarketQuote {
    return 'EUR';
  }

  async candles(
    symbol: CryptoSymbol,
    interval: CryptoInterval
  ): Promise<MarketFeed<MarketCandle[]>> {
    return this.feed(this.series(symbol, interval, CANDLES_PER_SERIES));
  }

  async live(symbol: CryptoSymbol, interval: CryptoInterval): Promise<MarketFeed<MarketCandle[]>> {
    return this.feed(this.series(symbol, interval, LIVE_CANDLES));
  }

  /** The last `count` candles of a size, the last one in progress. */
  private series(symbol: CryptoSymbol, interval: CryptoInterval, count: number): MarketCandle[] {
    const size = INTERVAL_MS[interval];
    const now = this.now();
    const last = Math.floor(now / size) * size;
    return Array.from({ length: count }, (_, i) =>
      demoCandle(symbol, last - (count - 1 - i) * size, size, now)
    );
  }

  async tickers(): Promise<MarketFeed<MarketTicker[]>> {
    const now = this.now();
    return this.feed(
      CRYPTO_SYMBOLS.map((symbol) => {
        const price = demoPrice(symbol, now);
        const before = demoPrice(symbol, now - 24 * HOUR);
        const day = [0, 4, 8, 12, 16, 20, 24].map((h) => demoPrice(symbol, now - h * HOUR));
        return {
          symbol,
          price,
          changePercent24h: Math.round(((price - before) / before) * 10_000) / 100,
          high24h: Math.max(...day),
          low24h: Math.min(...day),
          bid: price * 0.9995,
          ask: price * 1.0005,
          volume24h: Math.round(price * 1000),
          quote: 'EUR' as const,
        };
      })
    );
  }

  private feed<T>(data: T): MarketFeed<T> {
    return { data, source: 'demo', updatedAt: new Date(this.now()).toISOString(), stale: false };
  }
}
