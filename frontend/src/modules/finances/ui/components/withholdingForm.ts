import { parseDecimal } from '@shared/utils/numbers';
import {
  retentionOf,
  roleOf,
  withholdingsFor,
  type WithholdingQuarter,
  type WithholdingResult,
} from '../../domain/withholdings';
import { quarterFrom111, quarterFrom115, type TaxModelPdf } from '../../domain/taxModelPdf';
import type { ManualForm } from './AutonomoManual';
import type { Applied, Line } from './importFiles';

/** The form filed before, when the one of the quarter is its complementaria (as typed). */
export interface ComplementForm {
  /** Its result: box 30 of the 111, box 05 of the 115. */
  result: string;
  /** The 13-digit number printed next to its barcode. */
  receipt: string;
}

/** The withholdings of a quarter typed by hand, as text so the fields can be edited freely. */
export interface WithholdingForm {
  /** Employees (modelo 111, boxes 01-06), from their payslips. */
  staff: {
    people: string;
    paid: string;
    withheld: string;
    kindPeople: string;
    kindPaid: string;
    kindWithheld: string;
  };
  /** Professionals whose invoices were not imported (111, boxes 07-09). */
  pros: { people: string; paid: string; withheld: string };
  /** Landlords whose invoices were not imported (115). */
  rent: { people: string; paid: string; withheld: string };
  /** Filled from a filed modelo 111 / 115: the invoices of the quarter do not add to it. */
  filed111: boolean;
  filed115: boolean;
  /** This 111 / 115 completes one already filed for the quarter (absent: an ordinary one). */
  complement111?: ComplementForm;
  complement115?: ComplementForm;
}

export const emptyComplement = (): ComplementForm => ({ result: '', receipt: '' });

export const emptyWithholding = (): WithholdingForm => ({
  staff: { people: '', paid: '', withheld: '', kindPeople: '', kindPaid: '', kindWithheld: '' },
  pros: { people: '', paid: '', withheld: '' },
  rent: { people: '', paid: '', withheld: '' },
  filed111: false,
  filed115: false,
});

export const emptyWithholdings = (): WithholdingForm[] => [0, 1, 2, 3].map(emptyWithholding);

const num = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const count = (text: string) => Math.floor(num(text));

/** A quarter of the form, older data (without some part) included, in the same order every time. */
export function normalWithholding(form: Partial<WithholdingForm> | undefined): WithholdingForm {
  const empty = emptyWithholding();
  const staff = { ...empty.staff, ...form?.staff };
  const pros = { ...empty.pros, ...form?.pros };
  const rent = { ...empty.rent, ...form?.rent };
  return {
    staff: {
      people: staff.people,
      paid: staff.paid,
      withheld: staff.withheld,
      kindPeople: staff.kindPeople,
      kindPaid: staff.kindPaid,
      kindWithheld: staff.kindWithheld,
    },
    pros: { people: pros.people, paid: pros.paid, withheld: pros.withheld },
    rent: { people: rent.people, paid: rent.paid, withheld: rent.withheld },
    filed111: form?.filed111 === true,
    filed115: form?.filed115 === true,
    ...complementOf('complement111', form?.complement111),
    ...complementOf('complement115', form?.complement115),
  };
}

/** A complementaria of the form, only when the person marked it (older data has none). */
function complementOf(
  name: 'complement111' | 'complement115',
  value: Partial<ComplementForm> | undefined
): Partial<WithholdingForm> {
  if (!value) return {};
  const c = { ...emptyComplement(), ...value };
  return { [name]: { result: c.result, receipt: c.receipt } };
}

/** The form filed before as numbers: its result and its number without blanks. */
const previousOf = (c: ComplementForm | undefined) =>
  c ? { result: num(c.result), receipt: c.receipt.replace(/\s/g, '') } : null;

/** The four quarters, whatever was stored. */
export const withholdingsOf = (manual: Pick<ManualForm, 'withholdings'>): WithholdingForm[] =>
  [0, 1, 2, 3].map((q) => normalWithholding(manual.withholdings?.[q]));

