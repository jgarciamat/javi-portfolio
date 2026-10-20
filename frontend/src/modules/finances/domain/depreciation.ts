/**
 * Depreciation (amortización) of the fixed assets of an activity in direct estimation, as the income
 * tax lets the self-employed deduct it (modelo 130 box 02; Renta boxes 0208 and 0227).
 *
 * Sources (checked on 19 October 2026):
 * - Art. 30.1.ª RIRPF (RD 439/2007, BOE-A-2007-6820): in the simplified modality, straight-line on the
 *   simplified table of the Orden de 27 de marzo de 1998 (BOE-A-1998-7627), Manual práctico de Renta
 *   2025, capítulo 7.
 * - Art. 28 LIRPF → art. 12 LIS (Ley 27/2014, BOE-A-2014-12328): the normal modality uses the official
 *   table of art. 12.1.a); intangibles over their useful life or, when it cannot be estimated, one
 *   twentieth a year (art. 12.2); new assets of up to 300 € are written off at once up to 25,000 € a
 *   year (art. 12.3.e); the small-business incentive doubles the maximum coefficient of new assets
 *   (art. 103 LIS, by art. 30.1.ª RIRPF in the simplified modality too).
 * - Used assets: at most twice the maximum coefficient on the purchase price (art. 4.3.a RIS, RD
 *   634/2015); that it applies to the simplified table is NOT CONFIRMED (no official sentence).
 * - Partial use: only the parts of a building that can be used separately (art. 22.3 RIRPF); a car
 *   only with exclusive use (art. 22.4 RIRPF).
 * The amounts are proportional to the whole months in service in the year and in each quarter.
 */

/** Direct estimation (simplified, up to 600,000 € of turnover, or normal) or farming modules. */
export type Modality = 'simplified' | 'normal' | 'modules';
/** At most the table coefficient, the 300 € write-off or the doubled small-business coefficient. */
export const ASSET_METHODS = ['table', 'free300', 'accelerated'] as const;
export type AssetMethod = (typeof ASSET_METHODS)[number];

export interface AssetGroup {
  id: string;
  /** Maximum straight-line coefficient, in % a year. */
  rate: number;
  /** Maximum period, in years: its inverse is the minimum coefficient. */
  years: number;
  /** A building: its land is not depreciated and a separate part can be used for work. */
  building?: boolean;
  /** Means of transport: a car counts only when it is used for the activity alone. */
  vehicle?: boolean;
}

/** Simplified table (Orden de 27 de marzo de 1998, anexo; Manual de Renta 2025, cap. 7). */
export const SIMPLIFIED_TABLE: AssetGroup[] = [
  { id: 's1', rate: 3, years: 68, building: true },
  { id: 's2', rate: 10, years: 20 },
  { id: 's3', rate: 12, years: 18 },
  { id: 's4', rate: 16, years: 14, vehicle: true },
  { id: 's5', rate: 26, years: 10 },
  { id: 's6', rate: 30, years: 8 },
  { id: 's7', rate: 16, years: 14 },
  { id: 's8', rate: 8, years: 25 },
  { id: 's9', rate: 4, years: 50 },
  { id: 's10', rate: 2, years: 100 },
];

/** Official table of art. 12.1.a) LIS (normal modality). */
export const NORMAL_TABLE: AssetGroup[] = [
  { id: 'civil', rate: 2, years: 100 },
  { id: 'pavements', rate: 6, years: 34 },
  { id: 'mining', rate: 7, years: 30 },
  { id: 'hydro', rate: 2, years: 100 },
  { id: 'renewables', rate: 7, years: 30 },
  { id: 'nuclear', rate: 3, years: 60 },
  { id: 'coal', rate: 4, years: 50 },
  { id: 'otherPlants', rate: 5, years: 40 },
  { id: 'industrialBuildings', rate: 3, years: 68, building: true },
  { id: 'dumps', rate: 4, years: 50 },
  { id: 'warehouses', rate: 7, years: 30, building: true },
  { id: 'officeBuildings', rate: 2, years: 100, building: true },
  { id: 'substations', rate: 5, years: 40 },
  { id: 'cables', rate: 7, years: 30 },
  { id: 'installations', rate: 10, years: 20 },
  { id: 'machinery', rate: 12, years: 18 },
  { id: 'medical', rate: 15, years: 14 },
  { id: 'locomotives', rate: 8, years: 25, vehicle: true },
  { id: 'ships', rate: 10, years: 20, vehicle: true },
  { id: 'internalTransport', rate: 10, years: 20, vehicle: true },
  { id: 'externalTransport', rate: 16, years: 14, vehicle: true },
  { id: 'trucks', rate: 20, years: 10, vehicle: true },
  { id: 'furniture', rate: 10, years: 20 },
  { id: 'linen', rate: 25, years: 8 },
  { id: 'glassware', rate: 50, years: 4 },
  { id: 'tools', rate: 25, years: 8 },
  { id: 'moulds', rate: 33, years: 6 },
  { id: 'otherFixtures', rate: 15, years: 14 },
  { id: 'electronics', rate: 20, years: 10 },
  { id: 'computers', rate: 25, years: 8 },
  { id: 'software', rate: 33, years: 6 },
  { id: 'films', rate: 33, years: 6 },
  { id: 'otherAssets', rate: 10, years: 20 },
];

