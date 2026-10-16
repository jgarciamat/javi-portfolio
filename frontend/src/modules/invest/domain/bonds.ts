import { taxOnGain } from './taxes';

export interface BondInput {
  /** Yearly coupon in % of the face value (0 for a Treasury bill). */
  couponPct: number;
  /** Market yield to maturity, in %. */
  yieldPct: number;
  years: number;
}

const FACE = 100;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

const cleanYears = (years: number) => Math.min(50, Math.max(1, Math.round(years) || 1));
const cleanYield = (y: number) => (Number.isFinite(y) ? Math.max(-50, Math.min(100, y)) : 0);
const cleanCoupon = (c: number) => (Number.isFinite(c) ? Math.max(0, Math.min(100, c)) : 0);

/** Price (per 100 of face value) of a bond with yearly coupons that yields `yieldPct`. */
export function bondPrice({ couponPct, yieldPct, years }: BondInput): number {
  const n = cleanYears(years);
  const c = cleanCoupon(couponPct);
  const y = cleanYield(yieldPct) / 100;
  let price = FACE / Math.pow(1 + y, n);
  for (let t = 1; t <= n; t++) price += c / Math.pow(1 + y, t);
  return round4(price);
}

/** Macaulay duration in years: the average time to get the money back, weighted by cash flow. */
export function macaulayDuration(input: BondInput): number {
  const n = cleanYears(input.years);
  const c = cleanCoupon(input.couponPct);
  const y = cleanYield(input.yieldPct) / 100;
  let weighted = (n * FACE) / Math.pow(1 + y, n);
  for (let t = 1; t <= n; t++) weighted += (t * c) / Math.pow(1 + y, t);
  return weighted / bondPrice(input);
}

/** Modified duration: roughly the % the price moves for each 1 point of change in the yield. */
export function modifiedDuration(input: BondInput): number {
  return round4(macaulayDuration(input) / (1 + cleanYield(input.yieldPct) / 100));
}

export interface YieldShock {
  fromPrice: number;
  toPrice: number;
  /** Exact change in %, repricing the bond. */
  changePct: number;
  /** Estimate with the duration only, in %. */
  durationEstimatePct: number;
  duration: number;
}

/** What a move of the yield does to the price, exactly and with the duration shortcut. */
export function yieldShock(input: BondInput, deltaYieldPp: number): YieldShock {
  const delta = Number.isFinite(deltaYieldPp) ? deltaYieldPp : 0;
  const fromPrice = bondPrice(input);
  const toPrice = bondPrice({ ...input, yieldPct: input.yieldPct + delta });
  const duration = modifiedDuration(input);
  return {
    fromPrice,
    toPrice,
    changePct: round2((toPrice / fromPrice - 1) * 100),
    durationEstimatePct: round2(-duration * delta),
    duration,
  };
}

/** Internal rate of return (in %) of yearly cash flows, found by bisection. */
export function irr(flows: number[]): number {
  const npv = (rate: number) => flows.reduce((sum, f, t) => sum + f / Math.pow(1 + rate, t), 0);
  let lo = -0.99;
  let hi = 10;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  return round2(((lo + hi) / 2) * 100);
}

/** Yield to maturity (in %) of a bond bought at `price` (per 100) and held until the end. */
export function yieldFromPrice(price: number, couponPct: number, years: number): number {
  const n = cleanYears(years);
  const p = Number.isFinite(price) && price > 0 ? price : FACE;
  const flows = [-p];
  for (let t = 1; t <= n; t++) flows.push(cleanCoupon(couponPct) + (t === n ? FACE : 0));
  return irr(flows);
}

export interface BondReturn {
  valid: boolean;
  price: number;
  grossYieldPct: number;
  netYieldPct: number;
  /** Money received minus money paid, before and after tax, for the amount invested. */
  grossProfit: number;
  tax: number;
  netProfit: number;
}

/**
 * Hold-to-maturity result of a bond bought at `price`, before and after Spanish savings tax.
 * Coupons are taxed each year and the difference with the face value at the end.
 */
export function bondNetReturn(
  price: number,
  couponPct: number,
  years: number,
  invested: number,
  otherSavingsIncome = 0
): BondReturn {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(invested) || invested <= 0) {
    return {
      valid: false,
      price: 0,
      grossYieldPct: 0,
      netYieldPct: 0,
      grossProfit: 0,
      tax: 0,
      netProfit: 0,
    };
  }
  const n = cleanYears(years);
  const c = cleanCoupon(couponPct);
  const nominal = (invested / price) * FACE;
  const scale = nominal / FACE;
  const grossFlows = [-price];
  const netFlows = [-price];
  let taxPer100 = 0;
  for (let t = 1; t <= n; t++) {
    const last = t === n;
    const income = c + (last ? FACE - price : 0);
    const tax = taxOnGain(income * scale, otherSavingsIncome).tax / scale;
    taxPer100 += tax;
    grossFlows.push(c + (last ? FACE : 0));
    netFlows.push(c + (last ? FACE : 0) - tax);
  }
  const grossProfit = (c * n + FACE - price) * scale;
  const tax = taxPer100 * scale;
  return {
    valid: true,
    price,
    grossYieldPct: irr(grossFlows),
    netYieldPct: irr(netFlows),
    grossProfit: round2(grossProfit),
    tax: round2(tax),
    netProfit: round2(grossProfit - tax),
  };
}

/** Price of a bond for a list of yields: the curve of the chart. */
export function priceCurve(
  couponPct: number,
  years: number,
  yields: number[]
): { yieldPct: number; price: number }[] {
  return yields.map((yieldPct) => ({ yieldPct, price: bondPrice({ couponPct, yieldPct, years }) }));
}
