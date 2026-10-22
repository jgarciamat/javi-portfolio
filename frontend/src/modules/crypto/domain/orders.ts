import type { Direction, PendingType, TradeType } from './types';

/** The commission is fixed: 0,10 % when opening and again when closing (10 basis points). */
export const FIXED_FEE_BPS = 10;
export const QUICK_AMOUNTS = [100, 500, 1_000] as const;

const cents = (value: number) => Math.round(value * 100) / 100;

/** Commission of an amount in euros (rounded to the cent, like the API). */
export const feeOf = (amount: number, bps: number): number => cents((amount * bps) / 10_000);

/** What a purchase of `amount` euros at `price` would be: coins, commission and total paid. */
export function buyEstimate(amount: number, price: number, bps: number) {
  const fee = feeOf(amount, bps);
  return { quantity: amount / price, fee, total: cents(amount + fee) };
}

/** Same rule as the API: a pending order the current price already reaches is a market order. */
export function fillsNow(
  side: 'buy' | 'sell',
  type: PendingType,
  price: number,
  current: number
): boolean {
  const buysLow = (side === 'buy') === (type === 'limit');
  return buysLow ? current <= price : current >= price;
}

/** Percentages of the available money offered as shortcuts for the amount. */
export const AMOUNT_SHARES = [25, 50, 75, 100] as const;

/**
 * The amount (cents down) that uses `share` % of the available money, leaving room for the
 * commission, so 100 % never goes over what there is.
 */
export function amountForShare(cash: number, share: number, bps: number): number {
  return Math.floor(((cash * share) / 100 / (1 + bps / 10_000)) * 100) / 100;
}

/**
 * What closing a position at `price` would give back against what was paid. A long is sold; a
 * short gives back its guarantee (`amount`) plus what the price fell from `entry`, never less
 * than nothing (1x).
 */
export function saleEstimate(
  quantity: number,
  price: number,
  paid: number,
  bps: number,
  short?: { entry: number; amount: number }
) {
  const gross = quantity * price;
  const fee = feeOf(gross, bps);
  const value = short ? short.amount + (short.entry - price) * quantity : gross;
  const proceeds = Math.max(0, value - fee);
  const pnl = proceeds - paid;
  return { proceeds, fee, pnl, percent: paid > 0 ? (pnl / paid) * 100 : 0 };
}

/** A short closes by itself when the price doubles: its guarantee is used up (1x). */
export const liquidationPrice = (entry: number): number => entry * 2;

export type OrderProblem =
  'noPrice' | 'amount' | 'needPrice' | 'fillsNow' | 'cash' | 'takeProfitSide' | 'stopLossSide';

export interface OpenCheck {
  direction: Direction;
  type: TradeType;
  /** NaN when empty; every number in the same currency. */
  amount: number;
  current: number | null;
  price: number;
  takeProfit: number;
  stopLoss: number;
  cash: number;
  bps: number;
}

function entryProblems(i: OpenCheck): OrderProblem[] {
  const problems: OrderProblem[] = [];
  const pending = i.type !== 'market';
  const side = i.direction === 'long' ? 'buy' : 'sell';
  if (i.current === null) problems.push('noPrice');
  if (!(i.amount >= 1)) problems.push('amount');
  if (pending && !(i.price > 0)) problems.push('needPrice');
  else if (
    pending &&
    i.current !== null &&
    fillsNow(side, i.type as PendingType, i.price, i.current)
  ) {
    problems.push('fillsNow');
  }
  return problems;
}

function exitProblems(i: OpenCheck, entry: number | null): OrderProblem[] {
  if (entry === null) return [];
  const long = i.direction === 'long';
  const problems: OrderProblem[] = [];
  if (
    !Number.isNaN(i.takeProfit) &&
    !(i.takeProfit > 0 && (long ? i.takeProfit > entry : i.takeProfit < entry))
  ) {
    problems.push('takeProfitSide');
  }
  if (
    !Number.isNaN(i.stopLoss) &&
    !(i.stopLoss > 0 && (long ? i.stopLoss < entry : i.stopLoss > entry))
  ) {
    problems.push('stopLossSide');
  }
  return problems;
}

/**
 * Live checks of a new position («Before opening») and what it would cost, and give at its take
 * profit and stop loss. A short keeps the amount as its guarantee, like a purchase pays it.
 */
export function checkOpen(i: OpenCheck) {
  const problems = entryProblems(i);
  const pending = i.type !== 'market';
  const entry = pending ? (i.price > 0 ? i.price : null) : i.current;
  const estimate = entry !== null && i.amount >= 1 ? buyEstimate(i.amount, entry, i.bps) : null;
  if (estimate && estimate.total > i.cash) problems.push('cash');
  problems.push(...exitProblems(i, entry));
  const short = i.direction === 'short' && entry !== null ? { entry, amount: i.amount } : undefined;
  const exit = (price: number) =>
    estimate && price > 0
      ? saleEstimate(estimate.quantity, price, estimate.total, i.bps, short)
      : null;
  return {
    problems,
    estimate,
    liquidation: short ? liquidationPrice(short.entry) : null,
    takeProfit: exit(i.takeProfit),
    stopLoss: exit(i.stopLoss),
  };
}
