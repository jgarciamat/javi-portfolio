import { annualActivity, NO_ACTIVITY } from '@modules/finances/domain/annualActivity';
import type {
  ActivityInputs,
  AutonomoInputs,
  ManualData,
  ManualExpense,
} from '@modules/finances/domain/types';
import { activitiesOf, directNet, type DirectActivity } from '@modules/tools/domain/rentaActivity';
import {
  AUTONOMO_ACTIVITY,
  activityFromAnnual,
  withAutonomoActivity,
} from '@modules/tools/domain/rentaFromAutonomo';
import { emptyForm } from '@modules/tools/domain/rentaForm';
import { farm2025 } from '@modules/tools/data/renta/agrario-2025';
import { modules2025 } from '@modules/tools/data/renta/modulos-2025';

const profile: ManualData['profile'] = {
  workArea: 0,
  homeArea: 0,
  vehicleExclusive: false,
  healthPeople: 0,
  healthDisability: false,
};
const e = (kind: ManualExpense['kind'], amount: number): ManualExpense => ({
  kind,
  amount,
  vatRate: 0,
});
const quarter = (r0 = 0, expenses: ManualExpense[] = []): ManualData['quarters'][number] => ({
  income: { r21: 0, r10: 0, r4: 0, r0 },
  expenses,
});

function inputsOf(
  activity: Partial<ActivityInputs>,
  expenses: ManualExpense[],
  hardToJustify = true
): AutonomoInputs {
  return {
    quarters: [0, 0, 0, 0].map(() => ({
      withheld: 500,
      socialSecurity: 0,
      vatNotDeductible: 0,
    })) as AutonomoInputs['quarters'],
    hardToJustify,
    priorYearNet: null,
    exempt130: false,
    vatToOffset: 0,
    manual: { profile, quarters: [quarter(134800, expenses), quarter(), quarter(), quarter()] },
    activity: { ...NO_ACTIVITY, ...activity },
  };
}

/** The radiologist of the Manual práctico de Renta 2025, cap. 7 (net yield 58,100 €). */
const radiologist = (activity: Partial<ActivityInputs> = {}) =>
  annualActivity(
    2025,
    inputsOf(
      {
        selfConsumption: 600,
        stockChange: 3000,
        assets: [
          {
            name: 'Equipamiento',
            group: 's2',
            cost: 79000,
            start: '2020-01-01',
            use: 100,
            method: 'table',
          },
        ],
        paid130: [1000, 2000, 3000, 4000],
        ...activity,
      },
      [
        e('staff', 23600),
        e('quota', 3300),
        e('material', 19000),
        e('training', 1300),
        e('other', 23200),
      ]
    )
  );

describe('the year of the self-employed screen in the Renta', () => {
  it('gives the engine the same net yield as the annual contract (official case)', () => {
    const annual = radiologist();
    const activity = activityFromAnnual(annual);
    expect(activity).toMatchObject({
      kind: 'direct',
      name: AUTONOMO_ACTIVITY,
      withheld: 2000,
      payments: 10000,
    });
    const r = directNet((activity as { data: DirectActivity }).data);
    expect(r.net).toBe(58100);
    expect(r.net).toBe(annual.net);
    expect(r.provisions).toBe(annual.expenses.hardToJustify);
  });

  it('takes the normal modality with its provisions, and a big refund of the RETA as income', () => {
    const annual = radiologist({ method: 'normal', provisions: 500, retaFix: -5000 });
    const activity = activityFromAnnual(annual) as { data: DirectActivity };
    expect(activity.data.method).toBe('normal');
    expect(directNet(activity.data).net).toBe(annual.net);
    expect(activity.data.expenses.ownSocialSecurity).toBe(0);
    expect(activity.data.income.other).toBeGreaterThan(0);
  });

  it('passes farming by módulos as worked out, and leaves out the other módulos', () => {
    const annual = { ...radiologist(), regime: 'objectiveAgrarian' as const, net: 6000 };
    const farm = activityFromAnnual(annual);
    expect(farm).toMatchObject({ kind: 'given', data: { area: 'agrarian', net: 6000 } });
    const r = activitiesOf(
      [farm as NonNullable<typeof farm>],
      { otherIncome: 0, hasWork: false, workReduction: 0, disability: 0, assistance: false },
      modules2025,
      farm2025
    );
    // Under 12,000 € of income: 1,620 € less (art. 32.2.3.º).
    expect(r).toMatchObject({ smallIncomeReduction: 1620, agrarian: 4380, total: 4380 });
    expect(activityFromAnnual({ ...annual, regime: 'objective', net: null })).toBeNull();
    expect(activityFromAnnual({ ...annual, net: null })).toBeNull();
  });

  it('puts the activity in the planner in place of the one it brought before', () => {
    const activity = activityFromAnnual(radiologist()) as NonNullable<
      ReturnType<typeof activityFromAnnual>
    >;
    const other = { ...activity, name: 'Otra' };
    const first = withAutonomoActivity(null, activity);
    expect(first.activities).toEqual([activity]);
    const again = withAutonomoActivity(
      { ...emptyForm('20000'), activities: [other, activity] },
      { ...activity, withheld: 1 }
    );
    expect(again.gross).toBe('20000');
    expect(again.activities?.map((a) => [a.name, a.withheld])).toEqual([
      ['Otra', 2000],
      [AUTONOMO_ACTIVITY, 1],
    ]);
  });
});
