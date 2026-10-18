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
const read = reader.readTaxModelPdf as jest.MockedFunction<typeof reader.readTaxModelPdf>;

let latest: ManualForm = emptyManual();
const onPeriod = jest.fn();

function Harness() {
  const [form, setForm] = useState<ManualForm>(emptyManual());
  latest = form;
  return (
    <AutonomoManual
      form={form}
      onChange={setForm}
      upTo={4}
      year={2026}
      onPeriod={onPeriod}
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

const pdf = (name = 'modelo.pdf') => new File(['%PDF'], name, { type: 'application/pdf' });
const upload = async (model: '130' | '303', parsed: TaxModelParse | Error) => {
  if (parsed instanceof Error) read.mockRejectedValueOnce(parsed);
  else read.mockResolvedValueOnce(parsed);
  fireEvent.change(screen.getByLabelText(tr(`app.autonomo.model.${model}File`)), {
    target: { files: [pdf()] },
  });
  await waitFor(() => expect(read).toHaveBeenCalled());
};

const ok = (data: Partial<Extract<TaxModelParse, { ok: true }>['data']>): TaxModelParse => ({
  ok: true,
  data: { model: '130', year: 2026, quarter: 2, boxes: {}, ...data },
});

const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

beforeEach(() => {
  read.mockReset();
  onPeriod.mockReset();
});

describe('Importing a filed modelo 130 or 303', () => {
  it('has a button and a PDF template for each model', () => {
    show();
    for (const model of ['130', '303']) {
      expect(
        screen.getByRole('button', { name: tr(`app.autonomo.model.${model}Button`) })
      ).toBeInTheDocument();
      expect(
        screen
          .getAllByRole('link', { name: tr('app.autonomo.model.template') })
          .map((a) => a.getAttribute('href'))
      ).toContain(`/plantillas/modelo-${model}-plantilla.pdf`);
    }
    const input = screen.getByLabelText(tr('app.autonomo.model.130File')) as HTMLInputElement;
    const click = jest.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.model.130Button') }));
    expect(click).toHaveBeenCalled();
  });

  it('takes the totals of a modelo 130 as the quarters already filed, and moves to the next quarter', async () => {
    show();
    await upload(
      '130',
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
    expect(onPeriod).toHaveBeenCalledWith(2026, 3);
  });

  it('takes the income by rate and the current expenses of a modelo 303 into its quarter', async () => {
    show();
    await upload(
      '303',
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
    await upload('303', ok({ model: '303', year: null, quarter: 1, boxes: { '07': 100 } }));
    await screen.findByRole('status');
    expect(latest.quarters[0].expenses).toEqual([]);
    expect(onPeriod).toHaveBeenCalledWith(2026, 1);
    expect(screen.queryByText(tr('app.autonomo.model.note.expense'))).toBeNull();
  });

  it('says why a PDF cannot be used', async () => {
    show();
    const error = async (key: string) =>
      expect(await screen.findByRole('alert')).toHaveTextContent(
        tr(`app.autonomo.model.error.${key}`)
      );
    await upload('130', new Error('roto'));
    await error('unreadable');
    await upload('130', { ok: false, reason: 'unknownModel' });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        tr('app.autonomo.model.error.unknownModel')
      )
    );
    await upload('130', { ok: false, reason: 'noBoxes' });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(tr('app.autonomo.model.error.noBoxes'))
    );
    await upload('130', ok({ model: '303', boxes: { '07': 1 } }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(tr('app.autonomo.model.error.is303'))
    );
    await upload('303', ok({ model: '130', boxes: { '01': 1 } }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(tr('app.autonomo.model.error.is130'))
    );
    await upload('130', ok({ quarter: null, boxes: { '01': 1 } }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(tr('app.autonomo.model.error.noPeriod'))
    );
    await upload('303', ok({ model: '303', year: 2023, boxes: { '07': 1 } }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        tr('app.autonomo.model.error.year', { years: '2025, 2026, 2027' })
      )
    );
    await upload('130', ok({ quarter: 4, boxes: { '01': 1 } }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        tr('app.autonomo.model.error.lastQuarter')
      )
    );
    expect(onPeriod).not.toHaveBeenCalled();
    // Choosing nothing in the dialog does nothing.
    await act(async () => {
      fireEvent.change(screen.getByLabelText(tr('app.autonomo.model.130File')), {
        target: { files: [] },
      });
    });
  });
});
