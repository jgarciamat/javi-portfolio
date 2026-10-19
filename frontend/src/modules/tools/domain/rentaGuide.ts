import type { Disability } from './rentaCalc';
import type { Deduction } from './rentaData';
import type { DraftReading } from './rentaDraft';
import { number, type JointChoice, type RentaForm } from './rentaForm';

/** The guided questions, in the order they are asked. They fill in the same form as the expert mode. */
export const QUESTIONS = [
  'ccaa',
  'age',
  'income',
  'disability',
  'family',
  'joint',
  'property',
  'savings',
  'plan',
  'housing',
] as const;
export type QuestionId = (typeof QUESTIONS)[number];

/** The answers of one tap of each question (ccaa and age are typed). */
export const OPTIONS = {
  income: ['work', 'pension', 'benefits', 'mixed'],
  disability: ['0', '33', '65'],
  active: ['yes', 'no'],
  family: ['no', 'yes'],
  joint: ['none', 'couple', 'single'],
  property: ['no', 'rented', 'other', 'both'],
  savings: ['no', 'yes'],
  plan: ['no', 'yes'],
  housing: ['no', 'rent', 'mortgage', 'both'],
} as const;

/** Questions answered by typing, not by picking an option. */
export const TYPED: QuestionId[] = ['ccaa', 'age'];

/** Deductions for the rent of the home the person lives in (not the ones for landlords). */
const RENT = /alquiler|arrendamiento/;
const LANDLORD = /arrendador|puesta|vacias|adecuacion|gastos-arrendamiento|rehabilitacion/;
/** Deductions for a home bought before 2013 (State's transitional regime and the regional parts). */
const MORTGAGE =
  /vivienda-habitual-transitorio|tramo-autonomico-vivienda|regimen-transitorio-vivienda/;

/** The deductions the housing question is about: for renting the home, or for a mortgage before 2013. */
export function housingDeductions(deductions: Deduction[], kind: 'rent' | 'mortgage'): Deduction[] {
  return deductions.filter((d) =>
    kind === 'rent'
      ? d.group === 'housing' && RENT.test(d.id) && !LANDLORD.test(d.id)
      : MORTGAGE.test(d.id)
  );
}

/** What the income says about the person, when it was not answered: from the amounts typed. */
function incomeOf(form: RentaForm): string | null {
  const gross = number(form.gross);
  const nonSalary = number(form.nonSalary);
  if (gross <= 0) return null;
  if (nonSalary <= 0) return 'work';
  return nonSalary < gross ? 'mixed' : 'pension';
}

/** Whether to ask if the person works: only a disability with pay that is not all from a job (or all not). */
export function asksActive(form: RentaForm): boolean {
  const income = answerOf(form, 'income');
  return form.disability > 0 && (income === 'mixed' || income === null);
}

/**
 * Not an active worker (no extra expenses for a disability): a pension or benefits only, or a mix
 * where the person said they do not work. A job only is an active worker.
 */
function retiredFor(income: string | null, active: string | undefined, current: boolean): boolean {
  if (income === 'work') return false;
  if (income === 'pension' || income === 'benefits') return true;
  return active === undefined ? current : active === 'no';
}

/** The kind of income: the amounts, with the pick where they cannot tell. */
function incomeAnswer(form: RentaForm, picked: string | null): string | null {
  // A mix picked before typing how much of it is a pension stays a mix.
  if (picked === 'mixed' && form.nonSalary.trim() === '') return picked;
  const typed = incomeOf(form);
  // A pension and benefits look the same in the amounts: the pick tells them apart.
  const same = picked === 'benefits' ? 'pension' : picked;
  return typed === null || typed === same ? picked ?? typed : typed;
}

function propertyAnswer(form: RentaForm, picked: string | null): string | null {
  const others = form.unrented.length > 0;
  if (form.rentalOn) return others ? 'both' : 'rented';
  if (others) return 'other';
  return picked === null ? null : 'no';
}

/** How each question reads its answer from the form (`picked`: the option the person chose). */
const READ: Record<QuestionId, (form: RentaForm, picked: string | null) => string | null> = {
  ccaa: (form) => form.ccaaId || null,
  age: (form) => form.age.trim() || null,
  income: incomeAnswer,
  disability: (form) => String(form.disability),
  family: (form, picked) => (form.children.length + form.ascendants.length > 0 ? 'yes' : picked),
  joint: (form) => form.joint || null,
  property: propertyAnswer,
  savings: (form, picked) => (number(form.savings) > 0 ? 'yes' : picked),
  plan: (form, picked) =>
    number(form.pension) + number(form.pensionEmployer) > 0 ? 'yes' : picked,
  housing: (_form, picked) => picked,
};

/** The option of a question: what the form says (in either mode), with what the person picked where the data cannot tell. */
export function answerOf(form: RentaForm, q: QuestionId): string | null {
  return READ[q](form, form.answers[q] ?? null);
}

export const isAnswered = (form: RentaForm, q: QuestionId): boolean => q in form.answers;

/** Where the interview goes on: the first question not answered yet (the summary when all are). */
export const firstOpen = (form: RentaForm): number => {
  const open = QUESTIONS.findIndex((q) => !isAnswered(form, q));
  return open < 0 ? QUESTIONS.length : open;
};

