import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { summary180, summary190, summary347 } from '@modules/finances/domain/annualSummaries';
import { FIGURE_YEARS, figuresFor } from '@modules/finances/domain/fiscalFigures';
import { form131, lowIncomeCut } from '@modules/finances/domain/module131';
import { wealthWarnings } from '@modules/finances/domain/wealthWarnings';
import { withholdingsFor, type WithholdingQuarter } from '@modules/finances/domain/withholdings';

/** Every figure below is made up and worked out by hand with the formula next to it. */
let n = 0;
const invoice = (over: Partial<ImportedInvoice>): ImportedInvoice => {
  const base = over.base ?? 1000;
  const vat = over.vat ?? Math.round(base * 21) / 100;
  return {
    id: `i${++n}`,
    book: 'received',
    kind: 'other',
    excluded: false,
    date: '2026-02-10',
    quarter: 1,
    base,
    vatRate: 21,
    vat,
    total: base + vat,
    withheld: 0,
    concept: 'Proveedor inventado',
    ...over,
  };
};

const quarter = (over: Partial<WithholdingQuarter> = {}): WithholdingQuarter => ({
  staff: { people: 0, paid: 0, withheld: 0, kindPeople: 0, kindPaid: 0, kindWithheld: 0 },
  pros: { people: 0, paid: 0, withheld: 0 },
  rent: { people: 0, paid: 0, withheld: 0 },
  filed111: false,
  filed115: false,
  ...over,
});
const year = (...over: Partial<WithholdingQuarter>[]) => [0, 1, 2, 3].map((i) => quarter(over[i]));

describe('The figures of each year', () => {
  it('keeps the thresholds of the law and says which ones it could not confirm', () => {
    expect(FIGURE_YEARS).toEqual([2024, 2025, 2026, 2027]);
    // 2024: the same articles as 2025 (none changed after 2023) and the 80 € of 2023-2025.
    expect({ ...figuresFor(2024), year: 2025 }).toEqual(figuresFor(2025));
    expect(figuresFor(2026)).toMatchObject({
      m347: { threshold: 3005.06, cash: 6000 },
      abroad: { threshold: 50000, rise: 20000 },
      wealth: { mustFileAbove: 2000000, exemptMinimum: 700000, homeExempt: 300000 },
      retaFlatRate: null,
      provisional: false,
    });
    expect(figuresFor(2025)?.retaFlatRate).toBe(80);
    expect(figuresFor(2027)?.provisional).toBe(true);
    expect(figuresFor(2019)).toBeNull();
  });

  it('checks the withholdings of a year without figures with those of the latest one', () => {
    const pro = invoice({ date: '2019-02-01', base: 1000, retention: 100 });
    const result = withholdingsFor({
      year: 2019,
      quarter: 1,
      invoices: [pro],
      data: quarter(),
      income: 1,
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'rate', rate: 10, expected: [15, 7] }),
    ]);
  });
});

