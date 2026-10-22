import {
  CHART_INTERVALS,
  flatShare,
  formatCountdown,
  isFlat,
  largerSizes,
  summarize,
  untilClose,
} from '@modules/crypto/domain/chart';
import {
  EURO,
  convertCandles,
  pickCurrency,
  toBaseAmount,
  toBasePrice,
  toDisplay,
} from '@modules/crypto/domain/currency';
import {
  formatChange,
  formatDateTime,
  formatEur,
  formatNumber,
  formatPlain,
  formatPrice,
  formatQuantity,
  formatTick,
  formatVolume,
  pnl,
  priceDecimals,
} from '@modules/crypto/domain/format';
import {
  amountForShare,
  buyEstimate,
  checkOpen,
  coinSlots,
  feeOf,
  fillsNow,
  liquidationPrice,
  needsRise,
  openBreakdown,
  exitResult,
  saleEstimate,
  withSlot,
} from '@modules/crypto/domain/orders';
import { candleList, portfolio } from '@test-utils/crypto';

const nbsp = (text: string) => text.replace(/\u00a0|\u202f/g, ' ');

describe('crypto formats', () => {
  it('keeps four significant digits on tiny prices and two decimals otherwise', () => {
    expect(priceDecimals(64_000)).toBe(2);
    expect(priceDecimals(1)).toBe(2);
    expect(priceDecimals(0.5)).toBe(4);
    expect(priceDecimals(0.000004312)).toBe(9);
    expect(priceDecimals(1e-12)).toBe(10);
    expect(priceDecimals(0)).toBe(2);
    expect(nbsp(formatPrice(0.000004312, 'es'))).toBe('0,000004312 €');
    expect(nbsp(formatPrice(64_123.4, 'es'))).toBe('64.123,40 €');
    expect(formatPlain(0.5, 'en')).toBe('0.5000');
  });

  it('groups thousands always and signs changes', () => {
    expect(nbsp(formatEur(9499.5, 'es'))).toBe('9.499,50 €');
    expect(nbsp(formatEur(12.5, 'es', true))).toBe('+12,50 €');
    expect(nbsp(formatEur(-3, 'en', true))).toBe('−€3.00');
    expect(nbsp(formatChange(1.256, 'es'))).toBe('+1,26 %');
    expect(nbsp(formatChange(0, 'es'))).toBe('0,00 %');
    // The typographic minus, as wide as the plus.
    expect(nbsp(formatChange(-2.5, 'es'))).toBe('−2,50 %');
    expect(formatQuantity(0.00772747, 'es')).toBe('0,00772747');
    expect(formatVolume(1234, 'en')).toMatch(/^1\.2k$/i);
    expect(formatNumber(66.66, 'es')).toBe('66,7');
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
  });

  it('writes dates and axis marks in the local time zone', () => {
    const at = Date.parse('2026-03-15T12:30:00Z');
    expect(formatDateTime(at, 'en')).toContain('2026');
    expect(formatTick(at, 0, 'es')).toBe('2026');
    expect(formatTick(at, 1, 'en')).toBe('Mar');
    expect(formatTick(at, 2, 'es')).toBe('15');
    expect(formatTick(at, 3, 'es')).toBe('12:30');
    expect(formatTick(at, 4, 'es')).toBe('12:30');
  });

  it('tells gains, losses and nothing apart', () => {
    expect(pnl(2)).toBe('pnl pnl-pos');
    expect(pnl(-1)).toBe('pnl pnl-neg');
    expect(pnl(0)).toBe('pnl pnl-zero');
    expect(pnl(null)).toBe('pnl pnl-zero');
  });
});

