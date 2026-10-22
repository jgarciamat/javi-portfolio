import {
  CHART_INTERVALS,
  formatCountdown,
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
  formatRate,
  formatTick,
  formatVolume,
  priceDecimals,
  tone,
} from '@modules/crypto/domain/format';
import {
  amountForShare,
  buyEstimate,
  checkOpen,
  feeOf,
  fillsNow,
  liquidationPrice,
  saleEstimate,
} from '@modules/crypto/domain/orders';
import { candleList } from '@test-utils/crypto';

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
    expect(nbsp(formatEur(-3, 'en', true))).toBe('-€3.00');
    expect(nbsp(formatChange(1.256, 'es'))).toBe('+1,26 %');
    expect(nbsp(formatChange(0, 'es'))).toBe('0,00 %');
    expect(formatQuantity(0.00772747, 'es')).toBe('0,00772747');
    expect(nbsp(formatRate(10, 'es'))).toBe('0,1 %');
    expect(nbsp(formatRate(0, 'en'))).toBe('0%');
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

  it('tells up, down and flat apart', () => {
    expect(tone(2)).toBe('up');
    expect(tone(-1)).toBe('down');
    expect(tone(0)).toBe('flat');
    expect(tone(null)).toBe('flat');
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
