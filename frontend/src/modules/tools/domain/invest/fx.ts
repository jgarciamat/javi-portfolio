import { parseCSV } from '@modules/finances/domain/importParsers';

/**
 * Exchange rates to euros. An amount in another currency is taken to euros with the rate of the day
 * of each operation (the purchase on its day, the sale on its own): LIRPF art. 35 values the
 * acquisition and the transmission when they happen; the official reference is the European Central
 * Bank's daily rate (NO CONFIRMADO which source the AEAT requires; the ECB one is the usual one).
 * The rates are not bundled: the person loads the ECB file (eurofxref-hist.csv, downloaded by them
 * from ecb.europa.eu), or types a rate. Weekends and holidays use the last day published before.
 */

/** Per currency, the days and rates (units of the currency for 1 euro), oldest first. */
export type RateTable = Record<string, [string, number][]>;

/** The currencies that count as dollars or euros (stablecoins), NO CONFIRMADO as exact. */
export const USD_STABLE = new Set([
  'USDT',
  'USDC',
  'BUSD',
  'FDUSD',
  'DAI',
  'TUSD',
  'USDP',
  'PYUSD',
]);
export const EUR_STABLE = new Set(['EURC', 'EURT', 'EURI', 'EUROC']);

/** The ECB file: "Date,USD,JPY,..." with one row a day (newest first) and "N/A" gaps. */
export function parseEcb(text: string, keep?: Set<string>): RateTable {
  const rows = parseCSV(text, ',');
  const header = (rows[0] ?? []).map((h) => h.trim().toUpperCase());
  const table: RateTable = {};
  header.forEach((code, i) => {
    if (i === 0 || !/^[A-Z]{3}$/.test(code) || (keep && !keep.has(code))) return;
    const list: [string, number][] = [];
    for (const row of rows.slice(1)) {
      const rate = Number(row[i]);
      if (/^\d{4}-\d{2}-\d{2}$/.test(row[0]) && rate > 0) list.push([row[0], rate]);
    }
    table[code] = list.sort((a, b) => a[0].localeCompare(b[0]));
  });
  return table;
}

/** Rates typed by the person (one for a currency, used for any day) go in as a single old day. */
export function withTyped(table: RateTable, currency: string, rate: number): RateTable {
  return { ...table, [currency]: [['0000-01-01', rate]] };
}

/** The rate of a day, or of the last day before it with one; null when there is none. */
export function rateOn(table: RateTable, currency: string, date: string): number | null {
  const list = table[currency];
  if (!list || list.length === 0) return null;
  let lo = 0;
  let hi = list.length - 1;
  if (list[0][0] > date) return null;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (list[mid][0] <= date) lo = mid;
    else hi = mid - 1;
  }
  return list[lo][1];
}

/** How an amount was taken to euros: directly, with a rate, as a stablecoin, or not at all. */
export type Valuation = 'eur' | 'rate' | 'stable' | 'missingRate' | 'notMoney';

/** An amount in euros, and how it was got. */
export function toEur(
  amount: number,
  currency: string | null,
  date: string,
  table: RateTable,
  fiat: Set<string>
): { eur: number | null; how: Valuation } {
  if (currency === null) return { eur: null, how: 'notMoney' };
  if (currency === 'EUR') return { eur: amount, how: 'eur' };
  if (EUR_STABLE.has(currency)) return { eur: amount, how: 'stable' };
  const usd = USD_STABLE.has(currency);
  if (!usd && !fiat.has(currency)) return { eur: null, how: 'notMoney' };
  const rate = rateOn(table, usd ? 'USD' : currency, date);
  if (rate === null) return { eur: null, how: 'missingRate' };
  return { eur: amount / rate, how: usd ? 'stable' : 'rate' };
}
