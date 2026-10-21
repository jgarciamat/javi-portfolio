import type { RentaCcaa } from '../../../domain/rentaData';
import { hasRegion, type RentaRules } from '../../../domain/rentaRules';
import { loadCcaa } from '..';
import { rules2024 } from './2024';
import { rules2025 } from './2025';
import { rules2026 } from './2026';
import { withManualOf } from './shared';

/** The rules of the Renta by tax year: a year without its package is an error, not the last one. */
const RULES: Record<number, RentaRules> = { 2024: rules2024, 2025: rules2025, 2026: rules2026 };

/** The years the app has rules for, oldest first. */
export const RENTA_YEARS: number[] = Object.keys(RULES).map(Number);

/** The year whose campaign is the reference of the app (what a saved Renta without a year is). */
export const DEFAULT_RENTA_YEAR = 2025;

export const hasRules = (year: number): boolean => year in RULES;

export function rentaRules(year: number): RentaRules {
  const rules = RULES[year];
  if (!rules) throw new Error(`No Renta rules for ${year}`);
  return rules;
}

/** The community's data for a year; null when that year's data of the community is not available. */
export function loadCcaaFor(year: number, id: string): Promise<RentaCcaa | null> {
  if (!hasRegion(rentaRules(year), id)) return Promise.resolve(null);
  // Before 2025 the links go to that year's Manual práctico; there is none after 2025 yet.
  return loadCcaa(id).then((c) => (year < 2025 ? withManualOf(c, 2025, year) : c));
}
