import { reducedInstalment } from '@modules/finances/domain/activityTerritory';
import { parseDecimal } from '@shared/utils/numbers';
import type { ModuleActivity } from '@modules/tools/domain/rentaActivity';
import type { Modules131, Simplified303 } from '../../application/aeatFiles/modules';
import { depreciationYear } from '../../domain/depreciation';
import { incomeOf, vatDeductible } from '../../domain/importChecks';
import type { Result131 } from '../../domain/module131';
import {
  activityOf as moduleActivityOf,
  instalments131,
  moduleTableOf,
  quarterShare,
  SMALL_INDICES,
  specialKindOf,
  yearUnits,
  type Instalments131,
  type ObjectiveInput,
} from '../../domain/objectiveModules';
import {
  isCommission,
  seasonIndex,
  vatActivityFor,
  vatSimplifiedQuarters,
  vatUnitsOf,
  type VatSimplifiedResult,
} from '../../domain/vatSimplified';
import type { VatModuleActivity } from '../../domain/vatModules2025';
import { toManualData, type Extras, type ManualForm } from './AutonomoManual';
import { activityOf, toActivityInputs, type ObjectiveForm } from './activityForm';
import { priorNetOf } from './autonomoInputs';
import { vatExtrasOf } from './vatForm';

/**
 * What the screen of an activity in módulos shows for a quarter: the modelo 131 (and its file) and,
 * in the simplified regime of VAT, the 303 of page 2 (and its file). Worked out on the device from
 * the form (objectiveModules.ts, vatSimplified.ts); nothing goes to the server.
 */

type Quarter = 1 | 2 | 3 | 4;

const number = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const optional = (text: string): number | null => (text.trim() === '' ? null : number(text));
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ModulesVat {
  activity: VatModuleActivity;
  unitsStart: number[];
  unitsYear: number[];
  /** VAT paid on the current purchases of the year (typed, or that of the expenses). */
  supported: number;
  quarters: VatSimplifiedResult[];
  result: VatSimplifiedResult;
  file: Simplified303;
  /** The activity has a commissions module (loterías): its quarterly part is the commissions. */
  commissions: boolean;
}

export interface ModulesView {
  year: number;
  quarter: Quarter;
  activity: ModuleActivity;
  input: ObjectiveInput;
  /** The order of the year is not known yet: the last one is used. */
  provisional: boolean;
  instalments: Instalments131;
  result131: Result131;
  file131: Modules131;
  /** null: the VAT is not in the simplified regime; 'none': this activity has no VAT modules. */
  vat: ModulesVat | 'none' | null;
}

/** 659.4 and 691.9 carry a mark in the files: «1» or «2» of the two activities of the heading. */
const AUX: Record<string, string> = { m32: '1', m33: '2', m54: '1', m55: '2' };

/** The five indices of the DPA page (1 when it does not apply). */
function indicesOf(
  input: ObjectiveInput,
  act: ModuleActivity,
  net: Instalments131['net']
): Modules131['indices'] {
  const kind = specialKindOf(input.activityId);
  const small = kind && kind !== 'kiosk' ? 1 : input.smallIndex;
  const season = seasonIndex(input.seasonLastYear);
  const before = net.reduced * input.specialIndex * small * season;
  const excess = small === 1 && act.excess !== undefined && before > act.excess ? 1.3 : 1;
  const fresh = [1, [0.8, 0.9], [0.6, 0.7]];
  const newIndex =
    season === 1 && input.newYear > 0
      ? (fresh[input.disabled ? 2 : 1] as number[])[input.newYear - 1]
      : 1;
  return [input.specialIndex, small, season, excess, newIndex];
}

/** Days in business in an incomplete quarter (0 when it is a whole one or a season). */
function quarterDays(input: ObjectiveInput, year: number, q: Quarter): number {
  if (input.seasonLastYear > 0) return input.seasonQuarters[q - 1];
  const share = quarterShare(input, year, q);
  if (share === 1) return 0;
  const days = (Date.UTC(year, q * 3, 1) - Date.UTC(year, (q - 1) * 3, 1)) / 86_400_000;
  return Math.round(share * days);
}

/** The VAT of the expenses typed: current purchases of the year, and fixed assets by quarter. */
function supportedOf(manual: ManualForm) {
  const data = toManualData(manual);
  const vatOf = (investment: boolean) =>
    data.quarters.map((q) =>
      round2(
        q.expenses
          .filter((e) => Boolean(e.investment) === investment)
          .reduce((s, e) => s + vatDeductible(e, data.profile), 0)
      )
    );
  return {
    current: round2(vatOf(false).reduce((s, v) => s + v, 0)),
    fixed: vatOf(true),
  };
}

