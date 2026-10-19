import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@core/i18n/I18nContext';
import * as reader from '@modules/finances/application/taxModelPdf';
import type { TaxModelParse } from '@modules/finances/domain/taxModelPdf';
import {
  AutonomoManual,
  emptyManual,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import { QuarterVatPanel } from '@modules/finances/ui/components/AutonomoVatQuarter';
import { VatYearPanel } from '@modules/finances/ui/components/AutonomoVatYear';
import { VatOpCell } from '@modules/finances/ui/components/InvoiceVatCell';
import { InvoiceReview } from '@modules/finances/ui/components/InvoiceReview';
import {
  NO_VAT_EXTRAS,
  emptyVat,
  type VatExtras,
  type VatForm,
} from '@modules/finances/ui/components/vatForm';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@modules/finances/application/taxModelPdf');
const read = reader.readImportPdf as jest.MockedFunction<typeof reader.readImportPdf>;

const k = (key: string, values?: Record<string, string | number>) =>
  tr(`app.autonomo.vatq.${key}`, values);
const y = (key: string, values?: Record<string, string | number>) =>
  tr(`app.autonomo.vaty.${key}`, values);

let vat: VatForm = emptyVat();
function QuarterHarness({ cashBasis = false, initial = emptyVat() }) {
  const [value, setValue] = useState<VatForm>(initial);
  vat = value;
  return (
    <QuarterVatPanel q={1} year={2026} vat={value} cashBasis={cashBasis} onChange={setValue} />
  );
}
const showQuarter = (props: { cashBasis?: boolean; initial?: VatForm } = {}) =>
  render(
    <I18nProvider>
      <QuarterHarness {...props} />
    </I18nProvider>
  );
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('The VAT of a quarter beyond its invoices', () => {
  it('is folded while empty, and takes the sales without VAT, the surcharge and the corrections', () => {
    showQuarter();
    const details = screen.getByText(k('title')).closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    type(`${k('sales.intraEU')} (59) 2`, '3000');
    type(`${k('sales.exports')} (60) 2`, '2000');
    type(`${k('re.r21')} 2`, '1000');
    type(`${k('fix.salesFix.base')} 2`, '-100');
    type(`${k('fix.intraFix.vat')} 2`, '-21');
    type(`${k('oneOff.art80')} (76) 2`, '5');
    expect(vat.sales).toMatchObject({ intraEU: '3000', exports: '2000' });
    expect(vat.re.r21).toBe('1000');
    expect(vat.salesFix.base).toBe('-100');
    expect(vat.intraFix.vat).toBe('-21');
    expect(vat.oneOff.art80).toBe('5');
    // The rare ones say so.
    expect(screen.getAllByText(new RegExp(k('rare'))).length).toBeGreaterThan(5);
    // Cash accounting only shows when it applies.
    expect(screen.queryByText(k('cashTitle'))).toBeNull();
  });

  it('opens when something is typed, and lists the operations of the 349 one by one', () => {
    showQuarter({ initial: { ...emptyVat(), oneOff: { ...emptyVat().oneOff, reagp: '1' } } });
    expect((screen.getByText(k('title')).closest('details') as HTMLDetailsElement).open).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: `+ ${k('intra.add')}` }));
    fireEvent.click(screen.getByRole('button', { name: `+ ${k('intra.add')}` }));
    fireEvent.change(screen.getByLabelText(`${k('intra.key')} 2.1`), { target: { value: 'S' } });
    type(`${k('intra.vatId')} 2.1`, 'PT000000000');
    type(`${k('intra.name')} 2.1`, 'Lda');
    type(`${k('intra.base')} 2.1`, '1500');
    fireEvent.click(screen.getByLabelText(`${k('intra.rect')} 2.1`));
    // The year of the draft is proposed for the correction.
    expect(vat.intra[0]).toMatchObject({
      key: 'S',
      vatId: 'PT000000000',
      rect: true,
      rectYear: '2026',
    });
    fireEvent.change(screen.getByLabelText(`${k('intra.rectQuarter')} 2.1`), {
      target: { value: '1' },
    });
    type(`${k('intra.previous')} 2.1`, '1000');
    type(`${k('intra.rectYear')} 2.1`, '2025');
    expect(vat.intra[0]).toMatchObject({ rectQuarter: '1', previous: '1000', rectYear: '2025' });
    // Unticked, the year that was there stays.
    fireEvent.click(screen.getByLabelText(`${k('intra.rect')} 2.1`));
    fireEvent.click(screen.getByLabelText(`${k('intra.rect')} 2.1`));
    expect(vat.intra[0].rectYear).toBe('2025');
    fireEvent.click(screen.getByRole('button', { name: `${tr('app.common.delete')} 2.2` }));
    expect(vat.intra).toHaveLength(1);
  });

  it('asks for what was collected and paid under cash accounting', () => {
    showQuarter({ cashBasis: true });
    expect(screen.getByText(k('cashTitle'))).toBeInTheDocument();
    type(`${k('cash.invoiced', { rate: '21' })} 2`, '1000');
    type(`${k('cash.purchasesPaid', { rate: '10' })} 2`, '50');
    expect(vat.cash.invoiced.r21).toBe('1000');
    expect(vat.cash.purchasesPaid.r10).toBe('50');
  });
});

