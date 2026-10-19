import { useState } from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { strToU8 } from 'fflate';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { SavingsDetailSection } from '@modules/tools/ui/renta/SavingsDetail';
import { InvestGuide } from '@modules/tools/ui/renta/invest/InvestGuide';
import { readPdf } from '@modules/tools/application/readPdf';
import { resetBundledRates } from '@modules/tools/application/investImport';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@modules/tools/application/readPdf', () => ({ readPdf: jest.fn() }));
const pdf = readPdf as jest.MockedFunction<typeof readPdf>;

const k = 'tools.invest';
let last: RentaForm;

function Harness() {
  const [form, setForm] = useState<RentaForm>(emptyForm(''));
  last = form;
  return <SavingsDetailSection form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} />;
}

const fileOf = (name: string, content: string): File => {
  const data = new Uint8Array(strToU8(content)).buffer as ArrayBuffer;
  return Object.assign(new File([data], name), {
    arrayBuffer: async () => data,
    text: async () => content,
  });
};

const BINANCE = `Date(UTC),Pair,Side,Price,Executed,Amount,Fee
2024-03-01 10:00:00,BTCEUR,BUY,30000,0.1BTC,3000EUR,3EUR
2025-03-01 10:00:00,BTCEUR,SELL,40000,0.05BTC,2000EUR,2EUR
2025-04-01 10:00:00,ETHUSDT,BUY,3000,1ETH,3000USDT,0USDT
2025-05-01 10:00:00,BTCEUR,SELL,20000,0.01BTC,200EUR,0EUR
not a date,BTCEUR,SELL,1,1BTC,1EUR,0EUR`;
const COINBASE = `Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
2024-06-01T10:00:00Z,Staking Income,ETH,0.01,EUR,€3000.00,€30.00,€30.00,€0.00,`;
const FUNDS = `Fecha;Fondo;ISIN;Tipo de operación;Participaciones;Importe
05/01/2024;Fondo Ficticio FI;ES0000000010;Suscripción;10;1.000,00
05/03/2025;Fondo Ficticio FI;ES0000000010;Reembolso;10;800,00
05/06/2025;Fondo Ficticio FI;ES0000000010;Suscripción;10;790,00
05/01/2024;Otro Fondo FI;ES0000000011;Suscripción;10;500,00
05/03/2025;Otro Fondo FI;ES0000000011;Reembolso;10;400,00`;
const DEGIRO = `Fecha,Hora,Producto,ISIN,Bolsa de referencia,Centro de ejecución,Número,Precio,,Valor local,,Valor,,Tipo de cambio,Costes de transacción,,Total,,ID Orden
05-01-2025,10:00,EMPRESA FICTICIA SA,ES0000000001,MAD,XMAD,10,"10,00",EUR,"-100,00",EUR,"-100,00",EUR,,"-2,00",EUR,"-102,00",EUR,o1`;
const IBKR_DIV = `Dividends,Header,Currency,Date,Description,Amount
Dividends,Data,USD,2025-02-05,FICT(US0000000001) Cash Dividend,100.00
Withholding Tax,Header,Currency,Date,Description,Amount,Code
Withholding Tax,Data,USD,2025-02-05,FICT(US0000000001) Cash Dividend - US Tax,-15.00,`;
const UNKNOWN = `Día;Cosa;Cuánto;Euros;
01/02/2025;SOL;2;200;`;

const upload = async (...files: File[]) => {
  const input = screen.getByLabelText(tr(`${k}.file`)) as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
};

const open = () => {
  renderWithProviders(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: tr(`${k}.open`) }));
};

beforeEach(() => {
  localStorage.clear();
  pdf.mockReset();
});

