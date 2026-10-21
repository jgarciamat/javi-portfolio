import { round2 } from './round';
import type { ArtisticRule } from './rentaData';

/**
 * Income from economic activities (rendimientos de actividades económicas) for the modelo 100 of
 * 2025: direct estimation, normal and simplified (LIRPF arts. 28-30, RIRPF arts. 28-30), objective
 * estimation (módulos) and agricultural módulos (Orden HAC/1347/2024, BOE-A-2024-24949), and the
 * reductions of art. 32. Box numbers from the modelo 100 of 2025 (Orden HAC/277/2026,
 * BOE-A-2026-7041, pages 8 to 10). Every source was read on 19-10-2026.
 */

const positive = (n: number | undefined) =>
  Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0;
const finite = (n: number | undefined) => (Number.isFinite(n) ? (n as number) : 0);
const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

export type ActivityMethod = 'normal' | 'simplified' | 'modules' | 'agrarian';

// ─── Depreciation ─────────────────────────────────────────────────────────────

/** A group of a depreciation table: the maximum straight-line rate (%). */
export interface DepreciationGroup {
  id: string;
  rate: number;
}

/**
 * Table of the simplified direct estimation: Orden de 27 de marzo de 1998 (BOE-A-1998-7200), the
 * "coeficiente lineal máximo" of each group (RIRPF art. 30.1.ª).
 */
export const SIMPLIFIED_TABLE: DepreciationGroup[] = [
  { id: 'buildings', rate: 3 },
  { id: 'installations', rate: 10 },
  { id: 'machinery', rate: 12 },
  { id: 'transport', rate: 16 },
  { id: 'computers', rate: 26 },
  { id: 'tools', rate: 30 },
  { id: 'cattle', rate: 16 },
  { id: 'horses', rate: 8 },
  { id: 'citrus', rate: 4 },
  { id: 'olive', rate: 2 },
];

/**
 * Table of the normal direct estimation: the official one of the Corporate Tax (Ley 27/2014, art.
 * 12.1.a, BOE-A-2014-12328), the groups an individual business uses most.
 */
export const NORMAL_TABLE: DepreciationGroup[] = [
  { id: 'commercialBuildings', rate: 2 },
  { id: 'industrialBuildings', rate: 3 },
  { id: 'installations', rate: 10 },
  { id: 'machinery', rate: 12 },
  { id: 'medical', rate: 15 },
  { id: 'internalTransport', rate: 10 },
  { id: 'transport', rate: 16 },
  { id: 'lorries', rate: 20 },
  { id: 'furniture', rate: 10 },
  { id: 'tools', rate: 25 },
  { id: 'electronics', rate: 20 },
  { id: 'computers', rate: 25 },
  { id: 'software', rate: 33 },
  { id: 'other', rate: 10 },
];

/**
 * Table of the módulos (instrucción 2.2.b of the annex II of the Orden HAC/1347/2024), with the
 * groups the annex I adds for farming (instrucción 2.2 of the annex I).
 */
export const MODULES_TABLE: DepreciationGroup[] = [
  { id: 'buildings', rate: 5 },
  { id: 'computers', rate: 40 },
  { id: 'transport', rate: 25 },
  { id: 'intangible', rate: 15 },
  { id: 'batea', rate: 10 },
  { id: 'boat', rate: 10 },
  { id: 'cattle', rate: 22 },
  { id: 'horses', rate: 10 },
  { id: 'citrus', rate: 5 },
  { id: 'olive', rate: 3 },
];

export const tableOf = (method: ActivityMethod): DepreciationGroup[] =>
  method === 'normal' ? NORMAL_TABLE : method === 'simplified' ? SIMPLIFIED_TABLE : MODULES_TABLE;

/** An asset of the business: its group, its cost (without the land) and the months in use in the year. */
export interface ActivityAsset {
  group: string;
  cost: number;
  /** Months in use in the year (12 when empty). */
  months?: number;
  /** New and of a small business: twice the rate (Ley 27/2014, art. 103.1), direct estimation only. */
  doubled?: boolean;
}

