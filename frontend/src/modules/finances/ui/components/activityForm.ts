import { parseDecimal } from '@shared/utils/numbers';
import {
  AGRARIAN_PRODUCTS,
  type AgrarianModulesInput,
} from '@modules/finances/domain/agrarianModules';
import {
  depreciationYear,
  type Asset,
  type AssetMethod,
  type Modality,
} from '@modules/finances/domain/depreciation';
import { subsidyYear, type SubsidyKind } from '@modules/finances/domain/subsidies';
import type { ActivityInputs, ActivityMethod, QuarterExtras } from '@modules/finances/domain/types';

/** An asset as typed (text, so the fields can be edited freely). */
export interface AssetForm {
  name: string;
  group: string;
  cost: string;
  land: string;
  start: string;
  use: string;
  method: AssetMethod;
  rate: string;
  life: string;
  used: boolean;
  accumulated: string;
  vat: string;
  vatPct: string;
}

export interface SubsidyForm {
  name: string;
  kind: SubsidyKind;
  amount: string;
  year: string;
  quarter: string;
  /** Index of the asset financed, as text ('' none). */
  asset: string;
}

export interface ModuleRowForm {
  product: string;
  income: string;
  transformed: boolean;
  reduced: string;
}

export interface ModulesForm {
  rows: ModuleRowForm[];
  pacAid: string;
  staffShare: string;
  rentedShare: string;
  irrigatedShare: string;
  externalMeans: boolean;
  boughtFeed: boolean;
  organic: boolean;
  forestPlan: boolean;
  youngFarmer: boolean;
  refunds: string;
  extraordinary: string;
}

/** The activity of the year beyond the quarters, as typed (older data has none). */
export interface ActivityForm {
  method: ActivityMethod;
  agrarian: boolean;
  assets: AssetForm[];
  subsidies: SubsidyForm[];
  provisions: string;
  retaFix: string;
  selfConsumption: string;
  stockChange: string;
  compensations: string[];
  paid130: string[];
  modules: ModulesForm;
}

export const ACTIVITY_METHODS: ActivityMethod[] = ['simplified', 'normal', 'objective'];

export const emptyModules = (): ModulesForm => ({
  rows: [],
  pacAid: '',
  staffShare: '',
  rentedShare: '',
  irrigatedShare: '',
  externalMeans: false,
  boughtFeed: false,
  organic: false,
  forestPlan: false,
  youngFarmer: false,
  refunds: '',
  extraordinary: '',
});

export const emptyActivity = (): ActivityForm => ({
  method: 'simplified',
  agrarian: false,
  assets: [],
  subsidies: [],
  provisions: '',
  retaFix: '',
  selfConsumption: '',
  stockChange: '',
  compensations: ['', '', '', ''],
  paid130: ['', '', '', ''],
  modules: emptyModules(),
});

export const newAsset = (year: number): AssetForm => ({
  name: '',
  group: 's2',
  cost: '',
  land: '',
  start: `${year}-01-01`,
  use: '100',
  method: 'table',
  rate: '',
  life: '',
  used: false,
  accumulated: '',
  vat: '',
  vatPct: '',
});

export const newSubsidy = (year: number): SubsidyForm => ({
  name: '',
  kind: 'current',
  amount: '',
  year: String(year),
  quarter: '1',
  asset: '',
});

export const newModuleRow = (): ModuleRowForm => ({
  product: AGRARIAN_PRODUCTS[0].id,
  income: '',
  transformed: false,
  reduced: '',
});

/** The form with every field, whatever older data left out. */
export function activityOf(form: Partial<ActivityForm> | undefined | null): ActivityForm {
  const empty = emptyActivity();
  const f = { ...empty, ...form };
  // Every item with its fields in the same order, so two equal forms are the same text.
  const ordered = <T extends object>(base: T, item: Partial<T>): T =>
    Object.fromEntries(
      Object.keys(base).map((k) => [k, item[k as keyof T] ?? base[k as keyof T]])
    ) as T;
  const modules = ordered(empty.modules, f.modules);
  return {
    method: f.method,
    agrarian: f.agrarian,
    assets: f.assets.map((a) => ordered(newAsset(0), a)),
    subsidies: f.subsidies.map((x) => ordered(newSubsidy(0), x)),
    provisions: f.provisions,
    retaFix: f.retaFix,
    selfConsumption: f.selfConsumption,
    stockChange: f.stockChange,
    compensations: [0, 1, 2, 3].map((i) => f.compensations[i] ?? ''),
    paid130: [0, 1, 2, 3].map((i) => f.paid130[i] ?? ''),
    modules: { ...modules, rows: modules.rows.map((r) => ordered(newModuleRow(), r)) },
  };
}

