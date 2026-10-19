import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  AutonomoManual,
  emptyManual,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import { I18nProvider } from '@core/i18n/I18nContext';
import { translate } from '@core/i18n/I18nContext';
import { tr } from '@test-utils/render';
import { buildXlsx, type XlsxCell, type XlsxSheet } from '../../../scripts/xlsx';

let latest: ManualForm = emptyManual();

function Harness() {
  const [form, setForm] = useState<ManualForm>(emptyManual());
  latest = form;
  return (
    <AutonomoManual
      form={form}
      onChange={setForm}
      upTo={4}
      year={2026}
      onPeriod={jest.fn()}
      years={[2026]}
    />
  );
}

const file = (name: string, rows: XlsxCell[][], sheet = 'Hoja') => {
  const bytes = buildXlsx([{ name: sheet, rows } as XlsxSheet], { sharedStrings: true });
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return Object.assign(new File([data as ArrayBuffer], name), {
    arrayBuffer: async () => data as ArrayBuffer,
  });
};

const RECEIVED: XlsxCell[][] = [
  ['Fecha', 'Proveedor', 'Base imponible', 'Tipo IVA'],
  [{ date: '2026-01-05' }, 'Cafetería Sol', 10, 10],
  [{ date: '2026-02-05' }, 'Cafetería Sol', 20, 10],
  [{ date: '2026-04-05' }, 'Cafetería Sol', 30, 10],
  [{ date: '2026-02-10' }, 'Gestoría Pérez', 150, 21],
  [{ date: '2026-02-20' }, '', -20, 21],
];
const ISSUED: XlsxCell[][] = [
  ['Fecha', 'Cliente', 'Base imponible', 'Tipo IVA', 'Retención'],
  [{ date: '2026-01-15' }, 'Estudio Norte SL', 1000, 21, 150],
  [{ date: '2026-02-15' }, 'Taller Beta', 500, 21, 0],
];

const show = async () => {
  render(
    <I18nProvider>
      <Harness />
    </I18nProvider>
  );
  fireEvent.change(screen.getByLabelText(tr('app.autonomo.import.files')), {
    target: { files: [file('r.xlsx', RECEIVED), file('e.xlsx', ISSUED)] },
  });
  await screen.findAllByRole('status');
  await screen.findByRole('table', { name: tr('app.autonomo.review.issued', { n: 2 }) });
};

const name = (who: string, date: string) => tr('app.autonomo.review.invoice', { who, date });
const kindSelect = (who: string, date: string) =>
  screen.getByLabelText(tr('app.autonomo.review.kindOf', { invoice: name(who, date) }));
const include = (who: string, date: string) =>
  screen.getByLabelText(tr('app.autonomo.review.includeOf', { invoice: name(who, date) }));
const kinds = (q: number) => latest.quarters[q - 1].expenses.map((e) => [e.kind, e.amount]);

beforeEach(() => localStorage.clear());

