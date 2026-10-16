import { randomWalk } from './simulation';

export type Side = 'long' | 'short';

export interface LeverageInput {
  side: Side;
  /** Own money put as a guarantee. */
  margin: number;
  leverage: number;
  entry: number;
  exit: number;
  /** Fee charged on the opening and again on the closing, % of the position. */
  feePct: number;
  /** Funding or overnight cost, % of the position per day. */
  fundingPctPerDay: number;
  days: number;
  /** Margin the exchange wants to keep before closing the position, % of the position. */
  maintenancePct: number;
}

export interface LeverageResult {
  valid: boolean;
  notional: number;
  units: number;
  priceMovePct: number;
  pnlGross: number;
  fees: number;
  funding: number;
  pnlNet: number;
  equity: number;
  /** Return on the margin, in %. */
  roiPct: number;
  liquidationPrice: number;
  /** Move against the position that triggers the liquidation, in %. */
  liquidationDistancePct: number;
  breakEvenPrice: number;
  liquidated: boolean;
}

export const MAX_LEVERAGE = 125;

const EMPTY: LeverageResult = {
  valid: false,
  notional: 0,
  units: 0,
  priceMovePct: 0,
  pnlGross: 0,
  fees: 0,
  funding: 0,
  pnlNet: 0,
  equity: 0,
  roiPct: 0,
  liquidationPrice: 0,
  liquidationDistancePct: 0,
  breakEvenPrice: 0,
  liquidated: false,
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const positive = (n: number) => Number.isFinite(n) && n > 0;
const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** The costs of a position as fractions, limited to sensible values. */
function costs(input: LeverageInput, leverage: number) {
  return {
    fee: Math.min(5, nonNegative(input.feePct)) / 100,
    dailyFunding: Math.min(5, nonNegative(input.fundingPctPerDay)) / 100,
    days: Math.min(3650, nonNegative(input.days)),
    // The maintenance margin cannot be as large as the margin itself.
    maintenance: Math.min(nonNegative(input.maintenancePct) / 100, 0.5 / leverage),
  };
}

/** Profit, loss, break-even and liquidation price of a leveraged position (simplified model). */
export function leveragedPosition(input: LeverageInput): LeverageResult {
  const { side, margin, leverage, entry, exit } = input;
  if (!positive(margin) || !positive(entry) || !positive(exit)) return EMPTY;
  if (!Number.isFinite(leverage) || leverage < 1 || leverage > MAX_LEVERAGE) return EMPTY;

  const { fee, dailyFunding, days, maintenance } = costs(input, leverage);
  const dir = side === 'long' ? 1 : -1;
  const notional = margin * leverage;
  const units = notional / entry;
  const openFee = notional * fee;
  const funding = notional * dailyFunding * days;
  const liquidationPrice = entry * (1 - dir * (1 / leverage - maintenance));

  const pnlGross = dir * (exit - entry) * units;
  const fees = openFee + units * exit * fee;
  const rawNet = pnlGross - fees - funding;
  const dead = dir * (exit - liquidationPrice) <= 0 || margin + rawNet <= 0;
  const pnlNet = dead ? -margin : rawNet;

  const carried = openFee + funding;
  const breakEvenPrice = (entry + (dir * carried) / units) / (1 - dir * fee);

  return {
    valid: true,
    notional: round2(notional),
    units,
    priceMovePct: round2(((exit - entry) / entry) * 100),
    pnlGross: round2(pnlGross),
    fees: round2(fees),
    funding: round2(funding),
    pnlNet: round2(pnlNet),
    equity: round2(margin + pnlNet),
    roiPct: round2((pnlNet / margin) * 100),
    liquidationPrice: round2(liquidationPrice),
    liquidationDistancePct: round2((Math.abs(liquidationPrice - entry) / entry) * 100),
    breakEvenPrice: round2(breakEvenPrice),
    liquidated: dead,
  };
}

/** Prices typed as "100, 95 110;120" (dot for decimals). Anything that is not a price is skipped. */
export function parsePrices(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map(Number)
    .filter(positive);
}

/** A made-up monthly price path with crypto-like swings, for the DCA example. */
export function illustrativePath(seed = 11, months = 24): number[] {
  return randomWalk({ seed, steps: months - 1, driftPct: 1.5, volPct: 13 }).map(round2);
}

export interface DcaResult {
  valid: boolean;
  invested: number;
  units: number;
  value: number;
  averagePrice: number;
  profit: number;
  roiPct: number;
  /** Final value if all the money had been put in on day one instead. */
  lumpSumValue: number;
  lumpSumRoiPct: number;
}

/** Buying the same amount at every price of the list (periodic purchase). */
export function dcaSimulate(prices: number[], amountPerPeriod: number): DcaResult {
  const clean = prices.filter((p) => positive(p));
  if (clean.length < 2 || !positive(amountPerPeriod)) {
    return {
      valid: false,
      invested: 0,
      units: 0,
      value: 0,
      averagePrice: 0,
      profit: 0,
      roiPct: 0,
      lumpSumValue: 0,
      lumpSumRoiPct: 0,
    };
  }
  const invested = amountPerPeriod * clean.length;
  const units = clean.reduce((sum, p) => sum + amountPerPeriod / p, 0);
  const last = clean[clean.length - 1];
  const value = units * last;
  const lumpValue = (invested / clean[0]) * last;
  return {
    valid: true,
    invested: round2(invested),
    units,
    value: round2(value),
    averagePrice: round2(invested / units),
    profit: round2(value - invested),
    roiPct: round2(((value - invested) / invested) * 100),
    lumpSumValue: round2(lumpValue),
    lumpSumRoiPct: round2(((lumpValue - invested) / invested) * 100),
  };
}
