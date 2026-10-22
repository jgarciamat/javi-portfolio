import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { formatMoney } from '@shared/utils/format';
import { AnnualPanel, carriedOfYear } from '@modules/finances/ui/components/AutonomoAnnual';
import { emptyManual, type ManualForm } from '@modules/finances/ui/components/AutonomoManual';
import { withWithholding } from '@modules/finances/ui/components/withholdingForm';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { renderWithProviders, tr } from '@test-utils/render';

const money = (n: number) => formatMoney(n, 'EUR', 'es');
const spaced = (text: string) => text.replace(/\s/g, ' ');

let n = 0;
const invoice = (over: Partial<ImportedInvoice>): ImportedInvoice => ({
  id: `a${++n}`,
  book: 'received',
  kind: 'other',
  excluded: false,
  date: '2026-03-10',
  quarter: 1,
  base: 1000,
  vatRate: 21,
  vat: 210,
  total: 1210,
  withheld: 0,
  concept: 'Proveedor inventado',
  ...over,
});

const show = (form: ManualForm, year = 2026) =>
  renderWithProviders(<AnnualPanel form={form} year={year} />, { authenticated: false });

describe('The yearly summaries of the self-employed screen', () => {
  it('shows the 190, the 180 and the 347 with their records and warnings', () => {
    let form: ManualForm = {
      ...emptyManual(),
      invoices: [
        invoice({ concept: 'Ana Diseño', nif: '00000001R', base: 2000, vat: 420, retention: 300 }),
        invoice({ concept: 'Ribera SL', kind: 'rent', base: 400, vat: 84, retention: 76 }),
        invoice({ concept: 'Cliente Uno', book: 'issued', base: 4000, vat: 840 }),
      ],
    };
    form = withWithholding(form, 1, {
      staff: {
        people: '1',
        paid: '3000',
        withheld: '300',
        kindPeople: '',
        kindPaid: '',
        kindWithheld: '',
      },
    });
    show(form);
    const panel = screen.getByRole('region', {
      name: tr('app.autonomo.annual.title', { year: 2026 }),
    });
    expect(within(panel).getByText(tr('app.autonomo.model', { model: '190' }))).toBeInTheDocument();
    expect(within(panel).getByText(tr('app.autonomo.model', { model: '180' }))).toBeInTheDocument();
    // Once in the list of the 190 and once in the table of its preview.
    expect(within(panel).getAllByText('Ana Diseño')).toHaveLength(2);
    expect(
      within(panel).getByRole('heading', { name: tr('taxforms.title.annual', { year: 2026 }) })
    ).toBeInTheDocument();
    expect(within(panel).getByText(tr('app.autonomo.annual.typed'))).toBeInTheDocument();
    expect(
      within(panel).getByText(tr('app.autonomo.annual.key.B', { who: 'Cliente Uno' }))
    ).toBeInTheDocument();
    // The count of the 190 is a number, not money: one professional and the typed employees.
    expect(within(panel).getByText('Número total de percepciones').nextSibling).toHaveTextContent(
      /^2$/
    );
    expect(
      within(panel).getByText(tr('app.autonomo.annual.warn.typed.staff'), { exact: false })
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(tr('app.autonomo.annual.warn.cadastre'), { exact: false })
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(tr('app.autonomo.annual.warn.nif', { who: 'Ribera SL' }), {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(tr('app.autonomo.annual.warn347.nif', { who: 'Cliente Uno' }), {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      within(panel).getAllByText(tr('app.autonomo.annual.deadlineJanuary', { year: 2027 }))
    ).toHaveLength(2);
  });

  it('says there is no 347 below the threshold, and that the figures of 2027 are provisional', () => {
    show(emptyManual(), 2027);
    expect(screen.queryByText(tr('app.autonomo.model', { model: '190' }))).not.toBeInTheDocument();
    expect(
      screen.getByText(spaced(tr('app.autonomo.annual.none347', { amount: money(3005.06) })))
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr('app.autonomo.annual.provisional', { year: 2027 }))
    ).toBeInTheDocument();
  });

  it('warns of the 720, the 721 and the 714 by the figures typed, without keeping them', () => {
    show(emptyManual());
    fireEvent.click(screen.getByText(tr('app.autonomo.annual.wealth.title')));
    expect(screen.getByText(tr('app.autonomo.annual.wealth.none'))).toBeInTheDocument();
    const type = (field: string, value: string) =>
      fireEvent.change(screen.getByLabelText(tr(`app.autonomo.annual.field.${field}`)), {
        target: { value },
      });
    type('accounts', '60000');
    type('crypto', 'abc');
    type('assets', '1500000');
    type('home', '500000');
    type('debts', '100000');
    expect(
      screen.getByText(
        spaced(
          tr('app.autonomo.annual.wealth.abroad.first', {
            model: '720',
            what: tr('app.autonomo.annual.block.accounts'),
            amount: money(60000),
          })
        ),
        { exact: false }
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        spaced(tr('app.autonomo.annual.wealth.714.base', { amount: money(400000) })),
        {
          exact: false,
        }
      )
    ).toBeInTheDocument();
  });

  it('says each warning of the 190 and the 347 in words', () => {
    const form: ManualForm = {
      ...emptyManual(),
      invoices: [
        invoice({ concept: 'Mezcla', nif: '1', base: 100, vat: 21, retention: 15 }),
        invoice({ concept: 'Mezcla', nif: '1', base: 100, vat: 21, retention: 7 }),
        invoice({
          concept: 'Fuera',
          book: 'issued',
          op: 'notSubject',
          base: 5000,
          vat: 0,
          withheld: 750,
        }),
      ],
    };
    show(withWithholding(form, 2, { pros: { people: '1', paid: '100', withheld: '15' } }));
    for (const text of [
      tr('app.autonomo.annual.warn.subkey', { who: 'Mezcla' }),
      tr('app.autonomo.annual.warn.typed.pros'),
      tr('app.autonomo.annual.warn347.withheld', { who: 'Fuera' }),
      tr('app.autonomo.annual.warn347.notSubject', { who: 'Fuera' }),
    ])
      expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
    expect(
      screen.getByText(tr('app.autonomo.annual.deadlineFebruary', { year: 2027 }))
    ).toBeInTheDocument();
  });

  it('shows what the cash invoices accrued by the cash rule, or that their collections are missing', () => {
    // 4,000 € billed under the cash regime, 2,500 € collected (case 347-03); another client without
    // its collections.
    show({
      ...emptyManual(),
      invoices: [
        invoice({
          concept: 'Caja Uno',
          book: 'issued',
          base: 4000,
          vat: 0,
          cash: true,
          collections: [{ date: '2026-11-20', amount: 2500 }],
        }),
        invoice({ concept: 'Caja Dos', book: 'issued', base: 5000, vat: 0, cash: true }),
      ],
    });
    const who = (name: string) => tr('app.autonomo.annual.key.B', { who: name });
    expect(
      screen.getByText(
        spaced(tr('app.autonomo.annual.cash347', { who: who('Caja Uno'), amount: money(2500) }))
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr('app.autonomo.annual.cash347Unknown', { who: who('Caja Dos') }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr('app.autonomo.annual.warn347.cashUnknown', { who: 'Caja Dos' }), {
        exact: false,
      })
    ).toBeInTheDocument();
  });

  it('takes by hand what was pending on 31 December of cash invoices of the year before', () => {
    // Case 347-03, year 2: 4,000 € billed in 2025, 2,500 € collected that year; the 1,500 € left
    // are typed and give the record of 2026 (0 € by the general rule, 1,500 € by the cash rule).
    let saved: ManualForm | null = null;
    function Kept() {
      const [form, setForm] = useState<ManualForm>({
        ...emptyManual(),
        // A line of another year stays as it is.
        carried347: [{ year: 2025, key: 'A', name: 'Otro Año', nif: '', amount: '900' }],
      });
      return (
        <AnnualPanel
          form={form}
          year={2026}
          onChange={(f) => {
            saved = f;
            setForm(f);
          }}
        />
      );
    }
    renderWithProviders(<Kept />, { authenticated: false });
    expect(
      screen.getByText(spaced(tr('app.autonomo.annual.none347', { amount: money(3005.06) })))
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.annual.carried.add') }));
    const row = screen.getByRole('group', {
      name: tr('app.autonomo.annual.carried.row', { n: 1 }),
    });
    // An empty line makes no record.
    expect(
      screen.getByText(spaced(tr('app.autonomo.annual.none347', { amount: money(3005.06) })))
    ).toBeInTheDocument();
    fireEvent.change(within(row).getByLabelText(tr('app.autonomo.annual.carried.name')), {
      target: { value: '  Cliente Ficticio ' },
    });
    fireEvent.change(within(row).getByLabelText(tr('app.autonomo.annual.nif')), {
      target: { value: 'b00000000' },
    });
    fireEvent.change(
      within(row).getByLabelText(tr('app.autonomo.annual.carried.amount', { prev: 2025 })),
      { target: { value: '1500' } }
    );
    const who = (key: 'A' | 'B') =>
      tr(`app.autonomo.annual.key.${key}`, { who: 'Cliente Ficticio' });
    expect(
      screen.getByText(
        spaced(tr('app.autonomo.annual.cash347', { who: who('B'), amount: money(1500) }))
      )
    ).toBeInTheDocument();
    // In the list and in the table of the preview, in capitals.
    expect(screen.getAllByText('B00000000')).toHaveLength(2);
    fireEvent.change(within(row).getByLabelText(tr('app.autonomo.annual.carried.key')), {
      target: { value: 'A' },
    });
    expect(
      screen.getByText(
        spaced(tr('app.autonomo.annual.cash347', { who: who('A'), amount: money(1500) }))
      )
    ).toBeInTheDocument();
    expect(saved!.carried347).toEqual([
      { year: 2025, key: 'A', name: 'Otro Año', nif: '', amount: '900' },
      { year: 2026, key: 'A', name: '  Cliente Ficticio ', nif: 'b00000000', amount: '1500' },
    ]);
    // A second person: typing in it leaves the first one as it was.
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.annual.carried.add') }));
    const second = screen.getByRole('group', {
      name: tr('app.autonomo.annual.carried.row', { n: 2 }),
    });
    fireEvent.change(within(second).getByLabelText(tr('app.autonomo.annual.carried.name')), {
      target: { value: 'Otra' },
    });
    expect(saved!.carried347?.[1].name).toBe('  Cliente Ficticio ');
    fireEvent.click(
      within(second).getByRole('button', {
        name: tr('app.autonomo.annual.carried.remove', { n: 2 }),
      })
    );
    fireEvent.click(
      within(row).getByRole('button', {
        name: tr('app.autonomo.annual.carried.remove', { n: 1 }),
      })
    );
    expect(saved!.carried347).toEqual([
      { year: 2025, key: 'A', name: 'Otro Año', nif: '', amount: '900' },
    ]);
  });

  it('leaves out the lines typed for the 347 without amount or without anyone', () => {
    const row = { year: 2026, key: 'B' as const, name: '', nif: ' b11111111 ', amount: '200,50' };
    expect(carriedOfYear(undefined, 2026)).toEqual([]);
    // Older data has no lines: the screen starts with none.
    const onChange = jest.fn();
    renderWithProviders(<AnnualPanel form={emptyManual()} year={2026} onChange={onChange} />, {
      authenticated: false,
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.annual.carried.add') }));
    expect(onChange.mock.calls[0][0].carried347).toEqual([
      { year: 2026, key: 'B', name: '', nif: '', amount: '' },
    ]);
    expect(
      carriedOfYear(
        [
          row,
          { ...row, nif: '', name: 'Sin NIF' },
          { ...row, nif: '', name: ' ' },
          { ...row, amount: '0' },
          { ...row, year: 2025 },
        ],
        2026
      )
    ).toEqual([
      { key: 'B', nif: 'B11111111', name: '', amount: 200.5 },
      { key: 'B', nif: null, name: 'Sin NIF', amount: 200.5 },
    ]);
  });

  it('warns of the 714 when the assets pass 2,000,000 €', () => {
    show(emptyManual());
    fireEvent.click(screen.getByText(tr('app.autonomo.annual.wealth.title')));
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.annual.field.assets')), {
      target: { value: '2500000' },
    });
    expect(
      screen.getByText(
        spaced(tr('app.autonomo.annual.wealth.714.assets', { amount: money(2500000) })),
        {
          exact: false,
        }
      )
    ).toBeInTheDocument();
  });
});
