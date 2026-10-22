import type { PendingType } from './types';

/** Choices of the simulator, the same as the API accepts. */
export const INITIAL_BALANCES = [1_000, 10_000, 100_000] as const;
export const FEE_OPTIONS_BPS = [0, 10, 25, 50, 100] as const;
export const QUICK_AMOUNTS = [100, 500, 1_000] as const;

const cents = (value: number) => Math.round(value * 100) / 100;

/** Commission of an amount in euros (rounded to the cent, like the API). */
export const feeOf = (amount: number, bps: number): number => cents((amount * bps) / 10_000);

/** What a purchase of `amount` euros at `price` would be: coins, commission and total paid. */
export function buyEstimate(amount: number, price: number, bps: number) {
  const fee = feeOf(amount, bps);
  return { quantity: amount / price, fee, total: cents(amount + fee) };
}

/** Same rule as the API: a pending order the current price already reaches is a market order. */
export function fillsNow(
  side: 'buy' | 'sell',
  type: PendingType,
  price: number,
  current: number
): boolean {
  const buysLow = (side === 'buy') === (type === 'limit');
  return buysLow ? current <= price : current >= price;
}
