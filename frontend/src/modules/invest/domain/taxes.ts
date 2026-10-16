import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';

export interface SavingsBracket {
  from: number;
  /** Combined State + regional rate, in %. */
  rate: number;
}

const { state, regional } = rentaWorkExtras.savingsScale;

/**
 * Savings-base scale of the app's own tax data (the State and regional halves added up):
 * 19, 21, 23, 27 and 30 %. Navarra and the Basque Country have their own rules.
 */
export const SAVINGS_SCALE: SavingsBracket[] = state.map((b, i) => ({
  from: b.from,
  rate: Math.round((b.rate + regional[i].rate) * 100) / 100,
}));

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Tax of a savings base (interest, dividends and gains of the year, already netted). */
export function savingsTax(base: number): number {
  const amount = Number.isFinite(base) ? Math.max(0, base) : 0;
  let tax = 0;
  SAVINGS_SCALE.forEach((b, i) => {
    const upper = SAVINGS_SCALE[i + 1]?.from ?? Infinity;
    if (amount > b.from) tax += (Math.min(amount, upper) - b.from) * (b.rate / 100);
  });
  return round2(tax);
}

export interface GainTax {
  gain: number;
  tax: number;
  net: number;
  /** Average rate over the gain, in %. */
  averageRatePct: number;
  /** Rate of the last euro of the whole savings base, in %. */
  marginalRatePct: number;
}

/**
 * Tax on a gain that adds up to the other savings income of the same year.
 * A loss pays nothing (and can offset gains: see the rules of the section).
 */
export function taxOnGain(gain: number, otherSavingsIncome = 0): GainTax {
  const g = Number.isFinite(gain) ? gain : 0;
  const other = Number.isFinite(otherSavingsIncome) ? Math.max(0, otherSavingsIncome) : 0;
  if (g <= 0) return { gain: g, tax: 0, net: g, averageRatePct: 0, marginalRatePct: 0 };
  const tax = round2(savingsTax(other + g) - savingsTax(other));
  const top = other + g;
  const marginal = [...SAVINGS_SCALE].reverse().find((b) => top > b.from) as SavingsBracket;
  return {
    gain: g,
    tax,
    net: round2(g - tax),
    averageRatePct: round2((tax / g) * 100),
    marginalRatePct: marginal.rate,
  };
}
