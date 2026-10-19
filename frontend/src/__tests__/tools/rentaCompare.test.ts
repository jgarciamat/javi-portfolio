import { computeRenta } from '@modules/tools/domain/rentaCalc';
import {
  compareBoxes,
  disabilityMinimum,
  draftResult,
  ourBoxes,
  type CompareContext,
  type ComparedBox,
} from '@modules/tools/domain/rentaCompare';
import { emptyForm, toInput, type RentaForm } from '@modules/tools/domain/rentaForm';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';

/** A pensioner of 65 with a 33 % disability in Castilla y León, with a flat at her disposal. */
const PENSIONER: Partial<RentaForm> = {
  ccaaId: 'castilla-y-leon',
  age: '65',
  disability: 33,
  gross: '18379.04',
  socialSecurity: '1235.98',
  withheld: '1182.42',
  nonSalary: '1630.99',
  retired: true,
  unrented: [{ value: '2455.85', revised: false, months: '' }],
  choices: { 'estado-donativos-ley-49-2002': { on: true, amount: '36', units: '' } },
};

/** The boxes of the draft for that case, worked out by the Tax Agency. */
const DRAFT: Record<ComparedBox, number> = {
  '0003': 18379.04,
  '0013': 1235.98,
  '0019': 2000,
  '0022': 15143.06,
  '0023': 3292.64,
  '0025': 11850.42,
  '0435': 11899.54,
  '0500': 11899.54,
  '0511': 6700,
  '0517': 3000,
  '0519': 9700,
  '0545': 208.96,
  '0546': 197.96,
  '0414': 305.59,
  '0595': 65.33,
  '0609': 1182.42,
  '0610': -1117.09,
  '0670': -1117.09,
};

const run = async (patch: Partial<RentaForm>) => {
  const form = { ...emptyForm(''), ...PENSIONER, ...patch };
  const input = toInput(form, {
    state: rentaState,
    ccaa: await loadCcaa('castilla-y-leon'),
    extras: rentaWorkExtras,
    property: rentaProperty,
    workReduction: workReductionOf(rentaState),
  });
  return { input, result: computeRenta(input) };
};

const ctx = (over: Partial<CompareContext> = {}): CompareContext => ({
  disability: 33,
  retired: true,
  mobility: false,
  socialSecurityTyped: true,
  nonSalary: 1630.99,
  ...over,
});

const whyOf = (rows: ReturnType<typeof compareBoxes>, box: ComparedBox) =>
  rows.find((r) => r.box === box)?.why;

describe('comparing with the draft', () => {
  it('gives every box of the real draft to the cent', async () => {
    const { input, result } = await run({});
    const rows = compareBoxes(DRAFT, ourBoxes(result, input), ctx());
    expect(rows).toHaveLength(18);
    expect(rows.filter((r) => r.differs)).toEqual([]);
    expect(result.result).toBe(-1117.09);
  });

  it('explains the 3,500 € of a worker with a disability that the draft leaves out', async () => {
    const { input, result } = await run({ retired: false });
    // 2,000 + 3,500 of other expenses: 3,500 less of net income, and the rest follows.
    const rows = compareBoxes(DRAFT, ourBoxes(result, input), ctx({ retired: false }));
    expect(rows.find((r) => r.box === '0019')).toMatchObject({ ours: 5500, diff: 3500 });
    expect(whyOf(rows, '0019')).toEqual({ key: 'disabilityWorker' });
    expect(whyOf(rows, '0022')).toEqual({ key: 'carried', from: '0019' });
    expect(whyOf(rows, '0023')).toBeNull();
    expect(whyOf(rows, '0670')).toEqual({ key: 'carried', from: '0610' });
  });

  it('explains the 340 € deduction counted on pensions', async () => {
    const { input, result } = await run({ nonSalary: '' });
    const rows = compareBoxes(DRAFT, ourBoxes(result, input), ctx({ nonSalary: 0 }));
    // Without the pensions taken out it is 340 − 0.2 × (18,379.04 − 16,576) = −20.61: nothing.
    expect(rows.find((r) => r.box === '0414')).toMatchObject({ ours: 0, diff: -305.59 });
    expect(whyOf(rows, '0414')).toEqual({ key: 'lowPay' });
    const more = compareBoxes({ '0414': 0 }, ourBoxes(result, input), ctx({ nonSalary: 0 }));
    expect(more[0].why).toBeNull();
    const pensions = compareBoxes(
      { '0414': 0 },
      { ...ourBoxes(result, input), '0414': 340 },
      ctx({ nonSalary: 0 })
    );
    expect(pensions[0].why).toEqual({ key: 'lowPayPensions' });
  });

  it('only compares the boxes the draft has, and rounds what is under a euro', async () => {
    const { input, result } = await run({});
    const rows = compareBoxes(
      { '0545': 209.5, '0609': 1182, '9999': 1 },
      ourBoxes(result, input),
      ctx()
    );
    expect(rows.map((r) => [r.box, r.why])).toEqual([
      ['0545', { key: 'rounding' }],
      ['0609', { key: 'withheld' }],
    ]);
  });

  it('has a reason for every box that starts a difference', async () => {
    const { input, result } = await run({});
    const ours = ourBoxes(result, input);
    const reason = (box: ComparedBox, diff: number, over: Partial<CompareContext> = {}) =>
      compareBoxes({ [box]: ours[box] - diff }, ours, ctx(over))[0].why?.key;
    expect(reason('0003', 100)).toBe('gross');
    expect(reason('0013', 100)).toBe('socialSecurity');
    expect(reason('0013', 100, { socialSecurityTyped: false })).toBe('socialSecurityEstimated');
    expect(reason('0019', -3500)).toBe('disabilityRetired');
    expect(reason('0019', 2000, { disability: 0, mobility: true })).toBe('mobility');
    expect(reason('0019', 2000, { disability: 0 })).toBe('otherExpenses');
    expect(reason('0019', -2000, { disability: 0 })).toBe('otherExpenses');
    expect(reason('0022', 50)).toBe('workExpenses');
    expect(reason('0023', 50)).toBe('reduction');
    expect(reason('0025', 50)).toBe('generic');
    expect(reason('0435', 50)).toBe('otherIncome');
    expect(reason('0500', 50)).toBe('baseReductions');
    expect(reason('0511', 1150)).toBe('age');
    expect(reason('0517', 3000)).toBe('disabilityMinimum');
    expect(reason('0519', 2400)).toBe('familyMinimum');
    expect(reason('0546', 20)).toBe('regionalScale');
    expect(reason('0595', 36)).toBe('deductions');
    expect(reason('0670', 1200)).toBe('refundable');
  });

  it('adds the disabilities of the family to the minimum for disability', () => {
    const m = rentaState.minimums;
    expect(
      disabilityMinimum(
        {
          age: 40,
          disability: 0,
          children: [
            { age: 5, disability: 33 },
            { age: 30, disability: 0 },
          ],
          ascendants: [{ over75: true, disability: 65 }],
          sharedChildren: true,
        },
        m
      )
    ).toBe(3000 / 2 + 9000 + 3000);
  });

  it('takes the result of the draft from its last box', () => {
    expect(draftResult({ '0670': -10, '0610': -5 })).toBe(-10);
    expect(draftResult({ '0610': 5 })).toBe(5);
    expect(draftResult({})).toBeNull();
  });
});
