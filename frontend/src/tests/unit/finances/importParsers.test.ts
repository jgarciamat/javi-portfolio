import {
  detectColumns,
  detectDelimiter,
  looksLikeNorma43,
  parseAmount,
  parseCSV,
  parseDate,
  parseNorma43,
  rowsFromCSV,
} from '@modules/finances/domain/importParsers';

describe('parseCSV', () => {
  it('detects ; and , delimiters and handles quotes', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a,b,"c;d"\n1,2,3')).toBe(',');
    expect(
      parseCSV('\uFEFFFecha;Concepto;Importe\r\n01/03/2026;"Bar ""Pepe""; Madrid";-3,20\n\n')
    ).toEqual([
      ['Fecha', 'Concepto', 'Importe'],
      ['01/03/2026', 'Bar "Pepe"; Madrid', '-3,20'],
    ]);
  });
});

describe('parseAmount', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['-1,234.56', -1234.56],
    ['12,30 €', 12.3],
    ['(45.00)', -45],
    ['45,00-', -45],
    ['1.000', 1000],
    ['+7', 7],
    ['', null],
    ['abc', null],
  ])('%s → %s', (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected);
  });
});

describe('parseDate', () => {
  it.each([
    ['2026-03-04', '2026-03-04'],
    ['04/03/2026', '2026-03-04'],
    ['4-3-26', '2026-03-04'],
    ['04.03.2026 10:15', '2026-03-04'],
    ['31/02/2026', null],
    ['ayer', null],
  ])('%s → %s', (raw, expected) => {
    expect(parseDate(raw)).toBe(expected);
  });
});

describe('detectColumns + rowsFromCSV', () => {
  it('maps a typical Spanish bank export with a single amount column', () => {
    const table = parseCSV(
      'F. Operación;F. Valor;Concepto;Importe;Saldo\n02/03/2026;02/03/2026;MERCADONA;-54,30;1.000,00\n03/03/2026;03/03/2026;NOMINA;1.800,00;2.800,00\nbad;;;;'
    );
    const mapping = detectColumns(table[0]);
    expect(mapping).toMatchObject({ date: 0, description: 2, amount: 3 });
    expect(rowsFromCSV(table, mapping)).toEqual({
      rows: [
        { date: '2026-03-02', description: 'MERCADONA', amount: -54.3, category: null },
        { date: '2026-03-03', description: 'NOMINA', amount: 1800, category: null },
      ],
      skipped: [4],
    });
  });

  it('supports separate debit / credit columns', () => {
    const table = parseCSV(
      'Date,Description,Debit,Credit\n2026-03-01,Coffee,2.50,\n2026-03-02,Refund,,10.00'
    );
    const mapping = detectColumns(table[0]);
    expect(mapping).toMatchObject({ amount: -1, debit: 2, credit: 3 });
    expect(rowsFromCSV(table, mapping).rows.map((r) => r.amount)).toEqual([-2.5, 10]);
  });
});

describe('Norma 43', () => {
  const line = (s: string) => s.padEnd(80, ' ');
  const file = [
    line('11' + '0049' + '1234' + '1234567890' + '260301' + '260331'),
    line(
      '22' +
        '    ' +
        '1234' +
        '260302' +
        '260302' +
        '12' +
        '345' +
        '1' +
        '00000000005430' +
        '0000000001' +
        'REF1        ' +
        'REF2'
    ),
    line('23' + '01' + 'COMPRA TARJETA MERCADONA'.padEnd(38) + 'VALENCIA'),
    line(
      '22' +
        '    ' +
        '1234' +
        '260303' +
        '260303' +
        '02' +
        '000' +
        '2' +
        '00000000180000' +
        '0000000002' +
        '            ' +
        'NOMINA MARZO'
    ),
    line('33' + '0049'),
    line('88' + '9999'),
  ].join('\n');

  it('detects the format', () => {
    expect(looksLikeNorma43(file)).toBe(true);
    expect(looksLikeNorma43('Fecha;Concepto\n')).toBe(false);
  });

  it('reads dates, signs, amounts and concepts', () => {
    expect(parseNorma43(file)).toEqual({
      rows: [
        { date: '2026-03-02', description: 'COMPRA TARJETA MERCADONA VALENCIA', amount: -54.3 },
        { date: '2026-03-03', description: 'NOMINA MARZO', amount: 1800 },
      ],
      skipped: [],
    });
  });
});
