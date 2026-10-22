/**
 * Public crypto market data for the «Consola crypto» (an educational simulator with play
 * money): which coins, which candle sizes and the shape of a candle. Prices are in euros:
 * every coin has a real EUR market on the public source, so nothing is converted.
 */

/** Coins the console offers: the large ones with a EUR market (base asset → name). */
export const CRYPTO_COINS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'TRX', name: 'TRON' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'BCH', name: 'Bitcoin Cash' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'XLM', name: 'Stellar' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'ATOM', name: 'Cosmos' },
  { symbol: 'NEAR', name: 'NEAR Protocol' },
  { symbol: 'SUI', name: 'Sui' },
  { symbol: 'APT', name: 'Aptos' },
  { symbol: 'POL', name: 'Polygon' },
] as const;

export type CryptoSymbol = (typeof CRYPTO_COINS)[number]['symbol'];
export const CRYPTO_SYMBOLS = CRYPTO_COINS.map((c) => c.symbol) as [
  CryptoSymbol,
  ...CryptoSymbol[],
];

/** Candle sizes of the chart (the same ones as the original console) plus 1m for the simulator. */
export const CRYPTO_INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as const;
export type CryptoInterval = (typeof CRYPTO_INTERVALS)[number];

const MINUTE = 60_000;
export const INTERVAL_MS: Record<CryptoInterval, number> = {
  '1m': MINUTE,
  '5m': 5 * MINUTE,
  '15m': 15 * MINUTE,
  '30m': 30 * MINUTE,
  '1h': 60 * MINUTE,
  '4h': 240 * MINUTE,
  '1d': 1440 * MINUTE,
  '1w': 10_080 * MINUTE,
};

/** Candles kept per coin and size (the most the public source gives in one request). */
export const CANDLES_PER_SERIES = 1000;

/** One candle: when it opened (ms since 1970, UTC) and its prices in euros. */
export interface MarketCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Coins traded during the candle. */
  volume: number;
}

/** The last price of a coin and how it moved in the last 24 hours. */
export interface MarketTicker {
  symbol: CryptoSymbol;
  price: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
}

/** Where the numbers came from and how fresh they are. */
export interface MarketStamp {
  source: 'binance' | 'demo';
  /** When the source answered (ISO). */
  updatedAt: string;
  /** True when the source is down and an older copy is shown. */
  stale: boolean;
}

export interface MarketFeed<T> extends MarketStamp {
  data: T;
}

export const isCryptoSymbol = (value: string): value is CryptoSymbol =>
  (CRYPTO_SYMBOLS as readonly string[]).includes(value);

export const coinName = (symbol: CryptoSymbol): string =>
  CRYPTO_COINS.find((c) => c.symbol === symbol)!.name;
