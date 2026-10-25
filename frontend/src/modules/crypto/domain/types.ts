/**
 * Answers of the «Consola crypto» API (backend/src/application/crypto). Prices in euros (those of
 * coins quoted in USDT already converted by the server); the simulator uses play money only.
 * The contract test checks these against real answers.
 */

export type CryptoInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
export type TradeType = 'market' | 'limit' | 'stop';
export type PendingType = Exclude<TradeType, 'market'>;
/** `long`: bought, gains when the price rises; `short`: sold, gains when it falls (1x). */
export type Direction = 'long' | 'short';
/** The market a coin's prices come from: its euro pair, or its USDT pair converted to euros. */
export type Quote = 'EUR' | 'USDT';

export interface MarketStatus {
  available: boolean;
  source: 'binance' | 'demo';
  /** When the source answered (ISO); null when it has not. */
  updatedAt: string | null;
  /** The source is down and an older copy is shown. */
  stale: boolean;
  /**
   * Dollars per euro (ECB reference rate of the day) the server used to convert USDT prices to
   * euros; null when it converted none. Only on the market answers (coins and candles).
   */
  usdPerEur?: number | null;
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
  quote: Quote;
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
  quote: Quote;
  candles: Candle[];
  market: MarketStatus;
}

/**
 * Number of an operation among those of its coin (#1, #2: two at most at once), the same on its
 * card and on the chart; it stays while the operation lives and is free again once it ends. Null
 * on the oldest closed ones.
 */
export type Slot = number | null;

export interface OpenTrade {
  id: string;
  symbol: string;
  slot: Slot;
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
  /** A pending purchase's number, or that of the position a take profit or stop loss goes with. */
  slot: Slot;
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
  slot: Slot;
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
  /** `season`: closed at the last price when its month ended. */
  closeType: TradeType | 'liquidation' | 'season';
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
  slot: Slot;
}

/** A play-money portfolio: the official one of a monthly season, or a practice one. */
export interface PortfolioRef {
  id: string;
  kind: 'season' | 'practice';
  /** YYYY-MM (Spain) of an official portfolio; null for practice. */
  season: string | null;
  startedAt: string;
}

/** A finished season as the person sees it. */
export interface SeasonResult {
  season: string;
  initial: number;
  final: number;
  percent: number;
  trades: number;
  wins: number;
  activeDays: number;
  qualified: boolean;
  ranked: boolean;
  place: number | null;
  prizeDays: number;
}

export type BadgeId = 'firstTrade' | 'firstTakeProfit' | 'tenTrades' | 'positiveMonth';

export interface TradeHighlight {
  symbol: string;
  direction: Direction;
  pnl: number;
  pnlPercent: number;
  closedAt: string;
}

/** Advanced statistics (Premium). */
export interface SimStats {
  winRate: number | null;
  wins: number;
  losses: number;
  best: TradeHighlight | null;
  worst: TradeHighlight | null;
  averageWin: number | null;
  averageLoss: number | null;
  equityDays: { day: string; equity: number }[];
  hold: { symbol: string; startPrice: number; price: number; percent: number } | null;
}

export interface SimPortfolio {
  portfolio: PortfolioRef;
  portfolios: PortfolioRef[];
  season: {
    month: string;
    startsAt: string;
    endsAt: string;
    daysLeft: number;
    endingSoon: boolean;
    history: SeasonResult[];
  };
  plan: { premium: boolean; practiceMax: number; practiceActionsLeft: number };
  badges: { id: BadgeId; earnedAt: string }[];
  stats: SimStats | null;
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
  limits: {
    pending: number;
    open: number;
    operations: number;
    pendingDays: number;
    /** Operations of one coin at once (open and pending to open). */
    perCoin: number;
  };
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

/**
 * Take profit and stop loss of an open position: a price sets or moves it, null removes it and
 * leaving it out keeps it as it is.
 */
export interface ExitsRequest {
  takeProfit?: number | null;
  stopLoss?: number | null;
}

/** An order for a given portfolio (the official one of the month when missing). */
export type PortfolioOrder = OrderRequest & { portfolioId?: string };

/** One place of the monthly ranking: only the alias. */
export interface RankingRow {
  place: number;
  alias: string;
  percent: number;
  trades: number;
  premium: boolean;
}

export interface CryptoRanking {
  season: { month: string; endsAt: string; daysLeft: number };
  top: RankingRow[];
  participants: number;
  me: {
    place: number | null;
    percent: number | null;
    trades: number;
    activeDays: number;
    qualified: boolean;
    /** `days` is always 0 (there is no minimum of days): only older versions of the app read it. */
    missing: { trades: number; days: number };
  };
  /**
   * Everybody is in the ranking: the alias shown (the one chosen, else the first name, else
   * «Jugador» and four digits) and the one given when none is chosen. `optIn` is always true
   * (older versions of the app showed a switch).
   */
  settings: { optIn: true; alias: string; suggestedAlias: string };
  previous: { month: string; top: RankingRow[] } | null;
  rules: {
    size: number;
    minTrades: number;
    /** Always 0 (there is no minimum of days): only older versions of the app read it. */
    minDays: number;
    prizeDays: number;
    initial: number;
    aliasMin: number;
    aliasMax: number;
  };
}

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  createdAt: string;
  triggeredAt: string | null;
}

export interface PriceAlerts {
  alerts: PriceAlert[];
  max: number;
  pushEnabled: boolean;
}

/** The full report of a season (Premium). */
export interface SeasonReport {
  season: string;
  finished: boolean;
  initial: number;
  result: SeasonResult | null;
  closed: ClosedTrade[];
  stats: SimStats;
}
