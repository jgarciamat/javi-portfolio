/**
 * What to copy into Renta WEB, alta by alta (docs/fiscalidad/como-declarar-cripto-y-fondos.md §7),
 * with figures worked out by hand: the official case of chapter 11 of the Manual de Renta 2025,
 * 400 sales of crypto, 90 CFD positions, the limits of altas of Renta2025.xsd, and the personas.
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseCSV } from '@modules/finances/domain/importParsers';
import { readXlsx } from '@modules/finances/application/spreadsheet';
import { readTables } from '@modules/tools/domain/invest/detect';
import { buildLedger, type LedgerResult } from '@modules/tools/domain/invest/ledger';
import { readQuantfury } from '@modules/tools/domain/invest/pdfReports';
import { reportTables, summaryOf } from '@modules/tools/domain/invest/report';
import { cut, rentaWebKit, WINDOWS } from '@modules/tools/domain/invest/rentaWeb';
import type { InvestOp } from '@modules/tools/domain/invest/types';
import { buildXlsx } from '../../../../scripts/xlsx';
import { BINANCE_WORKBOOK } from '@test-utils/binanceWorkbook';

let n = 0;
const op = (o: Partial<InvestOp> & Pick<InvestOp, 'kind' | 'date' | 'asset'>): InvestOp => ({
  id: `w:${++n}`,
  format: 'test',
  account: 'Bróker',
  at: `${o.date}T12:00:00`,
  assetClass: 'crypto',
  units: 1,
  amount: null,
  currency: 'EUR',
  eur: null,
  fee: 0,
  feeCurrency: null,
  ...o,
});
const ledgerOf = (ops: InvestOp[]) => buildLedger(ops, { year: 2025, rates: {} });
const win = (l: LedgerResult, section: string) =>
  rentaWebKit(l).windows.find((w) => w.section === section) as ReturnType<
    typeof rentaWebKit
  >['windows'][number];

/** The totals of the windows must be those of declaring each sale (summaryOf). */
function expectSameTotals(l: LedgerResult) {
  const kit = rentaWebKit(l);
  const sum = summaryOf(l);
  for (const w of kit.windows) {
    expect(w.totals.gains).toBeCloseTo(sum[w.section].gain, 2);
    expect(w.totals.losses).toBeCloseTo(sum[w.section].loss, 2);
  }
}

describe('the official case of chapter 11 of the Manual (Renta 2025)', () => {
  // Fund: transmission 15,800, acquisition 15,000 → gain 800 (0316). Shares: 12,000 against
  // 16,800 and bought again within two months → loss of 4,800 (0337) that does not count (0338 = 0).
  const l = ledgerOf([
    op({
      kind: 'buy',
      date: '2020-03-01',
      asset: 'ES0000000001',
      assetClass: 'fund',
      name: 'Fondo Ficticio',
      eur: 15000,
    }),
    op({
      kind: 'sell',
      date: '2025-05-10',
      asset: 'ES0000000001',
      assetClass: 'fund',
      name: 'Fondo Ficticio',
      eur: 15800,
    }),
    op({
      kind: 'buy',
      date: '2024-02-01',
      asset: 'ES0000000002',
      assetClass: 'shares',
      name: 'Empresa Ficticia SA',
      units: 100,
      eur: 16800,
    }),
    op({
      kind: 'sell',
      date: '2025-09-01',
      asset: 'ES0000000002',
      assetClass: 'shares',
      name: 'Empresa Ficticia SA',
      units: 100,
      eur: 12000,
    }),
    op({
      kind: 'buy',
      date: '2025-10-15',
      asset: 'ES0000000002',
      assetClass: 'shares',
      name: 'Empresa Ficticia SA',
      units: 100,
      eur: 11900,
    }),
  ]);

  it('the fund in one alta with its NIF to type, transmission and acquisition', () => {
    const w = win(l, 'iic');
    expect(w.altas).toHaveLength(1);
    expect(w.altas[0]).toMatchObject({
      gain: 800,
      loss: 0,
      counted: 0,
      blocked: false,
      fiscalData: true,
    });
    expect(w.altas[0].values).toMatchObject({
      nif: '',
      proceeds: 15800,
      cost: 15000,
      withheld: 0,
      blocked: 'No',
    });
    expect(w.totals).toEqual({ gains: 800, losses: 0 });
  });

  it('the shares: one issuer, a transaction marked for the repurchase that does not count', () => {
    const w = win(l, 'shares');
    expect(w.altas[0].values.entity).toBe('Empresa Ficticia SA');
    expect(w.altas[0].transactions).toEqual([
      expect.objectContaining({
        values: { transaction: 1, proceeds: 12000, cost: 16800, blocked: 'Sí' },
        loss: 4800,
        counted: 0,
      }),
    ]);
    expect(w.totals).toEqual({ gains: 0, losses: 0 });
    expectSameTotals(l);
  });
});

