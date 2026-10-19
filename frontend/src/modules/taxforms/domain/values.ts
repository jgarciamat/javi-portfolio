import type { AutonomoDraft, TaxBox } from '@modules/finances/domain/types';
import type { Result111, Result115 } from '@modules/finances/domain/withholdings';
import type { RentaInput, RentaResult } from '@modules/tools/domain/rentaCalc';
import { ourBoxes } from '@modules/tools/domain/rentaCompare';
import type { FormModel } from './layout';

/** How a box is written: euros with cents, a number of people, or a percentage. */
export type BoxKind = 'amount' | 'count' | 'percent';

/** A form with the figures the app worked out, ready to be drawn on its layout. */
export interface FilledForm {
  model: FormModel;
  year: number;
  /** "1T"…"4T" for the quarterly forms; null for the Renta (its year is printed). */
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

/**
 * Boxes of the Renta the planner does not work out yet, in the parts a return always goes through:
 * they are marked «no calculada» on the preview so that they are copied from the draft of the AEAT.
 * Work (A), savings and capital (B), activities (D), gains (G), the bases (H, J), the quotas, the
 * payments on account and the deductions after the quota (M).
 */
export const RENTA_PENDING = [
  ...['0007', '0014', '0015', '0016', '0018'],
  ...['0027', '0029', '0036', '0041'],
  '0235',
  ...['0420', '0424'],
  '0432',
  ...['0505', '0510'],
  ...['0532', '0533', '0570', '0571', '0587'],
  ...['0596', '0599', '0604', '0611'],
];

/** Boxes worked out from the result that only make sense when they are not zero (rents, savings…). */
function optionalBoxes(result: RentaResult): Record<string, number> {
  const minimum = (key: RentaResult['minimum']['items'][number]['key']) =>
    result.minimum.items.filter((i) => i.key === key).reduce((sum, i) => sum + i.amount, 0);
  const all: Record<string, number> = {
    // C: the net reduced rents. I: the pension plan reduction the planner applies.
    '0156': result.rentalNet,
    '0492': result.pensionReduction,
    // K: the minimums for descendants and ascendants.
    '0513': minimum('descendants'),
    '0515': minimum('ascendants'),
  };
  return Object.fromEntries(Object.entries(all).filter(([, v]) => v !== 0));
}

/**
 * The Renta (modelo 100) as the planner works it out: the boxes it compares with the draft of the
 * AEAT, plus those that come straight from its result. Everything else is left for the draft.
 */
export function form100(result: RentaResult, input: RentaInput, year: number): FilledForm {
  // The boxes the planner compares with the draft come last: they are the reference.
  const values: Record<string, number> = { ...optionalBoxes(result), ...ourBoxes(result, input) };
  return {
    model: '100',
    year,
    period: null,
    values,
    pending: RENTA_PENDING.filter((b) => !(b in values)),
  };
}