/** The property question as a draft answers it: rented, at the owner's disposal, both or nothing. */
function draftProperty(r: DraftReading): string | null {
  const rents = r.rentalIncome !== null;
  const others = r.unrented.length > 0;
  if (rents) return others ? 'both' : 'rented';
  return others ? 'other' : null;
}

/** The questions a draft answers: only what it says for sure (not the kind of income, for one). */
export function draftAnswers(r: DraftReading): Record<string, string> {
  const found: [QuestionId, string | null][] = [
    ['ccaa', r.ccaaId],
    ['age', r.age === null ? null : String(r.age)],
    ['disability', r.disability === null ? null : String(r.disability)],
    ['family', r.childAges.length + r.ascendantAges.length > 0 ? 'yes' : null],
    ['property', draftProperty(r)],
    ['savings', r.savings === null ? null : 'yes'],
    ['plan', r.pension === null ? null : 'yes'],
  ];
  return Object.fromEntries(found.filter((entry): entry is [QuestionId, string] => !!entry[1]));
}

const has = (option: string, part: string) => option === part || option === 'both';

/** The housing deductions of what the person said they do not pay, turned off. */
function housingPatch(form: RentaForm, option: string, deductions: Deduction[]) {
  const choices = { ...form.choices };
  for (const kind of ['rent', 'mortgage'] as const) {
    if (has(option, kind)) continue;
    for (const d of housingDeductions(deductions, kind)) {
      const current = choices[d.id];
      if (current) choices[d.id] = { ...current, on: false };
    }
  }
  return {
    choices,
    rentPaid: has(option, 'rent') ? form.rentPaid : '',
    mortgagePaid: has(option, 'mortgage') ? form.mortgagePaid : '',
  };
}

type Patch = (form: RentaForm, option: string, deductions: Deduction[]) => Partial<RentaForm>;

/** Whether the person is an active worker after a pick of income, disability or work. */
const retiredAfter = (form: RentaForm, income: string | null, active: string | undefined) =>
  retiredFor(income, active, form.retired);

/** The fields each answer means. "No" clears what the question is about. */
const PATCH: Partial<Record<QuestionId | 'active', Patch>> = {
  income: (form, option) => ({
    nonSalary:
      option === 'pension' || option === 'benefits'
        ? form.gross
        : option === 'work'
        ? ''
        : form.nonSalary,
    retired: retiredAfter(form, option, form.answers.active),
  }),
  disability: (form, option) => ({
    disability: Number(option) as Disability,
    retired: retiredAfter(form, answerOf(form, 'income'), form.answers.active),
  }),
  active: (form, option) => ({ retired: retiredAfter(form, answerOf(form, 'income'), option) }),
  family: (_form, option) =>
    option === 'no' ? { children: [], ascendants: [], shared: false } : {},
  joint: (form, option) => ({
    joint: option as JointChoice,
    otherParent: option === 'single' && form.otherParent,
  }),
  property: (form, option) => {
    const others = option === 'other' || option === 'both';
    const rows =
      form.unrented.length > 0 ? form.unrented : [{ value: '', revised: false, days: '' }];
    return { rentalOn: option === 'rented' || option === 'both', unrented: others ? rows : [] };
  },
  savings: (_form, option) => (option === 'no' ? { savings: '' } : {}),
  plan: (_form, option) => (option === 'no' ? { pension: '', pensionEmployer: '' } : {}),
  housing: housingPatch,
};

/**
 * What picking an option changes in the form: the answer itself and the fields it means, so the
 * calculation never keeps data the person said they do not have.
 */
export function choose(
  form: RentaForm,
  q: QuestionId | 'active',
  option: string,
  deductions: Deduction[] = []
): Partial<RentaForm> {
  const answers = { ...form.answers, [q]: option };
  const patch = PATCH[q];
  return { answers, ...(patch ? patch(form, option, deductions) : {}) };
}

/** The gross typed in a guided question: a pension or benefits only keeps all of it as non-salary. */
export function grossPatch(form: RentaForm, gross: string): Partial<RentaForm> {
  const income = answerOf(form, 'income');
  return income === 'pension' || income === 'benefits' ? { gross, nonSalary: gross } : { gross };
}

/** A housing deduction ticked in the guided question: a percentage one takes the amount paid. */
export function tickHousing(
  form: RentaForm,
  d: Deduction,
  on: boolean,
  kind: 'rent' | 'mortgage'
): Partial<RentaForm> {
  const paid = kind === 'rent' ? form.rentPaid : form.mortgagePaid;
  const current = form.choices[d.id] ?? { on: false, amount: '', units: '' };
  const amount = d.kind === 'percent' ? paid : current.amount;
  return { choices: { ...form.choices, [d.id]: { ...current, on, amount } } };
}

/** The rent (or mortgage) paid: kept for the question and given to the ticked percentage deductions. */
export function paidPatch(
  form: RentaForm,
  kind: 'rent' | 'mortgage',
  value: string,
  deductions: Deduction[]
): Partial<RentaForm> {
  const choices = { ...form.choices };
  for (const d of housingDeductions(deductions, kind)) {
    const current = choices[d.id];
    if (d.kind === 'percent' && current?.on) choices[d.id] = { ...current, amount: value };
  }
  return kind === 'rent' ? { rentPaid: value, choices } : { mortgagePaid: value, choices };
}
