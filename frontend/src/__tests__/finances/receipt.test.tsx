import { fireEvent, screen, waitFor } from '@testing-library/react';
import { parseReceipt } from '@modules/finances/domain/receiptParser';
import { ReceiptScanner, readReceipt } from '@modules/finances/ui/components/ReceiptScanner';
import { TransactionFormFields } from '@modules/finances/ui/components/TransactionFormFields';
import type { UseTransactionFormReturn } from '@modules/finances/application/hooks/useTransactionForm';
import { renderWithI18n, renderWithProviders, tr } from '@test-utils/render';

const worker = { recognize: jest.fn(), terminate: jest.fn() };
jest.mock('tesseract.js', () => ({ createWorker: jest.fn(async () => worker) }));
const { createWorker } = jest.requireMock('tesseract.js') as { createWorker: jest.Mock };

const TICKET = `MERCADONA S.A.
C/ MAYOR 12 MADRID

15/03/2026 18:42

1 LECHE ENTERA ........ 1,05
2 PAN BARRA ........... 1,80
1 MANZANAS 1,2KG ...... 2,99
SUBTOTAL ............ 5,84
TOTAL (EUR) ........ 5,84
TARJETA ............. 5,84`;

beforeEach(() => {
  jest.clearAllMocks();
  worker.recognize.mockResolvedValue({ data: { text: TICKET } });
  worker.terminate.mockResolvedValue(undefined);
});

describe('parseReceipt', () => {
  it('reads the shop, the date and the total of a ticket', () => {
    expect(parseReceipt(TICKET)).toEqual({
      merchant: 'Mercadona',
      date: '2026-03-15',
      total: 5.84,
    });
  });

  it('takes the biggest amount of the total lines and ignores subtotals, VAT and change', () => {
    const text = `Bar Pepe\n12-03-26\nCaña 2,50\nTapa 4,00\nSUBTOTAL 6,50\nIVA 10% 0,59\nTOTAL A PAGAR 6,50\nENTREGADO 20,00\nCAMBIO 13,50`;
    expect(parseReceipt(text)).toEqual({ merchant: 'Bar pepe', date: '2026-03-12', total: 6.5 });
  });

  it('falls back to the biggest amount and copes with thousands separators', () => {
    expect(parseReceipt('Muebles Sur\nSofá 1.234,56\nCojín 12,00').total).toBe(1234.56);
    expect(parseReceipt('Tienda\nTOTAL 1 234,50').total).toBe(1234.5);
  });

  it('does not take addresses, dates or amounts for the shop and gives null when it has nothing', () => {
    expect(parseReceipt('C/ Mayor 3\nCIF A1234\n01/02/2026\n5,00\nFarmacia Luna').merchant).toBe(
      'Farmacia luna'
    );
    expect(parseReceipt('1234\n5,00')).toEqual({ merchant: null, date: null, total: 5 });
    expect(parseReceipt('')).toEqual({ merchant: null, date: null, total: null });
    expect(parseReceipt('---\n+++').merchant).toBeNull();
    expect(parseReceipt('SAU\n3,00').merchant).toBeNull();
    expect(parseReceipt('Tienda S.L.\n3,00').merchant).toBe('Tienda');
    expect(parseReceipt('Tienda\n31/02/2026\n3,00').date).toBeNull();
  });
});

