/**
 * The console can show its amounts in euros or in US dollars. The simulator keeps working in euros
 * (the play money is 10.000 €): dollars are only a conversion for display, with the European
 * Central Bank's rate of the day. What the person types in dollars is turned back into euros
 * before it is sent.
 */
import type { Candle } from './types';

export type DisplayCurrency = 'EUR' | 'USD';
export const DISPLAY_CURRENCIES: DisplayCurrency[] = ['EUR', 'USD'];

export interface Display {
  currency: DisplayCurrency;
  /** Units of `currency` per euro (1 for euros). */
  rate: number;
}

export const EURO: Display = { currency: 'EUR', rate: 1 };

const cents = (value: number) => Math.round(value * 100) / 100;

/** A value in euros as the person sees it. */
export const toDisplay = (euros: number, d: Display): number => euros * d.rate;

/** An amount typed in the display currency, in euros rounded to the cent (what the API keeps). */
export const toBaseAmount = (shown: number, d: Display): number => cents(shown / d.rate);

/** A price typed in the display currency, in euros (prices keep their decimals). */
export const toBasePrice = (shown: number, d: Display): number => shown / d.rate;

/** Candles in the display currency, for the chart and its layers (volume stays in coins). */
export function convertCandles(candles: Candle[], d: Display): Candle[] {
  if (d.rate === 1) return candles;
  return candles.map((c) => ({
    ...c,
    open: c.open * d.rate,
    high: c.high * d.rate,
    low: c.low * d.rate,
    close: c.close * d.rate,
  }));
}

/** The display currency for a stored preference or the app's currency (euros otherwise). */
export function pickCurrency(
  saved: string | null,
  appCurrency: string | undefined
): DisplayCurrency {
  if (saved === 'EUR' || saved === 'USD') return saved;
  return appCurrency === 'USD' ? 'USD' : 'EUR';
}