/**
 * Farming modules (anexo I, instrucción 2.2, and anexo II of the Orden HAC/1425/2025 and HAC/1347/2024):
 * the general groups 1-4 and the farming ones 5-10. Forestry deducts no depreciation.
 */
export const MODULES_TABLE: AssetGroup[] = [
  { id: 'm1', rate: 5, years: 40, building: true },
  { id: 'm2', rate: 40, years: 5 },
  { id: 'm3', rate: 25, years: 8, vehicle: true },
  { id: 'm4', rate: 15, years: 10 },
  { id: 'm5', rate: 10, years: 12 },
  { id: 'm6', rate: 10, years: 25 },
  { id: 'm7', rate: 22, years: 8 },
  { id: 'm8', rate: 10, years: 17 },
  { id: 'm9', rate: 5, years: 45 },
  { id: 'm10', rate: 3, years: 80 },
];
/** In modules, new assets of up to 601.01 € each, up to 3,005.06 € a year. */
export const MODULES_FREE_UNIT_MAX = 601.01;
export const MODULES_FREE_YEAR_MAX = 3005.06;

/** Intangible assets: over their useful life, or 5 % a year when it cannot be estimated (art. 12.2 LIS). */
export const INTANGIBLE = 'intangible';
export const INTANGIBLE_RATE = 5;
/** New assets of up to 300 € each, up to 25,000 € a year (art. 12.3.e LIS). */
export const FREE_UNIT_MAX = 300;
export const FREE_YEAR_MAX = 25000;
/** Small-business incentive and used assets: twice the maximum coefficient (art. 103 LIS, art. 3 RIS). */
export const DOUBLE = 2;
/** Investment goods for VAT: worth more than 3,005.06 € (art. 108.Dos.5.º LIVA). */
export const VAT_INVESTMENT_MIN = 3005.06;

export interface Asset {
  name: string;
  /** Group of the table of the modality, or `intangible`. */
  group: string;
  /** What is depreciated: price, costs and VAT that could not be deducted (euros). */
  cost: number;
  /** Value of the land of a building, which is not depreciated. */
  land?: number;
  /** Day it was put to work, `YYYY-MM-DD`. */
  start: string;
  /** Share used for the activity, %: below 100 only a building counts (art. 22.3 RIRPF). */
  use: number;
  method: AssetMethod;
  /** Coefficient chosen, %, between the minimum and the maximum (null: the maximum). */
  rate?: number | null;
  /** Intangible with a known useful life, in years (null: 5 % a year). */
  life?: number | null;
  /** Bought used: double coefficient on the price, no incentive. */
  used?: boolean;
  /** Depreciation deducted up to the end of last year (null: worked out from the start date). */
  accumulated?: number | null;
  /** VAT borne and % deducted the year it was put to work (for the regularisation of the 303). */
  vat?: number;
  vatPct?: number;
}

export type AssetNote =
  | 'notAffected'
  | 'rateLow'
  | 'rateHigh'
  | 'freeLimit'
  | 'freeTooDear'
  | 'usedIncentive'
  | 'unknownGroup'
  | 'noIncentive';

export interface AssetYear {
  index: number;
  name: string;
  /** Intangible assets go to box 0227 of the Renta; the rest to 0208. */
  intangible: boolean;
  /** What is depreciated: cost less land, by the share used. */
  base: number;
  /** Coefficient applied this year, %. */
  rate: number;
  /** Depreciation of each quarter and of the year (euros). */
  quarters: [number, number, number, number];
  amount: number;
  /** Deducted up to the end of this year, and still to deduct. */
  accumulated: number;
  pending: number;
  notes: AssetNote[];
}

