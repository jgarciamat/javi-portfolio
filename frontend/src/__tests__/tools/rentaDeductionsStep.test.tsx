import { fireEvent, screen } from '@testing-library/react';
import { rentaState } from '@modules/tools/data/renta/state';
import type { Deduction } from '@modules/tools/domain/rentaData';
import { emptyForm, familyOf, type Choice } from '@modules/tools/domain/rentaForm';
import type { DeductionSaving } from '@modules/tools/domain/rentaSavings';
import { DeductionsStep, bySaving } from '@modules/tools/ui/renta/DeductionsStep';
import { renderWithProviders, tr } from '@test-utils/render';

const flat: Deduction = {
  id: 'test-flat',
  group: 'family',
  title: 'Flat amount',
  summary: 'A fixed amount for the taxpayer.',
  kind: 'fixed',
  amount: 100,
  requirements: 'None.',
  url: 'https://example.org',
};
const other = (id: string, over: Partial<Deduction> = {}): Deduction => ({
  ...flat,
  id,
  title: `Deduction ${id}`,
  ...over,
});

const step = (
  deductions: Deduction[],
  choices: Record<string, Choice>,
  savings: Record<string, DeductionSaving> = {},
  markedSaving = 0
) =>
  renderWithProviders(
    <DeductionsStep
      state={{ ...rentaState, deductions }}
      ccaa={null}
      loadError={false}
      choices={choices}
      family={familyOf(emptyForm(''))}
      blocked={[]}
      hints={{}}
      savings={savings}
      markedSaving={markedSaving}
      onChange={jest.fn()}
    />
  );

// The text queries collapse the narrow spaces of the currency format into plain ones.
const money = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
    .format(n)
    .replace(/\s/g, ' ');
const saving = (saving: number, over: Partial<DeductionSaving> = {}): DeductionSaving => ({
  saving,
  blocked: false,
  example: null,
  ...over,
});

describe('Renta deductions: a fixed amount', () => {
  it('asks for no units when the amount is neither per child nor per unit', () => {
    step([flat], { [flat.id]: { on: true, amount: '', units: '' } });
    const fields = document.querySelector('.renta-deduction-fields') as HTMLElement;
    expect(fields.querySelector('input')).toBeNull();
    expect(screen.getByText(new RegExp(tr('tools.renta.gives')))).toBeInTheDocument();
  });
});

describe('Renta deductions: collected in advance', () => {
  it('asks what was collected with the modelo 140 or 143 only for those that have one', () => {
    const advance = other('adv', { advance: { model: '143', url: 'https://example.org/143' } });
    const onChange = jest.fn();
    renderWithProviders(
      <DeductionsStep
        state={{ ...rentaState, deductions: [advance, flat] }}
        ccaa={null}
        loadError={false}
        choices={{
          adv: { on: true, amount: '', units: '' },
          [flat.id]: { on: true, amount: '', units: '' },
        }}
        family={familyOf(emptyForm(''))}
        blocked={[]}
        hints={{}}
        savings={{}}
        markedSaving={0}
        onChange={onChange}
      />
    );
    const field = screen.getByLabelText(tr('tools.renta.advanceReceived', { model: '143' }));
    expect(field).toHaveValue('');
    fireEvent.change(field, { target: { value: '600' } });
    expect(onChange).toHaveBeenCalledWith('adv', {
      on: true,
      amount: '',
      units: '',
      advance: '600',
    });
    // The flat deduction, without an advance payment, asks for nothing more.
    expect(screen.getAllByPlaceholderText('0')).toHaveLength(1);
  });
});

describe('Renta deductions: by months', () => {
  it('asks the months of a deduction by months', () => {
    const monthly = other('mat', { monthly: 100 });
    const onChange = jest.fn();
    renderWithProviders(
      <DeductionsStep
        state={{ ...rentaState, deductions: [monthly] }}
        ccaa={null}
        loadError={false}
        choices={{ mat: { on: true, amount: '', units: '' } }}
        family={familyOf(emptyForm(''))}
        blocked={[]}
        hints={{}}
        savings={{}}
        markedSaving={0}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText(tr('tools.renta.months')), { target: { value: '10' } });
    expect(onChange).toHaveBeenCalledWith('mat', { on: true, amount: '', units: '', months: '10' });
    // Without a start bonus it is not asked.
    expect(screen.queryByLabelText(tr('tools.renta.startBonus'))).toBeNull();
  });

  it('asks the children with the 150 € of maternity', () => {
    const monthly = other('mat', { monthly: 100, startBonus: 150 });
    const onChange = jest.fn();
    renderWithProviders(
      <DeductionsStep
        state={{ ...rentaState, deductions: [monthly] }}
        ccaa={null}
        loadError={false}
        choices={{ mat: { on: true, amount: '', units: '', bonusUnits: '1' } }}
        family={familyOf(emptyForm(''))}
        blocked={[]}
        hints={{}}
        savings={{}}
        markedSaving={0}
        onChange={onChange}
      />
    );
    const input = screen.getByLabelText(tr('tools.renta.startBonus'));
    expect(input).toHaveValue('1');
    fireEvent.change(input, { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith('mat', {
      on: true,
      amount: '',
      units: '',
      bonusUnits: '2',
    });
  });
});

describe('Renta deductions: what each one saves', () => {
  it('orders them by saving, with the ones the income does not allow at the end', () => {
    const list = [
      other('a'),
      other('b', { incomeLimit: { individual: 30000 } }),
      other('c'),
      other('d', { incomeLimit: { individual: 1000, note: 'Up to 1,000 € of base.' } }),
      other('e'),
    ];
    step(
      list,
      { c: { on: true, amount: '', units: '' } },
      {
        a: saving(50),
        b: saving(0, { blocked: true }),
        c: saving(300),
        d: saving(0, { blocked: true }),
      },
      300
    );
    const titles = [...document.querySelectorAll('.renta-deduction strong')]
      .map((n) => n.textContent)
      .filter((text) => text?.startsWith('Deduction'));
    expect(titles).toEqual([
      'Deduction c',
      'Deduction a',
      'Deduction e',
      'Deduction b',
      'Deduction d',
    ]);
    expect(
      screen.getByText(tr('tools.renta.saving.on', { amount: money(300) }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr('tools.renta.saving.off', { amount: money(50) }))
    ).toBeInTheDocument();
    // No saving known (e): nothing to lower.
    expect(screen.getByText(tr('tools.renta.saving.none'))).toBeInTheDocument();
    expect(
      screen.getByText(
        `${tr('tools.renta.saving.blocked')} ${tr('tools.renta.saving.limit', {
          limit: money(30000),
        })}`
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${tr('tools.renta.saving.blocked')} Up to 1,000 € of base.`)
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(money(300));
  });

  it('says when a saving is worked out with an example amount', () => {
    step([other('p', { kind: 'percent', percent: 15 })], {}, { p: saving(150, { example: 1000 }) });
    expect(
      screen.getByText(tr('tools.renta.saving.example', { amount: money(1000) }).trim())
    ).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.saving.total'))).toBeNull();
  });

  it('keeps the order of deductions that save the same', () => {
    const sort = bySaving({ x: saving(10), y: saving(10, { blocked: true }) });
    expect(sort(other('x'), other('z'))).toBeLessThan(0);
    expect(sort(other('y'), other('z'))).toBeGreaterThan(0);
    expect(sort(other('z'), other('w'))).toBe(0);
  });
});
