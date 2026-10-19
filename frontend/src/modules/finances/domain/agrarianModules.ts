/**
 * Modules (estimación objetiva) of farming, livestock and forestry activities: the net yield of the
 * year as section D (apartado «actividades agrícolas, ganaderas y forestales», boxes 1536-1553) of the
 * Renta works it out.
 *
 * Sources (BOE, checked on 19 October 2026):
 * - Orden HAC/1347/2024 (BOE-A-2024-24949) for 2025 and Orden HAC/1425/2025 (BOE-A-2025-25272) for
 *   2026: anexo I (índices de rendimiento neto, instrucciones 2 and 3), disposición adicional 1.ª
 *   (reducción general del 5 %) and 2.ª (uva de mesa and flores 0,32; tabaco 0,26). Both years carry
 *   the same anexo I.
 * - Orden HAC/484/2026 (BOE-A-2026-10667): reduced indices for 2025; only the rows that apply to the
 *   whole of Spain are here (apicultura 0,13; ovino y caprino de leche 0,18; de carne 0,09). The rows
 *   by province or municipality are typed by hand («índice reducido»).
 * - DA 6.ª LIRPF: young farmers reduce the yield of modules by 25 % (instrucción 3).
 * - Art. 31.1.3.ª.b LIRPF: modules are excluded above 250,000 € of farming income.
 */

export interface AgrarianProduct {
  id: string;
  index: number;
  /** Index when the person transforms or processes the product (null: none in the order). */
  transformed: number | null;
}

/** Anexo I, instrucción 2.1 with the 2.ª additional provision (same for 2025 and 2026). */
export const AGRARIAN_PRODUCTS: AgrarianProduct[] = [
  ...['sugarBeet', 'porkMeat', 'beefMeat', 'sheepMeat', 'goatMeat', 'poultry', 'rabbits'].map(
    (id) => ({ id, index: 0.13, transformed: 0.23 })
  ),
  { id: 'forestLong', index: 0.13, transformed: 0.23 },
  { id: 'dairyCattle', index: 0.2, transformed: 0.3 },
  ...[
    'cereals',
    'citrus',
    'nuts',
    'horticulture',
    'potato',
    'legumes',
    'wineGrapeNoDO',
    'olive',
    'mushrooms',
    'porkBreeding',
    'cattleBreeding',
    'sheepMilk',
    'goatMilk',
    'beekeeping',
    'forestShort',
  ].map((id) => ({ id, index: 0.26, transformed: 0.36 })),
  ...['rice', 'wineGrapeDO', 'oilseeds', 'otherLivestock', 'resin'].map((id) => ({
    id,
    index: 0.32,
    transformed: 0.42,
  })),
  ...['roots', 'fodder', 'cotton', 'nonCitrusFruit', 'otherAgri', 'livestockServices'].map(
    (id) => ({ id, index: 0.37, transformed: 0.47 })
  ),
  ...['textilePlants', 'accessory'].map((id) => ({ id, index: 0.42, transformed: 0.52 })),
  // Disposición adicional 2.ª: the order sets these for the year without a transformed index.
  { id: 'tableGrapes', index: 0.32, transformed: null },
  { id: 'flowers', index: 0.32, transformed: null },
  { id: 'tobacco', index: 0.26, transformed: null },
  { id: 'otherServices', index: 0.56, transformed: null },
  { id: 'mussels', index: 0.56, transformed: null },
];

/** Orden HAC/484/2026: indices of 2025 reduced for the whole of Spain. */
export const REDUCED_2025: Record<string, number> = {
  beekeeping: 0.13,
  sheepMilk: 0.18,
  goatMilk: 0.18,
  sheepMeat: 0.09,
  goatMeat: 0.09,
};

/** Years whose order is known: the figures of another year are not worked out. */
export const MODULE_YEARS = [2025, 2026];
/** The decoupled CAP aid takes 0,56 when the rest of the farming income is under 25 % (instr. 2.1). */
export const AID_INDEX = 0.56;
export const AID_SHARE = 0.25;
export const GENERAL_REDUCTION = 0.05;
export const YOUNG_FARMER_REDUCTION = 0.25;
export const MODULES_LIMIT = 250000;
/** Corrector g): yield after depreciation of up to 9,447.91 € (when the young farmers' one does not apply). */
export const SMALL_YIELD = 9447.91;

/** Corrector b): the cost of the staff over the income, from the highest step. */
export const STAFF_STEPS: { over: number; index: number }[] = [
  { over: 40, index: 0.75 },
  { over: 30, index: 0.8 },
  { over: 20, index: 0.85 },
  { over: 10, index: 0.9 },
];

export interface ModuleRow {
  product: string;
  /** Income of the year from it, with its grants and compensations (euros). */
  income: number;
  transformed?: boolean;
  /** Index of a reduction order for the province or municipality (null: the table). */
  reduced?: number | null;
}

