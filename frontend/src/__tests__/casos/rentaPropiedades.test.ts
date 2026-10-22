/**
 * Edge cases of the Renta engine, by properties: thousands of invented returns in each of the 17
 * places of the common regime (15 communities, Ceuta and Melilla), with a fixed seed so a failure
 * can be repeated. What must always hold, whatever the figures:
 * - the quotas, bases and minimums are never negative and are rounded to the cent;
 * - the result is the liquid quota less the withholdings plus what was collected in advance
 *   (Orden HAC/277/2026, BOE-A-2026-7041, page 25, box 0670);
 * - more pay never lowers the tax (the reduction of art. 20 and the 340 € fall as pay grows);
 * - the minimum is never below the State's 5,550 € (LIRPF art. 57) for the State's part.
 * Navarra and the País Vasco are foral: the engine does not work them out (they are marked).
 * Checked 21-10-2026.
 */
import { CCAA_OPTIONS, loadCcaa } from '@modules/tools/data/renta';
import { computeRenta, type Disability } from '@modules/tools/domain/rentaCalc';
import type { RentaCcaa } from '@modules/tools/domain/rentaData';
import { emptyForm, toInput, type RentaForm } from '@modules/tools/domain/rentaForm';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';

/** A small deterministic generator (LCG of Numerical Recipes): the same seed, the same returns. */
function generator(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  return {
    int: (max: number) => Math.floor(next() * (max + 1)),
    money: (max: number) => Math.round(next() * max * 100) / 100,
    pick: <T>(list: T[]): T => list[Math.floor(next() * list.length)],
  };
}

const COMMON = CCAA_OPTIONS.map((o) => o.id).filter(
  (id) => !['navarra', 'pais-vasco'].includes(id)
);
const DISABILITY: Disability[] = [0, 0, 0, 33, 65];
const cents = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6;

function run(form: RentaForm, ccaa: RentaCcaa) {
  return computeRenta(
    toInput(form, {
      state: rentaState,
      ccaa,
      extras: rentaWorkExtras,
      property: rentaProperty,
      workReduction: workReductionOf(rentaState),
    })
  );
}

/** An invented return: pay, social security, withholdings, savings, family and pension plan. */
function invented(g: ReturnType<typeof generator>): RentaForm {
  const gross = g.pick([0, g.money(16000), g.money(30000), g.money(90000), g.money(400000)]);
  return {
    ...emptyForm(''),
    age: String(18 + g.int(80)),
    disability: g.pick(DISABILITY),
    gross: String(gross),
    socialSecurity: String(Math.round(gross * 0.0635 * 100) / 100),
    withheld: String(g.money(gross * 0.3)),
    savings: String(g.pick([0, 0, g.money(5000), g.money(400000)])),
    pension: String(g.pick([0, g.money(3000)])),
    children: Array.from({ length: g.int(4) }, () => ({
      age: String(g.int(30)),
      disability: g.pick(DISABILITY),
    })),
    shared: g.int(1) === 1,
  };
}

describe('la Renta con miles de declaraciones inventadas (propiedades)', () => {
  it('las 17 comunidades de régimen común se cargan y Navarra y el País Vasco son forales', async () => {
    expect(COMMON).toHaveLength(17);
    for (const id of COMMON) expect((await loadCcaa(id)).regime).toBe('common');
    for (const id of ['navarra', 'pais-vasco']) expect((await loadCcaa(id)).regime).toBe('foral');
  });

  it('Ceuta y Melilla: la deducción del 60 % (art. 68.4) la escribe la persona, no se calcula', () => {
    const d = rentaState.deductions.find((x) => x.id === 'estado-ceuta-melilla');
    expect(d?.kind).toBe('special');
  });

  it.each(COMMON)('%s: cuotas, bases y resultado coherentes y al céntimo', async (id) => {
    const ccaa = await loadCcaa(id);
    const g = generator(id.length * 7919 + 17);
    for (let i = 0; i < 150; i++) {
      const r = run(invented(g), ccaa);
      for (const value of [r.taxBase, r.savingsBase, r.stateQuota, r.regionalQuota, r.lowPay]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(cents(value)).toBe(true);
      }
      expect(cents(r.result)).toBe(true);
      expect(r.minimum.total).toBeGreaterThanOrEqual(rentaState.minimums.personal);
      // The deductions never take more than the quotas (only the refundable ones go below zero).
      expect(r.netQuota + r.refundable).toBeGreaterThanOrEqual(-0.01);
      expect(r.result).toBeCloseTo(r.netQuota - r.withheld + r.advanceReceived, 2);
      expect(r.lowPay).toBeLessThanOrEqual(340);
    }
  });

  it.each(COMMON)('%s: más sueldo nunca baja la cuota íntegra', async (id) => {
    const ccaa = await loadCcaa(id);
    const g = generator(id.length * 104729 + 3);
    for (let i = 0; i < 60; i++) {
      const base = invented(g);
      const step = g.money(5000) + 0.01;
      const gross = Number(base.gross);
      const more = { ...base, gross: String(Math.round((gross + step) * 100) / 100) };
      const a = run(base, ccaa);
      const b = run(more, ccaa);
      expect(b.stateQuota + b.regionalQuota).toBeGreaterThanOrEqual(
        a.stateQuota + a.regionalQuota - 0.01
      );
    }
  });

  it('el mínimo de los bordes: sin hijos 5.550 €; a los 65 y 75, más; los hijos de 25 sin discapacidad no cuentan', () => {
    const ccaa = { ...rentaState, id: 'x', name: 'x', regime: 'common', deductions: [] };
    const at = (form: Partial<RentaForm>) =>
      run({ ...emptyForm(''), gross: '20000', ...form }, ccaa as unknown as RentaCcaa).minimum
        .total;
    expect(at({ age: '64' })).toBe(5550);
    expect(at({ age: '65' })).toBe(6700);
    expect(at({ age: '75' })).toBe(8100);
    expect(at({ children: [{ age: '25', disability: 0 }] })).toBe(5550);
    expect(at({ children: [{ age: '24', disability: 0 }] })).toBe(7950);
    expect(at({ children: [{ age: '25', disability: 33 }] })).toBe(5550 + 2400 + 3000);
  });

  it('sin rentas, todo a cero; con pagos a cuenta y sin rentas, se devuelven enteros', () => {
    const ccaa = { ...rentaState, id: 'x', name: 'x', regime: 'common', deductions: [] };
    const zero = run(emptyForm(''), ccaa as unknown as RentaCcaa);
    expect([zero.taxBase, zero.stateQuota, zero.regionalQuota, zero.result]).toEqual([0, 0, 0, 0]);
    const back = run({ ...emptyForm(''), withheld: '123.45' }, ccaa as unknown as RentaCcaa);
    expect(back.result).toBe(-123.45);
  });
});
