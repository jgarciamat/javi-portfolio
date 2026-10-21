import { BankPdfError, parseBankPdf, readBankPdf } from '@modules/finances/application/bankPdf';
import type { PdfPage } from '@modules/finances/application/bankPdf/types';

jest.mock('@modules/tools/application/readPdf', () => ({
  ...jest.requireActual('@modules/tools/application/readPdf'),
  readPdfPages: jest.fn(async () => []),
}));

const readPdfPages = jest.requireMock('@modules/tools/application/readPdf')
  .readPdfPages as jest.Mock;

/** A printed row: [x, text] pieces at a height. */
const row = (y: number, ...cells: [number, string][]) => cells.map(([x, str]) => ({ x, y, str }));

/** A movement of the Ibercaja table (invented data). */
const move = (y: number, date: string, concept: string, amount: string, balance: string) =>
  row(y, [50, date], [130, concept], [410, amount], [490, balance]);
const detail = (y: number, text: string) => row(y, [130, text]);

const head = (range: string): PdfPage => [
  ...row(800, [400, 'Cuenta'], [418, '******9999']),
  ...row(780, [50, 'Fecha de generación del informe en Banca Digital:']),
  ...row(770, [50, '21/10/2026 12:00:00']),
  ...row(760, [50, 'Consulta de movimientos']),
  ...row(740, [50, range]),
  ...row(730, [50, 'Octubre 2026']),
  ...row(720, [50, 'FECHA'], [130, 'CONCEPTO'], [410, 'IMPORTE'], [489, 'SALDO']),
];
const foot: PdfPage = [
  ...row(40, [113, 'IBERCAJA BANCO S.A. (0000) CIF- X0000000, DOMICILIO SOCIAL: CALLE FICTICIA 1']),
  ...row(30, [270, 'Página 1']),
];

