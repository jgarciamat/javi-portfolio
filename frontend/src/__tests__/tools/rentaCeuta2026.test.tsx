/**
 * LIRPF DA 64.ª (Real Decreto-ley 22/2026, art. 2, BOE-A-2026-18429; convalidated by the Congress,
 * BOE-A-2026-19420; checked 22-10-2026): in 2026 an activity carried out in Ceuta with the deduction
 * of art. 68.4 takes 10 % of hard-to-justify expenses in the simplified direct estimation (the
 * 2,000 € cap of RIRPF art. 30 stays) and 10 % off the net income of módulos (DA 1.ª of the Orden
 * HAC/1425/2025, módulos and farming), instead of 5 %. Figures worked out by hand.
 */
import { fireEvent, screen } from '@testing-library/react';
import {
  activitiesOf,
  directNet,
  farmNet,
  modulesNet,
  type ActivitiesResult,
  type ActivityContext,
  type ActivityInput,
  type DirectActivity,
  type FarmActivity,
  type ModulesActivity,
} from '@modules/tools/domain/rentaActivity';
import { emptyForm } from '@modules/tools/domain/rentaForm';
import { farm2025 } from '@modules/tools/data/renta/agrario-2025';
import { rentaRules } from '@modules/tools/data/renta/ejercicios';
import { modules2025 } from '@modules/tools/data/renta/modulos-2025';
import { ActivitiesList } from '@modules/tools/ui/renta/ActivitiesList';
import { RentaRulesProvider } from '@modules/tools/ui/renta/RentaRulesContext';
import { renderWithProviders, tr } from '@test-utils/render';

const RULE = { hardPercent: 10, modulesPercent: 10 };

/** A made-up shop in the simplified method: 20,000 € of sales and 5,000 € of purchases. */
const shop = (sales = 20000): DirectActivity => ({
  method: 'simplified',
  income: { sales, grants: 0, ownUse: 0, other: 0 },
  expenses: {
    purchases: 5000,
    staff: 0,
    staffSocialSecurity: 0,
    ownSocialSecurity: 0,
    rent: 0,
    repairs: 0,
    supplies: 0,
    services: 0,
    insurance: 0,
    taxes: 0,
    financial: 0,
    meals: 0,
    other: 0,
    depreciation: 0,
  },
  assets: [],
  lowValue: [],
  health: { premiums: 0, people: 0, withDisability: 0 },
  home: { supplies: 0, usedPercent: 0 },
  provisions: 0,
});

/** The taxi of the module tests: 3,862.19 € of net income of módulos. */
const taxi: ModulesActivity = {
  activityId: (modules2025.find((m) => m.epigrafe === '721.2') as { id: string }).id,
  units: [0.5, 1, 45],
  staffLastYear: 0.5,
  assets: [{ group: 'transport', cost: 24000 }],
  lowValue: [],
  specialIndex: 0.9,
  smallIndex: 0,
  seasonDays: 0,
  newYear: 0,
  disabled: false,
  extraordinary: 0,
  otherIncome: 0,
};

