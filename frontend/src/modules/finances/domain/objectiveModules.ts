import {
  modulesNet,
  type ModuleActivity,
  type ModulesActivity,
  type ModulesResult,
} from '@modules/tools/domain/rentaActivity';
import { modules2025 } from '@modules/tools/data/renta/modulos-2025';
import { figuresFor } from './fiscalFigures';
import { form131, staffRate, type Result131 } from './module131';

/**
 * Non-farming activities in módulos (estimación objetiva, annex II of the order of each year): the
 * net income of the year for the Renta (boxes 1465-1479, with the engine of the Renta,
 * rentaActivity.ts modulesNet) and the quarterly instalment of the modelo 131.
 *
 * Sources (read on 19-10-2026):
 * - Orden HAC/1347/2024 (BOE-A-2024-24949) for 2025 and Orden HAC/1425/2025 (BOE-A-2025-25272)
 *   for 2026: the annex II of both is the same, figure by figure (compared on 19-10-2026); the 5 %
 *   general reduction of their disposición adicional primera counts for the instalments too (DA 1.ª.3).
 * - Instructions of the annex II for the IRPF: 2.1 (units), 2.2 (incentives), 2.3 (correcting
 *   indices and their incompatibilities), 3 (data at 1 January for the instalments), 4 (2, 3 or 4 %),
 *   5 (start or end during the year: whole quarters, and the days of the quarter of an incomplete one),
 *   6 (season: daily income over last year's days) and 7 (averages of the year for the annual net).
 * - Annex III.3: grants and other business income are added to the net (box 1478).
 */

/** The table of módulos of each year (2026 repeats 2025: see above). */
export const MODULE_TABLES: Record<number, ModuleActivity[]> = {
  2025: modules2025,
  2026: modules2025,
};

/** The table of a year: the latest one known for a later year (said in the warnings). */
export function moduleTableOf(year: number): { table: ModuleActivity[]; known: boolean } {
  const known = MODULE_TABLES[year];
  if (known) return { table: known, known: true };
  const years = Object.keys(MODULE_TABLES).map(Number);
  const last = Math.max(...years.filter((y) => y < year), Math.min(...years));
  return { table: MODULE_TABLES[last], known: false };
}

/** The special correcting indices of annex II, instrucción 2.3.a: by activity, its options. */
export type SpecialKind = 'kiosk' | 'taxi' | 'bus' | 'freight';

const SPECIAL_OF: Record<string, SpecialKind> = {
  // a.1 kiosks of press on the street; a.2 taxis; a.3 urban and road passenger transport;
  // a.4 freight by road and removals.
  m33: 'kiosk',
  m59: 'taxi',
  m58: 'bus',
  m60: 'freight',
  m62: 'freight',
};

/** The indices each special kind can take, by the option of the person. */
export const SPECIAL_INDICES: Record<SpecialKind, { key: string; index: number }[]> = {
  kiosk: [
    { key: 'madridBarcelona', index: 1 },
    { key: 'over100k', index: 0.95 },
    { key: 'rest', index: 0.8 },
  ],
  taxi: [
    { key: 'upTo2000', index: 0.75 },
    { key: 'upTo10000', index: 0.8 },
    { key: 'upTo50000', index: 0.85 },
    { key: 'upTo100000', index: 0.9 },
    { key: 'over100000', index: 1 },
  ],
  bus: [
    { key: 'oneVehicle', index: 0.8 },
    { key: 'none', index: 1 },
  ],
  freight: [
    { key: 'oneVehicle', index: 0.8 },
    { key: 'tractorsNoTrailers', index: 0.9 },
    { key: 'oneTractorNoTrailers', index: 0.75 },
    { key: 'none', index: 1 },
  ],
};

export const specialKindOf = (activityId: string): SpecialKind | null =>
  SPECIAL_OF[activityId] ?? null;

/** b.1, small business: by population, or 0.90 with salaried staff up to 2 workers. */
export const SMALL_INDICES = [
  { key: 'upTo2000', index: 0.7 },
  { key: 'upTo5000', index: 0.75 },
  { key: 'over5000', index: 0.8 },
  { key: 'staff', index: 0.9 },
];

