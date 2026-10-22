/**
 * Rented properties one by one (modelo 100, apartado C, boxes 0062-0156). Each property has its own
 * limit for interest and repairs, its own reduction of art. 23.2 and its own depreciation, so they
 * cannot be added up before working them out (LIRPF arts. 22-24 and 85; RIRPF arts. 13-14).
 *
 * Sources (checked 19-10-2026):
 * - LIRPF (BOE-A-2006-20764) art. 23.1 (expenses; interest and repairs "no podrá exceder ... de la
 *   cuantía de los rendimientos íntegros obtenidos por cada bien"; the excess for the next 4 years),
 *   art. 23.2 (reductions of 90/70/60/50 % for homes, contracts from 26-5-2023; 60 % for earlier
 *   ones, DT 31.ª), art. 23.3 (30 % for income of more than 2 years), art. 24 (rent to a relative up
 *   to the 3rd degree: never below the imputed rent), art. 85 (imputed rent of the days at disposal).
 * - AEAT Manual práctico de Renta 2025, c04 «Cantidades destinadas a la amortización»: 3 % of the
 *   greater of cost and cadastral value, both without the land; the land share, when unknown, by the
 *   cadastral values of the IBI receipt; and expenses and depreciation "que correspondan al número
 *   de días del año en que el inmueble ha estado arrendado".
 * - Orden HAC/277/2026 (BOE-A-2026-7041), modelo 100 pages 6-7: 0063 % ownership, 0085 days at
 *   disposal, 0089 imputed rent, 0101 days rented, 0102-0117 income and expenses, 0123-0131
 *   depreciation, 0149 net, 0150-0152 reductions and relative's minimum, 0153 withholdings, 0154
 *   reduced net, 0155 and 0156 the sums.
 */
import type { RentaProperty } from './rentaExtras';
import { round2 } from './round';

/** How the property is let: only a home for the tenant's permanent use has the reduction. */
export type PropertyUse = 'home' | 'season' | 'tourist' | 'business' | 'other';

/** When the contract in force was signed: the reductions changed on 26-5-2023 (Ley 12/2023). */
export type ContractDate = '' | 'before' | 'after';

/** One property as the person types it: whole-property amounts and their share of it. */
export interface PropertyForm {
  /** A short name to tell it apart («Piso de la playa»): never the real address. */
  label: string;
  /** % of the property that is theirs (0063, or 0064 for a usufruct); empty: 100. */
  share: string;
  usufruct?: boolean;
  /** A usufruct for a number of years (empty: for life): its cost depreciates over them. */
  usufructYears?: string;
  /** Days let in the year (0101); empty: the whole year. */
  rentedDays: string;
  /** Days that do not impute rent (their home, works, not usable): the rest of the year does (0085). */
  otherDays: string;
  /** Cadastral value of the IBI receipt (0123) and of the building alone (0124). */
  cadastral: string;
  cadastralBuilding: string;
  /** The cadastral value was revised since 2012 (1.1 % instead of 2 %). */
  revised: boolean;
  /** What it cost: price, notary, registry, taxes and earlier improvements (0126-0128). */
  cost: string;
  /** Rent charged for the whole property in the year (0102 before the share). */
  income: string;
  /** Expenses of the whole property in the year, by id of the catalogue (inmuebles.ts). */
  expenses: Record<string, string>;
  /** Interest and repairs of 2021-2024 still to deduct, already the person's share (0103). */
  pendingExcess: string;
  /** Withholdings on the rent (a business premises let to a company), the person's share (0153). */
  withheld: string;
  use: PropertyUse;
  contract: ContractDate;
  /** Housing market under stress declared under Ley 12/2023. */
  tensioned: boolean;
  /** New contract in a stressed area with the rent lowered by more than 5 %. */
  rentDrop: boolean;
  /** First time let, in a stressed area, to a tenant of 18 to 35. */
  young: boolean;
  /** Let to a public body or a non-profit for social housing. */
  social: boolean;
  /** Rehabilitated in the two years before the contract. */
  rehabilitated: boolean;
  /** Income generated over more than two years (art. 23.3): 30 % more. */
  irregular: boolean;
  /** Let to a relative up to the third degree (art. 24). */
  relative: boolean;
  /**
   * When the repairs were made, for a property let part of the year: '' no date (prorated by the
   * days let, as the Manual does), 'let' all while let, 'empty' all while empty (not deductible),
   * 'mixed' with the part while let in `repairsLet`.
   */
  repairWhen?: RepairWhen;
  repairsLet?: string;
}

