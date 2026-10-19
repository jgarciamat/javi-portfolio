import { computeRenta } from '@modules/tools/domain/rentaCalc';
import { emptyForm, toInput, type Choice } from '@modules/tools/domain/rentaForm';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';
import { workReductionOf } from '@modules/tools/domain/rentaWork';

const RESEARCH = 'castilla-y-leon-donaciones-investigacion';
const FOUNDATIONS = 'castilla-y-leon-donaciones-fundaciones-patrimonio';
const given = (amount: number): Choice => ({
  on: true,
  amount: String(amount),
  units: '',
  checks: { 'certificado-donacion': 'yes' },
});

// Castilla y León (Decreto Legislativo 1/2013; AEAT guide 2025): the base of its donations to
// foundations, heritage and R&D, all together, cannot pass 10 % of the tax base.
async function run(gross: number, choices: Record<string, Choice>, bare = false) {
  const form = { ...emptyForm(String(gross)), ccaaId: 'castilla-y-leon', choices };
  const input = toInput(form, {
    state: rentaState,
    ccaa: await loadCcaa('castilla-y-leon'),
    extras: rentaWorkExtras,
    property: rentaProperty,
    workReduction: workReductionOf(rentaState),
  });
  // A choice without an amount (as the engine can get it): nothing spent.
  if (bare) input.choices[RESEARCH] = { on: true, checks: { 'certificado-donacion': 'yes' } };
  const r = computeRenta(input);
  const line = (id: string) => r.lines.find((l) => l.id === id)?.amount ?? 0;
  return { r, line };
}

describe('regional donations held to a share of the tax base', () => {
  it('takes 15 % of only 10 % of the tax base when more was given', async () => {
    const { r, line } = await run(30000, { [RESEARCH]: given(4000) });
    const cap = (r.taxBase + r.savingsBase) * 0.1;
    expect(cap).toBeLessThan(4000);
    expect(line(RESEARCH)).toBeCloseTo(cap * 0.15, 2);
  });

  it('counts only what can be applied: one left out by the income limit does not use the room', async () => {
    const { r, line } = await run(60000, { [RESEARCH]: given(4000), [FOUNDATIONS]: given(4000) });
    expect(r.blocked).toContain(FOUNDATIONS);
    expect(line(RESEARCH)).toBe(600);
  });

  it('counts nothing for a choice without an amount', async () => {
    const { line } = await run(30000, { [RESEARCH]: given(1) }, true);
    expect(line(RESEARCH)).toBe(0);
  });
});
