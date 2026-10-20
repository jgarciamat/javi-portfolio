import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import type { Deduction, RentaCcaa } from '@modules/tools/domain/rentaData';
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
}: {
  start: Partial<RentaForm>;
  region?: RentaCcaa | null;
  candidates?: Deduction[];
}) {
  const [form, setForm] = useState<RentaForm>({ ...emptyForm('30000'), ...start });
  last = form;
  return (
    <>
      <button type="button" onClick={() => setForm((f) => ({ ...f, disability: 0 }))}>
        undo
      </button>
      <Optimizer
        form={form}
        set={(patch) => setForm((f) => ({ ...f, ...patch }))}
        ccaa={region}
        found={candidates}
      />
    </>
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
    renderWithProviders(<Harness start={{}} region={null} />);
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByText(tr(`${k}.title`))).toBeNull();
  });

  const row = (key: string) =>
    screen.getByText(tr(`${k}.${key}.title`)).closest('li') as HTMLElement;
  const reply = (key: string, a: 'yes' | 'no' | 'unknown') =>
    fireEvent.click(
      screen.getByRole('button', {
        name: `${tr(`${k}.answer.${a}`)}: ${tr(`${k}.${key}.title`)}`,
      })
    );
  const euros = /\d+,\d{2}\s€|€\s?\d/;

  it('asks first and shows a saving only for what the person confirms', () => {
    const deduction = ccaa.deductions[0];
    renderWithProviders(<Harness start={worker} candidates={[deduction]} />);
    // Questions, without a figure: the joint return comes from the data given, so it is confirmed.
    const questions = screen.getByRole('list', { name: tr(`${k}.toAsk`) });
    expect(within(questions).queryByText(euros)).toBeNull();
    expect(within(questions).queryByText(tr(`${k}.saves`), { exact: false })).toBeNull();
    expect(within(row('joint')).getByText(tr(`${k}.joint.how`))).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      tr(`${k}.total`, { count: 1, amount: '' }).split('(')[0].trim()
    );
    expect(screen.getByText(tr(`${k}.deductions.left`, { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.deductions.how`))).toBeInTheDocument();

    // A plan: yes asks the amount; the example amount until one is typed.
    reply('pensionPlan', 'yes');
    expect(within(row('pensionPlan')).getByText(/de ejemplo/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr(`${k}.pensionPlan.amount`)), {
      target: { value: '800' },
    });
    expect(last.pension).toBe('800');
    reply('spousePlan', 'yes');
    fireEvent.change(screen.getByLabelText(tr(`${k}.spousePlan.amount`)), {
      target: { value: '500' },
    });
    expect(last.spousePlan).toBe('500');
    reply('unionFees', 'yes');
    fireEvent.change(screen.getByLabelText(tr(`${k}.unionFees.amount`)), {
      target: { value: '90' },
    });
    expect(last.workExpenses['cuotas-sindicales']).toBe('90');
    expect(within(row('pensionPlan')).queryByText(/de ejemplo/)).toBeNull();
    expect(within(row('pensionPlan')).getByText(euros)).toBeInTheDocument();

    // A yes/no: applied to the form, with what it saves.
    reply('mobility', 'yes');
    expect(last.mobility).toBe(true);
    expect(within(row('mobility')).getByText(tr(`${k}.applied`))).toBeInTheDocument();
    expect(within(row('mobility')).getByText(euros)).toBeInTheDocument();

    // No and «I do not know»: put aside without a figure, and they can be asked again.
    reply('ascendant', 'no');
    reply('disability', 'unknown');
    expect(last.ascendants).toEqual([]);
    expect(last.disability).toBe(0);
    const aside = screen
      .getByText(tr(`${k}.archived`, { count: 2 }))
      .closest('details') as HTMLElement;
    expect(within(aside).queryByText(euros)).toBeNull();
    fireEvent.click(within(aside).getAllByRole('button', { name: tr(`${k}.askAgain`) })[0]);
    expect(
      screen.getByRole('button', {
        name: `${tr(`${k}.answer.yes`)}: ${tr(`${k}.ascendant.title`)}`,
      })
    ).toBeInTheDocument();
  });

  it('asks again a change applied and undone later in the form', () => {
    renderWithProviders(<Harness start={worker} />);
    reply('disability', 'yes');
    expect(last.disability).toBe(33);
    expect(within(row('disability')).getByText(tr(`${k}.applied`))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'undo' }));
    expect(
      screen.getByRole('button', {
        name: `${tr(`${k}.answer.yes`)}: ${tr(`${k}.disability.title`)}`,
      })
    ).toBeInTheDocument();
  });

  it('says when no suggestion is left to review', () => {
    renderWithProviders(
      <Harness
        start={{ ...worker, joint: 'none', retired: true, nonSalary: '30000', pension: '1500' }}
      />
    );
    for (const key of ['disability', 'ascendant']) reply(key, 'no');
    expect(screen.getByText(tr(`${k}.noneLeft`))).toBeInTheDocument();
    expect(screen.queryByText(tr(`${k}.none`))).toBeNull();
  });

  it('says where to type the value of a rented flat and what is missing', () => {
    renderWithProviders(
      <Harness
        start={{
          ...worker,
          joint: '',
          age: '',
          rentalOn: true,
          rentalIncome: '9000',
          savings: '2000',
        }}
      />
    );
    expect(screen.queryByText(tr(`${k}.rentalDepreciation.how`))).toBeNull();
    reply('rentalDepreciation', 'yes');
    reply('earlierLosses', 'yes');
    expect(
      within(row('earlierLosses')).getByText(tr(`${k}.earlierLosses.how`))
    ).toBeInTheDocument();
    expect(within(row('earlierLosses')).getByText(/de ejemplo/)).toBeInTheDocument();
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
