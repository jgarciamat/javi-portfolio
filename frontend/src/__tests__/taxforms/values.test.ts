import { computeRenta } from '@modules/tools/domain/rentaCalc';
import { emptyForm, toInput, type RentaForm } from '@modules/tools/domain/rentaForm';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';
import type { Result111, Result115 } from '@modules/finances/domain/withholdings';
import { autonomoDraft } from '@test-utils/fixtures';
import {
  RENTA_PENDING,
  form100,
  form130,
  form303,
  formWithholding,
  formatBox,
  kindOf,
  valuesOf,
} from '@modules/taxforms/domain/values';

describe('Writing a box as the form expects it', () => {
  it('always gives the cents and the thousands dot, also below 10,000', () => {
    expect(formatBox(1234.5, 'amount')).toBe('1.234,50');
    expect(formatBox(1234567.891, 'amount')).toBe('1.234.567,89');
    expect(formatBox(0, 'amount')).toBe('0,00');
    expect(formatBox(-17283.98, 'amount')).toBe('-17.283,98');
  });

  it('writes no minus sign for a negative that rounds to zero', () => {
    expect(formatBox(-0.001, 'amount')).toBe('0,00');
  });

  it('writes rates with cents and people as whole numbers', () => {
    expect(formatBox(21, 'percent')).toBe('21,00');
    expect(formatBox(2.6, 'count')).toBe('3');
  });

  it('knows which boxes count people or hold a rate', () => {
    expect(kindOf('111', '07')).toBe('count');
    expect(kindOf('115', '01')).toBe('count');
    expect(kindOf('303', '08')).toBe('percent');
    expect(kindOf('303', '65')).toBe('percent');
    expect(kindOf('130', '01')).toBe('amount');
    expect(kindOf('100', '0003')).toBe('amount');
  });

  it('keeps the first value of a box', () => {
    expect(
      valuesOf([
        { box: '01', label: 'a', amount: 1 },
        { box: '01', label: 'b', amount: 2 },
      ])
    ).toEqual({ '01': 1 });
  });
});

describe('The self-employed forms of a quarter', () => {
  it('takes every box of the 303 of the draft, with its quarter', () => {
    const form = form303(autonomoDraft({ quarter: 3 }));
    expect(form).toEqual({
      model: '303',
      year: 2026,
      period: '3T',
      values: { '07': 1000, '08': 21, '27': 220, '29': 42, '71': 178 },
      pending: [],
    });
  });

  it('adds the «información adicional» of the drafts that have it', () => {
    const draft = autonomoDraft();
    draft.vat = { ...draft.vat, info: [{ box: '59', label: 'Entregas UE', amount: 500 }] };
    expect(form303(draft).values['59']).toBe(500);
  });

  it('gives the 130 only when it is filed', () => {
    expect(form130(autonomoDraft())?.values).toEqual({ '04': 180 });
    const exempt = autonomoDraft();
    exempt.irpf = { ...exempt.irpf, required: false };
    expect(form130(exempt)).toBeNull();
  });

  it('gives the 111 and the 115 from the withholdings of the device', () => {
    const m115 = {
      boxes: [
        { box: '01', label: 'Número perceptores', amount: 1 },
        { box: '02', label: 'Base', amount: 3000 },
        { box: '03', label: 'Retenciones', amount: 570 },
      ],
    } as Result115;
    expect(formWithholding('115', m115, 2026, 2)).toEqual({
      model: '115',
      year: 2026,
      period: '2T',
      values: { '01': 1, '02': 3000, '03': 570 },
      pending: [],
    });
    const m111 = { boxes: [{ box: '28', label: 'Suma', amount: 150 }] } as Result111;
    expect(formWithholding('111', m111, 2026, 4).values).toEqual({ '28': 150 });
  });
});

/** A made-up return: pay, a rented flat, a pension plan, a child and a mother over 75. */
async function renta(patch: Partial<RentaForm>) {
  const form: RentaForm = { ...emptyForm('30000'), ccaaId: 'castilla-y-leon', ...patch };
  const input = toInput(form, {
    state: rentaState,
    ccaa: await loadCcaa('castilla-y-leon'),
    extras: rentaWorkExtras,
    property: rentaProperty,
    workReduction: workReductionOf(rentaState),
  });
  return { input, result: computeRenta(input) };
}

describe('The Renta (modelo 100)', () => {
  it('fills the boxes the planner works out and marks the rest of the main ones', async () => {
    const { input, result } = await renta({ socialSecurity: '1950', withheld: '4200' });
    const form = form100(result, input, 2025);
    expect(form.model).toBe('100');
    expect(form.period).toBeNull();
    expect(form.values['0003']).toBe(30000);
    expect(form.values['0013']).toBe(1950);
    expect(form.values['0609']).toBe(4200);
    // Rents, plan and family are not in this return: their boxes stay empty, not zero.
    for (const box of ['0156', '0492', '0513', '0515']) expect(form.values).not.toHaveProperty(box);
    expect(form.pending).toContain('0596');
    expect(form.pending.every((b) => RENTA_PENDING.includes(b) && !(b in form.values))).toBe(true);
  });

  it('adds the rents, the pension plan and the family minimums when there are', async () => {
    const { input, result } = await renta({
      rentalOn: true,
      rentalIncome: '6000',
      pension: '1500',
      children: [{ age: '8', disability: 0 }],
      ascendants: [{ over75: true, disability: 0 }],
    });
    const form = form100(result, input, 2025);
    expect(form.values['0156']).toBe(result.rentalNet);
    expect(form.values['0492']).toBe(result.pensionReduction);
    expect(form.values['0513']).toBeGreaterThan(0);
    expect(form.values['0515']).toBeGreaterThan(0);
  });
});
