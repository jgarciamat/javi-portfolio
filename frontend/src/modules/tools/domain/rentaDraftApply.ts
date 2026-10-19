import type { Deduction } from './rentaData';
import type { DraftReading } from './rentaDraft';
import { matchApplied } from './rentaDraftGaps';
import type { XmlPartner } from './rentaDraftXml';
import {
  emptyDonations,
  type Choice,
  type DonationForm,
  type PartnerForm,
  type RentaForm,
} from './rentaForm';
import { DONATION_IDS } from './rentaDonations';
import { round2 } from './round';
import { draftAnswers } from './rentaGuide';

/** The form with what was read from the draft: only what was found, the rest is left as it was. */
export function applyReading(form: RentaForm, r: DraftReading): Partial<RentaForm> {
  const partner = (r as { partner?: XmlPartner | null }).partner ?? null;
  const text = (n: number | null, current: string) => (n === null ? current : String(n));
  return {
    // The guided questions the draft answers are marked as answered.
    answers: { ...form.answers, ...draftAnswers(r) },
    ccaaId: r.ccaaId ?? form.ccaaId,
    gross: text(r.gross, form.gross),
    socialSecurity: text(r.socialSecurity, form.socialSecurity),
    withheld: text(r.withheld, form.withheld),
    pension: text(r.pension, form.pension),
    savings: text(r.savings, form.savings),
    rentalOn: r.rentalIncome !== null || form.rentalOn,
    rentalIncome: text(r.rentalIncome, form.rentalIncome),
    age: r.age === null ? form.age : String(r.age),
    disability: r.disability ?? form.disability,
    unrented:
      r.unrented.length > 0
        ? r.unrented.map((p) => ({
            value: String(p.value),
            revised: p.revised,
            days: p.days === null ? '' : String(p.days),
          }))
        : form.unrented,
    ascendants:
      r.ascendantAges.length > 0
        ? r.ascendantAges.map((age) => ({ over75: age >= 75, disability: 0 as const }))
        : form.ascendants,
    children:
      r.childAges.length > 0
        ? r.childAges.map((age) => ({ age: String(age), disability: 0 as const }))
        : form.children,
    // The Agency's file says who the spouse is: their data, and the joint return to compare.
    ...(partner ? { partner: partnerForm(form.partner, partner), joint: 'couple' as const } : {}),
  };
}

/** The spouse of the file over what the form had. */
function partnerForm(current: PartnerForm, p: XmlPartner): PartnerForm {
  const text = (n: number | null, value: string) => (n === null ? value : String(n));
  return {
    ...current,
    gross: text(p.gross, current.gross),
    socialSecurity: text(p.socialSecurity, current.socialSecurity),
    withheld: text(p.withheld, current.withheld),
    pension: text(p.pension, current.pension),
    age: p.age === null ? current.age : String(p.age),
    disability: p.disability ?? current.disability,
  };
}

/**
 * What was given for a deduction of donations to Ley 49/2002 entities (art. 19.1: 80 % of the
 * first 250 €, 40 % of the rest): the planner asks what was given, not the deduction. Recurrent
 * donations (45 %) cannot be told apart in the draft: the amount is the same either way here.
 */
export function givenFor(deduction: number): number {
  return round2(deduction <= 200 ? deduction / 0.8 : 250 + (deduction - 200) / 0.4);
}

/**
 * The deductions the draft already applies, marked in the planner with the base, units or amount
 * that give what the draft deducts (rentaDraftGaps.ts): so the planner's return is the draft's to the
 * cent before anything is suggested. What the person marked themselves is kept; the donations go to
 * what was given (rentaDonations.ts), unless the person typed them.
 */
export function withDraftDeductions(
  form: Pick<RentaForm, 'choices' | 'donations'>,
  applied: DraftReading['applied'],
  deductions: Deduction[]
): { choices: Record<string, Choice>; donations?: DonationForm; marked: string[] } {
  const next = { ...form.choices };
  const marked: string[] = [];
  let donations: DonationForm | undefined;
  const typed = !!form.donations && Object.values(form.donations).some((v) => v.trim() !== '');
  for (const line of applied) {
    for (const m of matchApplied(line, deductions)) {
      if (m.deduction.id === DONATION_IDS.general) {
        if (typed) continue;
        donations = { ...emptyDonations(), general: String(givenFor(m.amount)) };
      } else if (next[m.deduction.id]?.on) continue;
      else next[m.deduction.id] = m.choice;
      marked.push(m.deduction.id);
    }
  }
  return { choices: next, ...(donations ? { donations } : {}), marked };
}
