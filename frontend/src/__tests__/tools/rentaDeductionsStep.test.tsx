import { screen } from '@testing-library/react';
import { rentaState } from '@modules/tools/data/renta/state';
import type { Deduction } from '@modules/tools/domain/rentaData';
import { emptyForm, familyOf } from '@modules/tools/domain/rentaForm';
import { DeductionsStep } from '@modules/tools/ui/renta/DeductionsStep';
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

describe('Renta deductions: a fixed amount', () => {
  it('asks for no units when the amount is neither per child nor per unit', () => {
    renderWithProviders(
      <DeductionsStep
        state={{ ...rentaState, deductions: [flat] }}
        ccaa={null}
        loadError={false}
        choices={{ [flat.id]: { on: true, amount: '', units: '' } }}
        family={familyOf(emptyForm(''))}
        blocked={[]}
        hints={{}}
        onChange={jest.fn()}
      />
    );
    const fields = document.querySelector('.renta-deduction-fields') as HTMLElement;
    expect(fields.querySelector('input')).toBeNull();
    expect(screen.getByText(new RegExp(tr('tools.renta.gives')))).toBeInTheDocument();
  });
});
