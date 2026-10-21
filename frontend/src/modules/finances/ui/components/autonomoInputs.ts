import { parseDecimal } from '@shared/utils/numbers';
import { annualActivity, type AnnualActivity } from '@modules/finances/domain/annualActivity';
import { investmentGoodsOf } from '@modules/finances/domain/depreciation';
import { typedAmount } from '@modules/finances/domain/closedQuarter';
import type { ActivityInputs, AutonomoInputs, QuarterExtras } from '@modules/finances/domain/types';
import { toManualData, type Extras, type ManualForm } from './AutonomoManual';
import { activityExtras, isEmptyActivity, modalityOf, toActivityInputs } from './activityForm';
import { toVatOptions } from './vatForm';

type Quarter = 1 | 2 | 3 | 4;

const number = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Last year's net income for box 13 of the 130 (and box 09 of the 131): 0 when there was no
 * activity (instructions of the 130, box 13, checked 2026-10-22:
 * https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html),
 * null when it was not typed (unknown: no reduction).
 */
export const priorNetOf = (extras: Extras): number | null => {
  if (extras.noPriorActivity) return 0;
  return extras.priorNet.trim() === '' ? null : parseDecimal(extras.priorNet);
};

/** The totals of the 130 already filed for the quarters before the viewed one. */
const priorOf = (manual: ManualForm, quarter: Quarter): AutonomoInputs['prior'] =>
  manual.prior.on && quarter > 1
    ? {
        income: number(manual.prior.income),
        expenses: number(manual.prior.expenses),
        previousPayments: number(manual.prior.payments),
        withheld: number(manual.prior.withheld),
      }
    : null;

/**
 * The modelo 130 of each quarter as filed: box 07 typed, box 19 what was paid with it (the activity
 * keeps it for the Renta). Null when nothing was typed, so the draft is sent as before.
 */
function filedOf(manual: ManualForm, activity: ActivityInputs): AutonomoInputs['filed130'] {
  const list = [0, 1, 2, 3].map((i) => {
    const box07 = typedAmount(manual.filed130?.[i]);
    return box07 === null ? null : { box07, box19: activity.paid130[i] };
  });
  return list.some((f) => f !== null) ? list : null;
}

/**
 * What the server takes to prepare the draft of a quarter, and what the annual summary reads: the
 * quarters, the options and the activity (its depreciation and grants worked out here, by quarter).
 */
export function buildInputs(
  manual: ManualForm,
  extras: Extras,
  year: number,
  quarter: Quarter
): AutonomoInputs {
  const activity = toActivityInputs(manual.activity);
  // Without an activity typed, the draft is sent as before.
  const typed = !isEmptyActivity(manual.activity);
  const added = typed ? activityExtras(activity, year) : [{}, {}, {}, {}];
  const vat = toVatOptions(extras.vat, number(extras.toOffset), manual.filed303 ?? []);
  // The assets of earlier years with VAT are investment goods of the 303 too (arts. 107-109 LIVA).
  const goods = investmentGoodsOf(activity.assets, year, modalityOf(activity.method));
  const investments = [...(vat.investments ?? []), ...goods];
  const filed130 = filedOf(manual, activity);
  return {
    quarters: manual.quarters.map((q, i): QuarterExtras => ({
      withheld: number(q.withheld),
      socialSecurity: 0,
      vatNotDeductible: 0,
      ...added[i],
    })) as AutonomoInputs['quarters'],
    ...(typed
      ? {
          modality: activity.method === 'normal' ? 'normal' : 'simplified',
          agrarian: activity.agrarian,
          activity,
        }
      : {}),
    // The 5 % of hard-to-justify expenses is only for the simplified modality (art. 30.2.4.ª RIRPF).
    hardToJustify: extras.hardToJustify && activity.method === 'simplified',
    priorYearNet: priorNetOf(extras),
    exempt130: extras.exempt,
    // The VAT left to offset is the one at the start of the year: the quarters carry it on.
    vatToOffset: 0,
    vat: investments.length > 0 ? { ...vat, investments } : vat,
    manual: toManualData(manual),
    prior: priorOf(manual, quarter),
    ...(filed130 ? { filed130 } : {}),
  };
}

/**
 * The year of the activity for the Renta, from the self-employed form (the entry point of the Renta:
 * docs/fiscalidad/contrato-actividad-anual.md).
 */
export const annualOf = (manual: ManualForm, extras: Extras, year: number): AnnualActivity =>
  annualActivity(year, buildInputs(manual, extras, year, 4));
