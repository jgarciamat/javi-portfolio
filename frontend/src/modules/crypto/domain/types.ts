/**
 * Answers of the «Consola crypto» API (backend/src/application/crypto). Prices in euros; the
 * simulator uses play money only. The contract test checks these against real answers.
 */

export type CryptoInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
export type TradeType = 'market' | 'limit' | 'stop';
export type PendingType = Exclude<TradeType, 'market'>;

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
  quantity: number;
  entryPrice: number;
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
  type: PendingType;
  price: number;
  amount: number | null;
  reserved: number;
  positionId: string | null;
  createdAt: string;
  expiresAt: string;
  currentPrice: number | null;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  invested: number;
  fees: number;
  proceeds: number;
  pnl: number;
  pnlPercent: number;
  openType: TradeType;
  closeType: TradeType;
  openedAt: string;
  closedAt: string;
}

export interface SimFill {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: PendingType | 'expired';
  price: number | null;
  at: string;
}

export interface SimPortfolio {
  account: { initial: number; cash: number; reserved: number; feeBps: number; startedAt: string };
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
  | { action: 'buy'; symbol: string; type: TradeType; amount: number; price?: number }
  | { action: 'sell'; positionId: string; type: TradeType; price?: number };
