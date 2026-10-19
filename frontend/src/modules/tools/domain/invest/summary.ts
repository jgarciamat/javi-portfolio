import { computeRenta, type RentaInput } from '../rentaCalc';
import { emptySavingsDetail, type ImportedSavings, type SavingsBreakdown } from '../rentaGains';
import { round2 } from '../round';
import { withheldInOf } from './formats';
import { buildLedger, type LedgerResult } from './ledger';

/**
 * The summary of an import in plain numbers: the result of each year (this Renta's and the others),
 * by kind of investment, and what it means for the Renta (the engine with and without it).
 */

export type InvestType = 'crypto' | 'sharesEtf' | 'funds' | 'derivatives' | 'other' | 'income';

export interface ImportSummary {
  /** Result of each year found in the files, oldest first; `current` is this Renta's. */
  years: { year: number; result: number; current: boolean }[];
  /** This year's result by kind (losses that wait for a repurchase do not count). */
  byType: Record<InvestType, number>;
  /** This year's total. */
  total: number;
}

/** The summary of a ledger for the year of the Renta. */
export function importSummary(ledger: LedgerResult, year: number): ImportSummary {
  const byType: Record<InvestType, number> = {
    crypto: 0,
    sharesEtf: 0,
    funds: 0,
    derivatives: 0,
    other: 0,
    income: 0,
  };
  const TYPE: Record<string, InvestType> = { crypto: 'crypto', listed: 'sharesEtf', fund: 'funds' };
  for (const s of ledger.sales) byType[TYPE[s.kind] ?? 'other'] += s.gain + s.deferred;
  for (const d of ledger.direct) byType.derivatives += d.gain;
  const c = ledger.imported.capital;
  byType.income = c.interest + c.dividends + c.assets - c.expenses;
  byType.other += ledger.imported.generalGains.reduce((s, g) => s + g, 0);
  for (const key of Object.keys(byType) as InvestType[]) byType[key] = round2(byType[key]);
  const total = round2(Object.values(byType).reduce((s, v) => s + v, 0));
  // This year's line is the total by kind (which also takes the custody fees off).
  const years = [
    ...Object.entries(ledger.years)
      .filter(([y]) => Number(y) !== year)
      .map(([y, r]) => ({
        year: Number(y),
        result: round2(r.savings + r.general),
        current: false,
      })),
    { year, result: total, current: true },
  ];
  return { years: years.sort((a, b) => a.year - b.year), byType, total };
}

/** The ledger of what is already in the Renta (kept file by file in euros); null for an old one. */
export function ledgerOf(imported: ImportedSavings): LedgerResult | null {
  if (!imported.sources || !imported.options) return null;
  return buildLedger(
    imported.sources.flatMap((s) => s.ops),
    {
      year: imported.options.year,
      rates: {},
      professional: imported.options.professional,
      withheldIn: withheldInOf(),
    }
  );
}

/** What the import means for the Renta, worked out by the engine with it and without it. */
export interface RentaEffect {
  /** Savings base with the import (box 0460). */
  savingsBase: number;
  /** Tax of the savings base that the import adds (0 when it is a loss). */
  tax: number;
  /** How much the result of the return changes: positive pays more (or gets back less). */
  result: number;
  /** Losses left for the next four years, with the year they come from and the last to use them. */
  carry: { year: number; amount: number; until: number }[];
  /** Losses of earlier years used this year. */
  pendingUsed: number;
}

const pendingUsed = (b: SavingsBreakdown) =>
  round2(
    b.boxes.pendingGainsOnGains +
      b.boxes.pendingCapitalOnGains +
      b.boxes.pendingCapitalOnCapital +
      b.boxes.pendingGainsOnCapital
  );

export function rentaEffect(input: RentaInput, imported: ImportedSavings): RentaEffect {
  const detail = input.savingsDetail ?? emptySavingsDetail();
  const withIt = computeRenta({ ...input, savingsDetail: { ...detail, imported } });
  const without = computeRenta(
    input.savingsDetail ? { ...input, savingsDetail: { ...detail, imported: undefined } } : input
  );
  const breakdown = withIt.savingsDetail as SavingsBreakdown;
  const year = input.state.year;
  const carry = [...breakdown.carryForward.gains, ...breakdown.carryForward.capital].map((p) => ({
    ...p,
    until: p.year + 4,
  }));
  return {
    savingsBase: withIt.savingsBase,
    tax: round2(Math.max(0, withIt.savingsQuota - without.savingsQuota)),
    result: round2(withIt.result - without.result),
    carry: carry.filter((p) => p.amount > 0 && p.until > year),
    pendingUsed: pendingUsed(breakdown),
  };
}
