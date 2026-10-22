import { fireEvent, screen } from '@testing-library/react';
import { rentaRules } from '@modules/tools/data/renta/ejercicios';
import type { RentaResult } from '@modules/tools/domain/rentaCalc';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { RentaRulesProvider } from '@modules/tools/ui/renta/RentaRulesContext';
import { DisabilityPlans, ExcessByYear, ExcessExpiry } from '@modules/tools/ui/renta/PlanExtras';
import { renderWithProviders, tr } from '@test-utils/render';

const in2025 = (ui: React.ReactNode) =>
  renderWithProviders(<RentaRulesProvider value={rentaRules(2025)}>{ui}</RentaRulesProvider>, {
    authenticated: false,
  });
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('the excess of the plans, year by year', () => {
  it('asks the five years before and keeps a total saved without a year', () => {
    const set = jest.fn();
    const form: RentaForm = { ...emptyForm(''), pensionExcess: '900' };
    in2025(<ExcessByYear form={form} set={set} />);
    expect(screen.getByText(tr('tools.renta.plans.excessHint', { first: 2020 }))).toBeVisible();
    expect(screen.queryByLabelText(tr('tools.renta.plans.excessPlans', { year: 2019 }))).toBeNull();
    type(tr('tools.renta.plans.excessPlans', { year: 2020 }), '300');
    expect(set).toHaveBeenLastCalledWith({ pensionExcessYears: { 2020: { plans: '300' } } });
    type(tr('tools.renta.plans.excessDependency', { year: 2024 }), '50');
    expect(set).toHaveBeenLastCalledWith({ pensionExcessYears: { 2024: { dependency: '50' } } });
    type(tr('tools.renta.pensionExcess'), '');
    expect(set).toHaveBeenLastCalledWith({ pensionExcess: '' });
    type(tr('tools.renta.dependencyExcess'), '10');
    expect(set).toHaveBeenLastCalledWith({ dependencyExcess: '10' });
  });

  it('shows no total field when nothing was saved without a year', () => {
    const { rerender } = in2025(<ExcessByYear form={emptyForm('')} set={() => {}} />);
    expect(screen.queryByLabelText(tr('tools.renta.pensionExcess'))).toBeNull();
    // Only the dependency was saved without a year: both total fields come back.
    rerender(
      <RentaRulesProvider value={rentaRules(2025)}>
        <ExcessByYear form={{ ...emptyForm(''), dependencyExcess: '5' }} set={() => {}} />
      </RentaRulesProvider>
    );
    expect(screen.getByLabelText(tr('tools.renta.pensionExcess'))).toHaveValue('');
  });
});

describe('plans and protected patrimony of a person with a disability', () => {
  it('asks the own plan only with a disability, and every amount of a relative', () => {
    const set = jest.fn();
    const { rerender } = in2025(<DisabilityPlans form={emptyForm('')} set={set} />);
    expect(screen.queryByLabelText(tr('tools.renta.plans.ownPlan'))).toBeNull();
    rerender(
      <RentaRulesProvider value={rentaRules(2025)}>
        <DisabilityPlans form={{ ...emptyForm(''), disability: 33 }} set={set} />
      </RentaRulesProvider>
    );
    type(tr('tools.renta.plans.ownPlan'), '2000');
    expect(set).toHaveBeenLastCalledWith({ disabledOwnPlan: '2000' });
    type(tr('tools.renta.plans.relativePlan'), '1000');
    expect(set).toHaveBeenLastCalledWith({ relativePlan: { mine: '1000' } });
    type(tr('tools.renta.plans.relativeTheirs'), '500');
    expect(set).toHaveBeenLastCalledWith({ relativePlan: { theirs: '500' } });
    type(tr('tools.renta.plans.relativeOthers'), '200');
    expect(set).toHaveBeenLastCalledWith({ relativePlan: { others: '200' } });
    type(tr('tools.renta.plans.patrimony'), '3000');
    expect(set).toHaveBeenLastCalledWith({ patrimony: { mine: '3000' } });
    type(tr('tools.renta.plans.patrimonyOthers'), '100');
    expect(set).toHaveBeenLastCalledWith({ patrimony: { others: '100' } });
    // The four years before (2021 to 2024).
    expect(
      screen.queryByLabelText(tr('tools.renta.plans.patrimonyPending', { year: 2020 }))
    ).toBeNull();
    type(tr('tools.renta.plans.patrimonyPending', { year: 2021 }), '40');
    expect(set).toHaveBeenLastCalledWith({ patrimony: { pending: { 2021: '40' } } });
  });
});

describe('what is left of each excess and until when', () => {
  const base = { pensionExcessYears: undefined, disability: undefined } as unknown as RentaResult;

  it('says nothing for a result saved before or without excess', () => {
    const { container } = in2025(<ExcessExpiry result={base} />);
    expect(container.textContent).toBe('');
  });

  it('lists each one with its last year, and what is lost', () => {
    const result = {
      ...base,
      pensionExcessYears: {
        left: [
          { year: null, plans: 100, dependency: 0, lastYear: null },
          { year: 2023, plans: 200, dependency: 50, lastYear: 2028 },
        ],
        lost: { plans: 70, dependency: 0 },
      },
      disability: {
        plans: 0,
        ownPlan: 0,
        relativePlan: 0,
        patrimony: 0,
        total: 0,
        plansNext: 30,
        patrimonyLeft: [{ year: 2025, amount: 476.19, lastYear: 2029 }],
        patrimonyLost: 20,
      },
    } as RentaResult;
    in2025(<ExcessExpiry result={result} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toHaveLength(6);
    expect(items[1]).toMatch(/de 2023, que puedes reducir hasta la declaración de 2028/);
    expect(items[2]).toMatch(/de 2020 se pierden/);
    expect(items[3]).toMatch(/476,19/);
  });
});
