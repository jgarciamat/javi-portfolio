import { agrarianModules, type AgrarianModulesResult } from './agrarianModules';
import { depreciationYear, type DepreciationYear, type Modality } from './depreciation';
import { incomeOf, irpfDeductible } from './importChecks';
import { subsidyYear, type SubsidyYear } from './subsidies';
import {
  EXPENSE_KINDS,
  type ActivityInputs,
  type AutonomoInputs,
  type ExpenseKind,
  type ManualData,
} from './types';

/**
 * The annual contract of the self-employed screen: what the year of the activity hands to the Renta
 * (modelo 100, section D and boxes 0599 and 0604). Pure: it takes the same inputs the draft of the
 * quarters sends to the server (AutonomoInputs, with its `activity`) and gives the totals, the boxes
 * and what it could not work out. Documented in docs/fiscalidad/contrato-actividad-anual.md.
 *
 * Rules (checked on 19 October 2026):
 * - Direct estimation: income less deductible expenses (arts. 28-30 LIRPF); simplified modality: the
 *   provisions and hard-to-justify expenses are 5 % of the positive net income, up to 2,000 € (art.
 *   30.2.4.ª RIRPF); normal modality: provisions as typed and no 5 % (Renta boxes 0219-0224).
 * - Depreciation (depreciation.ts), grants (subsidies.ts), REAGP compensations as income (box 0176,
 *   art. 130 LIVA) and the RETA fees of the owner (box 0186; regularisation 0196/0197).
 * - Withholdings suffered (box 0599) and payments of the modelo 130 (box 0604): the results of the
 *   filed 130 when given; otherwise the app's own estimate, said in a warning.
 * - Farming in modules (agrarianModules.ts). Other activities in modules are not worked out here.
 */

export const CONTRACT_VERSION = 1;

/** Where each kind of expense goes in the Renta (orientative: the person checks the box). */
export const KIND_BOX: Record<ExpenseKind, string | null> = {
  quota: '0186',
  supplies: '0194',
  vehicle: '0202',
  meals: '0191',
  clients: '0202',
  health: '0200',
  staff: '0184',
  training: '0202',
  management: '0199',
  software: '0202',
  rent: '0192',
  advertising: '0202',
  material: '0183',
  other: '0202',
  fines: null,
};

export type Regime =
  | 'directSimplified'
  | 'directNormal'
  | 'agrarianSimplified'
  | 'agrarianNormal'
  | 'objective'
  | 'objectiveAgrarian';

export type AnnualWarning =
  | 'noData'
  | 'priorTotals'
  | 'objective'
  | 'payments130Estimated'
  | 'payments131'
  | 'investmentNoAsset'
  | 'capitalNoAsset'
  | 'exemptAid'
  | 'provisionsSimplified'
  | 'assetNotes'
  | 'vatInvestments'
  | 'modules'
  | 'notWorkedOut';

export interface AnnualActivity {
  version: typeof CONTRACT_VERSION;
  year: number;
  regime: Regime;
  /** Renta box 0168: N (normal) or S (simplified); null in modules. */
  modality: 'N' | 'S' | null;
  income: {
    /** Sales and services, with VAT or without (box 0171). */
    sales: number;
    currentSubsidies: number;
    capitalSubsidies: number;
    /** REAGP compensations received (box 0176). */
    compensations: number;
    /** Box 0175, and the increase of stock (box 0177). */
    selfConsumption: number;
    stockIncrease: number;
    total: number;
  };
  expenses: {
    /** What each kind of expense counts for the income tax (fines and investment goods: 0). */
    byKind: Record<ExpenseKind, number>;
    /** RETA fees of the owner (box 0186) and their regularisation (0196 paid, 0197 refunded). */
    reta: number;
    /** Decrease of stock (box 0182). */
    stockDecrease: number;
    retaFix: { paid: number; refunded: number };
    depreciation: { tangible: number; intangible: number; total: number };
    /** Normal modality only (box 0219). */
    provisions: number;
    /** Simplified modality: provisions and hard-to-justify expenses together (box 0222). */
    hardToJustify: number;
    /** Box 0220 or 0223. */
    total: number;
  };
  subsidies: { current: number; capital: number; exempt: number; unassigned: number };
  /** Box 0224 (or 1553 in modules): the net yield before the reductions of art. 32 LIRPF. */
  net: number | null;
  /** Box 0599. */
  withholdings: number;
  /** Box 0604 and where each quarter comes from. */
  payments130: {
    quarters: number[];
    source: ('filed' | 'estimated' | 'none')[];
    total: number;
  };
  /** The boxes of the Renta this gives (casilla → euros). */
  boxes: Record<string, number>;
  depreciation: DepreciationYear;
  modules: AgrarianModulesResult | null;
  warnings: AnnualWarning[];
}

