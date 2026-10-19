import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { DonationsFields } from '@modules/tools/ui/renta/DonationsFields';
import { renderWithProviders, tr } from '@test-utils/render';

const k = (key: string) => tr(`tools.renta.donations.${key}`);

function Harness({ start, taxBase }: { start: Partial<RentaForm>; taxBase: number }) {
  const [form, setForm] = useState<RentaForm>({ ...emptyForm(''), ...start });
  return (
    <DonationsFields form={form} set={(p) => setForm((f) => ({ ...f, ...p }))} taxBase={taxBase} />
  );
}

describe('the donations fields', () => {
  it('keeps the recurrence of a return typed before and the other kinds, with the limit', () => {
    renderWithProviders(
      <Harness
        start={{
          donations: {
            general: '300',
            recurrent: '300',
            priority: '',
            priorityRecurrent: '',
            other: '',
          },
        }}
        taxBase={2000}
      />,
      { authenticated: false }
    );
    expect(screen.getByLabelText(k('recurrent'))).toHaveValue('300');
    for (const [field, value] of [
      ['priority', '100'],
      ['priorityRecurrent', '100'],
      ['other', '50'],
    ])
      fireEvent.change(screen.getByLabelText(k(field)), { target: { value } });
    // 10 % of 2,000 = 200 of the 350 given in general and other; the priority ones up to 300.
    expect(screen.getByText(/no cuentan/)).toHaveTextContent('150,00');
  });
});