/** When the repairs of a property let part of the year were made. */
export type RepairWhen = '' | 'let' | 'empty' | 'mixed';

export const emptyProperty = (n: number): PropertyForm => ({
  label: `Inmueble ${n}`,
  share: '',
  rentedDays: '',
  otherDays: '',
  cadastral: '',
  cadastralBuilding: '',
  revised: false,
  cost: '',
  income: '',
  expenses: {},
  pendingExcess: '',
  withheld: '',
  use: 'home',
  contract: '',
  tensioned: false,
  rentDrop: false,
  young: false,
  social: false,
  rehabilitated: false,
  irregular: false,
  relative: false,
});

/** Interest and repairs: together up to the income of the property (art. 23.1.a.1.º). */
export const CAPPED_EXPENSE = /interes|financiaci|reparaci|conservaci/;
/**
 * Expenses of the whole year that only count for the days let (IBI, community, insurance, interest),
 * and the yearly depreciation of the furniture typed apart: the Manual 2025 (c04, caso práctico 2,
 * checked 21-10-2026) takes "10 % x 6.900 x 9/12" for a home let 9 months.
 */
const YEARLY_EXPENSE = /interes|financiaci|tributos|comunidad|seguros|amortizacion/;
/** Information cards of the catalogue, not amounts. */
const NOT_AN_EXPENSE = /no-deducibles/;
/**
 * Repairs count only if made while let: «los gastos generados mientras no estaba arrendado no son
 * deducibles» (Manual 2025, c04, caso práctico 2, checked 22-10-2026; STS 270/2021). Without a
 * date, the Manual prorates them by the time let (210 x 9/12 = 157.50).
 */
export const REPAIR_EXPENSE = 'reparacion-conservacion';

/** The reduction of art. 23.2 that the answers give, with its id in inmuebles.ts. */
export function reductionOf(p: PropertyForm): { id: string; percent: number } | null {
  if (p.use !== 'home' || p.contract === '') return null;
  if (p.contract === 'before') return { id: 'contratos-anteriores-60', percent: 60 };
  if (p.tensioned && p.rentDrop) return { id: 'tensionada-bajada-90', percent: 90 };
  if (p.tensioned && p.young) return { id: 'jovenes-70', percent: 70 };
  if (p.social) return { id: 'social-70', percent: 70 };
  if (p.rehabilitated) return { id: 'rehabilitacion-60', percent: 60 };
  return { id: 'general-50', percent: 50 };
}

/** What the answers still lack to know the reduction: only for a home without the contract date. */
export const reductionMissing = (p: PropertyForm): boolean => p.use === 'home' && p.contract === '';

/** One property worked out, with the boxes of the modelo 100 (the person's share). */
export interface PropertyResult {
  label: string;
  /** 0063 / 0064. */
  share: number;
  /** 0101 and 0085. */
  rentedDays: number;
  disposalDays: number;
  /** 0102. */
  income: number;
  /** 0103 and 0104: earlier interest and repairs pending, and the part used this year. */
  pending: number;
  pendingApplied: number;
  /** 0105 + 0106, 0107 and 0108: this year's interest and repairs, the part used, the rest. */
  capped: number;
  cappedApplied: number;
  excessCarry: number;
  /** 0109-0117: the other expenses (with the furniture). */
  otherExpenses: number;
  /** 0130 and 0131. */
  amortizationBase: number;
  amortization: number;
  /** 0149. */
  net: number;
  /** 0150, 0151 and 0152. */
  reduction: number;
  reductionPercent: number;
  irregularReduction: number;
  relativeMinimum: number;
  /** 0154. */
  reducedNet: number;
  /** 0153. */
  withheld: number;
  /** The repairs had no date and were prorated by the days let (shown as a warning). */
  repairsProrated: boolean;
  /** Cadastral value of the days at disposal (the person's share), and whether revised (0083-0089). */
  imputedValue: number;
  revised: boolean;
}

