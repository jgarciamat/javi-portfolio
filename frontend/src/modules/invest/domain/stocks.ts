import { taxOnGain } from './taxes';

export interface StockInput {
  shares: number;
  buyPrice: number;
  sellPrice: number;
  /** Broker commission of the purchase and of the sale, in money. */
  feeBuy: number;
  feeSell: number;
  /** Dividend received for each share while holding. */
  dividendPerShare: number;
  /** Retención already taken from the dividends, in % (19 % in Spain). */
  withholdingPct: number;
  /** Other savings income of the same year (interest, other dividends and gains). */
  otherSavingsIncome: number;
}

export interface StockResult {
  valid: boolean;
  invested: number;
  proceeds: number;
  /** Gain of the sale, after commissions. */
  capitalGain: number;
  dividends: number;
  /** Capital gain plus dividends, before tax. */
  grossGain: number;
  /** Amount that goes to the savings base after offsetting a loss against dividends (25 % limit). */
  taxable: number;
  tax: number;
  withheld: number;
  /** Tax still to pay in the tax return (negative: refund). */
  toSettle: number;
  netGain: number;
  netReturnPct: number;
  /** Dividends over the purchase cost, in %. */
  yieldOnCostPct: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const positive = (n: number) => Number.isFinite(n) && n > 0;
const nonNegative = (n: number) => (positive(n) ? n : 0);

const EMPTY: StockResult = {
  valid: false,
  invested: 0,
  proceeds: 0,
  capitalGain: 0,
  dividends: 0,
  grossGain: 0,
  taxable: 0,
  tax: 0,
  withheld: 0,
  toSettle: 0,
  netGain: 0,
  netReturnPct: 0,
  yieldOnCostPct: 0,
};

/** Result of buying shares, collecting dividends and selling, with Spanish savings tax. */
export function stockPosition(input: StockInput): StockResult {
  if (!positive(input.shares) || !positive(input.buyPrice) || !positive(input.sellPrice)) {
    return EMPTY;
  }
  const feeBuy = nonNegative(input.feeBuy);
  const feeSell = nonNegative(input.feeSell);
  const cost = input.shares * input.buyPrice;
  const invested = cost + feeBuy;
  const proceeds = input.shares * input.sellPrice - feeSell;
  const capitalGain = proceeds - invested;
  const dividends = input.shares * nonNegative(input.dividendPerShare);
  // A loss on the sale offsets at most 25 % of the dividends of the year.
  const offset = capitalGain < 0 ? Math.min(-capitalGain, dividends * 0.25) : 0;
  const taxable = capitalGain > 0 ? capitalGain + dividends : dividends - offset;
  const tax = taxOnGain(taxable, input.otherSavingsIncome).tax;
  const withheld = dividends * (Math.min(nonNegative(input.withholdingPct), 100) / 100);
  const grossGain = capitalGain + dividends;
  const netGain = grossGain - tax;
  return {
    valid: true,
    invested: round2(invested),
    proceeds: round2(proceeds),
    capitalGain: round2(capitalGain),
    dividends: round2(dividends),
    grossGain: round2(grossGain),
    taxable: round2(taxable),
    tax: round2(tax),
    withheld: round2(withheld),
    toSettle: round2(tax - withheld),
    netGain: round2(netGain),
    netReturnPct: round2((netGain / invested) * 100),
    yieldOnCostPct: round2((dividends / cost) * 100),
  };
}
