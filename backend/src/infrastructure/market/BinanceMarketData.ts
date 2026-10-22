import { CryptoMarketData } from '@domain/ports/services';
import {
  CANDLES_PER_SERIES,
  CRYPTO_SYMBOLS,
  CryptoInterval,
  CryptoSymbol,
  MarketCandle,
  MarketFeed,
  MarketTicker,
  isCryptoSymbol,
} from '@domain/services/crypto-market';
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

const pair = (symbol: CryptoSymbol): string => `${symbol}EUR`;
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

/** One entry of `/ticker/24hr`; null when it is not a coin of the list or is malformed. */
export function parseTicker(item: unknown): MarketTicker | null {
  if (!item || typeof item !== 'object') return null;
  const t = item as Record<string, unknown>;
  const symbol = typeof t.symbol === 'string' ? t.symbol.replace(/EUR$/, '') : '';
  const price = positive(t.lastPrice);
  const high24h = positive(t.highPrice);
  const low24h = positive(t.lowPrice);
  const change = typeof t.priceChangePercent === 'string' ? Number(t.priceChangePercent) : NaN;
  if (!isCryptoSymbol(symbol) || !price || !high24h || !low24h || !Number.isFinite(change)) {
    return null;
  }
  const volume = typeof t.quoteVolume === 'string' ? Number(t.quoteVolume) : NaN;
  return {
    symbol,
    price,
    changePercent24h: change,
    high24h,
    low24h,
    bid: positive(t.bidPrice),
    ask: positive(t.askPrice),
    volume24h: volume >= 0 ? volume : null,
  };
}

/** Candles and prices in euros from Binance's public market data, through a shared cache. */
export class BinanceMarketData implements CryptoMarketData {
  readonly source = 'binance' as const;
  private readonly cache: MarketCache;

  constructor(
    private readonly http: typeof fetch = fetch,
    private readonly hosts: string[] = BINANCE_HOSTS,
    now: () => number = Date.now,
    logger: Pick<Console, 'warn'> = console
  ) {
    this.cache = new MarketCache('binance', now, (key, error) =>
      logger.warn(`[market] ${key} unavailable: ${(error as Error).message}`)
    );
  }

  candles(symbol: CryptoSymbol, interval: CryptoInterval): Promise<MarketFeed<MarketCandle[]>> {
    return this.cache.get(`candles:${symbol}:${interval}`, CANDLE_TTL[interval], async () => {
      const rows = await this.request(
        `/klines?symbol=${pair(symbol)}&interval=${interval}&limit=${CANDLES_PER_SERIES}`
      );
      const candles = (Array.isArray(rows) ? rows : [])
        .map(parseKline)
        .filter((c): c is MarketCandle => c !== null)
        .sort((a, b) => a.time - b.time);
      if (!candles.length) throw new Error('no candles');
      return candles;
    });
  }

  tickers(): Promise<MarketFeed<MarketTicker[]>> {
    return this.cache.get('tickers', TICKER_TTL, async () => {
      const symbols = encodeURIComponent(JSON.stringify(CRYPTO_SYMBOLS.map(pair)));
      const items = await this.request(`/ticker/24hr?symbols=${symbols}`);
      const tickers = (Array.isArray(items) ? items : [])
        .map(parseTicker)
        .filter((t): t is MarketTicker => t !== null);
      if (!tickers.length) throw new Error('no prices');
      return tickers;
    });
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
