import { computeRenta, type JointMember, type RentaInput } from '@modules/tools/domain/rentaCalc';
import { canFileJointly, compareJoint, partnerInput } from '@modules/tools/domain/rentaJoint';
import type { RentaCcaa } from '@modules/tools/domain/rentaData';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaJoint } from '@modules/tools/data/renta/conjunta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaState } from '@modules/tools/data/renta/state';
import { workReductionOf } from '@modules/tools/domain/rentaWork';

// Every figure below is worked out by hand with the State scale (9.5 / 12 / 15 / 18.5 %) and the
// scale of Castilla y León (9 / 12 / 14 / 18.5 %), which uses the State's minimums.
let cyl: RentaCcaa;
beforeAll(async () => {
  cyl = await loadCcaa('castilla-y-leon');
});

const input = (over: Partial<RentaInput> = {}): RentaInput => ({
  gross: 30000,
  socialSecurity: 1950,
  withheld: 4000,
  workExpensesExtra: 0,
  geographicMobility: false,
  pensionPlan: 0,
  pensionPlanEmployer: 0,
  spousePlan: 0,
  compensatoryPension: 0,
  rental: null,
  imputedValues: { standard: 0, revised: 0 },
  savings: 0,
  family: { age: 40, disability: 0, children: [], ascendants: [], sharedChildren: false },
  state: rentaState,
  ccaa: cyl,
  extras: rentaWorkExtras,
  imputationRates: { standard: 2, revised: 1.1 },
  choices: {},
  workReduction: workReductionOf(rentaState),
  ...over,
});

const spouse = (over: Partial<JointMember> = {}): JointMember => ({
  gross: 0,
  socialSecurity: 0,
  withheld: 0,
  age: 40,
  disability: 0,
  savings: 0,
  pensionPlan: 0,
  ...over,
});

const couple = (i: RentaInput, p: JointMember) =>
  compareJoint(i, 'couple', p, { livesWithOtherParent: false, rules: rentaJoint }) as NonNullable<
    ReturnType<typeof compareJoint>
  >;

