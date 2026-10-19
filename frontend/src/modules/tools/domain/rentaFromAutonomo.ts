import type { AnnualActivity } from '@modules/finances/domain/annualActivity';
import type { ActivityInput } from './rentaActivity';
import { emptyForm, type RentaForm } from './rentaForm';
import { round2 } from './round';

/**
 * The year of the self-employed screen as an activity of the Renta: the annual contract
 * (docs/fiscalidad/contrato-actividad-anual.md, section 9) mapped field by field to the engine
 * (rentaActivity.ts). Each expense comes already in its deductible amount, so the engine does not
 * apply the limits twice. Non-farming módulos go with the engine's own input (boxes 1465-1479).
 */

/** The name of the activity the planner shows for the one that comes from the self-employed screen. */
export const AUTONOMO_ACTIVITY = 'Autónomos';

export function activityFromAnnual(annual: AnnualActivity): ActivityInput | null {
  const common = {
    name: AUTONOMO_ACTIVITY,
    withheld: annual.withholdings,
    payments: annual.payments130.total,
  };
  if (annual.regime === 'objective')
    return annual.objective ? { ...common, kind: 'modules', data: annual.objective.input } : null;
  if (annual.net === null) return null;
  if (annual.regime === 'objectiveAgrarian')
    return { ...common, kind: 'given', data: { area: 'agrarian', net: annual.net } };
  const { income, expenses } = annual;
  const k = expenses.byKind;
  const reta = expenses.reta + expenses.retaFix.paid - expenses.retaFix.refunded;
  return {
    ...common,
    kind: 'direct',
    dependent: false,
    newActivity: false,
    data: {
      method: annual.modality === 'N' ? 'normal' : 'simplified',
      income: {
        sales: income.sales,
        grants: round2(income.currentSubsidies + income.capitalSubsidies),
        ownUse: income.selfConsumption,
        // A refund of the RETA bigger than the fees paid is income (box 0178).
        other: round2(income.compensations + income.stockIncrease + Math.max(0, -reta)),
      },
      expenses: {
        purchases: round2(k.material + expenses.stockDecrease),
        staff: k.staff,
        staffSocialSecurity: 0,
        ownSocialSecurity: round2(Math.max(0, reta)),
        rent: k.rent,
        repairs: 0,
        supplies: k.supplies,
        services: round2(
          k.management + k.vehicle + k.clients + k.training + k.software + k.advertising + k.other
        ),
        insurance: k.health,
        taxes: 0,
        financial: 0,
        meals: k.meals,
        other: 0,
        depreciation: expenses.depreciation.total,
      },
      assets: [],
      lowValue: [],
      health: { premiums: 0, people: 0, withDisability: 0 },
      home: { supplies: 0, usedPercent: 0 },
      provisions: expenses.provisions,
    },
  };
}

/**
 * The form of the planner with the activity of the self-employed screen in place of the one it
 * brought before (the rest of the activities and every other figure stay as they were).
 */
export function withAutonomoActivity(form: RentaForm | null, activity: ActivityInput): RentaForm {
  const base = form ?? emptyForm('');
  const others = (base.activities ?? []).filter((a) => a.name !== AUTONOMO_ACTIVITY);
  return { ...base, activities: [...others, activity] };
}