function vatOf(
  manual: ManualForm,
  extras: Extras,
  o: ObjectiveForm,
  view: { year: number; quarter: Quarter; act: ModuleActivity; input: ObjectiveInput }
): ModulesVat | 'none' | null {
  const v = vatExtrasOf(extras.vat);
  if (v.regime !== 'simplified') return null;
  const { year, quarter, act, input } = view;
  const activity = vatActivityFor(input.activityId, year, o.vatActivity || undefined);
  if (!activity) return 'none';
  const unitsStart = vatUnitsOf(activity, act, input.unitsStart, o.vatStart.map(optional));
  const unitsYear = vatUnitsOf(activity, act, yearUnits(input), o.vatYear.map(optional));
  const paid = supportedOf(manual);
  const supported = optional(o.vatSupported) ?? paid.current;
  const shares = [1, 2, 3, 4].map((q) => quarterShare(input, year, q as Quarter)) as [
    number,
    number,
    number,
    number,
  ];
  const quarters = vatSimplifiedQuarters(
    {
      year,
      quarter,
      activity,
      unitsStart,
      unitsYear,
      reduction: number(o.vatReduction),
      seasonDays: input.seasonDays || input.seasonLastYear,
      shares,
      supported,
      compensationsPaid: number(o.vatCompensations),
      refundsAbroad: number(o.vatRefundsAbroad),
      investmentAdjust: 0,
      toOffset: number(extras.toOffset),
      refund: v.refund,
    },
    paid.fixed.map((fixed) => ({
      intraAcquisitions: 0,
      fixedAssetSales: 0,
      reverseCharge: 0,
      fixedAssets: fixed,
    }))
  );
  const units = quarter === 4 ? unitsYear : unitsStart;
  return {
    activity,
    unitsStart,
    unitsYear,
    supported,
    quarters,
    result: quarters[quarter - 1],
    commissions: activity.modules.some(isCommission),
    file: {
      epigrafe: activity.epigrafe,
      aux: activity.epigrafe === '691.9' || activity.epigrafe === '722' ? auxVat(activity) : '',
      units,
      amounts: activity.modules.map((m, i) => round2(m.amount * units[i])),
      seasonLastYear: input.seasonLastYear,
      quarterDays: quarterDays(input, year, quarter),
    },
  };
}

/** Note 3 of page 2 of the 303: 691.9 shoes «1», others «2»; 722 freight «1», waste «2». */
const auxVat = (a: VatModuleActivity) =>
  /calzado/i.test(a.activity) || /excepto residuos/i.test(a.activity) ? '1' : '2';

/**
 * Last year's net income for box 09: not typed, no reduction (as the 130 of the app does); the
 * reduction is only for 12,000 € or less (art. 110.3.c RIRPF), which the person must say. No
 * activity last year counts as 0 € (priorNetOf).
 */
const lastYearOf = (extras: Extras): number => priorNetOf(extras) ?? Number.POSITIVE_INFINITY;

/** The quarter of an activity in módulos, or null when the form has none (or no known activity). */
export function modulesView(
  manual: ManualForm,
  extras: Extras,
  year: number,
  quarter: Quarter
): ModulesView | null {
  const activity = toActivityInputs(manual.activity);
  const input = activity.objective;
  if (activity.method !== 'objective' || activity.agrarian || !input) return null;
  const act = moduleActivityOf(input, year);
  const data = toManualData(manual);
  const atStart = activity.assets.filter((a) => a.start < `${year}-01-01`);
  const instalments = act
    ? instalments131(input, {
        year,
        quarter,
        withheld: manual.quarters.map((q) => number(q.withheld)),
        income: data.quarters.map(incomeOf),
        lastYearNet: lastYearOf(extras),
        depreciationAtStart: depreciationYear(atStart, year, 'modules').total,
        territory: extras.territory,
      })
    : null;
  if (!act || !instalments) return null;
  const result131 = instalments.quarters[quarter - 1].result;
  const net = instalments.net;
  return {
    year,
    quarter,
    activity: act,
    input,
    provisional: !moduleTableOf(year).known,
    instalments,
    result131,
    file131: {
      epigrafe: act.epigrafe,
      aux: AUX[act.id] ?? '',
      net: net.net,
      rate: instalments.rate,
      units: input.unitsStart,
      amounts: act.modules.map((m, i) => round2(m.amount * (input.unitsStart[i] ?? 0))),
      employment: net.employment,
      investment: net.investment,
      indices: indicesOf(input, act, net),
      seasonLastYear: input.seasonLastYear,
      // The mark of the reduced rate (art. 110.2 RIRPF), also in the quarters of La Palma.
      ceutaMelilla: input.ceutaMelilla || reducedInstalment(extras.territory, year, quarter),
      quarterDays: quarterDays(input, year, quarter),
      lastYearNet: priorNetOf(extras),
    },
    vat: vatOf(manual, extras, activityOf(manual.activity).objective, {
      year,
      quarter,
      act,
      input,
    }),
  };
}

/** The small-business options a person can pick for an activity (none for a.2 to a.5). */
export const smallOptionsOf = (activityId: string) => {
  const kind = specialKindOf(activityId);
  return kind && kind !== 'kiosk' ? [] : SMALL_INDICES;
};
