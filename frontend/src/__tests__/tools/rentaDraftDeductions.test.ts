import { loadCcaa } from '@modules/tools/data/renta';
import { rentaState } from '@modules/tools/data/renta/state';
import type { Deduction } from '@modules/tools/domain/rentaData';
import { stateApplied } from '@modules/tools/domain/rentaDraft';
import { applyReading, givenFor, withDraftDeductions } from '@modules/tools/domain/rentaDraftApply';
import { emptyForm } from '@modules/tools/domain/rentaForm';
import type { XmlDraftReading } from '@modules/tools/domain/rentaDraftXml';
import { draftDeductionIds, draftGaps, matchApplied } from '@modules/tools/domain/rentaDraftGaps';

let all: Deduction[];
beforeAll(async () => {
  all = [...rentaState.deductions, ...(await loadCcaa('comunitat-valenciana')).deductions];
});

const HEALTH = 'Por cantidades satisfechas en determinados gastos de salud.';

describe('the deductions a draft already applies', () => {
  it('reads the State ones by their boxes, both halves added up', () => {
    expect(stateApplied({ '0552': 40, '0553': 40, '0562': 0 })).toEqual([
      {
        label: 'Por donativos y otras aportaciones',
        amount: 80,
        box: '0552',
        id: 'estado-donativos-ley-49-2002',
      },
    ]);
    // A text with only the State half: the regional one is the same.
    expect(stateApplied({ '0547': 100.5 })[0]).toMatchObject({ amount: 201 });
    expect(stateApplied({ '0549': 30 })[0]).toMatchObject({ amount: 30, box: '0549' });
    expect(stateApplied({})).toEqual([]);
  });

  it('finds the deduction by its id, its bases, its words or its group', () => {
    const byId = matchApplied({ label: 'x', amount: 80, id: 'estado-donativos-ley-49-2002' }, all);
    expect(byId).toEqual([
      expect.objectContaining({ amount: 80, choice: { on: true, amount: '80', units: '' } }),
    ]);
    // What was spent, from the Agency's file: dentist 300 € (30 % = 90 €) and glasses 100 € (30 €).
    const bases = matchApplied(
      {
        label: HEALTH,
        amount: 120,
        bases: {
          'comunitat-valenciana-salud-bucodental': 300,
          'comunitat-valenciana-salud-optica': 100,
          'no-existe': 5,
        },
      },
      all
    );
    expect(bases.map((m) => [m.deduction.id, m.amount, m.choice.amount])).toEqual([
      ['comunitat-valenciana-salud-bucodental', 90, '300'],
      ['comunitat-valenciana-salud-optica', 30, '100'],
    ]);
    // Bases that do not give the draft's amount: the amount counts, spread over the group.
    const spreadOut = matchApplied(
      { label: HEALTH, amount: 200, bases: { 'comunitat-valenciana-salud-bucodental': 10 } },
      all
    );
    expect(spreadOut.map((m) => [m.deduction.id, m.amount, m.choice.amount])).toEqual([
      ['comunitat-valenciana-salud-bucodental', 150, '500'],
      ['comunitat-valenciana-salud-mental', 50, String(Math.round((50 * 100 * 100) / 30) / 100)],
    ]);
    const words = matchApplied(
      {
        label:
          'Por cantidades satisfechas en gastos asociados a la práctica del deporte y actividades saludables',
        amount: 45,
      },
      all
    );
    expect(words.map((m) => m.choice.amount)).toEqual(['150']);
    expect(matchApplied({ label: 'Por algo que no está en el catálogo', amount: 9 }, all)).toEqual(
      []
    );
  });

  it('spreads a grouped amount up to each maximum, the rest in the last one', () => {
    const parts = matchApplied({ label: HEALTH, amount: 700, box: '1959' }, all);
    expect(parts.map((m) => [m.deduction.id, m.amount])).toEqual([
      ['comunitat-valenciana-salud-bucodental', 150],
      ['comunitat-valenciana-salud-mental', 150],
      ['comunitat-valenciana-salud-optica', 100],
      ['comunitat-valenciana-salud-cronicas-raras', 100],
      ['comunitat-valenciana-salud-dano-cerebral-alzheimer', 200],
    ]);
    // A deduction of the group without a maximum takes the whole rest.
    const open = {
      ...all.find((d) => d.id === 'comunitat-valenciana-salud-bucodental')!,
      limit: undefined,
    };
    expect(
      matchApplied({ label: HEALTH, amount: 700 }, [
        open,
        all.find((d) => d.id === 'comunitat-valenciana-salud-mental')!,
      ]).map((m) => m.amount)
    ).toEqual([700]);
    // Without the community's catalogue, nothing to spread over.
    expect(matchApplied({ label: HEALTH, amount: 90 }, rentaState.deductions)).toEqual([]);
  });

  it('lists the ids already in the draft, and the ones still to mark', () => {
    const applied = [
      { label: HEALTH, amount: 90, box: '1959' },
      { label: 'Por algo desconocido del todo', amount: 5 },
    ];
    expect(draftDeductionIds([...applied, applied[0]], all)).toEqual([
      'comunitat-valenciana-salud-bucodental',
    ]);
    const split = [{ label: HEALTH, amount: 200 }];
    expect(draftGaps(split, all, {}).map((g) => g.label)).toEqual([
      `${HEALTH} (Dentista y salud bucodental)`,
      `${HEALTH} (Salud mental)`,
    ]);
    const gaps = draftGaps(applied, all, {
      'comunitat-valenciana-salud-bucodental': { on: true, amount: '1', units: '' },
    });
    expect(gaps).toEqual([
      { label: 'Por algo desconocido del todo', amount: 5, deduction: null, choice: null },
    ]);
  });

  it('marks them in the planner, keeping what the person marked', () => {
    const own = { 'comunitat-valenciana-practica-deporte': { on: true, amount: '20', units: '' } };
    const { choices, marked } = withDraftDeductions(
      { choices: own },
      [
        { label: HEALTH, amount: 90 },
        {
          label:
            'Por cantidades satisfechas en gastos asociados a la práctica del deporte y actividades saludables',
          amount: 45,
        },
      ],
      all
    );
    expect(marked).toEqual(['comunitat-valenciana-salud-bucodental']);
    expect(choices).toEqual({
      ...own,
      'comunitat-valenciana-salud-bucodental': expect.objectContaining({
        on: true,
        amount: '300',
        units: '',
      }),
    });
  });
});