export interface AgrarianModulesInput {
  rows: ModuleRow[];
  /** Decoupled CAP aid (pago básico…), spread over the crops by their income. */
  pacAid: number;
  /** Depreciation of the assets with the table of modules (box 1538). */
  depreciation: number;
  correctors: {
    /** a) Only means of production of others (0,75). */
    externalMeans: boolean;
    /** b) Cost of salaried staff as % of the income. */
    staffShare: number;
    /** c) and f) Share (%) of the yield from rented land and from land irrigated with electricity. */
    rentedShare: number;
    irrigatedShare: number;
    /** d) More than half of the feed bought from others (0,50). */
    boughtFeed: boolean;
    /** e) Organic farming with a certificate (0,95). */
    organic: boolean;
    /** h) Forestry with an approved plan of at least 20 years (0,80): the only corrector of forestry. */
    forestPlan: boolean;
  };
  youngFarmer: boolean;
  /** Grants given back (box 0239) and extraordinary expenses (box 1552). */
  refunds: number;
  extraordinary: number;
}

export type ModuleWarning = 'year' | 'limit' | 'noTransformed' | 'unknownProduct';

export interface AgrarianModulesResult {
  boxes: Record<string, number>;
  /** Box 1553: net yield of the activity. */
  net: number;
  warnings: ModuleWarning[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const FORESTRY = ['forestLong', 'forestShort', 'resin'];

/** The index of a product in a year, with the reductions of the year that apply everywhere. */
export function indexOf(row: ModuleRow, year: number): { index: number; warning?: ModuleWarning } {
  const product = AGRARIAN_PRODUCTS.find((p) => p.id === row.product);
  if (!product) return { index: 0, warning: 'unknownProduct' };
  if (row.transformed) {
    if (product.transformed === null) return { index: product.index, warning: 'noTransformed' };
    return { index: product.transformed };
  }
  const base = year === 2025 ? REDUCED_2025[product.id] ?? product.index : product.index;
  return { index: row.reduced && row.reduced > 0 ? Math.min(base, row.reduced) : base };
}

/** Phase 3: the correctors in the order of the instrucción 2.3, on the yield after depreciation. */
function corrected(input: AgrarianModulesInput, reduced: number): number {
  const c = input.correctors;
  const forestry = input.rows.length > 0 && input.rows.every((r) => FORESTRY.includes(r.product));
  if (forestry) return c.forestPlan ? reduced * 0.8 : reduced;
  let value = reduced;
  if (c.externalMeans) value *= 0.75;
  else value *= STAFF_STEPS.find((s) => c.staffShare > s.over)?.index ?? 1;
  const share = (pct: number) => Math.min(100, Math.max(0, pct)) / 100;
  value *= 1 - share(c.rentedShare) * (1 - 0.9);
  if (c.boughtFeed) value *= 0.5;
  if (c.organic) value *= 0.95;
  value *= 1 - share(c.irrigatedShare) * (1 - 0.75);
  if (!input.youngFarmer && reduced <= SMALL_YIELD) value *= 0.9;
  return value;
}

/** Phase 1: the income of each product by its index, with the CAP aid (instrucción 2.1). */
function previousYield(input: AgrarianModulesInput, year: number, warnings: Set<ModuleWarning>) {
  const crops = input.rows.reduce((s, r) => s + Math.max(0, r.income), 0);
  const aid = Math.max(0, input.pacAid);
  const total = crops + aid;
  // The aid goes with each crop by its income, unless the rest of the income is under 25 %.
  const aidApart = total > 0 && crops < total * AID_SHARE;
  let previous = aidApart ? aid * AID_INDEX : 0;
  for (const row of input.rows) {
    const { index, warning } = indexOf(row, year);
    if (warning) warnings.add(warning);
    const income = Math.max(0, row.income);
    const share = aidApart || crops === 0 ? 0 : (aid * income) / crops;
    previous += (income + share) * index;
  }
  return { total, previous };
}

/** The yield of the farming activity in modules, box by box. */
export function agrarianModules(input: AgrarianModulesInput, year: number): AgrarianModulesResult {
  const warnings = new Set<ModuleWarning>();
  if (!MODULE_YEARS.includes(year)) warnings.add('year');
  const { total, previous } = previousYield(input, year, warnings);
  if (total > MODULES_LIMIT) warnings.add('limit');
  const box1537 = round2(previous);
  const box1538 = round2(Math.max(0, input.depreciation));
  const box1539 = round2(box1537 - box1538);
  const box1548 = round2(corrected(input, box1539));
  const box1549 = box1548 > 0 ? round2(box1548 * GENERAL_REDUCTION) : 0;
  const box1550 = round2(box1548 - box1549);
  const box1551 = input.youngFarmer && box1550 > 0 ? round2(box1550 * YOUNG_FARMER_REDUCTION) : 0;
  const box0239 = round2(Math.max(0, input.refunds));
  const box1552 = round2(Math.max(0, input.extraordinary));
  const net = round2(box1550 - box1551 - box0239 - box1552);
  return {
    boxes: {
      '1536': round2(total),
      '1537': box1537,
      '1538': box1538,
      '1539': box1539,
      '1548': box1548,
      '1549': box1549,
      '1550': box1550,
      '1551': box1551,
      '0239': box0239,
      '1552': box1552,
      '1553': net,
    },
    net,
    warnings: [...warnings],
  };
}