describe('Importar mis inversiones', () => {
  it('shows the guide before any file, and reads files chosen or dropped', async () => {
    open();
    expect(screen.getByText(tr(`${k}.guide.title`))).toBeInTheDocument();
    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.choose`) }));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
    const zone = screen.getByText(tr(`${k}.drop`)).parentElement as HTMLElement;
    fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'] } });
    expect(zone.className).toContain('is-over');
    fireEvent.dragLeave(zone, { dataTransfer: { types: ['Files'] } });
    expect(zone.className).not.toContain('is-over');
    await act(async () => {
      fireEvent.drop(zone, {
        dataTransfer: {
          files: [
            fileOf('binance.csv', BINANCE),
            fileOf('coinbase.csv', COINBASE),
            fileOf('fondos.csv', FUNDS),
          ],
        },
      });
    });
    expect(await screen.findByText('binance.csv')).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          tr(`${k}.recognised`, { platform: 'Binance', file: '.*', count: 3 }).slice(0, 10)
        )
      )
    ).toBeInTheDocument();
    // Dollars of a stablecoin without a rate: the rates box asks for one.
    expect(screen.getByText(tr(`${k}.rates.title`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(tr(`${k}.skipped`, { count: 1 })))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.warn.earlierYears`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(tr(`${k}.decl.deferred`)))).toBeInTheDocument();
    expect(screen.getByText('[0322] -100,00 €')).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(tr(`${k}.reward.staking`))).length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.change(screen.getByLabelText(tr(`${k}.file`)), { target: { files: null } });
    });
  });

  it('takes the figures to the Renta, and they can be removed again', async () => {
    open();
    await upload(fileOf('binance.csv', BINANCE), fileOf('degiro.csv', DEGIRO));
    await screen.findByText('degiro.csv');
    // 0.05 BTC sold for 2,000 − 2 with a cost of (3,000 + 3) / 2 = 1,501.50: gain 496.50; then
    // 0.01 BTC for 200 with a cost of 300.30: −100.30. Together: 396.20.
    const table = screen.getByRole('table', { name: tr(`${k}.decl.caption`) });
    expect(within(table).getByText(/496,50/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.apply`) }));
    expect(screen.getByText(tr(`${k}.applied`))).toBeInTheDocument();
    expect(last.savingsDetail?.imported?.files).toEqual(['binance.csv', 'degiro.csv']);
    expect(last.savingsDetail?.imported?.assets.map((a) => a.name)).toEqual([
      'BTC',
      'EMPRESA FICTICIA SA',
      'USDT',
      'ETH',
    ]);
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.remove`) }));
    expect(last.savingsDetail?.imported).toBeUndefined();
  });

  it('lets the person correct a row: its euros, its class, or leave it out', async () => {
    open();
    await upload(fileOf('binance.csv', BINANCE));
    await screen.findByText('binance.csv');
    const what = 'USDT 01/04/2025';
    const value = screen.getByLabelText(tr(`${k}.ops.valueOf`, { what })) as HTMLInputElement;
    fireEvent.blur(value, { target: { value: '2800,50' } });
    fireEvent.blur(value, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(tr(`${k}.ops.classOf`, { what })), {
      target: { value: 'shares' },
    });
    // Typed rate for dollars (the stablecoin is valued as a dollar).
    const rate = () => screen.getByLabelText(tr(`${k}.rates.typed`, { currency: 'USD' }));
    fireEvent.blur(rate(), { target: { value: 'x' } });
    fireEvent.blur(rate(), { target: { value: '1,25' } });
    const counts = screen.getByLabelText(tr(`${k}.ops.countsOf`, { what })) as HTMLInputElement;
    fireEvent.click(counts);
    expect(counts.checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.apply`) }));
    expect(last.savingsDetail?.imported?.assets.map((a) => a.name)).toEqual(['BTC']);
    expect(JSON.parse(localStorage.getItem('renta.invest.rates') as string)).toEqual({
      USD: [['0000-01-01', 1.25]],
    });
  });

  it('uses the ECB rates that come with the app, and says up to which day', async () => {
    resetBundledRates();
    const original = global.fetch;
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ until: '2026-10-16', rates: { USD: [['2025-01-01', 1.25]] } }),
    })) as unknown as typeof fetch;
    try {
      open();
      await upload(fileOf('ibkr.csv', IBKR_DIV));
      await screen.findByText('ibkr.csv');
      expect(await screen.findByText('[0029] 80,00 €')).toBeInTheDocument();
      expect(
        screen.getByText(tr(`${k}.rates.bundled`, { date: '2026-10-16' }))
      ).toBeInTheDocument();
    } finally {
      global.fetch = original;
      resetBundledRates();
    }
  });

  it('dividends with tax abroad, the ECB file and the downloads', async () => {
    open();
    await upload(fileOf('ibkr.csv', IBKR_DIV));
    await screen.findByText('ibkr.csv');
    const ecb = screen.getByLabelText(tr(`${k}.rates.file`));
    await act(async () => {
      fireEvent.change(ecb, {
        target: { files: [fileOf('eurofxref-hist.csv', 'Date,USD,\n2025-02-05,1.25,\n')] },
      });
    });
    await waitFor(() =>
      expect(screen.getByText(tr(`${k}.rates.loaded`, { count: 1 }))).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.change(ecb, { target: { files: [] } });
    });
    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.rates.load`) }));
    click.mockRestore();
    // 100 USD at 1.25 = 80 €, 15 USD = 12 € paid abroad.
    expect(screen.getByText('[0029] 80,00 €')).toBeInTheDocument();
    expect(screen.getByText('[0588] 12,00 €')).toBeInTheDocument();
    Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:x'), revokeObjectURL: jest.fn() });
    const save = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.web.xlsx`) }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: tr(`${k}.web.pdf`) }));
    });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    save.mockRestore();
    fireEvent.click(screen.getByLabelText(tr(`${k}.professional`)));
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.apply`) }));
    expect(last.savingsDetail?.imported?.foreignTax).toEqual([{ income: 80, tax: 12 }]);
  });

  it('asks what each column is for an unknown file, and remembers it', async () => {
    open();
    await upload(fileOf('mio.csv', UNKNOWN));
    expect(await screen.findByText(tr(`${k}.unknown`, { table: 'mio.csv' }))).toBeInTheDocument();
    const read = screen.getByRole('button', { name: tr(`${k}.map.read`) });
    expect(read).toBeDisabled();
    const set = (field: string, value: string) =>
      fireEvent.change(screen.getByLabelText(tr(`${k}.map.field.${field}`)), { target: { value } });
    set('date', '0');
    set('asset', '1');
    set('units', '2');
    set('amount', '3');
    set('fee', '');
    fireEvent.change(screen.getByLabelText(tr(`${k}.map.platform`)), {
      target: { value: 'Mi app' },
    });
    fireEvent.change(screen.getByLabelText(tr(`${k}.map.class`)), { target: { value: 'crypto' } });
    fireEvent.change(screen.getByLabelText(tr(`${k}.map.locale`)), { target: { value: 'en' } });
    fireEvent.change(screen.getByLabelText(tr(`${k}.map.order`)), { target: { value: 'dmy' } });
    fireEvent.click(read);
    expect(screen.getByText(tr(`${k}.mapped`, { count: 1 }))).toBeInTheDocument();
    expect(
      Object.keys(JSON.parse(localStorage.getItem('renta.invest.mappings') as string))
    ).toEqual(['dia|cosa|cuanto|euros|']);
  });

  it('reads a fiscal certificate: the ticked lines go to the Renta', async () => {
    pdf.mockResolvedValue({
      text: '',
      lines: [
        'Información fiscal 2025',
        'Intereses   100,00',
        'Dividendos   50,00',
        'Retenciones   28,50',
        'Ganancia patrimonial   10,00',
        'Pérdida patrimonial   4,00',
        'Gastos de custodia   2,00',
        'Valor de adquisición   1,00',
      ],
    });
    open();
    await upload(fileOf('cert.pdf', ''), fileOf('viejo.xls', 'x'));
    expect(await screen.findByText(tr(`${k}.cert.title`))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.error.unsupported`))).toBeInTheDocument();
    for (const box of screen.getAllByRole('checkbox').filter((c) => c.closest('fieldset')))
      fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.apply`) }));
    expect(last.savingsDetail?.imported).toMatchObject({
      capital: { interest: 100, dividends: 50, expenses: 2 },
      withheld: { capital: 28.5 },
      otherGains: [10, -4],
    });
  });

  it('adds a purchase that is not in the files', async () => {
    open();
    await upload(fileOf('binance.csv', BINANCE));
    await screen.findByText('binance.csv');
    fireEvent.click(screen.getByText(tr(`${k}.add.title`)));
    const button = screen.getByRole('button', { name: tr(`${k}.add.button`) });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(tr(`${k}.add.date`)), {
      target: { value: '2023-01-01' },
    });
    fireEvent.change(screen.getByLabelText(tr(`${k}.add.kind`)), { target: { value: 'buy' } });
    fireEvent.change(screen.getByLabelText(tr(`${k}.add.asset`)), { target: { value: 'sol' } });
    fireEvent.change(screen.getByLabelText(tr(`${k}.add.units`)), { target: { value: '2' } });
    fireEvent.click(button);
    expect(screen.getAllByText('SOL').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(tr(`${k}.add.date`)), {
      target: { value: '2023-01-02' },
    });
    fireEvent.change(screen.getByLabelText(tr(`${k}.add.asset`)), { target: { value: 'ada' } });
    fireEvent.change(screen.getByLabelText(tr(`${k}.add.units`)), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(tr(`${k}.add.eur`)), { target: { value: '10' } });
    fireEvent.click(button);
    expect(screen.getAllByText('ADA').length).toBeGreaterThan(0);
  });
});

