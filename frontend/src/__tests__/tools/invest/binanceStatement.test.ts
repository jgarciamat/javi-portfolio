/**
 * Binance's account statement in Excel, sheet by sheet, with the exact headers of a real export
 * (headers only, checked with `npm run validar-archivo`) and invented data (test-utils).
 */
import { readXlsx } from '@modules/finances/application/spreadsheet';
import { readTables, withInfoSheets } from '@modules/tools/domain/invest/detect';
import { buildLedger } from '@modules/tools/domain/invest/ledger';
import { reportLines, validationReport } from '@modules/tools/domain/invest/validate';
import { BINANCE_WORKBOOK } from '@test-utils/binanceWorkbook';
import { buildXlsx } from '../../../../scripts/xlsx';

const sheets = readXlsx(buildXlsx(BINANCE_WORKBOOK).slice().buffer as ArrayBuffer);
const readings = withInfoSheets(readTables(sheets, 'Binance- informe.xlsx'));
const of = (name: string) => readings.find((r) => r.table === name) as (typeof readings)[number];
const pick = (name: string) =>
  of(name).ops.map((o) => [o.kind, o.asset, o.units, o.amount, o.currency, o.toAsset, o.toUnits]);
const rates = { USD: [['2020-01-01', 1.25]] as [string, number][] };

describe('every sheet with its own reading', () => {
  it('leaves out the customer and the balances, without keeping their content', () => {
    expect(of('Customer Information')).toMatchObject({ info: true, header: [], ops: [] });
    expect(of('Assets Overview')).toMatchObject({ info: true, header: [], ops: [] });
  });

  it('money in and out: no gain, kept to check where the money came from', () => {
    expect(of('Fiat Deposit History').format?.id).toBe('binance-fiat-deposits');
    expect(pick('Fiat Deposit History')).toEqual([
      ['ignore', 'EUR', 3000, 3000, 'EUR', undefined, undefined],
    ]);
    expect(of('Fiat Deposit History').ops[0].note).toBe('fiatDeposit');
    expect(of('Fiat Withdrawal History')).toMatchObject({
      format: { id: 'binance-fiat-withdrawals' },
      ops: [],
      dataRows: 0,
    });
  });

  it('crypto deposits and withdrawals are transfers (no address, id or TXID is read)', () => {
    expect(pick('Deposit History')).toEqual([
      ['transferIn', 'ETH', 1, null, null, undefined, undefined],
    ]);
    expect(pick('Withdrawal History')).toEqual([
      ['transferOut', 'ETH', 1.001, null, null, undefined, undefined],
    ]);
    const text = JSON.stringify(readings);
    expect(text).not.toMatch(/0xficticio|00000000|FICT-OTC|PERSONA|example\.com|bc1q/);
  });

  it('orders: only what was traded, buys and sells against money, swaps valued in USDT', () => {
    expect(pick('Order History')).toEqual([
      ['buy', 'BTC', 0.05, 2000, 'EUR', undefined, undefined],
      ['swap', 'BTC', 0.03003, 3300, 'USDT', 'ETH', 1.001],
      // A cancelled order that had filled half counts for what it filled.
      ['sell', 'BTC', 0.01, 600, 'EUR', undefined, undefined],
    ]);
    expect(of('Order History').ops.every((o) => o.feesMissing)).toBe(true);
  });

  it('OTC and Convert: completed purchases with money and swaps between coins', () => {
    expect(pick('OTC Trading')).toEqual([
      ['buy', 'BTC', 0.002, 120, 'EUR', undefined, undefined],
      ['swap', 'BTC', 0.001, 65, 'USDT', 'USDT', 65],
    ]);
    expect(pick('Convert History')).toEqual([['swap', 'BTC', 0.005, null, null, 'USDT', 300]]);
    expect(pick('Dust Log')).toEqual([['swap', 'XYZ', 5, null, null, 'BNB', 0.01]]);
  });

  it('rewards, futures results and an unknown sheet to map on its own', () => {
    expect(of('Simple Earn Flexible Interest').ops[0]).toMatchObject({
      kind: 'reward',
      reward: 'lending',
      asset: 'ETH',
    });
    expect(pick('Futures Transaction History')).toEqual([
      ['realized', 'BTCUSDT', 0, 25, 'USDT', undefined, undefined],
      ['realized', 'BTCUSDT', 0, 0, 'USDT', undefined, undefined],
    ]);
    expect(of('Futures Transaction History').ops[1].cost).toBe(1);
    expect(of('Pay').info).toBeFalsy();
    expect(of('Pay')).toMatchObject({
      format: null,
      header: ['Fecha', 'Concepto', 'Cosa', 'Importe'],
    });
  });
});

