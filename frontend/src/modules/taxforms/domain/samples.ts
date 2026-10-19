import type { FormLayout, FormModel } from './layout';
import { kindOf, type FilledForm } from './values';

/**
 * A form with a made-up figure in every box of its layout, to check that each one is drawn in its
 * cell and read back as it was typed (the round trip of the previews). Amounts grow with the box
 * (some above a thousand, some negative), rates are 21 % and counts are small.
 */
export function sampleForm(model: FormModel, layout: FormLayout): FilledForm {
  const values: Record<string, number> = {};
  let n = 0;
  for (const page of layout.pages) {
    for (const [id] of page.b) {
      if (id === 'ejercicio' || id === 'periodo' || id in values) continue;
      n++;
      const kind = kindOf(model, id);
      if (kind === 'count') values[id] = (n % 9) + 1;
      else if (kind === 'percent') values[id] = 21;
      else values[id] = Math.round(n * 1234.57 * (n % 7 === 0 ? -1 : 1) * 100) / 100;
    }
  }
  return { model, year: 2026, period: '3T', values, pending: [] };
}