/** An activity in módulos as the screen keeps it (numbers already parsed). */
export interface ObjectiveInput {
  activityId: string;
  /** Units of each module at 1 January (or the day it started), in the order of the table. */
  unitsStart: number[];
  /** Average units of the year (instrucción 7); null: the same as at 1 January. */
  unitsYear: (number | null)[];
  /** Units of «personal asalariado» of last year (employment incentive, instrucción 2.2.a). */
  staffLastYear: number;
  /** Special index (2.3.a): 1 when none applies. */
  specialIndex: number;
  /** Small business (2.3.b.1): 1 when it does not apply. */
  smallIndex: number;
  /** Season activity: days this year and last year (0: not a season activity), and each quarter. */
  seasonDays: number;
  seasonLastYear: number;
  seasonQuarters: [number, number, number, number];
  /** New activity (2.3.b.4): first or second year, 0 when it is not. */
  newYear: 0 | 1 | 2;
  disabled: boolean;
  /** Started after 1 January or ceased before 31 December: `YYYY-MM-DD`, or null. */
  startDate: string | null;
  endDate: string | null;
  /** No data at all could be known: the instalment is 2 % of the income of the quarter. */
  noData: boolean;
  /** Extraordinary expenses (box 1477) and grants and other business income (box 1478). */
  extraordinary: number;
  otherIncome: number;
  ceutaMelilla: boolean;
}

