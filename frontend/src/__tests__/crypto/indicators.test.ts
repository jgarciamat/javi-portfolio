import {
  LAYERS,
  LAYER_COLORS,
  bollinger,
  ema,
  fibonacci,
  lastValue,
  supportResistance,
  volumeProfile,
  vwap,
} from '@modules/crypto/domain/indicators';
import type { Candle } from '@modules/crypto/domain/types';

// Made-up candles: round numbers that are easy to check by hand.
const c = (
  high: number,
  low: number,
  close = (high + low) / 2,
  volume = 1,
  open = close
): Candle => ({
  time: 0,
  open,
  high,
  low,
  close,
  volume,
});

describe('chart layers', () => {
  it('has a colour for every layer', () => {
    expect(LAYERS.every((id) => /^#[0-9a-f]{6}$/.test(LAYER_COLORS[id]))).toBe(true);
  });

  it('calculates the exponential moving average from a simple average', () => {
    expect(ema([1, 2], 3)).toEqual([null, null]);
    const out = ema([2, 4, 6, 8], 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBe(4);
    expect(out[3]).toBe(6);
    expect(lastValue(out)).toBe(6);
    expect(lastValue([null])).toBeNull();
  });

  it('draws Bollinger bands two deviations around the average', () => {
    const bands = bollinger([1, 3, 1, 3], 2, 2);
    expect(bands.middle).toEqual([null, 2, 2, 2]);
    expect(bands.upper).toEqual([null, 4, 4, 4]);
    expect(bands.lower).toEqual([null, 0, 0, 0]);
    expect(bollinger([5, 5, 5]).middle).toEqual([null, null, null]);
  });

  it('weighs the average price with the volume', () => {
    expect(vwap([c(12, 8, 10, 1), c(22, 18, 20, 3)])).toEqual([10, 17.5]);
    expect(vwap([c(3, 3, 3, 0)])).toEqual([3]);
    expect(vwap([])).toEqual([]);
  });

  it('finds where the volume was traded', () => {
    expect(volumeProfile([])).toBeNull();
    expect(volumeProfile([c(5, 5, 5)])).toEqual({ poc: 5, vah: 5, val: 5 });
    const profile = volumeProfile(
      [c(10, 0, 5, 1), c(6, 4, 5, 10), c(5.5, 5.2, 5.3, 10), c(10, 9, 9.5, 2)],
      10
    )!;
    expect(profile.poc).toBe(5.5);
    expect(profile.val).toBe(5);
    expect(profile.vah).toBe(7);
    // The value area also grows downwards when the band below has more volume.
    const lower = volumeProfile([c(10, 0, 5, 1), c(4, 3, 3.5, 20), c(4.8, 4.2, 4.5, 5)], 10)!;
    expect(lower.poc).toBe(4.5);
    expect(lower.val).toBe(3);
    // The area stops at the edges of the range.
    expect(volumeProfile([c(1, 0, 0.5, 10), c(10, 0, 5, 1)], 10, 1)).toEqual({
      poc: 0.5,
      vah: 10,
      val: 0,
    });
    expect(volumeProfile([c(10, 9, 9.5, 10), c(10, 0, 5, 1)], 10, 1)).toEqual({
      poc: 9.5,
      vah: 10,
      val: 0,
    });
    // With everything in one band the area cannot grow further.
    expect(volumeProfile([c(1, 0, 0.5, 1)], 1, 1)).toEqual({ poc: 0.5, vah: 1, val: 0 });
  });

  it('detects supports below and resistances above the last close', () => {
    expect(supportResistance([c(2, 1)])).toEqual([]);
    const candles = [
      c(10, 9),
      c(11, 10),
      c(15, 12),
      c(11, 10),
      c(10, 5),
      c(11, 10),
      c(15.05, 12),
      c(11, 10),
      c(10, 9, 9.5),
    ];
    expect(supportResistance(candles, 1, 3)).toEqual([
      { price: 5, kind: 'support', touches: 1 },
      { price: 15.025, kind: 'resistance', touches: 2 },
    ]);
  });

  it('lists the nearest level first', () => {
    const candles = [c(10, 8), c(10, 6), c(10, 8), c(10, 7), c(10, 8), c(10, 9, 9.5)];
    expect(supportResistance(candles, 1).map((l) => l.price)).toEqual([7, 6]);
  });

  it('measures the Fibonacci levels from the last stretch', () => {
    expect(fibonacci([c(2, 1)])).toBeNull();
    expect(fibonacci([c(5, 5), c(5, 5)])).toBeNull();
    const up = fibonacci([c(110, 100), c(150, 120), c(200, 160)])!;
    expect(up.direction).toBe('up');
    expect(up.levels[0]).toEqual({ ratio: 0, price: 200 });
    expect(up.levels[3]).toEqual({ ratio: 0.5, price: 150 });
    expect(up.levels[6]).toEqual({ ratio: 1, price: 100 });
    const down = fibonacci([c(200, 160), c(150, 120), c(110, 100)], -2, 9)!;
    expect(down.direction).toBe('down');
    expect(down.levels[0].price).toBe(100);
    expect(down.levels[2].price).toBeCloseTo(138.2);
    expect(fibonacci([c(200, 160), c(150, 120), c(110, 100)], 0.6, 2)!.high).toBe(150);
  });
});