let extras: VatExtras = NO_VAT_EXTRAS;
function YearHarness({ quarter }: { quarter: number }) {
  const [value, setValue] = useState<VatExtras | undefined>(undefined);
  extras = value ?? NO_VAT_EXTRAS;
  return <VatYearPanel value={value} quarter={quarter} onChange={setValue} />;
}
const showYear = (quarter = 2) =>
  render(
    <I18nProvider>
      <YearHarness quarter={quarter} />
    </I18nProvider>
  );

describe('The VAT of the year', () => {
  it('takes the regime, the prorrata and the options, with their help', () => {
    showYear();
    expect((screen.getByText(y('title')).closest('details') as HTMLDetailsElement).open).toBe(
      false
    );
    fireEvent.change(screen.getByLabelText(y('regime')), { target: { value: 'simplified' } });
    expect(screen.getByText(y('regimeHint.simplified'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(y('regime')), { target: { value: 'reagp' } });
    expect(screen.getByText(y('regimeHint.reagp'))).toBeInTheDocument();
    type(y('reagpVolume'), '64176');
    type(y('provisional'), '80');
    fireEvent.click(screen.getByLabelText(y('special')));
    fireEvent.click(screen.getByLabelText(y('cashBasis')));
    fireEvent.click(screen.getByLabelText(y('skip', { n: 2 })));
    expect(extras).toMatchObject({
      regime: 'reagp',
      reagpVolume: '64176',
      provisional: '80',
      special: true,
      cashBasis: true,
      skip: [2],
    });
    fireEvent.click(screen.getByLabelText(y('skip', { n: 2 })));
    expect(extras.skip).toEqual([]);
    // The refund is only asked for in the fourth quarter.
    expect(screen.queryByLabelText(y('refund'))).toBeNull();
  });

  it('lists the investment goods of earlier years and asks for the refund in the fourth quarter', () => {
    showYear(4);
    fireEvent.click(screen.getByLabelText(y('refund')));
    expect(extras.refund).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: `+ ${y('investmentsAdd')}` }));
    fireEvent.click(screen.getByRole('button', { name: `+ ${y('investmentsAdd')}` }));
    type(`${y('investment.year')} 1`, '2024');
    type(`${y('investment.vat')} 1`, '1000');
    type(`${y('investment.pct')} 1`, '50');
    fireEvent.click(screen.getByLabelText(`${y('investment.realEstate')} 1`));
    expect(extras.investments[0]).toEqual({
      year: '2024',
      vat: '1000',
      pct: '50',
      realEstate: true,
    });
    fireEvent.click(screen.getByRole('button', { name: `${tr('app.common.delete')} 2` }));
    expect(extras.investments).toHaveLength(1);
  });
});

const invoice = (over: Partial<ImportedInvoice> = {}): ImportedInvoice => ({
  id: 'a1',
  book: 'issued',
  kind: 'other',
  excluded: false,
  date: '2026-02-01',
  quarter: 1,
  base: 100,
  vatRate: 0,
  vat: 0,
  total: 100,
  withheld: 0,
  concept: 'Client',
  ...over,
});

