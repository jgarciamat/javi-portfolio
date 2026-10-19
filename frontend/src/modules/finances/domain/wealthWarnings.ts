import { figuresFor } from './fiscalFigures';

/**
 * Warnings, not calculations: whether the person may have to file the modelo 720 (assets abroad), the
 * 721 (virtual currencies held abroad) or the 714 (wealth tax), by the thresholds of the law. Each
 * region sets its own minimum, rates and rebates of the wealth tax, so its quota is not worked out.
 *
 * Sources (checked on 19 October 2026): RGAT (Real Decreto 1065/2007) arts. 42 bis, 42 ter, 42 quater
 * and 54 bis, https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984 ; Ley 19/1991 arts. 4.Nueve,
 * 28.Dos and 37, https://www.boe.es/buscar/act.php?id=BOE-A-1991-14392 .
 */

export type AbroadBlock = 'accounts' | 'securities' | 'realEstate' | 'crypto';

export interface WealthInput {
  year: number;
  /** Values at 31 December (accounts: the larger of that balance and the average of the last quarter). */
  abroad: Partial<Record<AbroadBlock, number>>;
  /** The values of each block in the last 720 / 721 filed (none: never filed). */
  lastFiled?: Partial<Record<AbroadBlock, number>>;
  /** Blocks with an asset that stopped being the person's during the year (it must be reported). */
  ended?: AbroadBlock[];
  /** All the assets and rights, valued as the wealth tax says, the main home and the debts. */
  wealth?: { assets: number; home: number; debts: number };
}

export type WealthWarning =
  | { model: '720' | '721'; block: AbroadBlock; value: number; reason: 'first' | 'rise' | 'ended' }
  /** 714: assets above 2,000,000 euros, or a positive base with the State's minimum (the region may change it). */
  | { model: '714'; reason: 'assets' | 'base'; value: number };

const BLOCKS: AbroadBlock[] = ['accounts', 'securities', 'realEstate', 'crypto'];

type Figures = NonNullable<ReturnType<typeof figuresFor>>;

/** The 720 or 721 of a block: above the threshold the first time, after a rise, or an asset that ended. */
function abroadWarning(input: WealthInput, block: AbroadBlock, f: Figures): WealthWarning | null {
  const model = block === 'crypto' ? '721' : '720';
  const value = input.abroad[block] ?? 0;
  const last = input.lastFiled?.[block];
  if (input.ended?.includes(block)) return { model, block, value, reason: 'ended' };
  if (last === undefined)
    return value > f.abroad.threshold ? { model, block, value, reason: 'first' } : null;
  return value - last > f.abroad.rise ? { model, block, value, reason: 'rise' } : null;
}

/** The 714: assets above 2,000,000 euros, or a positive base with the State's minimum. */
function wealthWarning(
  wealth: NonNullable<WealthInput['wealth']>,
  f: Figures
): WealthWarning | null {
  const w = f.wealth;
  if (wealth.assets > w.mustFileAbove)
    return { model: '714', reason: 'assets', value: wealth.assets };
  const base = wealth.assets - Math.min(wealth.home, w.homeExempt) - wealth.debts - w.exemptMinimum;
  return base > 0 ? { model: '714', reason: 'base', value: Math.round(base * 100) / 100 } : null;
}

/** The warnings of a year; empty when the app has no figures for it. */
export function wealthWarnings(input: WealthInput): WealthWarning[] {
  const figures = figuresFor(input.year);
  if (!figures) return [];
  return [
    ...BLOCKS.map((block) => abroadWarning(input, block, figures)),
    input.wealth ? wealthWarning(input.wealth, figures) : null,
  ].filter((w): w is WealthWarning => w !== null);
}