describe('readReceipt', () => {
  it('reads the photo on the device with our own files and frees the worker', async () => {
    const result = await readReceipt(new File(['x'], 'ticket.jpg'));
    expect(result.total).toBe(5.84);
    expect(createWorker).toHaveBeenCalledWith('spa', 1, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/',
      langPath: '/ocr/',
      gzip: true,
    });
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('frees the worker when reading fails', async () => {
    worker.recognize.mockRejectedValueOnce(new Error('bad image'));
    await expect(readReceipt(new File(['x'], 'ticket.jpg'))).rejects.toThrow('bad image');
    expect(worker.terminate).toHaveBeenCalled();
  });
});

describe('ReceiptScanner', () => {
  const choose = (file: File | null) =>
    fireEvent.change(screen.getByLabelText(tr('app.receipt.file'), { selector: 'input' }), {
      target: { files: file ? [file] : [] },
    });

  it('hands over what it read and shows it is working', async () => {
    const onScanned = jest.fn();
    renderWithI18n(<ReceiptScanner onScanned={onScanned} />);
    choose(null);
    expect(onScanned).not.toHaveBeenCalled();
    choose(new File(['x'], 'ticket.jpg'));
    expect(await screen.findByText(new RegExp(tr('app.receipt.reading')))).toBeInTheDocument();
    await waitFor(() =>
      expect(onScanned).toHaveBeenCalledWith({
        merchant: 'Mercadona',
        date: '2026-03-15',
        total: 5.84,
      })
    );
    expect(screen.getByRole('button', { name: new RegExp(tr('app.receipt.scan')) })).toBeEnabled();
  });

  it('opens the camera or the gallery from the button', () => {
    renderWithI18n(<ReceiptScanner onScanned={jest.fn()} />);
    const input = screen.getByLabelText(tr('app.receipt.file'), { selector: 'input' });
    const click = jest.spyOn(input, 'click').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.receipt.scan')) }));
    expect(click).toHaveBeenCalled();
  });

  it('says when it could not read anything or the device cannot read it', async () => {
    const onScanned = jest.fn();
    renderWithI18n(<ReceiptScanner onScanned={onScanned} />);
    worker.recognize.mockResolvedValueOnce({ data: { text: '' } });
    choose(new File(['x'], 'a.jpg'));
    expect(await screen.findByText(tr('app.receipt.nothing'))).toBeInTheDocument();
    worker.recognize.mockRejectedValueOnce(new Error('no wasm'));
    choose(new File(['x'], 'b.jpg'));
    expect(await screen.findByText(tr('app.receipt.error'))).toBeInTheDocument();
    expect(onScanned).not.toHaveBeenCalled();
  });
});

describe('the new-movement form with a scanned receipt', () => {
  const formStub = (description: string) =>
    ({
      fields: {
        description,
        amount: '',
        type: 'EXPENSE',
        category: '',
        date: '',
        notes: '',
        accountId: null,
      },
      setDescription: jest.fn(),
      setAmount: jest.fn(),
      setDate: jest.fn(),
      setNotes: jest.fn(),
      setType: jest.fn(),
      setAccountId: jest.fn(),
      handleCategoryChange: jest.fn(),
    } as unknown as UseTransactionFormReturn);

  const scan = async (form: UseTransactionFormReturn, text: string) => {
    worker.recognize.mockResolvedValueOnce({ data: { text } });
    renderWithProviders(
      <TransactionFormFields
        form={form}
        categories={[]}
        onManageCategories={jest.fn()}
        accounts={[]}
      />
    );
    fireEvent.change(screen.getByLabelText(tr('app.receipt.file'), { selector: 'input' }), {
      target: { files: [new File(['x'], 't.jpg')] },
    });
    await waitFor(() => expect(worker.terminate).toHaveBeenCalled());
  };

  it('fills the shop, the amount and the date', async () => {
    const form = formStub('');
    await scan(form, TICKET);
    await waitFor(() => expect(form.setAmount).toHaveBeenCalledWith('5.84'));
    expect(form.setDescription).toHaveBeenCalledWith('Mercadona');
    expect(form.setDate).toHaveBeenCalledWith('2026-03-15');
  });

  it('keeps a description already written and leaves out what it could not read', async () => {
    const form = formStub('Compra semanal');
    await scan(form, 'Tienda');
    await waitFor(() => expect(worker.terminate).toHaveBeenCalled());
    expect(form.setDescription).not.toHaveBeenCalled();
    expect(form.setAmount).not.toHaveBeenCalled();
    expect(form.setDate).not.toHaveBeenCalled();
  });

  it('does not rewrite the shop when the ticket has none', async () => {
    const form = formStub('');
    await scan(form, '12/03/2026\nTOTAL 3,00');
    await waitFor(() => expect(form.setAmount).toHaveBeenCalledWith('3'));
    expect(form.setDescription).not.toHaveBeenCalled();
  });
});
