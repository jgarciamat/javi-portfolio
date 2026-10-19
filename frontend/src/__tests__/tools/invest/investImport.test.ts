import { strToU8 as rawU8, zipSync } from 'fflate';

const strToU8 = (s: string) => new Uint8Array(rawU8(s));
import { readXlsx } from '@modules/finances/application/spreadsheet';
import {
  download,
  loadBundledRates,
  readEcbFile,
  readInvestFile,
  rememberMapping,
  reportPdf,
  resetBundledRates,
  saveRates,
  savedMappings,
  savedRates,
  xlsxBlob,
  xlsxOf,
} from '@modules/tools/application/investImport';
import { readPdf } from '@modules/tools/application/readPdf';

jest.mock('@modules/tools/application/readPdf', () => ({ readPdf: jest.fn() }));
const pdf = readPdf as jest.MockedFunction<typeof readPdf>;

const fileOf = (name: string, content: string | Uint8Array): File => {
  const bytes = typeof content === 'string' ? strToU8(content) : content;
  const data = bytes.slice().buffer as ArrayBuffer;
  return Object.assign(new File([data], name), {
    arrayBuffer: async () => data,
    text: async () => (typeof content === 'string' ? content : ''),
  });
};

beforeEach(() => localStorage.clear());

describe('reading the files on the device', () => {
  it('CSV, XLSX and JSON go through the formats', async () => {
    const csv = await readInvestFile(
      fileOf(
        'trades.csv',
        'Date(UTC),Pair,Side,Price,Executed,Amount,Fee\n2025-03-01 10:00:00,BTCEUR,BUY,30000,0.1BTC,3000EUR,0.0001BTC'
      )
    );
    expect(csv.readings[0].format?.id).toBe('binance-trades');
    const book = xlsxOf([
      {
        name: 'Closed Positions',
        rows: [
          ['Symbol', 'Type', 'Quantity', 'Price', 'Value', 'Fees', 'Date'],
          ['BTC', 'Buy', 0.01, '€1', '€400', '€0', '05/01/2025 10:00:00'],
        ],
      },
    ]);
    const xlsx = await readInvestFile(fileOf('cripto.xlsx', book));
    expect(xlsx.readings[0].ops[0]).toMatchObject({ kind: 'buy', units: 0.01, amount: 400 });
    const json = await readInvestFile(
      fileOf(
        'x.json',
        '[{"Symbol":"BTC","Type":"Buy","Quantity":1,"Price":"€1","Value":"€1","Fees":"€0","Date":"2025-01-05"}]'
      )
    );
    expect(json.readings[0].format?.id).toBe('revolut-crypto');
  });

  it('PDF: the Quantfury report, a fiscal certificate, or nothing found', async () => {
    pdf.mockResolvedValueOnce({
      text: '',
      lines: [
        'Informe del historial de trading',
        'Posiciones Cerradas',
        'FICT   18/08/2026 3:49:51 PM UTC   COMPRAR (abrir)   $1.00   1 acciones   $1.00',
        'Total   +$2.00',
      ],
    });
    const qf = await readInvestFile(fileOf('qf.pdf', ''));
    expect(qf.readings[0]).toMatchObject({ format: { id: 'quantfury' } });
    expect(qf.readings[0].ops).toHaveLength(1);
    pdf.mockResolvedValueOnce({
      text: '',
      lines: ['Información fiscal 2025', 'Dividendos   10,00'],
    });
    expect((await readInvestFile(fileOf('cert.pdf', ''))).certificate).toHaveLength(1);
    pdf.mockResolvedValueOnce({ text: '', lines: ['Otra cosa'] });
    expect((await readInvestFile(fileOf('nada.pdf', ''))).error).toBe('empty');
    pdf.mockRejectedValueOnce(new Error('broken'));
    expect((await readInvestFile(fileOf('roto.pdf', ''))).error).toBe('unreadable');
  });

  it('old Excel files are refused with their reason', async () => {
    expect((await readInvestFile(fileOf('viejo.xls', 'x'))).error).toBe('unsupported');
  });
});