/** The figures of a quarter as numbers. */
export function toWithholdingQuarter(form: WithholdingForm): WithholdingQuarter {
  const payee = (p: WithholdingForm['pros']) => ({
    people: count(p.people),
    paid: num(p.paid),
    withheld: num(p.withheld),
  });
  return {
    staff: {
      people: count(form.staff.people),
      paid: num(form.staff.paid),
      withheld: num(form.staff.withheld),
      kindPeople: count(form.staff.kindPeople),
      kindPaid: num(form.staff.kindPaid),
      kindWithheld: num(form.staff.kindWithheld),
    },
    pros: payee(form.pros),
    rent: payee(form.rent),
    filed111: form.filed111,
    filed115: form.filed115,
    previous111: previousOf(form.complement111),
    previous115: previousOf(form.complement115),
  };
}

/** The modelos 111 and 115 of a quarter of the form. */
export function withholdingsOfForm(
  manual: ManualForm,
  year: number,
  quarter: 1 | 2 | 3 | 4
): WithholdingResult {
  const income = manual.quarters[quarter - 1].income;
  return withholdingsFor({
    year,
    quarter,
    invoices: manual.invoices,
    data: toWithholdingQuarter(withholdingsOf(manual)[quarter - 1]),
    income: num(income.r21) + num(income.r10) + num(income.r4) + num(income.r0),
  });
}

/** The form with one quarter of the withholdings changed. */
export function withWithholding(
  manual: ManualForm,
  quarter: 1 | 2 | 3 | 4,
  patch: Partial<WithholdingForm>
): ManualForm {
  return {
    ...manual,
    withholdings: withholdingsOf(manual).map((w, i) =>
      i === quarter - 1 ? { ...w, ...patch } : w
    ),
  };
}

/** Money and counts as the form's text fields take them: nothing for a zero. */
const text = (n: number): string => (n === 0 ? '' : String(n));

/**
 * A filed modelo 111 or 115 fills the withholdings of its quarter, marked as imported: the received
 * invoices of that quarter no longer add to that form (the one filed stands), and the lines say so.
 */
export function importWithholdingModel(
  form: ManualForm,
  data: TaxModelPdf,
  year: number,
  quarter: 1 | 2 | 3 | 4
): Applied {
  const m111 = data.model === '111';
  let patch: Partial<WithholdingForm>;
  let ignored: string[] = [];
  if (m111) {
    const found = quarterFrom111(data.boxes);
    const s = found.staff;
    patch = {
      staff: {
        people: text(s.people),
        paid: text(s.paid),
        withheld: text(s.withheld),
        kindPeople: text(s.kindPeople),
        kindPaid: text(s.kindPaid),
        kindWithheld: text(s.kindWithheld),
      },
      pros: {
        people: text(found.pros.people),
        paid: text(found.pros.paid),
        withheld: text(found.pros.withheld),
      },
      filed111: true,
    };
    ignored = found.ignored;
  } else {
    const found = quarterFrom115(data.boxes);
    patch = {
      rent: { people: text(found.people), paid: text(found.paid), withheld: text(found.withheld) },
      filed115: true,
    };
  }
  // The invoices of the quarter whose withholdings this form now stands for.
  const role = m111 ? 'professional' : 'rent';
  const replaced = form.invoices.some(
    (i) =>
      i.book === 'received' &&
      !i.excluded &&
      i.quarter === quarter &&
      roleOf(i) === role &&
      retentionOf(i) !== 0
  );
  const lines: Line[] = [
    {
      tone: 'done',
      key: `app.autonomo.model.done.${data.model}`,
      values: { year, quarter },
    },
    ...(replaced
      ? [{ tone: 'note' as const, key: 'app.autonomo.model.note.filed', values: { quarter } }]
      : []),
    ...(ignored.length > 0
      ? [
          {
            tone: 'note' as const,
            key: 'app.autonomo.model.note.ignored111',
            values: { boxes: ignored.join(', ') },
          },
        ]
      : []),
  ];
  return { form: withWithholding(form, quarter, patch), period: { year, quarter }, lines };
}
