import {
  checkImport,
  irpfDeductible,
  missingQuarters,
  type CheckInput,
} from '@modules/finances/domain/importChecks';
import type { BookEntry, BookKind } from '@modules/finances/domain/invoiceBook';
import { toInvoices, type ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import type { ManualData, ManualExpense, ManualQuarter } from '@modules/finances/domain/types';

const entry = (date: string, concept: string, base: number, over: Partial<BookEntry> = {}) => {
  const vatRate = over.vatRate ?? 21;
  const vat = Math.round(base * vatRate) / 100;
  return {
    date,
    quarter: (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1) as 1 | 2 | 3 | 4,
    base,
    vatRate,
    vat,
    total: Math.round((base + vat) * 100) / 100,
    withheld: 0,
    concept,
    ...over,
  };
};
const book = (kind: BookKind, ...entries: BookEntry[]) => toInvoices(kind, entries, {}, []);

const PROFILE: ManualData['profile'] = {
  workArea: 0,
  homeArea: 0,
  vehicleExclusive: false,
  healthPeople: 0,
  healthDisability: false,
};
const quarter = (r21 = 0, expenses: ManualExpense[] = []): ManualQuarter => ({
  income: { r21, r10: 0, r4: 0, r0: 0 },
  expenses,
});
const manual = (...quarters: ManualQuarter[]): ManualData => ({
  profile: PROFILE,
  quarters: [0, 1, 2, 3].map((i) => quarters[i] ?? quarter()) as ManualData['quarters'],
});

const input = (over: Partial<CheckInput> = {}): CheckInput => ({
  invoices: [],
  manual: manual(),
  year: 2026,
  today: '2026-03-15',
  from: 1,
  upTo: 1,
  model130: null,
  hardToJustify: false,
  ...over,
});
const codes = (over: Partial<CheckInput>) => checkImport(input(over)).map((c) => c.code);

describe('What the income tax counts of each expense (as the server)', () => {
  const e = (kind: ManualExpense['kind'], amount: number, more: Partial<ManualExpense> = {}) =>
    irpfDeductible({ kind, amount, vatRate: 21, ...more }, PROFILE);

  it('counts the base, or less for the kinds with a limit', () => {
    expect(e('rent', 121)).toBe(100);
    expect(e('clients', 121)).toBe(121);
    expect(e('fines', 121)).toBe(0);
    expect(e('supplies', 121)).toBe(0);
    expect(e('vehicle', 121)).toBe(0);
    expect(e('vehicle', -121)).toBe(-100);
    expect(e('meals', 60.5, { vatRate: 10, days: 1 })).toBe(24.25);
    expect(e('meals', 60.5, { vatRate: 10 })).toBe(0);
    expect(e('meals', 0, { vatRate: 10, days: 1 })).toBe(0);
    expect(e('health', 1000)).toBe(0);
    expect(e('health', 0)).toBe(0);
  });

  it('follows the profile: home office, exclusive car and the people insured', () => {
    const profile = {
      workArea: 20,
      homeArea: 100,
      vehicleExclusive: true,
      healthPeople: 2,
      healthDisability: true,
    };
    const e2 = (kind: ManualExpense['kind'], amount: number) =>
      irpfDeductible({ kind, amount, vatRate: 21 }, profile);
    expect(e2('supplies', 121)).toBe(6);
    expect(e2('vehicle', 121)).toBe(100);
    expect(e2('health', 4000)).toBe(3000);
    expect(
      irpfDeductible(
        { kind: 'health', amount: 4000, vatRate: 0 },
        { ...profile, healthDisability: false }
      )
    ).toBe(1000);
  });
});

describe('Checks of the imported invoices before the draft', () => {
  it('says nothing when there is nothing to say', () => {
    expect(checkImport(input())).toEqual([]);
    expect(codes({ invoices: book('received', entry('2026-02-01', 'Alquiler', 100)) })).toEqual([]);
  });

  it('finds the same invoice twice (not when one is left out)', () => {
    const list = book(
      'received',
      entry('2026-02-01', 'Gestoría Pérez SL', 100),
      entry('2026-02-01', 'GESTORIA PEREZ', 100),
      entry('2026-02-01', 'Gestoría Pérez', 101)
    );
    const [dup] = checkImport(input({ invoices: list }));
    expect(dup).toMatchObject({
      code: 'duplicate',
      level: 'warn',
      values: { n: 2, who: 'Gestoría Pérez SL', date: '2026-02-01' },
      amounts: { base: 100 },
      invoices: [list[0].id, list[1].id],
    });
    const left = [{ ...list[1], excluded: true }, list[0], list[2]];
    expect(codes({ invoices: left })).toEqual([]);
  });

  it('finds invoices dated in another quarter than their «Periodo» column says', () => {
    const list = book(
      'issued',
      entry('2026-07-10', 'Estudio Norte', 3000, { period: 2 }),
      entry('2026-08-10', 'Estudio Norte', 3000, { period: 3 }),
      entry('2026-08-11', 'Estudio Norte', 3000, { period: null })
    );
    const checks = checkImport(input({ invoices: list, today: '2026-01-10', upTo: 3 }));
    expect(checks.find((c) => c.code === 'period')).toMatchObject({
      values: { n: 1 },
      invoices: [list[0].id],
    });
  });

  it('points to the quarters that have begun without income or expenses', () => {
    const list = [
      ...book('issued', entry('2026-02-01', 'Cliente', 100)),
      ...book('received', entry('2026-02-01', 'Alquiler', 100)),
    ];
    const typed = manual(
      quarter(),
      quarter(500),
      quarter(0, [{ kind: 'rent', amount: 0, vatRate: 21 }])
    );
    const checks = checkImport(
      input({ invoices: list, manual: typed, today: '2026-10-19', upTo: 4 })
    );
    expect(checks.map((c) => [c.code, c.quarter])).toEqual([
      ['emptyIncome', 3],
      ['emptyIncome', 4],
      ['emptyExpenses', 2],
      ['emptyExpenses', 3],
      ['emptyExpenses', 4],
    ]);
    expect(checks.every((c) => c.level === 'info')).toBe(true);
    // Only up to the quarter of the draft, from the first one on screen.
    expect(codes({ invoices: list, today: '2026-10-19', upTo: 2, from: 2, manual: typed })).toEqual(
      ['emptyExpenses']
    );
    // A past year has begun in full; a future one not at all.
    expect(codes({ invoices: list, today: '2027-01-05', upTo: 2 })).toHaveLength(2);
    expect(codes({ invoices: list, today: '2025-12-31', upTo: 4 })).toEqual([]);
  });

  it('warns when «Other expenses» are more than 30 % of them', () => {
    const list = book(
      'received',
      entry('2026-02-01', 'Algo raro', 40),
      entry('2026-02-02', 'Alquiler', 60)
    );
    const [other] = checkImport(input({ invoices: list }));
    expect(other).toMatchObject({
      code: 'otherShare',
      values: { share: 40 },
      amounts: { other: 48.4, total: 121 },
      invoices: [list[0].id],
    });
    expect(codes({ invoices: [{ ...list[0], kind: 'material' }, list[1]] })).toEqual([]);
    // Credit notes that leave nothing to compare with.
    const refunds = book('received', entry('2026-02-01', 'Algo raro', -40));
    expect(codes({ invoices: refunds })).toEqual(['negative']);
  });

  describe('a filed modelo 130 against the invoices', () => {
    // The example books of docs/ejemplos-importacion: Q1 and Q2 give 11,300 € of income and
    // 2,948.25 € of deductible expenses (worked out by hand in the backend test).
    const typed = manual(
      quarter(5300, [
        { kind: 'rent', amount: 484, vatRate: 21 },
        { kind: 'management', amount: 181.5, vatRate: 21 },
        { kind: 'software', amount: 72.6, vatRate: 21 },
        { kind: 'supplies', amount: 96.8, vatRate: 21 },
        { kind: 'quota', amount: 882, vatRate: 0 },
      ]),
      {
        income: { r21: 5000, r10: 1000, r4: 0, r0: 0 },
        expenses: [
          { kind: 'rent', amount: 484, vatRate: 21 },
          { kind: 'management', amount: 181.5, vatRate: 21 },
          { kind: 'vehicle', amount: 145.2, vatRate: 21 },
          { kind: 'meals', amount: 60.5, vatRate: 10, days: 1 },
          { kind: 'quota', amount: 882, vatRate: 0 },
        ],
      }
    );
    const invoices: ImportedInvoice[] = [
      ...book('issued', entry('2026-02-01', 'Cliente', 5300)),
      ...book('received', entry('2026-02-01', 'Alquiler', 400)),
    ];
    const base = { invoices, manual: typed, today: '2026-06-30', from: 3, upTo: 3 };

    it('agrees with the example books', () => {
      expect(
        codes({ ...base, model130: { year: 2026, quarter: 2, income: 11300, expenses: 2948.25 } })
      ).toEqual([]);
      // Within the euro of roundings.
      expect(
        codes({ ...base, model130: { year: 2026, quarter: 2, income: 11300.9, expenses: 2949 } })
      ).toEqual([]);
    });

    it('warns when the income or the expenses do not match', () => {
      const checks = checkImport(
        input({ ...base, model130: { year: 2026, quarter: 2, income: 12000, expenses: 2000 } })
      );
      expect(checks.map((c) => [c.code, c.amounts])).toEqual([
        ['model130Income', { filed: 12000, books: 11300, diff: -700 }],
        ['model130Expenses', { filed: 2000, books: 2948.25, diff: 948.25 }],
      ]);
      expect(checks[0].values).toEqual({ quarter: 2 });
    });

    it('counts the hard-to-justify expenses when they are on', () => {
      // 5 % of (11,300 − 2,948.25) = 417.59.
      expect(
        codes({
          ...base,
          hardToJustify: true,
          model130: { year: 2026, quarter: 2, income: 11300, expenses: 3365.84 },
        })
      ).toEqual([]);
      expect(
        checkImport(
          input({
            ...base,
            hardToJustify: true,
            manual: manual(quarter(100000)),
            invoices: book('received', entry('2026-02-01', 'Alquiler', 1)),
            model130: { year: 2026, quarter: 1, income: 100000, expenses: 0 },
          })
        )[0].amounts.books
      ).toBe(2000);
    });

    it('only compares a book that was imported for those quarters, and the same year', () => {
      const late = book('issued', entry('2026-08-01', 'Cliente', 1));
      const filed = { year: 2026, quarter: 2 as const, income: 1, expenses: 1 };
      expect(codes({ ...base, invoices: late, model130: filed })).toEqual([]);
      expect(codes({ ...base, model130: { ...filed, year: 2025 } })).toEqual([]);
      expect(
        codes({ ...base, invoices: book('issued', entry('2026-02-01', 'C', 1)), model130: filed })
      ).toEqual(['model130Income']);
    });
  });

  it('lists the 0 % expenses that should carry VAT, the credit notes and the other years', () => {
    const list = [
      ...book(
        'received',
        entry('2026-02-01', 'Cuota autónomos RETA', 294, { vatRate: 0 }),
        entry('2026-02-02', 'Papelería', 30, { vatRate: 0 }),
        entry('2026-02-03', 'Abono Papelería', -10)
      ),
      ...book('issued', entry('2025-12-20', 'Cliente', 100, { vatRate: 0 })),
    ];
    const checks = checkImport(input({ invoices: list }));
    expect(checks.map((c) => [c.code, c.level, c.invoices])).toEqual([
      ['years', 'warn', [list[3].id]],
      // An issued invoice without VAT and without saying why (exempt, export…).
      ['exemptNoCause', 'info', [list[3].id]],
      ['emptyIncome', 'info', []],
      ['vat0', 'info', [list[1].id]],
      ['negative', 'info', [list[2].id]],
    ]);
    expect(checks[0].values).toEqual({ years: '2025, 2026', year: 2026 });
    expect(checks[4].amounts).toEqual({ total: -12.1 });
  });
});

describe('missingQuarters', () => {
  const empty = (code: 'emptyIncome' | 'emptyExpenses', quarter: number) => ({
    code,
    level: 'info' as const,
    values: { q: quarter },
    amounts: {},
    invoices: [],
    quarter,
  });

  it('joins the empty income and expenses of each quarter, in order', () => {
    expect(
      missingQuarters([
        empty('emptyExpenses', 3),
        { ...empty('emptyIncome', 1), code: 'duplicate' as const, level: 'warn' as const },
        empty('emptyIncome', 3),
        empty('emptyIncome', 2),
      ])
    ).toEqual([
      { quarter: 2, income: true, expenses: false },
      { quarter: 3, income: true, expenses: true },
    ]);
    expect(missingQuarters([])).toEqual([]);
  });
});