/** Free depreciation of new low-value items (direct: art. 12.3.e Ley 27/2014; módulos: instr. 2.2.b). */
const LOW_VALUE = {
  direct: { unit: 300, limit: 25000 },
  modules: { unit: 601.01, limit: 3005.06 },
};

/** The depreciation of the year: each asset at the maximum rate of its table, for its months. */
export function depreciation(
  method: ActivityMethod,
  assets: ActivityAsset[],
  lowValue: number[] = []
): number {
  const table = tableOf(method);
  const direct = method === 'normal' || method === 'simplified';
  const linear = sum(
    assets.map((a) => {
      const rate = table.find((g) => g.id === a.group)?.rate ?? 0;
      const factor = direct && a.doubled ? 2 : 1;
      const months = a.months === undefined ? 12 : Math.min(12, positive(a.months));
      return (positive(a.cost) * rate * factor * months) / 1200;
    })
  );
  const rule = direct ? LOW_VALUE.direct : LOW_VALUE.modules;
  const free = Math.min(
    sum(lowValue.filter((v) => positive(v) <= rule.unit).map(positive)),
    rule.limit
  );
  return round2(linear + free);
}

// ─── Direct estimation ────────────────────────────────────────────────────────

export interface DirectIncome {
  /** Sales and services (ingresos de explotación). */
  sales: number;
  /** Current grants and the share of capital grants of the year. */
  grants: number;
  /** What the owner takes for themselves, at market value (autoconsumo). */
  ownUse: number;
  /** Financial and other income of the activity. */
  other: number;
}

export interface DirectExpenses {
  /** Purchases and other consumption (with the change in stock). */
  purchases: number;
  /** Wages and other staff costs. */
  staff: number;
  /** Social security paid by the business for its staff. */
  staffSocialSecurity: number;
  /** The owner's own social security (RETA) or alternative mutual within its limit. */
  ownSocialSecurity: number;
  rent: number;
  repairs: number;
  /** Electricity, water, gas, phone and internet of the premises. */
  supplies: number;
  /** Independent professionals and other external services. */
  services: number;
  /** Insurance of the business (the owner's health insurance goes apart). */
  insurance: number;
  taxes: number;
  financial: number;
  /** The owner's meals while working, paid electronically, within the per diem limits. */
  meals: number;
  other: number;
  /** Depreciation already worked out; added to that of `assets`. */
  depreciation: number;
}

export interface DirectActivity {
  method: 'normal' | 'simplified';
  income: DirectIncome;
  expenses: DirectExpenses;
  assets: ActivityAsset[];
  /** New items worth up to 300 € each (free depreciation, up to 25,000 € a year). */
  lowValue: number[];
  /** Health insurance of the owner, spouse and children under 25 (art. 30.2.5.ª.a). */
  health: { premiums: number; people: number; withDisability: number };
  /** The supplies of the home used in part for the activity (art. 30.2.5.ª.b). */
  home: { supplies: number; usedPercent: number };
  /** Provisions (normal method only: the simplified one has the 5 % instead). */
  provisions: number;
}

export interface DirectResult {
  /** Box 0180: total income. */
  income: number;
  /** Box 0218: deductible expenses. */
  expenses: number;
  depreciation: number;
  /** Box 0221 (simplified): income − expenses. */
  difference: number;
  /** Box 0222 (simplified) or 0219 (normal). */
  provisions: number;
  /** Box 0224: net income. */
  net: number;
}

/** Health insurance: 500 € per person, 1,500 € with a disability (art. 30.2.5.ª.a LIRPF). */
const healthOf = (h: DirectActivity['health']) => {
  const people = positive(h.people);
  const disabled = Math.min(people, positive(h.withDisability));
  return Math.min(positive(h.premiums), (people - disabled) * 500 + disabled * 1500);
};

/** The home's supplies: 30 % of the share of square metres used (art. 30.2.5.ª.b LIRPF). */
const homeOf = (h: DirectActivity['home']) =>
  (positive(h.supplies) * Math.min(100, positive(h.usedPercent)) * 0.3) / 100;

