/**
 * Case bank: the solved examples of the AEAT manuals (docs/casos-practicos/oficiales.json) that the
 * app's engine can reproduce, run through it with the figures of the source. Each check names its
 * case; the cases with no automatic check are listed as todos with the reason. A known discrepancy
 * (discrepancias.json, «oficiales») passes while the engine still gives the recorded value.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  applyMinimum,
  applyScale,
  computeMinimum,
  computeRenta,
  deductionAmount,
  incomeFactor,
  lowPayDeduction,
  splitDeduction,
  type RentaInput,
} from '@modules/tools/domain/rentaCalc';
import type { Deduction } from '@modules/tools/domain/rentaData';
import { emptyForm, rentalOf, toInput } from '@modules/tools/domain/rentaForm';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { aragon } from '@modules/tools/data/renta/ccaa/aragon';
import { cantabria } from '@modules/tools/data/renta/ccaa/cantabria';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';

const BANK = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos');
interface Case {
  id: string;
  modelo: string;
  apartado: string;
  fuente: { oficial: boolean };
  resultados: { casilla: string | null; concepto: string; importe: number }[];
}
const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const cases = read<{ casos: Case[] }>(join(BANK, 'oficiales.json')).casos;
const known = read<{ oficiales: { id: string; esperado: number; obtenido: number }[] }>(
  join(BANK, 'discrepancias.json')
).oficiales;

/** The figure of a case whose concept is `concept`, or starts with it (the source's own wording). */
const figure = (id: string, concept: string): number => {
  const c = cases.find((x) => x.id === id) as Case;
  const found =
    c.resultados.find((r) => r.concepto === concept) ??
    c.resultados.find((r) => r.concepto.startsWith(concept));
  return (found as Case['resultados'][0]).importe;
};
const deduction = (id: string) => rentaState.deductions.find((d) => d.id === id) as Deduction;

/** A return with work income only, in a community, for the checks that need the whole engine. */
function workReturn(over: Partial<ReturnType<typeof emptyForm>>): RentaInput {
  return toInput(
    { ...emptyForm(''), ...over },
    {
      state: rentaState,
      ccaa: cantabria,
      extras: rentaWorkExtras,
      property: rentaProperty,
      workReduction: workReductionOf(rentaState),
    }
  );
}