describe('chart summary', () => {
  const candles = candleList(5);

  it('sums up all candles or the visible stretch', () => {
    expect(CHART_INTERVALS).toEqual(['5m', '15m', '30m', '1h', '4h', '1d', '1w']);
    const all = summarize(candles)!;
    expect(all.first).toBe(candles[0]);
    expect(all.last).toBe(candles[4]);
    expect(all.high).toBe(107);
    expect(all.low).toBe(99);
    expect(all.changePercent).toBeCloseTo(((106 - 100) / 100) * 100);
    const part = summarize(candles, 0.4, 2.6)!;
    expect([part.first, part.last]).toEqual([candles[1], candles[2]]);
    expect(summarize(candles, -10, 100)!.last).toBe(candles[4]);
    expect(summarize(candles, 3.2, 3.8)).toBeNull();
    expect(summarize([])).toBeNull();
  });
});

describe('order helpers', () => {
  it('estimates coins, commission and total like the API', () => {
    expect(feeOf(1000, 10)).toBe(1);
    expect(feeOf(123.45, 25)).toBe(0.31);
    expect(buyEstimate(1000, 50_000, 10)).toEqual({ quantity: 0.02, fee: 1, total: 1001 });
  });

  it('knows when a pending order would fill at once', () => {
    expect(fillsNow('buy', 'limit', 101, 100)).toBe(true);
    expect(fillsNow('buy', 'limit', 99, 100)).toBe(false);
    expect(fillsNow('buy', 'stop', 99, 100)).toBe(true);
    expect(fillsNow('sell', 'limit', 101, 100)).toBe(false);
    expect(fillsNow('sell', 'stop', 101, 100)).toBe(true);
  });
});

describe('countdown to the close of a candle', () => {
  it('counts down from the opening plus the size and never below zero', () => {
    const opened = Date.parse('2026-03-15T12:00:00Z');
    expect(untilClose(opened, '1h', opened + 59 * 60_000)).toBe(60_000);
    expect(untilClose(opened, '5m', opened + 10 * 60_000)).toBe(0);
    expect(formatCountdown(65_000)).toBe('01:05');
    expect(formatCountdown(3 * 3_600_000 + 5 * 60_000)).toBe('3 h 05 min');
    expect(formatCountdown(2 * 86_400_000 + 4 * 3_600_000)).toBe('2 d 04 h');
  });
});

describe('display currency', () => {
  const usd = { currency: 'USD' as const, rate: 1.1 };

  it('converts for display and back to euros without drifting', () => {
    expect(toDisplay(100, usd)).toBeCloseTo(110);
    expect(toBaseAmount(110, usd)).toBe(100);
    expect(toBaseAmount(toDisplay(123.45, usd), usd)).toBe(123.45);
    expect(toBasePrice(toDisplay(0.000004312, usd), usd)).toBeCloseTo(0.000004312, 12);
    const candles = candleList(2);
    expect(convertCandles(candles, EURO)).toBe(candles);
    const converted = convertCandles(candles, usd)[0];
    expect(converted.open).toBeCloseTo(110);
    expect(converted.volume).toBe(10);
  });

  it('remembers the choice or follows the app currency', () => {
    expect(pickCurrency('USD', 'EUR')).toBe('USD');
    expect(pickCurrency('EUR', 'USD')).toBe('EUR');
    expect(pickCurrency(null, 'USD')).toBe('USD');
    expect(pickCurrency('GBP', 'GBP')).toBe('EUR');
    expect(pickCurrency(null, undefined)).toBe('EUR');
  });
});

