/**
 * The local validation of a real export: only structure and totals, never names, ids or rows.
 * Made-up files.
 */
import { parseCSV } from '@modules/finances/domain/importParsers';
import { readTables, withInfoSheets } from '@modules/tools/domain/invest/detect';
import { buildLedger } from '@modules/tools/domain/invest/ledger';
import { reportLines, validationReport } from '@modules/tools/domain/invest/validate';

const BINANCE = `Date(UTC),Pair,Side,Price,Executed,Amount,Fee
2024-03-01 10:00:00,BTCEUR,BUY,30000,0.1BTC,3000EUR,3EUR
2025-03-01 10:00:00,BTCEUR,SELL,40000,0.05BTC,2000EUR,2EUR
nada,BTCEUR,SELL,1,1BTC,1EUR,0EUR`;

describe('the validation report', () => {
  it('gives the format, the counts, the result of each year and the warnings', () => {
    const readings = withInfoSheets([
      ...readTables([{ name: 'Trades', rows: parseCSV(BINANCE) }], 'f'),
      ...readTables(
        [
          {
            name: 'Customer Information',
            rows: [
              ['Name', 'User ID', 'Email'],
              ['PERSONA FICTICIA', '123', 'x@example.com'],
            ],
          },
        ],
        'f'
      ),
    ]);
    const ops = [
      ...readings.flatMap((r) => r.ops),
      {
        ...readings[0].ops[0],
        id: 'cfd',
        kind: 'realized' as const,
        assetClass: 'derivative' as const,
        date: '2025-05-05',
        at: '2025-05-05T00:00:00',
        amount: 0,
        cost: 10,
      },
      {
        ...readings[0].ops[0],
        id: 'air',
        kind: 'reward' as const,
        reward: 'airdrop' as const,
        asset: 'ABC',
        date: '2024-06-06',
        at: '2024-06-06T00:00:00',
        amount: 4,
      },
    ];
    const ledger = buildLedger(ops, { year: 2025, rates: {} });
    const r = validationReport(readings, ledger, [{ field: 'interest', amount: 1, line: 'x' }]);
    expect(r.tables).toEqual([
      {
        n: 1,
        sheet: 'Trades',
        rows: 3,
        format: expect.stringContaining('Binance'),
        confirmed: false,
        operations: 2,
        skipped: 1,
        info: false,
        columns: [],
      },
      {
        n: 2,
        sheet: 'Customer Information',
        rows: 1,
        format: null,
        confirmed: false,
        operations: 0,
        skipped: 0,
        info: true,
        columns: [],
      },
    ]);
    expect(r.byKind).toEqual({ buy: 1, sell: 1, realized: 1, reward: 1 });
    // 2025: 1,998 − 1,501.50 = 496.50 of crypto and the CFD −10; 2024: an airdrop of 4.
    expect(r.years).toEqual([
      { year: 2024, sections: {}, direct: 4, total: 4 },
      { year: 2025, sections: { crypto: 496.5 }, direct: -10, total: 486.5 },
    ]);
    expect(r.certificate).toEqual({ interest: 1 });
    const text = reportLines(r).join('\n');
    expect(text).toContain('hoja informativa');
    expect(text).toContain('496,50 €');
    expect(text).not.toMatch(/PERSONA|example\.com|123/);
  });

  it('lists the column names of what was not recognised, and says when there is nothing', () => {
    const readings = readTables(
      [{ name: 'x', rows: parseCSV('Día;Cosa;Cuánto\n01/01/2025;BTC;1') }],
      'f'
    );
    const r = validationReport(readings, buildLedger([], { year: 2025, rates: {} }));
    expect(r.tables[0].columns).toEqual(['Día', 'Cosa', 'Cuánto']);
    const text = reportLines(r).join('\n');
    expect(text).toContain('no reconocida; columnas: Día | Cosa | Cuánto');
    expect(text).toContain('Avisos: —');
    const empty = reportLines({
      ...r,
      tables: [{ ...r.tables[0], columns: [] }],
      years: [{ year: 2024, sections: {}, direct: 0, total: 0 }],
    }).join('\n');
    expect(empty).toContain('columnas: —');
    expect(empty).toContain('sin ventas');
    const confirmed = reportLines({
      ...r,
      tables: [{ ...r.tables[0], format: 'X · Y', confirmed: true }],
    }).join('\n');
    expect(confirmed).toContain('Hoja «x» → X · Y → 0 operaciones');
    const unnamed = reportLines({ ...r, tables: [{ ...r.tables[0], sheet: '' }] }).join('\n');
    expect(unnamed).toContain('Tabla 1 → no reconocida');
  });
});
