import { UnavailableError } from '@domain/errors';
import { CryptoMarketData, ExchangeRates } from '@domain/ports/services';
import {
  CANDLES_PER_SERIES,
  CRYPTO_SYMBOLS,
  CryptoInterval,
  CryptoSymbol,
  EURO_PAIRS,
  MarketCandle,
  MarketFeed,
  MarketQuote,
  MarketTicker,
  quoteOf,
} from '@domain/services/crypto-market';
import { FrankfurterRates } from '@infrastructure/rates/FrankfurterRates';
import { MarketCache } from './MarketCache';

const TIMEOUT_MS = 5000;
/**
 * Binance's public market data (no key, no account): the host meant for public data first,
 * the main API as the fallback.
 */
export const BINANCE_HOSTS = [
  'https://data-api.binance.vision/api/v3',
  'https://api.binance.com/api/v3',
];

/** Fresh enough for each candle size (the source allows far more, this keeps calls low). */
const CANDLE_TTL: Record<CryptoInterval, number> = {
  '1m': 15_000,
  '5m': 30_000,
  '15m': 30_000,
  '30m': 60_000,
  '1h': 60_000,
  '4h': 120_000,
  '1d': 300_000,
  '1w': 600_000,
};
const TICKER_TTL = 15_000;
const DAY = 24 * 60 * 60 * 1000;
/** The last reference rate stands in this long while the rates service does not answer. */
export const RATE_KEPT_FOR_MS = 7 * DAY;
/**
 * A coin kept in euros trading less than this in 24 hours is reported in the logs (once a day),
 * as a hint to move it to USDT. Never switched on the fly: see EURO_PAIRS.
 */
export const THIN_EURO_VOLUME = 250_000;

/** Pair on the source → the coin and the market it is quoted against. */
type Pairs = ReadonlyMap<string, { symbol: CryptoSymbol; quote: MarketQuote }>;

const unavailable = (): UnavailableError =>
  new UnavailableError(
    'Los datos de mercado no están disponibles ahora. Inténtalo en unos minutos.',
    'MARKET_UNAVAILABLE'
  );

/**
 * A USDT price in euros: divided by the ECB's dollars per euro, taking 1 USDT as 1 US$. Rounded
 * to 10 significant digits (far below a cent, and it keeps high ≥ open/close ≥ low). The one
 * conversion used for candles, prices and offers, so the chart and the simulator agree.
 */
export const toEuros = (usdt: number, usdPerEur: number): number =>
  Number((usdt / usdPerEur).toPrecision(10));

export function convertCandle(c: MarketCandle, usdPerEur: number): MarketCandle {
  return {
    ...c,
    open: toEuros(c.open, usdPerEur),
    high: toEuros(c.high, usdPerEur),
    low: toEuros(c.low, usdPerEur),
    close: toEuros(c.close, usdPerEur),
  };
}

export function convertTicker(t: MarketTicker, usdPerEur: number): MarketTicker {
  const maybe = (value: number | null): number | null =>
    value === null ? null : toEuros(value, usdPerEur);
  return {
    ...t,
    price: toEuros(t.price, usdPerEur),
    high24h: toEuros(t.high24h, usdPerEur),
    low24h: toEuros(t.low24h, usdPerEur),
    bid: maybe(t.bid),
    ask: maybe(t.ask),
    volume24h: maybe(t.volume24h),
  };
}

/**
 * The ECB's dollars per euro through the app's rates service (the same one behind /api/rates, so
 * the console's dollars are the USDT prices again). When it fails, the last rate obtained stands
 * in for up to a week (the ECB publishes on working days only); with none, it throws.
 */
export class ReferenceRate {
  private last: { rate: number; at: number } | null = null;

  constructor(
    private readonly rates: ExchangeRates,
    private readonly now: () => number = Date.now
  ) {}

