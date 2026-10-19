/**
 * The requirements of every deduction (box, rule and checks), written to
 * docs/fiscalidad/deducciones-requisitos.json for the case bank (its generators answer the questions
 * of the deductions each persona meets) and for the coverage. REQUISITOS=1 writes it; otherwise the
 * file must be up to date.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CCAA_OPTIONS, loadCcaa } from '@modules/tools/data/renta';
import { rentaState } from '@modules/tools/data/renta/state';

const FILE = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'docs',
  'fiscalidad',
  'deducciones-requisitos.json'
);

it('lists the requirements of each deduction, as the app has them', async () => {
  const out: Record<string, unknown> = {
    comprobado: '2026-10-19',
    nota: 'Generado por frontend/src/__tests__/casos/requisitos.test.ts (REQUISITOS=1) a partir de data/renta/requisitos/.',
    deducciones: {},
  };
  const all = out.deducciones as Record<string, unknown>;
  const ccaas = await Promise.all(CCAA_OPTIONS.map((o) => loadCcaa(o.id)));
  for (const d of [...rentaState.deductions, ...ccaas.flatMap((c) => c.deductions)]) {
    if (!d.checks && !d.box) continue;
    all[d.id] = {
      titulo: d.title,
      casilla: d.box ?? null,
      norma: d.norm ?? null,
      requisitos: d.checks ?? [],
    };
  }
  const text = `${JSON.stringify(out, null, 2)}\n`;
  if (process.env.REQUISITOS) writeFileSync(FILE, text);
  expect(readFileSync(FILE, 'utf8')).toBe(text);
});
