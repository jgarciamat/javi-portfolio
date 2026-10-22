import { CryptoMarketData } from '@domain/ports/services';
import {
  CRYPTO_COINS,
  CryptoInterval,
  CryptoSymbol,
  MarketCandle,
  MarketStamp,
} from '@domain/services/crypto-market';

/** Candles sent to the chart (the cache keeps more, for the simulator's pending orders). */
export const CHART_CANDLES = 500;

export interface MarketStatusView {
  available: boolean;
  source: 'binance' | 'demo';
  updatedAt: string | null;
  stale: boolean;
}

export interface CryptoCoinView {
  symbol: CryptoSymbol;
  name: string;
  price: number | null;
  changePercent24h: number | null;
  high24h: number | null;
  low24h: number | null;
}

export interface CryptoCandlesView {
  symbol: CryptoSymbol;
  interval: CryptoInterval;
  candles: MarketCandle[];
  market: MarketStatusView;
}

const stamp = ({ source, updatedAt, stale }: MarketStamp): MarketStatusView => ({
  available: true,
  source,
  updatedAt,
  stale,
});

/** What the «Consola crypto» shows of the market: the coin list with prices, and candles. */
export class CryptoMarketService {
  constructor(private readonly market: CryptoMarketData) {}

  /** Every coin of the list; with the source down and nothing cached, without prices. */
  async coins(): Promise<{ coins: CryptoCoinView[]; market: MarketStatusView }> {
    const feed = await this.market.tickers().catch(() => null);
    const bySymbol = new Map(feed?.data.map((t) => [t.symbol, t]));
    return {
      coins: CRYPTO_COINS.map(({ symbol, name }) => {
        const t = bySymbol.get(symbol);
        return {
          symbol,
          name,
          price: t?.price ?? null,
          changePercent24h: t?.changePercent24h ?? null,
          high24h: t?.high24h ?? null,
          low24h: t?.low24h ?? null,
        };
      }),
      market: feed
        ? stamp(feed)
        : { available: false, source: this.market.source, updatedAt: null, stale: false },
    };
  }

  async candles(symbol: CryptoSymbol, interval: CryptoInterval): Promise<CryptoCandlesView> {
    const feed = await this.market.candles(symbol, interval);
    return {
      symbol,
      interval,
      candles: feed.data.slice(-CHART_CANDLES),
      market: stamp(feed),
    };
  }
}