describe('opening a position', () => {
  const base = {
    direction: 'long' as const,
    type: 'market' as const,
    amount: 1000,
    current: 50_000,
    price: NaN,
    takeProfit: NaN,
    stopLoss: NaN,
    cash: 10_000,
    bps: 10,
  };

  it('estimates a long with its take profit and stop loss', () => {
    const check = checkOpen({ ...base, takeProfit: 55_000, stopLoss: 45_000 });
    expect(check.problems).toEqual([]);
    expect(check.estimate).toEqual({ quantity: 0.02, fee: 1, total: 1001 });
    expect(check.liquidation).toBeNull();
    expect(check.takeProfit!.pnl).toBeCloseTo(97.9);
    expect(check.stopLoss!.pnl).toBeCloseTo(-101.9);
  });

  it('estimates a short the other way round and where it would close by itself', () => {
    const check = checkOpen({ ...base, direction: 'short', takeProfit: 45_000, stopLoss: 55_000 });
    expect(check.problems).toEqual([]);
    expect(check.liquidation).toBe(100_000);
    expect(check.takeProfit!.pnl).toBeCloseTo(98.1);
    expect(check.stopLoss!.pnl).toBeCloseTo(-102.1);
    expect(saleEstimate(0.02, 200_000, 1001, 10, { entry: 50_000, amount: 1000 }).proceeds).toBe(0);
    expect(saleEstimate(1, 1, 0, 0).percent).toBe(0);
  });

  it('lists what is missing or wrong', () => {
    expect(checkOpen({ ...base, current: null, amount: NaN }).problems).toEqual([
      'noPrice',
      'amount',
    ]);
    expect(checkOpen({ ...base, type: 'limit' }).problems).toEqual(['needPrice']);
    expect(checkOpen({ ...base, type: 'limit', price: 51_000 }).problems).toEqual(['fillsNow']);
    expect(
      checkOpen({ ...base, direction: 'short', type: 'limit', price: 49_000 }).problems
    ).toEqual(['fillsNow']);
    expect(checkOpen({ ...base, type: 'stop', price: 52_000, current: null }).problems).toEqual([
      'noPrice',
    ]);
    expect(checkOpen({ ...base, amount: 20_000 }).problems).toEqual(['cash']);
    expect(checkOpen({ ...base, takeProfit: 40_000, stopLoss: 60_000 }).problems).toEqual([
      'takeProfitSide',
      'stopLossSide',
    ]);
    expect(
      checkOpen({ ...base, direction: 'short', takeProfit: 60_000, stopLoss: -1 }).problems
    ).toEqual(['takeProfitSide', 'stopLossSide']);
    const noEntry = checkOpen({ ...base, type: 'limit', takeProfit: 1 });
    expect(noEntry.problems).toEqual(['needPrice']);
    expect(noEntry.takeProfit).toBeNull();
  });

  it('offers shares of the money that leave room for the commission', () => {
    expect(amountForShare(10_000, 100, 10)).toBe(9990.0);
    expect(amountForShare(10_000, 25, 0)).toBe(2500);
    expect(liquidationPrice(30)).toBe(60);
  });
});

describe('result of an open long and short (invented numbers)', () => {
  // 1.000 € of guarantee/purchase at 50.000 € = 0,02 coins, 0,10 % commission each way.
  const base = { quantity: 0.02, entryPrice: 50_000, invested: 1_000, entryFee: 1 };

  it('mirrors a long and a short: same price move, opposite sign, same commissions', () => {
    const long = exitResult({ ...base, direction: 'long' }, 50_075, 10);
    const short = exitResult({ ...base, direction: 'short' }, 49_925, 10);
    // Price result +1,50 €, commissions 1,00 + 1,00 (round of 0,9985 / 1,0015).
    expect(long.fee).toBe(1);
    expect(short.fee).toBe(1);
    expect(long.pnl).toBeCloseTo(-0.5);
    expect(short.pnl).toBeCloseTo(-0.5);
    expect(long.percent).toBeCloseTo(-0.05, 2);
    expect(short.percent).toBeCloseTo(-0.05, 2);
    // The wrong way round the signs flip.
    expect(exitResult({ ...base, direction: 'short' }, 50_075, 10).pnl).toBeCloseTo(-3.5);
    expect(exitResult({ ...base, direction: 'long' }, 49_925, 10).pnl).toBeCloseTo(-3.5);
  });

  it('returns guarantee + price result - exit commission, over what was paid', () => {
    const r = exitResult({ ...base, direction: 'short' }, 49_000, 10);
    // 1.000 + (50.000 - 49.000) x 0,02 = 1.020; commission 0,10 % of 980 = 0,98.
    expect(r.proceeds).toBeCloseTo(1_019.02);
    expect(r.pnl).toBeCloseTo(18.02);
    expect(r.percent).toBeCloseTo((18.02 / 1_001) * 100);
  });

  it('splits the result of an open trade into price, commissions and net', () => {
    // A short from the owner report with invented figures: price result +7,26, fees 4,99 + 5,00.
    const parts = openBreakdown({ pnl: -2.73, entryFee: 5, exitFee: 4.99 });
    expect(parts).toEqual({ price: 7.26, fees: 9.99, net: -2.73 });
    expect(parts!.price - parts!.fees).toBeCloseTo(parts!.net);
    expect(openBreakdown({ pnl: null, entryFee: 1, exitFee: null })).toBeNull();
    // A long that loses: the price result is negative and the net is worse.
    expect(openBreakdown({ pnl: -102.1, entryFee: 1, exitFee: 1.1 })).toEqual({
      price: -100,
      fees: 2.1,
      net: -102.1,
    });
  });

  it('says whether the price must rise or fall to reach a take profit or stop loss', () => {
    expect(needsRise('long', 'takeProfit')).toBe(true);
    expect(needsRise('long', 'stopLoss')).toBe(false);
    expect(needsRise('short', 'takeProfit')).toBe(false);
    expect(needsRise('short', 'stopLoss')).toBe(true);
  });
});

