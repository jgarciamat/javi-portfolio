/**
 * The rules of the Renta by tax year (docs/fiscalidad/reglas-por-ejercicio.md): each year has its own
 * package of figures with its sources, and what the official sources of that year have not set yet
 * is listed as missing, never taken from another year.
 */
import type { FarmIndex, ModuleActivity } from './rentaActivity';
import type { RentaState } from './rentaData';
import type { RentaProperty, RentaWorkExtras } from './rentaExtras';
import type { JointRules } from './rentaJoint';

/** confirmed: the Manual práctico of the year is out; provisional: only the BOE, no manual yet. */
export type RulesStatus = 'confirmed' | 'provisional';

/** Where a figure of the year comes from, and when it was checked against it. */
export interface RuleSource {
  what: string;
  url: string;
  checkedOn: string;
}

/**
 * Something the year needs that has no official figure yet: `regions` (the community's scale,
 * minimums and deductions), `modules` (tables of the módulos and the farming indexes), `rentals`
 * (the reductions of a rented home), `imputation` (the 1.1 % of properties not rented) or `manual`
 * (the Manual práctico of the year, which explains the rules).
 */
export type MissingPart = 'regions' | 'modules' | 'rentals' | 'imputation' | 'manual';

export interface RentaRules {
  year: number;
  status: RulesStatus;
  state: RentaState;
  extras: RentaWorkExtras;
  property: RentaProperty;
  joint: JointRules & { year: number; source: string; rules: string };
  /** The tables of the módulos and the farming indexes of the year; null: not available. */
  activityTables: { modules: ModuleActivity[]; farm: FarmIndex[] } | null;
  /** The communities with data of this year: 'all', or the ids (the rest are not available). */
  regions: 'all' | string[];
  /** What has no official figure for the year yet. */
  missing: MissingPart[];
  sources: RuleSource[];
}

/** Whether the year has the data of a community (an empty id: none chosen yet, nothing missing). */
export const hasRegion = (rules: RentaRules, ccaaId: string): boolean =>
  ccaaId === '' || rules.regions === 'all' || rules.regions.includes(ccaaId);

/** What the person's return would need from the year and is missing: the result is not shown. */
export interface ReturnNeeds {
  ccaaId: string;
  /** Has rented properties (the reductions of the rent). */
  rents: boolean;
  /** Has properties that are not rented nor the main home (imputed income). */
  imputes: boolean;
  /** Has an activity by módulos or a farming one. */
  objective: boolean;
}

export function blockersOf(rules: RentaRules, needs: ReturnNeeds): MissingPart[] {
  const out: MissingPart[] = [];
  if (!hasRegion(rules, needs.ccaaId)) out.push('regions');
  if (needs.objective && !rules.activityTables) out.push('modules');
  if (needs.rents && rules.missing.includes('rentals')) out.push('rentals');
  if (needs.imputes && rules.missing.includes('imputation')) out.push('imputation');
  return out;
}