const CHECKS: Record<string, () => void> = {
  'renta-c03-01': () => {
    // Pay of 10,100 € plus the 10,200 € of taxable severance reduced by 30 % (art. 18.2): 17,240 €.
    const r = computeRenta(
      workReturn({ gross: '17240', socialSecurity: '3600', disability: 33, savings: '5500' })
    );
    expect(r.otherExpenses).toBe(
      figure('renta-c03-01', 'Otros gastos') + figure('renta-c03-01', 'Incremento')
    );
    expect(r.netIncome).toBe(figure('renta-c03-01', 'Rendimiento neto'));
    expect(r.workReduction).toBe(figure('renta-c03-01', 'Reducción por obtención'));
    expect(r.netIncome - r.workReduction).toBe(figure('renta-c03-01', 'Rendimiento neto reducido'));
  },
  'renta-c04-01': () => {
    const rental = rentalOf(
      { ...emptyForm(''), rentalOn: true, rentalIncome: '11500', construction: '66228.6' },
      rentaProperty
    );
    expect(Math.round((rental?.amortization as number) * 100) / 100).toBe(
      figure('renta-c04-01', 'Amortización vivienda')
    );
  },
  'renta-c10-01': () => {
    expect((40800 * rentaProperty.imputation.revisedRate) / 100).toBeCloseTo(
      figure('renta-c10-01', 'Imputación apartamento'),
      2
    );
  },
  'renta-c13-01': () => {
    // The father: 1,500 € to his employment plan and 2,500 € from the company.
    const r = computeRenta(
      workReturn({
        gross: '60000',
        socialSecurity: '3800',
        pension: '1500',
        pensionEmployer: '2500',
      })
    );
    expect(r.pensionReduction).toBe(figure('renta-c13-01', 'Reducción plan de empleo'));
  },
  'renta-c14-01': () => {
    const children = [
      { age: 27, disability: 33 as const },
      { age: 22, disability: 0 as const },
      { age: 19, disability: 0 as const },
    ];
    const family = { age: 50, disability: 0 as const, children, ascendants: [] };
    expect(computeMinimum({ ...family, sharedChildren: true }, rentaState.minimums).total).toBe(
      figure('renta-c14-01', 'Total mínimo personal y familiar (individual')
    );
    expect(computeMinimum({ ...family, sharedChildren: false }, rentaState.minimums).total).toBe(
      figure('renta-c14-01', 'Total mínimo personal y familiar (conjunta')
    );
  },
  'renta-c15-01': () => {
    const savings = applyScale(rentaWorkExtras.savingsScale.state, 2800);
    expect(savings).toBe(figure('renta-c15-01', 'Gravamen ahorro'));
    expect(applyMinimum(rentaState.scale, 23900, 5550)).toBe(
      figure('renta-c15-01', 'Cuota íntegra general estatal')
    );
    expect(applyMinimum(aragon.scale as NonNullable<typeof aragon.scale>, 23900, 5550)).toBe(
      figure('renta-c15-01', 'Cuota íntegra general autonómica')
    );
    expect(applyMinimum(rentaState.scale, 23900, 5550) + savings).toBe(
      figure('renta-c15-01', 'Cuota íntegra estatal')
    );
  },
  'renta-c16-03': () => {
    const d = deduction('estado-alquiler-transitorio');
    const got = deductionAmount(d, { on: true, amount: 6900 }, incomeFactor(d, 22100));
    // The maximum base goes down (2,835.17), not the deduction: before the fix the engine gave 217.48.
    expect(got).toBe(figure('renta-c16-03', 'Deducción (10,05 %)'));
    // Half in each box (0562 and 0563), the odd cent in the regional one so they add up.
    expect(splitDeduction(got, d.regionalShare as number)).toEqual({
      state: 142.46,
      regional: 142.47,
    });
  },
  'renta-c18-02': () => {
    const general = deductionAmount(deduction('estado-familia-numerosa'), { on: true, units: 1 });
    const extra = deductionAmount(deduction('estado-familia-numerosa-hijo-adicional'), {
      on: true,
      units: 1,
    });
    expect(general).toBe(figure('renta-c18-02', 'Deducción familia numerosa general'));
    expect(general + extra).toBe(figure('renta-c18-02', 'Total deducción'));
  },
  'renta-c18-03': () => {
    expect(lowPayDeduction(16500, 0)).toBe(figure('renta-c18-03', 'Importe máximo'));
  },
};

/** Why a case has no automatic check (by model, or by the part of the return). */
function reasonOf(c: Case): string {
  if (c.modelo !== '100')
    return c.modelo === 'RETA'
      ? 'Ejemplo de 2023 con otra tabla de cuotas: solo sirve de estructura.'
      : `Modelo ${c.modelo}: el motor de la app no lo calcula en el frontend (130 y 303 están en el backend; ver npm run casos).`;
  return `Apartado «${c.apartado}»: el motor no calcula este supuesto con los datos de la fuente.`;
}

describe('casos oficiales del Manual práctico (Renta 2025)', () => {
  it('el catálogo tiene al menos 40 casos', () => {
    expect(cases.length).toBeGreaterThanOrEqual(40);
  });
  it('cada discrepancia oficial conocida es de un caso del catálogo', () => {
    // A fixed one is removed from discrepancias.json (renta-c16-03 was, on 19-10-2026).
    for (const k of known) expect(cases.map((c) => c.id)).toContain(k.id);
  });
  for (const c of cases) {
    const check = CHECKS[c.id];
    if (check) it(`${c.id} · ${c.apartado}`, check);
    else it.todo(`${c.id} · ${c.apartado} — PENDIENTE: ${reasonOf(c)}`);
  }
});
