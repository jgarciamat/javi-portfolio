import { parseDecimal } from '@shared/utils/numbers';
import {
  withholdingsFor,
  type WithholdingQuarter,
  type WithholdingResult,
} from '../../domain/withholdings';
import type { ManualForm } from './AutonomoManual';

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
}

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
  };
}

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
