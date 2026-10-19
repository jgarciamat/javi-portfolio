/**
 * Taking one file out of an import: every file keeps its operations in euros, so the rest can be
 * worked out again later without the exchange rates. Operations made up.
 */
import { withInfoSheets, type TableReading } from '@modules/tools/domain/invest/detect';
import { buildLedger, inEuros } from '@modules/tools/domain/invest/ledger';
import { importedFrom, withCertificate, withoutFile } from '@modules/tools/domain/invest/sources';
import { withheldInOf } from '@modules/tools/domain/invest/formats';
import type { InvestOp } from '@modules/tools/domain/invest/types';

let n = 0;
const op = (o: Partial<InvestOp> & Pick<InvestOp, 'kind' | 'date' | 'asset'>): InvestOp => ({
  id: `s:${++n}`,
  format: 'test',
  account: 'Bróker',
  at: `${o.date}T12:00:00`,
  assetClass: 'shares',
  units: 1,
  amount: null,
  currency: 'USD',
  eur: null,
  fee: 0,
  feeCurrency: null,
  ...o,
});
const rates = { USD: [['2020-01-01', 1.25]] as [string, number][] };
const ops = [
  op({ kind: 'buy', date: '2024-01-05', asset: 'A', units: 10, amount: 1000, fee: 5 }),
  op({
    kind: 'sell',
    date: '2025-03-05',
    asset: 'A',
    units: 5,
    amount: 750,
    fee: 5,
    feeCurrency: 'USD',
  }),
  op({ kind: 'dividend', date: '2025-04-01', asset: 'A', units: 0, amount: 100, withholding: 15 }),
  op({ kind: 'dividend', date: '2025-04-02', asset: 'A', units: 0, amount: 0, withholding: 0 }),
  op({
    kind: 'realized',
    date: '2025-05-01',
    asset: 'B',
    units: 1,
    amount: 250,
    cost: 125,
    acquired: '2024-05-01',
  }),
  op({
    kind: 'switchIn',
    date: '2025-06-01',
    asset: 'F',
    assetClass: 'fund',
    units: 1,
    amount: 100,
    cost: 50,
    currency: 'EUR',
  }),
  op({
    kind: 'sell',
    date: '2025-07-01',
    asset: 'F',
    assetClass: 'fund',
    units: 1,
    amount: 120,
    currency: 'EUR',
  }),
  op({
    kind: 'buy',
    date: '2025-07-02',
    asset: 'C',
    units: 1,
    amount: 10,
    currency: 'GBP',
    fee: 1,
  }),
  op({
    kind: 'buy',
    date: '2025-07-03',
    asset: 'ETH',
    assetClass: 'crypto',
    units: 1,
    amount: 2000,
    currency: 'EUR',
    fee: 0.01,
    feeCurrency: 'ETH',
  }),
];

describe('operations in euros', () => {
  it('give the same figures as with the exchange rates', () => {
    const withRates = buildLedger(ops, { year: 2025, rates, withheldIn: withheldInOf() }).imported;
    const euros = inEuros(ops, rates);
    const without = buildLedger(euros, {
      year: 2025,
      rates: {},
      withheldIn: withheldInOf(),
    }).imported;
    expect(without).toEqual(withRates);
    expect(euros[1]).toMatchObject({ eur: 600, currency: 'EUR', fee: 4, feeCurrency: 'EUR' });
    expect(euros[0]).toMatchObject({ fee: 4, feeCurrency: 'EUR' });
    expect(euros[2].withholding).toBe(12);
    expect(euros[3].withholding).toBe(0);
    expect(euros[4].cost).toBe(100);
    // No rate for pounds: no euros and the fee stays in its currency.
    expect(euros[7]).toMatchObject({ eur: null, fee: 1, feeCurrency: 'GBP' });
    expect(euros[8]).toMatchObject({ fee: 0.01, feeCurrency: 'ETH' });
  });
});

describe('taking a file out', () => {
  const euros = inEuros(ops, rates);
  const sources = [
    { file: 'a.csv', ops: euros.slice(0, 4), certificate: [] },
    {
      file: 'b.csv',
      ops: euros.slice(4),
      certificate: [{ field: 'interest' as const, amount: 7, line: 'Intereses 7,00' }],
    },
    { file: '', ops: [], certificate: [] },
  ];
  const all = importedFrom(sources, { year: 2025, professional: false }, ['a.csv', 'b.csv']);

  it('works the rest out again', () => {
    expect(all.capital.interest).toBe(7);
    const rest = withoutFile(all, 'a.csv');
    expect(rest).not.toBe('unknown');
    const left = rest as Exclude<typeof rest, 'unknown' | null>;
    expect(left.files).toEqual(['b.csv']);
    expect(left.capital).toMatchObject({ interest: 7, dividends: 0 });
    expect(left.assets.map((a) => a.name)).toEqual(['B', 'F', 'C', 'ETH']);
    expect(left).toEqual(
      importedFrom([sources[1], sources[2]], { year: 2025, professional: false }, ['b.csv'])
    );
  });

  it('gives nothing when no file is left, and cannot split an old import', () => {
    const once = withoutFile(all, 'a.csv') as typeof all;
    expect(withoutFile(once, 'b.csv')).toBeNull();
    expect(withoutFile({ ...all, sources: undefined }, 'a.csv')).toBe('unknown');
    expect(withoutFile({ ...all, options: undefined }, 'a.csv')).toBe('unknown');
  });

  it('adds the ticked certificate lines', () => {
    const base = importedFrom([], { year: 2025, professional: false }, []);
    const out = withCertificate(base, [
      { field: 'dividends', amount: 5, line: '' },
      { field: 'expenses', amount: 1, line: '' },
      { field: 'withheld', amount: 2, line: '' },
      { field: 'gains', amount: 3, line: '' },
      { field: 'losses', amount: 4, line: '' },
      { field: 'proceeds', amount: 9, line: '' },
    ]);
    expect(out.capital).toMatchObject({ dividends: 5, expenses: 1 });
    expect(out.withheld.capital).toBe(2);
    expect(out.otherGains).toEqual([3, -4]);
  });
});

describe('information sheets of a report', () => {
  const reading = (table: string, recognised: boolean, header = ['a', 'b', 'c']): TableReading => ({
    table,
    format: recognised ? ({ id: 'x' } as TableReading['format']) : null,
    ops: [],
    skipped: 0,
    header,
    headerRow: 0,
  });

  it('are not asked to be mapped when another sheet was recognised, and lose their header', () => {
    const out = withInfoSheets([
      reading('Customer Information', false, ['Nombre', 'Persona', 'ID']),
      reading('Trades', true),
      reading('Otra', false),
    ]);
    expect(out.map((r) => [r.table, !!r.info, r.header])).toEqual([
      ['Customer Information', true, []],
      ['Trades', false, ['a', 'b', 'c']],
      ['Otra', true, []],
    ]);
  });

  it('when nothing is recognised: only the sheets that look like information', () => {
    const out = withInfoSheets([
      reading('Customer Information', false),
      reading('Resumen', false),
      reading('Dos columnas', false, ['a', 'b']),
      reading('Movimientos', false),
    ]);
    expect(out.map((r) => !!r.info)).toEqual([true, true, true, false]);
  });
});
