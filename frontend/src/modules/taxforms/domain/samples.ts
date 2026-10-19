import { slotOf, type FormLayout, type FormModel } from './layout';
import { kindOf, type FilledForm } from './values';

/** Made-up words of a record by its field: tax ids, keys and names of no real person. */
const WORDS: Record<string, (n: number) => string> = {
  nif: (n) => `${String(10000000 + n * 1111)}Z`,
  nombre: (n) => `PERSONA DE PRUEBA ${n}`,
  provincia: () => '28',
  nifrep: () => '',
  modalidad: () => '1',
  devengo: () => '2025',
  clave: () => 'G',
  subclave: () => '01',
  local: () => 'X',
  isp: () => 'X',
  pais: () => 'FR',
  rpais: () => 'DE',
  rnombre: (n) => `OPERADOR RECTIFICADO ${n}`,
  rclave: () => 'S',
  rejercicio: () => '2025',
  rperiodo: () => '2T',
};

/** The 349 writes the VAT number of the EU operator without its country, which has its own cell. */
const VAT: Record<string, (n: number) => string> = {
  nif: (n) => String(10000000000 + n * 1111),
  rnif: (n) => String(100000000 + n * 1111),
  clave: () => 'E',
};

const wordsOf = (model: FormModel, field: string, n: number): string | null =>
  ((model === '349' ? VAT[field] : undefined) ?? WORDS[field])?.(n) ?? null;

/** The figures and words typed in a form, and the counters of its boxes and records. */
interface Sample {
  model: FormModel;
  values: Record<string, number>;
  texts: Record<string, string>;
  boxes: number;
  records: number;
}

/** A field of a record: its words, a rate of 19 % or a positive base (the 349 reads them). */
function sampleField(sample: Sample, id: string, field: string, k: number) {
  const words = wordsOf(sample.model, field, k);
  const key = `${k}.${field}`;
  // A representative is left blank, as the app has none.
  if (words !== null) {
    if (words) sample.texts[key] = words;
  } else if (kindOf(sample.model, id) === 'percent') sample.values[key] = 19;
  else sample.values[key] = Math.round(++sample.records * 321.09 * 100) / 100;
}

/** A numbered box: counts are small, rates 21 % and amounts grow (some negative). */
function sampleBox(sample: Sample, id: string) {
  const n = ++sample.boxes;
  const kind = kindOf(sample.model, id);
  if (kind === 'count') sample.values[id] = (n % 9) + 1;
  else if (kind === 'percent') sample.values[id] = 21;
  else sample.values[id] = Math.round(n * 1234.57 * (n % 7 === 0 ? -1 : 1) * 100) / 100;
}

const SKIPPED = (id: string) => id === 'ejercicio' || id === 'periodo' || id.startsWith('hoja.');

/**
 * A form with a made-up figure in every box of its layout, to check that each one is drawn in its
 * cell and read back as it was typed (the round trip of the previews). Amounts grow with the box
 * (some above a thousand, some negative), rates are 21 % and counts are small. A sheet of records
 * gets one record more than it holds, so that it is drawn twice.
 */
export function sampleForm(model: FormModel, layout: FormLayout): FilledForm {
  const sample: Sample = { model, values: {}, texts: {}, boxes: 0, records: 0 };
  for (const page of layout.pages) {
    for (const [id] of page.b) {
      if (SKIPPED(id) || id in sample.values) continue;
      const slot = slotOf(id);
      if (!slot) sampleBox(sample, id);
      else
        for (const k of slot.slot === 1 ? [1, (page.rows as number) + 1] : [slot.slot])
          sampleField(sample, id, slot.field, k);
    }
  }
  const { values, texts } = sample;
  return {
    model,
    year: 2026,
    period: '3T',
    values,
    pending: [],
    ...(Object.keys(texts).length > 0 ? { texts } : {}),
  };
}
