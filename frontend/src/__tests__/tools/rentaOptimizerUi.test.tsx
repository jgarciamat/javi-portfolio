import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import type { Deduction, RentaCcaa } from '@modules/tools/domain/rentaData';
import type { DeductionSaving } from '@modules/tools/domain/rentaSavings';
import { loadCcaa } from '@modules/tools/data/renta';
import { Optimizer } from '@modules/tools/ui/renta/Optimizer';
import { renderWithProviders, tr } from '@test-utils/render';

const k = 'tools.renta.opt';
let last: RentaForm;
let ccaa: RentaCcaa;
beforeAll(async () => {
  ccaa = await loadCcaa('castilla-y-leon');
});

function Harness({
  start,
  region = ccaa,
  candidates = [],
  savings = {},
}: {
  start: Partial<RentaForm>;
  region?: RentaCcaa | null;
  candidates?: Deduction[];
  savings?: Record<string, DeductionSaving>;
}) {
  const [form, setForm] = useState<RentaForm>({ ...emptyForm('30000'), ...start });
  last = form;
  return (
    <Optimizer
      form={form}
      set={(patch) => setForm((f) => ({ ...f, ...patch }))}
      ccaa={region}
      found={candidates}
      savings={savings}
    />
  );
}

const worker: Partial<RentaForm> = {
  ccaaId: 'castilla-y-leon',
  age: '40',
  socialSecurity: '1900',
  withheld: '4000',
  joint: 'couple',
  partner: { ...emptyForm('').partner, gross: '0', socialSecurity: '0' },
};

describe('Renta: the reviewer on screen', () => {
  it('shows nothing without a community', () => {
    const { container } = renderWithProviders(<Harness start={{}} region={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the possibilities by saving, asks the amounts and applies or dismisses the rest', () => {
    const deduction = ccaa.deductions[0];
    renderWithProviders(
      <Harness
        start={worker}
        candidates={[deduction]}
        savings={{ [deduction.id]: { saving: 5, blocked: false, example: null } }}
      />
    );
    expect(screen.getByText(tr(`${k}.pensionPlan.title`))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.joint.how`))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.deductions.how`))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr(`${k}.pensionPlan.amount`)), {
      target: { value: '800' },
    });
    expect(last.pension).toBe('800');
    fireEvent.change(screen.getByLabelText(tr(`${k}.spousePlan.amount`)), {
      target: { value: '500' },
    });
    expect(last.spousePlan).toBe('500');
    fireEvent.change(screen.getByLabelText(tr(`${k}.unionFees.amount`)), {
      target: { value: '90' },
    });
    expect(last.workExpenses['cuotas-sindicales']).toBe('90');
    const row = (key: string) =>
      screen.getByText(tr(`${k}.${key}.title`)).closest('li') as HTMLElement;
    fireEvent.click(within(row('mobility')).getByRole('button', { name: tr(`${k}.yes`) }));
    expect(last.mobility).toBe(true);
    fireEvent.click(within(row('ascendant')).getByRole('button', { name: tr(`${k}.no`) }));
    expect(screen.queryByText(tr(`${k}.ascendant.title`))).toBeNull();
    expect(last.ascendants).toEqual([]);
  });

  it('says where to type the value of a rented flat and what is missing', () => {
    renderWithProviders(
      <Harness start={{ ...worker, joint: '', age: '', rentalOn: true, rentalIncome: '9000' }} />
    );
    expect(screen.getByText(tr(`${k}.missing.jointKind`))).toBeInTheDocument();
    // Typed in the property itself (its cost or the cadastral value of the building).
    expect(screen.getByText(tr(`${k}.rentalDepreciation.how`))).toBeInTheDocument();
  });

  it('says when there is nothing more to look at', () => {
    renderWithProviders(
      <Harness
        start={{
          ...worker,
          joint: 'none',
          pension: '1500',
          mobility: true,
          disability: 65,
          retired: true,
          nonSalary: '30000',
          ascendants: [{ over75: true, disability: 0 }],
        }}
      />
    );
    expect(screen.getByText(tr(`${k}.none`))).toBeInTheDocument();
  });
});