/**
 * Net income in direct estimation (box 0224). Simplified: provisions and expenses hard to justify
 * are 5 % of the net income before them, up to 2,000 € (RIRPF art. 30.2.ª, 5 % kept in 2025 per
 * the AEAT Manual 2025, "Principales novedades"), and none when the reduction of art. 32.2.1.º is
 * used (`noFivePercent`).
 */
export function directNet(a: DirectActivity, noFivePercent = false): DirectResult {
  const i = a.income;
  const income = round2(
    positive(i.sales) + positive(i.grants) + positive(i.ownUse) + finite(i.other)
  );
  const e = a.expenses;
  const dep = round2(depreciation(a.method, a.assets, a.lowValue) + positive(e.depreciation));
  const listed = sum(
    [
      e.purchases,
      e.staff,
      e.staffSocialSecurity,
      e.ownSocialSecurity,
      e.rent,
      e.repairs,
      e.supplies,
      e.services,
      e.insurance,
      e.taxes,
      e.financial,
      e.meals,
      e.other,
    ].map(positive)
  );
  const expenses = round2(listed + dep + healthOf(a.health) + homeOf(a.home));
  const difference = round2(income - expenses);
  const provisions =
    a.method === 'normal'
      ? round2(positive(a.provisions))
      : noFivePercent
        ? 0
        : round2(Math.min(2000, Math.max(0, difference) * 0.05));
  return {
    income,
    expenses,
    depreciation: dep,
    difference,
    provisions,
    net: round2(difference - provisions),
  };
}

// ─── Módulos (annex II) ───────────────────────────────────────────────────────

export interface ModuleActivity {
  id: string;
  epigrafe: string;
  activity: string;
  modules: { label: string; unit: string; amount: number }[];
  /** Above this, the excess is multiplied by 1.30 (instrucción 2.3.b.3). */
  excess?: number;
}

export interface ModulesActivity {
  activityId: string;
  /** Units of each module, in the order of the table (people already as the instructions count them). */
  units: number[];
  /** Units of "personal asalariado" of the year before (employment incentive). */
  staffLastYear: number;
  assets: ActivityAsset[];
  /** New items worth up to 601.01 € each (free depreciation up to 3,005.06 € a year). */
  lowValue: number[];
  /** Depreciation already worked out, on top of that of `assets`. */
  extraDepreciation?: number;
  /** The special index of the activity (taxi by population, kiosks, transport), 1 when none. */
  specialIndex: number;
  /** Small business (b.1): its index by population (0.70, 0.75, 0.80) or 0.90 with up to 2 workers; 1: no. */
  smallIndex: number;
  /** Season activity (b.2): its days in the year (0: not a season activity). */
  seasonDays: number;
  /** New activity (b.4): first or second year (0: no), and the disability of the owner. */
  newYear: 0 | 1 | 2;
  disabled: boolean;
  /** Extraordinary expenses for exceptional circumstances (box 1477). */
  extraordinary: number;
  /** Other business income: grants and others (box 1478). */
  otherIncome: number;
}

/** Employment incentive coefficients by stretch of units of "personal asalariado" (instr. 2.2.a). */
const STAFF_STRETCHES = [
  { upTo: 1, coef: 0.1 },
  { upTo: 3, coef: 0.15 },
  { upTo: 5, coef: 0.2 },
  { upTo: 8, coef: 0.25 },
  { upTo: Infinity, coef: 0.3 },
];

/** The coefficient of the employment incentive: 0.40 for the increase, the table for the rest. */
export function staffCoefficient(units: number, lastYear: number): number {
  const now = positive(units);
  const increase = Math.max(0, now - positive(lastYear));
  let rest = now - increase;
  let from = 0;
  let coef = 0.4 * increase;
  for (const s of STAFF_STRETCHES) {
    const take = Math.max(0, Math.min(rest, s.upTo - from));
    coef += take * s.coef;
    rest -= take;
    from = s.upTo;
    if (rest <= 0) break;
  }
  return coef;
}

