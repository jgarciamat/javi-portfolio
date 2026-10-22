import { prepareDraft, type DraftInputs, type DraftResult } from '@domain/services/autonomo';
import type { ManualData } from '@domain/services/autonomo-expenses';
import { prorrataOf, type VatMovement } from '@domain/services/autonomo-vat';
import {
  temporaryRatesIn,
  type QuarterVat,
  type VatOptions,
} from '@domain/services/autonomo-vat-data';

/**
 * The boxes of the 303, 349 and 390 that the worked case of the manual does not reach, each one with
 * the rule at hand and the figures worked out by hand (euros):
 *   prorrata  = with the right to deduct ÷ all, rounded up (art. 104.Dos LIVA)
 *   special   = only-taxed in full, only-exempt nothing, common at the prorrata (art. 106 LIVA)
 *   box 44    = VAT of the year × (definitive − provisional)          (art. 105.Cuatro LIVA)
 *   box 43    = VAT × (this year's % − % of the year bought) ÷ 5 or 10 (arts. 107 and 109 LIVA)
 *   box 78    = up to boxes 66 + 77; all of box 110 to ask for a refund [I303, apartados 6 y 8]
 */
const at = (q: number) => `2026-${String(q * 3 - 1).padStart(2, '0')}-15`;
const sale = (
  q: number,
  base: number,
  rate: 0 | 4 | 10 | 21 = 21,
  op?: VatMovement['op']
): VatMovement => ({
  date: at(q),
  type: 'INCOME',
  vatRate: rate,
  amountCents: Math.round(base * (op && op !== 're' ? 100 : 100 + rate)),
  ...(op ? { op } : {}),
});
const buy = (q: number, base: number, extra: Partial<VatMovement> = {}): VatMovement => ({
  date: at(q),
  type: 'EXPENSE',
  vatRate: 21,
  amountCents: Math.round(base * (extra.op && extra.op !== 'domestic' ? 100 : 121)),
  ...extra,
});

const manualWith = (extras: QuarterVat[]): ManualData => ({
  profile: {
    workArea: 0,
    homeArea: 0,
    vehicleExclusive: true,
    healthPeople: 0,
    healthDisability: false,
  },
  quarters: [0, 1, 2, 3].map((i) => ({
    income: { r21: 0, r10: 0, r4: 0, r0: 0 },
    expenses: [],
    vat: extras[i] ?? {},
  })) as unknown as ManualData['quarters'],
});

const inputs = (vat: VatOptions = { offsetStart: 0 }, extras: QuarterVat[] = []): DraftInputs => ({
  quarters: [0, 1, 2, 3].map(() => ({
    withheld: 0,
    socialSecurity: 0,
    vatNotDeductible: 0,
  })) as DraftInputs['quarters'],
  hardToJustify: false,
  priorYearNet: null,
  exempt130: false,
  vatToOffset: 0,
  manual: manualWith(extras),
  vat,
});

const boxes = (d: DraftResult) =>
  Object.fromEntries(
    [...d.vat.accrued, ...d.vat.deductible, ...d.vat.info, ...d.vat.settlement].map((b) => [
      b.box,
      b.amount,
    ])
  );
const of390 = (d: DraftResult) =>
  Object.fromEntries(
    (d.m390 as NonNullable<DraftResult['m390']>).sections
      .flatMap((s) => s.boxes)
      .map((b) => [b.box, b.amount])
  );

