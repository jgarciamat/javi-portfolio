import fs from 'fs';
import path from 'path';
import { readXlsx } from '@modules/finances/application/spreadsheet';
import { emptyManual, toManualData } from '@modules/finances/ui/components/AutonomoManual';
import { importBook } from '@modules/finances/ui/components/importFiles';

/**
 * The example of a trader with the EU (docs/ejemplos-importacion/ejemplo-ue-*): its two books, with
 * the VAT columns of the AEAT layout, as the importer turns them into the data of the draft. The
 * backend test autonomo-vat-example.test.ts takes these same data and checks the 303, 349, 390 and
 * 130 of the LEEME.
 */
const read = (name: string) => {
  const file = fs.readFileSync(path.join(__dirname, '../../../../docs/ejemplos-importacion', name));
  return readXlsx(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
  );
};

describe('The example books of a trader with the EU', () => {
  const issued = importBook(
    emptyManual(),
    'issued',
    read('ejemplo-ue-facturas-emitidas-2026.xlsx'),
    2026,
    {}
  );
  const both = importBook(
    issued.form!,
    'received',
    read('ejemplo-ue-facturas-recibidas-2026.xlsx'),
    2026,
    {}
  );
  const data = toManualData(both.form!);
  const q = (n: number) => data.quarters[n - 1];

  it('read every invoice of both books', () => {
    expect(issued.lines[0]).toMatchObject({ values: { count: 11 } });
    expect(both.lines[0]).toMatchObject({ values: { count: 14 } });
  });

  it('give the sales by rate, the sales without VAT and the surcharge of each quarter', () => {
    expect(q(1).income).toEqual({ r21: 5000, r10: 0, r4: 0, r0: 0 });
    expect(q(1).vat?.sales).toMatchObject({ intraEU: 3000, exports: 2000 });
    expect(q(1).vat?.re).toEqual({ r21: 1000, r10: 0, r4: 0, tobacco: 0 });
    expect(q(2).income.r21).toBe(5000);
    // The service to a Portuguese business (N2 with its VAT number) is an intra-EU service.
    expect(q(2).vat?.sales).toMatchObject({ intraEU: 1500, exports: 1000 });
    expect(q(3).income).toEqual({ r21: 4500, r10: 1000, r4: 0, r0: 0 });
    expect(q(3).vat?.sales?.intraEU).toBe(2500);
    expect(q(4).income.r21).toBe(6000);
  });

  it('give the operations of the 349 with their keys and VAT numbers', () => {
    expect(q(1).vat?.intra).toEqual([
      { key: 'E', vatId: 'FR00000000001', name: 'Client Fictif SARL', base: 3000 },
      { key: 'A', vatId: 'DE000000001', name: 'Lieferant Beispiel GmbH', base: 1500 },
    ]);
    expect(q(2).vat?.intra?.map((o) => [o.key, o.vatId, o.base])).toEqual([
      ['S', 'PT000000000', 1500],
      ['A', 'DE000000001', 1200],
      ['I', 'IE0000000A', 300],
    ]);
    expect(q(4).vat?.intra).toBeUndefined();
  });

  it('give the expenses by VAT operation: intra-EU, import, investment good, reverse charge', () => {
    const lines = (n: number) =>
      q(n).expenses.map((e) => [e.amount, e.vatRate, e.op ?? '', e.investment ?? false]);
    expect(lines(1)).toEqual([
      [300, 0, '', false],
      [2420, 21, '', false],
      [1500, 21, 'intraGoods', false],
      [1000, 21, 'import', false],
    ]);
    expect(lines(2)).toEqual([
      [300, 0, '', false],
      [2178, 21, '', false],
      [1200, 21, 'intraGoods', false],
      [300, 21, 'intraServices', false],
    ]);
    expect(lines(3)).toEqual([
      [300, 0, '', false],
      [2662, 21, '', false],
      [4840, 21, '', true],
    ]);
    expect(lines(4)).toEqual([
      [300, 0, '', false],
      [3025, 21, '', false],
      [800, 21, 'reverse', false],
    ]);
  });
});
