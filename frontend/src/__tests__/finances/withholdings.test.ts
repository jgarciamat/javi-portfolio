import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import {
  retentionOf,
  roleOf,
  withholdingDeadline,
  withholdingsFor,
  type WithholdingQuarter,
} from '@modules/finances/domain/withholdings';

let n = 0;
const invoice = (over: Partial<ImportedInvoice> = {}): ImportedInvoice => ({
  id: `i${++n}`,
  book: 'received',
  kind: 'management',
  excluded: false,
  date: '2026-05-10',
  quarter: 2,
  base: 100,
  vatRate: 21,
  vat: 21,
  total: 121,
  withheld: 0,
  concept: 'Gestoría Pérez',
  ...over,
});

const nothing = (): WithholdingQuarter => ({
  staff: { people: 0, paid: 0, withheld: 0, kindPeople: 0, kindPaid: 0, kindWithheld: 0 },
  pros: { people: 0, paid: 0, withheld: 0 },
  rent: { people: 0, paid: 0, withheld: 0 },
  filed111: false,
  filed115: false,
});

const run = (invoices: ImportedInvoice[], data = nothing(), income = 1000) =>
  withholdingsFor({ year: 2026, quarter: 2, invoices, data, income });

const boxes = (list: { box: string; amount: number }[]) =>
  Object.fromEntries(list.map((b) => [b.box, b.amount]));

describe('The modelos 111 and 115 of a quarter', () => {
  it('add up professionals, employees and the rent, each payee counted once', () => {
    const data = nothing();
    data.staff = {
      people: 3,
      paid: 6000,
      withheld: 720,
      kindPeople: 0,
      kindPaid: 0,
      kindWithheld: 0,
    };
    const result = run(
      [
        // Gestoría 300 × 15 % = 45 and again 100 × 15 % = 15: one payee.
        invoice({ concept: 'Gestoría Pérez SL', base: 300, retention: 45 }),
        invoice({ concept: 'Gestoria Perez', base: 100, retention: 15 }),
        // Lawyer 500 × 15 % = 75.
        invoice({ concept: 'Abogada Ruiz', base: 500, retention: 75 }),
        // A designer who started this year: 200 × 7 % = 14.
        invoice({ concept: 'Diseño Marta Ejemplo', kind: 'other', base: 200, retention: 14 }),
        // The premises: 1,000 × 19 % = 190.
        invoice({ concept: 'Inmuebles Ribera SL', kind: 'rent', base: 1000, retention: 190 }),
        // Not this quarter, left out, an issued invoice and a supplier without withholding.
        invoice({ quarter: 1, base: 400, retention: 60 }),
        invoice({ excluded: true, base: 400, retention: 60 }),
        invoice({ book: 'issued', base: 400, withheld: 60, retention: 60 }),
        invoice({ concept: 'Papelería Centro', kind: 'material', base: 90 }),
      ],
      data
    );
    // 111: 720 + (45 + 15 + 75 + 14 = 149) = 869.
    expect(boxes(result.m111.boxes)).toEqual({
      '01': 3,
      '02': 6000,
      '03': 720,
      '04': 0,
      '05': 0,
      '06': 0,
      '07': 3,
      '08': 1100,
      '09': 149,
      '28': 869,
      '29': 0,
      '30': 869,
    });
    expect(result.m111).toMatchObject({
      due: 869,
      result: 'pay',
      staff: { people: 3, withheld: 720 },
      pros: { people: 3, withheld: 149, base: 1100 },
    });
    expect(boxes(result.m115.boxes)).toEqual({
      '01': 1,
      '02': 1000,
      '03': 190,
      '04': 0,
      '05': 190,
    });
    expect(result.m115).toMatchObject({ due: 190, result: 'pay', people: 1, base: 1000 });
    expect(result.warnings).toEqual([]);
  });

  it('say there is nothing to file in a quarter without withholdings', () => {
    const result = run([invoice({ concept: 'Papelería', kind: 'material' })]);
    expect(result.m111).toMatchObject({ due: 0, result: 'none' });
    expect(result.m115).toMatchObject({ due: 0, result: 'none', people: 0, base: 0 });
    expect(result.warnings).toEqual([]);
  });

  it('file with nothing to pay when payees were paid but nothing was withheld', () => {
    const data = nothing();
    data.staff.people = 1;
    data.staff.paid = 900;
    expect(run([], data).m111).toMatchObject({ due: 0, result: 'zero' });
  });

  it('take the pay in kind and the payees typed by hand', () => {
    const data: WithholdingQuarter = {
      ...nothing(),
      staff: {
        people: 1,
        paid: 3000,
        withheld: 300,
        kindPeople: 1,
        kindPaid: 500,
        kindWithheld: 50.5,
      },
      pros: { people: 1, paid: 1000, withheld: 150 },
      rent: { people: 1, paid: 600, withheld: 114 },
    };
    const result = run([invoice({ concept: 'Abogada Ruiz', base: 200, retention: 30 })], data);
    // 300 + 50.50 + 150 + 30 = 530.50; the payees typed add to the ones of the invoices.
    expect(boxes(result.m111.boxes)).toMatchObject({
      '04': 1,
      '05': 500,
      '06': 50.5,
      '07': 2,
      '08': 1200,
      '09': 180,
      '30': 530.5,
    });
    expect(result.m111.staff).toEqual({ people: 2, withheld: 350.5 });
    expect(boxes(result.m115.boxes)).toMatchObject({ '01': 1, '02': 600, '03': 114, '05': 114 });
  });

  it('let a filed form stand: the invoices of its quarter do not add to it', () => {
    const data: WithholdingQuarter = {
      ...nothing(),
      pros: { people: 2, paid: 1000, withheld: 150 },
      rent: { people: 1, paid: 400, withheld: 76 },
      filed111: true,
      filed115: true,
    };
    const result = run(
      [
        invoice({ base: 300, retention: 45 }),
        invoice({ concept: 'Local', kind: 'rent', base: 1000, retention: 190 }),
      ],
      data
    );
    expect(result.m111.pros).toEqual({ people: 2, withheld: 150, base: 1000 });
    expect(result.m115).toMatchObject({ due: 76, people: 1, base: 400 });
  });
});

