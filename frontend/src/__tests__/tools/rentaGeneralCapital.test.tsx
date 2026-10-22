import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { GeneralCapitalSection } from '@modules/tools/ui/renta/GeneralCapital';
import { renderWithProviders, tr } from '@test-utils/render';

const k = (key: string) => `tools.renta.generalCapital.${key}`;
let last: RentaForm;

function Harness() {
  const [form, setForm] = useState<RentaForm>(emptyForm(''));
  last = form;
  return <GeneralCapitalSection form={form} set={(p) => setForm((f) => ({ ...f, ...p }))} />;
}

const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const status = () => (screen.getByRole('status').textContent ?? '').replace(/\s/g, ' ');

describe('Renta: capital income of the general base', () => {
  it('takes a business lease with its expenses and a loan to a related company', () => {
    renderWithProviders(<Harness />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr(k('add'))) }));
    const one = within(screen.getByRole('group', { name: tr(k('item'), { n: 1 }) }));
    type(one.getByLabelText(tr(k('label'))), 'Cafetería');
    // Manual 2025, c05, caso práctico B: 15,600 − 4,660 = 10,940.
    type(one.getByLabelText(tr(k('income'))), '15600');
    type(one.getByLabelText(tr(k('expenses'))), '4660');
    expect(status()).toContain('10.940');
    fireEvent.click(one.getByLabelText(tr(k('irregular'))));
    expect(last.generalCapital?.[0]).toMatchObject({ irregular: true, label: 'Cafetería' });
    // A second one: a loan to a related company, box 0051 (Manual 2025, c05, example).
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr(k('add'))) }));
    const two = within(screen.getByRole('group', { name: tr(k('item'), { n: 2 }) }));
    expect(two.queryByLabelText(tr(k('related')))).toBeNull();
    fireEvent.change(two.getByLabelText(tr(k('box'))), { target: { value: '0051' } });
    fireEvent.click(two.getByLabelText(tr(k('related'))));
    type(two.getByLabelText(tr(k('related.interest'))), '5000');
    type(two.getByLabelText(tr(k('related.loan'))), '70000');
    type(two.getByLabelText(tr(k('related.ownFunds'))), '50000');
    type(two.getByLabelText(tr(k('related.share'))), 'x');
    type(two.getByLabelText(tr(k('related.share'))), '40');
    expect(status()).toContain('714,29');
    expect(status()).toContain('4285,71');
    fireEvent.click(two.getByLabelText(tr(k('related'))));
    expect(last.generalCapital?.[1]).not.toHaveProperty('related');
    fireEvent.click(two.getByRole('button', { name: tr(k('remove'), { n: 2 }) }));
    expect(last.generalCapital).toHaveLength(1);
  });
});
