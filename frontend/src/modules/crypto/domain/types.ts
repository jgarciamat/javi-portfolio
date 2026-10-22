/**
 * Answers of the «Consola crypto» API (backend/src/application/crypto). Prices in euros; the
 * simulator uses play money only. The contract test checks these against real answers.
 */

export type CryptoInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
export type TradeType = 'market' | 'limit' | 'stop';
export type PendingType = Exclude<TradeType, 'market'>;
/** `long`: bought, gains when the price rises; `short`: sold, gains when it falls (1x). */
export type Direction = 'long' | 'short';

export interface MarketStatus {
  available: boolean;
  source: 'binance' | 'demo';
  /** When the source answered (ISO); null when it has not. */
  updatedAt: string | null;
  /** The source is down and an older copy is shown. */
  stale: boolean;
}

export interface CryptoCoin {
  symbol: string;
  name: string;
  price: number | null;
  changePercent24h: number | null;
  high24h: number | null;
  low24h: number | null;
  /** Best offers to buy (bid) and to sell (ask) on the public market. */
  bid: number | null;
  ask: number | null;
  /** Euros traded in the last 24 hours. */
  volume24h: number | null;
}

export interface CryptoCoins {
  coins: CryptoCoin[];
  market: MarketStatus;
}

export interface Candle {
  /** When the candle opened (ms, UTC). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CryptoCandles {
  symbol: string;
  interval: CryptoInterval;
  candles: Candle[];
  market: MarketStatus;
}

export interface OpenTrade {
  id: string;
  symbol: string;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  /** A short closes by itself here (its guarantee is used up); null for longs. */
  liquidationPrice: number | null;
  invested: number;
  entryFee: number;
  openType: TradeType;
  openedAt: string;
  currentPrice: number | null;
  /** What selling now would give, after the commission. */
  value: number | null;
  exitFee: number | null;
  pnl: number | null;
  pnlPercent: number | null;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  direction: Direction;
  type: PendingType;
  price: number;
  amount: number | null;
  reserved: number;
  positionId: string | null;
  /** Take profit and stop loss a pending purchase will leave once filled. */
  takeProfit: number | null;
  stopLoss: number | null;
  createdAt: string;
  expiresAt: string;
  currentPrice: number | null;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  invested: number;
  fees: number;
  proceeds: number;
  pnl: number;
  pnlPercent: number;
  openType: TradeType;
  closeType: TradeType | 'liquidation';
  openedAt: string;
  closedAt: string;
}

export interface SimFill {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  direction: Direction;
  type: PendingType | 'liquidation' | 'expired';
  price: number | null;
  at: string;
}

export interface SimPortfolio {
  account: {
    initial: number;
    cash: number;
    reserved: number;
    feeBps: number;
    startedAt: string;
  };
  open: OpenTrade[];
  pending: PendingOrder[];
  closed: ClosedTrade[];
  summary: {
    equity: number | null;
    realized: number;
    unrealized: number | null;
    total: number | null;
    totalPercent: number | null;
    trades: number;
    wins: number;
    losses: number;
    winRate: number | null;
  };
  market: MarketStatus;
  fills: SimFill[];
  limits: { pending: number; open: number; operations: number; pendingDays: number };
}

export type OrderRequest =
  | {
      action: 'buy';
      symbol: string;
      /** Long (the default) or short, always 1x. */
      direction?: Direction;
      type: TradeType;
      amount: number;
      price?: number;
      /** Sell if the price goes up to this (take profit). */
      takeProfit?: number;
      /** Sell if the price goes down to this (stop loss). */
      stopLoss?: number;
    }
  | { action: 'sell'; positionId: string; type: TradeType; price?: number };
