import { fireEvent, screen, within } from '@testing-library/react';
import { formatMoney } from '@shared/utils/format';
import { AnnualPanel } from '@modules/finances/ui/components/AutonomoAnnual';
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
