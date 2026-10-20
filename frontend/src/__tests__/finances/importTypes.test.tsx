import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import type { ImportRowDTO } from '@modules/finances/domain/types';
import { OWN_EXPORT_CSV } from '@test-utils/importCsv';

function statement(content: string, name = 'extracto.csv'): File {
  const bytes = new TextEncoder().encode(content);
  return Object.assign(new File([bytes as BlobPart], name), {
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
}

function setup() {
  const api = createFakeApi();
  renderWithProviders(
    <ImportModal
      accounts={[f.account({ id: 'a1', isDefault: true })]}
      onClose={jest.fn()}
      onImported={jest.fn()}
    />,
    { api, finances: false }
  );
  const upload = (file: File) =>
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
  return { api, upload };
}

const typeSelects = () =>
  screen.getAllByRole('combobox').filter((el) => el.className.includes('import-type-select'));

describe('ImportModal: types from the CSV', () => {
  it('reads our own export with its types, ignores the summary and lists every row', async () => {
    const { api, upload } = setup();
    upload(statement(OWN_EXPORT_CSV));
    expect(await screen.findByText(/5 movimientos leídos/)).toBeInTheDocument();
    expect(screen.queryByText(/no se pudieron leer/)).not.toBeInTheDocument();
    expect(typeSelects().map((s) => (s as HTMLSelectElement).value)).toEqual([
      'EXPENSE',
      'EXPENSE',
      'SAVING',
      'INCOME',
      'EXPENSE',
    ]);
    expect(screen.getByRole('region', { name: 'Movimientos leídos' })).toBeInTheDocument();

    // The Tipo column is offered in the mapping, as is Notas.
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveValue('3');

    api.transactionApi.import.mockResolvedValue({
      dryRun: true,
      imported: 3,
      duplicates: 0,
      invalid: 0,
      rows: [
        {
          index: 0,
          status: 'imported',
          date: '2026-03-09',
          description: 'a',
          amount: 22,
          type: 'EXPENSE',
          categoryName: 'Otros',
        },
        {
          index: 1,
          status: 'imported',
          date: '2026-03-07',
          description: 'b',
          amount: 900,
          type: 'SAVING',
          categoryName: 'Ahorro',
        },
        {
          index: 2,
          status: 'imported',
          date: '2026-03-06',
          description: 'c',
          amount: 480,
          type: 'INCOME',
          categoryName: 'Vivienda',
        },
        { index: 3, status: 'duplicate', date: '2026-03-06', description: 'd', amount: 1 },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    const region = await screen.findByRole('region', { name: tr('app.import.preview') });
    expect(within(region).getByText('Gasto')).toHaveClass('tx-badge-expense');
    expect(
      within(region)
        .getAllByText('Ahorro')
        .some((el) => el.classList.contains('import-badge-saving'))
    ).toBe(true);
    expect(within(region).getByText('Ingreso')).toHaveClass('tx-badge-income');
    const sent = api.transactionApi.import.mock.calls[0][0];
    expect(sent.map((r: ImportRowDTO) => [r.type, r.amount])).toEqual([
      ['EXPENSE', -22],
      ['EXPENSE', -57.2],
      ['SAVING', 900],
      ['INCOME', 480],
      ['EXPENSE', -5.5],
    ]);
  });

  it('lets you correct the type row by row, and flags unrecognised values', async () => {
    const { api, upload } = setup();
    upload(
      statement(
        'Fecha;Concepto;Tipo;Importe\n01/03/2026;Pan;Bizum;-3\n02/03/2026;Sueldo;Income;100\nxx;;;'
      )
    );
    expect(await screen.findByText(/2 movimientos leídos/)).toBeInTheDocument();
    expect(screen.getByText(tr('app.import.typeReview'))).toBeInTheDocument();
    expect(screen.getByRole('region', { name: tr('app.import.skippedLines') })).toHaveTextContent(
      '4'
    );
    const [first] = typeSelects();
    expect(first).toHaveValue('EXPENSE');
    fireEvent.change(first, { target: { value: 'SAVING' } });
    await waitFor(() => expect(typeSelects()[0]).toHaveValue('SAVING'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    await waitFor(() => expect(api.transactionApi.import).toHaveBeenCalled());
    expect(api.transactionApi.import.mock.calls[0][0][0]).toMatchObject({
      type: 'SAVING',
      amount: 3,
    });
  });

  it('shows rows without a Tipo column by the sign of the amount and a dash in the preview', async () => {
    const { api, upload } = setup();
    api.transactionApi.import.mockResolvedValue({
      dryRun: true,
      imported: 1,
      duplicates: 0,
      invalid: 0,
      rows: [{ index: 0, status: 'invalid', error: 'x' }],
    });
    upload(statement('Fecha,Concepto,Importe\n2026-03-01,A,-5\n2026-03-02,B,7'));
    await screen.findByText(/2 movimientos leídos/);
    expect(typeSelects().map((s) => (s as HTMLSelectElement).value)).toEqual(['EXPENSE', 'INCOME']);
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    expect(await screen.findByText('x')).toBeInTheDocument();
  });
});
