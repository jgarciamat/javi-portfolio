/**
 * The rules of the Renta by tax year (data/renta/ejercicios). The figures of each year come from its
 * source: the Manual práctico de Renta 2024 (AEAT, checked 22-10-2026), the BOE (Ley 35/2006, versions
 * of each article) or a hand calculation with the rule in view.
 */
import {
  applyScale,
  computeRenta,
  deductionAmount,
  generalQuota,
  incomeFactor,
  lowPayDeduction,
  LOW_PAY_2025,
} from '@modules/tools/domain/rentaCalc';
import type { Deduction } from '@modules/tools/domain/rentaData';
import { emptyForm, toInput } from '@modules/tools/domain/rentaForm';
import { blockersOf, hasRegion, type ReturnNeeds } from '@modules/tools/domain/rentaRules';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import {
  DEFAULT_RENTA_YEAR,
  hasRules,
  loadCcaaFor,
  openingYear,
  ownSnapshot,
  RENTA_YEARS,
  rentaRules,
  yearsUpTo,
} from '@modules/tools/data/renta/ejercicios';
import { LOW_PAY_2026 } from '@modules/tools/data/renta/ejercicios/2026';
import { patched, withManualOf } from '@modules/tools/data/renta/ejercicios/shared';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaJoint } from '@modules/tools/data/renta/conjunta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const find = (year: number, id: string) =>
  rentaRules(year).state.deductions.find((d) => d.id === id) as Deduction;