describe('Ibercaja PDF statement', () => {
  const page1: PdfPage = [
    ...head('De 01/10/2026 a 21/10/2026'),
    ...move(700, '16 oct.', 'TARJETA VISA', '-4,00 €', '1.016,50 €'),
    ...detail(690, 'TIENDA DE EJEMPLO'),
    ...move(670, '16 oct.', 'TRANSFERENCIA OTRA ENTIDAD', '75,00 €', '1.020,50 €'),
    ...detail(660, 'ENVIADA DESDE BANCO FICTICIO . ORDEN: PERSONA DE PRUEBA'),
    ...move(640, '09 oct.', 'RECIBO COMUNIDAD', '-129,55 €', '945,50 €'),
    ...foot,
  ];
  // The detail of the last movement of page 1 is printed at the top of page 2.
  const page2: PdfPage = [
    ...row(800, [400, 'Cuenta'], [418, '******9999']),
    ...row(720, [50, 'FECHA'], [130, 'CONCEPTO'], [410, 'IMPORTE'], [489, 'SALDO']),
    ...detail(700, 'AVDA. EJEMPLO 1'),
    ...move(680, '01 oct.', 'EFECTO COMERCIAL', '-100,00 €', '1.075,05 €'),
    ...detail(670, 'REF 0001'),
    ...detail(660, 'SEGUNDA LINEA'),
    ...foot,
  ];

  it('reads the movements, joins details across pages and orders them oldest first', () => {
    const r = parseBankPdf([page1, page2]);
    expect(r.bank).toBe('Ibercaja');
    expect(r.rows).toEqual([
      {
        date: '2026-10-01',
        description: 'EFECTO COMERCIAL - REF 0001 - SEGUNDA LINEA',
        amount: -100,
      },
      {
        date: '2026-10-09',
        description: 'RECIBO COMUNIDAD - AVDA. EJEMPLO 1',
        amount: -129.55,
      },
      {
        date: '2026-10-16',
        description:
          'TRANSFERENCIA OTRA ENTIDAD - ENVIADA DESDE BANCO FICTICIO . ORDEN: PERSONA DE PRUEBA',
        amount: 75,
      },
      { date: '2026-10-16', description: 'TARJETA VISA - TIENDA DE EJEMPLO', amount: -4 },
    ]);
    expect(r.skipped).toEqual([]);
  });

  it('checks the balances: newest first, 945,50 = 1.075,05 - 129,55', () => {
    expect(parseBankPdf([page1, page2]).balanceMismatches).toBe(0);
  });

  it('warns about balances that do not follow, without dropping movements', () => {
    const bad: PdfPage = [
      ...head('De 01/10/2026 a 21/10/2026'),
      ...move(700, '16 oct.', 'TARJETA VISA', '-4,00 €', '500,00 €'),
      ...move(680, '15 oct.', 'TARJETA VISA', '-6,00 €', '600,00 €'),
    ];
    const r = parseBankPdf([bad]);
    expect(r.rows).toHaveLength(2);
    expect(r.balanceMismatches).toBe(1);
  });

  it('puts the year of a range that crosses New Year on the early months', () => {
    const r = parseBankPdf([
      [
        ...head('De 15/12/2026 a 10/01/2027'),
        ...move(700, '05 ene.', 'TARJETA VISA', '-1,00 €', '99,00 €'),
        ...move(680, '20 dic.', 'TARJETA VISA', '-1,00 €', '100,00 €'),
      ],
    ]);
    expect(r.rows.map((x) => x.date)).toEqual(['2026-12-20', '2027-01-05']);
  });

  it('uses the balances to order movements of the same day when the statement lists oldest first', () => {
    const r = parseBankPdf([
      [
        ...head('De 01/10/2026 a 21/10/2026'),
        ...move(700, '16 oct.', 'PRIMERO', '-10,00 €', '90,00 €'),
        ...move(680, '16 oct.', 'SEGUNDO', '-5,00 €', '85,00 €'),
      ],
    ]);
    expect(r.rows.map((x) => x.description)).toEqual(['PRIMERO', 'SEGUNDO']);
    expect(r.balanceMismatches).toBe(0);
  });

  it('orders same-day movements newest first by their balances', () => {
    const r = parseBankPdf([
      [
        ...head('De 01/10/2026 a 21/10/2026'),
        ...move(700, '16 oct.', 'SEGUNDO', '-5,00 €', '85,00 €'),
        ...move(680, '16 oct.', 'PRIMERO', '-10,00 €', '90,00 €'),
      ],
    ]);
    expect(r.rows.map((x) => x.description)).toEqual(['PRIMERO', 'SEGUNDO']);
  });

  it('skips lines it cannot read and ignores their details', () => {
    const r = parseBankPdf([
      [
        ...head('De 01/10/2026 a 21/10/2026'),
        ...move(700, '31 sep.', 'FECHA IMPOSIBLE', '-1,00 €', '1,00 €'),
        ...move(690, '16 xyz.', 'MES RARO', '-1,00 €', '1,00 €'),
        ...move(680, '16 oct.', 'SIN IMPORTE', 'n/d', '1,00 €'),
        ...detail(670, 'DETALLE PERDIDO'),
        ...move(660, '15 oct.', 'BUENO', '-1,00 €', '1,00 €'),
        ...row(650, [130, '']),
        ...row(640, [418, 'texto fuera de columna']),
      ],
    ]);
    expect(r.rows).toEqual([{ date: '2026-10-15', description: 'BUENO', amount: -1 }]);
    expect(r.skipped).toHaveLength(3);
  });

  it('reads nothing without the range of dates, and says the format is not recognised', () => {
    const noRange: PdfPage = [
      ...row(760, [50, 'Consulta de movimientos IBERCAJA']),
      ...move(700, '16 oct.', 'TARJETA VISA', '-4,00 €', '1,00 €'),
    ];
    expect(() => parseBankPdf([noRange])).toThrow(BankPdfError);
  });
});