describe('two operations per coin', () => {
  const p = portfolio();
  const entry = { ...p.open[0], symbol: 'BTC' };

  it('writes the number after the word, or the word alone without one', () => {
    expect(withSlot('SOL', 2)).toBe('SOL #2');
    expect(withSlot('TP', null)).toBe('TP');
  });

  it('counts the open ones and the pending purchases of the coin, not their exits', () => {
    expect(coinSlots({ ...p, open: [] }, 'BTC')).toEqual({ used: 0, max: 2, next: 1, full: false });
    const pending = [
      { ...exitOf('p1'), slot: 1 },
      { ...exitOf(null), symbol: 'BTC', slot: 2 },
      { ...exitOf(null), symbol: 'ETH', slot: 1 },
    ];
    expect(coinSlots({ ...p, open: [entry], pending }, 'BTC')).toEqual({
      used: 2,
      max: 2,
      next: 3,
      full: true,
    });
    expect(coinSlots({ ...p, open: [{ ...entry, slot: 2 }] }, 'BTC').next).toBe(1);
  });
});

function exitOf(positionId: string | null) {
  return {
    id: `o-${positionId}`,
    symbol: 'BTC',
    slot: null,
    side: 'buy' as const,
    direction: 'long' as const,
    type: 'limit' as const,
    price: 1,
    amount: null,
    reserved: 0,
    positionId,
    takeProfit: null,
    stopLoss: null,
    createdAt: '',
    expiresAt: '',
    currentPrice: null,
  };
}

describe('empty candles (little volume)', () => {
  const base = { time: 0, open: 1, high: 1.2, low: 0.9, close: 1.1, volume: 5 };

  it('counts a candle without trades: no volume, or one single price', () => {
    expect(isFlat(base)).toBe(false);
    expect(isFlat({ ...base, volume: 0 })).toBe(true);
    expect(isFlat({ ...base, high: 1, low: 1, close: 1 })).toBe(true);
    expect(isFlat({ ...base, high: 1, low: 1 })).toBe(false);
  });

  it('gives the share of empty candles in a stretch, or null with too few to judge', () => {
    const list = Array.from({ length: 20 }, (_, i) => (i < 5 ? { ...base, volume: 0 } : base));
    expect(flatShare(list)).toBe(0.25);
    expect(flatShare(list, 0, 9)).toBe(0.5);
    expect(flatShare(list, -4.5, 9.5)).toBe(0.5);
    expect(flatShare(list, 15, 19)).toBeNull();
    expect(flatShare([])).toBeNull();
  });

  it('suggests up to two larger sizes of an hour or more', () => {
    expect(largerSizes('5m')).toEqual(['1h', '4h']);
    expect(largerSizes('30m')).toEqual(['1h', '4h']);
    expect(largerSizes('1h')).toEqual(['4h', '1d']);
    expect(largerSizes('1d')).toEqual(['1w']);
    expect(largerSizes('1w')).toEqual([]);
    expect(largerSizes('1m')).toEqual(['1h', '4h']);
  });
});
