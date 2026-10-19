import { parseCSV } from '@modules/finances/domain/importParsers';
import { jsonTables, readTables, splitSections } from '@modules/tools/domain/invest/detect';
import { buildLedger } from '@modules/tools/domain/invest/ledger';
import {
  GENERIC_TYPES,
  guessMapping,
  headerKey,
  mappedSpec,
  readMapped,
  type Mapping,
} from '@modules/tools/domain/invest/mapping';
import {
  isCertificate,
  isQuantfury,
  readCertificate,
  readQuantfury,
} from '@modules/tools/domain/invest/pdfReports';
import { legsToOps, fromTo } from '@modules/tools/domain/invest/read';
import { guideSteps } from '@modules/tools/domain/invest/guide';
import { declarationRows, reportTables, summaryOf } from '@modules/tools/domain/invest/report';
import type { InvestOp } from '@modules/tools/domain/invest/types';

describe('JSON and statements with sections', () => {
  it('reads an array of objects, or the arrays inside an object', () => {
    const [table] = jsonTables(
      's.json',
      '[{"Date":"2025-01-05","Action":"Buy","n":2,"x":null,"o":{"a":1}},5]'
    );
    expect(table.rows).toEqual([
      ['Date', 'Action', 'n', 'x', 'o'],
      ['2025-01-05', 'Buy', 2, null, '{"a":1}'],
    ]);
    const nested = jsonTables(
      's.json',
      '{"FromDate":"x","BrokerageTransactions":[{"Date":"01/05/2025"}]}'
    );
    expect(nested.map((t) => t.name)).toEqual(['s.json · BrokerageTransactions']);
    expect(jsonTables('s.json', 'not json')).toEqual([]);
    expect(jsonTables('s.json', 'null')).toEqual([]);
  });

  it('keeps an ordinary table as it is', () => {
    const table = { name: 'x', rows: parseCSV('a,b\n1,2') };
    expect(splitSections(table)).toEqual([table]);
    expect(splitSections({ name: 'empty', rows: [] })).toEqual([{ name: 'empty', rows: [] }]);
    // An unknown table with an empty cell in its header, and a known one with a short row.
    expect(
      readTables([{ name: 'n', rows: [['Uno', 'Dos', 'Tres', null]] }], 'f')[0].header
    ).toEqual(['Uno', 'Dos', 'Tres', '']);
    const short = readTables(
      [
        {
          name: 's',
          rows: [
            ['Symbol', 'Type', 'Quantity', 'Price', 'Value', 'Fees', 'Date'],
            ['BTC', 'Buy', '1', '€1', '€1'],
          ],
        },
      ],
      'f'
    );
    expect(short[0].skipped).toBe(1);
    const ledger = readTables(
      [
        {
          name: 'l',
          rows: [
            ['Operation Date', 'Status', 'Currency Ticker', 'Operation Type', 'Operation Amount'],
            ['2025-01-05', 'Confirmed', 'BTC', 'IN', '1'],
            ['2025-01-06'],
          ],
        },
      ],
      'f'
    );
    expect(ledger[0].ops.map((o) => o.kind)).toEqual(['transferIn']);
  });

  it('a Schwab JSON export is read like its CSV', () => {
    const tables = jsonTables(
      'schwab.json',
      JSON.stringify({
        BrokerageTransactions: [
          {
            Date: '01/05/2025',
            Action: 'Buy',
            Symbol: 'AAPL',
            Description: 'APPLE FICTICIA',
            Quantity: '2',
            Price: '$200.00',
            'Fees & Comm': '',
            Amount: '-$400.00',
          },
        ],
      })
    );
    const [r] = readTables(tables, 'schwab.json');
    expect(r.format?.id).toBe('schwab');
    expect(r.ops[0]).toMatchObject({ kind: 'buy', units: 2, amount: 400 });
  });
});