const num = (text: string | undefined, parse: (t: string) => number): number => {
  const n = parse(text ?? '');
  return Number.isFinite(n) ? n : 0;
};
const clampDays = (d: number, full: number) => Math.min(full, Math.max(0, Math.floor(d)));

/**
 * A usufruct bought: its cost (no land, no cadastral value) over the years it lasts, or 3 % a year
 * for life, and never more than the rent of the right (RIRPF arts. 13.h and 14; Manual práctico de
 * Renta 2025, c04, «Cantidades destinadas a la amortización», checked 22-10-2026: 100,000 € for 10
 * years gives 10,000 € a year). By the days let, like the rest of the depreciation.
 */
function usufructDepreciation(
  p: PropertyForm,
  share: number,
  days: number,
  income: number,
  property: RentaProperty,
  v: (t: string | undefined) => number
): { amortizationBase: number; amortization: number } {
  const amortizationBase = round2(Math.max(0, v(p.cost)) * share);
  const years = Math.floor(v(p.usufructYears));
  const yearly =
    years > 0
      ? amortizationBase / years
      : (amortizationBase * property.rental.amortizationRate) / 100;
  return { amortizationBase, amortization: round2(Math.min(yearly * days, income)) };
}

/** A property worked out (`parse` reads the typed amounts; `full`: the days of the year). */
export function propertyResult(
  p: PropertyForm,
  property: RentaProperty,
  full: number,
  parse: (t: string) => number,
  imputationRates: { standard: number; revised: number }
): PropertyResult {
  const v = (t: string | undefined) => num(t, parse);
  const share = p.share.trim() === '' ? 1 : Math.min(100, Math.max(0, v(p.share))) / 100;
  const rentedDays = p.rentedDays.trim() === '' ? full : clampDays(v(p.rentedDays), full);
  const otherDays = clampDays(v(p.otherDays), full - rentedDays);
  const disposalDays = full - rentedDays - otherDays;
  const days = rentedDays / full;
  const income = round2(Math.max(0, v(p.income)) * share);

  let capped = 0;
  let other = 0;
  let repairsProrated = false;
  /** The part of the repairs made while let (the whole year let: all of them). */
  const repairsOf = (whole: number): number => {
    if (rentedDays === full) return whole;
    const when = p.repairWhen ?? '';
    if (when === 'let') return whole;
    if (when === 'empty') return 0;
    if (when === 'mixed') return Math.min(whole, Math.max(0, v(p.repairsLet)));
    repairsProrated = whole > 0;
    return whole * days;
  };
  for (const item of property.rental.expenses) {
    if (NOT_AN_EXPENSE.test(item.id)) continue;
    const whole = Math.max(0, v(p.expenses[item.id]));
    const amount =
      item.id === REPAIR_EXPENSE
        ? repairsOf(whole) * share
        : whole * share * (YEARLY_EXPENSE.test(item.id) ? days : 1);
    if (CAPPED_EXPENSE.test(item.id)) capped += amount;
    else other += amount;
  }
  capped = round2(capped);
  const otherExpenses = round2(other);
  // Earlier years first (0104), then this year's (0107): together up to the income (0102).
  const pending = round2(Math.max(0, v(p.pendingExcess)));
  const pendingApplied = Math.min(pending, income);
  const cappedApplied = round2(Math.min(capped, income - pendingApplied));
  const excessCarry = round2(capped - cappedApplied);

  // Depreciation: 3 % of the greater of cost and cadastral value, both without the land; the land
  // share by the cadastral values (without them, the cost typed is taken as the building's).
  const cadastral = Math.max(0, v(p.cadastral));
  const building = Math.max(0, v(p.cadastralBuilding));
  const ratio = cadastral > 0 && building > 0 ? Math.min(1, building / cadastral) : 1;
  const ownedDepreciation = (): { amortizationBase: number; amortization: number } => {
    const base = round2(Math.max(Math.max(0, v(p.cost)) * ratio, building) * share);
    return {
      amortizationBase: base,
      amortization: round2((base * property.rental.amortizationRate * days) / 100),
    };
  };
  const { amortizationBase, amortization } = p.usufruct
    ? usufructDepreciation(p, share, days, income, property, v)
    : ownedDepreciation();

  const net = round2(income - pendingApplied - cappedApplied - otherExpenses - amortization);
  const red = reductionOf(p);
  const reductionPercent = net > 0 ? (red?.percent ?? 0) : 0;
  const reduction = round2((net * reductionPercent) / 100);
  // Art. 23.3: 30 % of what is left, only on a positive net (Manual 2025, c04).
  const irregularReduction = p.irregular && net > 0 ? round2((net - reduction) * 0.3) : 0;
  const rate = p.revised ? imputationRates.revised : imputationRates.standard;
  // Art. 24: let to a relative, the net is never below the imputed rent of the days let.
  const relativeMinimum = p.relative
    ? round2((cadastral * share * rate * rentedDays) / full / 100)
    : 0;
  const reduced = net - reduction - irregularReduction;
  const reducedNet = round2(p.relative ? Math.max(reduced, relativeMinimum) : reduced);
  return {
    label: p.label,
    share: round2(share * 100),
    rentedDays,
    disposalDays,
    income,
    pending,
    pendingApplied,
    capped,
    cappedApplied,
    excessCarry,
    otherExpenses,
    amortizationBase,
    amortization,
    net,
    reduction,
    reductionPercent,
    irregularReduction,
    relativeMinimum,
    reducedNet,
    withheld: round2(Math.max(0, v(p.withheld))),
    repairsProrated,
    imputedValue: round2((cadastral * share * disposalDays) / full),
    revised: p.revised,
  };
}