describe('older versions of the statement (other headers, Spanish sheet names)', () => {
  const old = readTables(
    [
      {
        name: 'Historial de órdenes',
        rows: [
          ['Historial de órdenes'],
          [
            'Date(UTC)',
            'Pair',
            'Type',
            'Order Price',
            'Order Amount',
            'AvgTrading Price',
            'Filled',
            'Total',
            'Fee',
            'status',
          ],
          [
            '2025-01-05 10:00:00',
            'BTCEUR',
            'BUY',
            40000,
            0.05,
            40000,
            '0.05BTC',
            '2000EUR',
            '2EUR',
            'FILLED',
          ],
          ['2025-01-06 10:00:00', 'BTCEUR', 'SELL', 40000, 0.05, 0, 0, 0, 0, 'CANCELED'],
          ['2025-01-07 10:00:00', 'BTCEUR', 'SELL', 40000, 0.01, 41000, 0.01, '', '', 'FILLED'],
        ],
      },
      {
        name: 'Depósitos',
        rows: [
          ['Date(UTC)', 'Coin', 'Amount', 'Status'],
          ['2025-02-01 10:00:00', 'ETH', 1, 'Completed'],
          ['2025-02-02 10:00:00', 'ETH', 2, 'Pending'],
          ['2025-02-03 10:00:00', 'EUR', 2, 'Completed'],
        ],
      },
      {
        name: 'Retiradas',
        rows: [
          ['Date(UTC)', 'Coin', 'Amount', 'Fee', 'Status'],
          ['2025-02-04 10:00:00', 'ETH', 0.5, 0.001, 'Completed'],
        ],
      },
      {
        name: 'Fiat Withdrawal',
        rows: [
          ['Date(UTC)', 'Coin', 'Amount', 'Status'],
          ['2025-03-04 10:00:00', 'EUR', 100, 'Successful'],
          ['2025-03-05 10:00:00', 'EUR', 100, 'Failed'],
          ['2025-03-06 10:00:00', 'EUR', '', 'Successful'],
        ],
      },
      {
        name: 'Margin Interest',
        rows: [
          ['Date(UTC)', 'Asset', 'Type', 'Amount'],
          ['2025-04-01 10:00:00', 'USDT', 'Borrow', 100],
          ['2025-04-02 10:00:00', 'USDT', 'Interest', -0.5],
          ['2025-04-03 10:00:00', 'USDT', 'Interest', 0],
        ],
      },
      {
        name: 'Staking Rewards',
        rows: [
          ['Date(UTC)', 'Coin', 'Amount', 'Remark'],
          ['2025-05-01 10:00:00', 'DOT', 0.5, ''],
          ['2025-05-02 10:00:00', '', 0.5, ''],
        ],
      },
      {
        name: 'Airdrop',
        rows: [
          ['Date(UTC)', 'Coin', 'Amount'],
          ['2025-05-03', 'ABC', 1],
        ],
      },
      {
        name: 'Referral',
        rows: [
          ['Date(UTC)', 'Coin', 'Amount'],
          ['2025-05-04', 'BNB', 0.1],
        ],
      },
      {
        name: 'Cashback',
        rows: [
          ['Date(UTC)', 'Coin', 'Amount'],
          ['2025-05-05', 'BNB', 0.1],
        ],
      },
      {
        name: 'Convert',
        rows: [
          ['Date(UTC)', 'From Asset', 'Sell', 'To Asset', 'Buy', 'Status'],
          ['2025-06-01 10:00:00', 'BTC', 0.001, 'USDT', 60, 'Success'],
          ['2025-06-02 10:00:00', 'BTC', 0.001, 'USDT', 60, 'Failed'],
          ['2025-06-03 10:00:00', '', 'x', '', 'y', 'Success'],
        ],
      },
      {
        name: 'Futures',
        rows: [
          ['Date(UTC)', 'Symbol', 'Realized Profit'],
          ['2025-07-01', 'ETHUSDT', -3],
          ['2025-07-02', '', 2],
        ],
      },
      {
        name: 'Dust',
        rows: [
          ['Date(UTC)', 'Coin', 'Amount', 'Converted BNB', 'Fee'],
          ['2025-08-01', 'XYZ', 5, 0.01, 0.0002],
        ],
      },
    ],
    'viejo.xlsx'
  );
  const ops = (i: number) =>
    old[i].ops.map((o) => [o.kind, o.asset, o.units, o.amount, o.fee, o.feeCurrency]);

  it('reads them with the names of each sheet', () => {
    expect(old.map((r) => r.format?.id)).toEqual([
      'binance-orders',
      'binance-transfers',
      'binance-transfers',
      'binance-fiat',
      'binance-derivatives',
      'binance-rewards',
      'binance-rewards',
      'binance-rewards',
      'binance-rewards',
      'binance-convert',
      'binance-derivatives',
      'binance-convert',
    ]);
    expect(ops(0)).toEqual([
      ['buy', 'BTC', 0.05, 2000, 2, 'EUR'],
      ['sell', 'BTC', 0.01, 410, 0, 'EUR'],
    ]);
    expect(ops(1)).toEqual([['transferIn', 'ETH', 1, null, 0, 'ETH']]);
    expect(ops(2)).toEqual([['transferOut', 'ETH', 0.5, null, 0.001, 'ETH']]);
    expect(old[3].ops.map((o) => [o.note, o.units])).toEqual([['fiatWithdrawal', 100]]);
    expect(old[4].ops.map((o) => [o.cost, o.currency])).toEqual([[0.5, 'USDT']]);
    expect(old[5].ops.map((o) => o.reward)).toEqual(['staking']);
    expect([6, 7, 8].map((i) => old[i].ops[0].reward)).toEqual(['airdrop', 'referral', 'cashback']);
    expect(ops(9)).toEqual([['swap', 'BTC', 0.001, null, 0, null]]);
    expect(old[9].skipped).toBe(1);
    expect(old[10].ops.map((o) => [o.asset, o.cost, o.currency])).toEqual([
      ['ETHUSDT', 3, 'USDT'],
      ['', 0, 'USDT'],
    ]);
    expect(old[11].ops[0]).toMatchObject({ toAsset: 'BNB', fee: 0.0002, feeCurrency: 'BNB' });
  });

  it('the exact sheets also without their optional columns, and the rows that do not count', () => {
    const t = readTables(
      [
        {
          name: 'Order History',
          rows: [
            ['Market ID', 'Price', 'Qty', 'Average Price', 'Trade Qty', 'Time', 'Side', 'Status'],
            ['ETHBTC', 0.03, 1, 0.03, 1, '2025-01-20 10:00:00', 'SELL', 'FILLED'],
            ['ABCDEF', 1, 1, 1, 1, '2025-01-21 10:00:00', 'BUY', 'FILLED'],
          ],
        },
        {
          name: 'OTC Trading',
          rows: [
            [
              'BaseCoin',
              'QuoteCoin',
              'BaseCoinAmount',
              'QuoteCoinAmount',
              'UserStatus',
              'CreateTime',
            ],
            ['ETH', 'BTC', 1, 0.03, 'SUCCESS', '2025-03-01 10:00:00'],
            ['ETH', 'BTC', 1, 0.03, 'PROCESSING', '2025-03-02 10:00:00'],
          ],
        },
        {
          name: 'Deposit History',
          rows: [
            ['Currency', 'Amount', 'Account Type', 'Deposit Address', 'Create Time', 'Status'],
            ['ETH', 1, 'Spot', 'x', '2025-02-10 10:00:00', 'Failed'],
            ['ETH', 0, 'Spot', 'x', '2025-02-11 10:00:00', 'Completed'],
          ],
        },
        {
          name: 'Fiat Deposit History',
          rows: [
            ['Status', 'Create Time', 'Amount', 'Currency', 'Golden Channel'],
            ['Successful', '2025-01-02 09:00:00', 10, '', 'SEPA'],
            ['Successful', '2025-01-02 09:00:00', '', 'EUR', 'SEPA'],
          ],
        },
        {
          name: 'Convert',
          rows: [
            ['Date(UTC)', 'From Asset', 'Sell', 'To Asset', 'Buy', 'Status'],
            ['2025-06-04 10:00:00', 'EUR', 50, 'BTC', 0.001, 'Success'],
          ],
        },
      ],
      'f.xlsx'
    );
    expect(t[0].ops.map((o) => [o.kind, o.asset, o.units, o.toAsset, o.toUnits, o.amount])).toEqual(
      [['swap', 'ETH', 1, 'BTC', 0.03, null]]
    );
    expect(t[0].skipped).toBe(1);
    expect(t[1].ops.map((o) => [o.kind, o.asset, o.toAsset, o.amount])).toEqual([
      ['swap', 'ETH', 'BTC', null],
    ]);
    expect(t[2].ops).toEqual([]);
    expect(t[3].ops.map((o) => [o.asset, o.units])).toEqual([['EUR', 10]]);
    expect(t[4].ops.map((o) => [o.kind, o.asset, o.amount, o.currency])).toEqual([
      ['buy', 'BTC', 50, 'EUR'],
    ]);
  });

  it('never reads a sheet format from a file named like a sheet', () => {
    const csv = readTables(
      [
        {
          name: 'order-history.csv',
          rows: [
            ['Date(UTC)', 'Pair', 'Filled'],
            ['2025-01-01', 'BTCEUR', 1],
          ],
        },
      ],
      'f'
    );
    expect(csv[0].format).toBeNull();
  });
});

