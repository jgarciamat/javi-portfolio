import fs from 'fs';
import path from 'path';
import { readXlsx } from '@modules/finances/application/spreadsheet';
import {
  expensesByQuarter,
  incomeByQuarter,
  parseWorkbook,
} from '@modules/finances/domain/invoiceBook';
import { toInvoices } from '@modules/finances/domain/invoiceLedger';
import { withholdingsFor } from '@modules/finances/domain/withholdings';

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
    expect(book.ok && book.result.entries).toHaveLength(24);
    const lines = book.ok ? expensesByQuarter(book.result.entries) : {};
    expect(lines[1]?.map((l) => [l.kind, l.amount, l.vatRate])).toEqual([
      ['rent', 484, 21],
      ['management', 181.5, 21],
      ['other', 60.5, 21],
      ['software', 72.6, 21],
      ['supplies', 96.8, 21],
      ['quota', 882, 0],
    ]);
    expect(lines[2]?.map((l) => l.kind)).toEqual([
      'rent',
      'management',
      'other',
      'vehicle',
      'meals',
      'quota',
    ]);
    expect(lines[3]?.map((l) => l.kind)).toEqual([
      'rent',
      'management',
      'other',
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

describe('The withholdings of the example (modelos 111 and 115)', () => {
  it('come from the gestoría (15 %), the designer (7 %), the premises (19 %) and the employees', () => {
    const book = parseWorkbook(read('ejemplo-facturas-recibidas-2026.xlsx'), 'received', 2026);
    const invoices = toInvoices('received', book.ok ? book.result.entries : [], {}, []);
    // docs/ejemplos-importacion/ejemplo-empleados-2026.txt
    const staff = [
      [2, 7500, 750],
      [2, 7500, 750],
      [3, 10500, 1050],
    ];
    const quarter = (q: 1 | 2 | 3) => {
      const [people, paid, withheld] = staff[q - 1];
      return withholdingsFor({
        year: 2026,
        quarter: q,
        invoices,
        income: 5000,
        data: {
          staff: { people, paid, withheld, kindPeople: 0, kindPaid: 0, kindWithheld: 0 },
          pros: { people: 0, paid: 0, withheld: 0 },
          rent: { people: 0, paid: 0, withheld: 0 },
          filed111: false,
          filed115: false,
        },
      });
    };
    // 111: 150 × 15 % = 22.50 + 50 × 7 % = 3.50 → 26 for 2 professionals, plus the payslips.
    // 115: 400 × 19 % = 76 for 1 landlord.
    expect([1, 2, 3].map((q) => quarter(q as 1 | 2 | 3).m111.due)).toEqual([776, 776, 1076]);
    expect(quarter(2).m111.pros).toEqual({ people: 2, withheld: 26, base: 200 });
    expect([1, 2, 3].map((q) => quarter(q as 1 | 2 | 3).m115)).toMatchObject([
      { due: 76, people: 1, base: 400 },
      { due: 76, people: 1, base: 400 },
      { due: 76, people: 1, base: 400 },
    ]);
    expect(quarter(3).warnings).toEqual([]);
  });
});
