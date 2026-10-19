import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  AutonomoManual,
  emptyManual,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import { I18nProvider } from '@core/i18n/I18nContext';
import { tr } from '@test-utils/render';
import { buildXlsx, type XlsxCell, type XlsxSheet } from '../../../scripts/xlsx';

let latest: ManualForm = emptyManual();

function Harness({ year = 2026 }: { year?: number }) {
  const [form, setForm] = useState<ManualForm>(emptyManual());
  latest = form;
  return (
    <AutonomoManual
      form={form}
      onChange={setForm}
      upTo={4}
      year={year}
      onPeriod={jest.fn()}
      years={[2025, 2026, 2027]}
    />
  );
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

const input = () => screen.getByLabelText(tr('app.autonomo.import.files'));
const upload = (...files: File[]) => fireEvent.change(input(), { target: { files } });

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
const issuedDone = tr('app.autonomo.import.done.issued', {
  count: 5,
  year: 2026,
  quarters: 'T1, T2, T3',
});

beforeEach(() => localStorage.clear());

describe('One place to import invoice books', () => {
  it('has one button, one file input for several files and the templates', () => {
    show();
    expect(screen.getAllByRole('button', { name: tr('app.autonomo.import.choose') })).toHaveLength(
      1
    );
    expect(input()).toHaveAttribute('multiple');
    const templates = screen
      .getAllByRole('link', { name: new RegExp(tr('app.autonomo.import.template')) })
      .map((a) => a.getAttribute('href'));
    expect(templates).toEqual([
      '/plantillas/facturas-emitidas.xlsx',
      '/plantillas/facturas-recibidas.xlsx',
      '/plantillas/modelo-130-plantilla.pdf',
      '/plantillas/modelo-303-plantilla.pdf',
      '/plantillas/modelo-111-plantilla.pdf',
      '/plantillas/modelo-115-plantilla.pdf',
    ]);
    const click = jest.spyOn(input(), 'click');
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.import.choose') }));
    expect(click).toHaveBeenCalled();
  });

  it('knows an issued book by its columns, fills the income by VAT rate and says what it did', async () => {
    show();
    upload(workbook('libro.xlsx', ISSUED));
    expect(await screen.findByRole('status')).toHaveTextContent(issuedDone);
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
    expect(screen.getByText('libro.xlsx')).toBeInTheDocument();
    expect(latest.invoices).toHaveLength(5);
  });

  it('knows a received book by its supplier column, groups the expenses and asks to check their kind', async () => {
    show();
    upload(workbook('libro.xlsx', RECEIVED));
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

  it('does not duplicate anything when the same books are imported again', async () => {
    show();
    for (let i = 0; i < 2; i++) {
      upload(workbook('emitidas.xlsx', ISSUED), workbook('recibidas.xlsx', RECEIVED));
      await screen.findByText(tr('app.autonomo.import.review'));
    }
    expect(value(incomeLabel('r21', 1))).toBe('4500');
    expect(latest.quarters[0].expenses).toHaveLength(2);
    expect(latest.invoices).toHaveLength(9);
  });

  it('keeps what was typed in the quarters the file does not have', async () => {
    show();
    fireEvent.change(screen.getByLabelText(incomeLabel('r21', 4)), { target: { value: '777' } });
    upload(workbook('emitidas.xlsx', ISSUED));
    await screen.findByRole('status');
    expect(value(incomeLabel('r21', 4))).toBe('777');
  });

  it('reads a CSV with Spanish numbers', async () => {
    show();
    upload(
      file(
        'ventas.csv',
        'Fecha;Base imponible;Tipo IVA;Retención IRPF %\n15/03/2026;"1.234,50";21;15\n'
      )
    );
    await screen.findByRole('status');
    expect(value(incomeLabel('r21', 1))).toBe('1234.5');
    expect(value(withheldLabel(1))).toBe('185.18');
  });

  it('imports both books of a workbook that has a sheet for each', async () => {
    show();
    upload(
      file(
        'contabilidad.xlsx',
        buildXlsx(
          [
            { name: 'Ingresos', rows: ISSUED },
            { name: 'Gastos', rows: RECEIVED },
            { name: 'Notas', rows: [['Nada que ver aquí']] },
          ] as XlsxSheet[],
          { sharedStrings: true }
        )
      )
    );
    await screen.findByText(tr('app.autonomo.import.review'));
    expect(screen.getByText(issuedDone)).toBeInTheDocument();
    expect(latest.invoices.filter((i) => i.book === 'received')).toHaveLength(4);
  });

  it('asks whether a book says nothing of itself, and imports it as the person says', async () => {
    show();
    const rows = 'Fecha;Base imponible;Tipo IVA\n15/03/2026;100;21\n';
    upload(file('libro.csv', rows), file('otro.csv', rows));
    const groups = await screen.findAllByRole('group', {
      name: /libro\.csv|otro\.csv/,
    });
    expect(groups).toHaveLength(2);
    expect(within(groups[0]).getByText(tr('app.autonomo.import.ask'))).toBeInTheDocument();
    fireEvent.click(
      within(groups[0]).getByRole('button', { name: tr('app.autonomo.import.are.received') })
    );
    expect(await screen.findByText(tr('app.autonomo.import.review'))).toBeInTheDocument();
    expect(latest.quarters[0].expenses).toEqual([
      { kind: 'other', amount: '121', vatRate: 21, days: '' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.import.are.issued') }));
    await waitFor(() => expect(latest.quarters[0].income.r21).toBe('100'));
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('uses the name of the file when the sheet does not say which book it is', async () => {
    show();
    upload(file('facturas-recibidas.csv', 'Fecha;Base imponible;Tipo IVA\n15/03/2026;100;21\n'));
    await screen.findByText(tr('app.autonomo.import.review'));
  });

  it('says why a file cannot be used', async () => {
    show();
    const alert = (key: string) =>
      waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(
          tr(`app.autonomo.import.error.${key}`, { year: 2026 })
        )
      );
    upload(file('nada.csv', 'Hola\nMundo\n'));
    await alert('noHeader');
    upload(file('poco.csv', 'Fecha;Base imponible\n01/01/2026;100\n'));
    fireEvent.click(
      await screen.findByRole('button', { name: tr('app.autonomo.import.are.issued') })
    );
    await alert('noColumns');
    upload(file('viejo.xls', 'x'));
    await alert('unsupported');
    upload(file('roto.xlsx', 'no es un zip'));
    await alert('unreadable');
    upload(
      workbook('emitidas-viejas.xlsx', [
        ['Fecha', 'Cliente', 'Base imponible', 'Tipo IVA'],
        [{ date: '2024-01-01' }, 'Cliente', 100, 21],
      ])
    );
    await alert('empty');
    expect(
      screen.getByText(tr('app.autonomo.import.skipped.year', { n: 1, year: 2026 }))
    ).toBeInTheDocument();
    // A file the browser cannot even read is the same as one that is broken.
    const unreadable = Object.assign(new File(['x'], 'raro.csv'), {
      arrayBuffer: async () => {
        throw new Error('disco');
      },
    });
    upload(unreadable);
    await alert('unreadable');
    // Choosing nothing in the dialog does nothing: the last result stays.
    fireEvent.change(input(), { target: { files: [] } });
    fireEvent.change(input(), { target: { files: null } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('takes files dropped on the zone, several at a time', async () => {
    show();
    const zone = screen.getByText(tr('app.autonomo.import.drop')).parentElement as HTMLElement;
    fireEvent.dragOver(zone);
    expect(zone).toHaveClass('is-dragging');
    // Moving over a child of the zone keeps it lit; leaving it does not.
    // jsdom has no DragEvent: a mouse event carries where the pointer went.
    const leave = (to: Element) =>
      act(() => {
        zone.dispatchEvent(new MouseEvent('dragleave', { bubbles: true, relatedTarget: to }));
      });
    leave(screen.getByText(tr('app.autonomo.import.drop')));
    expect(zone).toHaveClass('is-dragging');
    leave(document.body);
    expect(zone).not.toHaveClass('is-dragging');
    fireEvent.dragOver(zone);
    fireEvent.drop(zone, {
      dataTransfer: { files: [workbook('e.xlsx', ISSUED), workbook('r.xlsx', RECEIVED)] },
    });
    expect(zone).not.toHaveClass('is-dragging');
    await screen.findByText(tr('app.autonomo.import.review'));
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(latest.invoices).toHaveLength(9);
  });

  it('starts from the kind the person chose for a supplier before', async () => {
    localStorage.setItem('mm_autonomo_kinds', JSON.stringify({ 'gestoria perez': 'training' }));
    show();
    upload(workbook('r.xlsx', RECEIVED));
    await screen.findByText(tr('app.autonomo.import.review'));
    expect(latest.quarters[0].expenses.map((e) => e.kind)).toEqual(['rent', 'training']);
  });
});
