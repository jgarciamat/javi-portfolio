import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  AutonomoManual,
  emptyManual,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import { I18nProvider } from '@core/i18n/I18nContext';
import * as reader from '@modules/finances/application/taxModelPdf';
import type { TaxModelParse } from '@modules/finances/domain/taxModelPdf';
import { tr } from '@test-utils/render';

jest.mock('@modules/finances/application/taxModelPdf');
const read = reader.readImportPdf as jest.MockedFunction<typeof reader.readImportPdf>;
const model = (parsed: TaxModelParse) => ({ kind: 'model' as const, parsed });

let latest: ManualForm = emptyManual();
const onPeriod = jest.fn();

function Harness() {
  const [form, setForm] = useState<ManualForm>(emptyManual());
  const [year, setYear] = useState(2026);
  latest = form;
  return (
    <AutonomoManual
      form={form}
      onChange={setForm}
      upTo={4}
      year={year}
      onPeriod={(y, q) => {
        setYear(y);
        onPeriod(y, q);
      }}
      years={[2025, 2026, 2027]}
    />
  );
}

const show = () =>
  render(
    <I18nProvider>
      <Harness />
    </I18nProvider>
  );

const pdf = (name = 'modelo.pdf', type = 'application/pdf') => new File(['%PDF'], name, { type });
const choose = (...files: File[]) =>
  fireEvent.change(screen.getByLabelText(tr('app.autonomo.import.files')), {
    target: { files },
  });
const upload = async (parsed: TaxModelParse | Error, file = pdf()) => {
  if (parsed instanceof Error) read.mockRejectedValueOnce(parsed);
  else read.mockResolvedValueOnce(model(parsed));
  choose(file);
  await waitFor(() => expect(read).toHaveBeenCalled());
};

const ok = (data: Partial<Extract<TaxModelParse, { ok: true }>['data']>): TaxModelParse => ({
  ok: true,
  data: { model: '130', year: 2026, quarter: 2, boxes: {}, ...data },
});

const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

const csv = (name: string, content: string) => {
  const data = new TextEncoder().encode(content).buffer as ArrayBuffer;
  return Object.assign(new File([data], name), { arrayBuffer: async () => data });
};

beforeEach(() => {
  read.mockReset();
  onPeriod.mockReset();
  localStorage.clear();
});

describe('Importing a filed modelo 130 or 303 from the same place', () => {
  it('takes the totals of a modelo 130 as the quarters already filed, and moves to the next quarter', async () => {
    show();
    await upload(
      ok({ boxes: { '01': 11300, '02': 2948.25, '05': 86.6, '06': 1425, '07': 158.75 } })
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      tr('app.autonomo.model.done.130', { year: 2026, quarter: 2, next: 3 })
    );
    expect(latest.prior).toEqual({
      on: true,
      income: '11300',
      expenses: '2948.25',
      payments: '245.35',
      withheld: '1425',
    });
    // Its figures are kept to compare them with the invoices.
    expect(latest.model130).toEqual({ year: 2026, quarter: 2, income: 11300, expenses: 2948.25 });
    expect(onPeriod).toHaveBeenCalledWith(2026, 3);
  });

  it('takes the income by rate and the current expenses of a modelo 303 into its quarter', async () => {
    show();
    await upload(
      ok({
        model: '303',
        quarter: 2,
        boxes: { '04': 1000, '07': 5000, '28': 725, '29': 146.2, '12': 3 },
      })
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      tr('app.autonomo.model.done.303', { year: 2026, quarter: 2 })
    );
    expect(value(`${tr('app.autonomo.income.r21')} 2`)).toBe('5000');
    expect(value(`${tr('app.autonomo.income.r10')} 2`)).toBe('1000');
    expect(latest.quarters[1].expenses).toEqual([
      { kind: 'other', amount: '871.2', vatRate: 21, days: '' },
    ]);
    expect(onPeriod).toHaveBeenCalledWith(2026, 2);
    // What the draft cannot use, and the rate that was a guess, are said.
    expect(screen.getByText(tr('app.autonomo.model.note.expense'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.autonomo.model.note.rate'))).toBeInTheDocument();
    expect(
      screen.getByText(tr('app.autonomo.model.note.ignored', { boxes: '12' }))
    ).toBeInTheDocument();
    // The other quarters are left alone.
    expect(latest.quarters[0].income.r21).toBe('');
  });

  it('keeps no expense when the 303 had none, and uses the year of the draft when the PDF has none', async () => {
    show();
    await upload(
      ok({ model: '303', year: null, quarter: 1, boxes: { '07': 100 } }),
      pdf('m.PDF', '')
    );
    await screen.findByRole('status');
    expect(latest.quarters[0].expenses).toEqual([]);
    expect(onPeriod).toHaveBeenCalledWith(2026, 1);
    expect(screen.queryByText(tr('app.autonomo.model.note.expense'))).toBeNull();
  });

  it('knows a PDF by its type even without the extension', async () => {
    show();
    await upload(ok({ model: '303', quarter: 1, boxes: { '07': 100 } }), pdf('justificante'));
    await screen.findByRole('status');
  });

  it('takes a book and a 303 of the same quarter dropped together: the 303 wins and its invoices leave', async () => {
    show();
    read.mockResolvedValueOnce(model(ok({ model: '303', quarter: 1, boxes: { '07': 900 } })));
    choose(
      csv(
        'ventas.csv',
        'Fecha;Cliente;Base imponible;Tipo IVA\n15/03/2026;Ana;100;21\n10/04/2026;Luis;50;21\n'
      ),
      pdf()
    );
    expect(
      await screen.findByText(tr('app.autonomo.model.note.invoices', { n: 1, quarter: 1 }))
    ).toBeInTheDocument();
    expect(latest.quarters[0].income.r21).toBe('900');
    expect(latest.invoices.map((i) => i.quarter)).toEqual([2]);
  });

  it('imports the books that come after a modelo 130 in the year of the PDF', async () => {
    show();
    read.mockResolvedValueOnce(model(ok({ year: 2025, quarter: 1, boxes: { '01': 10 } })));
    choose(
      pdf(),
      csv('ventas.csv', 'Fecha;Cliente;Base imponible;Tipo IVA\n15/05/2025;Ana;100;21\n')
    );
    expect(
      await screen.findByText(
        tr('app.autonomo.import.done.issued', { count: 1, year: 2025, quarters: 'T2' })
      )
    ).toBeInTheDocument();
    expect(onPeriod).toHaveBeenCalledWith(2025, 2);
  });

  it('says why a PDF cannot be used', async () => {
    show();
    const error = (key: string) =>
      waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(
          tr(`app.autonomo.model.error.${key}`, { years: '2025, 2026, 2027' })
        )
      );
    await upload(new Error('roto'));
    await error('unreadable');
    await upload({ ok: false, reason: 'unknownModel' });
    await error('unknownModel');
    await upload({ ok: false, reason: 'noBoxes' });
    await error('noBoxes');
    await upload(ok({ quarter: null, boxes: { '01': 1 } }));
    await error('noPeriod');
    await upload(ok({ model: '303', year: 2023, boxes: { '07': 1 } }));
    await error('year');
    await upload(ok({ quarter: 4, boxes: { '01': 1 } }));
    await error('lastQuarter');
    expect(onPeriod).not.toHaveBeenCalled();
    // Choosing nothing in the dialog does nothing.
    await act(async () => {
      choose();
    });
  });
});
