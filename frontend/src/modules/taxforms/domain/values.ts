import type {
  PayeeRecord,
  Summary347,
  YearSummary,
} from '@modules/finances/domain/annualSummaries';
import type { Result131 } from '@modules/finances/domain/module131';
import type { AutonomoDraft, TaxBox } from '@modules/finances/domain/types';
import type { Result111, Result115 } from '@modules/finances/domain/withholdings';
import type { RentaInput, RentaResult } from '@modules/tools/domain/rentaCalc';
import type { DirectResult } from '@modules/tools/domain/rentaActivity';
import { ourBoxes } from '@modules/tools/domain/rentaCompare';
import {
  sheetTotalOf,
  slotOf,
  type FormLayout,
  type FormModel,
  type LayoutBox,
  type LayoutPage,
} from './layout';

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
  /** Words of the records («3.nif», «3.nombre», «3.clave»…), written as they are. */
  texts?: Record<string, string>;
  /** The totals of a sheet of records («hoja.percepciones»): the fields of its blocks they add. */
  totals?: Record<string, string[]>;
}

/** Boxes that hold a number of people (the rest of the money boxes are euros). */
const COUNTS: Partial<Record<FormModel, string[]>> = {
  '111': ['01', '04', '07', '10', '13', '16', '19', '22', '25'],
  '115': ['01'],
  '180': ['01'],
  '190': ['01'],
  '347': ['01', '03'],
  '349': ['01', '03'],
};

/** Boxes that hold a rate: the VAT and surcharge rates, the State's share and the territories'. */
const PERCENTS: Partial<Record<FormModel, string[]>> = {
  '303': [
    ...['02', '05', '08', '151', '154', '157', '166', '169', '17', '20', '23'],
    ...['65', '89', '90', '91', '92', '107', '504', '509', '514', '519', '524'],
  ],
  '180': ['pct'],
};