const seasonIndex = (days: number) =>
  days <= 0 || days > 180 ? 1 : days <= 60 ? 1.5 : days <= 120 ? 1.35 : 1.25;

export interface ModulesResult {
  /** Box 1465. */
  previous: number;
  /** Box 1466. */
  employment: number;
  /** Box 1467. */
  investment: number;
  /** Box 1468. */
  reduced: number;
  /** Box 1474. */
  modules: number;
  /** Box 1475: the general reduction of 5 % (Orden HAC/1347/2024, disposición adicional primera). */
  general: number;
  /** Box 1479: net income of the activity. */
  net: number;
}

const NEW_INDEX = { plain: [0.8, 0.9], disabled: [0.6, 0.7] };

/** The correcting indices, in the order of the instructions: special, small, season, excess, new. */
function corrected(reduced: number, a: ModulesActivity, excess: number | undefined): number {
  const special = a.specialIndex > 0 ? a.specialIndex : 1;
  const small = special === 1 && a.smallIndex > 0 ? a.smallIndex : 1;
  const season = seasonIndex(a.seasonDays);
  let value = reduced * special * small * season;
  if (small === 1 && excess !== undefined && value > excess)
    value = excess + (value - excess) * 1.3;
  if (season === 1 && a.newYear > 0)
    value *= NEW_INDEX[a.disabled ? 'disabled' : 'plain'][a.newYear - 1];
  return value;
}

/**
 * Net income by módulos (annex II of the Orden HAC/1347/2024, instrucciones 2.1 to 2.3, and its
 * disposición adicional primera). The incompatibilities of the indices: the small-business one is
 * not used with the special ones of a.2 to a.5 nor with the excess one; the season one is not used
 * with the one for new activities.
 */
export function modulesNet(a: ModulesActivity, table: ModuleActivity[]): ModulesResult {
  const act = table.find((t) => t.id === a.activityId);
  const mods = act?.modules ?? [];
  const previous = round2(sum(mods.map((m, i) => m.amount * positive(a.units[i]))));
  const staffIndex = mods.findIndex((m) => /^personal asalariado/i.test(m.label));
  const employment =
    staffIndex < 0
      ? 0
      : round2(staffCoefficient(a.units[staffIndex], a.staffLastYear) * mods[staffIndex].amount);
  const investment = round2(
    depreciation('modules', a.assets, a.lowValue) + positive(a.extraDepreciation)
  );
  const reduced = round2(previous - employment - investment);
  const modules = round2(corrected(reduced, a, act?.excess));
  const general = modules > 0 ? round2(modules * 0.05) : 0;
  return {
    previous,
    employment,
    investment,
    reduced,
    modules,
    general,
    net: round2(modules - general - positive(a.extraordinary) + positive(a.otherIncome)),
  };
}

// ─── Agricultural módulos (annex I) ───────────────────────────────────────────

/** A group of products with its "índice de rendimiento neto" (and the one when transformed). */
export interface FarmIndex {
  id: string;
  index: number;
  transformed?: number;
}

export interface FarmLine {
  indexId: string;
  /** Income of the product, with its current or capital grants and compensations. */
  income: number;
  transformed: boolean;
  /** Share (0-1) grown on rented land (index c, 0.90). */
  rentedShare: number;
  /** Share (0-1) irrigated with electricity (index f, 0.75). */
  electricShare: number;
  /** Livestock fed more than half with bought feed (index d, 0.50). */
  boughtFeed: boolean;
  /** Certified organic production (index e, 0.95). */
  organic: boolean;
}

export interface FarmActivity {
  lines: FarmLine[];
  assets: ActivityAsset[];
  /** Depreciation already worked out, on top of that of `assets`. */
  extraDepreciation?: number;
  /** Only other people's means of production (index a, 0.75). */
  externalMeans: boolean;
  /** Cost of the staff as a % of all the income (index b). */
  staffPercent: number;
  /** Forest under an approved plan of 20 years or more (index h, 0.80). */
  forestPlan: boolean;
  /** Young farmer: 25 % less in the first five years (LIRPF DA 6.ª; instrucción 3 of annex I). */
  young: boolean;
  extraordinary: number;
}

