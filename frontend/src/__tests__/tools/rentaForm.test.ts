import { daysInYear, emptyForm, unrentedOf } from '@modules/tools/domain/rentaForm';

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
