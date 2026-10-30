import { exitResult } from './orders';
import type {
  Candle,
  CryptoCandles,
  CryptoCoin,
  CryptoCoins,
  CryptoLive,
  OpenTrade,
  SimPortfolio,
} from './types';

/** Time between two live ticks while the chart is on screen. */
export const LIVE_REFRESH_MS = 2000;
/** Longest wait between ticks after failures (2 s, 4 s, 8 s… up to this). */
export const LIVE_MAX_BACKOFF_MS = 30_000;
/** Without a touch, a click, a key or the mouse moving this long, the live tick pauses. */
export const IDLE_MS = 10 * 60_000;

/**
 * Whether a tick belongs to these answers: the same coin and size (and market), and not older
 * than them. An answer may be older than the tick (the series is cached longer on the server),
 * never the other way round, so a slow tick never takes the chart back.
 */
export function fits(tick: CryptoLive | null, answer: CryptoCandles | null): tick is CryptoLive {
  return (
    !!tick &&
    !!answer &&
    tick.symbol === answer.symbol &&
    tick.interval === answer.interval &&
    tick.quote === answer.quote &&
    (tick.market.updatedAt ?? '') >= (answer.market.updatedAt ?? '')
  );
}

/**
 * The candles with those of the tick: the one in progress replaced, the one before it finished
 * and a new one added when it has just opened. Older ones are left alone; with nothing to change
 * the same array is given back.
 */
export function mergeLive(candles: Candle[], tick: Candle[]): Candle[] {
  let out = candles;
  for (const c of tick) {
    const n = out.length;
    if (!n) return out;
    const last = out[n - 1];
    if (c.time > last.time) out = [...out, c];
    else if (c.time === last.time) out = [...out.slice(0, -1), c];
    else if (n > 1 && c.time === out[n - 2].time) out = [...out.slice(0, -2), c, last];
  }
  return out;
}

const same = (a: Candle, b: Candle) =>
  a.time === b.time &&
  a.open === b.open &&
  a.high === b.high &&
  a.low === b.low &&
  a.close === b.close &&
  a.volume === b.volume;

/**
 * What changed from the candles drawn to the next ones when it is only their end (the candle in
 * progress moved, and maybe a new one after it): those candles, oldest first, to update in place
 * without drawing the whole series again. Null when anything else changed (another series, a
 * candle in the middle, one fewer).
 */
export function chartTail(drawn: Candle[], next: Candle[]): Candle[] | null {
  const n = drawn.length;
  if (!n || next.length < n || next.length > n + 1) return null;
  for (let i = 0; i < n - 1; i++) if (!same(drawn[i], next[i])) return null;
  if (next[n - 1].time !== drawn[n - 1].time) return null;
  return next.slice(n - 1).filter((c, i) => i > 0 || !same(c, drawn[n - 1]));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * A coin with the last price of the tick: its 24-hour change worked out again from the opening
 * the list implies (price ÷ (1 + change)), and the day's high and low stretched to it. The offers
 * and the volume stay those of the list.
 */
export function liveCoin(coin: CryptoCoin, price: number): CryptoCoin {
  const change = coin.changePercent24h;
  const opening = coin.price === null || change === null ? null : coin.price / (1 + change / 100);
  return {
    ...coin,
    price,
    changePercent24h: opening ? round2((price / opening - 1) * 100) : change,
    high24h: coin.high24h === null ? null : Math.max(coin.high24h, price),
    low24h: coin.low24h === null ? null : Math.min(coin.low24h, price),
  };
}

/** The list with the coin of the tick at its last price, when the tick is newer than the list. */
export function withLive(list: CryptoCoins, tick: CryptoLive): CryptoCoins {
  if ((tick.market.updatedAt ?? '') < (list.market.updatedAt ?? '')) return list;
  return {
    ...list,
    coins: list.coins.map((c) =>
      c.symbol === tick.symbol && c.quote === tick.quote ? liveCoin(c, tick.price) : c
    ),
  };
}

const cents = (value: number) => Math.round(value * 100) / 100;
const sumOf = (trades: OpenTrade[], key: 'value' | 'pnl') =>
  trades.reduce((sum, trade) => sum + trade[key]!, 0);

/**
 * The portfolio with its open trades of `symbol` worked out again at the live price (the same
 * sums as the API), and its totals with them, so their result moves with the price every 2 s
 * between two answers of the API. The same portfolio back when the live price is not newer than
 * the portfolio's own prices or no open trade is of that coin.
 */
export function withLivePrice(
  p: SimPortfolio,
  symbol: string,
  price: number | null | undefined,
  at: string | null
): SimPortfolio {
  if (price === null || price === undefined || at === null) return p;
  if (at <= (p.market.updatedAt ?? '')) return p;
  if (!p.open.some((trade) => trade.symbol === symbol)) return p;
  const open = p.open.map((trade) => {
    if (trade.symbol !== symbol) return trade;
    const result = exitResult(trade, price, p.account.feeBps);
    return {
      ...trade,
      currentPrice: price,
      value: cents(result.proceeds),
      exitFee: result.fee,
      pnl: cents(result.pnl),
      pnlPercent: cents(result.percent),
    };
  });
  // Another coin without a price leaves the totals as the API gave them (unknown).
  if (open.some((trade) => trade.value === null)) return { ...p, open };
  const equity = cents(p.account.cash + p.account.reserved + sumOf(open, 'value'));
  const total = cents(equity - p.account.initial);
  return {
    ...p,
    open,
    summary: {
      ...p.summary,
      equity,
      unrealized: cents(sumOf(open, 'pnl')),
      total,
      totalPercent: cents((total / p.account.initial) * 100),
    },
  };
}
