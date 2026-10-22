import { screen } from '@testing-library/react';
import { saveProgress } from '@modules/tools/application/rentaProgress';
import { rentaRules } from '@modules/tools/data/renta/ejercicios';
import { NO_DRAFT, readDraft } from '@modules/tools/domain/rentaDraft';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { NO_REVIEW } from '@modules/tools/domain/rentaReview';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { ActivitiesList } from '@modules/tools/ui/renta/ActivitiesList';
import { PropertySummary } from '@modules/tools/ui/renta/PropertyCard';
import {
  HeldNote,
  RentaHeldProvider,
  RentaRulesProvider,
} from '@modules/tools/ui/renta/RentaRulesContext';
import { RentaAssistant, wizardKey } from '@modules/tools/ui/renta/RentaWizard';
import { emptyProperty } from '@modules/tools/domain/rentaRentals';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

jest.setTimeout(60000);
beforeEach(() => localStorage.clear());

const premium = () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(
    f.billing({
      plan: 'premium',
      renta: { draft: { allowed: true, reason: 'premium' }, eligibleOn: null, passUntil: null },
    })
  );
  return api;
};
/** A Renta of 2026 in Galicia, whose figures of 2026 are not published yet (made-up data). */
const saved = (form: Partial<RentaForm>, draft = NO_DRAFT) =>
  saveProgress({
    year: 2026,
    form: { ...emptyForm(''), ccaaId: 'galicia', answers: { ccaa: 'galicia' }, ...form },
    draft,
    review: NO_REVIEW,
  });
const held = tr('tools.renta.year.held', { name: 'Galicia', year: 2026 });

describe('a year without the figures of the community: no partial figure', () => {
  it('the deductions say what is missing instead of what they save', async () => {
    localStorage.setItem('mm_renta_view', 'expert');
    saved({
      gross: '30000',
      choices: { 'estado-maternidad': { on: true, amount: '', units: '1' } },
      donations: { general: '200', recurrent: '', priority: '', priorityRecurrent: '', other: '' },
    });
    renderWithProviders(<RentaPlanner mode="account" year={2026} />, {
      api: premium(),
      plan: true,
    });
    expect((await screen.findAllByText(held)).length).toBeGreaterThan(1);
    expect(screen.queryByText(tr('tools.renta.saving.total'))).toBeNull();
    expect(screen.queryByText(tr('tools.renta.saving.hint'))).toBeNull();
    expect(screen.queryByText(tr('tools.renta.pickCcaa'))).toBeNull();
  });

  it('the draft is not compared with figures that would be partial', async () => {
    localStorage.setItem('mm_renta_view', 'expert');
    const reading = readDraft('Retribuciones dinerarias 1.000,00 0003', {
      year: 2026,
      communities: [],
    });
    saved({ gross: '30000' }, { ...NO_DRAFT, reading });
    renderWithProviders(<RentaPlanner mode="account" year={2026} />, {
      api: premium(),
      plan: true,
    });
    expect(await screen.findByText(tr('tools.renta.draft.found'))).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.compare.oursCol'))).toBeNull();
    expect(screen.getAllByText(held).length).toBeGreaterThan(1);
  });

  it('the boxes step of the assistant gives the notice of the year, not «work it out first»', () => {
    saved({ gross: '30000' });
    localStorage.setItem(
      wizardKey(2026),
      JSON.stringify({
        at: 8,
        screen: 1,
        done: ['you', 'family', 'work', 'home', 'invest', 'activity', 'deductions', 'review'],
        answers: {},
        streak: 1,
        lastDay: '2026-01-01',
      })
    );
    renderWithProviders(<RentaAssistant mode="local" year={2026} />, { authenticated: false });
    expect(screen.getAllByText(held).length).toBeGreaterThan(0);
    expect(screen.queryByText(tr('wizard.renta.boxesFirst'))).toBeNull();
  });
});

describe('the notice in the place of a figure', () => {
  const rules = rentaRules(2026);
  const inYear = (
    blockers: Parameters<typeof RentaHeldProvider>[0]['value']['blockers'],
    ui: React.ReactNode
  ) =>
    renderWithProviders(
      <RentaRulesProvider value={rules}>
        <RentaHeldProvider value={{ blockers, ccaaName: 'Galicia' }}>{ui}</RentaHeldProvider>
      </RentaRulesProvider>,
      { authenticated: false }
    );

  it('names the community when its figures are missing, and the year for the rest', () => {
    inYear(['rentals'], <HeldNote />);
    expect(screen.getByText(tr('tools.renta.year.heldOther', { year: 2026 }))).toBeInTheDocument();
  });

  it('only for the parts asked: nothing when the year has them', () => {
    const { container } = inYear(['regions'], <HeldNote parts={['modules']} />);
    expect(container.textContent).toBe('');
  });

  it('keeps back the figures of an activity by módulos and of a rented home', () => {
    const activity = { name: 'Taller', kind: 'direct' } as unknown as NonNullable<
      RentaForm['activities']
    >[number];
    const result = {
      each: [{ net: 1234 }],
      total: 1234,
      withheld: 0,
      payments: 0,
    } as unknown as Parameters<typeof ActivitiesList>[0]['result'];
    inYear(
      ['modules', 'rentals', 'imputation'],
      <>
        <ActivitiesList
          form={{ ...emptyForm(''), activities: [activity] }}
          set={() => {}}
          result={result}
        />
        <PropertySummary
          p={{ ...emptyProperty(1), income: '6000', rentedDays: '200', cadastral: '50000' }}
          property={rules.property}
          year={2026}
        />
      </>
    );
    expect(screen.getByText('Taller')).toBeInTheDocument();
    // The activity, the reduced rent and the imputed rent: three notices, no figure.
    expect(screen.getAllByText(tr('tools.renta.year.heldOther', { year: 2026 }))).toHaveLength(3);
    expect(screen.queryByText(/1234/)).toBeNull();
  });
});
