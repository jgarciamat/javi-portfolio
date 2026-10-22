import type {
  Candle,
  CryptoCandles,
  CryptoCoins,
  CryptoInterval,
  SimPortfolio,
} from '@modules/crypto/domain/types';

/** Made-up market and simulator data for the crypto console tests (no real prices). */
export const MARKET = {
  available: true,
  source: 'binance' as const,
  updatedAt: '2026-03-15T12:00:00.000Z',
  stale: false,
};

export function coins(): CryptoCoins {
  return {
    coins: [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 50_000,
        changePercent24h: 1.5,
        high24h: 51_000,
        low24h: 48_500,
        bid: 49_990,
        ask: 50_010,
        volume24h: 12_345_678,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price: 2_000,
        changePercent24h: -2.25,
        high24h: 2_100,
        low24h: 1_950,
        bid: null,
        ask: null,
        volume24h: null,
      },
      {
        symbol: 'SHIB',
        name: 'Shiba Inu',
        price: null,
        changePercent24h: null,
        high24h: null,
        low24h: null,
        bid: null,
        ask: null,
        volume24h: null,
      },
    ],
    market: MARKET,
  };
}

export function candleList(count = 5, start = Date.parse('2026-03-15T08:00:00Z')): Candle[] {
  return Array.from({ length: count }, (_, i) => ({
    time: start + i * 3_600_000,
    open: 100 + i,
    high: 103 + i,
    low: 99 + i,
    close: i % 2 ? 99.5 + i : 102 + i,
    volume: 10 + i,
  }));
}

export function candles(symbol = 'BTC', interval: CryptoInterval = '1h', count = 5): CryptoCandles {
  return { symbol, interval, candles: candleList(count), market: MARKET };
}

export function portfolio(overrides: Partial<SimPortfolio> = {}): SimPortfolio {
  return {
    account: {
      initial: 10_000,
      cash: 8_999,
      reserved: 0,
      feeBps: 10,
      startedAt: '2026-03-15T12:00:00.000Z',
    },
    open: [
      {
        id: 'p1',
        symbol: 'BTC',
        direction: 'long',
        quantity: 0.02,
        entryPrice: 50_000,
        liquidationPrice: null,
        invested: 1_000,
        entryFee: 1,
        openType: 'market',
        openedAt: '2026-03-15T12:00:00.000Z',
        currentPrice: 55_000,
        value: 1_098.9,
        exitFee: 1.1,
        pnl: 97.9,
        pnlPercent: 9.78,
      },
    ],
    pending: [],
    closed: [],
    summary: {
      equity: 10_097.9,
      realized: 0,
      unrealized: 97.9,
      total: 97.9,
      totalPercent: 0.98,
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: null,
    },
    market: MARKET,
    fills: [],
    limits: { pending: 20, open: 50, operations: 1000, pendingDays: 30 },
    ...overrides,
  };
}