describe('The modelo 190', () => {
  it('lists each professional with key G, then the employees typed by hand (key A)', () => {
    const invoices = [
      // A designer at 15 %, twice in the year: one record, 1,200 + 800 = 2,000 € and 300 € withheld.
      invoice({ concept: 'Ana Diseño', nif: '00000001R', base: 1200, retention: 180 }),
      invoice({ concept: 'Ana Diseño', quarter: 3, date: '2026-08-01', base: 800, retention: 120 }),
      // Starting her activity, at 7 %: subkey 03.
      invoice({ concept: 'Luis Código', nif: '00000002W', base: 500, retention: 35 }),
      // Mixed rates: no subkey. No tax id either.
      invoice({ concept: 'Eva Textos', base: 100, retention: 15 }),
      invoice({ concept: 'Eva Textos', base: 100, retention: 7 }),
      // Not a professional's, or without withholding, or left out: not in the 190.
      invoice({ concept: 'Local', kind: 'rent', base: 400, retention: 76 }),
      invoice({ concept: 'Papelería', base: 50 }),
      invoice({ concept: 'Ana Diseño', base: 999, retention: 150, excluded: true }),
      invoice({ concept: 'Factura emitida', book: 'issued', base: 999, withheld: 150 }),
    ];
    const typed = year(
      {
        staff: {
          people: 1,
          paid: 3000,
          withheld: 300,
          kindPeople: 1,
          kindPaid: 100,
          kindWithheld: 10,
        },
      },
      {
        staff: {
          people: 1,
          paid: 3000,
          withheld: 300,
          kindPeople: 0,
          kindPaid: 0,
          kindWithheld: 0,
        },
      }
    );
    const s = summary190(2026, invoices, typed);
    expect(s.records.map((r) => [r.name, r.key, r.subkey, r.paid, r.inKind, r.withheld])).toEqual([
      ['Ana Diseño', 'G', '01', 2000, 0, 300],
      ['Luis Código', 'G', '03', 500, 0, 35],
      ['Eva Textos', 'G', null, 200, 0, 22],
      ['', 'A', null, 6000, 100, 610],
    ]);
    // 01 = 4 records; 02 = 2,000 + 500 + 200 + 6,000 + 100; 03 = 300 + 35 + 22 + 610.
    expect(s.boxes.map((b) => [b.box, b.amount])).toEqual([
      ['01', 4],
      ['02', 8800],
      ['03', 967],
    ]);
    expect(s.warnings).toEqual([
      { code: 'nif', who: 'Eva Textos' },
      { code: 'subkey', who: 'Eva Textos' },
      { code: 'typed', part: 'staff' },
    ]);
  });

  it('takes the professionals of a filed 111 from what was typed, not from its invoices', () => {
    const invoices = [invoice({ concept: 'Ana', nif: '00000001R', base: 1000, retention: 150 })];
    const s = summary190(
      2026,
      invoices,
      year({ filed111: true, pros: { people: 1, paid: 1000, withheld: 150 } })
    );
    expect(s.records).toEqual([
      expect.objectContaining({ key: 'G', subkey: null, typed: true, paid: 1000, withheld: 150 }),
    ]);
    expect(s.warnings).toEqual([{ code: 'typed', part: 'pros' }]);
    // A year without figures gives no subkey; nothing at all, an empty form.
    expect(summary190(2019, invoices, year()).records[0].subkey).toBeNull();
    expect(summary190(2026, [], year()).boxes.map((b) => b.amount)).toEqual([0, 0, 0]);
  });
});

describe('The modelo 180', () => {
  it('gives one record per landlord with the last rate, and asks for the land registry reference', () => {
    const invoices = [
      invoice({
        concept: 'Inmuebles Ribera SL',
        nif: 'B00000000',
        kind: 'rent',
        base: 400,
        retention: 76,
      }),
      invoice({
        concept: 'Inmuebles Ribera SL',
        kind: 'rent',
        quarter: 2,
        date: '2026-05-01',
        base: 400,
        retention: 76,
      }),
      // Sent to the 115 by hand although it is not a rent; a rent without withholding is not in it.
      invoice({ concept: 'Trastero', withholding: 'rent', base: 100, retention: 19 }),
      invoice({ concept: 'Garaje', kind: 'rent', base: 50 }),
    ];
    const s = summary180(
      2026,
      invoices,
      year({}, {}, { rent: { people: 1, paid: 600, withheld: 114 } })
    );
    expect(s.records.map((r) => [r.name, r.nif, r.paid, r.rate, r.withheld, r.typed])).toEqual([
      ['Inmuebles Ribera SL', 'B00000000', 800, 19, 152, false],
      ['Trastero', null, 100, 19, 19, false],
      ['', null, 600, 19, 114, true],
    ]);
    // 3 landlords; 800 + 100 + 600 of base; 152 + 19 + 114 withheld.
    expect(s.boxes.map((b) => b.amount)).toEqual([3, 1500, 285]);
    expect(s.warnings).toEqual([
      { code: 'nif', who: 'Trastero' },
      { code: 'typed', part: 'rent' },
      { code: 'cadastre' },
    ]);
    expect(summary180(2026, [], year()).warnings).toEqual([]);
    expect(
      summary180(2019, [], year({ rent: { people: 1, paid: 1, withheld: 1 } })).records[0].rate
    ).toBeNull();
    // A filed 115 stands for its quarter; an invoice of nothing has no rate of its own.
    const zero = [invoice({ kind: 'rent', base: 0, vat: 0, retention: 5 })];
    expect(summary180(2026, zero, year()).records[0].rate).toBe(0);
    expect(summary180(2026, zero, year({ filed115: true })).records).toEqual([]);
  });
});