describe('prorrata (arts. 102-106 LIVA)', () => {
  // Each quarter: 8,000 € taxed at 21 %, 2,000 € exempt (a medical service, art. 20) and a 1,000 € purchase.
  const year = [1, 2, 3, 4].flatMap((q) => [
    sale(q, 8000),
    sale(q, 2000, 0, 'exempt'),
    buy(q, 1000),
  ]);

  it('rounds the percentage up to the next unit', () => {
    expect(prorrataOf(7999, 10000)).toBe(80);
    expect(prorrataOf(8000, 10000)).toBe(80);
    expect(prorrataOf(8001, 10000)).toBe(81);
    expect(prorrataOf(0, 0)).toBe(100);
  });

  it('deducts at the provisional percentage and regularises to the definitive one in the fourth quarter', () => {
    const opts: VatOptions = { offsetStart: 0, prorrata: { provisional: 70, special: false } };
    const q1 = prepareDraft(2026, 1, year, inputs(opts));
    // 210 × 70 % = 147; the base stays whole.
    expect(boxes(q1)).toMatchObject({ '28': 1000, '29': 147, '44': 0 });
    expect(q1.vat.prorrata).toBe(70);
    expect(q1.vat.warnings).toContain('prorrataApplied');
    // 32,000 / 40,000 = 80 %: 4 × 210 × (80 − 70) % = 84.
    const q4 = prepareDraft(2026, 4, year, inputs(opts));
    expect(boxes(q4)).toMatchObject({ '29': 147, '44': 84, '45': 231 });
    expect(of390(q4)).toMatchObject({
      '115': 40000,
      '116': 32000,
      '118': 80,
      '105': 8000,
      '522': 84,
    });
    // 130: the exempt sales are income too.
    expect(q1.irpf.boxes.find((b) => b.box === '01')?.amount).toBe(10000);
  });

  it('without last year percentage, it proposes the one of the operations so far and says so', () => {
    const q1 = prepareDraft(2026, 1, year, inputs());
    expect(boxes(q1)['29']).toBe(168);
    expect(q1.vat.warnings).toContain('prorrataMissing');
  });

  it('warns of a percentage given without exempt sales', () => {
    const q1 = prepareDraft(
      2026,
      1,
      [sale(1, 1000), buy(1, 100)],
      inputs({ prorrata: { provisional: 90, special: false } })
    );
    expect(q1.vat.warnings).toContain('exemptNoProrrata');
    expect(boxes(q1)['29']).toBe(18.9);
  });

  it('special prorrata: only-taxed in full, only-exempt nothing, common at the percentage', () => {
    const uses = [1, 2, 3, 4].flatMap((q) => [
      sale(q, 8000),
      sale(q, 2000, 0, 'exempt'),
      buy(q, 1000, { use: 'taxed' }),
      buy(q, 1000, { use: 'exempt' }),
      buy(q, 1000),
    ]);
    const special = prepareDraft(
      2026,
      1,
      uses,
      inputs({ offsetStart: 0, prorrata: { provisional: 80, special: true } })
    );
    // 210 + 0 + 168; the base of the exempt-only purchase is not shown (nothing of it is deducted).
    expect(boxes(special)).toMatchObject({ '28': 2000, '29': 378 });
    // With the general one, 3 × 168 = 504 a quarter, more than 10 % over 378: the special one is compulsory.
    const general = prepareDraft(
      2026,
      4,
      uses,
      inputs({ offsetStart: 0, prorrata: { provisional: 80, special: false } })
    );
    expect(boxes(general)['29']).toBe(504);
    expect(general.vat.warnings).toContain('specialMandatory');
  });
});

describe('the temporary rates of 2023 and 2024 (RDL 20/2022, 8/2023 and 4/2024)', () => {
  // A 500 € sale at 4 % to a retailer in the surcharge: 500 × 0.5 % = 2.50 €. Up to the third
  // quarter of 2024 it goes in 16-18 with the 0 % and 0.62 % ones; from the fourth, in 168-170
  // (AEAT, instructions of the 303 for 09-12/3T-4T 2024).
  const sold = (year: number, q: 1 | 2 | 3 | 4) => {
    const date = `${year}-${String(q * 3 - 1).padStart(2, '0')}-15`;
    const movement = { ...sale(q, 500, 4, 're'), date };
    return prepareDraft(year, q, [movement], inputs());
  };

  it('puts the 0.5 % surcharge in 16-18 up to 3T 2024 and in 168-170 after', () => {
    for (const [year, q] of [
      [2023, 1],
      [2024, 3],
    ] as const) {
      const d = boxes(sold(year, q));
      expect([d['16'], d['17'], d['18'], d['168']]).toEqual([500, 0.5, 2.5, undefined]);
    }
    for (const [year, q] of [
      [2024, 4],
      [2026, 1],
    ] as const) {
      const d = boxes(sold(year, q));
      expect([d['168'], d['169'], d['170'], d['16']]).toEqual([500, 0.5, 2.5, undefined]);
    }
    // 27 = 500 × 4 % + 2.50 in every period.
    expect(boxes(sold(2023, 1))['27']).toBe(22.5);
  });

  it('knows the periods of each temporary rate and its surcharge, as the BOE gives them', () => {
    const rates = (year: number, q: number) => temporaryRatesIn(year, q).map((t) => [t.vat, t.re]);
    // RDL 20/2022 art. 72 (as RDL 8/2023 worded it): 5 % (0.62 %) from 1-1-2023 to 30-6-2024.
    expect(rates(2023, 0)).toEqual([[5, 0.62]]);
    expect(rates(2024, 1)).toEqual([[5, 0.62]]);
    // RDL 4/2024 art. 1: 5 % (0.62 %) in 3T 2024; 2 % (0.26 %) and 7.5 % (1 %) in 4T 2024.
    expect(rates(2024, 2)).toEqual([[5, 0.62]]);
    expect(rates(2024, 3)).toEqual([
      [2, 0.26],
      [7.5, 1],
    ]);
    expect(rates(2022, 3)).toEqual([]);
    expect(rates(2025, 0)).toEqual([]);
  });

  it('warns that the temporary rates are not worked out, in the 303 and the 390 of those years', () => {
    expect(sold(2023, 2).vat.warnings).toContain('temporaryRates');
    expect(sold(2024, 4).vat.warnings).toContain('temporaryRates');
    expect(sold(2024, 4).m390?.warnings).toContainEqual({ code: 'temporaryRates' });
    expect(sold(2025, 1).vat.warnings).not.toContain('temporaryRates');
    expect(sold(2026, 4).m390?.warnings).not.toContainEqual({ code: 'temporaryRates' });
  });
});

