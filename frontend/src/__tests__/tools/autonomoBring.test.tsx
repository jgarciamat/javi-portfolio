import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { annualActivity, NO_ACTIVITY } from '@modules/finances/domain/annualActivity';
import type { AutonomoInputs } from '@modules/finances/domain/types';
import type { ActivitiesResult } from '@modules/tools/domain/rentaActivity';
import { emptyForm } from '@modules/tools/domain/rentaForm';
import { withoutAutonomoActivity } from '@modules/tools/domain/rentaFromAutonomo';
import { ActivitiesList } from '@modules/tools/ui/renta/ActivitiesList';
import { ActivityBoxes } from '@modules/tools/ui/renta/ActivityBoxes';
import { AnnualFigures, BringActivity, bringOutcome } from '@modules/tools/ui/renta/AutonomoBring';
import { emptyManual } from '@modules/finances/ui/components/AutonomoManual';
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
    expect(screen.getByText(tr('tools.renta.bring.fig.payments131'))).toBeInTheDocument();
    expect(screen.getByText(tr('tools.renta.bring.fig.source', { year: 2025 }))).toBeVisible();
    expect(screen.queryByText(tr('tools.renta.bring.fig.noReta'))).toBeNull();
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

describe('taking an activity out of the Renta', () => {
  const given = (name: string) =>
    ({
      kind: 'given',
      name,
      data: { area: 'direct', net: 100 },
      withheld: 0,
      payments: 0,
    }) as const;
  const result: ActivitiesResult = {
    direct: 200,
    dependentReduction: 0,
    smallIncomeReduction: 0,
    startReduction: 0,
    directTotal: 200,
    modules: 0,
    agrarian: 0,
    total: 200,
    withheld: 0,
    payments: 0,
    each: [
      { name: 'Diseño', net: 100, detail: { net: 100 } },
      { name: 'Autónomos', net: 100, detail: { net: 100 } },
    ],
  };

  it('takes out another activity at once, and the one of Autónomos after asking (Escape: no)', () => {
    const set = jest.fn();
    const form = { ...emptyForm(''), activities: [given('Diseño'), given('Autónomos')] };
    renderWithProviders(<ActivitiesList form={form} set={set} result={result} />);
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.activities.remove', { name: 'Diseño' }) })
    );
    expect(set).toHaveBeenCalledWith({ activities: [given('Autónomos')] });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.removeActivity.button') }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(set).toHaveBeenCalledTimes(1);
  });
});

describe('taking the activity out from the panel that shows its figures', () => {
  const remove = tr('tools.renta.removeActivity.button');
  const bring = tr('tools.renta.bring.button', { year: 2025 });

  it('offers it only once brought; asks first; then leaves the form clean and says so', () => {
    const manual = {
      ...emptyManual(),
      quarters: emptyManual().quarters.map(() => ({
        income: { r21: '5000', r10: '', r4: '', r0: '' },
        withheld: '750',
        expenses: [],
      })),
      invoices: [{ id: 'a', book: 'issued', kind: 'other', excluded: false, date: '2025-02-01' }],
    };
    localStorage.setItem('mm_autonomo_manual2', JSON.stringify(manual));
    let latest = emptyForm('');
    const Host = () => {
      const [form, setForm] = useState(emptyForm(''));
      latest = form;
      return <BringActivity year={2025} form={form} set={(p) => setForm({ ...form, ...p })} />;
    };
    renderWithProviders(<Host />);
    expect(screen.queryByRole('button', { name: remove })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: bring }));
    expect(latest.activities).toHaveLength(1);
    // Cancel: still there.
    fireEvent.click(screen.getByRole('button', { name: remove }));
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.removeActivity.cancel') }));
    expect(latest.activities).toHaveLength(1);
    // Confirm: gone, the panel too, with the notice; the button to bring it again stays.
    fireEvent.click(screen.getByRole('button', { name: remove }));
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.removeActivity.confirm') }));
    expect(latest.activities).toEqual([]);
    expect(screen.queryByText(tr('tools.renta.bring.done', { year: 2025 }))).toBeNull();
    expect(screen.queryByRole('button', { name: remove })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(tr('tools.renta.removeActivity.removed'));
    fireEvent.click(screen.getByRole('button', { name: bring }));
    expect(latest.activities).toHaveLength(1);
    expect(screen.queryByText(tr('tools.renta.removeActivity.removed'))).toBeNull();
  });
});

describe('the form without the activity of Autónomos', () => {
  it('works on a form that never had activities', () => {
    expect(withoutAutonomoActivity(emptyForm('')).activities).toEqual([]);
  });
});