describe('The modelo 347', () => {
  it('lists each client and supplier above 3,005.06 € a year, VAT included, by quarter', () => {
    const invoices = [
      // A client: 2,000 + 420 in Q1 and 1,000 + 210 in Q3 = 3,630 € (key B).
      invoice({ book: 'issued', concept: 'Cliente Uno SL', nif: 'B11111111', base: 2000 }),
      invoice({
        book: 'issued',
        concept: 'Cliente Uno SL',
        nif: 'B11111111',
        base: 1000,
        quarter: 3,
        date: '2026-07-01',
      }),
      // A credit note takes it below: 2,500 × 1.21 = 3,025 - 100 × 1.21 = 2,904 € (not listed).
      invoice({ book: 'issued', concept: 'Cliente Dos', base: 2500 }),
      invoice({ book: 'issued', concept: 'Cliente Dos', base: -100, vat: -21 }),
      // Exactly 3,005.06 is not above the threshold.
      invoice({ book: 'issued', concept: 'Cliente Justo', base: 3005.06, vat: 0 }),
      // The rent of the premises (key A, apart) with a withholding; a domestic reverse charge.
      invoice({
        concept: 'Inmuebles Ribera SL',
        nif: 'B00000000',
        kind: 'rent',
        base: 3000,
        retention: 570,
      }),
      invoice({ concept: 'Chatarra SA', op: 'reverse', base: 4000, vat: 0 }),
      // A client abroad not subject to Spanish VAT, flagged.
      invoice({
        book: 'issued',
        concept: 'Client Inc',
        op: 'notSubject',
        base: 5000,
        vat: 0,
        withheld: 0,
      }),
      // Out: intra-EU (349), imports, exports, left out, and another year.
      invoice({ concept: 'EU GmbH', op: 'intraServices', base: 9000, vat: 0 }),
      invoice({ concept: 'Import', op: 'import', base: 9000, vat: 0 }),
      invoice({ book: 'issued', concept: 'Export', op: 'export', base: 9000, vat: 0 }),
      invoice({ concept: 'Personal', base: 9000, excluded: true }),
      invoice({ concept: 'Viejo', base: 9000, date: '2025-12-31' }),
    ];
    const s = summary347(2026, invoices);
    expect(
      s.records.map((r) => [r.key, r.name, r.total, r.quarters, r.premises, r.withheld, r.reverse])
    ).toEqual([
      ['B', 'Cliente Uno SL', 3630, [2420, 0, 1210, 0], false, false, false],
      ['A', 'Inmuebles Ribera SL', 3630, [3630, 0, 0, 0], true, true, false],
      ['A', 'Chatarra SA', 4000, [4000, 0, 0, 0], false, false, true],
      ['B', 'Client Inc', 5000, [5000, 0, 0, 0], false, false, false],
    ]);
    expect(s.boxes.map((b) => b.amount)).toEqual([4, 16260]);
    expect(s.warnings).toEqual([
      { code: 'nif', who: 'Chatarra SA' },
      { code: 'nif', who: 'Client Inc' },
      { code: 'withheld', who: 'Inmuebles Ribera SL' },
      { code: 'notSubject', who: 'Client Inc' },
    ]);
    expect(s).toMatchObject({ known: true, threshold: 3005.06, left: 3 });
  });

  it('flags the sales with a withholding, and keeps the threshold for a year without figures', () => {
    const sale = invoice({ book: 'issued', concept: 'Cliente', base: 4000, withheld: 600 });
    expect(summary347(2026, [sale]).warnings).toEqual([
      { code: 'nif', who: 'Cliente' },
      { code: 'withheld', who: 'Cliente' },
    ]);
    const old = summary347(2019, [{ ...sale, date: '2019-03-01' }]);
    expect(old).toMatchObject({ known: false, threshold: 3005.06 });
    expect(old.records).toHaveLength(1);
  });
});

