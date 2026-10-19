import { fireEvent, screen } from '@testing-library/react';
import { annualActivity, NO_ACTIVITY } from '@modules/finances/domain/annualActivity';
import type { AutonomoInputs } from '@modules/finances/domain/types';
import type { ActivitiesResult } from '@modules/tools/domain/rentaActivity';
import { emptyForm } from '@modules/tools/domain/rentaForm';
import { ActivityBoxes } from '@modules/tools/ui/renta/ActivityBoxes';
import { AnnualFigures, BringActivity, bringOutcome } from '@modules/tools/ui/renta/AutonomoBring';
import { renderWithProviders, tr } from '@test-utils/render';

/** An invented year in non-farming módulos: the contract gives no net income for it. */
const modules = annualActivity(2025, {
  quarters: [0, 0, 0, 0].map(() => ({
    withheld: 0,
    socialSecurity: 0,
    vatNotDeductible: 0,
  })) as AutonomoInputs['quarters'],
  hardToJustify: false,
  priorYearNet: null,
  exempt130: false,
  vatToOffset: 0,
  activity: { ...NO_ACTIVITY, method: 'objective' },
});

beforeEach(() => localStorage.clear());

describe('bringing the self-employed year to the Renta', () => {
  it('says what it finds on the device', () => {
    expect(bringOutcome({ annual: null, matches: true, years: [] })).toEqual({ kind: 'none' });
    expect(bringOutcome({ annual: modules, matches: false, years: [2026] })).toEqual({
      kind: 'otherYear',
      years: [2026],
    });
    expect(bringOutcome({ annual: modules, matches: true, years: [] })).toEqual({
      kind: 'modules',
    });
  });

  it('in módulos shows only what it knows, and says the activity cannot be brought yet', () => {
    renderWithProviders(<AnnualFigures annual={modules} />);
    expect(screen.queryByText(tr('tools.renta.bring.fig.income'))).toBeNull();
    expect(screen.getByText(tr('tools.renta.bring.fig.payments'))).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.bring.fig.net'))).toBeNull();
  });

  it('says so when the device has módulos, without a way to the screen when there is none', () => {
    localStorage.setItem(
      'mm_autonomo_manual2',
      JSON.stringify({ activity: { method: 'objective' }, invoices: [] })
    );
    const set = jest.fn();
    renderWithProviders(<BringActivity year={2025} form={emptyForm('')} set={set} />);
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.bring.button', { year: 2025 }) })
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      tr('tools.renta.bring.modules', { year: 2025 })
    );
    expect(set).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: tr('wizard.renta.openAutonomo') })).toBeNull();
  });

  it('says when another year is there, without a way to change it when there is none', () => {
    localStorage.setItem(
      'mm_autonomo_manual2',
      JSON.stringify({ invoices: [{ id: 'x', book: 'issued', date: '2026-02-01' }] })
    );
    renderWithProviders(<BringActivity year={2025} form={emptyForm('')} set={jest.fn()} />);
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.bring.button', { year: 2025 }) })
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      tr('tools.renta.bring.otherYear', { year: 2025, years: '2026' })
    );
    expect(screen.queryByRole('button', { name: /2026/ })).toBeNull();
  });
});

describe('the boxes to copy', () => {
  it('says when the amount could not be copied', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    });
    const result: ActivitiesResult = {
      direct: 0,
      dependentReduction: 0,
      smallIncomeReduction: 0,
      startReduction: 0,
      directTotal: 0,
      modules: 0,
      agrarian: 0,
      total: 0,
      withheld: 300,
      payments: 0,
      each: [],
    };
    renderWithProviders(<ActivityBoxes list={[]} result={result} />);
    expect(screen.getByText(tr('tools.renta.activities.totals'))).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.activities.copyBox', { box: '0599' }) })
    );
    expect(await screen.findByText(tr('wizard.renta.copyFailed'))).toBeInTheDocument();
  });
});
