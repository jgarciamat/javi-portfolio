/** Deterministic, illustrative market simulations (never real data). */

/** Small seeded generator: the same seed always draws the same numbers. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draw (Box-Muller). */
export function gaussian(rng: () => number): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface WalkOptions {
  seed: number;
  steps: number;
  /** Mean return per step, in %. */
  driftPct: number;
  /** Standard deviation per step, in %. */
  volPct: number;
  start?: number;
}

/** Geometric random walk: `steps + 1` points starting at `start` (100 by default). */
export function randomWalk({ seed, steps, driftPct, volPct, start = 100 }: WalkOptions): number[] {
  const rng = mulberry32(seed);
  const out = [start];
  for (let i = 0; i < steps; i++) {
    const r = driftPct / 100 + (volPct / 100) * gaussian(rng);
    out.push(out[i] * (1 + Math.max(-0.95, r)));
  }
  return out;
}

/** Percentage below the previous peak at every point (0 or negative). */
export function drawdownSeries(series: number[]): number[] {
  let peak = -Infinity;
  return series.map((v) => {
    peak = Math.max(peak, v);
    return (v / peak - 1) * 100;
  });
}

export interface DrawdownInfo {
  depthPct: number;
  peakIndex: number;
  troughIndex: number;
  /** First index after the trough where the old peak is reached again (null when never). */
  recoveryIndex: number | null;
}

/** The worst peak-to-trough fall of a series. */
export function maxDrawdown(series: number[]): DrawdownInfo {
  let peakIdx = 0;
  let best: DrawdownInfo = { depthPct: 0, peakIndex: 0, troughIndex: 0, recoveryIndex: null };
  series.forEach((v, i) => {
    if (v > series[peakIdx]) peakIdx = i;
    const depth = (v / series[peakIdx] - 1) * 100;
    if (depth < best.depthPct) {
      best = { depthPct: depth, peakIndex: peakIdx, troughIndex: i, recoveryIndex: null };
    }
  });
  if (best.depthPct < 0) {
    const idx = series.findIndex((v, i) => i > best.troughIndex && v >= series[best.peakIndex]);
    best.recoveryIndex = idx === -1 ? null : idx;
  }
  return best;
}

export interface FanPoint {
  years: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  /** Share of simulated paths that end below the starting amount (0-100). */
  lossPct: number;
}

const percentile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

/**
 * Range of outcomes after N years for an asset with the given yearly mean and volatility.
 * Values are the final amount of 100 invested at the start.
 */
export function horizonFan(
  horizons: number[],
  meanPct: number,
  volPct: number,
  runs = 600,
  seed = 7
): FanPoint[] {
  const rng = mulberry32(seed);
  const maxYears = Math.max(...horizons);
  const finals: number[][] = horizons.map(() => []);
  for (let run = 0; run < runs; run++) {
    let value = 100;
    for (let y = 1; y <= maxYears; y++) {
      const r = meanPct / 100 + (volPct / 100) * gaussian(rng);
      value *= 1 + Math.max(-0.95, r);
      const slot = horizons.indexOf(y);
      if (slot !== -1) finals[slot].push(value);
    }
  }
  return horizons.map((years, i) => {
    const sorted = [...finals[i]].sort((a, b) => a - b);
    return {
      years,
      p5: percentile(sorted, 5),
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p95: percentile(sorted, 95),
      lossPct: (sorted.filter((v) => v < 100).length / sorted.length) * 100,
    };
  });
}

/** Return on the margin of a leveraged long position after the price moves `movePct`. */
export function leverageRoi(movePct: number, leverage: number): number {
  return Math.max(-100, movePct * leverage);
}

/** Price move that wipes out the margin (liquidation, ignoring the maintenance margin). */
export function liquidationMovePct(leverage: number): number {
  return -100 / leverage;
}
