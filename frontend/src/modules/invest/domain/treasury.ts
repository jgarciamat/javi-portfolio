import { taxOnGain } from './taxes';

/**
 * Spanish Treasury bills (Letras del Tesoro). Every bill has a face value of 1,000 € and is bought
 * at a discount. The Treasury quotes them with the ACTUAL/360 convention: simple interest up to a
 * year, compound beyond it (Orden ECM/2/2026, art. 14.1, and tesoro.es, «Preguntas frecuentes»).
 */
export const LETRA_FACE = 1000;

/** The days a bill of each term usually lives (the exact ones are in the Treasury calendar). */
export const LETRA_TERMS = [
  { months: 3, days: 91 },
  { months: 6, days: 182 },
  { months: 9, days: 273 },
  { months: 12, days: 364 },
] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

const cleanDays = (days: number) => Math.min(3650, Math.max(1, Math.round(days) || 1));

/** Price in % of the face value of a bill with `days` to maturity that yields `ratePct`. */
export function letraPrice(ratePct: number, days: number): number {
  const d = cleanDays(days);
  const i = (Number.isFinite(ratePct) ? Math.max(-50, Math.min(100, ratePct)) : 0) / 100;
  const price = d <= 365 ? 100 / (1 + (i * d) / 360) : 100 / Math.pow(1 + i, d / 360);
  return round4(price);
}

/** Yearly rate (in %, as the Treasury publishes it) of a bill bought at `price` % of face value. */
export function letraRate(price: number, days: number): number {
  const d = cleanDays(days);
  const p = Number.isFinite(price) && price > 0 ? price : 100;
  const rate = d <= 365 ? (100 / p - 1) * (360 / d) : Math.pow(100 / p, 360 / d) - 1;
  return round3(rate * 100);
}

/** Effective yearly rate (TAE, compounded over 365 days) of getting `received` for `paid`. */
export function effectiveYearly(paid: number, received: number, days: number): number {
  if (!(paid > 0) || !(received > 0)) return 0;
  return round2((Math.pow(received / paid, 365 / cleanDays(days)) - 1) * 100);
}

/**
 * What the Bank of Spain charges for sending the money of a matured bill (or a coupon) to your bank
 * account when you hold it in a «cuenta directa»: 1.5 per thousand, at least 0.90 € and at most
 * 200 € (tesoro.es, «Preguntas frecuentes», October 2026).
 */
export function cuentaDirectaFee(amount: number): number {
  if (!(amount > 0)) return 0;
  return round2(Math.min(200, Math.max(0.9, amount * 0.0015)));
}

export interface LetraInput {
  /** Price in % of the face value (what the auction gives). */
  price: number;
  /** Face value bought, in euros: 1,000 € or more, in multiples of 1,000 €. */
  nominal: number;
  days: number;
  /** Fees in euros; `undefined` for the Bank of Spain one on the money paid back. */
  fees?: number;
  /** Other savings income of the year (interest, dividends, gains), for the tax bracket. */
  otherSavingsIncome?: number;
}

export interface LetraReturn {
  valid: boolean;
  /** The face value is not a multiple of 1,000 €, as the Treasury asks. */
  notMultiple: boolean;
  paid: number;
  received: number;
  fees: number;
  /** Received minus paid. */
  grossGain: number;
  /** The Treasury's way: simple yearly rate, ACTUAL/360. */
  ratePct: number;
  grossTaePct: number;
  /** Savings tax on the gain after fees (no withholding: it is paid with the tax return). */
  tax: number;
  netGain: number;
  netTaePct: number;
}

const INVALID: LetraReturn = {
  valid: false,
  notMultiple: false,
  paid: 0,
  received: 0,
  fees: 0,
  grossGain: 0,
  ratePct: 0,
  grossTaePct: 0,
  tax: 0,
  netGain: 0,
  netTaePct: 0,
};

/** Result of a bill held until it matures, before and after fees and Spanish savings tax. */
export function letraReturn(input: LetraInput): LetraReturn {
  const { price, nominal, days } = input;
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 200 ||
    !Number.isFinite(nominal) ||
    nominal < LETRA_FACE
  ) {
    return INVALID;
  }
  const d = cleanDays(days);
  const paid = round2((nominal * price) / 100);
  const fees =
    input.fees !== undefined && Number.isFinite(input.fees)
      ? Math.max(0, input.fees)
      : cuentaDirectaFee(nominal);
  const grossGain = round2(nominal - paid);
  const taxable = round2(grossGain - fees);
  const tax = taxOnGain(taxable, input.otherSavingsIncome ?? 0).tax;
  const netGain = round2(taxable - tax);
  return {
    valid: true,
    notMultiple: nominal % LETRA_FACE !== 0,
    paid,
    received: nominal,
    fees: round2(fees),
    grossGain,
    ratePct: letraRate(price, d),
    grossTaePct: effectiveYearly(paid, nominal, d),
    tax,
    netGain,
    netTaePct: effectiveYearly(paid, paid + netGain, d),
  };
}
