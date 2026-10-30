import type { Direction, OpenTrade, PendingType, SimPortfolio, Slot, TradeType } from './types';

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

/** «SOL #1», «TP #2»: a word and the number of its operation (the word alone without one). */
export const withSlot = (text: string, slot: Slot): string => (slot ? `${text} #${slot}` : text);

/**
 * The operations of a coin under way (open positions and pending purchases; their take profit
 * and stop loss do not count), the number the next one would take (the lowest free) and whether
 * there is room for it: the same rule as the API.
 */
export function coinSlots(p: Pick<SimPortfolio, 'open' | 'pending' | 'limits'>, symbol: string) {
  const used = [
    ...p.open.filter((o) => o.symbol === symbol).map((o) => o.slot),
    ...p.pending.filter((o) => o.positionId === null && o.symbol === symbol).map((o) => o.slot),
  ];
  let next = 1;
  while (used.includes(next)) next += 1;
  return { used: used.length, max: p.limits.perCoin, next, full: used.length >= p.limits.perCoin };
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

function exitProblems(
  i: Pick<OpenCheck, 'direction' | 'takeProfit' | 'stopLoss'>,
  entry: number | null
): ('takeProfitSide' | 'stopLossSide')[] {
  if (entry === null) return [];
  const long = i.direction === 'long';
  const problems: ('takeProfitSide' | 'stopLossSide')[] = [];
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

/** What closing an open position at `price` would give: the same sums as the API. */
export function exitResult(
  trade: Pick<OpenTrade, 'direction' | 'quantity' | 'entryPrice' | 'invested' | 'entryFee'>,
  price: number,
  bps: number
) {
  const short =
    trade.direction === 'short' ? { entry: trade.entryPrice, amount: trade.invested } : undefined;
  return saleEstimate(trade.quantity, price, trade.invested + trade.entryFee, bps, short);
}

/**
 * Where an open position's result comes from: what the price alone gives (a long gains when it
 * rises, a short when it falls), the commissions (the one paid on opening plus the estimated one
 * of closing now) and the net result, which is what the card headlines. Null without a price.
 */
export function openBreakdown(
  trade: Pick<OpenTrade, 'pnl' | 'entryFee' | 'exitFee'>
): { price: number; fees: number; net: number } | null {
  if (trade.pnl === null || trade.exitFee === null) return null;
  const fees = cents(trade.entryFee + trade.exitFee);
  return { price: cents(trade.pnl + fees), fees, net: trade.pnl };
}

/** Whether the price must rise (true) or fall (false) for a take profit or stop loss to be reached. */
export const needsRise = (direction: Direction, kind: ExitKind): boolean =>
  (kind === 'takeProfit') === (direction === 'long');

export type ExitKind = 'takeProfit' | 'stopLoss';
export type ExitProblem = 'price' | 'side';

/**
 * Check of a new take profit or stop loss of an open position (null when empty: it is removed;
 * NaN when it is not a number). Against the current price, like the API: a long's take profit above it and its stop loss below;
 * a short's, the other way round. Without a price only the server can tell.
 */
export function exitProblem(
  direction: Direction,
  kind: ExitKind,
  price: number | null,
  current: number | null
): ExitProblem | null {
  if (price === null) return null;
  if (!(price > 0)) return 'price';
  if (current === null) return null;
  const side = direction === 'long' ? 'sell' : 'buy';
  return fillsNow(side, kind === 'takeProfit' ? 'limit' : 'stop', price, current) ? 'side' : null;
}

/** «Register a trade I already opened»: how far back its entry may be (the same as the API). */
export const RECORDED_MAX_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** A clock a few minutes ahead of the server's still counts as now (the same as the API). */
const CLOCK_SKEW_MS = 5 * 60 * 1000;
/** Share away from the current price past which a registered entry is pointed out (not refused). */
export const RECORDED_FAR_SHARE = 0.5;
/** The API refuses an entry further than this from the price (×100 either way), as any order. */
const RANGE = 100;

export type RecordProblem =
  | Exclude<OrderProblem, 'fillsNow'>
  | 'range'
  | 'takeProfitReached'
  | 'stopLossReached'
  | 'liquidated'
  | 'future'
  | 'tooOld';

export interface RecordCheck {
  direction: Direction;
  /** NaN when empty; every number in the same currency. */
  amount: number;
  entry: number;
  current: number | null;
  takeProfit: number;
  stopLoss: number;
  cash: number;
  bps: number;
  /** When it was opened (ms); null for now. */
  openedAt: number | null;
  now: number;
}

/** Problems of the moment of entry: never ahead of now, and no further back than 30 days. */
function momentProblems(openedAt: number | null, now: number): RecordProblem[] {
  if (openedAt === null) return [];
  if (Number.isNaN(openedAt)) return ['future'];
  if (openedAt > now + CLOCK_SKEW_MS) return ['future'];
  return openedAt < now - RECORDED_MAX_DAYS * DAY_MS ? ['tooOld'] : [];
}

/**
 * Entered now, what the price has already passed cannot be: a take profit or stop loss reached,
 * or a short whose guarantee is used up. Entered before, the API checks it with the candles.
 */
function reachedProblems(
  i: RecordCheck,
  entry: number,
  wrongSide: RecordProblem[]
): RecordProblem[] {
  if (i.openedAt !== null || i.current === null) return [];
  const problems: RecordProblem[] = [];
  // One on the wrong side of the entry already says what to change.
  const reached = (kind: ExitKind, price: number) =>
    !Number.isNaN(price) &&
    !wrongSide.includes(`${kind}Side`) &&
    exitProblem(i.direction, kind, price, i.current) === 'side';
  if (reached('takeProfit', i.takeProfit)) problems.push('takeProfitReached');
  if (reached('stopLoss', i.stopLoss)) problems.push('stopLossReached');
  if (i.direction === 'short' && i.current >= liquidationPrice(entry)) problems.push('liquidated');
  return problems;
}

/** Problems of the price, amount and entry (any price, though not absurdly far from now). */
function recordEntryProblems(i: RecordCheck, entry: number | null): RecordProblem[] {
  const problems: RecordProblem[] = [];
  if (i.current === null) problems.push('noPrice');
  if (!(i.amount >= 1)) problems.push('amount');
  if (entry === null) problems.push('needPrice');
  else if (i.current !== null && (entry < i.current / RANGE || entry > i.current * RANGE)) {
    problems.push('range');
  }
  return problems;
}

/**
 * Live checks of «Register a trade I already opened» and its figures: what it costs, what it
 * gives at its take profit and stop loss and how it is doing now (the result it shows once
 * registered). The entry may be any price: far from the current one it is only pointed out.
 */
export function checkRecord(i: RecordCheck) {
  const entry = i.entry > 0 ? i.entry : null;
  const problems = [...recordEntryProblems(i, entry), ...momentProblems(i.openedAt, i.now)];
  const estimate = entry !== null && i.amount >= 1 ? buyEstimate(i.amount, entry, i.bps) : null;
  if (estimate && estimate.total > i.cash) problems.push('cash');
  const wrongSide = exitProblems(i, entry);
  problems.push(...wrongSide);
  if (entry !== null) problems.push(...reachedProblems(i, entry, wrongSide));
  const short = i.direction === 'short' && entry !== null ? { entry, amount: i.amount } : undefined;
  const exit = (price: number | null) =>
    estimate && price !== null && price > 0
      ? saleEstimate(estimate.quantity, price, estimate.total, i.bps, short)
      : null;
  return {
    problems,
    estimate,
    far: isFar(entry, i.current),
    liquidation: short ? liquidationPrice(short.entry) : null,
    takeProfit: exit(i.takeProfit),
    stopLoss: exit(i.stopLoss),
    /** How it would be doing at the current price. */
    now: exit(i.current),
  };
}

/** An entry more than half away from the price now: pointed out, never refused. */
const isFar = (entry: number | null, current: number | null): boolean =>
  entry !== null && current !== null && Math.abs(entry / current - 1) > RECORDED_FAR_SHARE;