describe('The modelo 347 under the cash regime of VAT', () => {
  // RGAT arts. 33.1, 34.1.j and 35.1; LIVA art. 163 terdecies.Uno (the VAT is due when collected,
  // or on 31 December of the year after the operation); DR347, positions 281 and 284-299, with no
  // quarters for these operations. Every figure below is worked out by hand.
  const cash = (over: Partial<ImportedInvoice>) => invoice({ cash: true, vat: 0, ...over });

  it('accrues the rest of an invoice not collected on 31 December of the year after', () => {
    // 5,000 € billed in June 2025, 1,000 € collected in September: 2025 → 1,000 €; 2026 → the
    // 4,000 € left accrue on 31/12/2026, with no operation that year (annual amount 0 €).
    const sale = cash({
      book: 'issued',
      concept: 'Cliente Caja SL',
      base: 5000,
      date: '2025-06-10',
      quarter: 2,
      collections: [{ date: '2025-09-15', amount: 1000 }],
    });
    const r = (year: number) =>
      summary347(year, [sale]).records.map((x) => [
        x.key,
        x.cash,
        x.total,
        x.cashTotal,
        x.quarters,
      ]);
    expect(r(2025)).toEqual([['B', true, 5000, 1000, [0, 0, 0, 0]]]);
    expect(r(2026)).toEqual([['B', true, 0, 4000, [0, 0, 0, 0]]]);
    // Collected in full in 2025: nothing left for 2026.
    const all = { ...sale, collections: [{ date: '2025-09-15', amount: 5000 }] };
    expect(summary347(2026, [all]).records).toEqual([]);
    // In 2027 it was all accrued already: a late collection changes nothing.
    const late = {
      ...sale,
      collections: [{ date: '2027-02-01', amount: 4000 }, ...sale.collections!],
    };
    expect(summary347(2027, [late]).records).toEqual([]);
  });

  it('reports the cash operations with a supplier apart from the rest, without quarters', () => {
    // 2,000 € in the 1T by the general rule and 3,000 € under the cash regime paid in the 3T: one
    // supplier above 3,005.06 € (5,000 €), two records.
    const s = summary347(2026, [
      invoice({ concept: 'Proveedor Mixto SL', base: 2000, vat: 0 }),
      cash({
        concept: 'Proveedor Mixto SL',
        base: 3000,
        date: '2026-05-04',
        quarter: 2,
        collections: [{ date: '2026-08-01', amount: 3000 }],
      }),
    ]);
    expect(s.records.map((x) => [x.key, x.cash, x.total, x.cashTotal, x.quarters])).toEqual([
      ['A', false, 2000, null, [2000, 0, 0, 0]],
      ['A', true, 3000, 3000, [0, 0, 0, 0]],
    ]);
    expect(s.boxes.map((b) => b.amount)).toEqual([2, 5000]);
  });

  it('gives no quarters at all when the person bills under the cash regime', () => {
    const s = summary347(2026, [
      cash({ book: 'issued', concept: 'Cliente Caja', base: 4000, collections: [] }),
      invoice({
        book: 'issued',
        concept: 'Cliente General',
        base: 3500,
        vat: 0,
        quarter: 2,
        date: '2026-05-02',
      }),
    ]);
    expect(s.records.map((x) => [x.name, x.cashTotal, x.quarters])).toEqual([
      ['Cliente Caja', 0, [0, 0, 0, 0]],
      ['Cliente General', null, [0, 0, 0, 0]],
    ]);
  });

  it('says when the collections of a cash invoice are not known, and leaves out small ones', () => {
    const s = summary347(2026, [cash({ book: 'issued', concept: 'Sin Cobros', base: 4000 })]);
    expect(s.records.map((x) => x.cashTotal)).toEqual([null]);
    expect(s.warnings).toContainEqual({ code: 'cashUnknown', who: 'Sin Cobros' });
    // 2,000 € in 2025 (under the threshold) collected in 2026: that year has nothing to report.
    const small = cash({
      book: 'issued',
      concept: 'Pequeño',
      base: 2000,
      date: '2025-10-01',
      quarter: 4,
      collections: [{ date: '2026-01-20', amount: 2000 }],
    });
    expect(summary347(2026, [small]).records).toEqual([]);
  });

  it('adds what was typed by hand of the cash invoices of the year before', () => {
    // 4,000 € still to collect on 31/12/2025 from «Cliente Caja SL», typed by hand; in 2026 it
    // bills it 3,500 € more under the cash regime and collects 2,000 € of them: 4,000 + 2,000 =
    // 6,000 € by the cash rule, 3,500 € by the general rule.
    const typed = [
      { key: 'B' as const, nif: 'B00000000', name: 'Cliente Caja SL', amount: 4000 },
      // A supplier under the cash regime with nothing in the book this year: 1,200.50 € alone.
      { key: 'A' as const, nif: null, name: 'Proveedor Caja', amount: 1200.5 },
      // Nothing typed: no record.
      { key: 'A' as const, nif: null, name: 'Vacío', amount: 0 },
    ];
    const sale = cash({
      book: 'issued',
      nif: 'B00000000',
      concept: 'Cliente Caja SL',
      base: 3500,
      date: '2026-03-01',
      collections: [{ date: '2026-06-01', amount: 2000 }],
    });
    const s = summary347(2026, [sale], typed);
    expect(s.records.map((x) => [x.key, x.name, x.total, x.cashTotal, x.quarters])).toEqual([
      ['B', 'Cliente Caja SL', 3500, 6000, [0, 0, 0, 0]],
      ['A', 'Proveedor Caja', 0, 1200.5, [0, 0, 0, 0]],
    ]);
    // Two lines for the same person add up: 700 + 500.50.
    const split = summary347(
      2026,
      [],
      [
        { ...typed[1], amount: 700 },
        { ...typed[1], amount: 500.5 },
      ]
    );
    expect(split.records.map((x) => x.cashTotal)).toEqual([1200.5]);
    // Typed without a tax id: the form needs it.
    expect(s.warnings).toEqual([{ code: 'nif', who: 'Proveedor Caja' }]);
  });

  it('warns when the invoice of the year before is in the book and was typed by hand too', () => {
    // The 2025 invoice leaves 4,000 € for 2026; the same 4,000 € typed by hand count twice.
    const old = cash({
      book: 'issued',
      concept: 'Cliente Caja SL',
      base: 5000,
      date: '2025-06-10',
      quarter: 2,
      collections: [{ date: '2025-09-15', amount: 1000 }],
    });
    const s = summary347(
      2026,
      [old],
      [{ key: 'B', nif: null, name: 'Cliente Caja SL', amount: 4000 }]
    );
    expect(s.records.map((x) => x.cashTotal)).toEqual([8000]);
    expect(s.warnings).toContainEqual({ code: 'carriedTwice', who: 'Cliente Caja SL' });
  });
});

