import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  AutonomoManual,
  emptyManual,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import { applyBook } from '@modules/finances/ui/components/InvoiceImport';
import { I18nProvider } from '@core/i18n/I18nContext';
import { tr } from '@test-utils/render';
import { buildXlsx, type XlsxCell, type XlsxSheet } from '../../../scripts/xlsx';

let latest: ManualForm = emptyManual();

function Harness({ year = 2026 }: { year?: number }) {
  const [form, setForm] = useState<ManualForm>(emptyManual());
  latest = form;
  return <AutonomoManual form={form} onChange={setForm} upTo={4} year={year} />;
}

const show = (year?: number) =>
  render(
    <I18nProvider>
      <Harness year={year} />
    </I18nProvider>
  );

const file = (name: string, content: Uint8Array | string): File => {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  return Object.assign(new File([data], name), { arrayBuffer: async () => data });
};

const workbook = (name: string, rows: XlsxCell[][], sheet = 'Hoja') =>
  file(name, buildXlsx([{ name: sheet, rows } as XlsxSheet], { sharedStrings: true }));

const upload = (label: string, f: File) =>
  fireEvent.change(screen.getByLabelText(tr(label)), { target: { files: [f] } });

const ISSUED: XlsxCell[][] = [
  ['Fecha expedición', 'Cliente', 'Base imponible', 'Tipo de IVA', 'Importe retenido del IRPF'],
  [{ date: '2026-01-15' }, 'Estudio Norte SL', 3000, 21, 450],
  [{ date: '2026-02-10' }, 'Taller Beta SL', 1500, 21, 225],
  [{ date: '2026-05-18' }, 'Librería Sur SC', 1000, 10, 0],
  [{ date: '2026-08-05' }, 'Editorial Este SL', 600, 4, 0],
  [{ date: '2026-09-01' }, 'Exportación', 250, 0, 0],
  [{ date: '2025-12-30' }, 'Del año pasado', 999, 21, 0],
];

const RECEIVED: XlsxCell[][] = [
  ['Fecha', 'Proveedor', 'Base imponible', 'Tipo IVA'],
  [{ date: '2026-01-05' }, 'Alquiler oficina', 400, 21],
  [{ date: '2026-02-10' }, 'Gestoría Pérez', 150, 21],
  [{ date: '2026-02-11' }, 'Gestoría Pérez', 50, 21],
  [{ date: '2026-05-30' }, 'Restaurante La Plaza', 55, 10],
  [{ date: '2026-07-01' }, 'Seguro de coche', 90, 5],
];

const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;
const incomeLabel = (rate: string, q: number) => `${tr(`app.autonomo.income.${rate}`)} ${q}`;
const withheldLabel = (q: number) => `${tr('app.autonomo.withheld')} ${q}`;

