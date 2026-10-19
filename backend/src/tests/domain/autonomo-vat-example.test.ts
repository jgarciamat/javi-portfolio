import { manualMovements, type ManualData } from '@domain/services/autonomo-expenses';
import { prepareDraft, type DraftInputs, type DraftResult } from '@domain/services/autonomo';

/**
 * The example of a trader with the EU of docs/ejemplos-importacion (ejemplo-ue-*), as the importer of
 * the app turns its two books into the draft (the frontend test vatExample.test.ts checks that). The
 * figures are the ones of its LEEME, worked out by hand (euros):
 *
 *   303 1T: 27 = 1,050 (21 % of 5,000) + 315 (intra-EU 1,500) + 52 (5.2 % of 1,000) = 1,417;
 *           45 = 420 + 210 (import) + 315 = 945; 71 = 472.
 *   303 2T: 27 = 1,050 + 315 (1,200 goods + 300 service) = 1,365; 45 = 378 + 315 = 693; 71 = 672.
 *   303 3T: 27 = 945 + 100 = 1,045; 45 = 462 + 840 (the forklift, investment good) = 1,302;
 *           46 = −257, to offset (72).
 *   303 4T: 27 = 1,260 + 168 (reverse charge, 800) = 1,428; 45 = 525 + 168 = 693; 46 = 735;
 *           110 = 257, applied; 71 = 478.
 *   390: 05 = 20,500; 33 = 25,300; 47 = 5,255; 64 = 3,633; 65 = 86 = 1,622; 95 = 1,622; 108 = 31,500.
 *   130 4T: income 31,500 − expenses 14,500 (the forklift is depreciated, not deducted) = 17,000;
 *           20 % = 3,400 − 2,920 paid before = 480.
 */
const quota = { kind: 'quota' as const, amount: 300, vatRate: 0 as const };
const goods = (amount: number) => ({ kind: 'other' as const, amount, vatRate: 21 as const });
const data: ManualData = {
  profile: {
    workArea: 0,
    homeArea: 0,
    vehicleExclusive: false,
    healthPeople: 0,
    healthDisability: false,
  },
  quarters: [
    {
      income: { r21: 5000, r10: 0, r4: 0, r0: 0 },
      expenses: [
        quota,
        goods(2420),
        { ...goods(1500), op: 'intraGoods' },
        { ...goods(1000), op: 'import' },
      ],
      vat: {
        sales: { intraEU: 3000, exports: 2000 },
        re: { r21: 1000 },
        intra: [
          { key: 'E', vatId: 'FR00000000001', name: 'Client Fictif SARL', base: 3000 },
          { key: 'A', vatId: 'DE000000001', name: 'Lieferant Beispiel GmbH', base: 1500 },
        ],
      },
    },
    {
      income: { r21: 5000, r10: 0, r4: 0, r0: 0 },
      expenses: [
        quota,
        goods(2178),
        { ...goods(1200), op: 'intraGoods' },
        { kind: 'software', amount: 300, vatRate: 21, op: 'intraServices' },
      ],
      vat: {
        sales: { intraEU: 1500, exports: 1000 },
        intra: [
          { key: 'S', vatId: 'PT000000000', name: 'Consultoria Ficticia Lda', base: 1500 },
          { key: 'A', vatId: 'DE000000001', name: 'Lieferant Beispiel GmbH', base: 1200 },
          { key: 'I', vatId: 'IE0000000A', name: 'Example Software Ltd licencia', base: 300 },
        ],
      },
    },
    {
      income: { r21: 4500, r10: 1000, r4: 0, r0: 0 },
      expenses: [quota, goods(2662), { ...goods(4840), investment: true }],
      vat: {
        sales: { intraEU: 2500 },
        intra: [{ key: 'E', vatId: 'FR00000000001', name: 'Client Fictif SARL', base: 2500 }],
      },
    },
    {
      income: { r21: 6000, r10: 0, r4: 0, r0: 0 },
      expenses: [quota, goods(3025), { ...goods(800), op: 'reverse' }],
    },
  ],
};

const inputs: DraftInputs = {
  quarters: [0, 1, 2, 3].map(() => ({
    withheld: 0,
    socialSecurity: 0,
    vatNotDeductible: 0,
  })) as DraftInputs['quarters'],
  hardToJustify: false,
  priorYearNet: null,
  exempt130: false,
  vatToOffset: 0,
  vat: { offsetStart: 0 },
  manual: data,
};

const draft = (q: 1 | 2 | 3 | 4): DraftResult =>
  prepareDraft(2026, q, manualMovements(2026, data).movements, inputs);
const boxes = (d: DraftResult) =>
  Object.fromEntries(
    [...d.vat.accrued, ...d.vat.deductible, ...d.vat.info, ...d.vat.settlement].map((b) => [
      b.box,
      b.amount,
    ])
  );

describe('The example of a trader with the EU (docs/ejemplos-importacion, LEEME)', () => {
  it('gives the 303 of each quarter', () => {
    expect(boxes(draft(1))).toMatchObject({
      '27': 1417,
      '22': 1000,
      '24': 52,
      '33': 210,
      '45': 945,
      '59': 3000,
      '60': 2000,
      '71': 472,
    });
    expect(boxes(draft(2))).toMatchObject({
      '10': 1500,
      '27': 1365,
      '36': 1500,
      '45': 693,
      '59': 1500,
      '60': 1000,
      '71': 672,
    });
    expect(boxes(draft(3))).toMatchObject({
      '27': 1045,
      '30': 4000,
      '31': 840,
      '45': 1302,
      '46': -257,
      '72': 257,
    });
    expect(boxes(draft(4))).toMatchObject({
      '12': 800,
      '13': 168,
      '27': 1428,
      '28': 3300,
      '45': 693,
      '110': 257,
      '78': 257,
      '71': 478,
    });
  });

  it('gives the 349 of each quarter, consistent with the 303', () => {
    expect(draft(1).m349?.boxes.map((b) => b.amount)).toEqual([2, 4500, 0, 0]);
    expect(draft(2).m349?.warnings).toEqual([]);
    expect(draft(2).m349?.operators.map((o) => o.key)).toEqual(['S', 'A', 'I']);
    expect(draft(4).m349).toBeNull();
  });

  it('gives the 390 of the year and the 130 of the fourth quarter', () => {
    const d = draft(4);
    const m390 = Object.fromEntries(
      (d.m390 as NonNullable<DraftResult['m390']>).sections
        .flatMap((s) => s.boxes)
        .map((b) => [b.box, b.amount])
    );
    expect(m390).toMatchObject({
      '05': 20500,
      '06': 4305,
      '25': 2700,
      '551': 300,
      '27': 800,
      '33': 25300,
      '34': 5203,
      '602': 52,
      '47': 5255,
      '49': 1953,
      '51': 840,
      '53': 210,
      '57': 567,
      '598': 63,
      '64': 3633,
      '65': 1622,
      '86': 1622,
      '95': 1622,
      '662': 0,
      '99': 21500,
      '103': 7000,
      '104': 3000,
      '108': 31500,
    });
    expect(d.m390?.warnings).toEqual([]);
    expect(Object.fromEntries(d.irpf.boxes.map((b) => [b.box, b.amount]))).toMatchObject({
      '01': 31500,
      '02': 14500,
      '04': 3400,
      '05': 2920,
      '19': 480,
    });
  });
});