describe('joint return of a couple', () => {
  it('wins with a single salary: the 3,400 € come off at the top rate', () => {
    // You: 30,000 - 1,950 - 2,000 = 26,050 of base. State 2,990.25 - 527.25 = 2,463;
    // Castilla y León 2,869.50 - 499.50 = 2,370; 4,833 - 4,000 withheld = 833 to pay.
    // Joint: 22,650 of base. State 2,480.25 - 527.25 = 1,953; CyL 2,393.50 - 499.50 = 1,894.
    const c = couple(input(), spouse());
    expect(c.you.result).toBe(833);
    expect(c.partner?.result).toBe(0);
    expect(c.individual).toBe(833);
    expect(c.joint.jointReduction).toBe(3400);
    expect(c.joint.taxBase).toBe(22650);
    expect(c.joint.stateQuota).toBe(1953);
    expect(c.joint.regionalQuota).toBe(1894);
    expect(c.joint.result).toBe(-153);
    expect(c.saving).toBe(986);
    expect(c.best).toBe('joint');
    // Only one of them earns: there is nothing to doubt about the 2,000 € or the 340 €.
    expect(c.oneGeneralExpense).toBeNull();
    expect(c.joint.lowPayLeftOut).toBe(false);
    expect(c.childrenToOne).toBeNull();
  });

  it('loses with two similar salaries: one scale for both pays more', () => {
    // Spouse: 28,000 - 1,820 - 2,000 = 24,180. State 2,709.75 - 527.25 = 2,182.50;
    // CyL 2,607.70 - 499.50 = 2,108.20; 4,290.70 - 3,500 = 790.70.
    // Joint: 50,230 - 3,400 = 46,830. State 6,514.30 - 527.25 = 5,987.05;
    // CyL 6,302.05 - 499.50 = 5,802.55; 11,789.60 - 7,500 = 4,289.60.
    const c = couple(input(), spouse({ gross: 28000, socialSecurity: 1820, withheld: 3500 }));
    expect(c.partner?.result).toBe(790.7);
    expect(c.individual).toBe(1623.7);
    expect(c.joint.netIncome).toBe(50230);
    expect(c.joint.otherExpenses).toBe(4000);
    expect(c.joint.withheld).toBe(7500);
    expect(c.joint.result).toBe(4289.6);
    expect(c.saving).toBe(-2665.9);
    expect(c.best).toBe('individual');
    // With a single 2,000 € for the unit, 2,000 more at 18.5 % + 18.5 %: 740 € worse.
    expect(c.oneGeneralExpense).toBe(5029.6);
    // Two earners: the 340 € is left out of the joint return (here neither had it).
    expect(c.joint.lowPayLeftOut).toBe(true);
    expect(c.lowPayLeftOut).toBe(0);
  });

  it('counts the age and disability of each spouse in one minimum, and loses the work reduction', () => {
    // You: 20,000 - 1,300 = 18,700; reduction 2,364.34 - 1.14 x 1,026.48 = 1,194.15;
    // base 15,505.85. State 1,549.45 - 527.25 = 1,022.20; CyL 1,487.20 - 499.50 = 987.70;
    // 2,009.90 - 1,500 = 509.90. Spouse: a pension of 12,000, 67, 33 %: base 2,698 under a
    // minimum of 9,700 (5,550 + 1,150 + 3,000): nothing to pay.
    // Joint: net 16,700 + 10,000, the reduction is measured on 30,700 (none); 26,700 - 3,400
    // = 23,300 with one minimum of 9,700. State 2,577.75 - 921.50 = 1,656.25;
    // CyL 2,484.50 - 873 = 1,611.50; 3,267.75 - 1,500 = 1,767.75.
    const c = couple(
      input({
        gross: 20000,
        socialSecurity: 1300,
        withheld: 1500,
        family: { ...input().family, age: 50 },
      }),
      spouse({ gross: 12000, nonSalaryIncome: 12000, retired: true, age: 67, disability: 33 })
    );
    expect(c.you.workReduction).toBe(1194.15);
    expect(c.you.result).toBe(509.9);
    expect(c.partner?.workReduction).toBe(7302);
    expect(c.partner?.result).toBe(0);
    expect(c.joint.minimum.total).toBe(9700);
    expect(c.joint.minimum.items).toEqual([
      { key: 'personal', amount: 5550 },
      { key: 'age', amount: 1150 },
      { key: 'disability', amount: 3000 },
    ]);
    expect(c.joint.workReduction).toBe(0);
    expect(c.joint.result).toBe(1767.75);
    expect(c.saving).toBe(-1257.85);
    // The pensioner is not an active worker: no extra expenses for the disability.
    expect(c.joint.otherExpenses).toBe(4000);
    expect(c.joint.lowPayLeftOut).toBe(false);
  });

  it('adds the age of both to one item and gives one extra for disability: the highest active one', () => {
    const r = computeRenta(
      input({
        family: { ...input().family, age: 70, disability: 33 },
        joint: {
          partner: spouse({ gross: 28000, socialSecurity: 1820, age: 80, disability: 65 }),
          reduction: 3400,
        },
      })
    );
    // 26,050 + 24,180 less a single 7,750 (the spouse's 65 %), not 3,500 + 7,750.
    expect(r.otherExpenses).toBe(2000 + 2000 + 7750);
    expect(r.netIncome).toBe(26050 + 24180 - 7750);
    // 1,150 for 70 years, 1,150 + 1,400 for 80; 3,000 for 33 % and 9,000 + 3,000 of assistance
    // for 65 % (LIRPF art. 60.3).
    expect(r.minimum.items).toEqual([
      { key: 'personal', amount: 5550 },
      { key: 'age', amount: 3700 },
      { key: 'disability', amount: 15000 },
    ]);
  });

  it('applies the pension plan limit of 30 % to each spouse on their own', () => {
    // The spouse's 30 % is 0.3 x 24,180 = 7,254; yours 0.3 x 26,050 = 7,815: 1,500 + 1,500.
    const r = computeRenta(
      input({
        pensionPlan: 1500,
        joint: {
          partner: spouse({ gross: 28000, socialSecurity: 1820, pensionPlan: 1500 }),
          reduction: 3400,
        },
      })
    );
    expect(r.pensionReduction).toBe(3000);
    // A spouse without pay cannot reduce anything: 30 % of nothing.
    const none = computeRenta(
      input({ joint: { partner: spouse({ pensionPlan: 1500 }), reduction: 3400 } })
    );
    expect(none.pensionReduction).toBe(0);
  });

  it('takes what is left of the reduction from the savings base, never below zero', () => {
    // No pay: the general base is 0 and the 3,400 € go to the 1,000 € of interest.
    const r = computeRenta(
      input({
        gross: 0,
        socialSecurity: 0,
        withheld: 0,
        savings: 600,
        joint: { partner: spouse({ savings: 400 }), reduction: 3400 },
      })
    );
    expect(r.taxBase).toBe(0);
    expect(r.savingsBase).toBe(0);
    expect(r.jointReduction).toBe(1000);
  });

  it('puts the whole minimum of the children in the joint return and shows them all with one parent', () => {
    // Individual: half of 2,400 + 2,700 each. You: minimum 8,100; State 2,990.25 - 769.50 =
    // 2,220.75; CyL 2,869.50 - 729 = 2,140.50; 4,361.25 - 4,000 = 361.25.
    // All with you: minimum 10,650, 3,889.50 - 4,000 = -110.50 (the spouse pays nothing).
    // Joint: 22,650 with 10,650. State 2,480.25 - 1,011.75 = 1,468.50; CyL 2,393.50 - 958.50
    // = 1,435; 2,903.50 - 4,000 = -1,096.50.
    const kids = [
      { age: 8, disability: 0 as const },
      { age: 5, disability: 0 as const },
    ];
    const c = couple(input({ family: { ...input().family, children: kids } }), spouse());
    expect(c.you.result).toBe(361.25);
    expect(c.childrenToOne).toEqual({ to: 'you', individual: -110.5 });
    expect(c.joint.minimum.total).toBe(10650);
    expect(c.joint.result).toBe(-1096.5);
    expect(c.saving).toBe(1457.75);
  });

  it('gives the children to the spouse when that is better', () => {
    const kids = [{ age: 8, disability: 0 as const }];
    const c = couple(
      input({
        gross: 0,
        socialSecurity: 0,
        withheld: 0,
        family: { ...input().family, children: kids },
      }),
      spouse({ gross: 30000, socialSecurity: 1950, withheld: 4000 })
    );
    expect(c.childrenToOne?.to).toBe('partner');
  });

  it('leaves out the 340 € when both earn, and says how much it was', () => {
    // You: 16,000 - 1,040 = 14,960; reduction 7,302 - 1.75 x 108 = 7,113; base 5,847.
    // State 555.47 - 527.25 = 28.22; CyL 526.23 - 499.50 = 26.73: the 340 € is held to 54.95.
    // Spouse: 15,000 - 975 = 14,025, reduction 7,302: base 4,723 under the minimum.
    const c = couple(
      input({ gross: 16000, socialSecurity: 1040, withheld: 0 }),
      spouse({ gross: 15000, socialSecurity: 975 })
    );
    expect(c.you.lowPay).toBe(54.95);
    expect(c.partner?.lowPay).toBe(0);
    expect(c.joint.lowPay).toBe(0);
    expect(c.lowPayLeftOut).toBe(54.95);
    // Joint: the reduction is measured on 28,985 of the two together: none.
    expect(c.joint.workReduction).toBe(0);
  });

  it('keeps the 340 € when only the spouse earns and the person has no other income', () => {
    const r = computeRenta(
      input({
        gross: 0,
        socialSecurity: 0,
        withheld: 0,
        joint: { partner: spouse({ gross: 16000, socialSecurity: 1040 }), reduction: 0 },
      })
    );
    // The same as the spouse's own return: 54.95 of the 340 € fit in the tax.
    expect(r.lowPay).toBe(54.95);
    expect(r.lowPayLeftOut).toBe(false);
  });

  it('measures the income limits of the deductions with their joint amount', () => {
    // Castilla y León: 18,900 individual and 31,500 joint, measured after the minimum. You:
    // 40,000 - 2,600 - 2,000 = 35,400 less 8,150 (5,550 + half of 2,400 + 2,800) = 27,250: over.
    // Joint: 32,000 less 10,750 (the whole minimum of the child) = 21,250: within.
    const birth = cyl.deductions.find((d) => d.incomeLimit?.joint === 31500) as { id: string };
    const choices = { [birth.id]: { on: true, units: 1, amount: 0 } };
    const kids = [{ age: 0, disability: 0 as const }];
    const c = couple(
      input({
        gross: 40000,
        socialSecurity: 2600,
        choices,
        family: { ...input().family, children: kids },
      }),
      spouse()
    );
    expect(c.you.blocked).toContain(birth.id);
    expect(c.joint.blocked).not.toContain(birth.id);
  });
});

