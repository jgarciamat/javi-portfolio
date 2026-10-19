import { fireEvent, screen } from '@testing-library/react';
import { annualActivity, NO_ACTIVITY } from '@modules/finances/domain/annualActivity';
import type { AutonomoInputs, ManualData } from '@modules/finances/domain/types';
import { loadProgress, saveProgress } from '@modules/tools/application/rentaProgress';
import { NO_DRAFT } from '@modules/tools/domain/rentaDraft';
import { emptyForm } from '@modules/tools/domain/rentaForm';
import { NO_REVIEW } from '@modules/tools/domain/rentaReview';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { PrepareRenta } from '@modules/tools/ui/renta/PrepareRenta';
import { renderWithProviders, tr } from '@test-utils/render';

const profile: ManualData['profile'] = {
  workArea: 0,
  homeArea: 0,
  vehicleExclusive: false,
  healthPeople: 0,
  healthDisability: false,
};
const q = (r0 = 0): ManualData['quarters'][number] => ({
  income: { r21: 0, r10: 0, r4: 0, r0 },
  expenses: r0 ? [{ kind: 'material', amount: 4000, vatRate: 0 }] : [],
});
const inputs: AutonomoInputs = {
  quarters: [0, 0, 0, 0].map(() => ({
    withheld: 300,
    socialSecurity: 0,
    vatNotDeductible: 0,
  })) as AutonomoInputs['quarters'],
  hardToJustify: true,
  priorYearNet: null,
  exempt130: false,
  vatToOffset: 0,
  manual: { profile, quarters: [q(24000), q(), q(), q()] },
  activity: { ...NO_ACTIVITY, paid130: [500, 0, 0, 0] },
};
const annual = annualActivity(2025, inputs);

beforeEach(() => localStorage.clear());

describe('«Preparar mi declaración de la renta»', () => {
  it('takes the year of the self-employed screen to the planner and opens it', () => {
    saveProgress({
      year: 2025,
      form: { ...emptyForm('18000'), age: '50' },
      draft: NO_DRAFT,
      review: NO_REVIEW,
    });
    const onOpen = jest.fn();
    renderWithProviders(<PrepareRenta annual={annual} onOpen={onOpen} />);
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.prepare.button', { year: 2025 }) })
    );
    const saved = loadProgress();
    expect(saved?.form.age).toBe('50');
    expect(saved?.form.activities).toHaveLength(1);
    expect(saved?.form.activities?.[0]).toMatchObject({
      kind: 'direct',
      withheld: 1200,
      payments: 500,
    });
    expect(onOpen).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(tr('tools.renta.prepare.done'));
  });

  it('starts a new planner for another year, and says when módulos are not worked out', () => {
    saveProgress({
      year: 2024,
      form: { ...emptyForm('18000'), age: '50' },
      draft: NO_DRAFT,
      review: NO_REVIEW,
    });
    const { unmount } = renderWithProviders(<PrepareRenta annual={annual} />);
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.prepare.button', { year: 2025 }) })
    );
    expect(loadProgress()).toMatchObject({ year: 2025, form: { age: '40' } });
    unmount();
    renderWithProviders(<PrepareRenta annual={{ ...annual, regime: 'objective', net: null }} />);
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.prepare.button', { year: 2025 }) })
    );
    expect(screen.getByRole('status')).toHaveTextContent(tr('tools.renta.prepare.modules'));
  });

  it('shows the activity in the planner, with the result, and takes it out', async () => {
    renderWithProviders(<PrepareRenta annual={annual} />);
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.prepare.button', { year: 2025 }) })
    );
    localStorage.setItem('mm_renta_view', 'expert');
    renderWithProviders(<RentaPlanner mode="local" year={2025} />, { authenticated: false });
    expect(
      await screen.findByRole('region', { name: tr('tools.renta.activities.title') })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.calculate') }));
    expect(await screen.findByText(tr('tools.renta.line.activities'))).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: tr('tools.renta.activities.remove', { name: 'Autónomos' }),
      })
    );
    expect(screen.queryByRole('region', { name: tr('tools.renta.activities.title') })).toBeNull();
  });
});