describe('The modelo 131', () => {
  const base = {
    year: 2026,
    quarter: 2 as const,
    withheld: 0,
    lastYearNet: 20000,
    pendingNegative: 0,
  };
  const boxes = (r: ReturnType<typeof form131>) =>
    Object.fromEntries((r?.boxes ?? []).map((b) => [b.box, b.amount]));

  it('takes 4, 3 or 2 % of each activity by its employees [I131, box 02]', () => {
    const r = form131({
      ...base,
      activities: [
        { net: 3000, staffUnits: 2 }, // 4 % = 120
        { net: 2000, staffUnits: 1 }, // 3 % = 60
        { net: 1000, staffUnits: 0 }, // 2 % = 20
      ],
      withheld: 30,
    });
    // 07 = 200; 10 = 200 - 30 - 0 (last year 20,000 € > 12,000: no reduction) = 170.
    expect(boxes(r)).toMatchObject({
      '01': 6000,
      '02': 200,
      '07': 200,
      '08': 30,
      '09': 0,
      '10': 170,
      '13': 170,
      '15': 170,
    });
    expect(r).toMatchObject({ due: 170, result: 'pay' });
  });

  it('adds sections II and III at 2 %, a quarter less for young farmers, × 0.4 in Ceuta and Melilla', () => {
    const r = form131({
      ...base,
      activities: [{ net: 1000, staffUnits: 0.5, ceutaMelilla: true }], // 3 % × 0.4 = 1.2 % = 12
      noData: { income: 5000 }, // 2 % = 100
      agrarian: { income: 10000, young: true }, // 2 % × 0.75 = 1.5 % = 150
    });
    expect(boxes(r)).toMatchObject({
      '02': 12,
      '03': 5000,
      '04': 100,
      '05': 10000,
      '06': 150,
      '07': 262,
    });
    const cm = form131({
      ...base,
      activities: [],
      noData: { income: 1000, ceutaMelilla: true }, // 2 % × 0.4 = 8
      agrarian: { income: 1000, ceutaMelilla: true }, // 8
    });
    expect(boxes(cm)).toMatchObject({ '04': 8, '06': 8 });
  });

  it('takes off the reduction for low income, the negative results before and the complementary', () => {
    expect(
      [9000, 9000.01, 10500, 12000, 12000.01, null].map((v) => lowIncomeCut(v, figuresFor(2026)!))
    ).toEqual([100, 75, 50, 25, 0, 100]);
    // 07 = 4 % of 5,000 = 200; 10 = 200 - 20 - 75 = 105; 11 = min(150, 105) = 105; 13 = 0.
    const r = form131({
      ...base,
      activities: [{ net: 5000, staffUnits: 3 }],
      withheld: 20,
      lastYearNet: 9500,
      pendingNegative: 150,
    });
    expect(boxes(r)).toMatchObject({ '09': 75, '10': 105, '11': 105, '13': 0, '15': 0 });
    expect(r?.result).toBe('zero');
    // A negative result is carried to the next quarters, but not after the fourth.
    const negative = { ...base, activities: [{ net: 1000, staffUnits: 0 }], lastYearNet: null };
    expect(form131(negative)).toMatchObject({ due: 0, result: 'deduct' });
    expect(boxes(form131(negative))).toMatchObject({ '10': -80, '11': 0, '15': -80 });
    expect(form131({ ...negative, quarter: 4 })?.result).toBe('zero');
    // A complementary pays the difference: 200 - 150.
    const comp = form131({
      ...base,
      activities: [{ net: 5000, staffUnits: 2 }],
      complementaryOf: 150,
    });
    expect(boxes(comp)['15']).toBe(50);
  });

  it('applies the home deduction within its limits and leaves it out where the instructions do', () => {
    const one = { ...base, activities: [{ net: 6000, staffUnits: 2 }] }; // 07 = 240
    // 12 = 0.5 % of 6,000 = 30.
    expect(boxes(form131({ ...one, home: { usedThisYear: 0, expected: 0 } }))['12']).toBe(30);
    // Only what is left of the 660.14 € of the year.
    expect(boxes(form131({ ...one, home: { usedThisYear: 650, expected: 0 } }))['12']).toBe(10.14);
    // No more than 10 - 11.
    expect(
      boxes(form131({ ...one, withheld: 220, home: { usedThisYear: 0, expected: 0 } }))['12']
    ).toBe(20);
    // Income at or above 33,007.20 €, or farming mixed with other activities: none.
    expect(boxes(form131({ ...one, home: { usedThisYear: 0, expected: 27007.2 } }))['12']).toBe(0);
    expect(
      boxes(
        form131({ ...one, agrarian: { income: 1000 }, home: { usedThisYear: 0, expected: 0 } })
      )['12']
    ).toBe(0);
    // Farming alone: 2 % of the income (2 % of 10,000 = 200 at most 200 - 0).
    const farm = { ...base, activities: [], agrarian: { income: 10000 } };
    expect(boxes(form131({ ...farm, home: { usedThisYear: 0, expected: 40000 } }))['12']).toBe(0);
    expect(boxes(form131({ ...farm, home: { usedThisYear: 0, expected: 30000 } }))['12']).toBe(200);
    // Nothing to pay, nothing to deduct.
    expect(
      boxes(form131({ ...base, activities: [], home: { usedThisYear: 0, expected: 0 } }))['12']
    ).toBe(0);
    expect(form131({ ...base, year: 2019, activities: [] })).toBeNull();
  });
});