describe('generic PDF table', () => {
  const page = (...lines: [number, string][][]): PdfPage =>
    lines.flatMap((cells, i) => row(700 - i * 20, ...cells));

  it('reads dd/mm/aaaa and dd-mm-aaaa rows with amount and balance, and continuation lines', () => {
    const r = parseBankPdf([
      page(
        [[20, 'Extracto de ejemplo']],
        [
          [20, 'Fecha'],
          [100, 'Concepto'],
          [300, 'Importe'],
          [400, 'Saldo'],
        ],
        [
          [20, '05/03/2026'],
          [100, 'COMPRA DE PRUEBA'],
          [300, '-12,50 EUR'],
          [400, '1.987,50 EUR'],
        ],
        [[100, 'TIENDA FICTICIA']],
        [
          [20, '06-03-2026'],
          [100, 'NOMINA FICTICIA'],
          [300, '2.000,00'],
          [400, '3.987,50'],
        ],
        [[20, 'Página 1']],
        [[100, 'Total 4,00']]
      ),
    ]);
    expect(r.bank).toBeNull();
    expect(r.rows).toEqual([
      { date: '2026-03-05', description: 'COMPRA DE PRUEBA - TIENDA FICTICIA', amount: -12.5 },
      { date: '2026-03-06', description: 'NOMINA FICTICIA', amount: 2000 },
    ]);
    expect(r.balanceMismatches).toBe(0);
  });

  it('accepts a trailing minus, a lone amount and a continuation before any movement', () => {
    const r = parseBankPdf([
      page(
        [[100, 'sin fecha antes']],
        [
          [20, '07/03/26'],
          [100, 'CARGO DE PRUEBA'],
          [300, '3,00-'],
        ],
        [
          [20, '08/03/2026'],
          [100, 'ABONO DE PRUEBA'],
          [300, '+4,00'],
        ]
      ),
    ]);
    expect(r.rows.map((x) => x.amount)).toEqual([-3, 4]);
  });

  it('skips rows without a valid date, amount or concept', () => {
    const r = parseBankPdf([
      page(
        [
          [20, '31/02/2026'],
          [100, 'FECHA MALA'],
          [300, '1,00'],
        ],
        [
          [20, '01/03/2026'],
          [100, 'SIN IMPORTE'],
        ],
        [[100, 'continuación perdida']],
        [
          [20, '02/03/2026'],
          [300, '5,00'],
        ],
        [
          [20, '03/03/2026'],
          [100, 'CERO'],
          [300, '0,00'],
        ],
        [
          [20, '04/03/2026'],
          [100, 'BUENO'],
          [300, '1,00'],
        ]
      ),
    ]);
    expect(r.rows).toHaveLength(1);
    expect(r.skipped).toEqual([1, 2, 4, 5]);
  });
});

describe('PDF errors', () => {
  it('says when the PDF has no text (a scan)', () => {
    expect(() => parseBankPdf([[{ x: 1, y: 1, str: ' ' }], []])).toThrow(
      expect.objectContaining({ code: 'scanned' })
    );
  });

  it('says when no movement is recognised', () => {
    expect(() => parseBankPdf([row(700, [20, 'Un documento cualquiera'])])).toThrow(
      expect.objectContaining({ code: 'unrecognized' })
    );
  });

  it('refuses a PDF with too many pages or too big', async () => {
    expect(() => parseBankPdf(Array.from({ length: 81 }, () => []))).toThrow(
      expect.objectContaining({ code: 'tooBig' })
    );
    await expect(readBankPdf({ size: 11 * 1024 * 1024 } as unknown as File)).rejects.toMatchObject({
      code: 'tooBig',
    });
  });

  it('reads a file through the PDF reader', async () => {
    readPdfPages.mockResolvedValueOnce([
      row(700, [20, '01/03/2026'], [100, 'COMPRA'], [300, '-1,00']),
    ]);
    const r = await readBankPdf({ size: 10 } as unknown as File);
    expect(r.rows).toHaveLength(1);
  });
});
