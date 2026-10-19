import type { IntraOp, Key349 } from '@modules/finances/domain/types';
import type { FormModel } from './layout';
import type { FilledForm } from './values';

/** Forms of a whole year: they print the year, no quarter. */
export const YEARLY: FormModel[] = ['390', '190', '180', '347'];

/**
 * The boxes the app's reader of filed forms gives back from a preview: the numbered ones (the fields
 * of the records, «3.nif», are not boxes). The 349 is read by its operators, not by its boxes.
 */
export const readableBoxes = (form: FilledForm): string[] =>
  form.model === '349' ? [] : Object.keys(form.values).filter((id) => /^\d+$/.test(id));

/** The operators and corrections a 349 preview lists, as the reader gives them back. */
export function expected349(form: FilledForm): IntraOp[] {
  const texts = form.texts ?? {};
  const slots = (field: string) =>
    Object.keys(texts)
      .filter((id) => id.endsWith(`.${field}`))
      .map((id) => Number(id.split('.')[0]))
      .sort((a, b) => a - b);
  const operators = slots('nif').map((n) => ({
    key: texts[`${n}.clave`] as Key349,
    vatId: `${texts[`${n}.pais`]}${texts[`${n}.nif`]}`,
    name: texts[`${n}.nombre`],
    base: form.values[`${n}.base`],
  }));
  const corrections = slots('rnif').map((n) => ({
    key: texts[`${n}.rclave`] as Key349,
    vatId: `${texts[`${n}.rpais`]}${texts[`${n}.rnif`]}`,
    name: texts[`${n}.rnombre`],
    base: form.values[`${n}.rbase`],
    rectifies: {
      year: Number(texts[`${n}.rejercicio`]),
      quarter: Number(texts[`${n}.rperiodo`][0]) as 1 | 2 | 3 | 4,
      previous: form.values[`${n}.ranterior`],
    },
  }));
  return [...operators, ...corrections];
}