describe('joint return of one parent', () => {
  const kids = [
    { age: 8, disability: 0 as const },
    { age: 5, disability: 0 as const },
  ];
  const single = (i: RentaInput, livesWithOtherParent = false) =>
    compareJoint(i, 'single', null, { livesWithOtherParent, rules: rentaJoint });

  it('takes 2,150 € off the base with the same minimum', () => {
    // 25,000 - 1,625 - 2,000 = 21,375 with 10,650 of minimum. State 2,289 - 1,011.75 = 1,277.25;
    // CyL 2,215 - 958.50 = 1,256.50; 2,533.75 - 3,000 = -466.25.
    // Joint: 19,225. State 1,995.75 - 1,011.75 = 984; CyL 1,933.50 - 958.50 = 975; -1,041.
    const c = single(
      input({
        gross: 25000,
        socialSecurity: 1625,
        withheld: 3000,
        family: { ...input().family, children: kids },
      })
    );
    expect(c?.partner).toBeNull();
    expect(c?.you.result).toBe(-466.25);
    expect(c?.joint.jointReduction).toBe(2150);
    expect(c?.joint.result).toBe(-1041);
    expect(c?.saving).toBe(574.75);
    expect(c?.best).toBe('joint');
    expect(c?.oneGeneralExpense).toBeNull();
    expect(c?.childrenToOne).toBeNull();
  });

  it('gives no reduction when the parent lives with the other parent: both come out the same', () => {
    const c = single(input({ family: { ...input().family, children: kids } }), true);
    expect(c?.joint.jointReduction).toBe(0);
    expect(c?.saving).toBe(0);
    expect(c?.best).toBe('same');
  });

  it('gives the parent of the joint return the whole minimum of a child with his own income', () => {
    // The 5-year-old has 3,000 € and files the joint return with this parent: in the individual
    // returns he counts for no one (8 is the first, 2,400 €); in the joint one, whole, as the second.
    const withIncome = [kids[0], { ...kids[1], income: 'ownReturn' as const }];
    const c = single(input({ family: { ...input().family, children: withIncome } }));
    expect(c?.you.minimum.total).toBe(5550 + 2400);
    expect(c?.joint.minimum.total).toBe(5550 + 2400 + 2700);
  });

  it('needs a minor child to make a family unit', () => {
    const adults = [{ age: 20, disability: 0 as const }];
    expect(single(input({ family: { ...input().family, children: adults } }))).toBeNull();
    expect(canFileJointly('single', adults, rentaJoint)).toBe(false);
    expect(canFileJointly('couple', [], rentaJoint)).toBe(true);
  });
});

describe('the spouse on their own', () => {
  it('files with their pay and half of the children, and none of the deductions of the person', () => {
    const p = partnerInput(
      input({ choices: { x: { on: true } }, savings: 500, pensionPlan: 900 }),
      spouse({ gross: 1000, savings: 50 }),
      [{ age: 3, disability: 0 }],
      true
    );
    expect(p).toMatchObject({
      gross: 1000,
      savings: 50,
      pensionPlan: 0,
      choices: {},
      joint: undefined,
    });
    expect(p.family).toEqual({
      age: 40,
      disability: 0,
      children: [{ age: 3, disability: 0 }],
      ascendants: [],
      sharedChildren: true,
    });
  });
});