export const NO_OBJECTIVE: ObjectiveInput = {
  activityId: '',
  unitsStart: [],
  unitsYear: [],
  staffLastYear: 0,
  specialIndex: 1,
  smallIndex: 1,
  seasonDays: 0,
  seasonLastYear: 0,
  seasonQuarters: [0, 0, 0, 0],
  newYear: 0,
  disabled: false,
  startDate: null,
  endDate: null,
  noData: false,
  extraordinary: 0,
  otherIncome: 0,
  ceutaMelilla: false,
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const positive = (n: number | null | undefined) =>
  Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0;

/** The activity of the table, or null when the id is not one of it. */
export const activityOf = (input: Pick<ObjectiveInput, 'activityId'>, year: number) =>
  moduleTableOf(year).table.find((a) => a.id === input.activityId) ?? null;

/** The small-business index cannot go with the special ones of a.2 to a.5 (2.3, incompatibilities). */
function smallIndexOf(input: ObjectiveInput): number {
  const kind = specialKindOf(input.activityId);
  return kind && kind !== 'kiosk' ? 1 : input.smallIndex;
}

/** The units of a module: of the year when typed, else those at 1 January. */
export const yearUnits = (input: ObjectiveInput): number[] =>
  input.unitsStart.map((u, i) => {
    const y = input.unitsYear[i];
    return y === null || y === undefined ? positive(u) : positive(y);
  });

function engineInput(
  input: ObjectiveInput,
  units: number[],
  depreciation: number,
  season: number,
  extras: boolean
): ModulesActivity {
  return {
    activityId: input.activityId,
    units: units.map(positive),
    staffLastYear: positive(input.staffLastYear),
    assets: [],
    lowValue: [],
    extraDepreciation: positive(depreciation),
    specialIndex: input.specialIndex,
    smallIndex: smallIndexOf(input),
    seasonDays: season,
    newYear: input.newYear,
    disabled: input.disabled,
    extraordinary: extras ? positive(input.extraordinary) : 0,
    otherIncome: extras ? positive(input.otherIncome) : 0,
  };
}

/** What the engine of the Renta takes for the year: the average units and the year's depreciation. */
export const objectiveEngineInput = (
  input: ObjectiveInput,
  _year: number,
  depreciation: number
): ModulesActivity => engineInput(input, yearUnits(input), depreciation, input.seasonDays, true);

/**
 * The net income of the year for the Renta (boxes 1465-1479): the average units of the year, the
 * depreciation of the year (`depreciation`, from the assets with the modules table), the extraordinary
 * expenses and the grants.
 */
export function objectiveYear(
  input: ObjectiveInput,
  year: number,
  depreciation: number
): ModulesResult {
  return modulesNet(objectiveEngineInput(input, year, depreciation), moduleTableOf(year).table);
}

/**
 * The net income for the instalments (instrucción 3): the units at 1 January, the depreciation at
 * the maximum rate of the assets there at that date, last year's season days, the 5 % reduction;
 * no extraordinary expenses nor grants (they are for the year).
 */
export function instalmentNet(
  input: ObjectiveInput,
  year: number,
  depreciationAtStart: number
): ModulesResult {
  const { table } = moduleTableOf(year);
  return modulesNet(
    engineInput(input, input.unitsStart, depreciationAtStart, input.seasonLastYear, false),
    table
  );
}

/** Units of «personal asalariado» (every salaried module: also «resto personal asalariado»). */
export function staffUnits(input: ObjectiveInput, year: number, units = input.unitsStart): number {
  const act = activityOf(input, year);
  if (!act) return 0;
  return round2(
    act.modules.reduce(
      (s, m, i) => (/personal asalariado/i.test(m.label) ? s + positive(units[i]) : s),
      0
    )
  );
}

const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const DAY = 86_400_000;

/** First and last day of a quarter (UTC milliseconds). */
const quarterSpan = (year: number, q: number) => ({
  from: Date.UTC(year, (q - 1) * 3, 1),
  to: Date.UTC(year, q * 3, 1) - DAY,
});

/**
 * The part of the whole-quarter instalment that is due (instructions 5 and 6): the days of the
 * season in the quarter over last year's; or the days in business in an incomplete quarter over its
 * days; 1 in a whole quarter, 0 before it started or after it ended.
 */
export function quarterShare(input: ObjectiveInput, year: number, q: 1 | 2 | 3 | 4): number {
  if (input.seasonLastYear > 0) return positive(input.seasonQuarters[q - 1]) / input.seasonLastYear;
  const { from, to } = quarterSpan(year, q);
  const valid = (d: string | null) => d !== null && /^\d{4}-\d{2}-\d{2}$/.test(d);
  const start = valid(input.startDate) ? Math.max(from, day(input.startDate!)) : from;
  const end = valid(input.endDate) ? Math.min(to, day(input.endDate!)) : to;
  if (end < start) return 0;
  return (end - start + DAY) / (to - from + DAY);
}

export interface Quarter131 {
  q: 1 | 2 | 3 | 4;
  result: Result131;
}

export interface Instalments131 {
  /** The net income of the instalments and how it was worked out (boxes of the engine). */
  net: ModulesResult;
  /** 2, 3 or 4 % (instrucción 4) by the salaried staff at 1 January. */
  rate: number;
  staff: number;
  /** Each quarter up to the one asked for, with what the earlier ones left to deduct. */
  quarters: Quarter131[];
}

export interface Instalment131Inputs {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  /** Withholdings of each quarter (box 08), the four of them. */
  withheld: number[];
  /** Income of each quarter, the four: only used when no data can be known (box 03). */
  income: number[];
  /** Last year's net income of the activities (box 09), null when there was none. */
  lastYearNet: number | null;
  /** Depreciation at the maximum rate of the assets in use at 1 January. */
  depreciationAtStart: number;
}

/**
 * The modelo 131 of each quarter of the year up to `quarter`: the negative results of the earlier
 * quarters are deducted from the next positive ones (box 11). Null when the year has no figures.
 */
export function instalments131(
  input: ObjectiveInput,
  args: Instalment131Inputs
): Instalments131 | null {
  const figures = figuresFor(args.year);
  if (!figures) return null;
  const net = instalmentNet(input, args.year, args.depreciationAtStart);
  const staff = staffUnits(input, args.year);
  const quarters: Quarter131[] = [];
  let pending = 0;
  for (let q = 1 as 1 | 2 | 3 | 4; q <= args.quarter; q = (q + 1) as 1 | 2 | 3 | 4) {
    const share = quarterShare(input, args.year, q);
    const result = form131({
      year: args.year,
      quarter: q,
      activities: input.noData
        ? []
        : [{ net: net.net, staffUnits: staff, share, ceutaMelilla: input.ceutaMelilla }],
      ...(input.noData
        ? { noData: { income: round2(args.income[q - 1]), ceutaMelilla: input.ceutaMelilla } }
        : {}),
      withheld: round2(args.withheld[q - 1]),
      lastYearNet: args.lastYearNet,
      pendingNegative: pending,
    }) as Result131;
    const box = (id: string) => result.boxes.find((b) => b.box === id)!.amount;
    pending = round2(pending - box('11') + Math.max(0, -box('15')));
    quarters.push({ q, result });
  }
  return { net, rate: staffRate(staff, figures.m131), staff, quarters };
}
