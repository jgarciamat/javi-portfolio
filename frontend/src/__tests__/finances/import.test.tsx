import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';
import { readStatement } from '@modules/finances/application/hooks/useImport';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

/** jsdom's File has no arrayBuffer(): give it one. */
function statement(content: string | Uint8Array, name = 'extracto.csv'): File {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  return Object.assign(new File([bytes as BlobPart], name), {
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
}

const csv =
  'Fecha;Concepto;Importe;Categoría\n02/03/2026;MERCADONA;-54,30;Comida\n03/03/2026;NOMINA;1.800,00;\nbasura;;;\n';

const line = (s: string) => s.padEnd(80, ' ');
const norma43 = [
  line('11' + '0049' + '1234' + '1234567890' + '260301' + '260331'),
  line(
    '22' +
      '    ' +
      '1234' +
      '260303' +
      '260303' +
      '02' +
      '000' +
      '2' +
      '00000000180000' +
      '0000000002' +
      '            ' +
      'NOMINA MARZO'
  ),
  line('33' + '0049'),
  line('88' + '9999'),
].join('\n');

const accounts = [
  f.account({ id: 'a1', name: 'Principal' }),
  f.account({ id: 'a2', name: 'Efectivo', isDefault: true }),
  f.account({ id: 'a3', archived: true }),
];

function setup(onImported = jest.fn(), accountList = accounts) {
  const api = createFakeApi();
  const onClose = jest.fn();
  const view = renderWithProviders(
    <ImportModal accounts={accountList} onClose={onClose} onImported={onImported} />,
    { api, finances: false }
  );
  const upload = (file: File) =>
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
  return { ...view, onClose, onImported, upload };
}

beforeEach(() => {
  localStorage.clear();
  freezeTime();
});
afterEach(restoreTime);

describe('ImportModal', () => {
  it('maps CSV columns, previews and imports into the chosen account', async () => {
    const { api, upload, onImported, onClose } = setup();
    upload(statement(csv));
    expect(await screen.findByText(/extracto\.csv · CSV/)).toBeInTheDocument();
    expect(screen.getByText(/2 movimientos leídos/)).toBeInTheDocument();
    expect(
      screen.getByText(literal(tr('app.import.rowsSkipped', { count: 1 })))
    ).toBeInTheDocument();
    const account = screen.getByRole('combobox', { name: tr('app.transaction.form.account') });
    expect(account).toHaveValue('a2');
    fireEvent.change(account, { target: { value: 'a1' } });

    api.transactionApi.import.mockResolvedValue({
      dryRun: true,
      imported: 2,
      duplicates: 1,
      invalid: 1,
      rows: [
        {
          index: 0,
          status: 'imported',
          date: '2026-03-02',
          description: 'MERCADONA',
          amount: 54.3,
          type: 'EXPENSE',
          categoryName: 'Comida',
          categorySource: 'file',
        },
        {
          index: 1,
          status: 'imported',
          date: '2026-03-03',
          description: 'NOMINA',
          amount: 1800,
          type: 'INCOME',
          categoryName: 'Salario',
          categorySource: 'ai',
        },
        {
          index: 2,
          status: 'imported',
          date: '2026-03-04',
          description: 'RARO',
          amount: 1,
          type: 'EXPENSE',
          categoryName: 'Otros',
          categorySource: 'fallback',
        },
        { index: 3, status: 'imported', description: 'SIN FECHA', categoryName: 'Otros' },
        {
          index: 4,
          status: 'duplicate',
          date: '2026-03-02',
          description: 'MERCADONA',
          amount: 54.3,
          type: 'EXPENSE',
        },
        { index: 5, status: 'invalid', error: 'Fecha inválida' },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    expect(await screen.findByText('Salario ✨')).toBeInTheDocument();
    expect(screen.getByText('Otros ?')).toBeInTheDocument();
    expect(screen.getByText(tr('app.import.status.duplicate'))).toBeInTheDocument();
    expect(screen.getByText('Fecha inválida')).toBeInTheDocument();
    expect(api.transactionApi.import).toHaveBeenLastCalledWith(
      [
        { date: '2026-03-02', description: 'MERCADONA', amount: -54.3, category: 'Comida' },
        { date: '2026-03-03', description: 'NOMINA', amount: 1800, category: null },
      ],
      { accountId: 'a1', dryRun: true }
    );

    // Back to the mapping and forward again.
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.back') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    await screen.findByText(
      tr('app.import.previewSummary', { imported: 2, duplicates: 1, invalid: 1 })
    );

    api.transactionApi.import.mockResolvedValueOnce({
      dryRun: false,
      imported: 2,
      duplicates: 1,
      invalid: 0,
      rows: [],
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.confirm', { count: 2 }) }));
    expect(
      await screen.findByText(literal(tr('app.import.done', { imported: 2, duplicates: 1 })))
    ).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole('dialog')).getAllByRole('button', { name: tr('app.common.close') })[1]
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('switches between amount and debit/credit columns', async () => {
    const { upload } = setup();
    upload(
      statement('Date,Description,Debit,Credit\n2026-03-01,Coffee,2.50,\n2026-03-02,Refund,,10.00')
    );
    const debit = await screen.findByRole('combobox', { name: tr('app.import.col.debit') });
    const amount = screen.getByRole('combobox', { name: tr('app.import.col.amount') });
    expect(amount).toHaveValue('-1');
    fireEvent.change(amount, { target: { value: '2' } });
    expect(debit).toHaveValue('-1');
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.import.col.credit') }), {
      target: { value: '3' },
    });
    expect(amount).toHaveValue('-1');
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.import.col.category') }), {
      target: { value: '-1' },
    });
  });

  it('reads Norma 43 files without column mapping', async () => {
    const { upload } = setup(jest.fn(), [f.account({ id: 'a1' })]);
    upload(statement(norma43, 'extracto.n43'));
    expect(await screen.findByText('NOMINA MARZO')).toBeInTheDocument();
    expect(screen.getByText(/Norma 43/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: tr('app.import.col.date') })).toBeNull();
    expect(screen.queryByRole('combobox', { name: tr('app.transaction.form.account') })).toBeNull();
  });

  it('reports unreadable files, API errors and lets you choose another file', async () => {
    const { api, upload } = setup();
    upload(statement('solo una línea'));
    expect(await screen.findByText(tr('app.import.error.read'))).toBeInTheDocument();
    upload(statement(csv));
    await screen.findByText(/extracto\.csv · CSV/);
    api.transactionApi.import.mockRejectedValueOnce(new Error('Demasiadas filas'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    expect(await screen.findByText('Demasiadas filas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.otherFile') }));
    expect(screen.getByText(tr('app.import.choose'))).toBeInTheDocument();
    // Choosing nothing in the file dialog does nothing.
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [] } });
    expect(screen.getByText(tr('app.import.choose'))).toBeInTheDocument();
  });

  it('cannot confirm a preview without new movements', async () => {
    const { api, upload } = setup();
    upload(statement(csv));
    await screen.findByText(/extracto\.csv · CSV/);
    api.transactionApi.import.mockResolvedValueOnce({
      dryRun: true,
      imported: 0,
      duplicates: 2,
      invalid: 0,
      rows: [],
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    expect(
      await screen.findByRole('button', { name: tr('app.import.confirm', { count: 0 }) })
    ).toBeDisabled();
  });
});

describe('readStatement', () => {
  it('falls back to Windows-1252 when the file is not UTF-8', async () => {
    const latin1 = new Uint8Array([0x43, 0x41, 0xd1, 0x41]); // "CAÑA" in Windows-1252
    expect(await readStatement(statement(latin1))).toBe('CAÑA');
    expect(await readStatement(statement('Año'))).toBe('Año');
  });
});

describe('without accounts', () => {
  it('does not preselect any account', async () => {
    const { upload } = setup(jest.fn(), []);
    upload(statement(csv));
    await screen.findByText(/extracto\.csv · CSV/);
    expect(screen.queryByRole('combobox', { name: tr('app.transaction.form.account') })).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: tr('app.import.preview') })).toBeEnabled()
    );
  });
});