describe('the guided mapping', () => {
  const header = [
    'Día',
    'Operación',
    'Moneda',
    'Cantidad',
    'Precio',
    'Total',
    'Divisa',
    'Comisión',
    'Recibido',
    'Cant. recibida',
    'ISIN',
    'Retención',
  ];
  it('guesses the columns by their names, each column once', () => {
    expect(guessMapping(header)).toEqual({
      date: 0,
      type: 1,
      asset: 2,
      units: 3,
      price: 4,
      amount: 5,
      currency: 6,
      fee: 7,
      isin: 10,
      withholding: 11,
    });
    expect(guessMapping(['', 'x'])).toEqual({});
  });

  it('reads the table with the answers: kinds in several languages, swaps, sign when there is no type', () => {
    const mapping: Mapping = {
      columns: {
        date: 0,
        type: 1,
        asset: 2,
        units: 3,
        price: 4,
        amount: 5,
        currency: 6,
        fee: 7,
        toAsset: 8,
        toUnits: 9,
      },
      assetClass: 'crypto',
      locale: 'es',
      order: 'dmy',
      platform: '',
    };
    const rows = parseCSV(`${header.join(';')}
05/01/2025;Compra;BTC;0,01;40000;;EUR;1;;
06/01/2025;Kauf;ETH;1;3000;3000;EUR;0;;
07/01/2025;Permuta;BTC;0,002;;;;;ETH;0,03
08/01/2025;;BTC;-0,001;45000;;EUR;0;;
09/01/2025;Otra cosa;BTC;1;1;1;EUR;0;;
10/01/2025;;BTC;0;1;1;EUR;0;;
11/01/2025;;ETH;2;10;;EUR;0;;`);
    const { ops, skipped } = readMapped(rows, 0, mapping, 'mine.csv');
    expect(skipped).toBe(2);
    expect(ops.map((o) => [o.kind, o.asset, o.units, o.amount, o.toAsset, o.account])).toEqual([
      ['buy', 'BTC', 0.01, 400, undefined, 'Archivo propio'],
      ['buy', 'ETH', 1, 3000, undefined, 'Archivo propio'],
      ['swap', 'BTC', 0.002, null, 'ETH', 'Archivo propio'],
      ['sell', 'BTC', 0.001, 45, undefined, 'Archivo propio'],
      ['buy', 'ETH', 2, 20, undefined, 'Archivo propio'],
    ]);
    expect(
      mappedSpec(header, { ...mapping, platform: 'Mi banco', assetClass: 'fund' })
    ).toMatchObject({
      platform: 'Mi banco',
      category: 'broker',
    });
    expect(mappedSpec(['', 'b'], { ...mapping, columns: { date: 0, asset: 1 } }).columns).toEqual({
      asset: ['b'],
    });
    expect(readMapped([], 0, mapping, 'x').ops).toEqual([]);
    expect(
      readMapped(
        [
          ['Día', null],
          ['05/01/2025', 'x'],
        ],
        0,
        mapping,
        'x'
      ).ops
    ).toEqual([]);
    expect(headerKey(['Día', 'Cosa '])).toBe('dia|cosa');
    expect(GENERIC_TYPES.length).toBeGreaterThan(10);
  });
});