describe('What an imported invoice is for VAT', () => {
  const showCell = (i: ImportedInvoice, onChange = jest.fn()) => {
    render(
      <I18nProvider>
        <table>
          <tbody>
            <tr>
              <VatOpCell invoice={i} name="Client" onChange={onChange} />
            </tr>
          </tbody>
        </table>
      </I18nProvider>
    );
    return onChange;
  };

  it('of an issued one: its operation, the key of the 349 and the VAT number', () => {
    const onChange = showCell(invoice({ op: 'intraEU', vatId: 'FR1' }));
    const op = screen.getByLabelText(tr('app.autonomo.review.opOf', { invoice: 'Client' }));
    expect((op as HTMLSelectElement).value).toBe('intraEU');
    fireEvent.change(op, { target: { value: 'export' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }), {
      op: 'export',
      opFix: true,
    });
    fireEvent.change(
      screen.getByLabelText(tr('app.autonomo.review.keyOf', { invoice: 'Client' })),
      {
        target: { value: 'S' },
      }
    );
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), { key349: 'S', opFix: true });
    const id = screen.getByLabelText(tr('app.autonomo.review.vatIdOf', { invoice: 'Client' }));
    // «FR1» is not a VAT number: it is marked.
    expect(id).toHaveClass('is-invalid');
    fireEvent.change(id, { target: { value: ' FR00000000001 ' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), {
      vatId: 'FR00000000001',
      opFix: true,
    });
  });

  it('of a received one: no key to choose, a valid number is fine, a domestic one asks for nothing', () => {
    showCell(invoice({ id: 'b2', book: 'received', op: 'intraServices' }));
    expect(
      (
        screen.getByLabelText(
          tr('app.autonomo.review.vatIdOf', { invoice: 'Client' })
        ) as HTMLInputElement
      ).value
    ).toBe('');
    cleanup();
    showCell(invoice({ book: 'received', op: 'intraGoods', vatId: 'DE123456789' }));
    expect(
      screen.queryByLabelText(tr('app.autonomo.review.keyOf', { invoice: 'Client' }))
    ).toBeNull();
    expect(
      screen.getByLabelText(tr('app.autonomo.review.vatIdOf', { invoice: 'Client' }))
    ).not.toHaveClass('is-invalid');
  });

  it('a domestic invoice has no VAT number field, and a left-out one cannot be changed', () => {
    showCell(invoice({ excluded: true }));
    expect(
      screen.getByLabelText(tr('app.autonomo.review.opOf', { invoice: 'Client' }))
    ).toBeDisabled();
    expect(
      screen.queryByLabelText(tr('app.autonomo.review.vatIdOf', { invoice: 'Client' }))
    ).toBeNull();
  });
});

describe('The review of the imported invoices', () => {
  it('corrects what an invoice is for VAT, and its quarter follows', () => {
    const onChange = jest.fn();
    const sold = invoice({ id: 'x1', concept: 'Client Fictif', base: 500, vatRate: 0 });
    render(
      <I18nProvider>
        <InvoiceReview
          form={{ ...emptyManual(), invoices: [sold] }}
          onChange={onChange}
          focus={null}
        />
      </I18nProvider>
    );
    fireEvent.change(
      screen.getByLabelText(
        new RegExp(tr('app.autonomo.review.opOf', { invoice: 'Client Fictif' }))
      ),
      { target: { value: 'export' } }
    );
    const next = onChange.mock.calls[0][0] as ManualForm;
    expect(next.invoices[0]).toMatchObject({ op: 'export', opFix: true });
    expect(next.quarters[0].vat?.sales.exports).toBe('500');
    expect(next.quarters[0].income.r0).toBe('');
  });
});