export function kindOf(model: FormModel, id: string): BoxKind {
  // A field of a record is told by its name («3.pct» as «pct»).
  const box = slotOf(id)?.field ?? id;
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

/**
 * The modelo 111 or 115 of a quarter, as the withholdings worked out on the device give them. A
 * complementaria marks its box with an «X» and gives the 13-digit number of the form it completes
 * (instructions of the 111, «Complementaria»; the file carries the same, see aeatFiles/models.ts).
 */
export function formWithholding(
  model: '111' | '115',
  result: Result111 | Result115,
  year: number,
  q: 1 | 2 | 3 | 4
): FilledForm {
  const filled: FilledForm = {
    model,
    year,
    period: quarter(q),
    values: valuesOf(result.boxes),
    pending: [],
  };
  if (!result.previous) return filled;
  const receipt = result.previous.receipt.trim();
  return {
    ...filled,
    texts: { complementaria: 'X', ...(receipt ? { justificante: receipt } : {}) },
  };
}

/** The modelo 131 of a quarter (objective estimation), as module131 works it out. */
export function form131(result: Result131, year: number, q: 1 | 2 | 3 | 4): FilledForm {
  return { model: '131', year, period: quarter(q), values: valuesOf(result.boxes), pending: [] };
}

/** The modelo 390 of the year, with the fourth quarter (null when the draft has none). */
export function form390(draft: AutonomoDraft): FilledForm | null {
  if (!draft.m390) return null;
  return {
    model: '390',
    year: draft.year,
    period: null,
    values: valuesOf(draft.m390.sections.flatMap((s) => s.boxes)),
    pending: [],
  };
}

/** The boxes of the summary of the 349, as the draft names them. */
const BOXES_349: Record<string, string> = {
  operadores: '01',
  importe: '02',
  operadoresRect: '03',
  importeRect: '04',
};

/** The country of an EU VAT number and the number without it, as the 349 asks for them. */
function vatParts(vatId: string): [string, string] {
  return [vatId.slice(0, 2), vatId.slice(2)];
}

/**
 * The modelo 349 of the quarter: the summary (01-04), the operators on the inner sheets (country,
 * VAT number, name, key, base) and the corrections of earlier periods (null when not filed).
 */
export function form349(draft: AutonomoDraft): FilledForm | null {
  const m = draft.m349;
  if (!m?.required) return null;
  const values: Record<string, number> = {};
  const texts: Record<string, string> = {};
  for (const b of m.boxes) if (b.box in BOXES_349) values[BOXES_349[b.box]] = b.amount;
  m.operators.forEach((o, i) => {
    const n = i + 1;
    [texts[`${n}.pais`], texts[`${n}.nif`]] = vatParts(o.vatId);
    texts[`${n}.nombre`] = o.name;
    texts[`${n}.clave`] = o.key;
    values[`${n}.base`] = o.base;
  });
  m.rectifications.forEach((r, i) => {
    const n = i + 1;
    [texts[`${n}.rpais`], texts[`${n}.rnif`]] = vatParts(r.vatId);
    texts[`${n}.rnombre`] = r.name;
    texts[`${n}.rclave`] = r.key;
    texts[`${n}.rejercicio`] = String(r.year);
    texts[`${n}.rperiodo`] = quarter(r.quarter);
    values[`${n}.rbase`] = r.base;
    values[`${n}.ranterior`] = r.previous;
  });
  return {
    model: '349',
    year: draft.year,
    period: quarter(draft.quarter),
    values,
    pending: [],
    texts,
  };
}

/** The words of a payee of the 190 or the 180 that the app knows (no tax id: left blank). */
function payeeTexts(r: PayeeRecord, n: number): Record<string, string> {
  return {
    ...(r.nif ? { [`${n}.nif`]: r.nif } : {}),
    ...(r.name ? { [`${n}.nombre`]: r.name } : {}),
  };
}

/**
 * The modelo 190 of the year: the summary (01-03) and one block per payee and key (key A, the pay
 * and the pay in kind; key G with its subkey), the inner sheets adding their own totals.
 */
export function form190(summary: YearSummary, year: number): FilledForm {
  const values = valuesOf(summary.boxes);
  const texts: Record<string, string> = {};
  summary.records.forEach((r, i) => {
    const n = i + 1;
    Object.assign(texts, payeeTexts(r, n));
    if (r.key) texts[`${n}.clave`] = r.key;
    if (r.subkey) texts[`${n}.subclave`] = r.subkey;
    values[`${n}.integra`] = r.paid;
    if (r.inKind) values[`${n}.especie`] = r.inKind;
    values[`${n}.retenciones`] = r.withheld;
  });
  return {
    model: '190',
    year,
    period: null,
    values,
    pending: [],
    texts,
    totals: { percepciones: ['integra', 'especie'], retenciones: ['retenciones', 'ingresos'] },
  };
}

/** The 180 has no numbers in the summary of its record design: they are those of its form. */
const BOXES_180 = ['01', '02', '03'];

/** The modelo 180 of the year: the summary (01-03) and one block per landlord (base, %, withheld). */
export function form180(summary: YearSummary, year: number): FilledForm {
  const values: Record<string, number> = {};
  summary.boxes.forEach((b, i) => (values[BOXES_180[i]] = b.amount));
  const texts: Record<string, string> = {};
  summary.records.forEach((r, i) => {
    const n = i + 1;
    Object.assign(texts, payeeTexts(r, n));
    values[`${n}.base`] = r.paid;
    if (r.rate !== null) values[`${n}.pct`] = r.rate;
    values[`${n}.retenciones`] = r.withheld;
  });
  return { model: '180', year, period: null, values, pending: [], texts };
}

/**
 * The modelo 347 of the year: the summary (01 people, 02 amount; 03-04 are the declarant's own
 * premises, which the app does not keep) and one block per person, key and quarter.
 */
export function form347(summary: Summary347, year: number): FilledForm {
  const values: Record<string, number> = {
    '01': summary.boxes[0].amount,
    '02': summary.boxes[1].amount,
  };
  const texts: Record<string, string> = {};
  summary.records.forEach((r, i) => {
    const n = i + 1;
    if (r.nif) texts[`${n}.nif`] = r.nif;
    texts[`${n}.nombre`] = r.name;
    texts[`${n}.clave`] = r.key;
    if (r.premises) texts[`${n}.local`] = 'X';
    if (r.reverse) texts[`${n}.isp`] = 'X';
    values[`${n}.total`] = r.total;
    r.quarters.forEach((amount, q) => (values[`${n}.t${q + 1}`] = amount));
  });
  return { model: '347', year, period: null, values, pending: [], texts };
}

/** A page to draw and its boxes, with the ids of the records of this copy of the sheet. */
export interface Sheet {
  page: LayoutPage;
  boxes: LayoutBox[];
  /** The totals of this copy of a sheet of records («hoja2.base»): the sum of its blocks. */
  totals: Record<string, number>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** How many records of a sheet the form has: the highest block of its fields. */
function recordsOf(form: FilledForm, page: LayoutPage): number {
  const fields = new Set(page.b.map(([id]) => slotOf(id)?.field));
  const ids = [...Object.keys(form.values), ...Object.keys(form.texts ?? {})];
  return Math.max(0, ...ids.map(slotOf).map((s) => (s && fields.has(s.field) ? s.slot : 0)));
}

/** The sum of some fields over the records first…last; null when none of them has a figure. */
function sumOf(form: FilledForm, fields: string[], first: number, last: number): number | null {
  const ids = Object.keys(form.values).filter((id) => {
    const s = slotOf(id);
    return s !== null && fields.includes(s.field) && s.slot >= first && s.slot <= last;
  });
  return ids.length ? round2(ids.reduce((sum, id) => sum + form.values[id], 0)) : null;
}

/**
 * The pages of the preview: a sheet of records is repeated as many times as its records need (once,
 * empty, when there are none), its block n of copy c being the record c × blocks + n, and its totals
 * «hoja.x» being those of the copy («hoja2.x»).
 */
export function sheetsOf(layout: FormLayout, form: FilledForm): Sheet[] {
  return layout.pages.flatMap((page) => {
    const rows = page.rows;
    if (!rows) return [{ page, boxes: page.b, totals: {} }];
    const copies = Math.max(1, Math.ceil(recordsOf(form, page) / rows));
    return Array.from({ length: copies }, (_, c) => {
      const totals: Record<string, number> = {};
      const boxes = page.b.map(([id, ...cell]): LayoutBox => {
        const slot = slotOf(id);
        if (slot) return [`${c * rows + slot.slot}.${slot.field}`, ...cell];
        const total = sheetTotalOf(id);
        if (!total) return [id, ...cell];
        const name = `hoja${c + 1}.${total}`;
        const sum = sumOf(form, form.totals?.[total] ?? [total], c * rows + 1, (c + 1) * rows);
        if (sum !== null) totals[name] = sum;
        return [name, ...cell];
      });
      return { page, boxes, totals };
    });
  });
}

/** What goes in a box: the year, the period, the words or the figure, as the form expects it. */
export function boxValue(form: FilledForm, id: string): string | null {
  if (id === 'ejercicio') return String(form.year);
  if (id === 'periodo') return form.period;
  if (form.texts && id in form.texts) return form.texts[id];
  return id in form.values ? formatBox(form.values[id], kindOf(form.model, id)) : null;
}

// ─── The Renta (modelo 100) ───────────────────────────────────────────────────

/**
 * Main boxes of the Renta that every return goes through: when the planner does not give one, it is
 * marked «no calculada» so that it is copied from the draft of the Tax Agency. Work (A), capital (B),
 * activities (D), gains (G), the bases (H, J), the quotas, the payments on account and the
 * deductions after the quota (M).
 */
export const RENTA_PENDING = [
  ...['0007', '0014', '0015', '0016', '0018'],
  ...['0027', '0029', '0036', '0041'],
  '0235',
  ...['0420', '0424'],
  '0432',
  ...['0505', '0510'],
  ...['0532', '0533', '0570', '0571', '0587'],
  ...['0596', '0597', '0599', '0604', '0611'],
];

/** The figures of the savings worked out in detail (the investment files and the sales typed in). */
function savingsBoxes(result: RentaResult): Record<string, number> {
  const detail = result.savingsDetail;
  if (!detail) return {};
  // Its box 0460 is the planner's own (ourBoxes), and the rest of its keys are not boxes.
  const boxes = Object.fromEntries(
    Object.entries(detail.boxes).filter(([id]) => /^\d{4}$/.test(id) && id !== '0460')
  );
  return { ...boxes, '0597': detail.withheld.capital, '0603': detail.withheld.gains };
}

/** The economic activities: the totals of each kind, the reductions of art. 32 and the payments. */
function activityBoxes(result: RentaResult): Record<string, number> {
  const a = result.activities;
  if (!a) return {};
  const boxes: Record<string, number> = {
    '0231': a.direct,
    '0232': a.dependentReduction,
    '0233': a.smallIncomeReduction,
    '0234': a.startReduction,
    '0235': a.directTotal,
    '1484': a.modules,
    '1560': a.agrarian,
    '0599': a.withheld,
    '0604': a.payments,
  };
  // The form has one block per activity: the detail goes in it when there is only one, in direct estimation.
  const only = a.each.length === 1 ? a.each[0].detail : null;
  if (only && 'difference' in only) {
    const direct = only as DirectResult;
    Object.assign(boxes, { '0180': direct.income, '0218': direct.expenses, '0224': direct.net });
  }
  return boxes;
}

/** Boxes worked out from the result that only make sense when they are not zero. */
function optionalBoxes(result: RentaResult): Record<string, number> {
  const minimum = (key: RentaResult['minimum']['items'][number]['key']) =>
    result.minimum.items.filter((i) => i.key === key).reduce((sum, i) => sum + i.amount, 0);
  const round = (n: number) => Math.round(n * 100) / 100;
  const savingsHeld = result.savingsDetail
    ? result.savingsDetail.withheld.capital + result.savingsDetail.withheld.gains
    : 0;
  const activitiesHeld = result.activities
    ? result.activities.withheld + result.activities.payments
    : 0;
  const gains = result.generalGains;
  const all: Record<string, number> = {
    // A: reductions of the gross pay; the withholdings of the pay (all of them but those of the
    // savings and the activities, which have their own boxes).
    '0011': result.workReductions,
    '0596': round(result.withheld - savingsHeld - activitiesHeld),
    // C: the net reduced rents.
    '0156': result.rentalNet,
    ...savingsBoxes(result),
    ...activityBoxes(result),
    // H: earlier negative gains and the current ones of the general base.
    ...(gains ? { '0431': gains['0431'], '0433': gains['0433'], '0434': gains['0434'] } : {}),
    // I and J: the pension plan and what the compensatory pension takes off the savings base.
    '0492': result.pensionReduction,
    // Arts. 53 and 54 (a person with a disability): plans and protected patrimony.
    '0494': result.disability?.plans ?? 0,
    '0495': result.disability?.patrimony ?? 0,
    '0507': result.savingsReduction,
    // K: the minimums for descendants and ascendants.
    '0513': minimum('descendants'),
    '0515': minimum('ascendants'),
    // M: double taxation of the income taxed abroad.
    '0588': result.doubleTaxation,
  };
  return Object.fromEntries(Object.entries(all).filter(([, v]) => v !== 0));
}

/**
 * The Renta (modelo 100) as the planner works it out: the boxes it compares with the draft of the
 * Tax Agency (always, even at zero) and every other one its result gives. The rest of the main boxes
 * are left to be copied from the draft. No personal data (tax id, name, address) is written.
 */
export function form100(result: RentaResult, input: RentaInput, year: number): FilledForm {
  // The boxes compared with the draft come last: they are the reference.
  const values: Record<string, number> = { ...optionalBoxes(result), ...ourBoxes(result, input) };
  return {
    model: '100',
    year,
    period: null,
    values,
    pending: RENTA_PENDING.filter((b) => !(b in values)),
  };
}