describe('the other boxes of the accrued and the deductible VAT', () => {
  it('surcharge at 1.4, 0.5 and 1.75 %, reverse charge, investment goods and imports', () => {
    const d = prepareDraft(
      2026,
      1,
      [
        sale(1, 1000, 10, 're'),
        sale(1, 500, 4, 're'),
        sale(1, 2000),
        buy(1, 1000, { op: 'reverse' }),
        buy(1, 4000, { op: 'reverse', investment: true }),
        buy(1, 5000, { op: 'import', investment: true }),
        buy(1, 6000, { op: 'intraGoods', investment: true }),
        buy(1, 300, { op: 'intraServices', investment: true }),
      ],
      inputs({ offsetStart: 0 }, [{ re: { r21: 1000, tobacco: 200 } }])
    );
    expect(boxes(d)).toMatchObject({
      // 1,000 × 1.4 % = 14; 500 × 0.5 % = 2.5; tobacco 200 × 1.75 % = 3.5; the rest at 5.2 %: 800 → 41.6.
      '19': 1000,
      '21': 14,
      '168': 500,
      '170': 2.5,
      '156': 200,
      '158': 3.5,
      '22': 800,
      '24': 41.6,
      // Self-assessed: 1,000 + 4,000 reverse charge; 6,000 goods + 300 services from the EU.
      '12': 5000,
      '13': 1050,
      '10': 6300,
      '11': 1323,
      '28': 1000,
      '29': 210,
      '30': 4000,
      '31': 840,
      '34': 5000,
      '35': 1050,
      // A service is never an investment good.
      '36': 300,
      '37': 63,
      '38': 6000,
      '39': 1260,
    });
    // 27 = 100 + 20 + 420 + 1,323 + 1,050 + 41.6 + 14 + 2.5 + 3.5.
    expect(boxes(d)['27']).toBe(2974.6);
  });

  it('sales without VAT go to their box of the additional information and are income of the 130', () => {
    const d = prepareDraft(
      2026,
      2,
      [
        sale(2, 100, 0, 'notSubject'),
        sale(2, 200, 0, 'oss'),
        sale(2, 300, 0, 'ossSubject'),
        sale(2, 400, 0, 'reverse'),
        sale(2, 50, 0, 'nonVat'),
      ],
      inputs()
    );
    expect(boxes(d)).toMatchObject({ '120': 100, '123': 200, '124': 300, '122': 400, '71': 0 });
    expect(d.vat.result).toBe('zero');
    expect(d.vat.warnings).toContain('reverseIssued');
    // A business transferred as a whole (art. 7 LIVA) is income, and no box of the 303.
    expect(d.irpf.boxes.find((b) => b.box === '01')?.amount).toBe(1050);
  });

  it('cash accounting: VAT due when collected, deducted when paid, and the invoices in 62-63 and 74-75', () => {
    const cash = {
      invoiced: { r21: 1000, r10: 0, r4: 0 },
      collected: { r21: 400, r10: 0, r4: 0 },
      purchasesInvoiced: { r21: 500, r10: 0, r4: 0 },
      purchasesPaid: { r21: 200, r10: 0, r4: 0 },
    };
    const d = prepareDraft(
      2026,
      4,
      [sale(4, 1000), buy(4, 500)],
      inputs({ offsetStart: 0 }, [{}, {}, {}, { cash }])
    );
    expect(boxes(d)).toMatchObject({
      '07': 400,
      '09': 84,
      '62': 1000,
      '63': 210,
      '28': 200,
      '29': 42,
      '74': 500,
      '75': 105,
    });
    expect(of390(d)).toMatchObject({
      '647': 400,
      '648': 84,
      '05': 0,
      '653': 1000,
      '99': 0,
      '654': 1000,
    });
  });

  it('corrections, compensations to farmers, unpaid invoices (art. 80) and deferred import VAT', () => {
    const d = prepareDraft(
      2026,
      1,
      [sale(1, 1000)],
      inputs({ offsetStart: 0, regime: 'reagp' }, [
        {
          reFix: { base: -100, fee: -5.2 },
          reagp: 12,
          art80: 30,
          importDeferred: 50,
          investmentAdjust: -8,
        },
      ])
    );
    // 46 = 210 − 5.2 − (12 − 8) = 200.8; 64 = 46 + 76; 69 = 66 + 77.
    expect(boxes(d)).toMatchObject({
      '25': -100,
      '26': -5.2,
      '42': 12,
      '43': -8,
      '46': 200.8,
      '64': 230.8,
      '69': 280.8,
    });
    expect(d.vat.warnings).toEqual(expect.arrayContaining(['importDeferred', 'reagp']));
  });
});

