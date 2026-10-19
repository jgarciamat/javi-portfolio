import {
  detectColumns,
  parseCSV,
  parseTypeValue,
  rowType,
  rowsFromCSV,
  withType,
} from '@modules/finances/domain/importParsers';
import { bankMapping } from '@modules/finances/domain/bankFormats';
import { OWN_EXPORT_CSV } from '@test-utils/importCsv';

describe('own export: respects the Tipo column', () => {
  const table = parseCSV(OWN_EXPORT_CSV);
  const mapping = detectColumns(table[0]);
  const parsed = rowsFromCSV(table, mapping);

  it('detects every column, Tipo and Notas included', () => {
    expect(mapping).toEqual({
      date: 0,
      description: 1,
      amount: 4,
      debit: -1,
      credit: -1,
      category: 2,
      type: 3,
      notes: 5,
    });
  });

  it('reads each movement with its type, absolute amounts as signed, and ignores the summary', () => {
    expect(parsed.skipped).toEqual([]);
    expect(parsed.review).toEqual([]);
    expect(parsed.rows.map((r) => [r.date, r.type, r.amount])).toEqual([
      ['2026-03-09', 'EXPENSE', -22],
      ['2026-03-08', 'EXPENSE', -57.2],
      ['2026-03-07', 'SAVING', 900],
      ['2026-03-06', 'INCOME', 480],
      ['2026-03-05', 'EXPENSE', -5.5],
    ]);
    expect(parsed.rows[1].notes).toBe('Pagué yo');
    expect(parsed.rows[0].notes).toBeUndefined();
  });

  it('works with semicolons', () => {
    const semi = OWN_EXPORT_CSV.replace(/","/g, '";"').replace(/,,/g, ';;');
    const t = parseCSV(semi);
    expect(rowsFromCSV(t, detectColumns(t[0])).rows).toHaveLength(5);
  });
});

describe('parseTypeValue', () => {
  it.each([
    ['Gasto', 'EXPENSE'],
    ['gastos', 'EXPENSE'],
    ['Expense', 'EXPENSE'],
    ['Cargo', 'EXPENSE'],
    ['Débito', 'EXPENSE'],
    ['Debit', 'EXPENSE'],
    ['Ingreso', 'INCOME'],
    ['INGRESOS', 'INCOME'],
    ['Income', 'INCOME'],
    ['Abono', 'INCOME'],
    ['Crédito', 'INCOME'],
    ['Credit', 'INCOME'],
    ['Ahorro', 'SAVING'],
    ['Ahorros', 'SAVING'],
    ['Saving', 'SAVING'],
    ['Savings', 'SAVING'],
  ])('%s -> %s', (raw, type) => expect(parseTypeValue(raw)).toBe(type));

  it('returns null for unknown values', () => {
    expect(parseTypeValue('Transferencia')).toBeNull();
    expect(parseTypeValue('')).toBeNull();
  });
});

describe('type priority', () => {
  const read = (csv: string) => {
    const t = parseCSV(csv);
    return rowsFromCSV(t, detectColumns(t[0]));
  };

  it('English headers and values', () => {
    const r = read(
      'Date,Payee,Type,Amount\n2026-03-01,Shop,Expense,"10,50"\n2026-03-02,Pay,Income,100'
    );
    expect(r.rows.map((x) => x.amount)).toEqual([-10.5, 100]);
  });

  it.each(['Clase', 'Naturaleza', 'Movimiento'])('header %s is the type column', (h) => {
    const t = parseCSV(`Fecha;Concepto;${h};Importe\n01/03/2026;Pan;Gasto;3`);
    expect(detectColumns(t[0]).type).toBe(2);
    expect(rowsFromCSV(t, detectColumns(t[0])).rows[0].amount).toBe(-3);
  });

  it('Tipo wins over a minus sign or parentheses', () => {
    const r = read(
      'Fecha,Concepto,Tipo,Importe\n2026-03-01,A,Ingreso,-50\n2026-03-01,B,Ingreso,(20)'
    );
    expect(r.rows.map((x) => [x.type, x.amount])).toEqual([
      ['INCOME', 50],
      ['INCOME', 20],
    ]);
  });

  it('without Tipo: minus or parentheses are expenses, plain amounts income', () => {
    const r = read(
      'Fecha,Concepto,Importe\n2026-03-01,A,-5\n2026-03-01,B,"(7,25)"\n2026-03-01,C,9'
    );
    expect(r.rows.map((x) => [x.type, x.amount])).toEqual([
      [undefined, -5],
      [undefined, -7.25],
      [undefined, 9],
    ]);
    expect(r.rows.map(rowType)).toEqual(['EXPENSE', 'EXPENSE', 'INCOME']);
  });

  it('an unrecognised or empty Tipo falls back to the sign; only unrecognised is flagged', () => {
    const r = read(
      'Fecha,Concepto,Tipo,Importe\n2026-03-01,A,Bizum,-5\n2026-03-01,B,,8\n2026-03-01,C,Gasto,2'
    );
    expect(r.rows.map((x) => x.amount)).toEqual([-5, 8, -2]);
    expect(r.review).toEqual([0]);
  });

  it('Cargo/Abono columns still work when there is no Tipo', () => {
    const r = read('Fecha,Concepto,Cargo,Abono\n2026-03-01,A,5,\n2026-03-01,B,,6');
    expect(r.rows.map((x) => x.amount)).toEqual([-5, 6]);
  });
});

describe('summary rows and unreadable rows', () => {
  const mapping = detectColumns(['Fecha', 'Concepto', 'Importe']);
  const run = (rows: string[][]) => rowsFromCSV([['h'], ...rows], mapping);

  it('ignores summary labels silently but still reports garbage', () => {
    const r = run([
      ['Total', '', '10'],
      ['Balance', '', '-1'],
      ['Income', '', '1'],
      ['basura', '', ''],
      ['01/03/2026', 'Pan', '-1'],
    ]);
    expect(r.rows).toHaveLength(1);
    expect(r.skipped).toEqual([5]);
  });

  it('reports an empty row as unreadable', () => {
    expect(run([[]]).skipped).toEqual([2]);
  });

  it('keeps a dated row even if its first cell looks like a label', () => {
    const r = run([['2026-03-01', 'Gastos casa', '5']]);
    expect(r.rows).toHaveLength(1);
  });
});

describe('withType / bankMapping', () => {
  it('signs the amount by type', () => {
    const row = { date: '2026-03-01', description: 'x', amount: 5 };
    expect(withType(row, 'EXPENSE').amount).toBe(-5);
    expect(withType({ ...row, amount: -5 }, 'SAVING')).toMatchObject({ amount: 5, type: 'SAVING' });
  });

  it('known banks never use a Tipo column', () => {
    expect(bankMapping(['Fecha', 'Concepto', 'Importe', 'Tipo'], 'bbva').type).toBe(-1);
    expect(bankMapping(['Fecha', 'Concepto', 'Importe', 'Tipo'], null).type).toBe(3);
  });
});