describe('the whole statement together', () => {
  const ledger = buildLedger(
    readings.flatMap((r) => r.ops),
    { year: 2025, rates }
  );

  it('pairs the withdrawal and the deposit of ETH, values the swap and says the fees are missing', () => {
    const codes = ledger.warnings.map((w) => w.code);
    expect(codes).not.toContain('unmatchedTransfer');
    expect(codes).not.toContain('transferWithoutOrigin');
    expect(codes).toContain('noFees');
    // The swap of 0.03003 BTC for ETH is worth 3,300 USDT = 2,640 € (at 1.25).
    const swap = ledger.ops.find((o) => o.kind === 'swap' && o.toAsset === 'ETH');
    expect(swap?.value).toBe(2640);
    // 0.05 BTC for 2,000 €: the ETH swap took 0.03003 at 40,000 € (1,201.20 €); gain 1,438.80.
    expect(ledger.sales.find((s) => s.date === '2025-01-20')).toMatchObject({
      cost: 1201.2,
      gain: 1438.8,
    });
    expect(ledger.ops.filter((o) => o.note === 'fiatDeposit')).toHaveLength(1);
  });

  it('the local validation lists sheet by sheet, without content', () => {
    const r = validationReport(readings, ledger, [], 'Binance- informe.xlsx');
    expect(r.tables.map((t) => [t.sheet, t.format !== null, t.operations, t.rows])).toEqual([
      ['Customer Information', false, 0, 4],
      ['Assets Overview', false, 0, 1],
      ['Fiat Deposit History', true, 1, 2],
      ['Fiat Withdrawal History', true, 0, 0],
      ['Deposit History', true, 1, 1],
      ['Withdrawal History', true, 1, 1],
      ['Order History', true, 3, 4],
      ['OTC Trading', true, 2, 3],
      ['Convert History', true, 1, 1],
      ['Simple Earn Flexible Interest', true, 1, 1],
      ['Futures Transaction History', true, 2, 3],
      ['Dust Log', true, 1, 1],
      ['Pay', false, 0, 1],
    ]);
    const text = reportLines(r).join('\n');
    expect(text).toContain('Hoja «Order History» → Binance');
    expect(text).not.toMatch(/0xficticio|00000000|PERSONA|example\.com|bc1q/);
    // A file of one table is named after the file: its name is not printed.
    expect(
      validationReport([{ ...readings[2], table: 'mio.csv' }], ledger, [], 'mio.csv').tables[0]
        .sheet
    ).toBe('');
  });
});