export interface DepreciationYear {
  assets: AssetYear[];
  quarters: [number, number, number, number];
  tangible: number;
  intangible: number;
  total: number;
}

const cents = (euros: number) => Math.round(euros * 100);

export const tableOf = (modality: Modality): AssetGroup[] =>
  modality === 'simplified'
    ? SIMPLIFIED_TABLE
    : modality === 'modules'
      ? MODULES_TABLE
      : NORMAL_TABLE;
const freeUnit = (m: Modality) => (m === 'modules' ? MODULES_FREE_UNIT_MAX : FREE_UNIT_MAX);
const freeYear = (m: Modality) => (m === 'modules' ? MODULES_FREE_YEAR_MAX : FREE_YEAR_MAX);

/**
 * Whole months of the year in service up to the end of a quarter (quarter 4: the whole year). The
 * Manual's example prorates by months (an asset put to work on 1 December deducts 1/12); one put to
 * work later in a month counts from the next one, which never deducts more than the time in use.
 */
function monthsUpTo(start: string, year: number, quarter: number): number {
  const startYear = Number(start.slice(0, 4));
  const month = Number(start.slice(5, 7)) - 1 + (start.slice(8, 10) === '01' ? 0 : 1);
  // Assets of later years never get here (depreciationYear leaves them out).
  const from = startYear < year ? 0 : month;
  return Math.max(0, quarter * 3 - from);
}

interface Rule {
  rate: number;
  notes: AssetNote[];
  free: boolean;
}

/** The coefficient an asset takes: the chosen one within the table, doubled when allowed. */
/** The chosen coefficient kept between the minimum (by the maximum period) and the maximum. */
function chosenRate(asset: Asset, group: AssetGroup, notes: AssetNote[]): number {
  const rate = asset.rate ?? group.rate;
  const min = 100 / group.years;
  if (rate < min) notes.push('rateLow');
  if (rate > group.rate) notes.push('rateHigh');
  return Math.min(group.rate, Math.max(min, rate));
}

/** The coefficient an asset takes: the chosen one within the table, doubled when allowed. */
function ruleOf(asset: Asset, modality: Modality): Rule | null {
  const notes: AssetNote[] = [];
  if (asset.group === INTANGIBLE && modality !== 'modules') {
    const life = asset.life ?? 0;
    return { rate: life > 0 ? 100 / life : INTANGIBLE_RATE, notes, free: false };
  }
  const group = tableOf(modality).find((g) => g.id === asset.group);
  if (!group) return null;
  return incentiveOf(asset, group, modality, chosenRate(asset, group, notes), notes);
}

/** Used assets and the incentives: double coefficient or the write-off of small assets. */
function incentiveOf(
  asset: Asset,
  group: AssetGroup,
  modality: Modality,
  rate: number,
  notes: AssetNote[]
): Rule {
  const double = { rate: group.rate * DOUBLE, notes, free: false };
  if (asset.used) {
    if (asset.method !== 'table') notes.push('usedIncentive');
    return double;
  }
  // The small-business incentive is a rule of direct estimation.
  if (asset.method === 'accelerated' && modality !== 'modules') return double;
  if (asset.method === 'accelerated') notes.push('noIncentive');
  const free = asset.method === 'free300' && asset.cost <= freeUnit(modality);
  if (asset.method === 'free300' && !free) notes.push('freeTooDear');
  return { rate, notes, free };
}

/** Share of the cost that counts: a building by the part used; the rest only in full use. */
function affected(asset: Asset, modality: Modality): number {
  const group = tableOf(modality).find((g) => g.id === asset.group);
  const share = Math.min(100, Math.max(0, asset.use)) / 100;
  if (group?.building) return share;
  return share >= 1 ? 1 : 0;
}

/** Straight-line depreciation in cents from the start up to a quarter of a year, without limit. */
const linear = (base: number, rate: number, asset: Asset, year: number, quarter: number) =>
  Math.round((base * rate * monthsUpTo(asset.start, year, quarter)) / 100 / 12);

/** Deducted up to the end of the year before, as typed or with the same coefficient every year. */
function accumulatedBefore(asset: Asset, base: number, rule: Rule, year: number): number {
  if (asset.accumulated !== null && asset.accumulated !== undefined) {
    return Math.min(base, cents(asset.accumulated));
  }
  const first = Number(asset.start.slice(0, 4));
  if (rule.free) return first < year ? base : 0;
  let sum = 0;
  for (let y = first; y < year && sum < base; y++) sum += linear(base, rule.rate, asset, y, 4);
  return Math.min(base, sum);
}

