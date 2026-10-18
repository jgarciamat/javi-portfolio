import fs from 'fs';
import path from 'path';
import { readXlsx } from '@modules/finances/application/spreadsheet';
import {
  expensesByQuarter,
  incomeByQuarter,
  parseWorkbook,
} from '@modules/finances/domain/invoiceBook';

/** The example workbooks of docs/ejemplos-importacion are what we try the importers with: they must keep reading. */
const read = (name: string) => {
  const file = fs.readFileSync(path.join(__dirname, '../../../../docs/ejemplos-importacion', name));
  return readXlsx(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
  );
};

describe('Example invoice books (a freelancer, 2026)', () => {
  it('give the income of three quarters, with the withholdings of the clients', () => {
    const book = parseWorkbook(read('ejemplo-facturas-emitidas-2026.xlsx'), 'issued', 2026);
    expect(book.ok && book.result.skipped).toEqual({ year: 0, rate: 0, amount: 0 });
    expect(book.ok && incomeByQuarter(book.result.entries)).toEqual({
      1: { r21: 5300, r10: 0, r4: 0, r0: 0, withheld: 675 },
      2: { r21: 5000, r10: 1000, r4: 0, r0: 0, withheld: 750 },
      3: { r21: 5200, r10: 0, r4: 600, r0: 0, withheld: 780 },
    });
  });

  it('give the expenses of each quarter, with their kinds', () => {
    const book = parseWorkbook(read('ejemplo-facturas-recibidas-2026.xlsx'), 'received', 2026);
    expect(book.ok && book.result.entries).toHaveLength(21);
    const lines = book.ok ? expensesByQuarter(book.result.entries) : {};
    expect(lines[1]?.map((l) => [l.kind, l.amount, l.vatRate])).toEqual([
      ['rent', 484, 21],
      ['management', 181.5, 21],
      ['software', 72.6, 21],
      ['supplies', 96.8, 21],
      ['quota', 882, 0],
    ]);
    expect(lines[2]?.map((l) => l.kind)).toEqual([
      'rent',
      'management',
      'vehicle',
      'meals',
      'quota',
    ]);
    expect(lines[3]?.map((l) => l.kind)).toEqual([
      'rent',
      'management',
      'advertising',
      'material',
      'quota',
    ]);
    expect(lines[4]).toBeUndefined();
  });

  it('are refused for another year, and the templates are empty books', () => {
    const none = parseWorkbook(read('ejemplo-facturas-emitidas-2026.xlsx'), 'issued', 2025);
    expect(none.ok && none.result.entries).toEqual([]);
    expect(none.ok && none.result.skipped.year).toBe(9);
    const template = path.join(__dirname, '../../../public/plantillas');
    for (const [name, kind] of [
      ['facturas-emitidas.xlsx', 'issued'],
      ['facturas-recibidas.xlsx', 'received'],
    ] as const) {
      const file = fs.readFileSync(path.join(template, name));
      const sheets = readXlsx(
        file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
      );
      const parsed = parseWorkbook(sheets, kind, 2026);
      expect(parsed.ok && parsed.result.entries).toEqual([]);
    }
  });
});