/** The legacy single rental of the form (before properties one by one), as one property. */
export interface LegacyRental {
  rentalIncome: string;
  rentalExpenses: Record<string, string>;
  construction: string;
  rentalReduction: string;
  rentalPendingExcess?: string;
}

/** The answers that give the reduction a legacy rental had picked by its id. */
const LEGACY_REDUCTION: Record<string, Partial<PropertyForm>> = {
  'general-50': { use: 'home', contract: 'after' },
  'tensionada-bajada-90': { use: 'home', contract: 'after', tensioned: true, rentDrop: true },
  'jovenes-70': { use: 'home', contract: 'after', tensioned: true, young: true },
  'social-70': { use: 'home', contract: 'after', social: true },
  'rehabilitacion-60': { use: 'home', contract: 'after', rehabilitated: true },
  'contratos-anteriores-60': { use: 'home', contract: 'before' },
  'irregular-30': { use: 'other', irregular: true },
};

/**
 * A legacy rental as one property: the whole year, all of it the person's, the construction cost as
 * the depreciation base (it was typed without the land) and the reduction it had picked.
 */
export function fromLegacy(r: LegacyRental): PropertyForm {
  return {
    ...emptyProperty(1),
    income: r.rentalIncome,
    expenses: { ...r.rentalExpenses },
    cost: r.construction,
    pendingExcess: r.rentalPendingExcess ?? '',
    // No reduction picked: a home whose contract date is still to be given (no reduction meanwhile).
    ...(LEGACY_REDUCTION[r.rentalReduction] ?? {}),
  };
}