describe('the years with rules', () => {
  it('are 2024, 2025 and 2026; another year is an error, not the last one', () => {
    expect(RENTA_YEARS).toEqual([2024, 2025, 2026]);
    expect(DEFAULT_RENTA_YEAR).toBe(2025);
    expect(hasRules(2023)).toBe(false);
    expect(() => rentaRules(2027)).toThrow('No Renta rules for 2027');
  });

  it.each(RENTA_YEARS)('%i says its year everywhere and cites its sources with a date', (year) => {
    const r = rentaRules(year);
    expect([r.year, r.state.year, r.joint.year]).toEqual([year, year, year]);
    expect(r.sources.length).toBeGreaterThan(0);
    for (const s of r.sources) {
      expect(s.url).toMatch(/^https:\/\/(www\.boe\.es|sede\.agenciatributaria\.gob\.es)\//);
      expect(s.checkedOn).toMatch(ISO);
      expect(s.what.length).toBeGreaterThan(10);
    }
  });

  it('2025 is the data checked against its manual, the same objects as before', () => {
    const r = rentaRules(2025);
    expect(r.status).toBe('confirmed');
    expect(r.state).toBe(rentaState);
    expect(r.extras).toBe(rentaWorkExtras);
    expect(r.property).toBe(rentaProperty);
    expect(r.joint).toBe(rentaJoint);
    expect(r.regions).toBe('all');
    expect(r.missing).toEqual([]);
    expect(rentaState.lowPay).toBe(LOW_PAY_2025);
  });

  it('2024 links to its own manual; 2026, with no manual yet, is provisional', () => {
    const json = JSON.stringify(rentaRules(2024));
    expect(json).not.toContain('irpf-2025');
    expect(json).toContain('irpf-2024');
    expect(rentaRules(2024).status).toBe('confirmed');
    expect(rentaRules(2026).status).toBe('provisional');
    expect(rentaRules(2026).missing).toContain('manual');
  });
});

describe('what is the same in the three years (BOE: articles not changed since)', () => {
  it.each([2024, 2026])(
    '%i has the scales, minimums, art. 19 and 20 and joint figures of 2025',
    (y) => {
      const r = rentaRules(y);
      const base = rentaRules(2025);
      expect(r.state.scale).toEqual(base.state.scale);
      expect(r.state.defaultRegionalScale).toEqual(base.state.defaultRegionalScale);
      expect(r.state.minimums).toEqual(base.state.minimums);
      expect(r.state.workExpenses).toEqual(base.state.workExpenses);
      expect(r.state.workReduction).toEqual(base.state.workReduction);
      expect(r.state.baseReductions).toEqual(base.state.baseReductions);
      expect(r.property.imputation.standardRate).toBe(2);
      expect(r.property.imputation.revisedRate).toBe(1.1);
      expect([r.joint.coupleReduction, r.joint.singleParentReduction]).toEqual([3400, 2150]);
    }
  );

  it('only 2026 has a new State deduction (DA 62.ª); the others are the same ones', () => {
    const ids = (y: number) => rentaRules(y).state.deductions.map((d) => d.id);
    expect(ids(2024)).toEqual(ids(2025));
    expect(ids(2026).filter((id) => !ids(2025).includes(id))).toEqual([
      'estado-autoconsumo-renovable',
      'estado-autoconsumo-renovable-edificio',
    ]);
  });
});

describe('Renta 2024', () => {
  it('Manual práctico de Renta 2024, c15, example of Aragón: State quota 2,140.50 + 266 = 2,406.50', () => {
    const r = rentaRules(2024);
    const general = generalQuota(r.state.scale, 23900, r.state.minimums.personal);
    const savings = applyScale(r.extras.savingsScale.state, 2800);
    expect(general).toBe(2140.5);
    expect(savings).toBe(266);
    expect(general + savings).toBe(2406.5);
  });

  it('Manual 2024, c16, rent of before 2015: 6,900 € paid with a base of 22,100 € gives 284.93', () => {
    const d = find(2024, 'estado-alquiler-transitorio');
    expect(deductionAmount(d, { on: true, amount: 6900 }, incomeFactor(d, 22100))).toBe(284.93);
  });

  it('savings over 300,000 €: 14 % each half in 2024 (28 %), 15 % in 2025 (30 %)', () => {
    // Art. 66.1 table: 35,940 € up to 300,000 €, then the rate of the last bracket.
    expect(applyScale(rentaRules(2024).extras.savingsScale.state, 400000)).toBe(35940 + 14000);
    expect(applyScale(rentaRules(2025).extras.savingsScale.state, 400000)).toBe(35940 + 15000);
    expect(rentaRules(2024).extras.savingsScale.regional).toEqual(
      rentaRules(2024).extras.savingsScale.state
    );
  });

  it('has no deduction for low pay (DA 61.ª starts in 2025) and says nothing of it', () => {
    expect(rentaRules(2024).state.lowPay).toBeNull();
    expect(rentaRules(2024).extras.notes.join(' ')).not.toContain('340');
    expect(rentaRules(2024).extras.notes.join(' ')).toContain('no se puede empezar en 2024');
  });

  it('a pay of 16,000 € in Ceuta: 68.98 € of tax in 2024; the 340 € of 2025 take it to 0', async () => {
    // Net 16,000 − 1,016 = 14,984; art. 20: 7,302 − 1.75 × 132 = 7,071; 14,984 − 2,000 − 7,071 = 5,913.
    // Each half: 5,913 × 9.5 % = 561.74 minus 5,550 × 9.5 % = 527.25 → 34.49; both 68.98.
    const form = { ...emptyForm('16000'), socialSecurity: '1016', ccaaId: 'ceuta' };
    const net = async (year: number) => {
      const r = rentaRules(year);
      const input = toInput(form, {
        state: r.state,
        ccaa: (await loadCcaaFor(year, 'ceuta')) as NonNullable<
          Awaited<ReturnType<typeof loadCcaaFor>>
        >,
        extras: r.extras,
        property: r.property,
        workReduction: workReductionOf(r.state),
        activityTables: r.activityTables,
      });
      return computeRenta(input);
    };
    const y2024 = await net(2024);
    expect(y2024.netQuota).toBe(68.98);
    expect(y2024.lowPay).toBe(0);
    const y2025 = await net(2025);
    expect(y2025.lowPay).toBe(68.98);
    expect(y2025.netQuota).toBe(0);
  });

  it('a joint return of 2024 leaves nothing of a deduction the year does not have', async () => {
    const r = rentaRules(2024);
    const input = toInput(emptyForm('15000'), {
      state: r.state,
      ccaa: await loadCcaa('ceuta'),
      extras: r.extras,
      property: r.property,
      workReduction: workReductionOf(r.state),
    });
    const partner = {
      gross: 9000,
      socialSecurity: 0,
      withheld: 0,
      age: 40,
      disability: 0 as const,
      savings: 0,
      pensionPlan: 0,
    };
    const joint = computeRenta({ ...input, joint: { partner, reduction: 3400 } });
    expect(joint.lowPayLeftOut).toBe(false);
    expect(joint.lowPay).toBe(0);
  });

  it('the dates of the energy works and the electric car are those of 2024', () => {
    expect(find(2024, 'estado-eficiencia-calefaccion-refrigeracion').requirements).toContain(
      '31-12-2024'
    );
    expect(find(2024, 'estado-vehiculo-electrico').requirements).toContain('31-12-2024');
    expect(find(2024, 'estado-la-palma').summary).toContain('Real Decreto-ley 4/2024');
    expect(rentaRules(2024).property.imputation.requirements).toContain('IBI 2024');
  });
});

describe('Renta 2026 (BOE only)', () => {
  it('DA 61.ª (RDL 5/2026): 590.89 € up to 17,094 €, then − 0.2 per euro, nothing at 20,048.45 €', () => {
    expect(rentaRules(2026).state.lowPay).toBe(LOW_PAY_2026);
    expect(lowPayDeduction(17094, 0, LOW_PAY_2026)).toBe(590.89);
    // 590.89 − 0.2 × (18,000 − 17,094) = 590.89 − 181.20.
    expect(lowPayDeduction(18000, 0, LOW_PAY_2026)).toBe(409.69);
    expect(lowPayDeduction(20048.45, 0, LOW_PAY_2026)).toBe(0);
    expect(lowPayDeduction(17000, 6500.01, LOW_PAY_2026)).toBe(0);
    // The same pay in 2025: over 18,276 € there is none.
    expect(lowPayDeduction(18500, 0)).toBe(0);
  });

  it('DA 62.ª: 10 % of up to 5,000 € in your property, 20 % in the building', () => {
    const own = find(2026, 'estado-autoconsumo-renovable');
    const building = find(2026, 'estado-autoconsumo-renovable-edificio');
    expect(deductionAmount(own, { on: true, amount: 6000 })).toBe(500);
    expect(deductionAmount(building, { on: true, amount: 3000 })).toBe(600);
    // DA 62.ª.6: off the State quota only.
    expect(own.regionalShare).toBeUndefined();
  });

  it('extends the energy works, the electric car and La Palma to 2026 (RDL 7/2026 and 23/2026)', () => {
    expect(find(2026, 'estado-eficiencia-energia-primaria').requirements).toContain('31-12-2026');
    expect(find(2026, 'estado-eficiencia-rehabilitacion-edificios').requirements).toContain(
      '31-12-2027'
    );
    expect(find(2026, 'estado-punto-recarga').requirements).toContain('31-12-2026');
    expect(find(2026, 'estado-la-palma').summary).toContain('Real Decreto-ley 23/2026');
    expect(rentaRules(2026).extras.notes.join(' ')).toContain('590,89');
    expect(rentaRules(2026).extras.notes.join(' ')).not.toContain('340 euros');
  });

  it('the rented homes and the imputed income of 2026 wait for the RDL 29/2026', () => {
    expect(rentaRules(2026).missing).toEqual(
      expect.arrayContaining(['rentals', 'imputation', 'regions'])
    );
    expect(rentaRules(2026).sources.some((s) => s.what.includes('29/2026'))).toBe(true);
    // The módulos of 2026 are those of 2025 (Orden HAC/1425/2025).
    expect(rentaRules(2026).activityTables).toEqual(rentaRules(2025).activityTables);
  });
});

describe('the tables of the módulos of the year', () => {
  const activity = {
    kind: 'given' as const,
    name: 'A',
    withheld: 0,
    payments: 0,
    data: { area: 'direct' as const, net: 1 },
  };
  const inputOf = (year: number, tables?: null) => {
    const r = rentaRules(year);
    const data = {
      state: r.state,
      ccaa: { id: '', name: '', regime: 'common' as const, deductions: [], source: '' },
      extras: r.extras,
      property: r.property,
      workReduction: workReductionOf(r.state),
    };
    const form = { ...emptyForm(''), activities: [activity] };
    return toInput(form, tables === undefined ? data : { ...data, activityTables: tables });
  };

  it('are those of 2025 unless the year says otherwise; a year without them gives none', () => {
    expect(inputOf(2025)?.activities?.modules).toBe(rentaRules(2025).activityTables?.modules);
    expect(inputOf(2024, null).activities).toEqual({ list: [activity], modules: [], farm: [] });
  });
});

describe('what each year has of the communities', () => {
  it('2025 and 2024 have them all; 2026 only Ceuta, Melilla and the foral ones', async () => {
    expect(hasRegion(rentaRules(2025), 'madrid')).toBe(true);
    expect(hasRegion(rentaRules(2024), 'madrid')).toBe(true);
    expect(hasRegion(rentaRules(2026), 'madrid')).toBe(false);
    expect(hasRegion(rentaRules(2026), 'ceuta')).toBe(true);
    expect(hasRegion(rentaRules(2026), '')).toBe(true);
    await expect(loadCcaaFor(2026, 'madrid')).resolves.toBeNull();
    expect((await loadCcaaFor(2024, 'madrid'))?.source).toContain('irpf-2024');
    const ceuta2024 = await loadCcaaFor(2024, 'ceuta');
    expect(ceuta2024?.source).toContain('irpf-2024');
    const ceuta2026 = await loadCcaaFor(2026, 'ceuta');
    expect(ceuta2026?.source).toContain('irpf-2025');
    expect((await loadCcaaFor(2025, 'madrid'))?.id).toBe('madrid');
  });

  const none: ReturnNeeds = { ccaaId: 'ceuta', rents: false, imputes: false, objective: false };
  it('what a return needs and the year does not have keeps the result back', () => {
    expect(blockersOf(rentaRules(2025), { ...none, ccaaId: 'madrid', rents: true })).toEqual([]);
    expect(blockersOf(rentaRules(2024), none)).toEqual([]);
    expect(blockersOf(rentaRules(2024), { ...none, ccaaId: 'madrid', objective: true })).toEqual([
      'modules',
    ]);
    expect(blockersOf(rentaRules(2026), { ...none, ccaaId: 'madrid' })).toEqual(['regions']);
    // 2024 has the rented homes and imputations of the manual; 2026 does not yet.
    expect(blockersOf(rentaRules(2024), { ...none, rents: true, imputes: true })).toEqual([]);
    expect(blockersOf(rentaRules(2026), { ...none, rents: true, imputes: true })).toEqual([
      'rentals',
      'imputation',
    ]);
  });
});

describe('helpers to build a year', () => {
  it('changes the links to the manual of the other year and nothing else', () => {
    const data = {
      a: 'https://x/manuales-videos-folletos/manuales-practicos/irpf-2025/c16.html',
      b: ['https://x/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/3.html', 2025],
      c: { d: 'Renta 2025', e: null },
    };
    expect(withManualOf(data, 2025, 2024)).toEqual({
      a: 'https://x/manuales-videos-folletos/manuales-practicos/irpf-2024/c16.html',
      b: ['https://x/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2024/3.html', 2025],
      c: { d: 'Renta 2025', e: null },
    });
  });

  it('a change for an id that is not there is an error', () => {
    const list = [{ id: 'a', n: 1 }];
    expect(patched(list, { a: { n: 2 } })).toEqual([{ id: 'a', n: 2 }]);
    expect(() => patched(list, { b: { n: 2 } })).toThrow('Unknown ids: b');
  });
});

describe('the year a Renta opens on', () => {
  it('offers the years with rules up to the running one, the newest first', () => {
    expect(yearsUpTo(2026)).toEqual([2026, 2025, 2024]);
    expect(yearsUpTo(2030)).toEqual([2026, 2025, 2024]);
    expect(yearsUpTo(2024)).toEqual([2024]);
    expect(yearsUpTo(2023)).toEqual([]);
  });

  it('opens on what was left half done, else last year, else the newest with rules', () => {
    expect(openingYear(2026, 2024)).toBe(2024);
    expect(openingYear(2026)).toBe(2025);
    expect(openingYear(2026, 2019)).toBe(2025);
    expect(openingYear(2024)).toBe(2024);
    expect(openingYear(2023)).toBe(DEFAULT_RENTA_YEAR);
  });

  it('shows a saved result only in its year; one saved without a year is of 2025', () => {
    expect(ownSnapshot(null, 2025)).toBeNull();
    expect(ownSnapshot({}, 2025)).toEqual({});
    expect(ownSnapshot({}, 2024)).toBeNull();
    expect(ownSnapshot({ year: 2024 }, 2024)).toEqual({ year: 2024 });
    expect(ownSnapshot({ year: 2026 }, 2025)).toBeNull();
  });
});