describe('what is remembered and the exchange rates', () => {
  it('keeps the mappings and the rates on this device', () => {
    expect(savedMappings()).toEqual({});
    const mapping = {
      columns: { date: 0 },
      assetClass: 'crypto' as const,
      locale: 'es' as const,
      order: 'dmy' as const,
      platform: 'X',
    };
    rememberMapping('a|b', mapping);
    expect(savedMappings()).toEqual({ 'a|b': mapping });
    saveRates({ USD: [['2025-01-01', 1.1]] });
    expect(savedRates()).toEqual({ USD: [['2025-01-01', 1.1]] });
  });

  it('reads the ECB file as CSV or as the ZIP the ECB gives', async () => {
    const csv = 'Date,USD,\n2025-03-14,1.0880,\n';
    expect((await readEcbFile(fileOf('eurofxref-hist.csv', csv))).USD).toEqual([
      ['2025-03-14', 1.088],
    ]);
    const zip = zipSync({ 'eurofxref-hist.csv': strToU8(csv), 'readme.txt': strToU8('x') });
    expect(
      (await readEcbFile(fileOf('eurofxref-hist.zip', zip), new Set(['USD']))).USD
    ).toHaveLength(1);
    const empty = zipSync({ 'readme.txt': strToU8('x') });
    expect(await readEcbFile(fileOf('otro.ZIP', empty))).toEqual({});
  });
});

describe('downloads', () => {
  it('writes a workbook that Excel (and our own reader) can open, with many columns', () => {
    const header = Array.from({ length: 28 }, (_, i) => `C${i} <&>"`);
    const bytes = xlsxOf([
      { name: 'Ventas y FIFO', rows: [header, [1.5, 'texto']] },
      { name: 'Un nombre de hoja demasiado largo para Excel', rows: [['a']] },
    ]);
    const sheets = readXlsx(bytes.slice().buffer as ArrayBuffer);
    expect(sheets.map((s) => s.name)).toEqual(['Ventas y FIFO', 'Un nombre de hoja demasiado lar']);
    expect(sheets[0].rows[0][27]).toBe('C27 <&>"');
    expect(sheets[0].rows[1]).toEqual([1.5, 'texto']);
    expect(xlsxBlob(bytes).type).toContain('spreadsheetml');
  });

  it('a PDF with one table per sheet, and hands files to the browser', async () => {
    const blob = await reportPdf('Informe', [
      {
        name: 'Ventas',
        rows: [
          ['A', 'B'],
          [1, 'x'],
        ],
      },
      { name: 'Otra', rows: [['C']] },
    ]);
    expect(blob.size).toBeGreaterThan(1000);
    const create = jest.fn(() => 'blob:x');
    const revoke = jest.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    download('a.pdf', blob);
    expect(create).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:x');
    click.mockRestore();
  });
});

describe('the ECB rates that come with the app', () => {
  const original = global.fetch;
  const answer = (value: unknown) => {
    resetBundledRates();
    global.fetch = jest.fn(async () => value) as unknown as typeof fetch;
  };
  afterEach(() => {
    global.fetch = original;
    resetBundledRates();
  });

  it('are read once from the app and kept', async () => {
    answer({
      ok: true,
      json: async () => ({ until: '2026-10-16', rates: { USD: [['2025-01-01', 1.1]] } }),
    });
    expect(await loadBundledRates()).toEqual({
      until: '2026-10-16',
      rates: { USD: [['2025-01-01', 1.1]] },
    });
    await loadBundledRates();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('are null when the file is missing, wrong or the request fails', async () => {
    answer({ ok: false });
    expect(await loadBundledRates()).toBeNull();
    answer({ ok: true, json: async () => ({ until: '2026-10-16' }) });
    expect(await loadBundledRates()).toBeNull();
    resetBundledRates();
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await loadBundledRates()).toBeNull();
  });
});