describe('Who each withholding is paid to', () => {
  it('counts one payee per tax id, also when the name is written differently', () => {
    const result = run([
      invoice({ concept: 'Abogada Ruiz', nif: '00000000T', base: 100, retention: 15 }),
      invoice({ concept: 'Despacho Ruiz', nif: '00000000T', base: 100, retention: 15 }),
      // No tax id in this row: the one of the same name is borrowed.
      invoice({ concept: 'Abogada Ruiz', base: 100, retention: 15 }),
      // Without a name or a tax id, an invoice is a payee of its own.
      invoice({ concept: '', base: 100, retention: 15 }),
      invoice({ concept: '', base: 100, retention: 15 }),
    ]);
    expect(result.m111.pros.people).toBe(3);
  });

  it('follows the choice of the person over the kind of the expense', () => {
    const toRent = invoice({ kind: 'other', base: 500, retention: 95, withholding: 'rent' });
    const left = invoice({ base: 500, retention: 75, withholding: 'none' });
    const typed = invoice({ base: 500, retention: 75, retentionFix: 35 });
    expect([roleOf(toRent), roleOf(left), roleOf(typed)]).toEqual(['rent', 'none', 'professional']);
    expect(retentionOf(typed)).toBe(35);
    expect(retentionOf(invoice({ retention: undefined }))).toBe(0);
    const result = run([toRent, left, typed]);
    expect(result.m115).toMatchObject({ due: 95, people: 1 });
    expect(result.m111.pros).toEqual({ people: 1, withheld: 35, base: 500 });
  });

  it('takes a credit note back', () => {
    const result = run([
      invoice({ base: 1000, retention: 150 }),
      invoice({ base: -200, retention: -30 }),
    ]);
    expect(result.m111.pros).toEqual({ people: 1, withheld: 120, base: 800 });
    expect(result.warnings).toEqual([]);
  });
});

