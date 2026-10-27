import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

jest.mock('@modules/tools/application/readPdf', () => ({
  ...jest.requireActual('@modules/tools/application/readPdf'),
  readPdfPages: jest.fn(),
}));

const readPdfPages = jest.requireMock('@modules/tools/application/readPdf')
  .readPdfPages as jest.Mock;

const at = (y: number, ...cells: [number, string][]) => cells.map(([x, str]) => ({ x, y, str }));
const ibercaja = (balance2: string) => [
  [
    ...at(760, [50, 'Consulta de movimientos IBERCAJA']),
    ...at(740, [50, 'De 01/10/2026 a 21/10/2026']),
    ...at(700, [50, '16 oct.'], [130, 'TARJETA VISA'], [410, '-4,00 €'], [490, '96,00 €']),
    ...at(690, [130, 'TIENDA DE EJEMPLO']),
    ...at(670, [50, '15 oct.'], [130, 'TARJETA VISA'], [410, '-5,00 €'], [490, balance2]),
  ],
];

const pdf = (name = 'extracto.pdf', type = 'application/pdf') => new File(['x'], name, { type });

function setup() {
  const api = createFakeApi();
  renderWithProviders(
    <ImportModal accounts={[f.account({ id: 'a1' })]} onClose={jest.fn()} onImported={jest.fn()} />,
    {
      api,
      finances: false,
    }
  );
  const upload = (file: File) =>
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
  return { api, upload };
}

beforeEach(() => {
  localStorage.clear();
  freezeTime();
});
afterEach(restoreTime);

describe('ImportModal with a PDF statement', () => {
  it('accepts PDFs, shows the bank and previews the movements as usual', async () => {
    const { api, upload } = setup();
    expect(document.querySelector('input[type="file"]')).toHaveAttribute(
      'accept',
      expect.stringContaining('.pdf')
    );
    readPdfPages.mockResolvedValueOnce(ibercaja('100,00 €'));
    upload(pdf());
    expect(await screen.findByText(/extracto\.pdf · PDF/)).toBeInTheDocument();
    expect(screen.getByText(tr('app.import.pdfBank', { bank: 'Ibercaja' }))).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('TARJETA VISA - TIENDA DE EJEMPLO')).toBeInTheDocument();
    expect(screen.queryByText(tr('app.import.changeColumns'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    await waitFor(() => expect(api.transactionApi.import).toHaveBeenCalled());
    expect(api.transactionApi.import.mock.calls[0][0]).toEqual([
      { date: '2026-10-15', description: 'TARJETA VISA', amount: -5 },
      { date: '2026-10-16', description: 'TARJETA VISA - TIENDA DE EJEMPLO', amount: -4 },
    ]);
  });

  it('warns, without blocking, when the balances do not follow', async () => {
    const { upload } = setup();
    readPdfPages.mockResolvedValueOnce(ibercaja('500,00 €'));
    upload(pdf('otro.pdf', ''));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      tr('app.import.pdfBalance', { count: 1 })
    );
    expect(screen.getByRole('button', { name: tr('app.import.preview') })).toBeEnabled();
  });

  it('reads any dated table as a generic PDF and then a CSV again', async () => {
    const { upload } = setup();
    readPdfPages.mockResolvedValueOnce([
      at(700, [20, '01/03/2026'], [100, 'COMPRA'], [300, '-1,00']),
    ]);
    upload(pdf());
    expect(await screen.findByText(tr('app.import.pdfGeneric'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.otherFile') }));
    upload(
      Object.assign(new File(['Fecha;Concepto;Importe\n02/03/2026;PAN;-1,00\n'], 'a.csv'), {
        arrayBuffer: async () =>
          new TextEncoder().encode('Fecha;Concepto;Importe\n02/03/2026;PAN;-1,00\n').buffer,
      })
    );
    expect(await screen.findByText(/a\.csv · CSV/)).toBeInTheDocument();
    expect(screen.queryByText(tr('app.import.pdfGeneric'))).toBeNull();
  });

  it('explains scanned, unrecognised, too big and unreadable PDFs', async () => {
    const { upload } = setup();
    readPdfPages.mockResolvedValueOnce([[]]);
    upload(pdf());
    expect(await screen.findByText(tr('app.import.error.pdf.scanned'))).toBeInTheDocument();
    readPdfPages.mockResolvedValueOnce([at(700, [20, 'Nada que ver'])]);
    upload(pdf());
    expect(await screen.findByText(tr('app.import.error.pdf.unrecognized'))).toBeInTheDocument();
    readPdfPages.mockResolvedValueOnce(Array.from({ length: 81 }, () => []));
    upload(pdf());
    expect(await screen.findByText(tr('app.import.error.pdf.tooBig'))).toBeInTheDocument();
    readPdfPages.mockRejectedValueOnce(new Error('password'));
    upload(pdf());
    expect(await screen.findByText(tr('app.import.error.read'))).toBeInTheDocument();
  });
});