/** One asset in one year, before the 25,000 € limit of the write-off. */
function assetYear(asset: Asset, index: number, year: number, modality: Modality): AssetYear {
  const rule = ruleOf(asset, modality) ?? {
    rate: 0,
    notes: ['unknownGroup' as AssetNote],
    free: false,
  };
  const share = affected(asset, modality);
  const notes = [...rule.notes];
  if (share === 0 && asset.use > 0) notes.push('notAffected');
  const base = Math.round(Math.max(0, cents(asset.cost) - cents(asset.land ?? 0)) * share);
  const before = accumulatedBefore(asset, base, rule, year);
  const left = base - before;
  const upTo = [1, 2, 3, 4].map((q) => {
    if (monthsUpTo(asset.start, year, q) === 0) return 0;
    return Math.min(left, rule.free ? left : linear(base, rule.rate, asset, year, q));
  });
  const quarters = upTo.map(
    (v, i) => (v - (i > 0 ? upTo[i - 1] : 0)) / 100
  ) as AssetYear['quarters'];
  const amount = upTo[3];
  return {
    index,
    name: asset.name,
    intangible: asset.group === INTANGIBLE,
    base: base / 100,
    rate: rule.free ? 100 : Math.round(rule.rate * 100) / 100,
    quarters,
    amount: amount / 100,
    accumulated: (before + amount) / 100,
    pending: (left - amount) / 100,
    notes,
  };
}

/**
 * Moves what goes over 25,000 € (3,005.06 € in modules) of write-offs in the year back to the table (art. 12.3.e LIS): the
 * assets are taken in the order typed; those beyond the limit use the maximum coefficient.
 */
function freeLimit(rows: AssetYear[], assets: Asset[], year: number, modality: Modality) {
  let used = 0;
  return rows.map((row) => {
    const asset = assets[row.index];
    if (row.rate !== 100 || asset.method !== 'free300' || asset.used) return row;
    if (used + cents(row.amount) <= cents(freeYear(modality))) {
      used += cents(row.amount);
      return row;
    }
    const again = assetYear({ ...asset, method: 'table' }, row.index, year, modality);
    return { ...again, notes: [...again.notes, 'freeLimit' as AssetNote] };
  });
}

/** The depreciation of every asset in a year, quarter by quarter. */
export function depreciationYear(
  assets: Asset[],
  year: number,
  modality: Modality
): DepreciationYear {
  const started = assets
    .map((asset, index) => ({ asset, index }))
    .filter(({ asset }) => Number(asset.start.slice(0, 4)) <= year && asset.cost > 0);
  const rows = freeLimit(
    started.map(({ asset, index }) => assetYear(asset, index, year, modality)),
    assets,
    year,
    modality
  );
  const sum = (list: AssetYear[], pick: (r: AssetYear) => number) =>
    Math.round(list.reduce((s, r) => s + cents(pick(r)), 0)) / 100;
  const quarters = [0, 1, 2, 3].map((q) =>
    sum(rows, (r) => r.quarters[q])
  ) as AssetYear['quarters'];
  const tangible = sum(
    rows.filter((r) => !r.intangible),
    (r) => r.amount
  );
  const intangible = sum(
    rows.filter((r) => r.intangible),
    (r) => r.amount
  );
  return { assets: rows, quarters, tangible, intangible, total: sum(rows, (r) => r.amount) };
}

/**
 * The assets that are investment goods for VAT, as the regularisation of the 303 takes them (arts.
 * 107-109 LIVA): put to work in an earlier year, with their VAT and the % deducted that year. The
 * period starts the year they began to be used (art. 107.Dos LIVA).
 */
export function investmentGoodsOf(
  assets: Asset[],
  year: number,
  modality: Modality
): { year: number; vat: number; pct: number; realEstate: boolean }[] {
  return assets
    .filter((a) => (a.vat ?? 0) > 0 && a.cost > VAT_INVESTMENT_MIN)
    .filter((a) => Number(a.start.slice(0, 4)) < year)
    .map((a) => ({
      year: Number(a.start.slice(0, 4)),
      vat: a.vat as number,
      pct: a.vatPct ?? 100,
      realEstate: Boolean(tableOf(modality).find((g) => g.id === a.group)?.building),
    }));
}
