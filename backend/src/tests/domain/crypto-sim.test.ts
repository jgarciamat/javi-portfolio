import { coinName, isCryptoSymbol } from '@domain/services/crypto-market';
import {
  PENDING_MS,
  feeCents,
  fillPrice,
  fillsNow,
  findFill,
  firstFill,
  performance,
  resolutionFor,
  sale,
} from '@domain/services/crypto-sim';

// Made-up candles: the numbers only have to be easy to follow.
const candle = (time: number, open: number, high: number, low: number, close = open) => ({
  time,
  open,
  high,
  low,
  close,
  volume: 1,
});

describe('crypto coins', () => {
  it('knows the coins of the list and their names', () => {
    expect(isCryptoSymbol('BTC')).toBe(true);
    expect(isCryptoSymbol('FAKE')).toBe(false);
    expect(coinName('ETH')).toBe('Ethereum');
  });
});

describe('commission', () => {
  it('is a share of the amount in basis points, rounded to the cent', () => {
    expect(feeCents(100_000, 10)).toBe(100);
    expect(feeCents(12_345, 25)).toBe(31);
    expect(feeCents(50_000, 0)).toBe(0);
  });
});

describe('fill price of a pending order inside a candle', () => {
  const c = candle(0, 100, 110, 90);

  it('buys with a limit when the price goes down to it (or opens below it)', () => {
    expect(fillPrice('buy', 'limit', 95, c)).toBe(95);
    expect(fillPrice('buy', 'limit', 85, c)).toBeNull();
    expect(fillPrice('buy', 'limit', 105, c)).toBe(100);
  });

  it('buys with a stop when the price goes up to it (or opens above it)', () => {
    expect(fillPrice('buy', 'stop', 105, c)).toBe(105);
    expect(fillPrice('buy', 'stop', 115, c)).toBeNull();
    expect(fillPrice('buy', 'stop', 95, c)).toBe(100);
  });

  it('sells with a limit when the price goes up to it, with a stop when it goes down', () => {
    expect(fillPrice('sell', 'limit', 108, c)).toBe(108);
    expect(fillPrice('sell', 'limit', 120, c)).toBeNull();
    expect(fillPrice('sell', 'stop', 92, c)).toBe(92);
    expect(fillPrice('sell', 'stop', 80, c)).toBeNull();
    expect(fillPrice('sell', 'stop', 101, c)).toBe(100);
  });

  it('tells an order that the current price would fill at once', () => {
    expect(fillsNow('buy', 'limit', 101, 100)).toBe(true);
    expect(fillsNow('buy', 'limit', 99, 100)).toBe(false);
    expect(fillsNow('sell', 'stop', 99, 100)).toBe(false);
    expect(fillsNow('sell', 'limit', 99, 100)).toBe(true);
  });
});

describe('candle size to look back', () => {
  const now = Date.parse('2026-03-15T12:00:00Z');
  const hours = (h: number) => now - h * 3_600_000;

  it('uses the finest size whose last candles reach the oldest order', () => {
    expect(resolutionFor(hours(10), now, 1000)).toBe('1m');
    expect(resolutionFor(hours(48), now, 1000)).toBe('5m');
    expect(resolutionFor(hours(24 * 8), now, 1000)).toBe('15m');
    expect(resolutionFor(hours(24 * 29), now, 1000)).toBe('1h');
    expect(resolutionFor(hours(24 * 100), now, 1000)).toBe('4h');
    expect(resolutionFor(hours(24 * 1000), now, 1000)).toBe('4h');
  });
});

describe('finding when a pending order was reached', () => {
  const created = '2026-03-15T10:00:30Z';
  const t = (iso: string) => Date.parse(iso);
  const order = { side: 'buy' as const, type: 'limit' as const, price: 95, createdAt: created };

  it('skips the candle in which it was placed and takes the first one that reaches it', () => {
    const fill = findFill(
      order,
      [
        candle(t('2026-03-15T10:00:00Z'), 100, 100, 90),
        candle(t('2026-03-15T10:01:00Z'), 100, 101, 97),
        candle(t('2026-03-15T10:02:00Z'), 96, 97, 94),
        candle(t('2026-03-15T10:03:00Z'), 93, 94, 90),
      ],
      null
    );
    expect(fill).toEqual({ price: 95, at: '2026-03-15T10:02:00.000Z' });
  });

  it('falls back to the current price, and ignores it before the order existed', () => {
    const now = t('2026-03-15T11:00:00Z');
    expect(findFill(order, [], { price: 94, at: now })).toEqual({
      price: 94,
      at: '2026-03-15T11:00:00.000Z',
    });
    expect(findFill(order, [], { price: 96, at: now })).toBeNull();
    expect(findFill(order, [], { price: 90, at: t('2026-03-15T09:00:00Z') })).toBeNull();
  });

  it('does not fill after the order expired', () => {
    const late = t(created) + PENDING_MS + 60_000;
    expect(findFill(order, [candle(late, 90, 90, 80)], { price: 80, at: late })).toBeNull();
  });

  it('keeps looking for ever for an order that does not expire (take profit, stop loss)', () => {
    const late = t(created) + PENDING_MS + 60_000;
    expect(findFill(order, [candle(late, 90, 90, 80)], null, Infinity)).toEqual({
      price: 90,
      at: new Date(late).toISOString(),
    });
  });

  it('picks the earliest of several fills, and the stop when they happen at once', () => {
    const at = (iso: string) => ({ price: 1, at: iso });
    const limit = { type: 'limit' as const, fill: at('2026-03-15T10:05:00.000Z') };
    const stop = { type: 'stop' as const, fill: at('2026-03-15T10:05:00.000Z') };
    const earlier = { type: 'limit' as const, fill: at('2026-03-15T10:01:00.000Z') };
    expect(firstFill([limit, stop])).toBe(stop);
    expect(firstFill([stop, limit])).toBe(stop);
    expect(firstFill([stop, earlier])).toBe(earlier);
    expect(firstFill([limit, { ...limit }])).toBe(limit);
    expect(firstFill([])).toBeNull();
  });
});

