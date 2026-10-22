/**
 * Snapshot of the year 2025 (docs/fiscalidad/reglas-por-ejercicio.md): every return of the case bank
 * (docs/casos-practicos/personas), worked out with the rules of 2025, box by box and field by field.
 * The rules were moved into a package by year without changing a figure; this snapshot was taken
 * before the move and must stay the same to the cent. A rule change that is meant to move a figure
 * of 2025 updates it on purpose (`npx jest instantanea2025 -u`) and says why in the commit.
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { computeRenta, type RentaInput, type RentaResult } from '@modules/tools/domain/rentaCalc';
import { ourBoxes } from '@modules/tools/domain/rentaCompare';
import type { RentaCcaa } from '@modules/tools/domain/rentaData';
import {
  emptyForm,
  emptyPartner,
  partnerOf,
  toInput,
  type RentaForm,
} from '@modules/tools/domain/rentaForm';
import { compareJoint, jointInputOf, type JointKind } from '@modules/tools/domain/rentaJoint';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaaFor, rentaRules } from '@modules/tools/data/renta/ejercicios';

const PEOPLE = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos', 'personas');

interface Persona {
  slug: string;
  renta?: {
    declaraciones: { id: string; form: Partial<RentaForm> }[];
    conjunta: { kind: JointKind; livesWithOtherParent: boolean } | null;
  };
}

const people = readdirSync(PEOPLE)
  .filter((slug) => existsSync(join(PEOPLE, slug, 'persona.json')))
  .sort()
  .map((slug) => JSON.parse(readFileSync(join(PEOPLE, slug, 'persona.json'), 'utf8')) as Persona)
  .filter((p) => p.renta);

const formOf = (partial: Partial<RentaForm>): RentaForm => ({
  ...emptyForm(''),
  ...partial,
  partner: { ...emptyPartner(), ...(partial.partner ?? {}) },
});

/** The numbers of a result: its boxes and every numeric field, rounded to the cent. */
function figures(result: RentaResult, input: RentaInput): Record<string, number> {
  const out: Record<string, number> = {};
  const cent = (n: number) => Math.round(n * 100) / 100;
  for (const [box, value] of Object.entries(ourBoxes(result, input)))
    out[`box.${box}`] = cent(value);
  for (const [key, value] of Object.entries(result))
    if (typeof value === 'number') out[key] = cent(value);
  out['minimum.total'] = cent(result.minimum.total);
  out['minimum.regionalTotal'] = cent(result.minimum.regionalTotal);
  out.lines = cent(result.lines.reduce((s, l) => s + l.amount, 0));
  return out;
}

it('the case bank gives the same figures of 2025 to the cent', async () => {
  const rules = rentaRules(2025);
  const all: Record<string, Record<string, number>> = {};
  for (const persona of people) {
    const renta = persona.renta as NonNullable<Persona['renta']>;
    for (const decl of renta.declaraciones) {
      const form = formOf(decl.form);
      const input = toInput(form, {
        state: rules.state,
        ccaa: (await loadCcaaFor(2025, form.ccaaId)) as RentaCcaa,
        extras: rules.extras,
        property: rules.property,
        workReduction: workReductionOf(rules.state),
        activityTables: rules.activityTables,
      });
      const result = computeRenta(input);
      all[`${persona.slug}|${decl.id}`] = figures(result, input);
      if (decl.id === 'individual' && renta.conjunta) {
        const spouse = renta.conjunta.kind === 'couple' ? partnerOf(form) : null;
        const joint = compareJoint(input, renta.conjunta.kind, spouse, {
          livesWithOtherParent: renta.conjunta.livesWithOtherParent,
          rules: rules.joint,
        });
        const unit = (joint as NonNullable<typeof joint>).joint;
        all[`${persona.slug}|conjunta`] = figures(
          unit,
          jointInputOf(input, spouse, unit.jointReduction)
        );
      }
    }
  }
  expect(Object.keys(all).length).toBeGreaterThan(50);
  expect(all).toMatchSnapshot();
});