describe('Warnings of the 720, 721 and 714', () => {
  it('warns of each block above 50,000 € the first time, after a rise of more than 20,000 € or when an asset ended', () => {
    expect(
      wealthWarnings({
        year: 2026,
        abroad: { accounts: 50000.01, securities: 50000, realEstate: 90000, crypto: 70000 },
        lastFiled: { realEstate: 70000, crypto: 49000 },
      })
    ).toEqual([
      { model: '720', block: 'accounts', value: 50000.01, reason: 'first' },
      { model: '721', block: 'crypto', value: 70000, reason: 'rise' },
    ]);
    // An asset that ended is reported only when an earlier 720 included it (AEAT FAQ of the 720).
    expect(
      wealthWarnings({
        year: 2026,
        abroad: {},
        lastFiled: { securities: 60000 },
        ended: ['securities'],
      })
    ).toEqual([{ model: '720', block: 'securities', value: 0, reason: 'ended' }]);
    expect(wealthWarnings({ year: 2026, abroad: {}, ended: ['securities'] })).toEqual([]);
    // A year without figures gives nothing.
    expect(wealthWarnings({ year: 2022, abroad: { crypto: 99999 } })).toEqual([]);
    expect(wealthWarnings({ year: 2019, abroad: { accounts: 99999 } })).toEqual([]);
  });

  it('warns of the 714 above 2,000,000 € of assets or with a positive base with the State minimum', () => {
    const w = (assets: number, home: number, debts: number) =>
      wealthWarnings({ year: 2026, abroad: {}, wealth: { assets, home, debts } });
    expect(w(2000000.01, 0, 0)).toEqual([{ model: '714', reason: 'assets', value: 2000000.01 }]);
    // 1,500,000 - 300,000 (home, up to 300,000) - 100,000 - 700,000 = 400,000.
    expect(w(1500000, 500000, 100000)).toEqual([{ model: '714', reason: 'base', value: 400000 }]);
    // 1,000,000 - 200,000 - 100,000 - 700,000 = 0: nothing.
    expect(w(1000000, 200000, 100000)).toEqual([]);
  });
});