describe('VAT to offset and refunds [I303, apartados 6 y 8]', () => {
  it('applies as much as the result takes: 1,000 of 1,200, and 200 of 200', () => {
    const big = prepareDraft(2026, 1, [sale(1, 1000 / 0.21)], inputs({ offsetStart: 1200 }));
    expect(boxes(big)).toMatchObject({ '66': 1000, '110': 1200, '78': 1000, '87': 200, '71': 0 });
    const small = prepareDraft(2026, 1, [sale(1, 1000 / 0.21)], inputs({ offsetStart: 200 }));
    expect(boxes(small)).toMatchObject({ '78': 200, '87': 0, '71': 800 });
  });

  it('carries a negative quarter to the next ones, and the fourth can ask for the whole refund', () => {
    const year = [buy(1, 1000), sale(2, 500), buy(3, 2000), buy(4, 1000)];
    const q2 = prepareDraft(2026, 2, year, inputs({ offsetStart: 100 }));
    // 1T: −210 to offset; 2T: 105 due, 310 pending, 105 applied.
    expect(boxes(q2)).toMatchObject({ '110': 310, '78': 105, '87': 205, '71': 0 });
    const refund = prepareDraft(2026, 4, year, inputs({ offsetStart: 100, refund: true }));
    // 205 + 420 (3T) pending, all of it applied, plus the −210 of the quarter.
    expect(boxes(refund)).toMatchObject({ '110': 625, '78': 625, '69': -835, '73': 835, '72': 0 });
    expect(refund.vat.result).toBe('refund');
    expect(of390(refund)).toMatchObject({ '98': 835, '97': 0, '662': 0, '85': 100 });
    const early = prepareDraft(2026, 2, year, inputs({ offsetStart: 0, refund: true }));
    expect(early.vat.warnings).toContain('refundNotLast');
  });

  it('keeps box 110 of older data, and says when the VAT to offset was not applied', () => {
    const legacy = { ...inputs(), vat: null, vatToOffset: 50 };
    const d = prepareDraft(2026, 3, [buy(1, 1000), sale(3, 1000)], legacy);
    expect(boxes(d)).toMatchObject({ '110': 50, '78': 50, '71': 160 });
    const skipped = prepareDraft(
      2026,
      1,
      [sale(1, 1000)],
      inputs({ offsetStart: 80, skipOffset: [0] })
    );
    expect(boxes(skipped)).toMatchObject({ '110': 80, '78': 0, '87': 80, '71': 210 });
    expect(skipped.vat.warnings).toContain('offsetNotApplied');
  });

  it('a quarter without any operation is «sin actividad»', () => {
    const d = prepareDraft(2026, 2, [], inputs());
    expect(d.vat.result).toBe('noActivity');
    expect(d.m349).toBeNull();
    expect(d.m390).toBeNull();
  });
});