describe('crypto', () => {
  it('a gain and a loss of BTC are two altas: 1809 = 500, 1807 = 200 and the totals 1814 and 1813', () => {
    const l = ledgerOf([
      op({ kind: 'buy', date: '2025-01-01', asset: 'BTC', units: 2, eur: 2000 }),
      op({ kind: 'sell', date: '2025-02-01', asset: 'BTC', eur: 1500 }),
      op({ kind: 'sell', date: '2025-03-01', asset: 'BTC', eur: 800 }),
    ]);
    const w = win(l, 'crypto');
    expect(
      w.altas.map((a) => [a.values.key, a.values.proceeds, a.values.cost, a.gain, a.loss])
    ).toEqual([
      ['F - Moneda de curso legal', 1500, 1000, 500, 0],
      ['F - Moneda de curso legal', 800, 1000, 0, 200],
    ]);
    expect(w.totals).toEqual({ gains: 500, losses: 200 });
    expect(Object.keys(w.altas[0].values)).toEqual([
      'name',
      'key',
      'proceeds',
      'proceedsCosts',
      'cost',
      'costCosts',
    ]);
  });

  it('400 sales of 3 coins, for money and for coins: 3 × 2 keys × 2 signs altas, same totals', () => {
    const ops: InvestOp[] = [];
    for (const coin of ['BTC', 'ETH', 'SOL']) {
      ops.push(op({ kind: 'buy', date: '2024-01-01', asset: coin, units: 200, eur: 20000 }));
    }
    for (let i = 0; i < 400; i++) {
      const coin = ['BTC', 'ETH', 'SOL'][i % 3];
      const gain = i % 2 === 0;
      const swap = i % 4 < 2;
      const date = `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(
        2,
        '0'
      )}`;
      ops.push(
        swap
          ? op({
              kind: 'swap',
              date,
              asset: coin,
              units: 0.5,
              eur: gain ? 60 : 40,
              toAsset: 'USDC',
              toUnits: 50,
              toClass: 'crypto',
            })
          : op({ kind: 'sell', date, asset: coin, units: 0.5, eur: gain ? 60 : 40 })
      );
    }
    const l = ledgerOf(ops);
    const kit = rentaWebKit(l);
    const crypto = kit.windows.find((w) => w.section === 'crypto') as (typeof kit.windows)[number];
    // USDC is never sold: the altas are those of the three coins.
    expect(crypto.altas).toHaveLength(12);
    expect(crypto.altas.reduce((s, a) => s + a.sales, 0)).toBe(400);
    expect(kit.warnings).toContainEqual({
      code: 'grouped',
      section: 'crypto',
      sales: 400,
      altas: 12,
    });
    expectSameTotals(l);
    // 200 sales of 0.5 at 60 and 200 at 40, each against 50 of cost: 2,000 of gains and 2,000 of losses.
    expect(crypto.totals).toEqual({ gains: 2000, losses: 2000 });
  });

  it('the four keys of box 1803', () => {
    const l = ledgerOf([
      op({ kind: 'buy', date: '2025-01-01', asset: 'ETH', units: 4, eur: 4000 }),
      op({ kind: 'sell', date: '2025-02-01', asset: 'ETH', eur: 1100 }),
      op({
        kind: 'swap',
        date: '2025-02-02',
        asset: 'ETH',
        eur: 1100,
        toAsset: 'BTC',
        toUnits: 0.01,
      }),
      op({
        kind: 'swap',
        date: '2025-02-03',
        asset: 'ETH',
        eur: 1100,
        toAsset: 'NFT1',
        toUnits: 1,
        toClass: 'commodity',
      }),
      op({ kind: 'sell', date: '2025-02-04', asset: 'ETH', eur: 1100, counterpart: 'B' }),
    ]);
    expect(win(l, 'crypto').altas.map((a) => String(a.values.key)[0])).toEqual([
      'F',
      'N',
      'O',
      'B',
    ]);
  });

  it('more than 300 altas: gains and losses of a coin go together, and then each coin alone', () => {
    const ops: InvestOp[] = [];
    for (let i = 0; i < 160; i++) {
      const coin = `C${i}`;
      ops.push(op({ kind: 'buy', date: '2025-01-01', asset: coin, units: 2, eur: 200 }));
      ops.push(op({ kind: 'sell', date: '2025-02-01', asset: coin, eur: 150 }));
      ops.push(op({ kind: 'sell', date: '2025-03-01', asset: coin, eur: 50 }));
    }
    const l = ledgerOf(ops);
    const kit = rentaWebKit(l);
    expect(kit.windows[0].altas).toHaveLength(160);
    expect(kit.warnings).toContainEqual({ code: 'mergedSigns', section: 'crypto', limit: 300 });
    // Merged, each coin nets 0: the tax does not change (art. 49.1.b), the totals do.
    expect(kit.windows[0].totals).toEqual({ gains: 0, losses: 0 });
    const many = ledgerOf(
      Array.from({ length: 310 }, (_, i) => [
        op({ kind: 'buy', date: '2025-01-01', asset: `D${i}`, eur: 10 }),
        op({ kind: 'sell', date: '2025-02-01', asset: `D${i}`, eur: 20 }),
      ]).flat()
    );
    const over = rentaWebKit(many);
    expect(over.windows[0].altas).toHaveLength(310);
    expect(over.warnings.filter((w) => w.code === 'mergedSigns')).toHaveLength(2);
    expect(over.warnings).toContainEqual({ code: 'overLimit', section: 'crypto', limit: 300 });
  });
});