describe('the spouse of a joint file', () => {
  it('keeps what the form had where the file says nothing', () => {
    const form = emptyForm('');
    const reading = {
      ...({} as XmlDraftReading),
      ccaaId: null,
      gross: null,
      socialSecurity: null,
      withheld: null,
      pension: null,
      rentalIncome: null,
      savings: null,
      age: null,
      disability: null,
      childAges: [],
      ascendantAges: [],
      unrented: [],
      partner: {
        gross: 1,
        socialSecurity: null,
        withheld: null,
        pension: null,
        age: null,
        disability: null,
      },
    };
    expect(applyReading(form, reading).partner).toEqual({ ...form.partner, gross: '1' });
  });
});

describe('the donations of a draft', () => {
  it('go to what was given: 80 % of the first 250 €, 40 % of the rest', () => {
    expect(givenFor(36)).toBe(45);
    expect(givenFor(200)).toBe(250);
    expect(givenFor(240)).toBe(350);
    const line = [{ label: 'x', amount: 36, id: 'estado-donativos-ley-49-2002', box: '0552' }];
    expect(withDraftDeductions({ choices: {} }, line, all)).toEqual({
      choices: {},
      donations: expect.objectContaining({ general: '45', recurrent: '' }),
      marked: ['estado-donativos-ley-49-2002'],
    });
    // What the person typed is kept.
    const typed = { general: '100', recurrent: '', priority: '', priorityRecurrent: '', other: '' };
    expect(withDraftDeductions({ choices: {}, donations: typed }, line, all)).toEqual({
      choices: {},
      marked: [],
    });
    const blank = { ...typed, general: ' ' };
    expect(
      withDraftDeductions({ choices: {}, donations: blank }, line, all).donations
    ).toBeDefined();
  });
});
