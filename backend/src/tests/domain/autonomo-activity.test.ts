import { manualMovements, type ManualData } from '@domain/services/autonomo-expenses';
import { prepareDraft, type DraftInputs, type QuarterExtras } from '@domain/services/autonomo';

/**
 * The activity figures the app works out on the device (depreciation, provisions, grants, REAGP
 * compensations) in the modelo 130, the normal modality and section II for farming. Every figure was
 * worked out by hand:
 *   section I:  box 01 = invoices + grants + compensations; box 02 = expenses + depreciation +
 *               provisions (+ 5 % hard-to-justify only in the simplified modality, art. 30.2.4.ª RIRPF)
 *   section II: box 08 = income of the quarter without capital grants; box 09 = 2 % (art. 110.1.c RIRPF)
 */
const empty: ManualData['quarters'][number] = {
  income: { r21: 0, r10: 0, r4: 0, r0: 0 },
  expenses: [],
};
const profile = {
  workArea: 0,
  homeArea: 0,
  vehicleExclusive: false,
  healthPeople: 0,
  healthDisability: false,
};
const zero: QuarterExtras = { withheld: 0, socialSecurity: 0, vatNotDeductible: 0 };

function draftOf(
  income: number[],
  extras: Partial<QuarterExtras>[],
  options: Partial<DraftInputs>,
  quarter: 1 | 2 | 3 | 4
) {
  const data: ManualData = {
    profile,
    quarters: [0, 1, 2, 3].map((i) => ({
      ...empty,
      income: { ...empty.income, r10: income[i] ?? 0 },
    })) as ManualData['quarters'],
  };
  const inputs: DraftInputs = {
    quarters: [0, 1, 2, 3].map((i) => ({ ...zero, ...extras[i] })) as DraftInputs['quarters'],
    hardToJustify: false,
    priorYearNet: null,
    exempt130: false,
    vatToOffset: 0,
    manual: data,
    prior: null,
    ...options,
  };
  return prepareDraft(2026, quarter, manualMovements(2026, data).movements, inputs);
}

const boxes = (draft: ReturnType<typeof draftOf>, ids: string[]) =>
  ids.map((id) => draft.irpf.boxes.find((b) => b.box === id)?.amount);

describe('Modelo 130 with the activity figures', () => {
  const extras = [{ depreciation: 500, subsidies: 1000, capitalSubsidies: 200, provisions: 300 }];

  it('adds grants to the income and depreciation and provisions to the expenses', () => {
    // 01 = 10,000 + 1,000 + 200 = 11,200; 02 = 500 + 300 = 800; 04 = 10,400 × 20 % = 2,080
    const d = draftOf([10000], extras, { modality: 'normal' }, 1);
    expect(boxes(d, ['01', '02', '03', '04', '07', '19'])).toEqual([
      11200, 800, 10400, 2080, 2080, 2080,
    ]);
  });

  it('gives no hard-to-justify expenses in the normal modality', () => {
    const d = draftOf([10000], extras, { modality: 'normal', hardToJustify: true }, 1);
    expect(boxes(d, ['02'])).toEqual([800]);
  });

  it('gives 5 % of the net income in the simplified modality', () => {
    // 5 % × (11,200 − 800) = 520 → 02 = 1,320; 04 = 9,880 × 20 % = 1,976
    const d = draftOf([10000], extras, { modality: 'simplified', hardToJustify: true }, 1);
    expect(boxes(d, ['02', '03', '04'])).toEqual([1320, 9880, 1976]);
  });

  it('counts grants and depreciation in the contribution estimate', () => {
    // (11,200 − 800) / 3 months × 0.93 = 3,224
    const d = draftOf([10000], extras, { modality: 'normal' }, 1);
    expect(d.reta.monthlyNet).toBe(3224);
  });
});

describe('Modelo 130, section II (farming, livestock, forestry and fishing)', () => {
  const income = [20000, 5000, 10000];
  const extras = [
    { subsidies: 3000, capitalSubsidies: 1000, compensations: 500, withheld: 150 },
    { withheld: 200 },
  ];

  it('is 2 % of the income of the quarter without capital grants, less its withholdings', () => {
    // 08 = 20,000 + 3,000 = 23,000 (the REAGP compensation is left out: NOT CONFIRMED); 09 = 460;
    // 11 = 460 − 150 = 310
    const d = draftOf(income, extras, { agrarian: true }, 1);
    expect(boxes(d, ['01', '07', '08', '09', '10', '11', '12', '19'])).toEqual([
      undefined,
      undefined,
      23000,
      460,
      150,
      310,
      310,
      310,
    ]);
  });

  it('takes each quarter alone: a negative section gives 0 and nothing is carried', () => {
    // Q2: 2 % × 5,000 = 100 − 200 = −100 → 12 = 0. Q3: 2 % × 10,000 = 200.
    expect(boxes(draftOf(income, extras, { agrarian: true }, 2), ['08', '11', '12', '19'])).toEqual(
      [5000, -100, 0, 0]
    );
    expect(boxes(draftOf(income, extras, { agrarian: true }, 3), ['08', '11', '19'])).toEqual([
      10000, 200, 200,
    ]);
  });
});