export interface FarmResult {
  /** Box 1536: income. */
  income: number;
  /** Box 1537: previous net income. */
  previous: number;
  /** Box 1538: depreciation. */
  depreciation: number;
  /** Box 1539. */
  reduced: number;
  /** Box 1548. */
  modules: number;
  /** Box 1549: general reduction of 5 %. */
  general: number;
  /** Box 1551: young farmers. */
  young: number;
  /** Box 1553. */
  net: number;
}

const staffIndexOf = (percent: number) =>
  percent > 40 ? 0.75 : percent > 30 ? 0.8 : percent > 20 ? 0.85 : percent > 10 ? 0.9 : 1;

/** The correcting indices of farming (instrucción 2.3 of annex I), in their order. */
function farmCorrected(
  a: FarmActivity,
  reduced: number,
  bases: number[],
  forestry: boolean
): number {
  if (forestry || a.forestPlan) return a.forestPlan ? reduced * 0.8 : reduced;
  const total = sum(bases);
  let value =
    total > 0
      ? a.lines.reduce((acc, l, i) => {
          // One product takes all of it (no rounding noise from the split).
          const share = a.lines.length === 1 ? reduced : (reduced * bases[i]) / total;
          const rented = 1 - Math.min(1, positive(l.rentedShare)) * 0.1;
          const electric = 1 - Math.min(1, positive(l.electricShare)) * 0.25;
          return (
            acc + share * rented * electric * (l.boughtFeed ? 0.5 : 1) * (l.organic ? 0.95 : 1)
          );
        }, 0)
      : reduced;
  value *= a.externalMeans ? 0.75 : staffIndexOf(a.staffPercent);
  if (reduced <= 9447.91 && !a.young) value *= 0.9;
  return value;
}

/**
 * Net income of farming by módulos (annex I of the Orden HAC/1347/2024, instrucciones 2 and 3, and
 * its disposición adicional primera, 5 %). The indices of one product (rented land, electric
 * irrigation, bought feed, organic) are applied to the share of the reduced net income of that
 * product, in proportion to its base: the order does not say how to split the depreciation among
 * the products (NO CONFIRMADO with an official case when there is more than one product).
 */
export function farmNet(a: FarmActivity, indices: FarmIndex[]): FarmResult {
  const bases = a.lines.map((l) => {
    const idx = indices.find((x) => x.id === l.indexId);
    const rate = (l.transformed ? idx?.transformed : undefined) ?? idx?.index ?? 0;
    return positive(l.income) * rate;
  });
  const income = round2(sum(a.lines.map((l) => positive(l.income))));
  const previous = round2(sum(bases));
  // Forestry: no depreciation (instrucción 2.2) and only the index h (instrucción 2.3, last lines).
  const forestry = a.lines.length > 0 && a.lines.every((l) => l.indexId.startsWith('forest'));
  const dep = forestry
    ? 0
    : round2(depreciation('agrarian', a.assets) + positive(a.extraDepreciation));
  const reduced = round2(previous - dep);
  const value = farmCorrected(a, reduced, bases, forestry);
  const modules = round2(value);
  const general = modules > 0 ? round2(modules * 0.05) : 0;
  const young = a.young ? round2((modules - general) * 0.25) : 0;
  return {
    income,
    previous,
    depreciation: dep,
    reduced,
    modules,
    general,
    young,
    net: round2(modules - general - young - positive(a.extraordinary)),
  };
}

// ─── The activities of the return and the reductions of art. 32 ──────────────