describe('Reviewing the imported invoices', () => {
  it('lists every invoice of each book with its figures', async () => {
    await show();
    const received = screen.getByRole('table', {
      name: tr('app.autonomo.review.received', { n: 5 }),
    });
    expect(within(received).getAllByRole('row')).toHaveLength(6);
    expect(
      within(received).getByRole('columnheader', { name: tr('app.autonomo.review.col.kind') })
    ).toBeInTheDocument();
    const issued = screen.getByRole('table', { name: tr('app.autonomo.review.issued', { n: 2 }) });
    const first = within(issued).getAllByRole('row')[1];
    expect(within(first).getByText('Estudio Norte SL')).toBeInTheDocument();
    expect(within(first).getByText('T1')).toBeInTheDocument();
    expect(within(first).getByText('21 %')).toBeInTheDocument();
    expect(within(first).getByText(/1210,00/)).toBeInTheDocument();
    expect(within(first).getByText(/150,00/)).toBeInTheDocument();
    // Every cell says what it is, for the phone layout where the headings are hidden.
    expect(within(first).getAllByRole('cell')[1]).toHaveAttribute(
      'data-label',
      tr('app.autonomo.review.col.date')
    );
    // A row with no supplier still has a name, and a credit note stands out.
    expect(screen.getByText(tr('app.autonomo.review.noName'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.autonomo.review.noName')).closest('tr')).toHaveClass(
      'is-negative'
    );
    expect(screen.getByText(tr('app.autonomo.review.summary', { n: 7 }))).toBeInTheDocument();
  });

  it('works the quarter out again when the kind of an invoice changes, and remembers the supplier', async () => {
    await show();
    expect(kinds(1)).toEqual([
      ['meals', '11'],
      ['meals', '22'],
      ['management', '181.5'],
      ['other', '-24.2'],
    ]);
    fireEvent.change(kindSelect('Gestoría Pérez', '10 feb 2026'), {
      target: { value: 'software' },
    });
    expect(kinds(1)[2]).toEqual(['software', '181.5']);
    expect(JSON.parse(localStorage.getItem('mm_autonomo_kinds') as string)).toEqual({
      'gestoria perez': 'software',
    });
    // No other invoice of that supplier: nothing to offer.
    expect(screen.queryByRole('button', { name: /Aplicar/ })).toBeNull();
  });

  it('offers the same kind for the other invoices of the supplier, in every quarter', async () => {
    await show();
    fireEvent.change(kindSelect('Cafetería Sol', '5 ene 2026'), { target: { value: 'clients' } });
    // The meal became a line of its own kind; the others are still meals until the offer is taken.
    expect(kinds(1).slice(0, 2)).toEqual([
      ['clients', '11'],
      ['meals', '22'],
    ]);
    const offer = screen.getByText(
      tr('app.autonomo.review.offer', {
        n: 2,
        supplier: 'Cafetería Sol',
        kind: tr('app.autonomo.kind.clients'),
      })
    );
    expect(offer).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.autonomo.review.applyAll', { n: 2 }) })
    );
    expect(kinds(1)).toEqual([
      ['clients', '33'],
      ['management', '181.5'],
      ['other', '-24.2'],
    ]);
    expect(kinds(2)).toEqual([['clients', '33']]);
    expect(screen.queryByText(offer.textContent as string)).toBeNull();
  });

  it('leaves an invoice out and back in, and a quarter with all of them out is empty', async () => {
    await show();
    fireEvent.change(kindSelect('Cafetería Sol', '5 abr 2026'), { target: { value: 'rent' } });
    expect(screen.getByRole('button', { name: /Aplicar/ })).toBeInTheDocument();
    const box = include('Cafetería Sol', '5 abr 2026') as HTMLInputElement;
    fireEvent.click(box);
    // Leaving one out closes the offer and empties the quarter it was alone in.
    expect(screen.queryByRole('button', { name: /Aplicar/ })).toBeNull();
    expect(box.checked).toBe(false);
    expect(box.closest('tr')).toHaveClass('is-excluded');
    expect(kindSelect('Cafetería Sol', '5 abr 2026')).toBeDisabled();
    expect(latest.quarters[1].expenses).toEqual([]);
    expect(
      screen.getByText(new RegExp(tr('app.autonomo.review.excluded', { n: 1 })))
    ).toBeInTheDocument();
    fireEvent.click(box);
    expect(kinds(2)).toEqual([['rent', '33']]);
    // The issued ones too.
    fireEvent.click(include('Estudio Norte SL', '15 ene 2026'));
    expect(latest.quarters[0].income.r21).toBe('500');
    expect(latest.quarters[0].withheld).toBe('');
    // With every issued invoice of the quarter out, its income is empty.
    fireEvent.click(include('Taller Beta', '15 feb 2026'));
    expect(latest.quarters[0].income.r21).toBe('');
  });

  it('folds away with a button that says whether it is open', async () => {
    await show();
    const toggle = screen.getByRole('button', { name: tr('app.autonomo.review.hide') });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'autonomo-review-body');
    fireEvent.click(toggle);
    expect(screen.queryByRole('table')).toBeNull();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent(tr('app.autonomo.review.show'));
    fireEvent.click(toggle);
    expect(screen.getAllByRole('table')).toHaveLength(2);
  });

  it('speaks English too', () => {
    expect(translate('en', 'app.autonomo.review.col.kind')).toBe('Kind of expense');
  });
});
