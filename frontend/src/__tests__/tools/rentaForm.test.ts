import {
  daysInYear,
  emptyForm,
  obligationIncome,
  rentalOf,
  unrentedOf,
} from '@modules/tools/domain/rentaForm';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';

const form = (unrented: ReturnType<typeof emptyForm>['unrented']) => ({
  ...emptyForm(''),
  unrented,
});

describe('properties at the owner’s disposal', () => {
  it('counts the days of the year they were available (case 20 of the bank)', () => {
    // LIRPF art. 85.1: in proportion to the days. 50,000 × 181/365 at 2 % = 495.89 (it was 6/12
    // months: 500.00).
    const values = unrentedOf(form([{ value: '50000', revised: false, days: '181' }]), 2025);
    expect(values).toEqual({ standard: (50000 * 181) / 365, revised: 0 });
    expect(Math.round(values.standard * 2) / 100).toBe(495.89);
  });

  it('takes the whole year when the days are empty, and keeps them inside the year', () => {
    const rows = [
      { value: '1000', revised: true, days: '' },
      { value: '1000', revised: true, days: '400' },
      { value: '1000', revised: false, days: '-3' },
    ];
    expect(unrentedOf(form(rows), 2025)).toEqual({ standard: 0, revised: 2000 });
    // A leap year has 366 days: 183 of them are half the year.
    expect(unrentedOf(form([{ value: '1000', revised: false, days: '183' }]), 2024)).toEqual({
      standard: 500,
      revised: 0,
    });
  });

  it('knows the leap years', () => {
    expect([2024, 2025, 2100, 2000].map(daysInYear)).toEqual([366, 365, 365, 366]);
  });
});

describe('interest and repairs of a rented property (LIRPF art. 23.1.a.1.º)', () => {
  const rented = (over: Partial<ReturnType<typeof emptyForm>>) => ({
    ...emptyForm(''),
    rentalOn: true,
    rentalIncome: '6000',
    rentalExpenses: { 'intereses-financiacion': '4200', 'reparacion-conservacion': '2500' },
    ...over,
  });

  it('holds them to the rent and keeps the rest for four years (case p2-46)', () => {
    // 4,200 + 2,500 = 6,700 against 6,000 of rent: 700 for the next years (box 0108).
    expect(rentalOf(rented({}), rentaProperty)).toMatchObject({
      expenses: 6000,
      pendingApplied: 0,
      excessCarry: 700,
    });
  });

  it('uses what was pending from earlier years first (boxes 0103-0104)', () => {
    const r = rentalOf(rented({ rentalPendingExcess: '1000' }), rentaProperty);
    expect(r).toMatchObject({ expenses: 6000, pendingApplied: 1000, excessCarry: 1700 });
    const small = rentalOf(
      rented({ rentalPendingExcess: '500', rentalExpenses: { 'intereses-financiacion': '1000' } }),
      rentaProperty
    );
    expect(small).toMatchObject({ expenses: 1500, pendingApplied: 500, excessCarry: 0 });
  });
});

describe('the obligation to file (LIRPF art. 96)', () => {
  it('splits the pay of the first payer and the others', () => {
    const f = { ...emptyForm('18000'), secondPayers: '2000' };
    expect(obligationIncome(f)).toEqual({ mainIncome: 16000, otherIncome: 2000 });
    expect(obligationIncome({ ...f, secondPayers: '90000' })).toEqual({
      mainIncome: 0,
      otherIncome: 18000,
    });
    expect(obligationIncome(emptyForm('100'))).toEqual({ mainIncome: 100, otherIncome: 0 });
  });
});

describe('the activities of the form', () => {
  it('go to the engine with the tables of the módulos of the year', async () => {
    const { toInput } = await import('@modules/tools/domain/rentaForm');
    const { rentaState } = await import('@modules/tools/data/renta/state');
    const { rentaWorkExtras } = await import('@modules/tools/data/renta/estado-extra');
    const { loadCcaa } = await import('@modules/tools/data/renta');
    const data = {
      state: rentaState,
      ccaa: await loadCcaa('madrid'),
      extras: rentaWorkExtras,
      property: rentaProperty,
      workReduction: () => 0,
    };
    const farm = {
      kind: 'agrarian' as const,
      name: 'Olivar',
      withheld: 0,
      payments: 0,
      data: {
        lines: [],
        assets: [],
        externalMeans: false,
        staffPercent: 0,
        forestPlan: false,
        young: false,
        extraordinary: 0,
      },
    };
    const input = toInput({ ...emptyForm(''), activities: [farm] }, data);
    expect(input.activities?.modules.length).toBe(70);
    expect(input.activities?.farm.length).toBeGreaterThan(0);
    expect(toInput({ ...emptyForm(''), activities: [] }, data).activities).toBeUndefined();
  });
});