describe('funds, ETFs and shares', () => {
  it('ETFs in their own window with name and ISIN, funds with their withholding once', () => {
    const l = ledgerOf([
      op({
        kind: 'buy',
        date: '2024-01-01',
        asset: 'IE00B4L5Y983',
        assetClass: 'etf',
        name: 'Fondo Indexado Ficticio Mundial UCITS ETF Acumulación Clase A',
        units: 10,
        eur: 1000,
      }),
      op({
        kind: 'sell',
        date: '2025-01-01',
        asset: 'IE00B4L5Y983',
        assetClass: 'etf',
        name: 'Fondo Indexado Ficticio Mundial UCITS ETF Acumulación Clase A',
        units: 10,
        eur: 1200,
      }),
      op({
        kind: 'buy',
        date: '2024-01-01',
        asset: 'FONDO',
        assetClass: 'fund',
        units: 10,
        eur: 1000,
        account: 'Fondos y valores (entidad española)',
      }),
      op({
        kind: 'sell',
        date: '2025-01-01',
        asset: 'FONDO',
        assetClass: 'fund',
        units: 5,
        eur: 600,
        withholding: 19,
        account: 'Fondos y valores (entidad española)',
      }),
      op({
        kind: 'sell',
        date: '2025-02-01',
        asset: 'FONDO',
        assetClass: 'fund',
        units: 5,
        eur: 400,
        account: 'Fondos y valores (entidad española)',
      }),
      op({
        kind: 'sell',
        date: '2024-02-01',
        asset: 'OTRO',
        assetClass: 'fund',
        units: 0,
        eur: 1,
        withholding: 5,
      }),
    ]);
    const etf = win(l, 'etf');
    expect(etf.altas[0].values).toMatchObject({
      name: 'Fondo Indexado Ficticio Mundial UCITS',
      isin: 'IE00B4L5Y983',
      proceeds: 1200,
      cost: 1000,
    });
    expect(etf.altas[0].name).toBe('Fondo Indexado Ficticio Mundial UCITS ETF Acumulación Clase A');
    const iic = win(l, 'iic');
    expect(iic.altas.map((a) => [a.values.withheld, a.values.isin, a.fiscalData])).toEqual([
      [19, '', true],
      [0, '', true],
    ]);
    const kit = rentaWebKit(l);
    expect(kit.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['etfOwn', 'fiscalData'])
    );
    expect(kit.totals.find((t) => t.box === '2235')?.amount).toBe(200);
    const etfTab = reportTables(l).find((t) => t.name === '2 ETF (2225)')?.rows;
    expect(etfTab?.[1]).toEqual([
      1,
      '',
      'Fondo Indexado Ficticio Mundial UCITS',
      'IE00B4L5Y983',
      1200,
      1000,
      'No',
      200,
      0,
      0,
      1,
      '',
    ]);
  });

  it('a loss kept back in part is split in the part that counts and the marked part', () => {
    const l = ledgerOf([
      op({
        kind: 'buy',
        date: '2025-01-10',
        asset: 'A',
        assetClass: 'shares',
        units: 10,
        eur: 1000,
      }),
      op({
        kind: 'sell',
        date: '2025-03-01',
        asset: 'A',
        assetClass: 'shares',
        units: 10,
        eur: 800,
      }),
      op({ kind: 'buy', date: '2025-03-20', asset: 'A', assetClass: 'shares', units: 4, eur: 300 }),
    ]);
    // 4 of the 10 units sold were bought back: 40 % of the loss of 200 waits.
    const t = win(l, 'shares').altas[0].transactions;
    expect(t?.map((x) => [x.values.proceeds, x.values.cost, x.loss, x.counted, x.blocked])).toEqual(
      [
        [480, 600, 120, 120, false],
        [320, 400, 80, 0, true],
      ]
    );
    expect(rentaWebKit(l).warnings).toContainEqual({ code: 'carteraValores' });
    expectSameTotals(l);
  });

  it('more funds than the 60 altas of the window: warned', () => {
    const ops = Array.from({ length: 61 }, (_, i) => [
      op({ kind: 'buy', date: '2024-01-01', asset: `F${i}`, assetClass: 'fund', eur: 10 }),
      op({ kind: 'sell', date: '2025-01-01', asset: `F${i}`, assetClass: 'fund', eur: 20 }),
    ]).flat();
    const kit = rentaWebKit(ledgerOf(ops));
    expect(kit.warnings).toContainEqual({ code: 'mergedSigns', section: 'iic', limit: 60 });
    expect(kit.warnings).toContainEqual({ code: 'overLimit', section: 'iic', limit: 60 });
  });
});