  async usdPerEur(): Promise<number> {
    try {
      const rate = await this.rates.rate('EUR', 'USD');
      if (!(rate > 0)) throw new Error('rate missing');
      this.last = { rate, at: this.now() };
      return rate;
    } catch (error) {
      if (this.last && this.now() - this.last.at < RATE_KEPT_FOR_MS) return this.last.rate;
      throw error;
    }
  }
}

const positive = (value: unknown): number | null => {
  const n = typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** One row of `/klines` ([openTime, open, high, low, close, volume, …]); null when it is not one. */
export function parseKline(row: unknown): MarketCandle | null {
  if (!Array.isArray(row) || typeof row[0] !== 'number' || !Number.isFinite(row[0])) return null;
  const [open, high, low, close] = [row[1], row[2], row[3], row[4]].map(positive);
  const volume = typeof row[5] === 'string' ? Number(row[5]) : NaN;
  if (!open || !high || !low || !close || !(volume >= 0)) return null;
  if (high < Math.max(open, close, low) || low > Math.min(open, close)) return null;
  return { time: row[0], open, high, low, close, volume };
}

/** The pairs of a plan (the coins kept in euros; the rest in USDT). */
export function pairsOf(euroPairs: readonly CryptoSymbol[]): Pairs {
  return new Map(
    CRYPTO_SYMBOLS.map((symbol) => {
      const quote = quoteOf(symbol, euroPairs);
      return [`${symbol}${quote}`, { symbol, quote }];
    })
  );
}

/**
 * One entry of `/ticker/24hr`, in the pair's own currency; null when it is not one of the pairs
 * asked for or is malformed.
 */
export function parseTicker(item: unknown, pairs: Pairs): MarketTicker | null {
  if (!item || typeof item !== 'object') return null;
  const t = item as Record<string, unknown>;
  const coin = typeof t.symbol === 'string' ? pairs.get(t.symbol) : undefined;
  const price = positive(t.lastPrice);
  const high24h = positive(t.highPrice);
  const low24h = positive(t.lowPrice);
  const change = typeof t.priceChangePercent === 'string' ? Number(t.priceChangePercent) : NaN;
  if (!coin || !price || !high24h || !low24h || !Number.isFinite(change)) return null;
  const volume = typeof t.quoteVolume === 'string' ? Number(t.quoteVolume) : NaN;
  return {
    symbol: coin.symbol,
    price,
    changePercent24h: change,
    high24h,
    low24h,
    bid: positive(t.bidPrice),
    ask: positive(t.askPrice),
    volume24h: volume >= 0 ? volume : null,
    quote: coin.quote,
  };
}

export interface BinanceOptions {
  /** Reference rates (the app's: ECB) to turn USDT prices into euros. */
  rates?: ExchangeRates;
  /** Coins kept on their euro pair (EURO_PAIRS unless configured otherwise). */
  euroPairs?: readonly CryptoSymbol[];
}

/**
 * Candles and prices in euros from Binance's public market data, through a shared cache. Each
 * coin comes from one pair for the life of the process: its euro pair when it is liquid, else
 * its USDT pair converted to euros. The cache keeps the pair's own numbers and they are converted
 * when read, so candles and prices always use the same rate.
 */
export class BinanceMarketData implements CryptoMarketData {
  readonly source = 'binance' as const;
  private readonly cache: MarketCache;
  private readonly pairs: Pairs;
  private readonly plan: ReadonlyMap<CryptoSymbol, string>;
  private readonly rate: ReferenceRate;
  private readonly thinSince = new Map<CryptoSymbol, number>();

  constructor(
    private readonly http: typeof fetch = fetch,
    private readonly hosts: string[] = BINANCE_HOSTS,
    private readonly now: () => number = Date.now,
    private readonly logger: Pick<Console, 'warn'> = console,
    { rates = new FrankfurterRates(now), euroPairs = EURO_PAIRS }: BinanceOptions = {}
  ) {
    this.cache = new MarketCache('binance', now, (key, error) =>
      logger.warn(`[market] ${key} unavailable: ${(error as Error).message}`)
    );
    this.pairs = pairsOf(euroPairs);
    this.plan = new Map([...this.pairs].map(([pair, { symbol }]) => [symbol, pair]));
    this.rate = new ReferenceRate(rates, now);
  }

  quoteOf(symbol: CryptoSymbol): MarketQuote {
    return this.pairs.get(this.plan.get(symbol)!)!.quote;
  }

  async candles(
    symbol: CryptoSymbol,
    interval: CryptoInterval
  ): Promise<MarketFeed<MarketCandle[]>> {
    const pair = this.plan.get(symbol)!;
    // Keyed by pair: a series of the other market is never reused after a change of plan.
    const feed = await this.cache.get(
      `candles:${pair}:${interval}`,
      CANDLE_TTL[interval],
      async () => {
        const rows = await this.request(
          `/klines?symbol=${pair}&interval=${interval}&limit=${CANDLES_PER_SERIES}`
        );
        const candles = (Array.isArray(rows) ? rows : [])
          .map(parseKline)
          .filter((c): c is MarketCandle => c !== null)
          .sort((a, b) => a.time - b.time);
        if (!candles.length) throw new Error('no candles');
        return candles;
      }
    );
    if (this.quoteOf(symbol) === 'EUR') return feed;
    const usdPerEur = await this.usdPerEur();
    if (usdPerEur === null) throw unavailable();
    return { ...feed, data: feed.data.map((c) => convertCandle(c, usdPerEur)), usdPerEur };
  }

  /**
   * The last prices of every coin. Without a reference rate the coins quoted in USDT are left
   * out (shown without a price) rather than given a made-up one.
   */
  async tickers(): Promise<MarketFeed<MarketTicker[]>> {
    const feed = await this.cache.get('tickers', TICKER_TTL, async () => {
      const symbols = encodeURIComponent(JSON.stringify([...this.pairs.keys()]));
      const items = await this.request(`/ticker/24hr?symbols=${symbols}`);
      const tickers = (Array.isArray(items) ? items : [])
        .map((item) => parseTicker(item, this.pairs))
        .filter((t): t is MarketTicker => t !== null);
      if (!tickers.length) throw new Error('no prices');
      this.reportThin(tickers);
      return tickers;
    });
    if (feed.data.every((t) => t.quote === 'EUR')) return feed;
    const usdPerEur = await this.usdPerEur();
    if (usdPerEur === null) {
      const data = feed.data.filter((t) => t.quote === 'EUR');
      if (!data.length) throw unavailable();
      return { ...feed, data };
    }
    return {
      ...feed,
      data: feed.data.map((t) => (t.quote === 'EUR' ? t : convertTicker(t, usdPerEur))),
      usdPerEur,
    };
  }

  private async usdPerEur(): Promise<number | null> {
    try {
      return await this.rate.usdPerEur();
    } catch (error) {
      this.logger.warn(`[market] reference rate unavailable: ${(error as Error).message}`);
      return null;
    }
  }

  /** Logs, once a day, the coins kept in euros whose euro pair has little trade. */
  private reportThin(tickers: MarketTicker[]): void {
    for (const t of tickers) {
      if (t.quote !== 'EUR' || t.volume24h === null || t.volume24h >= THIN_EURO_VOLUME) continue;
      const last = this.thinSince.get(t.symbol);
      if (last !== undefined && this.now() - last < DAY) continue;
      this.thinSince.set(t.symbol, this.now());
      this.logger.warn(
        `[market] ${t.symbol}EUR traded ${Math.round(t.volume24h)} € in 24 h: consider quoting it in USDT (CRYPTO_EURO_PAIRS)`
      );
    }
  }

  /** Asks each host in turn; the last error is thrown when none answers. */
  private async request(path: string): Promise<unknown> {
    let last: unknown = new Error('no hosts');
    for (const host of this.hosts) {
      try {
        const res = await this.http(`${host}${path}`, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (error) {
        last = error;
      }
    }
    throw last;
  }
}