describe('The expenses of a quarter, by VAT operation', () => {
  let form: ManualForm = emptyManual();
  const onCarry = jest.fn();
  function Harness({ special }: { special: boolean }) {
    const [value, setValue] = useState<ManualForm>(() => ({
      ...emptyManual(),
      quarters: emptyManual().quarters.map((q, i) =>
        i === 0
          ? {
              ...q,
              expenses: [
                { kind: 'material' as const, amount: '100', vatRate: 21 as const, days: '' },
              ],
            }
          : q
      ),
    }));
    form = value;
    return (
      <AutonomoManual
        form={value}
        onChange={setValue}
        upTo={1}
        year={2026}
        years={[2025, 2026]}
        onPeriod={() => undefined}
        vatExtras={{ ...NO_VAT_EXTRAS, special }}
        onCarry={onCarry}
      />
    );
  }
  const show = (special = false) =>
    render(
      <I18nProvider>
        <Harness special={special} />
      </I18nProvider>
    );

  it('asks for the base of a purchase without Spanish VAT, and marks an investment good', () => {
    show();
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.vatOp.label')} 1.1`), {
      target: { value: 'intraGoods' },
    });
    expect(screen.getByText(tr('app.autonomo.vatOp.base'))).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(`${tr('app.autonomo.vatOp.investment')} 1.1`));
    expect(screen.getByText(tr('app.autonomo.vatOp.investmentHint'))).toBeInTheDocument();
    expect(form.quarters[0].expenses[0]).toMatchObject({ op: 'intraGoods', investment: true });
    expect(screen.queryByLabelText(`${tr('app.autonomo.vatUse.label')} 1.1`)).toBeNull();
  });

  it('types the VAT of the quarter and corrects the operation of an imported invoice', () => {
    show();
    fireEvent.change(screen.getByLabelText(`${k('sales.exports')} (60) 1`), {
      target: { value: '700' },
    });
    expect(form.quarters[0].vat?.sales.exports).toBe('700');
  });

  it('asks what each purchase is used for under the special prorrata', () => {
    show(true);
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.vatUse.label')} 1.1`), {
      target: { value: 'exempt' },
    });
    expect(form.quarters[0].expenses[0].use).toBe('exempt');
  });

  it('hands over what an imported 390 of last year carries to this one', async () => {
    show();
    read.mockResolvedValueOnce({
      kind: 'model',
      parsed: {
        ok: true,
        data: { model: '390', year: 2025, quarter: null, boxes: { '97': 100, '118': 90 } },
      } as TaxModelParse,
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.import.files')), {
      target: { files: [new File(['%PDF'], 'm390.pdf', { type: 'application/pdf' })] },
    });
    await waitFor(() =>
      expect(onCarry).toHaveBeenCalledWith({ toOffset: '100', provisional: '90' })
    );
    expect(
      await screen.findByText(tr('app.autonomo.model.note.prorrata', { pct: 90 }))
    ).toBeInTheDocument();
  });
});

describe('The VAT of the year on the self-employed screen', () => {
  beforeEach(() => localStorage.clear());

  it('sends the prorrata and takes what the 390 of last year carries', async () => {
    read.mockClear();
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    api.businessApi.draft.mockResolvedValue(f.autonomoDraft());
    renderWithProviders(<BusinessView />, { api, plan: true });
    fireEvent.change(await screen.findByLabelText(y('provisional')), { target: { value: '75' } });
    const year = new Date().getFullYear();
    read.mockResolvedValueOnce({
      kind: 'model',
      parsed: {
        ok: true,
        data: { model: '390', year: year - 1, quarter: null, boxes: { '97': 250, '118': 80 } },
      } as TaxModelParse,
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.import.files')), {
      target: { files: [new File(['%PDF'], '390.pdf', { type: 'application/pdf' })] },
    });
    await waitFor(() =>
      expect(
        (screen.getByLabelText(new RegExp(tr('app.autonomo.toOffset'))) as HTMLInputElement).value
      ).toBe('250')
    );
    // Its definitive prorrata is this year's provisional one.
    expect((screen.getByLabelText(y('provisional')) as HTMLInputElement).value).toBe('80');
    // Another one without a prorrata leaves the one there was.
    read.mockResolvedValueOnce({
      kind: 'model',
      parsed: {
        ok: true,
        data: { model: '390', year: year - 1, quarter: null, boxes: { '97': 250 } },
      } as TaxModelParse,
    });
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.import.files')), {
      target: { files: [new File(['%PDF'], '390b.pdf', { type: 'application/pdf' })] },
    });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect((screen.getByLabelText(y('provisional')) as HTMLInputElement).value).toBe('80');
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.prepare') }));
    await waitFor(() => expect(api.businessApi.draft).toHaveBeenCalled());
    expect(api.businessApi.draft.mock.calls[0][2].vat).toEqual({
      offsetStart: 250,
      prorrata: { provisional: 80, special: false },
    });
  });
});