describe('other elements: 90 CFD positions', () => {
  const cfd = (asset: string, i: number, gain: number) =>
    op({
      kind: 'realized',
      date: `2025-${String((i % 12) + 1).padStart(2, '0')}-15`,
      acquired: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
      asset,
      assetClass: 'derivative',
      amount: Math.max(0, gain),
      cost: Math.max(0, -gain),
    });

  it('one alta per position while they fit; 90 are grouped by instrument and sign, with the dates', () => {
    const l = ledgerOf([
      ...Array.from({ length: 45 }, (_, i) => cfd('CFD-A', i, 10)),
      ...Array.from({ length: 45 }, (_, i) => cfd('CFD-B', i, -5)),
    ]);
    const kit = rentaWebKit(l);
    const w = kit.windows[0];
    // 45 × 10 = 450 of gains; 45 × 5 = 225 of losses.
    expect(
      w.altas.map((a) => [
        a.name,
        a.values.proceeds,
        a.values.cost,
        a.values.bought,
        a.values.sold,
        a.sales,
      ])
    ).toEqual([
      ['CFD-A', 450, 0, '01/01/2025', '15/12/2025', 45],
      ['CFD-B', 0, 225, '01/01/2025', '15/12/2025', 45],
    ]);
    expect(w.totals).toEqual({ gains: 450, losses: 225 });
    expect(kit.warnings).toContainEqual({ code: 'mergedSigns', section: 'other', limit: 80 });
    expect(Object.keys(w.altas[0].values)).toEqual(WINDOWS.other.fields.map((f) => f.key));
    const few = rentaWebKit(ledgerOf([cfd('X', 0, 3), cfd('X', 1, -1)]));
    expect(few.windows[0].altas).toHaveLength(2);
  });

  it('then by instrument, and over the limit it is said', () => {
    const both = rentaWebKit(
      ledgerOf(
        Array.from({ length: 41 }, (_, i) => [cfd(`I${i}`, i, 4), cfd(`I${i}`, i, -1)]).flat()
      )
    );
    expect(both.windows[0].altas).toHaveLength(41);
    expect(both.windows[0].altas[0].values).toMatchObject({ proceeds: 4, cost: 1 });
    const over = rentaWebKit(ledgerOf(Array.from({ length: 81 }, (_, i) => cfd(`J${i}`, i, 2))));
    expect(over.warnings).toContainEqual({ code: 'overLimit', section: 'other', limit: 80 });
  });

  it('gold sold goes there too, dated from its first purchase', () => {
    const l = ledgerOf([
      op({ kind: 'buy', date: '2024-05-01', asset: 'XAU', assetClass: 'commodity', eur: 100 }),
      op({ kind: 'sell', date: '2025-05-01', asset: 'XAU', assetClass: 'commodity', eur: 130 }),
    ]);
    const unbought = ledgerOf([
      op({ kind: 'sell', date: '2025-05-01', asset: 'XAG', assetClass: 'commodity', eur: 30 }),
    ]);
    expect(win(unbought, 'other').altas[0].values.bought).toBe('01/05/2025');
    expect(win(l, 'other').altas[0].values).toMatchObject({
      bought: '01/05/2024',
      sold: '01/05/2025',
      proceeds: 130,
      cost: 100,
    });
  });
});

