import { computeRenta, type RentaInput } from '@modules/tools/domain/rentaCalc';
import type { RentaCcaa } from '@modules/tools/domain/rentaData';
import { childrenEffect, isChildAid } from '@modules/tools/domain/rentaSavings';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaState } from '@modules/tools/data/renta/state';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { allYes } from '@modules/tools/domain/rentaRequirements';

// Worked out by hand with the State scale (9.5 / 12 %) and that of Castilla y León (9 / 12 %),
// which uses the State's minimums.
let cyl: RentaCcaa;
// The birth deduction with its questions answered «yes» (born this year, gives the minimum).
let birth: { on: true; units: number; checks: ReturnType<typeof allYes> };
beforeAll(async () => {
  cyl = await loadCcaa('castilla-y-leon');
  const d = cyl.deductions.find((x) => x.id === BIRTH);
  birth = { on: true, units: 1, checks: allYes(d?.checks) };
});

const BIRTH = 'castilla-y-leon-nacimiento-adopcion';
const baby = [{ age: 0, disability: 0 as const }];

const input = (over: Partial<RentaInput> = {}): RentaInput => ({
  gross: 20000,
  socialSecurity: 1300,
  withheld: 1500,
  workExpensesExtra: 0,
  geographicMobility: false,
  pensionPlan: 0,
  pensionPlanEmployer: 0,
  spousePlan: 0,
  compensatoryPension: 0,
  rental: null,
  imputedValues: { standard: 0, revised: 0 },
  savings: 0,
  family: { age: 40, disability: 0, children: baby, ascendants: [], sharedChildren: false },
  state: rentaState,
  ccaa: cyl,
  extras: rentaWorkExtras,
  imputationRates: { standard: 2, revised: 1.1 },
  choices: { [BIRTH]: birth },
  workReduction: workReductionOf(rentaState),
  ...over,
});

describe('what the children change in the result, all together', () => {
  it('counts only the regional tax that is left when the birth deduction is bigger', () => {
    // 20,000 - 1,300 - 2,000 = 16,700; reduction 2,364.34 - 1.14 x 1,026.48 = 1,194.15; base
    // 15,505.85. Scale on it: State 1,549.45, CyL 1,487.20. Minimum 5,550 + 2,400 + 2,800 (under
    // three) = 10,750: State 1,021.25, CyL 967.50. Tax: State 528.20; CyL 519.70, and the 1,010 €
    // for the birth leave it at 0 (art. 77.2). 528.20 - 1,500 = -971.80.
    // Without the child: minimum 5,550; 1,022.20 + 987.70 - 1,500 = 509.90 to pay.
    const i = input();
    const r = computeRenta(i);
    expect(r.regionalQuota).toBe(519.7);
    expect(r.stateQuota).toBe(528.2);
    expect(r.result).toBe(-971.8);
    expect(computeRenta(input({ family: { ...i.family, children: [] }, choices: {} })).result).toBe(
      509.9
    );
    // Added up line by line it would be 962 (minimum: 494 + 468) + 1,010 = 1,972.
    expect(r.minimumSavings.descendants).toBe(962);
    expect(r.lines.find((l) => l.id === BIRTH)?.amount).toBe(1010);
    // Together: 509.90 + 971.80 = 1,481.70 (962 + the 519.70 of regional tax left).
    expect(childrenEffect(i, r)).toBe(1481.7);
  });

  it('is the sum when the tax is enough for everything', () => {
    // 40,000 - 2,600 - 2,000 = 35,400 of base: the 1,010 € fit in the regional tax.
    const i = input({ gross: 40000, socialSecurity: 2600, withheld: 6000 });
    const r = computeRenta(i);
    expect(childrenEffect(i, r)).toBe(r.minimumSavings.descendants + 1010);
  });

  it('leaves out a deduction for children marked but not given, and never goes below 0', () => {
    const i = input({
      choices: { [BIRTH]: birth, 'x-guarderia': { on: true }, 'x-alquiler': { on: false } },
    });
    expect(childrenEffect(i, computeRenta(i))).toBe(1481.7);
    // Compared with a result that is already worse, the effect is 0, not negative.
    expect(childrenEffect(i, { ...computeRenta(i), result: 9999 })).toBe(0);
  });

  it('tells the deductions for children by their id or title', () => {
    expect(isChildAid({ id: BIRTH, title: '' })).toBe(true);
    expect(isChildAid({ id: 'x', title: 'Por cuidado de hijos menores' })).toBe(true);
    expect(isChildAid({ id: 'x', title: 'Por alquiler de vivienda' })).toBe(false);
  });
});
