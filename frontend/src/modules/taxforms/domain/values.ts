import type { AutonomoDraft, TaxBox } from '@modules/finances/domain/types';
import type { Result111, Result115 } from '@modules/finances/domain/withholdings';
import type { FormModel } from './layout';

/** How a box is written: euros with cents, a number of people, or a percentage. */
export type BoxKind = 'amount' | 'count' | 'percent';

/** A form with the figures the app worked out, ready to be drawn on its layout. */
export interface FilledForm {
  model: FormModel;
  year: number;
  /** "1T"…"4T" for the quarterly forms; null for a yearly one (its year is printed). */
  period: string | null;
  /** Box id to its value. A box that is not here is drawn empty. */
  values: Record<string, number>;
  /** Empty boxes the app does not work out, marked «no calculada» so they are copied from the draft. */
  pending: string[];
}

/** Boxes that hold a number of people (the rest of the money boxes are euros). */
const COUNTS: Partial<Record<FormModel, string[]>> = {
  '111': ['01', '04', '07', '10', '13', '16', '19', '22', '25'],
  '115': ['01'],
};

/** Boxes that hold a rate: the VAT and surcharge rates, the State's share and the territories'. */
const PERCENTS: Partial<Record<FormModel, string[]>> = {
  '303': [
    ...['02', '05', '08', '151', '154', '157', '166', '169', '17', '20', '23'],
    ...['65', '89', '90', '91', '92', '107', '504', '509', '514', '519', '524'],
  ],
};

export function kindOf(model: FormModel, box: string): BoxKind {
  if (COUNTS[model]?.includes(box)) return 'count';
  if (PERCENTS[model]?.includes(box)) return 'percent';
  return 'amount';
}

/**
 * A value as it is typed on the form: «1.234,56» (always with cents, so the app's own reader tells it
 * from a box number), «21,00» for a rate and «3» for a number of people.
 */
export function formatBox(value: number, kind: BoxKind): string {
  if (kind === 'count') return String(Math.round(value));
  const [whole, cents] = Math.abs(value).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 && Number(`${whole}.${cents}`) !== 0 ? '-' : ''}${grouped},${cents}`;
}

/** The boxes of a list as a map: the first value of a box stands (a box is never repeated on the form). */
export function valuesOf(boxes: TaxBox[]): Record<string, number> {
  const values: Record<string, number> = {};
  for (const b of boxes) if (!(b.box in values)) values[b.box] = b.amount;
  return values;
}

const quarter = (n: number) => `${n}T`;

/** The modelo 303 of the quarter: every box the draft gives (accrued, deductible, information, result). */
export function form303(draft: AutonomoDraft): FilledForm {
  const { accrued, deductible, settlement, info = [] } = draft.vat;
  return {
    model: '303',
    year: draft.year,
    period: quarter(draft.quarter),
    values: valuesOf([...accrued, ...deductible, ...info, ...settlement]),
    pending: [],
  };
}

/** The modelo 130 of the quarter (null when the person does not file it: 70 % of the income withheld). */
export function form130(draft: AutonomoDraft): FilledForm | null {
  if (!draft.irpf.required) return null;
  return {
    model: '130',
    year: draft.year,
    period: quarter(draft.quarter),
    values: valuesOf(draft.irpf.boxes),
    pending: [],
  };
}

/** The modelo 111 or 115 of a quarter, as the withholdings worked out on the device give them. */
export function formWithholding(
  model: '111' | '115',
  result: Result111 | Result115,
  year: number,
  q: 1 | 2 | 3 | 4
): FilledForm {
  return { model, year, period: quarter(q), values: valuesOf(result.boxes), pending: [] };
}
