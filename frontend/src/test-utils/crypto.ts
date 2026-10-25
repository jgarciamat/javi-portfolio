import type {
  Candle,
  CryptoCandles,
  CryptoCoins,
  CryptoInterval,
  CryptoRanking,
  PriceAlerts,
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
        quote: 'EUR',
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
        quote: 'EUR',
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
        quote: 'USDT',
      },
    ],
    // SHIB is quoted in USDT; without a reference rate the server leaves it without a price.
    market: { ...MARKET, usdPerEur: null },
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
  return {
    symbol,
    interval,
    quote: symbol === 'BTC' || symbol === 'ETH' ? 'EUR' : 'USDT',
    candles: candleList(count),
    market: { ...MARKET, usdPerEur: symbol === 'BTC' || symbol === 'ETH' ? null : 1.1 },
  };
}

/** The official portfolio of March 2026 (made-up ids). */
export const SEASON_REF = {
  id: 'f0000000-0000-4000-8000-000000000001',
  kind: 'season' as const,
  season: '2026-03',
  startedAt: '2026-03-01T00:00:00.000Z',
};
export const PRACTICE_REF = {
  id: 'f0000000-0000-4000-8000-000000000002',
  kind: 'practice' as const,
  season: null,
  startedAt: '2026-03-10T10:00:00.000Z',
};

export function ranking(overrides: Partial<CryptoRanking> = {}): CryptoRanking {
  return {
    season: { month: '2026-03', endsAt: '2026-03-31T22:00:00.000Z', daysLeft: 16 },
    top: [
      { place: 1, alias: 'Lince', percent: 12.5, trades: 9, premium: true },
      { place: 2, alias: 'Nube', percent: 8.25, trades: 1, premium: false },
      { place: 3, alias: 'Roble', percent: -1.5, trades: 6, premium: false },
    ],
    participants: 7,
    me: {
      place: null,
      percent: 0.98,
      trades: 2,
      activeDays: 1,
      qualified: false,
      missing: { trades: 3, days: 0 },
    },
    settings: { optIn: true, alias: 'Ana', suggestedAlias: 'Ana' },
    previous: null,
    rules: {
      size: 5,
      minTrades: 5,
      minDays: 0,
      prizeDays: 30,
      initial: 10_000,
      aliasMin: 3,
      aliasMax: 20,
    },
    ...overrides,
  };
}

export function alerts(overrides: Partial<PriceAlerts> = {}): PriceAlerts {
  return {
    alerts: [
      {
        id: 'a1',
        symbol: 'BTC',
        condition: 'above',
        price: 60_000,
        createdAt: '2026-03-15T12:00:00.000Z',
        triggeredAt: null,
      },
      {
        id: 'a2',
        symbol: 'ETH',
        condition: 'below',
        price: 1_500,
        createdAt: '2026-03-14T12:00:00.000Z',
        triggeredAt: '2026-03-15T09:00:00.000Z',
      },
    ],
    max: 10,
    pushEnabled: true,
    ...overrides,
  };
}

export function portfolio(overrides: Partial<SimPortfolio> = {}): SimPortfolio {
  return {
    portfolio: SEASON_REF,
    portfolios: [SEASON_REF],
    season: {
      month: '2026-03',
      startsAt: '2026-02-28T23:00:00.000Z',
      endsAt: '2026-03-31T22:00:00.000Z',
      daysLeft: 16,
      endingSoon: false,
      history: [],
    },
    plan: { premium: false, practiceMax: 1, practiceActionsLeft: 5 },
    badges: [{ id: 'firstTrade', earnedAt: '2026-03-15T12:00:00.000Z' }],
    stats: null,
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
        slot: 1,
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
    limits: { pending: 20, open: 50, operations: 1000, pendingDays: 30, perCoin: 2 },
    ...overrides,
  };
}