describe('DA 64.ª: the activities in Ceuta in 2026', () => {
  it('is in the rules of 2026 only', () => {
    expect(rentaRules(2026).state.ceutaActivities).toEqual(RULE);
    expect(rentaRules(2025).state.ceutaActivities).toBeUndefined();
    expect(rentaRules(2024).state.ceutaActivities).toBeUndefined();
    expect(rentaRules(2026).sources.some((s) => s.url.endsWith('BOE-A-2026-18429'))).toBe(true);
  });

  it('simplified direct: 20,000 − 5,000 = 15,000; 5 % = 750, 10 % = 1,500', () => {
    expect(directNet(shop()).provisions).toBe(750);
    expect(directNet(shop(), false, 10)).toMatchObject({ provisions: 1500, net: 13500 });
  });

  it('keeps the cap of 2,000 €: 50,000 − 5,000 = 45,000 gives 2,000 € at 5 % and at 10 %', () => {
    expect(directNet(shop(50000)).provisions).toBe(2000);
    expect(directNet(shop(50000), false, 10).provisions).toBe(2000);
  });

  it('módulos: 3,862.19 × 10 % = 386.22 (193.11 at 5 %), net 3,475.97', () => {
    expect(modulesNet(taxi, modules2025).general).toBe(193.11);
    expect(modulesNet(taxi, modules2025, 10)).toMatchObject({ general: 386.22, net: 3475.97 });
  });

  it('farming: the reduction is on the net income of módulos as well', () => {
    const field: FarmActivity = {
      lines: [
        {
          indexId: 'crops',
          income: 20000,
          transformed: false,
          rentedShare: 0,
          electricShare: 0,
          boughtFeed: false,
          organic: false,
        },
      ],
      assets: [],
      externalMeans: false,
      staffPercent: 0,
      forestPlan: false,
      young: false,
      extraordinary: 0,
    };
    const five = farmNet(field, farm2025);
    const ten = farmNet(field, farm2025, 10);
    expect(ten.modules).toBe(five.modules);
    expect(ten.general).toBe(Math.round(five.modules * 10) / 100);
  });

  it('applies only to an activity ticked as in Ceuta, and only in a year with the rule', () => {
    const ctx: ActivityContext = {
      otherIncome: 0,
      hasWork: false,
      workReduction: 0,
      disability: 0,
      assistance: false,
    };
    const direct = (ceuta?: boolean): ActivityInput => ({
      kind: 'direct',
      name: 'Tienda',
      data: shop(),
      dependent: false,
      newActivity: false,
      withheld: 0,
      payments: 0,
      ...(ceuta !== undefined && { ceuta }),
    });
    const modules: ActivityInput = {
      kind: 'modules',
      name: 'Taxi',
      data: taxi,
      withheld: 0,
      payments: 0,
      ceuta: true,
    };
    const of = (a: ActivityInput, c: ActivityContext) =>
      activitiesOf([a], c, modules2025, farm2025);
    expect(of(direct(true), { ...ctx, ceuta: RULE }).direct).toBe(13500);
    expect(of(direct(false), { ...ctx, ceuta: RULE }).direct).toBe(14250);
    expect(of(direct(true), ctx).direct).toBe(14250);
    // The net of the activity, before the reduction of art. 32.2.3.º of small incomes.
    expect(of(modules, { ...ctx, ceuta: RULE }).each[0].net).toBe(3475.97);
  });
});

describe('the question of the activity in Ceuta', () => {
  const k = 'tools.renta.activities.ceuta';
  const given = (name: string, data: unknown, kind = 'direct'): ActivityInput =>
    ({ kind, name, data, dependent: false, newActivity: false, withheld: 0, payments: 0 }) as never;
  const list = [
    given('Simplificada', { method: 'simplified' }),
    given('Normal', { method: 'normal' }),
    given('Taxi', {}, 'modules'),
    { ...given('Dada', { area: 'direct', net: 0 }), kind: 'given' } as ActivityInput,
  ];
  const result: ActivitiesResult = {
    direct: 0,
    dependentReduction: 0,
    smallIncomeReduction: 0,
    startReduction: 0,
    directTotal: 0,
    modules: 0,
    agrarian: 0,
    total: 0,
    withheld: 0,
    payments: 0,
    each: list.map((a) => ({ name: a.name, net: 0, detail: { net: 0 } })),
  };
  const show = (year: number, ccaaId: string) => {
    let form = { ...emptyForm(''), ccaaId, activities: list };
    const set = (patch: Partial<typeof form>) => {
      form = { ...form, ...patch };
    };
    const ui = () => (
      <RentaRulesProvider value={rentaRules(year)}>
        <ActivitiesList form={form} set={set} result={result} />
      </RentaRulesProvider>
    );
    const view = renderWithProviders(ui());
    return { form: () => form, again: () => view.rerender(ui()) };
  };

  it('is asked in 2026 in Ceuta for the simplified and the módulos ones, and sets the tick', () => {
    const { form, again } = show(2026, 'ceuta');
    const ticks = screen.getAllByLabelText(tr(k));
    expect(ticks).toHaveLength(2);
    expect(screen.getAllByText(tr(`${k}Hint`, { year: 2026, hard: 10, modules: 10 }))).toHaveLength(
      2
    );
    fireEvent.click(ticks[1]);
    expect(form().activities?.[2]).toMatchObject({ ceuta: true });
    again();
    fireEvent.click(screen.getAllByLabelText(tr(k))[1]);
    expect(form().activities?.[2]).not.toHaveProperty('ceuta');
  });

  it('is not asked out of Ceuta nor in a year without the rule', () => {
    show(2026, 'melilla');
    expect(screen.queryByLabelText(tr(k))).toBeNull();
  });

  it('is not asked in 2025, even in Ceuta', () => {
    show(2025, 'ceuta');
    expect(screen.queryByLabelText(tr(k))).toBeNull();
  });
});
