import { parseDecimal } from '@shared/utils/numbers';
import { annualActivity, type AnnualActivity } from '@modules/finances/domain/annualActivity';
import { investmentGoodsOf } from '@modules/finances/domain/depreciation';
import type { AutonomoInputs, QuarterExtras } from '@modules/finances/domain/types';
import { toManualData, type Extras, type ManualForm } from './AutonomoManual';
import { activityExtras, isEmptyActivity, modalityOf, toActivityInputs } from './activityForm';
import { toVatOptions } from './vatForm';

type Quarter = 1 | 2 | 3 | 4;

const number = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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
  return {
    quarters: manual.quarters.map(
      (q, i): QuarterExtras => ({
        withheld: number(q.withheld),
        socialSecurity: 0,
        vatNotDeductible: 0,
        ...added[i],
      })
    ) as AutonomoInputs['quarters'],
    ...(typed
      ? {
          modality: activity.method === 'normal' ? 'normal' : 'simplified',
          agrarian: activity.agrarian,
          activity,
        }
      : {}),
    // The 5 % of hard-to-justify expenses is only for the simplified modality (art. 30.2.4.ª RIRPF).
    hardToJustify: extras.hardToJustify && activity.method === 'simplified',
    priorYearNet: extras.priorNet.trim() === '' ? null : parseDecimal(extras.priorNet),
    exempt130: extras.exempt,
    // The VAT left to offset is the one at the start of the year: the quarters carry it on.
    vatToOffset: 0,
    vat: investments.length > 0 ? { ...vat, investments } : vat,
    manual: toManualData(manual),
    prior: priorOf(manual, quarter),
  };
}

/**
 * The year of the activity for the Renta, from the self-employed form (the entry point of the Renta:
 * docs/fiscalidad/contrato-actividad-anual.md).
 */
export const annualOf = (manual: ManualForm, extras: Extras, year: number): AnnualActivity =>
  annualActivity(year, buildInputs(manual, extras, year, 4));
