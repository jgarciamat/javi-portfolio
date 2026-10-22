import { CryptoMarketData } from '@domain/ports/services';
import {
  CANDLES_PER_SERIES,
  CRYPTO_SYMBOLS,
  CryptoInterval,
  CryptoSymbol,
  INTERVAL_MS,
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
 * Made-up but smooth price of a coin at any moment: a few slow waves around its base price.
 * The same moment always gives the same price, so candles of every size agree with each other.
 */
export function demoPrice(symbol: CryptoSymbol, at: number): number {
  const s = seedOf(symbol);
  const h = at / HOUR;
  const wave =
    0.08 * Math.sin(h / (90 + s / 10) + s) +
    0.03 * Math.sin(h / (11 + (s % 7)) + s / 3) +
    0.01 * Math.sin(h / 1.3 + s / 5) +
    0.004 * Math.sin(h * 7.7 + s);
  return BASE[symbol] * Math.exp(wave);
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
    const size = INTERVAL_MS[interval];
    const last = Math.floor(this.now() / size) * size;
    const candles: MarketCandle[] = [];
    for (let i = CANDLES_PER_SERIES - 1; i >= 0; i--) {
      const time = last - i * size;
      const end = Math.min(time + size, this.now());
      const samples = [0, 0.25, 0.5, 0.75, 1].map((f) =>
        demoPrice(symbol, time + f * (end - time))
      );
      candles.push({
        time,
        open: samples[0],
        high: Math.max(...samples),
        low: Math.min(...samples),
        close: samples[4],
        volume: Math.round((1 + Math.abs(Math.sin(time / HOUR))) * 1000) / 10,
      });
    }
    return this.feed(candles);
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
