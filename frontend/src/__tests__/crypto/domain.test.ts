import { CHART_INTERVALS, summarize } from '@modules/crypto/domain/chart';
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
import { buyEstimate, feeOf, fillsNow } from '@modules/crypto/domain/orders';
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
