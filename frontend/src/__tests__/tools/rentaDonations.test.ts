import {
  DONATION_IDS,
  donationChoices,
  donationResult,
  type DonationInput,
} from '@modules/tools/domain/rentaDonations';
import { computeRenta } from '@modules/tools/domain/rentaCalc';
import { emptyForm, toInput } from '@modules/tools/domain/rentaForm';
import { deductionSavings, markedSaving } from '@modules/tools/domain/rentaSavings';
import { reviveForm } from '@modules/tools/application/rentaProgress';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';
import { workReductionOf } from '@modules/tools/domain/rentaWork';

const none: DonationInput = {
  general: 0,
  recurrent: 0,
  priority: 0,
  priorityRecurrent: 0,
  other: 0,
};
const BIG = 1_000_000;

describe('the deduction for what was given (Ley 49/2002 and LIRPF art. 68.3)', () => {
  it('gives the Manual’s example: an NGO and a recurrent priority foundation, 1,000 €', () => {
    // AEAT Manual práctico de Renta 2025, c16, «Ejemplo: deducción por donativos»: 250 × 80 % +
    // 750 × 40 % + 1,000 × 50 % = 1,000.
    const r = donationResult(
      { ...none, general: 1000, priority: 1000, priorityRecurrent: 1000 },
      BIG
    );
    expect(r.general + r.priority).toBe(1000);
    expect(r).toMatchObject({ general: 500, priority: 500, overLimit: 0 });
  });

  it('takes 45 % over 250 € for the same entity three years, the 250 € first on what is not', () => {
    expect(donationResult({ ...none, general: 300, recurrent: 300 }, BIG).general).toBe(222.5);
    // 200 not recurrent at 80 %, 50 recurrent at 80 % and 100 at 45 %.
    expect(donationResult({ ...none, general: 350, recurrent: 150 }, BIG).general).toBe(245);
    expect(donationResult({ ...none, general: 100, recurrent: 500 }, BIG).general).toBe(80);
  });

  it('holds the base to 10 % of the tax base (15 % for the priority activities)', () => {
    // LIRPF art. 69.1: base liquidable 5,000 → 500 € can count.
    const r = donationResult({ ...none, general: 800, priority: 600, other: 100 }, 5000);
    expect(r).toMatchObject({ general: 300, priority: 112.5, otherBase: 0, overLimit: 750 });
    expect(donationResult({ ...none, other: 100, general: -5 }, -1)).toMatchObject({
      otherBase: 0,
      overLimit: 100,
    });
    expect(donationResult({ ...none, other: 100 }, BIG).otherBase).toBe(100);
    expect(donationResult({ ...none, general: Number.NaN }, BIG).general).toBe(0);
  });

  it('turns them into the catalogue’s choices, none when nothing was given', () => {
    expect(donationChoices(undefined, BIG)).toBeNull();
    expect(donationChoices(none, BIG)).toBeNull();
    expect(donationChoices({ ...none, general: 100 }, BIG)).toEqual({
      [DONATION_IDS.general]: { on: true, amount: 80 },
      [DONATION_IDS.priority]: { on: false, amount: 0 },
      [DONATION_IDS.other]: { on: false, amount: 0 },
    });
  });
});

describe('the donations in the return', () => {
  const data = async () => ({
    state: rentaState,
    ccaa: await loadCcaa('madrid'),
    extras: rentaWorkExtras,
    property: rentaProperty,
    workReduction: workReductionOf(rentaState),
  });

  it('half of it lowers each quota, and the savings count them by kind', async () => {
    const form = {
      ...emptyForm('30000'),
      ccaaId: 'madrid',
      donations: {
        general: '300',
        recurrent: '',
        priority: '',
        priorityRecurrent: '',
        other: '100',
      },
    };
    const input = toInput(form, await data());
    const result = computeRenta(input);
    const without = computeRenta({ ...input, donations: undefined });
    // 250 × 80 % + 50 × 40 % = 220, and 10 % of 100 = 10.
    expect(Math.round((without.result - result.result) * 100) / 100).toBe(230);
    const savings = deductionSavings(input, rentaState.deductions, result);
    expect(savings[DONATION_IDS.general].saving).toBe(220);
    expect(savings[DONATION_IDS.other].saving).toBe(10);
    expect(markedSaving(input, result)).toBe(230);
  });

  it('are read back over empty ones', () => {
    expect(reviveForm({ donations: { general: '5', other: 3 } }).donations).toEqual({
      general: '5',
      recurrent: '',
      priority: '',
      priorityRecurrent: '',
      other: '',
    });
  });
});