describe('legs and from/to rows', () => {
  const base: InvestOp = {
    id: 'x',
    format: 'f',
    account: 'A',
    date: '2025-01-01',
    at: '2025-01-01T00:00:00',
    kind: 'ignore',
    asset: 'BTC',
    assetClass: 'crypto',
    units: 0,
    amount: null,
    currency: null,
    eur: null,
    fee: 0,
    feeCurrency: null,
  };
  it('a leg spent with nothing received is a sale whose price is asked for', () => {
    const ops = legsToOps([{ base, change: -0.5, rule: ['swap'], group: 'g' }]);
    expect(ops).toMatchObject([{ kind: 'sell', units: 0.5 }]);
    expect(legsToOps([{ base, change: 0, rule: null, group: 'g' }])).toEqual([]);
    // Two fills of the same sale (BTC for euros) are summed.
    const sold = legsToOps([
      { base, change: -0.25, rule: ['swap'], group: 'g' },
      { base, change: -0.25, rule: ['swap'], group: 'g' },
      {
        base: { ...base, asset: 'EUR', assetClass: 'fiat' },
        change: 20000,
        rule: ['swap'],
        group: 'g',
      },
    ]);
    expect(sold).toMatchObject([
      { kind: 'sell', asset: 'BTC', units: 0.5, amount: 20000, currency: 'EUR' },
    ]);
  });

  it('keeps other kinds as they are', () => {
    expect(fromTo({ ...base, kind: 'reward', toAsset: 'ETH' }).kind).toBe('reward');
    expect(
      fromTo({ ...base, kind: 'buy', asset: 'EUR', toAsset: 'BTC', toUnits: 1 })
    ).toMatchObject({
      kind: 'buy',
      asset: 'BTC',
      amount: 0,
      currency: 'EUR',
    });
    expect(fromTo({ ...base, kind: 'buy', asset: 'EUR', toAsset: 'BTC' }).units).toBe(0);
    expect(fromTo({ ...base, kind: 'sell', toAsset: 'EUR', toUnits: 100 })).toMatchObject({
      kind: 'sell',
      amount: 100,
      currency: 'EUR',
    });
  });
});

describe('Quantfury trading history (PDF)', () => {
  // Made-up lines with the layout of the report: each position ends in "Total ±X".
  const lines = [
    'Informe del historial de trading',
    '01/01/2020 - 31/12/2026',
    'Generado: 19/10/2026',
    'Nombre del cliente:   PERSONA FICTICIA',
    'Posiciones Cerradas',
    'Acciones y ETFs',
    'Símbolo   Fecha/Hora de la posición   Acción   Precio   Cantidad   Valor   G&P de la posición',
    'FICT   18/08/2026 3:49:51 PM UTC   COMPRAR (abrir)   $142.94   28 acciones   $4,002.32',
    '18/08/2026 5:10:00 PM UTC   VENDER (cerrar)   $144.23   28 acciones   $4,002.32   +$36.12',
    'Total   +$36.12',
    'OTRA   02/12/2025 10:00:00 AM UTC   VENDER (abrir)   $50.00   10 acciones   $500.00',
    '03/12/2025 10:00:00 AM UTC   COMPRAR (añadir)   $51.00   10 acciones   $510.00',
    '05/01/2026 9:00:00 AM UTC   COMPRAR (cerrar)   $52.00   20 acciones   $1,010.00   -$30.00',
    'Total   -$30.00',
    'Pares de criptomonedas',
    'BTC/USDT   27/04/2020 11:08:37 AM UTC   COMPRAR (abrir)   7,705.01   0.25957137 BTC   ₮2,000.00',
    '28/04/2020 1:00:00 PM UTC   VENDER (reducir)   7,800.00   0.1 BTC   ₮780.00   +₮9.50',
    '29/04/2020 1:00:00 PM UTC   VENDER (cerrar)   7,600.00   0.15957137 BTC   ₮1,212.74   -₮25.00',
    'Total   -₮15.50',
    'Total   +$1.00',
    'Página 2 de 2',
  ];

  it('is recognised by its title and its section of closed positions', () => {
    expect(isQuantfury(lines)).toBe(true);
    expect(isQuantfury(['Informe del historial de trading'])).toBe(false);
  });

  it('gives one result per position, in the year it was closed', () => {
    const ops = readQuantfury(lines);
    expect(ops.map((o) => [o.asset, o.date, o.underlying, o.amount, o.cost, o.currency])).toEqual([
      ['FICT', '2026-08-18', 'shares', 36.12, 0, 'USD'],
      ['OTRA', '2026-01-05', 'shares', 0, 30, 'USD'],
      ['BTC/USDT', '2020-04-29', 'crypto', 0, 15.5, 'USDT'],
    ]);
    expect(ops[0]).toMatchObject({
      kind: 'realized',
      assetClass: 'derivative',
      account: 'Quantfury',
    });
    expect(
      readQuantfury([
        '18/08/2026 3:49:51 PM UTC   COMPRAR (abrir)',
        'Total   5.00',
        'Pares de criptomonedas',
        'X   18/08/2026 3:49:51 PM UTC   COMPRAR (abrir)',
        'Total   7.00',
      ]).map((o) => [o.asset, o.currency, o.amount])
    ).toEqual([
      ['?', 'USD', 5],
      ['X', 'USDT', 7],
    ]);
    expect(
      readQuantfury([
        'Total   abc',
        'FICT   18/08/2026 3:49:51 PM UTC   COMPRAR (abrir)',
        'Total   ¿?',
      ])[0]
    ).toMatchObject({
      amount: 0,
      cost: 0,
      currency: 'USD',
    });
  });

  it('in euros with the rate of the closing day; the loss of 2020 was due in the Renta 2020', () => {
    const ledger = buildLedger(readQuantfury(lines), {
      year: 2026,
      rates: { USD: [['2020-01-01', 1.2]] },
    });
    // +36.12 − 30 = 6.12 USD at 1.2 = 5.10 €; 2020: −15.50 USDT = −12.92 €.
    expect(ledger.direct.map((d) => d.gain)).toEqual([-25, 30.1]);
    expect(ledger.years[2020].savings).toBe(-12.92);
    expect(ledger.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['derivative', 'stablecoinPrice', 'earlierYears', 'lossYears'])
    );
  });
});

