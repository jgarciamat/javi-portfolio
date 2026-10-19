import { computeRenta } from '@modules/tools/domain/rentaCalc';
import { emptyForm, toInput, type RentaForm } from '@modules/tools/domain/rentaForm';
import { optimize, type OptimizerData } from '@modules/tools/domain/rentaOptimizer';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaJoint } from '@modules/tools/data/renta/conjunta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';

let data: OptimizerData;
beforeAll(async () => {
  data = {
    state: rentaState,
    ccaa: await loadCcaa('castilla-y-leon'),
    extras: rentaWorkExtras,
    property: rentaProperty,
    workReduction: workReductionOf(rentaState),
    joint: rentaJoint,
  };
});

/** A made-up worker of Castilla y León, married to someone without income. */
const worker = (over: Partial<RentaForm> = {}): RentaForm => ({
  ...emptyForm('30000'),
  ccaaId: 'castilla-y-leon',
  age: '40',
  socialSecurity: '1900',
  withheld: '4000',
  joint: 'couple',
  partner: { ...emptyForm('').partner, gross: '0', socialSecurity: '0', age: '38' },
  ...over,
});

const none = { list: [], savings: {} };

describe('the reviewer of the return', () => {
  it('lists what could lower the tax, the highest saving first, each with its source', () => {
    const r = optimize(worker(), data, none);
    const ids = r.items.map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'pensionPlan',
        'spousePlan',
        'unionFees',
        'mobility',
        'disability',
        'ascendant',
        'joint',
      ])
    );
    const savings = r.items.map((i) => i.saving);
    expect(savings).toEqual([...savings].sort((a, b) => b - a));
    expect(r.items.every((i) => i.saving > 0 && i.source.startsWith('https://'))).toBe(true);
    expect(r.total).toBe(Math.round(savings.reduce((a, b) => a + b, 0) * 100) / 100);
    expect(r.missing).toEqual([]);
  });

  it('estimates each one with the engine: the result with it against the result without it', () => {
    const form = worker();
    const r = optimize(form, data, none);
    const plan = r.items.find((i) => i.id === 'pensionPlan');
    expect(plan).toMatchObject({ example: 1500, draftKnows: 'yes', patch: { pension: '1500' } });
    const without = computeRenta(toInput(form, data)).result;
    const withPlan = computeRenta(toInput({ ...form, pension: '1500' }, data)).result;
    expect(plan?.saving).toBeCloseTo(without - withPlan, 2);
    // A move for work: only the person knows it, the draft does not.
    expect(r.items.find((i) => i.id === 'mobility')).toMatchObject({
      draftKnows: 'no',
      example: null,
    });
  });

  it('leaves out what is already there or does not apply', () => {
    const r = optimize(
      worker({
        pension: '1500',
        joint: 'none',
        mobility: true,
        disability: 65,
        retired: true,
        nonSalary: '30000',
        ascendants: [{ over75: true, disability: 0 }],
      }),
      data,
      none
    );
    expect(r.items.map((i) => i.id)).toEqual([]);
    // A 33 % disability without the help of third people: the assistance is asked.
    const help = optimize(worker({ disability: 33 }), data, none);
    expect(help.items.map((i) => i.id)).toContain('assistance');
    expect(help.items.map((i) => i.id)).not.toContain('disability');
  });

  it('asks about the rent, the depreciation and earlier losses', () => {
    const r = optimize(
      worker({ rentalOn: true, rentalIncome: '9000', savings: '3000', joint: 'none' }),
      data,
      none
    );
    expect(r.items.find((i) => i.id === 'rentalReduction')?.patch).toEqual({
      rentalReduction: 'general-50',
    });
    expect(r.items.find((i) => i.id === 'rentalDepreciation')).toMatchObject({ example: 60000 });
    expect(r.items.find((i) => i.id === 'earlierLosses')).toMatchObject({
      example: 1000,
      patch: { savings: '2000' },
    });
    // With the savings in detail, the earlier losses are typed there.
    const detail = optimize(
      worker({
        joint: 'none',
        savingsDetail: {
          capital: { interest: 500, dividends: 0, assets: 0, insurance: 0, expenses: 0 },
          assets: [],
          properties: [],
          otherGains: [],
          generalGains: [],
          pending: { gains: [], capital: [], general: [] },
        },
      }),
      data,
      none
    );
    expect(detail.items.map((i) => i.id)).not.toContain('earlierLosses');
  });

  it('adds the deductions that could apply, and says what is missing', () => {
    const deduction = data.ccaa.deductions[0];
    const r = optimize(
      worker({ ccaaId: '', socialSecurity: '', withheld: '', age: '', joint: '' }),
      data,
      {
        list: [deduction, data.ccaa.deductions[1], data.ccaa.deductions[2]],
        savings: {
          [deduction.id]: { saving: 99999, blocked: false, example: 1000 },
          [data.ccaa.deductions[1].id]: { saving: 50, blocked: true, example: null },
        },
      }
    );
    expect(r.items[0]).toMatchObject({
      id: deduction.id,
      group: 'deductions',
      title: deduction.title,
      draftKnows: 'no',
    });
    expect(r.items.map((i) => i.id)).not.toContain(data.ccaa.deductions[1].id);
    expect(r.missing).toEqual(['ccaa', 'socialSecurity', 'withheld', 'age', 'jointKind']);
    const state = data.state.deductions.find(
      (d) => d.refundable
    ) as (typeof data.state.deductions)[number];
    const other = data.state.deductions.find(
      (d) => !d.refundable
    ) as (typeof data.state.deductions)[number];
    const s = optimize(worker(), data, {
      list: [state, other],
      savings: {
        [state.id]: { saving: 1, blocked: false, example: null },
        [other.id]: { saving: 1, blocked: false, example: null },
      },
    });
    expect(s.items.find((i) => i.id === state.id)?.draftKnows).toBe('yes');
    expect(s.items.find((i) => i.id === other.id)?.draftKnows).toBe('maybe');
  });

  it('shows the joint return only when it saves', () => {
    const two = optimize(
      worker({
        partner: { ...emptyForm('').partner, gross: '30000', socialSecurity: '1900', age: '38' },
      }),
      data,
      none
    );
    expect(two.items.map((i) => i.id)).not.toContain('joint');
    const single = optimize(
      worker({ joint: 'single', children: [{ age: '5', disability: 0 }] }),
      data,
      none
    );
    expect(single.items.map((i) => i.id)).toContain('joint');
    const noKids = optimize(worker({ joint: 'single' }), data, none);
    expect(noKids.items.map((i) => i.id)).not.toContain('joint');
  });
});
