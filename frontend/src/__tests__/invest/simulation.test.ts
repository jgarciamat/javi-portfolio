import {
  drawdownSeries,
  gaussian,
  horizonFan,
  leverageRoi,
  liquidationMovePct,
  maxDrawdown,
  mulberry32,
  randomWalk,
} from '@modules/invest/domain/simulation';

describe('seeded simulations', () => {
  it('draws the same numbers for the same seed and different ones for another', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = [a(), a(), a()];
    expect(first).toEqual([b(), b(), b()]);
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(mulberry32(43)()).not.toBe(first[0]);
  });

  it('draws gaussian numbers centred on zero', () => {
    const rng = mulberry32(1);
    const sample = Array.from({ length: 4000 }, () => gaussian(rng));
    const mean = sample.reduce((s, n) => s + n, 0) / sample.length;
    expect(Math.abs(mean)).toBeLessThan(0.1);
  });

  it('builds a repeatable random walk from the start value', () => {
    const opts = { seed: 9, steps: 24, driftPct: 1, volPct: 5 };
    const walk = randomWalk(opts);
    expect(walk).toHaveLength(25);
    expect(walk[0]).toBe(100);
    expect(randomWalk(opts)).toEqual(walk);
    expect(randomWalk({ ...opts, start: 50 })[0]).toBe(50);
    expect(walk.every((v) => v > 0)).toBe(true);
  });

  it('does not let a single step lose more than 95 %', () => {
    const walk = randomWalk({ seed: 1, steps: 50, driftPct: -90, volPct: 1 });
    expect(Math.min(...walk)).toBeGreaterThan(0);
  });

  it('measures the fall from the previous peak', () => {
    const dd = drawdownSeries([100, 120, 90, 130, 104]);
    [0, 0, -25, 0, -20].forEach((v, i) => expect(dd[i]).toBeCloseTo(v, 6));
  });

  it('finds the worst fall and whether the peak came back', () => {
    expect(maxDrawdown([100, 120, 60, 80, 125])).toEqual({
      depthPct: -50,
      peakIndex: 1,
      troughIndex: 2,
      recoveryIndex: 4,
    });
    expect(maxDrawdown([100, 120, 60, 80]).recoveryIndex).toBeNull();
    expect(maxDrawdown([100, 110, 120])).toEqual({
      depthPct: 0,
      peakIndex: 0,
      troughIndex: 0,
      recoveryIndex: null,
    });
  });

  it('widens the range of outcomes with the horizon and is repeatable', () => {
    const fan = horizonFan([1, 10, 30], 7, 16);
    expect(fan.map((f) => f.years)).toEqual([1, 10, 30]);
    const spread = fan.map((f) => f.p95 - f.p5);
    expect(spread[0]).toBeLessThan(spread[1]);
    expect(spread[1]).toBeLessThan(spread[2]);
    expect(fan[2].lossPct).toBeLessThan(fan[0].lossPct);
    expect(fan[0].p5).toBeLessThanOrEqual(fan[0].p25);
    expect(fan[0].p25).toBeLessThanOrEqual(fan[0].p50);
    expect(fan[0].p50).toBeLessThanOrEqual(fan[0].p75);
    expect(fan[0].p75).toBeLessThanOrEqual(fan[0].p95);
    expect(horizonFan([1, 10, 30], 7, 16)).toEqual(fan);
    expect(horizonFan([1], 7, 16, 50, 3)).toHaveLength(1);
  });

  it('amplifies a price move with leverage and caps the loss at the margin', () => {
    expect(leverageRoi(5, 10)).toBe(50);
    expect(leverageRoi(-5, 10)).toBe(-50);
    expect(leverageRoi(-30, 10)).toBe(-100);
    expect(liquidationMovePct(10)).toBe(-10);
    expect(liquidationMovePct(2)).toBe(-50);
  });
});