describe('fiscal certificates of Spanish entities (PDF)', () => {
  const lines = [
    'Banco Ficticio, S.A.',
    'Información fiscal del ejercicio 2025 a efectos del IRPF',
    'Intereses de cuentas y depósitos   123,45',
    'Dividendos   1.000,00',
    'Retenciones practicadas   234,56',
    'Ganancia patrimonial por reembolso   500,00',
    'Pérdida patrimonial   -20,00',
    'Valor de transmisión   2.500,00',
    'Valor de adquisición   2.000,00',
    'Gastos de custodia   10,00',
    'Texto sin importe',
    'Página 1 de 1',
  ];
  it('takes the amount of each labelled line', () => {
    expect(isCertificate(lines)).toBe(true);
    expect(isCertificate(['Hola'])).toBe(false);
    expect(readCertificate(lines).map((l) => [l.field, l.amount])).toEqual([
      ['interest', 123.45],
      ['dividends', 1000],
      ['withheld', 234.56],
      ['gains', 500],
      ['losses', 20],
      ['proceeds', 2500],
      ['cost', 2000],
      ['expenses', 10],
    ]);
  });
});

describe('what to copy and the report', () => {
  const op = (o: Partial<InvestOp> & Pick<InvestOp, 'kind' | 'date' | 'asset'>): InvestOp => ({
    id: `${o.asset}:${o.date}:${o.kind}`,
    format: 'f',
    account: 'Degiro',
    at: `${o.date}T00:00:00`,
    assetClass: 'crypto',
    units: 1,
    amount: null,
    currency: 'EUR',
    eur: null,
    fee: 0,
    feeCurrency: null,
    ...o,
  });
  const ledger = buildLedger(
    [
      op({ kind: 'buy', date: '2024-01-01', asset: 'BTC', units: 2, amount: 40000 }),
      op({ kind: 'sell', date: '2025-02-01', asset: 'BTC', amount: 30000 }),
      op({
        kind: 'swap',
        date: '2025-03-01',
        asset: 'BTC',
        amount: 10000,
        toAsset: 'ETH',
        toUnits: 4,
      }),
      op({
        kind: 'buy',
        date: '2024-01-01',
        asset: 'ES1',
        assetClass: 'fund',
        name: 'Fondo Ficticio',
        units: 10,
        amount: 1000,
      }),
      op({
        kind: 'sell',
        date: '2025-02-01',
        asset: 'ES1',
        assetClass: 'fund',
        name: 'Fondo Ficticio',
        units: 5,
        amount: 600,
      }),
      op({
        kind: 'sell',
        date: '2025-02-02',
        asset: 'ES1',
        assetClass: 'fund',
        name: 'Fondo Ficticio',
        units: 5,
        amount: 400,
      }),
      op({
        kind: 'buy',
        date: '2025-06-02',
        asset: 'ES1',
        assetClass: 'fund',
        name: 'Fondo Ficticio',
        units: 5,
        amount: 400,
      }),
      op({
        kind: 'buy',
        date: '2024-01-01',
        asset: 'US1',
        assetClass: 'shares',
        name: 'Ficticia Inc',
        units: 1,
        amount: 100,
      }),
      op({
        kind: 'sell',
        date: '2025-02-01',
        asset: 'US1',
        assetClass: 'shares',
        name: 'Ficticia Inc',
        units: 1,
        amount: 150,
      }),
      op({
        kind: 'realized',
        date: '2025-04-01',
        asset: 'OIL',
        assetClass: 'derivative',
        underlying: 'shares',
        amount: 0,
        cost: 70,
      }),
      op({
        kind: 'dividend',
        date: '2025-04-01',
        asset: 'US1',
        assetClass: 'shares',
        units: 0,
        amount: 10,
        withholding: 1.5,
      }),
      op({
        kind: 'reward',
        reward: 'airdrop',
        date: '2025-04-02',
        asset: 'ABC',
        units: 1,
        amount: 5,
      }),
    ],
    { year: 2025, rates: {} }
  );
  const rows = declarationRows(ledger);

  it('groups by fund, issuer, coin and key; a loss waiting for a repurchase does not count', () => {
    expect(
      rows.map((r) => [
        r.section,
        r.name,
        r.counterpart,
        r.proceeds,
        r.cost,
        r.gain,
        r.loss,
        r.lossCounted,
        r.sales,
      ])
    ).toEqual([
      ['iic', 'Fondo Ficticio', undefined, 1000, 1000, 100, 100, 0, 2],
      ['shares', 'Ficticia Inc', undefined, 150, 100, 50, 0, 0, 1],
      ['crypto', 'BTC', 'F', 30000, 20000, 10000, 0, 0, 1],
      ['crypto', 'BTC', 'N', 10000, 20000, 0, 10000, 10000, 1],
      ['other', 'OIL', undefined, 0, 70, 0, 70, 70, 1],
    ]);
  });

  it('sums each part and the capital income', () => {
    const sum = summaryOf(ledger);
    expect(sum.crypto).toEqual({ proceeds: 40000, cost: 40000, gain: 10000, loss: 10000 });
    expect(sum.capital).toMatchObject({ '0029': 10, foreignTax: 1.5 });
    expect(sum.general).toBe(5);
  });

  it('the report: sales with the FIFO audit, income, closed positions and years', () => {
    const tables = reportTables(ledger);
    expect(tables.map((t) => t.name)).toEqual([
      'Por activo',
      'Ventas y FIFO',
      'Rendimientos',
      'Posiciones cerradas',
      'Por año',
    ]);
    expect(tables[1].rows[1]).toEqual([
      '01/02/2025',
      'BTC',
      'BTC',
      'crypto',
      1,
      30000,
      20000,
      10000,
      0,
      '01/01/2024: 1 por 20000 €',
    ]);
    expect(tables[2].rows[1]).toEqual([
      '01/04/2025',
      'Degiro',
      'US1',
      'dividend',
      10,
      1.5,
      'Extranjero',
      '0029',
    ]);
    expect(tables[3].rows[1]).toEqual(['01/04/2025', 'Degiro', 'OIL', 'shares', 0, 70, -70]);
    // 10,000 − 10,000 (crypto) + 100 (fund) + 50 (shares) − 70 (CFD) + 10 (dividend) = 90.
    expect(tables[4].rows[1]).toEqual([2025, 90, 5]);
    expect(tables[0].rows[3]).toEqual([
      'crypto',
      'BTC',
      'BTC',
      'F',
      1,
      30000,
      20000,
      10000,
      0,
      '1804 / 1806 / 1809 / 1808',
    ]);
    expect(tables[0].rows[1][3]).toBe('');
    const spanish = buildLedger(
      [
        op({
          kind: 'interest',
          date: '2025-04-01',
          asset: 'C',
          units: 0,
          amount: 1,
          withholding: 0.19,
          withheldIn: 'spain',
        }),
        op({
          kind: 'realized',
          date: '2025-04-01',
          asset: 'X',
          assetClass: 'derivative',
          amount: 1,
          cost: 0,
        }),
      ],
      { year: 2025, rates: {} }
    );
    const t = reportTables(spanish);
    expect(t[2].rows[1][6]).toBe('España');
    expect(t[3].rows[1][3]).toBe('');
  });

  it('the guide shows the steps that apply, all of them when nothing was imported', () => {
    const all = guideSteps(null, []).map((s) => s.id);
    expect(all).toEqual([
      'before',
      'draft',
      'funds',
      'onlySwitches',
      'shares',
      'crypto',
      'other',
      'capital',
      'general',
      'foreign',
      'losses',
      'earlier',
      'm721',
      'm720',
      'activity',
      'deadline',
      'rectify',
      'keep',
      'gestor',
    ]);
    const mine = guideSteps(ledger, rows);
    expect(mine.map((s) => s.id)).toEqual([
      'before',
      'draft',
      'funds',
      'shares',
      'crypto',
      'other',
      'capital',
      'general',
      'foreign',
      'losses',
      'deadline',
      'rectify',
      'keep',
      'gestor',
    ]);
    expect(mine.find((s) => s.id === 'capital')?.params).toEqual({
      interest: 0,
      dividends: 10,
      assets: 0,
    });
    expect(mine.find((s) => s.id === 'crypto')?.unconfirmed).toBe(true);
    const switched = buildLedger(
      [
        op({
          kind: 'buy',
          date: '2024-01-01',
          asset: 'ES1',
          assetClass: 'fund',
          units: 10,
          amount: 1000,
        }),
        op({ kind: 'switchOut', date: '2025-02-01', asset: 'ES1', assetClass: 'fund', units: 10 }),
        op({ kind: 'switchIn', date: '2025-02-02', asset: 'ES2', assetClass: 'fund', units: 10 }),
        op({
          kind: 'buy',
          date: '2025-02-02',
          asset: 'BTC',
          units: 2,
          amount: 60000,
          account: 'Binance',
        }),
        op({
          kind: 'buy',
          date: '2025-02-02',
          asset: 'US9',
          assetClass: 'shares',
          units: 2,
          amount: 60000,
          account: 'Degiro',
        }),
        op({
          kind: 'reward',
          reward: 'mining',
          date: '2025-02-02',
          asset: 'BTC',
          units: 0.001,
          amount: 30,
        }),
        op({ kind: 'sell', date: '2023-02-02', asset: 'XRP', units: 1, amount: 1 }),
      ],
      { year: 2025, rates: {} }
    );
    const ids = guideSteps(switched, declarationRows(switched)).map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(['onlySwitches', 'earlier', 'm721', 'm720', 'activity'])
    );
    expect(guideSteps(switched, []).find((s) => s.id === 'm721')?.params).toEqual({
      amount: 60030,
    });
    expect(guideSteps(buildLedger([], { year: 2025, rates: {} }), []).map((s) => s.id)).toEqual([
      'before',
      'draft',
      'losses',
      'deadline',
      'rectify',
      'keep',
      'gestor',
    ]);
  });
});