describe('investment goods of earlier years (arts. 107-109 LIVA)', () => {
  it('regularises a fifth (a tenth for buildings) when the percentages differ by more than 10 points', () => {
    const d = prepareDraft(
      2026,
      4,
      [sale(4, 1000)],
      inputs({
        offsetStart: 0,
        investments: [
          // (100 − 50) % of 1,000 ÷ 5 = 100; of 2,000 ÷ 10 = 100; 95 % is within 10 points; 2020 is over.
          { year: 2024, vat: 1000, pct: 50, realEstate: false },
          { year: 2019, vat: 2000, pct: 50, realEstate: true },
          { year: 2025, vat: 1000, pct: 95, realEstate: false },
          { year: 2020, vat: 1000, pct: 0, realEstate: false },
          { year: 2026, vat: 1000, pct: 0, realEstate: false },
        ],
      })
    );
    expect(boxes(d)['43']).toBe(200);
    expect(of390(d)['63']).toBe(200);
  });
});

describe('modelo 349', () => {
  it('warns of a missing or foreign VAT number, of differences with the 303 and of a monthly 349', () => {
    const d = prepareDraft(
      2026,
      1,
      [
        sale(1, 60000, 0, 'intraEU'),
        {
          ...buy(1, 1000, { op: 'intraGoods' }),
          intra: { key: 'A', vatId: 'de 123.456.789', name: 'Lieferant' },
        },
      ],
      inputs({ offsetStart: 0 }, [
        {
          intra: [
            { key: 'E', vatId: '', name: 'Cliente sin NIF', base: 55000 },
            { key: 'S', vatId: 'US123', name: '', base: 1000 },
          ],
        },
      ])
    );
    const m349 = d.m349 as NonNullable<DraftResult['m349']>;
    expect(m349.operators.map((o) => o.vatId)).toEqual(['DE123456789', '', 'US123']);
    expect(m349.warnings).toEqual([
      { code: 'noVatId', name: 'Cliente sin NIF' },
      { code: 'badPrefix', vatId: 'US123' },
      { code: 'vs59', expected: 60000, got: 56000 },
      { code: 'monthly', amount: 56000 },
    ]);
    expect(m349.monthly).toBe(true);
    expect(d.deadlines.find((x) => x.model === '349')?.date).toBe('2026-04-20');
  });

  it('warns when the acquisitions do not add up to box 10, and adds up corrections of one period', () => {
    const rect = { year: 2025, quarter: 4 as const, previous: 100 };
    const d = prepareDraft(
      2026,
      1,
      [buy(1, 500, { op: 'intraServices' })],
      inputs({ offsetStart: 0 }, [
        {
          intra: [
            { key: 'I', vatId: 'IE1234567T', name: '', base: 400 },
            { key: 'A', vatId: 'FR00000000001', name: 'Fournisseur', base: 90, rectifies: rect },
            { key: 'A', vatId: 'FR00000000001', name: '', base: 5, rectifies: rect },
          ],
        },
      ])
    );
    const m349 = d.m349 as NonNullable<DraftResult['m349']>;
    expect(m349.warnings).toEqual([{ code: 'vs10', expected: 500, got: 400 }]);
    expect(m349.rectifications).toEqual([
      {
        key: 'A',
        vatId: 'FR00000000001',
        name: 'Fournisseur',
        base: 95,
        year: 2025,
        quarter: 4,
        previous: 200,
      },
    ]);
    expect(m349.operators[0].name).toBe('');
  });
});

describe('modelo 390', () => {
  it('reconciles with the 303 filed and warns of a simplified regime (exonerated)', () => {
    const year = [1, 2, 3, 4].map((q) => sale(q, 1000));
    const d = prepareDraft(
      2026,
      4,
      year,
      inputs({ offsetStart: 0, filed: [210, null, 200, 210], regime: 'simplified' })
    );
    const m390 = d.m390 as NonNullable<DraftResult['m390']>;
    expect(m390.reconciliation[2]).toEqual({
      quarter: 3,
      computed: 210,
      filed: 200,
      difference: 10,
    });
    expect(m390.warnings).toEqual([
      { code: 'filedDiffers', quarter: 3, difference: 10 },
      { code: 'exonerated' },
    ]);
    expect(d.vat.warnings).toContain('simplified');
    expect(m390.sections.find((s) => s.id === 'prorrata')?.boxes).toEqual([]);
  });

  it('says when the results do not add up (box 110 of older data), and counts the VAT not deductible', () => {
    const legacy = { ...inputs(), vat: null, vatToOffset: 500 };
    const d = prepareDraft(2026, 4, [buy(1, 1000, { vatShare: 0.5 }), sale(4, 1000)], legacy);
    const m390 = d.m390 as NonNullable<DraftResult['m390']>;
    expect(m390.warnings.map((w) => w.code)).toEqual(['identity']);
    // Half of the 1,000 € purchase cannot be deducted (a car used for both).
    expect(of390(d)['232']).toBe(500);
  });
});