export type ActivityInput = (
  | {
      kind: 'direct';
      name: string;
      data: DirectActivity;
      dependent: boolean;
      newActivity: boolean;
      withheld: number;
      payments: number;
      /**
       * An artistic activity of DA 60.ª (IAE groups 851-869, agrupaciones 01-05 of section 3): the
       * net income of the three years before, for the reduction of what passes 130 % of their average.
       */
      artistic?: { previous: number[] };
    }
  | { kind: 'modules'; name: string; data: ModulesActivity; withheld: number; payments: number }
  | { kind: 'agrarian'; name: string; data: FarmActivity; withheld: number; payments: number }
  | {
      /** A net income already worked out elsewhere (the self-employed screen), by its kind. */
      kind: 'given';
      name: string;
      data: { area: 'direct' | 'modules' | 'agrarian'; net: number };
      withheld: number;
      payments: number;
    }
) & {
  /**
   * The share (0-1) of the net income that is the taxpayer's: 0.5 in a farm of shared ownership
   * (Ley 35/2011, art. 5: the income is split in equal parts between the two owners). 1 if unset.
   */
  share?: number;
};

export interface ActivitiesResult {
  /** Box 0231: sum of the net incomes in direct estimation. */
  direct: number;
  /** Box 0232 (art. 32.2.1.º), 0233 (art. 32.2.3.º) and 0234 (art. 32.3). */
  dependentReduction: number;
  smallIncomeReduction: number;
  startReduction: number;
  /**
   * Box 0237: the reduction for artistic activities (DA 60.ª.2), after the others ([0235] = [0231] −
   * [0232] − [0233] − [0234] − [0237], Orden HAC/277/2026). A result saved before has none.
   */
  artisticReduction?: number;
  /** Box 0235. */
  directTotal: number;
  /** Box 1482 / 1484 and 1558 / 1560 (the 32.2.3.º reduction goes on the direct ones first). */
  modules: number;
  agrarian: number;
  /** All of it, to the general base. */
  total: number;
  /** Boxes 0599 and 0604. */
  withheld: number;
  payments: number;
  each: {
    name: string;
    net: number;
    detail: DirectResult | ModulesResult | FarmResult | { net: number };
  }[];
}

/**
 * Art. 32.2.1.º LIRPF (consolidated text, wording of Ley 31/2022): 2,000 € and, with net income of
 * activities under 19,747.5 € and other income up to 6,500 €, 6,498 € (up to 14,047.5 €) or 6,498 −
 * 1.14 × (net − 14,047.5); with a disability, 3,500 € more (7,750 € from 65 % or with help).
 */
export function dependentReduction(
  net: number,
  otherIncome: number,
  disability: number,
  assistance = false
): number {
  const n = Math.max(0, net);
  let r = 2000;
  if (n < 19747.5 && otherIncome <= 6500)
    r += n <= 14047.5 ? 6498 : Math.max(0, 6498 - 1.14 * (n - 14047.5));
  if (disability >= 65 || (disability >= 33 && assistance)) r += 7750;
  else if (disability >= 33) r += 3500;
  return round2(Math.min(r, n));
}

/**
 * Art. 32.2.3.º LIRPF: with income (not exempt) under 12,000 €, the activity included, 1,620 € (up to
 * 8,000 €) or 1,620 − 0.405 × (income − 8,000); together with the reduction of art. 20 up to 3,700 €.
 */
export function smallIncomeReduction(net: number, income: number, workReduction: number): number {
  if (income >= 12000 || net <= 0) return 0;
  const r = income <= 8000 ? 1620 : 1620 - 0.405 * (income - 8000);
  return round2(Math.max(0, Math.min(r, 3700 - workReduction, net)));
}

export interface ActivityContext {
  /** Other income (not exempt) than the activities: work, capital, property, gains. */
  otherIncome: number;
  /** There is income from work (other than unemployment or pensions up to 4,000 €): no 32.2.1.º. */
  hasWork: boolean;
  /** The reduction of art. 20 of the return, for the joint limit of 3,700 €. */
  workReduction: number;
  disability: number;
  assistance: boolean;
  /** The rule of the year for artistic activities (DA 60.ª); none: no reduction. */
  artistic?: ArtisticRule | null;
}

/**
 * DA 60.ª.2 LIRPF (BOE-A-2006-20764, checked 22-10-2026): 30 % of what the net income passes 130 % of
 * the average of the three years before (a negative one as 0), on at most 150,000 €. Measured on the
 * net of the activity, as the Manual 2025 does (c07, example: 390,000 − 162,500 = 227,500).
 */