export const NO_ACTIVITY: ActivityInputs = {
  method: 'simplified',
  agrarian: false,
  assets: [],
  subsidies: [],
  provisions: 0,
  retaFix: 0,
  compensations: [0, 0, 0, 0],
  paid130: [null, null, null, null],
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (list: number[]) => round2(list.reduce((s, v) => s + v, 0));

// The modelo 130 as the server works it out (backend autonomo.ts draft130), to estimate what was
// paid when the filed results are not given.
const ADVANCE = 0.2;
const AGRARIAN_ADVANCE = 0.02;
const HARD_RATE = 0.05;
const HARD_MAX = 2000;
/** 7 % in 2023 only (DA 56.ª LIRPF), 5 % the other years (art. 30.2.4.ª LIRPF). */
export const hardRateOf = (year: number) => (year === 2023 ? 0.07 : HARD_RATE);
const LOW_INCOME = [
  { upTo: 9000, amount: 100 },
  { upTo: 10000, amount: 75 },
  { upTo: 11000, amount: 50 },
  { upTo: 12000, amount: 25 },
];

export interface QuarterFigures {
  income: number;
  /** Income of section II of the 130: without the capital grants. */
  agrarianIncome: number;
  expenses: number;
  withheld: number;
}

/** Box 19 of the four modelos 130 of the year, from the figures of each quarter. */
export function estimate130(
  quarters: QuarterFigures[],
  /** hardRate: 5 % (7 % in 2023) in the simplified modality with the option on; 0 otherwise. */
  options: { hardRate: number; agrarian: boolean; priorYearNet: number | null }
): number[] {
  const reduction =
    options.priorYearNet === null
      ? 0
      : LOW_INCOME.find((r) => (options.priorYearNet as number) <= r.upTo)?.amount ?? 0;
  let previous = 0;
  let negative = 0;
  const out: number[] = [];
  for (let n = 1; n <= 4; n++) {
    let box07 = 0;
    let box11 = 0;
    if (options.agrarian) {
      const q = quarters[n - 1];
      box11 = round2(round2(q.agrarianIncome * AGRARIAN_ADVANCE) - q.withheld);
    } else {
      const sel = quarters.slice(0, n);
      const income = sum(sel.map((q) => q.income));
      const pre = round2(income - sum(sel.map((q) => q.expenses)));
      const hard = Math.min(round2(Math.max(0, pre) * options.hardRate), HARD_MAX);
      const fourth = round2(Math.max(0, round2(pre - hard)) * ADVANCE);
      box07 = round2(fourth - previous - sum(sel.map((q) => q.withheld)));
      previous = round2(previous + Math.max(0, box07));
    }
    const box12 = Math.max(0, round2(box07 + box11));
    const box14 = round2(box12 - reduction);
    const box15 = box14 > 0 ? Math.min(box14, negative) : 0;
    negative = box14 < 0 ? round2(negative - box14) : round2(Math.max(0, negative - box15));
    out.push(round2(box14 - box15));
  }
  return out;
}

const regimeOf = (a: ActivityInputs): Regime => {
  if (a.method === 'objective') return a.agrarian ? 'objectiveAgrarian' : 'objective';
  const normal = a.method === 'normal';
  if (a.agrarian) return normal ? 'agrarianNormal' : 'agrarianSimplified';
  return normal ? 'directNormal' : 'directSimplified';
};

const EMPTY_QUARTER: ManualData['quarters'][number] = {
  income: { r21: 0, r10: 0, r4: 0, r0: 0 },
  expenses: [],
};

/** The expenses of the year by kind, as the income tax counts them. */
function byKindOf(manual: ManualData | null): Record<ExpenseKind, number> {
  const out = Object.fromEntries(EXPENSE_KINDS.map((k) => [k, 0])) as Record<ExpenseKind, number>;
  for (const q of manual?.quarters ?? []) {
    for (const e of q.expenses) out[e.kind] += irpfDeductible(e, (manual as ManualData).profile);
  }
  for (const k of EXPENSE_KINDS) out[k] = round2(out[k]);
  return out;
}

/** What each quarter brings to the 130: the same sums the draft sends to the server. */
function quarterFigures(
  inputs: AutonomoInputs,
  activity: ActivityInputs,
  dep: DepreciationYear,
  subs: SubsidyYear,
  provisions: number
): QuarterFigures[] {
  return [0, 1, 2, 3].map((i) => {
    const q = inputs.manual?.quarters[i] ?? EMPTY_QUARTER;
    const extras = inputs.quarters[i];
    const profile = (inputs.manual as ManualData | null)?.profile;
    const typed = q.expenses.reduce(
      (s, e) => s + irpfDeductible(e, profile as ManualData['profile']),
      0
    );
    const sales = incomeOf(q);
    const compensations = activity.compensations[i];
    return {
      income: round2(sales + subs.quarters[i] + compensations),
      // Box 08 leaves out the capital grants; the REAGP compensations too (NOT CONFIRMED).
      agrarianIncome: round2(sales + subs.quarters[i] - subs.capitalQuarters[i]),
      expenses: round2(
        typed +
          extras.socialSecurity +
          extras.vatNotDeductible +
          dep.quarters[i] +
          (i === 3 ? provisions : 0)
      ),
      withheld: extras.withheld,
    };
  });
}

/** What the inputs say that the person should look at. */
function warningsOf(
  inputs: AutonomoInputs,
  activity: ActivityInputs,
  dep: DepreciationYear,
  subs: SubsidyYear
): Set<AnnualWarning> {
  const w = new Set<AnnualWarning>();
  const quarters = inputs.manual?.quarters ?? [];
  const checks: [AnnualWarning, boolean][] = [
    ['noData', !inputs.manual],
    ['priorTotals', Boolean(inputs.prior)],
    ['assetNotes', dep.assets.some((a) => a.notes.length > 0)],
    ['capitalNoAsset', subs.unassigned > 0],
    ['exemptAid', subs.exempt > 0],
    [
      'investmentNoAsset',
      quarters.some((q) => q.expenses.some((e) => e.investment)) && activity.assets.length === 0,
    ],
    [
      'vatInvestments',
      activity.assets.some((a) => (a.vat ?? 0) > 0) && Boolean(inputs.vat?.prorrata),
    ],
    ['provisionsSimplified', activity.method === 'simplified' && activity.provisions > 0],
  ];
  for (const [code, on] of checks) if (on) w.add(code);
  return w;
}

/** Income of the year, by its box. */
function incomeOfYear(inputs: AutonomoInputs, activity: ActivityInputs, subs: SubsidyYear) {
  const sales = sum((inputs.manual?.quarters ?? []).map(incomeOf));
  const compensations = sum(activity.compensations);
  const selfConsumption = round2(Math.max(0, activity.selfConsumption ?? 0));
  const stockIncrease = round2(Math.max(0, activity.stockChange ?? 0));
  return {
    sales,
    currentSubsidies: subs.current,
    capitalSubsidies: subs.capital,
    compensations,
    selfConsumption,
    stockIncrease,
    total: round2(
      sales + subs.current + subs.capital + compensations + selfConsumption + stockIncrease
    ),
  };
}

/** Expenses of the year, by its box, with the provisions and the hard-to-justify ones. */
function expensesOfYear(
  year: number,
  inputs: AutonomoInputs,
  activity: ActivityInputs,
  dep: DepreciationYear,
  income: number
) {
  const byKind = byKindOf(inputs.manual ?? null);
  const legacy = sum(inputs.quarters.map((q) => q.socialSecurity));
  byKind.other = round2(byKind.other + sum(inputs.quarters.map((q) => q.vatNotDeductible)));
  const stockDecrease = round2(Math.max(0, -(activity.stockChange ?? 0)));
  const retaFix = {
    paid: round2(Math.max(0, activity.retaFix)),
    refunded: round2(Math.max(0, -activity.retaFix)),
  };
  const normal = activity.method === 'normal';
  const provisions = normal ? round2(Math.max(0, activity.provisions)) : 0;
  const box0218 = round2(
    sum(EXPENSE_KINDS.map((k) => byKind[k])) +
      legacy +
      dep.total +
      stockDecrease +
      retaFix.paid -
      retaFix.refunded
  );
  const difference = round2(income - box0218);
  const hard =
    activity.method === 'simplified' && inputs.hardToJustify
      ? Math.min(round2(Math.max(0, difference) * hardRateOf(year)), HARD_MAX)
      : 0;
  return {
    byKind,
    reta: round2(byKind.quota + legacy),
    stockDecrease,
    retaFix,
    depreciation: { tangible: dep.tangible, intangible: dep.intangible, total: dep.total },
    provisions,
    hardToJustify: hard,
    total: round2(box0218 + provisions + hard),
    box0218,
    difference,
  };
}

type Income = ReturnType<typeof incomeOfYear>;
type Expenses = ReturnType<typeof expensesOfYear>;

/** The payments of the 130: those filed, or the app's estimate. */
function paymentsOf(
  year: number,
  inputs: AutonomoInputs,
  activity: ActivityInputs,
  figures: QuarterFigures[]
): AnnualActivity['payments130'] {
  // No 130 in modules (131) or with 70 % of the income withheld.
  const none = activity.method === 'objective' || inputs.exempt130;
  const estimated = none
    ? [0, 0, 0, 0]
    : estimate130(figures, {
        hardRate: activity.method === 'simplified' && inputs.hardToJustify ? hardRateOf(year) : 0,
        agrarian: activity.agrarian,
        priorYearNet: inputs.priorYearNet,
      });
  const source = activity.paid130.map((p, i): 'filed' | 'estimated' | 'none' => {
    if (p !== null) return 'filed';
    return !none && estimated[i] > 0 ? 'estimated' : 'none';
  });
  const quarters = activity.paid130.map((p, i) => round2(Math.max(0, p ?? estimated[i])));
  return { quarters, source, total: sum(quarters) };
}

/** Section D of the Renta in direct estimation. */
function directBoxes(
  activity: ActivityInputs,
  income: Income,
  expenses: Expenses,
  net: number
): Record<string, number> {
  const boxes: Record<string, number> = {
    '0171': income.sales,
    '0173': income.currentSubsidies,
    '0174': income.capitalSubsidies,
    '0175': income.selfConsumption,
    '0176': income.compensations,
    '0177': income.stockIncrease,
    '0180': income.total,
    '0182': expenses.stockDecrease,
    '0196': expenses.retaFix.paid,
    '0197': expenses.retaFix.refunded,
    '0208': expenses.depreciation.tangible,
    '0227': expenses.depreciation.intangible,
    '0218': expenses.box0218,
    '0224': net,
  };
  for (const k of EXPENSE_KINDS) {
    const box = KIND_BOX[k];
    if (box) boxes[box] = round2((boxes[box] ?? 0) + expenses.byKind[k]);
  }
  boxes['0186'] = expenses.reta;
  if (activity.method === 'normal') {
    return { ...boxes, '0219': expenses.provisions, '0220': expenses.total };
  }
  return {
    ...boxes,
    '0221': expenses.difference,
    '0222': expenses.hardToJustify,
    '0223': expenses.total,
  };
}

const modalityOf = (a: ActivityInputs): Modality =>
  a.method === 'objective' ? 'modules' : a.method;

/** Modules: farming is worked out with the order of the year; the rest is not. */
function modulesOf(
  year: number,
  activity: ActivityInputs,
  dep: DepreciationYear,
  warnings: Set<AnnualWarning>
): { modules: AgrarianModulesResult | null; net: number | null } {
  warnings.add('payments131');
  if (!activity.agrarian || !activity.modules) {
    warnings.add('objective');
    return { modules: null, net: null };
  }
  const modules = agrarianModules({ ...activity.modules, depreciation: dep.total }, year);
  if (modules.warnings.length > 0) warnings.add('modules');
  return { modules, net: modules.net };
}

/** The year of the activity as the Renta takes it. */
export function annualActivity(year: number, inputs: AutonomoInputs): AnnualActivity {
  const activity = inputs.activity ?? NO_ACTIVITY;
  const objective = activity.method === 'objective';
  const dep = depreciationYear(activity.assets, year, modalityOf(activity));
  const subs = subsidyYear(activity.subsidies, year, dep);
  const warnings = warningsOf(inputs, activity, dep, subs);
  const income = incomeOfYear(inputs, activity, subs);
  const expenses = expensesOfYear(year, inputs, activity, dep, income.total);

  const { modules, net } = objective
    ? modulesOf(year, activity, dep, warnings)
    : { modules: null, net: round2(income.total - expenses.total) };

  const figures = quarterFigures(inputs, activity, dep, subs, expenses.provisions);
  const payments130 = paymentsOf(year, inputs, activity, figures);
  if (payments130.source.includes('estimated')) warnings.add('payments130Estimated');
  const withholdings = sum(inputs.quarters.map((q) => q.withheld));
  // Always: art. 32 reductions, irregular income and other boxes are for the Renta itself.
  warnings.add('notWorkedOut');
  const section = objective
    ? modules?.boxes ?? {}
    : directBoxes(activity, income, expenses, net as number);
  const { box0218: _sum, difference: _difference, ...shown } = expenses;

  return {
    version: CONTRACT_VERSION,
    year,
    regime: regimeOf(activity),
    modality: objective ? null : activity.method === 'normal' ? 'N' : 'S',
    income,
    expenses: shown,
    subsidies: {
      current: subs.current,
      capital: subs.capital,
      exempt: subs.exempt,
      unassigned: subs.unassigned,
    },
    net,
    withholdings,
    payments130,
    boxes: { ...section, '0599': withholdings, '0604': payments130.total },
    depreciation: dep,
    modules,
    warnings: [...warnings],
  };
}
