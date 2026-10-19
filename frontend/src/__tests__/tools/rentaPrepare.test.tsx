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

const press = (year = 2025) =>
  fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.prepare.button', { year }) }));
const take = (year = 2025) =>
  fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.prepare.take', { year }) }));

describe('«Preparar mi declaración de la renta»', () => {
  it('takes the year of the self-employed screen to the planner and opens it', () => {
    saveProgress({
      year: 2025,
      form: { ...emptyForm('18000'), age: '50' },
      draft: NO_DRAFT,
      review: NO_REVIEW,
    });
    const onOpen = jest.fn();
    renderWithProviders(<PrepareRenta annual={annual} onOpen={onOpen} years={[2025]} />);
    press();
    // First what it brings, to confirm: income 24,000, expenses 4,000 + 5 % (1,000), net 19,000.
    expect(screen.getByText(tr('tools.renta.prepare.summary', { year: 2025 }))).toBeVisible();
    const figure = (key: string) =>
      screen.getByText(tr(`tools.renta.bring.fig.${key}`)).closest('li') as HTMLElement;
    expect(figure('income')).toHaveTextContent('24.000,00');
    expect(figure('expenses')).toHaveTextContent('5000,00');
    expect(figure('withholdings')).toHaveTextContent('1200,00');
    expect(figure('payments')).toHaveTextContent('500,00');
    expect(figure('net')).toHaveTextContent('19.000,00');
    expect(screen.queryByText(tr('tools.renta.prepare.estimated'))).toBeNull();
    // Not now: nothing is taken.
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.prepare.cancel') }));
    expect(loadProgress()?.form.activities).toBeUndefined();
    expect(onOpen).not.toHaveBeenCalled();
    press();
    take();
    const saved = loadProgress();
    expect(saved?.form.age).toBe('50');
    expect(saved?.form.activities).toHaveLength(1);
    expect(saved?.form.activities?.[0]).toMatchObject({
      kind: 'direct',
      withheld: 1200,
      payments: 500,
    });
    expect(onOpen).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(
      tr('tools.renta.prepare.done', { year: 2025 })
    );
  });

  it('says when there is nothing of that year, and offers the year of the invoices', () => {
    const onYear = jest.fn();
    const { unmount } = renderWithProviders(
      <PrepareRenta annual={annual} years={[2026, 2024]} onYear={onYear} />
    );
    press();
    expect(screen.getByRole('status')).toHaveTextContent(
      tr('tools.renta.prepare.otherYear', { year: 2025, years: '2026, 2024' })
    );
    expect(loadProgress()).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.prepare.switch', { year: 2026 }) })
    );
    expect(onYear).toHaveBeenCalledWith(2026);
    expect(screen.queryByRole('status')).toBeNull();
    unmount();
    // Without a way to change the year it only says it; with nothing typed, that there is nothing.
    const again = renderWithProviders(<PrepareRenta annual={annual} years={[2026]} />);
    press();
    expect(screen.queryByRole('button', { name: /2026/ })).toBeNull();
    again.unmount();
    renderWithProviders(<PrepareRenta annual={annual} hasData={false} />);
    press();
    expect(screen.getByRole('status')).toHaveTextContent(
      tr('tools.renta.prepare.empty', { year: 2025 })
    );
  });

  it('says when a payment of the 130 is an estimate', () => {
    const estimated = annualActivity(2025, {
      ...inputs,
      activity: { ...NO_ACTIVITY },
    });
    renderWithProviders(<PrepareRenta annual={estimated} />);
    press();
    expect(screen.getByText(tr('tools.renta.prepare.estimated'))).toBeVisible();
  });

  it('starts a new planner for another year, and says when módulos are not worked out', () => {
    saveProgress({
      year: 2024,
      form: { ...emptyForm('18000'), age: '50' },
      draft: NO_DRAFT,
      review: NO_REVIEW,
    });
    const { unmount } = renderWithProviders(<PrepareRenta annual={annual} />);
    press();
    // The Renta 2024 half done is replaced: it says so before.
    expect(
      screen.getByText(tr('tools.renta.prepare.replaces', { year: 2025, saved: 2024 }))
    ).toBeVisible();
    take();
    expect(loadProgress()).toMatchObject({ year: 2025, form: { age: '40' } });
    unmount();
    renderWithProviders(<PrepareRenta annual={{ ...annual, regime: 'objective', net: null }} />);
    press();
    expect(screen.getByRole('status')).toHaveTextContent(tr('tools.renta.prepare.modules'));
  });

  it('shows the activity in the planner, with the result, and takes it out', async () => {
    renderWithProviders(<PrepareRenta annual={annual} />);
    press();
    take();
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