export function artisticReduction(net: number, previous: number[], rule: ArtisticRule): number {
  const average = [0, 1, 2].reduce((sum, i) => sum + Math.max(0, finite(previous[i] ?? 0)), 0) / 3;
  const excess = Math.max(0, net - (average * rule.over) / 100);
  return round2((Math.min(excess, rule.cap) * rule.percent) / 100);
}

/** The net income of each activity, by kind, and whether the single-client reduction applies. */
const shareOf = (a: ActivityInput, net: number) =>
  a.share === undefined ? net : round2(net * Math.min(1, positive(a.share)));

function netsOf(
  list: ActivityInput[],
  ctx: ActivityContext,
  table: ModuleActivity[],
  indices: FarmIndex[]
) {
  const each: ActivitiesResult['each'] = [];
  const totals = { direct: 0, modules: 0, agrarian: 0, start: 0, artistic: 0 };
  let dependent = false;
  for (const a of list) {
    if (a.kind === 'direct') {
      const useDependent = a.dependent && !ctx.hasWork;
      dependent ||= useDependent;
      const r = directNet(a.data, useDependent && a.data.method === 'simplified');
      const net = shareOf(a, r.net);
      totals.direct += net;
      if (a.newActivity && net > 0) totals.start += net;
      if (a.artistic && ctx.artistic)
        totals.artistic += artisticReduction(net, a.artistic.previous, ctx.artistic);
      each.push({ name: a.name, net, detail: r });
    } else if (a.kind === 'given') {
      const net = shareOf(a, round2(finite(a.data.net)));
      totals[a.data.area] += net;
      each.push({ name: a.name, net, detail: { net } });
    } else {
      const r = a.kind === 'modules' ? modulesNet(a.data, table) : farmNet(a.data, indices);
      const net = shareOf(a, r.net);
      totals[a.kind] += net;
      each.push({ name: a.name, net, detail: r });
    }
  }
  return { each, totals, dependent };
}

/** Each activity worked out and the reductions of art. 32, in the order of the boxes. */
export function activitiesOf(
  list: ActivityInput[],
  ctx: ActivityContext,
  table: ModuleActivity[],
  indices: FarmIndex[]
): ActivitiesResult {
  const { each, totals, dependent } = netsOf(list, ctx, table, indices);
  const direct = round2(totals.direct);
  const { modules, agrarian, start } = totals;
  const all = direct + modules + agrarian;
  const dependentAmount = dependent
    ? dependentReduction(direct, ctx.otherIncome, ctx.disability, ctx.assistance)
    : 0;
  const small = dependent ? 0 : smallIncomeReduction(all, all + ctx.otherIncome, ctx.workReduction);
  const smallDirect = Math.min(small, Math.max(0, direct));
  const smallModules = Math.min(small - smallDirect, Math.max(0, modules));
  const smallFarm = round2(small - smallDirect - smallModules);
  // Art. 32.3: 20 % of the positive net income, after the reductions of 32.2, up to 100,000 €.
  const startBase = Math.max(0, Math.min(start, direct) - dependentAmount - smallDirect);
  const startReduction = round2(Math.min(startBase, 100000) * 0.2);
  const afterOthers = direct - dependentAmount - smallDirect - startReduction;
  // DA 60.ª.2: «con posterioridad ... a las reducciones previstas en los apartados 2 y 3 del artículo 32».
  const artistic = round2(Math.min(totals.artistic, Math.max(0, afterOthers)));
  const directTotal = round2(afterOthers - artistic);
  const modulesTotal = round2(modules - smallModules);
  const agrarianTotal = round2(agrarian - smallFarm);
  return {
    direct,
    dependentReduction: dependentAmount,
    smallIncomeReduction: round2(small),
    startReduction,
    artisticReduction: artistic,
    directTotal,
    modules: modulesTotal,
    agrarian: agrarianTotal,
    total: round2(directTotal + modulesTotal + agrarianTotal),
    withheld: round2(sum(list.map((a) => positive(a.withheld)))),
    payments: round2(sum(list.map((a) => positive(a.payments)))),
    each,
  };
}
