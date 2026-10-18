import { manualMovements, type ManualData } from '@domain/services/autonomo-expenses';
import { prepareDraft, type DraftInputs } from '@domain/services/autonomo';

/**
 * The invoice books of docs/ejemplos-importacion (a freelancer's first three quarters of 2026), as the
 * app's importer turns them into the manual draft, and what the modelos 303 and 130 must say. Every
 * figure below was worked out by hand from the invoices, not taken from the code:
 *
 *   303 = VAT charged − VAT deducted      (the car counts half of its VAT, a meal only up to 26.67 €
 *                                          a day, home supplies nothing without a home office)
 *   130 = 20 % of (income − deductible expenses), added up from January, minus what was paid before
 *         and the withholdings of the clients
 */
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
      income: { r21: 5300, r10: 0, r4: 0, r0: 0 },
      expenses: [
        { kind: 'rent', amount: 484, vatRate: 21 },
        { kind: 'management', amount: 181.5, vatRate: 21 },
        { kind: 'software', amount: 72.6, vatRate: 21 },
        { kind: 'supplies', amount: 96.8, vatRate: 21 },
        { kind: 'quota', amount: 882, vatRate: 0 },
      ],
    },
    {
      income: { r21: 5000, r10: 1000, r4: 0, r0: 0 },
      expenses: [
        { kind: 'rent', amount: 484, vatRate: 21 },
        { kind: 'management', amount: 181.5, vatRate: 21 },
        { kind: 'vehicle', amount: 145.2, vatRate: 21 },
        { kind: 'meals', amount: 60.5, vatRate: 10, days: 1 },
        { kind: 'quota', amount: 882, vatRate: 0 },
      ],
    },
    {
      income: { r21: 5200, r10: 0, r4: 600, r0: 0 },
      expenses: [
        { kind: 'rent', amount: 484, vatRate: 21 },
        { kind: 'management', amount: 181.5, vatRate: 21 },
        { kind: 'advertising', amount: 363, vatRate: 21 },
        { kind: 'material', amount: 108.9, vatRate: 21 },
        { kind: 'quota', amount: 882, vatRate: 0 },
      ],
    },
    { income: { r21: 0, r10: 0, r4: 0, r0: 0 }, expenses: [] },
  ],
};

const withheld = [675, 750, 780, 0];
const inputs: DraftInputs = {
  quarters: withheld.map((w) => ({
    withheld: w,
    socialSecurity: 0,
    vatNotDeductible: 0,
  })) as DraftInputs['quarters'],
  hardToJustify: false,
  priorYearNet: null,
  exempt130: false,
  vatToOffset: 0,
  manual: data,
  prior: null,
};

const draft = (quarter: 1 | 2 | 3) =>
  prepareDraft(2026, quarter, manualMovements(2026, data).movements, inputs);
const box = (quarter: 1 | 2 | 3, id: string) =>
  draft(quarter).irpf.boxes.find((b) => b.box === id)?.amount;

describe('The example invoice books give the right modelos', () => {
  it('modelo 303: the VAT charged minus the VAT that can be deducted, quarter by quarter', () => {
    // Q1: 5,300 × 21 % = 1,113 − (84 + 31.50 + 12.60) = 984.90
    expect(draft(1).vat.amountDue).toBe(984.9);
    // Q2: 5,000 × 21 % + 1,000 × 10 % = 1,150 − (84 + 31.50 + 12.60 car half + 2.42 meal) = 1,019.48
    expect(draft(2).vat.amountDue).toBe(1019.48);
    // Q3: 5,200 × 21 % + 600 × 4 % = 1,116 − (84 + 31.50 + 63 + 18.90) = 918.60
    expect(draft(3).vat.amountDue).toBe(918.6);
  });

  it('modelo 130: accumulated income and expenses, previous payments and withholdings', () => {
    // Q1: (5,300 − 1,492) × 20 % = 761.60 − 675 withheld = 86.60
    expect([box(1, '01'), box(1, '02'), box(1, '04'), box(1, '06'), box(1, '07')]).toEqual([
      5300, 1492, 761.6, 675, 86.6,
    ]);
    // Q2: (11,300 − 2,948.25) × 20 % = 1,670.35 − 86.60 paid − 1,425 withheld = 158.75
    expect([
      box(2, '01'),
      box(2, '02'),
      box(2, '04'),
      box(2, '05'),
      box(2, '06'),
      box(2, '07'),
    ]).toEqual([11300, 2948.25, 1670.35, 86.6, 1425, 158.75]);
    // Q3: (17,100 − 4,770.25) × 20 % = 2,465.95 − 245.35 paid − 2,205 withheld = 15.60
    expect([
      box(3, '01'),
      box(3, '02'),
      box(3, '04'),
      box(3, '05'),
      box(3, '06'),
      box(3, '07'),
    ]).toEqual([17100, 4770.25, 2465.95, 245.35, 2205, 15.6]);
  });
});