describe('taking a file out, and the pages of the table', () => {
  const many = Array.from(
    { length: 45 },
    (_, i) =>
      `2025-01-${String((i % 28) + 1).padStart(2, '0')} 10:00:00,BTCEUR,BUY,1,0.001BTC,1EUR,0EUR`
  ).join('\n');
  const MANY = `Date(UTC),Pair,Side,Price,Executed,Amount,Fee\n${many}`;
  const removeButton = (file: string) =>
    screen.getByRole('button', { name: tr(`${k}.removeFileOf`, { file }) });

  it('takes out a file without asking when nothing of it was changed', async () => {
    open();
    await upload(fileOf('binance.csv', BINANCE), fileOf('degiro.csv', DEGIRO));
    await screen.findByText('degiro.csv');
    fireEvent.click(removeButton('degiro.csv'));
    expect(screen.queryByText('degiro.csv')).not.toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.removed`, { file: 'degiro.csv' }))).toBeInTheDocument();
  });

  it('asks first when its rows or columns were changed, and works the Renta out again', async () => {
    const confirm = jest.spyOn(window, 'confirm');
    open();
    await upload(
      fileOf('binance.csv', BINANCE),
      fileOf('degiro.csv', DEGIRO),
      fileOf('mio.csv', UNKNOWN)
    );
    await screen.findByText('mio.csv');
    // Map the unknown file and change a row of Degiro.
    fireEvent.change(screen.getAllByLabelText(tr(`${k}.map.field.date`))[0], {
      target: { value: '0' },
    });
    fireEvent.change(screen.getAllByLabelText(tr(`${k}.map.field.asset`))[0], {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.map.read`) }));
    const what = 'ES0000000001 05/01/2025';
    fireEvent.click(screen.getByLabelText(tr(`${k}.ops.countsOf`, { what })));
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.apply`) }));
    expect(last.savingsDetail?.imported?.files).toEqual(['binance.csv', 'degiro.csv', 'mio.csv']);
    confirm.mockReturnValueOnce(false);
    fireEvent.click(removeButton('degiro.csv'));
    expect(screen.getByText('degiro.csv')).toBeInTheDocument();
    confirm.mockReturnValueOnce(true);
    fireEvent.click(removeButton('degiro.csv'));
    await waitFor(() =>
      expect(last.savingsDetail?.imported?.files).toEqual(['binance.csv', 'mio.csv'])
    );
    expect(screen.getByText(tr(`${k}.removedApplied`, { file: 'degiro.csv' }))).toBeInTheDocument();
    confirm.mockReturnValueOnce(true);
    fireEvent.click(removeButton('mio.csv'));
    fireEvent.click(removeButton('binance.csv'));
    await waitFor(() => expect(last.savingsDetail?.imported).toBeUndefined());
    confirm.mockRestore();
  });

  it('a certificate with ticked lines asks before going', async () => {
    pdf.mockResolvedValue({ text: '', lines: ['Información fiscal 2025', 'Intereses   100,00'] });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    open();
    await upload(fileOf('cert.pdf', ''));
    fireEvent.click(await screen.findByRole('checkbox', { name: /100,00/ }));
    fireEvent.click(removeButton('cert.pdf'));
    expect(confirm).toHaveBeenCalled();
    expect(screen.queryByText('cert.pdf')).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it('says which sheets of a workbook are only information', async () => {
    const { xlsxOf } = await import('@modules/tools/application/investImport');
    const book = xlsxOf([
      {
        name: 'Customer Information',
        rows: [
          ['Name', 'User ID', 'Email'],
          ['X', '1', 'x@example.com'],
        ],
      },
      { name: 'Trades', rows: BINANCE.split('\n').map((l) => l.split(',')) },
    ]);
    const data = book.slice().buffer as ArrayBuffer;
    const file = Object.assign(new File([data], 'Binance- informe.xlsx'), {
      arrayBuffer: async () => data,
    });
    open();
    await upload(file);
    expect(
      await screen.findByText(tr(`${k}.info`, { table: 'Customer Information' }))
    ).toBeInTheDocument();
    expect(screen.queryByText(/x@example\.com/)).not.toBeInTheDocument();
  });

  it('shows twenty operations a page and goes back to the first one when files change', async () => {
    open();
    await upload(fileOf('muchas.csv', MANY), fileOf('degiro.csv', DEGIRO));
    await screen.findByText('degiro.csv');
    const status = () =>
      screen.getByText(new RegExp(tr(`${k}.pages.page`, { current: '\\d', pages: 3 })));
    expect(status().textContent).toContain(
      tr(`${k}.pages.showing`, { from: 1, to: 20, count: 46 })
    );
    const go = (label: string) =>
      fireEvent.click(screen.getByRole('button', { name: tr(`${k}.pages.${label}`) }));
    expect(screen.getByRole('button', { name: tr(`${k}.pages.previous`) })).toBeDisabled();
    go('next');
    expect(status().textContent).toContain(
      tr(`${k}.pages.showing`, { from: 21, to: 40, count: 46 })
    );
    go('last');
    expect(status().textContent).toContain(
      tr(`${k}.pages.showing`, { from: 41, to: 46, count: 46 })
    );
    expect(screen.getByRole('button', { name: tr(`${k}.pages.next`) })).toBeDisabled();
    go('previous');
    go('first');
    expect(status().textContent).toContain(
      tr(`${k}.pages.showing`, { from: 1, to: 20, count: 46 })
    );
    go('last');
    fireEvent.click(removeButton('degiro.csv'));
    expect(status().textContent).toContain(
      tr(`${k}.pages.showing`, { from: 1, to: 20, count: 45 })
    );
    fireEvent.click(removeButton('muchas.csv'));
    expect(
      screen.queryByRole('navigation', { name: tr(`${k}.pages.label`) })
    ).not.toBeInTheDocument();
  });
});

describe('money paid in and taken out', () => {
  it('is named as such in the table of operations', async () => {
    const { OpsTable } = await import('@modules/tools/ui/renta/invest/InvestTables');
    const base = {
      id: 'f1',
      format: 'binance-fiat-deposits',
      account: 'Binance',
      date: '2025-01-02',
      at: '2025-01-02T00:00:00',
      kind: 'ignore' as const,
      asset: 'EUR',
      assetClass: 'fiat' as const,
      units: 10,
      amount: 10,
      currency: 'EUR',
      eur: 10,
      fee: 0,
      feeCurrency: null,
      value: 10,
      feeEur: 0,
    };
    renderWithProviders(
      <OpsTable
        ops={[
          { ...base, note: 'fiatDeposit' },
          { ...base, id: 'f2', note: 'fiatWithdrawal' },
          { ...base, id: 'f3' },
        ]}
        edits={{}}
        onEdit={jest.fn()}
        resetKey=""
      />,
      { authenticated: false }
    );
    expect(screen.getByText(tr(`${k}.kind.fiatDeposit`))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.kind.fiatWithdrawal`))).toBeInTheDocument();
    expect(screen.getByText(tr(`${k}.kind.ignore`))).toBeInTheDocument();
  });
});

describe('the guide from the draft reviewer', () => {
  it('lists every step with its sources, without any "not confirmed" label', () => {
    renderWithProviders(<InvestGuide />);
    expect(screen.getByText(tr(`${k}.guide.m721.title`))).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/confirmad|confirmed/i);
    expect(screen.getAllByRole('link').length).toBeGreaterThan(10);
  });
});

describe('Importar mis inversiones: dropping the ECB file', () => {
  it('takes the rates file dropped on its block', async () => {
    open();
    await upload(fileOf('ibkr.csv', IBKR_DIV));
    await screen.findByText('ibkr.csv');
    const zone = screen
      .getByRole('button', { name: tr(`${k}.rates.load`) })
      .closest('.file-drop-zone') as HTMLElement;
    await act(async () => {
      fireEvent.drop(zone, {
        dataTransfer: {
          types: ['Files'],
          files: [fileOf('eurofxref-hist.csv', 'Date,USD,\n2025-02-05,1.25,\n')],
        },
      });
    });
    await waitFor(() =>
      expect(screen.getByText(tr(`${k}.rates.loaded`, { count: 1 }))).toBeInTheDocument()
    );
  });
});