describe('The warnings of the withholdings', () => {
  it('flag a withholding that is not 15 or 7 % (19 % for the rent), a cent of rounding aside', () => {
    const odd = invoice({ concept: 'Abogada Ruiz', base: 1000, retention: 100 });
    const rounded = invoice({ base: 333.33, retention: 49.99 });
    const off = invoice({ base: 333.33, retention: 49.97 });
    const rent = invoice({ concept: 'Local', kind: 'rent', base: 1000, retention: 150 });
    const result = run([odd, rounded, off, rent]);
    expect(result.warnings).toEqual([
      { code: 'rate', invoice: odd.id, who: 'Abogada Ruiz', rate: 10, expected: [15, 7] },
      { code: 'rate', invoice: off.id, who: 'Gestoría Pérez', rate: 15, expected: [15, 7] },
      { code: 'rate', invoice: rent.id, who: 'Local', rate: 15, expected: [19] },
    ]);
  });

  it('flag a rent without withholding only above 900 € a year to the landlord', () => {
    const small = [1, 2, 3, 4].map((q) =>
      invoice({ concept: 'Trastero Sol', kind: 'rent', quarter: q as 1 | 2 | 3 | 4, base: 225 })
    );
    const big = [1, 2, 3].map((q) =>
      invoice({ concept: 'Local Mayor', kind: 'rent', quarter: q as 1 | 2 | 3, base: 400 })
    );
    // 4 × 225 = 900: not above it. 3 × 400 = 1,200: above.
    const result = run([...small, ...big]);
    expect(result.warnings).toEqual([
      { code: 'rentNoRetention', invoice: big[1].id, who: 'Local Mayor', year: 2026 },
    ]);
    // Told it carries no withholding (the landlord is exempt), it is not flagged.
    const told = big.map((i) => ({ ...i, withholding: 'none' as const }));
    expect(run(told).warnings).toEqual([]);
    // Sent to the 115 without an amount, it is.
    const sent = big.map((i) => ({ ...i, withholding: 'rent' as const }));
    expect(run(sent).warnings.map((w) => w.code)).toEqual(['rentNoRetention']);
  });

  it('flag a professional without withholding', () => {
    const pro = invoice({ concept: 'Diseño', kind: 'other', withholding: 'professional' });
    expect(run([pro]).warnings).toEqual([
      { code: 'proNoRetention', invoice: pro.id, who: 'Diseño' },
    ]);
  });

  it('flag amounts without payees, more withheld than paid and withholdings without income', () => {
    const data: WithholdingQuarter = {
      ...nothing(),
      staff: { people: 0, paid: 1000, withheld: 100, kindPeople: 0, kindPaid: 0, kindWithheld: 0 },
      pros: { people: 1, paid: 100, withheld: 150 },
      rent: { people: 0, paid: 0, withheld: 0 },
    };
    expect(run([], data, 0).warnings).toEqual([
      { code: 'people', part: 'staff' },
      { code: 'over', part: 'pros' },
      { code: 'noIncome' },
    ]);
    expect(run([], nothing(), 0).warnings).toEqual([]);
  });

  it('do not check the rate of an invoice without base', () => {
    expect(run([invoice({ base: 0, retention: 10 })]).warnings).toEqual([]);
  });
});

describe('The deadline of the 111 and the 115', () => {
  it.each([
    [2026, 1, '2026-04-20'],
    [2026, 2, '2026-07-20'],
    [2026, 3, '2026-10-20'],
    // The fourth quarter is filed by 20 January, not by the 30th like the 303 and the 130.
    [2026, 4, '2027-01-20'],
    // 20 July 2025 is a Sunday.
    [2025, 2, '2025-07-21'],
    // 20 January 2024 is a Saturday.
    [2023, 4, '2024-01-22'],
  ] as const)('of %i, quarter %i, is %s', (year, quarter, date) =>
    expect(withholdingDeadline(year, quarter)).toBe(date)
  );
});