describe('result of a sale and the totals', () => {
  it('takes the commission of the sale and compares with what was paid', () => {
    const position = { quantity: 0.01, amountCents: 50_000, entryFeeCents: 50 };
    expect(sale(position, 55_000, 10)).toEqual({
      grossCents: 55_000,
      feeCents: 55,
      proceedsCents: 54_945,
      pnlCents: 4_895,
      pnlPercent: 9.78,
    });
    expect(sale(position, 45_000, 10).pnlCents).toBe(-5_095);
    expect(sale({ quantity: 1, amountCents: 0, entryFeeCents: 0 }, 1, 0).pnlPercent).toBe(0);
  });

  it('mirrors long and short: same price move, opposite sign, commission both ways (invented)', () => {
    // 1.000 of purchase or guarantee at 50.000 = 0,02 coins, 0,10 % commission on each side.
    const base = { quantity: 0.02, amountCents: 100_000, entryFeeCents: 100, entryPrice: 50_000 };
    const long = { ...base, direction: 'long' as const };
    const short = { ...base, direction: 'short' as const };
    // Price result +1,50 but 1,00 + 1,00 of commissions: both end at -0,50 (-0,05 %).
    expect(sale(long, 50_075, 10)).toEqual({
      grossCents: 100_150,
      feeCents: 100,
      proceedsCents: 100_050,
      pnlCents: -50,
      pnlPercent: -0.05,
    });
    expect(sale(short, 49_925, 10)).toEqual({
      grossCents: 99_850,
      feeCents: 100,
      proceedsCents: 100_050,
      pnlCents: -50,
      pnlPercent: -0.05,
    });
    // Moving the other way the signs flip.
    expect(sale(short, 49_000, 10)).toMatchObject({
      feeCents: 98,
      proceedsCents: 101_902,
      pnlCents: 1_802,
      pnlPercent: 1.8,
    });
    expect(sale(short, 51_000, 10)).toMatchObject({ proceedsCents: 97_898, pnlCents: -2_202 });
    expect(sale(long, 49_000, 10).pnlCents).toBe(-2_198);
    // Past double the entry a short is worth nothing: the whole amount and its commission.
    expect(sale(short, 100_000, 10)).toMatchObject({ proceedsCents: 0, pnlCents: -100_100 });
    expect(sale(short, 150_000, 10)).toMatchObject({ proceedsCents: 0, pnlCents: -100_100 });
  });

  it('always equals price result minus both commissions, for longs and shorts', () => {
    const base = { quantity: 0.02, amountCents: 100_000, entryFeeCents: 100, entryPrice: 50_000 };
    for (const price of [30_000, 45_000, 49_925, 50_000, 50_075, 60_000, 80_000]) {
      const long = sale({ ...base, direction: 'long' }, price, 10);
      const short = sale({ ...base, direction: 'short' }, price, 10);
      const longPrice = Math.round(0.02 * price * 100) - 100_000;
      const shortPrice = Math.round((50_000 - price) * 0.02 * 100);
      expect(long.pnlCents).toBe(longPrice - 100 - long.feeCents);
      expect(short.pnlCents).toBe(shortPrice - 100 - short.feeCents);
      // The percentage is always over what was paid (amount + entry commission).
      expect(short.pnlPercent).toBe(Math.round((short.pnlCents / 100_100) * 10_000) / 100);
    }
  });

  it('prices a short like the owner report with invented numbers: red only because of commissions', () => {
    const short = {
      direction: 'short' as const,
      quantity: 48.39793926,
      entryPrice: 103.31,
      amountCents: 500_000,
      entryFeeCents: 500,
    };
    const result = sale(short, 103.16, 10);
    // Price result +7,26 (5.007,26 - 5.000,00) against 5,00 + 4,99 of commissions.
    expect(result.proceedsCents - 500_000 + result.feeCents).toBe(726);
    expect(result).toMatchObject({ feeCents: 499, proceedsCents: 500_227, pnlCents: -273 });
    expect(result.pnlPercent).toBe(-0.05);
  });

  it('counts gains, losses and the share of gains', () => {
    expect(performance([])).toEqual({
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: null,
      realizedCents: 0,
    });
    expect(performance([{ pnlCents: 500 }, { pnlCents: -200 }, { pnlCents: 0 }])).toEqual({
      trades: 3,
      wins: 1,
      losses: 1,
      winRate: 33.3,
      realizedCents: 300,
    });
  });
});
