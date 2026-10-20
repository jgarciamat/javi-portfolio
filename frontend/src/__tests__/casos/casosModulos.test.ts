/**
 * Case bank, activities in módulos (non-farming): the modelo 131 of each quarter, the 303 of the
 * simplified regime and the boxes of the activity in the Renta, worked out by the screen of the
 * self-employed section (modulesView.ts, the annual contract) against the hand calculation of
 * esperado.json. A persona takes part with its `modulos` block (the form as typed on the screen).
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  NO_EXTRAS,
  emptyManual,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import {
  emptyActivity,
  emptyObjective,
  type ObjectiveForm,
} from '@modules/finances/ui/components/activityForm';
import { annualOf } from '@modules/finances/ui/components/autonomoInputs';
import { modulesView } from '@modules/finances/ui/components/modulesView';
import { NO_VAT_EXTRAS, type VatExtras } from '@modules/finances/ui/components/vatForm';

const PEOPLE = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos', 'personas');

interface Figure {
  modelo: string;
  periodo?: string;
  casilla: string | null;
  concepto: string;
  importe: number | null;
  origen: string;
  motivo?: string;
  campo: string | null;
}
interface Persona {
  slug: string;
  modulos?: {
    ejercicio: number;
    form: Partial<ObjectiveForm>;
    rendimientoAnterior: number | null;
    regimenIva: VatExtras['regime'];
  };
}

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const cases = readdirSync(PEOPLE)
  .filter((slug) => existsSync(join(PEOPLE, slug, 'persona.json')))
  .sort()
  .map((slug) => ({
    persona: read<Persona>(join(PEOPLE, slug, 'persona.json')),
    figures: read<{ cifras: Figure[] }>(join(PEOPLE, slug, 'esperado.json')).cifras,
  }))
  .filter((c) => c.persona.modulos);

/** The screen of the self-employed section with the activity of the persona. */
function screenOf(m: NonNullable<Persona['modulos']>) {
  const manual: ManualForm = {
    ...emptyManual(),
    activity: {
      ...emptyActivity(),
      method: 'objective',
      objective: { ...emptyObjective(), ...m.form },
    },
  };
  const extras = {
    ...NO_EXTRAS,
    priorNet: m.rendimientoAnterior === null ? '' : String(m.rendimientoAnterior),
    vat: { ...NO_VAT_EXTRAS, regime: m.regimenIva },
  };
  return { manual, extras };
}

function valueOf(f: Figure, m: NonNullable<Persona['modulos']>): number | null {
  const { manual, extras } = screenOf(m);
  const [model, box] = (f.campo as string).split('.');
  if (model === 'renta') {
    const annual = annualOf(manual, extras, m.ejercicio);
    return box === '0604' ? annual.payments130.total : (annual.boxes[box] ?? null);
  }
  const q = Number((f.periodo as string).slice(0, 1)) as 1 | 2 | 3 | 4;
  const view = modulesView(manual, extras, m.ejercicio, q);
  const boxes =
    model === 'm131'
      ? view?.result131.boxes
      : view?.vat && view.vat !== 'none'
        ? view.vat.result.boxes
        : undefined;
  return boxes?.find((b) => b.box === box)?.amount ?? null;
}

describe.each(cases)('$persona.slug', ({ persona, figures }) => {
  for (const f of figures) {
    const name = `${f.modelo} ${f.periodo ?? ''} · ${f.casilla ?? '—'} ${f.concepto}`;
    if (f.origen === 'pendiente' || f.campo === null) {
      it.todo(`${name} — PENDIENTE: ${f.motivo}`);
      continue;
    }
    it(name, () => {
      expect(valueOf(f, persona.modulos as NonNullable<Persona['modulos']>)).toBeCloseTo(
        f.importe as number,
        2
      );
    });
  }
});
