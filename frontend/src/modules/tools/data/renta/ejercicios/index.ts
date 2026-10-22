import type { RentaCcaa } from '../../../domain/rentaData';
import { hasRegion, type RentaRules } from '../../../domain/rentaRules';
import { loadCcaa } from '..';
import { rules2024 } from './2024';
import { rules2025 } from './2025';
import { rules2026 } from './2026';
import { regions2024 } from './2024-ccaa';
import { regionOfYear, type RegionYear } from './regions';
import { withManualOf } from './shared';

/** The rules of the Renta by tax year: a year without its package is an error, not the last one. */
const RULES: Record<number, RentaRules> = { 2024: rules2024, 2025: rules2025, 2026: rules2026 };

/** The years the app has rules for, oldest first. */
export const RENTA_YEARS: number[] = Object.keys(RULES).map(Number);

/** The year whose campaign is the reference of the app (what a saved Renta without a year is). */
export const DEFAULT_RENTA_YEAR = 2025;

export const hasRules = (year: number): boolean => year in RULES;

/** The years with rules up to the running one, the newest first. */
export const yearsUpTo = (current: number): number[] =>
  RENTA_YEARS.filter((y) => y <= current).reverse();

/**
 * The year a Renta opens on: the one left half done, else the return filed in spring (the previous
 * year's), else the newest one with rules.
 */
export function openingYear(current: number, saved?: number): number {
  const years = yearsUpTo(current);
  if (saved !== undefined && years.includes(saved)) return saved;
  if (years.includes(current - 1)) return current - 1;
  return years[0] ?? DEFAULT_RENTA_YEAR;
}

/** A result saved for the year (one saved before the years had rules is of 2025), or nothing. */
export const ownSnapshot = <T extends { year?: number }>(
  saved: T | null,
  year: number
): T | null => (saved && (saved.year ?? DEFAULT_RENTA_YEAR) === year ? saved : null);

export function rentaRules(year: number): RentaRules {
  const rules = RULES[year];
  if (!rules) throw new Error(`No Renta rules for ${year}`);
  return rules;
}

/** The communities of a year built from those of 2025 (only what changed, with its source). */
const REGIONS: Record<number, Record<string, RegionYear>> = { 2024: regions2024 };

/** The community's data for a year; null when that year's data of the community is not available. */
export function loadCcaaFor(year: number, id: string): Promise<RentaCcaa | null> {
  if (!hasRegion(rentaRules(year), id)) return Promise.resolve(null);
  // Before 2025 the links go to that year's Manual práctico; there is none after 2025 yet.
  return loadCcaa(id).then((c) => {
    if (year >= 2025) return c;
    const own = withManualOf(c, 2025, year);
    const changes = REGIONS[year]?.[id];
    return changes ? regionOfYear(own, changes) : own;
  });
}