describe('every made-up case gives the same totals as declaring each sale', () => {
  const PEOPLE = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    'docs',
    'casos-practicos',
    'personas'
  );
  const rates = { USD: [['2020-01-01', 1.1]] as [string, number][] };
  const personas = readdirSync(PEOPLE).filter(
    (s) => s.startsWith('p4-') && existsSync(join(PEOPLE, s, 'archivos'))
  );

  it.each(personas)('%s', (slug) => {
    const dir = join(PEOPLE, slug, 'archivos');
    const ops = readdirSync(dir).flatMap((name) => {
      if (name.includes('INVENTADOS') || name.endsWith('.pdf')) return [];
      if (name.endsWith('.lineas.txt'))
        return readQuantfury(readFileSync(join(dir, name), 'utf8').split('\n').filter(Boolean));
      if (name.endsWith('.xlsx')) {
        const bytes = readFileSync(join(dir, name));
        return readTables(
          readXlsx(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
          ),
          name
        ).flatMap((r) => r.ops);
      }
      return readTables(
        [{ name, rows: parseCSV(readFileSync(join(dir, name), 'utf8')) }],
        name
      ).flatMap((r) => r.ops);
    });
    expectSameTotals(buildLedger(ops, { year: 2025, rates }));
  });

  it('the Binance statement', () => {
    const sheets = readXlsx(buildXlsx(BINANCE_WORKBOOK).slice().buffer as ArrayBuffer);
    const l = buildLedger(
      readTables(sheets, 'b.xlsx').flatMap((r) => r.ops),
      { year: 2025, rates: { USD: [['2020-01-01', 1.25]] } }
    );
    expectSameTotals(l);
    expect(rentaWebKit(l).windows.map((w) => w.section)).toEqual(['crypto', 'other']);
  });
});

describe('texts cut to the length of the field', () => {
  it('without cutting a word in two when it can', () => {
    expect(cut('Empresa Ficticia de Inversiones SA', 20)).toBe('Empresa Ficticia de');
    expect(cut('Supercalifragilisticoespialidoso', 20)).toBe('Supercalifragilistic');
    expect(cut('Corto', 20)).toBe('Corto');
    expect(cut('Sin límite')).toBe('Sin límite');
  });
});
