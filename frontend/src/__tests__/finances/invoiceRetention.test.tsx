import { useState } from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { emptyManual, type ManualForm } from '@modules/finances/ui/components/AutonomoManual';
import { InvoiceReview } from '@modules/finances/ui/components/InvoiceReview';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { renderWithProviders, tr } from '@test-utils/render';

const invoice = (over: Partial<ImportedInvoice>): ImportedInvoice => ({
  id: 'g1',
  book: 'received',
  kind: 'management',
  excluded: false,
  date: '2026-05-10',
  quarter: 2,
  base: 150,
  vatRate: 21,
  vat: 31.5,
  total: 181.5,
  withheld: 0,
  retention: 22.5,
  concept: 'Gestoría Pérez',
  ...over,
});

let latest: ManualForm = emptyManual();
let setForm: (form: ManualForm) => void = () => undefined;
function Harness({ invoices }: { invoices: ImportedInvoice[] }) {
  const [form, set] = useState<ManualForm>({ ...emptyManual(), invoices });
  latest = form;
  setForm = set;
  return <InvoiceReview form={form} onChange={set} focus={null} />;
}

const show = (invoices: ImportedInvoice[]) =>
  renderWithProviders(<Harness invoices={invoices} />, { authenticated: false });

const name = (who: string) => tr('app.autonomo.review.invoice', { who, date: '10 may 2026' });
const amountOf = (who: string) =>
  screen.getByLabelText(tr('app.autonomo.wh.retentionOf', { invoice: name(who) }));
const roleField = (who: string) =>
  screen.getByLabelText(tr('app.autonomo.wh.roleOf', { invoice: name(who) }));

describe('The withholding of a received invoice in the review', () => {
  it('shows the amount and the form it goes to, and takes a correction', () => {
    show([
      invoice({}),
      invoice({ id: 'l1', kind: 'rent', concept: 'Local', base: 400, retention: 76 }),
    ]);
    expect(
      screen.getAllByRole('columnheader', { name: tr('app.autonomo.review.col.retention') })
    ).toHaveLength(1);
    expect(amountOf('Gestoría Pérez')).toHaveValue('22,5');
    expect(roleField('Gestoría Pérez')).toHaveValue('professional');
    expect(roleField('Local')).toHaveValue('rent');

    fireEvent.change(amountOf('Gestoría Pérez'), { target: { value: '10,5' } });
    fireEvent.blur(amountOf('Gestoría Pérez'));
    expect(latest.invoices[0]).toMatchObject({ retention: 22.5, retentionFix: 10.5 });

    // Enter keeps it too; an unchanged amount changes nothing.
    fireEvent.change(amountOf('Local'), { target: { value: '' } });
    fireEvent.keyDown(amountOf('Local'), { key: 'Enter' });
    expect(latest.invoices[1].retentionFix).toBe(0);
    const before = latest;
    fireEvent.keyDown(amountOf('Local'), { key: 'a' });
    fireEvent.blur(amountOf('Local'));
    expect(latest).toBe(before);

    fireEvent.change(roleField('Local'), { target: { value: 'none' } });
    expect(latest.invoices[1].withholding).toBe('none');
  });

  it('refuses an amount that is not a number from 0 to the base', () => {
    show([invoice({})]);
    for (const wrong of ['abc', '-5', '151']) {
      fireEvent.change(amountOf('Gestoría Pérez'), { target: { value: wrong } });
      fireEvent.blur(amountOf('Gestoría Pérez'));
      expect(amountOf('Gestoría Pérez')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toHaveTextContent(tr('app.autonomo.wh.invalid'));
    }
    expect(latest.invoices[0].retentionFix).toBeUndefined();
    fireEvent.change(amountOf('Gestoría Pérez'), { target: { value: '150' } });
    fireEvent.blur(amountOf('Gestoría Pérez'));
    expect(amountOf('Gestoría Pérez')).toHaveAttribute('aria-invalid', 'false');
    expect(latest.invoices[0].retentionFix).toBe(150);
  });

  it('keeps the sign of a credit note, follows a change made elsewhere and is off when left out', () => {
    show([
      invoice({ base: -100, retention: -15 }),
      invoice({ id: 'x', concept: 'Fuera', excluded: true }),
    ]);
    expect(amountOf('Gestoría Pérez')).toHaveValue('15');
    fireEvent.change(amountOf('Gestoría Pérez'), { target: { value: '7' } });
    fireEvent.blur(amountOf('Gestoría Pérez'));
    expect(latest.invoices[0].retentionFix).toBe(-7);
    expect(amountOf('Fuera')).toBeDisabled();
    expect(roleField('Fuera')).toBeDisabled();
    // Imported again with another amount: the field shows it.
    fireEvent.change(amountOf('Gestoría Pérez'), { target: { value: 'x' } });
    fireEvent.blur(amountOf('Gestoría Pérez'));
    const next = {
      ...latest,
      invoices: [{ ...latest.invoices[0], retentionFix: -3 }, latest.invoices[1]],
    };
    act(() => setForm(next));
    expect(amountOf('Gestoría Pérez')).toHaveValue('3');
    expect(amountOf('Gestoría Pérez')).toHaveAttribute('aria-invalid', 'false');
  });

  it('is not in the table of the issued invoices', () => {
    show([invoice({ book: 'issued', retention: undefined, withheld: 15 })]);
    expect(
      screen.queryByRole('columnheader', { name: tr('app.autonomo.review.col.retention') })
    ).toBeNull();
  });
});