describe('Importing the invoice books of the self-employed', () => {
  it('offers a button and a template for each book', () => {
    show();
    for (const [kind, file] of [
      ['issued', 'facturas-emitidas.xlsx'],
      ['received', 'facturas-recibidas.xlsx'],
    ]) {
      expect(
        screen.getByRole('button', { name: tr(`app.autonomo.import.${kind}Button`) })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(tr(`app.autonomo.import.${kind}File`))).toBeInTheDocument();
      expect(
        screen
          .getAllByRole('link', { name: tr('app.autonomo.import.template') })
          .map((a) => a.getAttribute('href'))
      ).toContain(`/plantillas/${file}`);
    }
  });

  it('opens the file chooser from the button', () => {
    show();
    const input = screen.getByLabelText(tr('app.autonomo.import.issuedFile')) as HTMLInputElement;
    const click = jest.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.import.issuedButton') }));
    expect(click).toHaveBeenCalled();
  });

  it('fills the income of each quarter by VAT rate with the withholdings, and says what it did', async () => {
    show();
    upload('app.autonomo.import.issuedFile', workbook('emitidas.xlsx', ISSUED));
    const done = await screen.findByRole('status');
    expect(done).toHaveTextContent(
      tr('app.autonomo.import.done.issued', { count: 5, year: 2026, quarters: 'T1, T2, T3' })
    );
    expect(value(incomeLabel('r21', 1))).toBe('4500');
    expect(value(withheldLabel(1))).toBe('675');
    expect(value(incomeLabel('r10', 2))).toBe('1000');
    expect(value(incomeLabel('r4', 3))).toBe('600');
    expect(value(incomeLabel('r0', 3))).toBe('250');
    expect(value(incomeLabel('r21', 4))).toBe('');
    // The invoice of the year before is reported, not imported.
    expect(
      screen.getByText(tr('app.autonomo.import.skipped.year', { n: 1, year: 2026 }))
    ).toBeInTheDocument();
  });

  it('fills the expenses with VAT included, adds up the repeated ones and asks to check their kind', async () => {
    show();
    upload('app.autonomo.import.receivedFile', workbook('recibidas.xlsx', RECEIVED));
    expect(await screen.findByText(tr('app.autonomo.import.review'))).toBeInTheDocument();
    const kind = (id: string) => value(`${tr('app.autonomo.expenseKind')} ${id}`);
    const amount = (id: string) => value(`${tr('app.autonomo.expenseAmount')} ${id}`);
    expect(kind('1.1')).toBe('rent');
    expect(amount('1.1')).toBe('484');
    // The two invoices of the gestoría are one line: 150 + 50 = 200 plus 21 % VAT.
    expect(kind('1.2')).toBe('management');
    expect(amount('1.2')).toBe('242');
    expect(kind('2.1')).toBe('meals');
    expect(amount('2.1')).toBe('60.5');
    expect(value(`${tr('app.autonomo.days')} 2.1`)).toBe('1');
    // A 5 % rate is something the draft does not take: reported.
    expect(
      screen.getByText(tr('app.autonomo.import.skipped.rate', { n: 1, year: 2026 }))
    ).toBeInTheDocument();
  });

  it('does not duplicate anything when the same book is imported again', async () => {
    show();
    for (let i = 0; i < 2; i++) {
      upload('app.autonomo.import.issuedFile', workbook('emitidas.xlsx', ISSUED));
      await screen.findByText(
        tr('app.autonomo.import.done.issued', { count: 5, year: 2026, quarters: 'T1, T2, T3' })
      );
      upload('app.autonomo.import.receivedFile', workbook('recibidas.xlsx', RECEIVED));
      await screen.findByText(tr('app.autonomo.import.review'));
    }
    expect(value(incomeLabel('r21', 1))).toBe('4500');
    expect(latest.quarters[0].expenses).toHaveLength(2);
  });

  it('keeps what was typed in the quarters the file does not have', async () => {
    show();
    fireEvent.change(screen.getByLabelText(incomeLabel('r21', 4)), { target: { value: '777' } });
    upload('app.autonomo.import.issuedFile', workbook('emitidas.xlsx', ISSUED));
    await screen.findByRole('status');
    expect(value(incomeLabel('r21', 4))).toBe('777');
  });

  it('reads a CSV with Spanish numbers', async () => {
    show();
    upload(
      'app.autonomo.import.issuedFile',
      file(
        'emitidas.csv',
        'Fecha;Base imponible;Tipo IVA;Retención IRPF %\n15/03/2026;"1.234,50";21;15\n'
      )
    );
    await screen.findByRole('status');
    expect(value(incomeLabel('r21', 1))).toBe('1234.5');
    expect(value(withheldLabel(1))).toBe('185.18');
  });

  it('says why a file cannot be used', async () => {
    show();
    const error = async (key: string) =>
      expect(await screen.findByRole('alert')).toHaveTextContent(
        tr(`app.autonomo.import.error.${key}`, { year: 2026 })
      );
    upload('app.autonomo.import.issuedFile', file('nada.csv', 'Hola\nMundo\n'));
    await error('noHeader');
    upload(
      'app.autonomo.import.issuedFile',
      file('poco.csv', 'Fecha;Base imponible\n01/01/2026;100\n')
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(tr('app.autonomo.import.error.noColumns'))
    );
    upload('app.autonomo.import.issuedFile', file('viejo.xls', 'x'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        tr('app.autonomo.import.error.unsupported')
      )
    );
    upload('app.autonomo.import.issuedFile', file('roto.xlsx', 'no es un zip'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        tr('app.autonomo.import.error.unreadable')
      )
    );
    upload(
      'app.autonomo.import.issuedFile',
      workbook('otro-año.xlsx', [
        ['Fecha', 'Base imponible', 'Tipo IVA'],
        [{ date: '2024-01-01' }, 100, 21],
      ])
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        tr('app.autonomo.import.error.empty', { year: 2026 })
      )
    );
    expect(
      screen.getByText(tr('app.autonomo.import.skipped.year', { n: 1, year: 2026 }))
    ).toBeInTheDocument();
    // A file the browser cannot even read is the same as one that is broken.
    const unreadable = Object.assign(new File(['x'], 'raro.csv'), {
      arrayBuffer: async () => {
        throw new Error('disco');
      },
    });
    upload('app.autonomo.import.issuedFile', unreadable);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        tr('app.autonomo.import.error.unreadable')
      )
    );
    // Choosing nothing in the dialog does nothing.
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.import.issuedFile')), {
      target: { files: [] },
    });
  });

  it('applyBook leaves the other quarters and the other book alone', () => {
    const form = emptyManual();
    form.quarters[1].income.r21 = '10';
    const next = applyBook(form, 'received', [
      {
        date: '2026-01-05',
        quarter: 1,
        base: 100,
        vatRate: 21,
        vat: 21,
        total: 121,
        withheld: 0,
        concept: 'Alquiler',
      },
    ]);
    expect(next.quarters[0].expenses).toEqual([
      { kind: 'rent', amount: '121', vatRate: 21, days: '' },
    ]);
    expect(next.quarters[1].income.r21).toBe('10');
    expect(within(document.body).queryByRole('alert')).toBeNull();
  });
});
