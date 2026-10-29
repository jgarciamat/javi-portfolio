/**
 * Public crypto market data for the «Consola crypto» (an educational simulator with play
 * money): which coins, which candle sizes, which market each coin's prices come from and the
 * shape of a candle. Prices are always in euros: from the coin's real euro market when it is
 * liquid enough, else from its market in USDT converted at the European Central Bank's rate.
 */

/** Coins the console offers: the large ones on the public source (base asset → name). */
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
  { symbol: 'PEPE', name: 'Pepe' },
  { symbol: 'BONK', name: 'Bonk' },
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

/**
 * Candles of the live tick: the one in progress and the one before, so the chart sees the close
 * of a candle that has just ended and the opening of the next.
 */
export const LIVE_CANDLES = 2;

/** The market a coin's prices come from: its pair in euros or in USDT (a dollar stablecoin). */
export type MarketQuote = 'EUR' | 'USDT';

/**
 * Version of the plan below: 1 had every coin on its euro pair; 2 (October 2026) moved the
 * coins whose euro pair barely trades to USDT. A change of plan is a change of code, never a
 * decision taken on the fly, so a coin does not jump from one market to the other between
 * requests (see docs/consola-crypto.md).
 */
export const MARKET_SOURCE_VERSION = 2;

/**
 * Coins that keep their euro pair: measured on 23-10-2026 on the last 1.000 candles, under 1 % of
 * empty 5-minute candles (no trade: open = high = low = close, or no volume) and millions of
 * euros traded a day. Every other coin comes from its USDT pair, with no empty candles: in euros
 * SOL had 1,5 %, XRP 16 %, DOGE 30 %, TRX 62 % and NEAR, SHIB or PEPE 60-95 % at 15 minutes.
 * The configuration may change it (CRYPTO_EURO_PAIRS).
 */
export const EURO_PAIRS: readonly CryptoSymbol[] = ['BTC', 'ETH'];

/** The pair a coin is quoted against with a given plan (the coins kept in euros). */
export const quoteOf = (symbol: CryptoSymbol, euroPairs: readonly CryptoSymbol[]): MarketQuote =>
  euroPairs.includes(symbol) ? 'EUR' : 'USDT';

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
  /** Best buying and selling offers right now (null when the source does not give them). */
  bid: number | null;
  ask: number | null;
  /** Euros traded in the last 24 hours. */
  volume24h: number | null;
  /** The market the numbers come from (USDT ones are already converted to euros). */
  quote: MarketQuote;
}

/** Where the numbers came from and how fresh they are. */
export interface MarketStamp {
  source: 'binance' | 'demo';
  /** When the source answered (ISO). */
  updatedAt: string;
  /** True when the source is down and an older copy is shown. */
  stale: boolean;
  /**
   * Dollars per euro (ECB reference rate) used to turn USDT prices into euros (taking 1 USDT as
   * 1 US$); absent when nothing was converted.
   */
  usdPerEur?: number;
}

export interface MarketFeed<T> extends MarketStamp {
  data: T;
}

export const isCryptoSymbol = (value: string): value is CryptoSymbol =>
  (CRYPTO_SYMBOLS as readonly string[]).includes(value);

export const coinName = (symbol: CryptoSymbol): string =>
  CRYPTO_COINS.find((c) => c.symbol === symbol)!.name;