/** True when nothing was typed (it is then not saved). */
export const isEmptyActivity = (form: Partial<ActivityForm> | undefined | null): boolean =>
  JSON.stringify(activityOf(form)) === JSON.stringify(emptyActivity());

const signed = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) ? parsed : 0;
};
const positive = (text: string): number => Math.max(0, signed(text));
/** A number or nothing (an empty field, or text that is not a number). */
const optional = (text: string): number | null => {
  if (text.trim() === '') return null;
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) ? parsed : null;
};
const four = <T>(list: string[], map: (text: string) => T): [T, T, T, T] =>
  [0, 1, 2, 3].map((i) => map(list[i])) as [T, T, T, T];

function assetOf(a: AssetForm): Asset {
  const rate = optional(a.rate);
  const life = optional(a.life);
  const accumulated = optional(a.accumulated);
  return {
    name: a.name,
    group: a.group,
    cost: positive(a.cost),
    land: positive(a.land),
    start: /^\d{4}-\d{2}-\d{2}$/.test(a.start) ? a.start : '9999-12-31',
    use: optional(a.use) ?? 100,
    method: a.method,
    ...(rate !== null ? { rate } : {}),
    ...(life !== null ? { life } : {}),
    ...(a.used ? { used: true } : {}),
    ...(accumulated !== null ? { accumulated } : {}),
    vat: positive(a.vat),
    vatPct: optional(a.vatPct) ?? 100,
  };
}

function modulesOf(m: ModulesForm): Omit<AgrarianModulesInput, 'depreciation'> {
  return {
    rows: m.rows.map((r) => ({
      product: r.product,
      income: positive(r.income),
      transformed: r.transformed,
      reduced: optional(r.reduced),
    })),
    pacAid: positive(m.pacAid),
    correctors: {
      externalMeans: m.externalMeans,
      staffShare: positive(m.staffShare),
      rentedShare: positive(m.rentedShare),
      irrigatedShare: positive(m.irrigatedShare),
      boughtFeed: m.boughtFeed,
      organic: m.organic,
      forestPlan: m.forestPlan,
    },
    youngFarmer: m.youngFarmer,
    refunds: positive(m.refunds),
    extraordinary: positive(m.extraordinary),
  };
}

/** The activity as the annual summary and the draft take it. */
export function toActivityInputs(form: Partial<ActivityForm> | undefined | null): ActivityInputs {
  const a = activityOf(form);
  return {
    method: a.method,
    agrarian: a.agrarian,
    assets: a.assets.map(assetOf),
    subsidies: a.subsidies.map((s) => ({
      name: s.name,
      kind: s.kind,
      amount: positive(s.amount),
      year: Math.floor(positive(s.year)),
      quarter: Math.floor(positive(s.quarter)),
      asset: s.asset === '' ? null : Number(s.asset),
    })),
    provisions: positive(a.provisions),
    retaFix: signed(a.retaFix),
    selfConsumption: positive(a.selfConsumption),
    stockChange: signed(a.stockChange),
    compensations: four(a.compensations, positive),
    paid130: four(a.paid130, optional),
    modules: a.method === 'objective' && a.agrarian ? modulesOf(a.modules) : null,
  };
}

export const modalityOf = (method: ActivityMethod): Modality =>
  method === 'objective' ? 'modules' : method;

/**
 * What the activity adds to each quarter of the 130: depreciation, provisions (the normal modality,
 * in the fourth quarter), grants and REAGP compensations, worked out here and sent to the server.
 */
export function activityExtras(
  activity: ActivityInputs,
  year: number
): Pick<
  QuarterExtras,
  'depreciation' | 'provisions' | 'subsidies' | 'capitalSubsidies' | 'compensations'
>[] {
  const dep = depreciationYear(activity.assets, year, modalityOf(activity.method));
  const subs = subsidyYear(activity.subsidies, year, dep);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return [0, 1, 2, 3].map((i) => ({
    depreciation: dep.quarters[i],
    provisions: i === 3 && activity.method === 'normal' ? activity.provisions : 0,
    subsidies: round2(subs.quarters[i] - subs.capitalQuarters[i]),
    capitalSubsidies: subs.capitalQuarters[i],
    compensations: activity.compensations[i],
  }));
}
