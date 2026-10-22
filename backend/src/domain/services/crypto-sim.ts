/**
 * Rules of the crypto simulator (play money, never real): how a pending order is reached by
 * the price, what a commission costs and what a purchase gains or loses. Pure functions, so
 * the same candles always give the same result.
 */
import { CryptoInterval, INTERVAL_MS, MarketCandle } from './crypto-market';

export type OrderSide = 'buy' | 'sell';
/** `market`: now, at the last price. `limit`: at this price or better. `stop`: once the price passes it. */
export type OrderType = 'market' | 'limit' | 'stop';
export type PendingType = Exclude<OrderType, 'market'>;
/** `long`: bought, gains when the price rises. `short`: sold, gains when it falls (1x, play money). */
export type Direction = 'long' | 'short';
/** How a position was closed; `liquidation`: a short whose guarantee ran out. */
export type CloseType = OrderType | 'liquidation';

/**
 * A short is closed by itself when the price doubles: by then the loss equals the guarantee put
 * in (1x, no leverage), so it can never lose more than that.
 */
export const liquidationPrice = (entry: number): number => entry * 2;

/** The market side that opens (`buy` long, `sell` short) or closes a position of `direction`. */
export const sideOf = (direction: Direction, opening: boolean): OrderSide =>
  (direction === 'long') === opening ? 'buy' : 'sell';

export const INITIAL_BALANCES_EUR = [1_000, 10_000, 100_000] as const;
export const DEFAULT_INITIAL_CENTS = 1_000_000;
/** Commission options in basis points (10 = 0,10 %), applied when buying and when selling. */
export const FEE_OPTIONS_BPS = [0, 10, 25, 50, 100] as const;
export const DEFAULT_FEE_BPS = 10;

export const MAX_PENDING_ORDERS = 20;
export const MAX_OPEN_POSITIONS = 50;
/**
 * Operations of one coin at once in a portfolio (open positions and pending orders that open
 * one; their take profit and stop loss do not count), numbered #1 and #2 on the cards and chart.
 */
export const MAX_PER_COIN = 2;
/** Operations kept per user (open and closed); past it, «Start again» or export the history. */
export const MAX_POSITIONS = 1000;
export const PENDING_DAYS = 30;
export const PENDING_MS = PENDING_DAYS * 24 * 60 * 60 * 1000;

/**
 * The number of a new operation of a coin: the lowest one not in use (#1, then #2). It stays with
 * the operation while it lives (a pending order passes it to its position) and is free again once
 * the operation closes or is cancelled.
 */
export function freeSlot(used: (number | null)[]): number {
  let slot = 1;
  while (used.includes(slot)) slot += 1;
  return slot;
}

/** Commission in cents of an amount, rounded to the cent. */
export function feeCents(amountCents: number, bps: number): number {
  return Math.round((amountCents * bps) / 10_000);
}

/**
 * The price a pending order is filled at inside a candle, or null when the candle does not reach
 * it. When the candle opens already past the price (a jump) the order is filled at the opening
 * price: better than asked for a limit order, worse for a stop.
 */
export function fillPrice(
  side: OrderSide,
  type: PendingType,
  price: number,
  candle: Pick<MarketCandle, 'open' | 'high' | 'low'>
): number | null {
  const buysLow = (side === 'buy') === (type === 'limit');
  if (buysLow) return candle.low <= price ? Math.min(price, candle.open) : null;
  return candle.high >= price ? Math.max(price, candle.open) : null;
}

/** Whether a new pending order would be filled right away (then a market order is the tool). */
export function fillsNow(
  side: OrderSide,
  type: PendingType,
  price: number,
  current: number
): boolean {
  return fillPrice(side, type, price, { open: current, high: current, low: current }) !== null;
}

/** Candle size whose last candles reach back to `since`: the finest one that does. */
export function resolutionFor(since: number, now: number, perSeries: number): CryptoInterval {
  const sizes: CryptoInterval[] = ['1m', '5m', '15m', '1h', '4h'];
  return sizes.find((s) => INTERVAL_MS[s] * (perSeries - 1) >= now - since) ?? '4h';
}

