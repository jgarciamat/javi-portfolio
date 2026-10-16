import { taxOnGain } from './taxes';

export interface FundInput {
  initial: number;
  monthly: number;
  years: number;
  /** Expected gross annual return, in %. */
  returnPct: number;
  /** Total annual cost (TER) charged by the fund or ETF, in %. */
  terPct: number;
  inflationPct: number;
  /** Apply Spanish savings-base tax to the gain when the money is withdrawn. */
  withTax: boolean;
}

export interface FundYear {
  year: number;
  balance: number;
  contributed: number;
}

export interface FundResult {
  valid: boolean;
  finalBalance: number;
  contributed: number;
  gain: number;
  /** Fees taken out of the fund along the way. */
  feesPaid: number;
  /** Money lost in total to fees: what the same plan would hold at 0 % TER, minus what it holds. */
  feeImpact: number;
  tax: number;
  netAfterTax: number;
  /** Net amount in today's purchasing power. */
  realNet: number;
  yearly: FundYear[];
  pessimistic: FundYear[];
  optimistic: FundYear[];
}

export const MAX_FUND_YEARS = 60;
/** Distance of the pessimistic and optimistic scenarios from the central one, in return points. */
export const BAND_SPREAD_PP = 2;

const round2 = (n: number) => Math.round(n * 100) / 100;
const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

interface Run {
  balance: number;
  contributed: number;
  fees: number;
  yearly: FundYear[];
}

/** Month by month growth with a deposit at the end of every month and the TER taken pro rata. */
function run(
  initial: number,
  monthly: number,
  years: number,
  returnPct: number,
  terPct: number
): Run {
  const gross = Math.pow(1 + Math.max(-99, returnPct) / 100, 1 / 12) - 1;
  const feeRate = terPct / 100 / 12;
  let balance = initial;
  let contributed = initial;
  let fees = 0;
  const yearly: FundYear[] = [];
  for (let month = 1; month <= years * 12; month++) {
    balance *= 1 + gross;
    const fee = Math.max(0, balance) * feeRate;
    fees += fee;
    balance = balance - fee + monthly;
    contributed += monthly;
    if (month % 12 === 0) {
      yearly.push({ year: month / 12, balance: round2(balance), contributed: round2(contributed) });
    }
  }
  return { balance, contributed, fees, yearly };
}

const EMPTY: FundResult = {
  valid: false,
  finalBalance: 0,
  contributed: 0,
  gain: 0,
  feesPaid: 0,
  feeImpact: 0,
  tax: 0,
  netAfterTax: 0,
  realNet: 0,
  yearly: [],
  pessimistic: [],
  optimistic: [],
};

/** Growth of a plan with a fund or ETF: nominal and real value, fees, tax and three scenarios. */
export function projectFund(input: FundInput): FundResult {
  const initial = nonNegative(input.initial);
  const monthly = nonNegative(input.monthly);
  const years = Math.min(MAX_FUND_YEARS, Math.floor(nonNegative(input.years)));
  if (years < 1 || initial + monthly <= 0) return EMPTY;
  const ret = Number.isFinite(input.returnPct) ? input.returnPct : 0;
  const ter = Math.min(10, nonNegative(input.terPct));
  const inflation = Number.isFinite(input.inflationPct) ? Math.max(-50, input.inflationPct) : 0;

  const central = run(initial, monthly, years, ret, ter);
  const free = run(initial, monthly, years, ret, 0);
  const low = run(initial, monthly, years, ret - BAND_SPREAD_PP, ter);
  const high = run(initial, monthly, years, ret + BAND_SPREAD_PP, ter);

  const finalBalance = round2(central.balance);
  const contributed = round2(central.contributed);
  const gain = round2(finalBalance - contributed);
  const tax = input.withTax ? taxOnGain(gain).tax : 0;
  const netAfterTax = round2(finalBalance - tax);
  return {
    valid: true,
    finalBalance,
    contributed,
    gain,
    feesPaid: round2(central.fees),
    feeImpact: round2(free.balance - central.balance),
    tax,
    netAfterTax,
    realNet: round2(netAfterTax / Math.pow(1 + inflation / 100, years)),
    yearly: central.yearly,
    pessimistic: low.yearly,
    optimistic: high.yearly,
  };
}

/** Years a sum takes to double at a yearly rate (the "rule of 72" gives the same within a hair). */
export function doublingYears(ratePct: number): number {
  return ratePct > 0 ? Math.log(2) / Math.log(1 + ratePct / 100) : Infinity;
}