export interface PendingLike {
  side: OrderSide;
  type: PendingType;
  price: number;
  createdAt: string;
}

export interface Fill {
  price: number;
  /** When it happened (ISO). */
  at: string;
}

/**
 * The first moment the price reached a pending order: the candles that opened after it was
 * placed (in order), then the current price. Null when it was not reached before expiring.
 * The candle in which the order was placed is skipped: part of it happened before. The take
 * profit and stop loss of an open position (and the guarantee of a short) never expire:
 * `expires` is then `Infinity`.
 */
export function findFill(
  order: PendingLike,
  candles: MarketCandle[],
  current: { price: number; at: number } | null,
  expires = Date.parse(order.createdAt) + PENDING_MS
): Fill | null {
  const created = Date.parse(order.createdAt);
  for (const candle of candles) {
    if (candle.time < created || candle.time > expires) continue;
    const price = fillPrice(order.side, order.type, order.price, candle);
    if (price !== null) return { price, at: new Date(candle.time).toISOString() };
  }
  if (current && current.at >= created && current.at <= expires) {
    const p = current.price;
    const price = fillPrice(order.side, order.type, order.price, { open: p, high: p, low: p });
    if (price !== null) return { price, at: new Date(current.at).toISOString() };
  }
  return null;
}

const PRIORITY: Record<CloseType, number> = { liquidation: 0, stop: 1, limit: 2, market: 3 };

/**
 * Of several ways a position closes the earliest wins; at the same time the most prudent: the
 * exhausted guarantee, then the stop, then the limit.
 */
export function firstFill<T extends { fill: Fill; type: CloseType }>(fills: T[]): T | null {
  return (
    [...fills].sort(
      (a, b) => Date.parse(a.fill.at) - Date.parse(b.fill.at) || PRIORITY[a.type] - PRIORITY[b.type]
    )[0] ?? null
  );
}

export interface SaleResult {
  grossCents: number;
  feeCents: number;
  proceedsCents: number;
  pnlCents: number;
  /** Over what was paid, commission included (%, two decimals). */
  pnlPercent: number;
}

/**
 * What closing a position at `price` would give back: commission, money received, gain or loss.
 * A long is sold. A short gives back its guarantee plus what the price fell (minus what it rose),
 * never less than nothing.
 */
export function sale(
  position: {
    quantity: number;
    amountCents: number;
    entryFeeCents: number;
    direction?: Direction;
    entryPrice?: number;
  },
  price: number,
  bps: number
): SaleResult {
  const grossCents = Math.round(position.quantity * price * 100);
  const fee = feeCents(grossCents, bps);
  const valueCents =
    position.direction === 'short'
      ? position.amountCents + Math.round((position.entryPrice! - price) * position.quantity * 100)
      : grossCents;
  const proceedsCents = Math.max(0, valueCents - fee);
  const paid = position.amountCents + position.entryFeeCents;
  const pnlCents = proceedsCents - paid;
  return {
    grossCents,
    feeCents: fee,
    proceedsCents,
    pnlCents,
    pnlPercent: paid > 0 ? Math.round((pnlCents / paid) * 10_000) / 100 : 0,
  };
}

export interface Performance {
  trades: number;
  wins: number;
  losses: number;
  /** Share of closed operations with a gain (%), null with none. */
  winRate: number | null;
  realizedCents: number;
}

/** Totals of the closed operations: how many, how many gained and the money gained or lost. */
export function performance(closed: { pnlCents: number }[]): Performance {
  const wins = closed.filter((c) => c.pnlCents > 0).length;
  const losses = closed.filter((c) => c.pnlCents < 0).length;
  return {
    trades: closed.length,
    wins,
    losses,
    winRate: closed.length ? Math.round((wins / closed.length) * 1000) / 10 : null,
    realizedCents: closed.reduce((sum, c) => sum + c.pnlCents, 0),
  };
}
