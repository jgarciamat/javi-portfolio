import { parseDecimal } from '@shared/utils/numbers';
import type {
  Ascendant,
  Child,
  ChildIncome,
  DeductionChoice,
  Disability,
  Family,
  JointMember,
  RentaInput,
} from './rentaCalc';
import type { RentaCcaa, RentaState } from './rentaData';
import type { GeneralCapitalItem } from './rentaCapitalGeneral';
import type { RentaProperty, RentaWorkExtras } from './rentaExtras';
import type { SavingsDetail } from './rentaGains';
import type { ActivityInput, FarmIndex, ModuleActivity } from './rentaActivity';
import { farm2025 } from '../data/renta/agrario-2025';
import { modules2025 } from '../data/renta/modulos-2025';
import { round2 } from './round';
import type { ResidenceForm } from './rentaResidence';
import type { CheckAnswers } from './rentaRequirements';
import { emptyProperty, fromLegacy, propertyResult, type PropertyForm } from './rentaRentals';

export interface ChildForm {
  age: string;
  disability: Disability;
  /** Adopted or fostered and registered this year or in the two before (LIRPF art. 58.2). */
  adopted?: boolean;
  /** Their own income (art. 58.1): more than 8,000 €, or a return of theirs with more than 1,800 €. */
  income?: ChildIncome;
}

export interface AscendantForm {
  over75: boolean;
  disability: Disability;
}

/** A property that is not rented: its cadastral value and the days it was available (box 0085). */
export interface UnrentedForm {
  value: string;
  revised: boolean;
  /** Days of the year at the owner's disposal; empty: the whole year. */
  days: string;
}

/** The other person of a joint return: their pay, age and basic income. */
export interface PartnerForm {
  gross: string;
  socialSecurity: string;
  withheld: string;
  /** Pensions and benefits inside the gross. */
  nonSalary: string;
  age: string;
  disability: Disability;
  /** Their income is a pension (or benefits): not an active worker. */
  retired: boolean;
  savings: string;
  pension: string;
}

/** What was given in the year, as typed (see `DonationInput`). */
export interface DonationForm {
  general: string;
  recurrent: string;
  priority: string;
  priorityRecurrent: string;
  other: string;
}

export const emptyDonations = (): DonationForm => ({
  general: '',
  recurrent: '',
  priority: '',
  priorityRecurrent: '',
  other: '',
});

/** Whether the person can file with a family unit: '' not answered yet. */
export type JointChoice = '' | 'none' | 'couple' | 'single';

export interface Choice {
  on: boolean;
  amount: string;
  units: string;
  /** Collected in advance in the year with the modelo 140 or 143 (refundable deductions only). */
  advance?: string;
  /** Months with the right to a deduction by months (maternity), of all the children. */
  months?: string;
  /** Children with the 150 € of maternity for the 30 days of social security after the birth. */
  bonusUnits?: string;
  /** The answers to the questions of its requirements (rentaRequirements.ts). */
  checks?: CheckAnswers;
}

/** Everything the person types, as text, in the order of the steps. */
export interface RentaForm {
  ccaaId: string;
  /** Tax residence (rentaResidence.ts): a non-resident or a foral one is not worked out here. */
  residence?: ResidenceForm;
  age: string;
  disability: Disability;
  /** Needs the help of third parties or has reduced mobility (3,000 € more below 65 %). */
  assistance?: boolean;
  children: ChildForm[];
  ascendants: AscendantForm[];
  shared: boolean;
  gross: string;
  socialSecurity: string;
  withheld: string;
  /** Pensions and benefits inside the gross: they are not pay from a job. */
  nonSalary: string;
  /** Part of the gross paid by the second and following payers (for the obligation to file). */
  secondPayers?: string;
  /** The income is a pension: no extra expenses for a disability. */
  retired: boolean;
  /** Amount per work expense (union fees, legal defence...), by id. */
  workExpenses: Record<string, string>;
  mobility: boolean;
  pension: string;
  pensionEmployer: string;
  /** Own contributions to the employer's plan (art. 52.1.b.1.º) and its dependency premiums. */
  pensionEmploymentOwn?: string;
  dependencyPremiums?: string;
  /** What did not fit in the five years before (art. 52.2): plans and dependency insurance. */
  pensionExcess?: string;
  dependencyExcess?: string;
  spousePlan: string;
  compensatory: string;
  /** Maintenance paid to the children by a court decision (they do not live with the person). */
  childSupport?: string;
  /** Pension plan collected as a lump sum, the part from contributions up to 2006 (DT 12.ª). */
  pensionCapital2006?: string;
  /** Capital mobiliario of the general base (business leases, a loan to a related company…). */
  generalCapital?: GeneralCapitalItem[];
  rentalOn: boolean;
  rentalIncome: string;
  /** Amount per deductible rental expense, by id. */
  rentalExpenses: Record<string, string>;
  /** Cost of building the rented property, without the land (it depreciates 3 % a year). */
  construction: string;
  /** The reduction chosen for the rent ('' = none). */
  rentalReduction: string;
  /** Interest and repairs of 2021-2024 still to deduct (box 0103). */
  rentalPendingExcess?: string;
  /**
   * The rented properties one by one (rentaRentals.ts). When set, the single rental above is not
   * used: it is only read to bring a return typed before into the first property.
   */
  properties?: PropertyForm[];
  unrented: UnrentedForm[];
  savings: string;
  /** Economic activities (direct, módulos or farming), as the engine takes them (rentaActivity.ts). */
  activities?: ActivityInput[];
  /** The savings in detail (interest, sales lot by lot, properties, earlier losses): replaces `savings`. */
  savingsDetail?: SavingsDetail;
  choices: Record<string, Choice>;
  joint: JointChoice;
  partner: PartnerForm;
  /** Single parent: lives with the father or mother of one of the children (no joint reduction). */
  otherParent: boolean;
  /** What was given to NGOs and foundations (rentaDonations.ts): the deduction is worked out from it. */
  donations?: DonationForm;
  /** The option picked in each guided question, by question id. */
  answers: Record<string, string>;
  /** Rent of the home paid in the year, and mortgage paid for a home bought before 2013 (guided). */
  rentPaid: string;
  mortgagePaid: string;
}

export const SOCIAL_SECURITY_RATE = 0.065;

/** Social security has its own field, so it is not asked again among the other work expenses. */
export const SOCIAL_SECURITY_EXPENSE = 'cotizaciones-seguridad-social';

export const emptyPartner = (): PartnerForm => ({
  gross: '',
  socialSecurity: '',
  withheld: '',
  nonSalary: '',
  age: '40',
  disability: 0,
  retired: false,
  savings: '',
  pension: '',
});

export const emptyForm = (initialIncome: string): RentaForm => ({
  ccaaId: '',
  age: '40',
  disability: 0,
  children: [],
  ascendants: [],
  shared: false,
  gross: initialIncome,
  socialSecurity: '',
  withheld: '',
  nonSalary: '',
  retired: false,
  workExpenses: {},
  mobility: false,
  pension: '',
  pensionEmployer: '',
  spousePlan: '',
  compensatory: '',
  rentalOn: false,
  rentalIncome: '',
  rentalExpenses: {},
  construction: '',
  rentalReduction: '',
  unrented: [],
  savings: '',
  choices: {},
  joint: '',
  partner: emptyPartner(),
  otherParent: false,
  answers: {},
  rentPaid: '',
  mortgagePaid: '',
});

export const number = (text: string | undefined): number => {
  const parsed = parseDecimal(text ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
};

export function familyOf(form: RentaForm): Family {
  const children: Child[] = form.children.map((c) => ({
    age: number(c.age),
    disability: c.disability,
    ...(c.adopted ? { adopted: true } : {}),
    ...(c.income ? { income: c.income } : {}),
  }));
  const ascendants: Ascendant[] = form.ascendants.map((a) => ({ ...a }));
  return {
    age: number(form.age),
    disability: form.disability,
    children,
    ascendants,
    sharedChildren: form.shared,
    assistance: form.disability === 33 && form.assistance === true,
  };
}

export interface RentaData {
  state: RentaState;
  ccaa: RentaCcaa;
  extras: RentaWorkExtras;
  property: RentaProperty;
  workReduction: (netIncome: number) => number;
  /** The tables of the módulos of the year; missing: those of 2025, null: the year has none. */
  activityTables?: { modules: ModuleActivity[]; farm: FarmIndex[] } | null;
}

/** Social security used when the person leaves it empty: a share of the pay. */
export const socialSecurityOf = (form: RentaForm): number =>
  form.socialSecurity.trim() === ''
    ? number(form.gross) * SOCIAL_SECURITY_RATE
    : number(form.socialSecurity);

/** The spouse as the calculation needs them (social security, when empty, as a share of the pay). */
export function partnerOf(form: RentaForm): JointMember {
  const p = form.partner;
  return {
    gross: number(p.gross),
    socialSecurity:
      p.socialSecurity.trim() === ''
        ? number(p.gross) * SOCIAL_SECURITY_RATE
        : number(p.socialSecurity),
    withheld: number(p.withheld),
    nonSalaryIncome: number(p.nonSalary),
    retired: p.retired,
    age: number(p.age),
    disability: p.disability,
    savings: number(p.savings),
    pensionPlan: number(p.pension),
  };
}

/** Union fees, professional association and legal defence, each within its own limit. */
export function workExpensesOf(form: RentaForm, extras: RentaWorkExtras): number {
  return extras.workExpenses.reduce((sum, item) => {
    if (item.id === SOCIAL_SECURITY_EXPENSE) return sum;
    const amount = number(form.workExpenses[item.id]);
    return sum + (item.max === undefined ? amount : Math.min(amount, item.max));
  }, 0);
}

/** The rented properties: those typed one by one, or the single rental of before as one. */
export function propertiesOf(form: RentaForm): PropertyForm[] {
  if (!form.rentalOn) return [];
  if (form.properties) return form.properties;
  // Nothing typed in the single rental of before: a new property, let as a home by default.
  const typed =
    form.rentalIncome.trim() !== '' ||
    form.construction.trim() !== '' ||
    Object.values(form.rentalExpenses).some((v) => v.trim() !== '');
  return [typed ? fromLegacy(form) : emptyProperty(1)];
}

/** One property changed: the list is written whole (a return typed before becomes a list). */
export function setProperty(
  form: RentaForm,
  i: number,
  patch: Partial<PropertyForm>
): Partial<RentaForm> {
  return { properties: propertiesOf(form).map((p, j) => (j === i ? { ...p, ...patch } : p)) };
}

/** Another rented property, at the end of the list. */
export function addProperty(form: RentaForm): Partial<RentaForm> {
  const list = propertiesOf(form);
  return { rentalOn: true, properties: [...list, emptyProperty(list.length + 1)] };
}

/** A property taken out: with none left there is no rental. */
export function removeProperty(form: RentaForm, i: number): Partial<RentaForm> {
  const properties = propertiesOf(form).filter((_, j) => j !== i);
  return { properties, rentalOn: properties.length > 0 };
}

/**
 * The rental figures, property by property (rentaRentals.ts): each one with its own limit of
 * interest and repairs, reduction and depreciation (LIRPF art. 23, BOE-A-2006-20764, checked
 * 19-10-2026: the limit is "por cada bien"), then added up for the general base (box 0156).
 */
export function rentalOf(
  form: RentaForm,
  property: RentaProperty,
  year = 2025,
  rates = { standard: property.imputation.standardRate, revised: property.imputation.revisedRate }
): RentaInput['rental'] {
  const list = propertiesOf(form);
  if (list.length === 0) return null;
  const items = list.map((p) => propertyResult(p, property, daysInYear(year), parseDecimal, rates));
  const sum = (pick: (r: (typeof items)[number]) => number) =>
    round2(items.reduce((s, r) => s + pick(r), 0));
  return {
    income: sum((r) => r.income),
    expenses: sum((r) => r.pendingApplied + r.cappedApplied + r.otherExpenses),
    amortization: sum((r) => r.amortization),
    reductionPercent: 0,
    pendingApplied: sum((r) => r.pendingApplied),
    excessCarry: sum((r) => r.excessCarry),
    items,
  };
}

/** The days of a tax year (366 in a leap year). */
export const daysInYear = (year: number): number =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;

/**
 * Cadastral values of the properties that are not rented, by how they were valued, for the days
 * they were available: LIRPF art. 85.1 and AEAT Manual práctico de Renta 2025, c10 (checked
 * 19-10-2026): "la que proporcionalmente corresponda al número de días comprendidos en dicho
 * período" (181 of 365 days, not 6 of 12 months).
 */
export function unrentedOf(
  form: RentaForm,
  year: number,
  rental: RentaInput['rental'] = null
): { standard: number; revised: number } {
  const totals = { standard: 0, revised: 0 };
  const full = daysInYear(year);
  // A rented property imputes rent too for the days it was at the owner's disposal (art. 85).
  for (const r of rental?.items ?? []) totals[r.revised ? 'revised' : 'standard'] += r.imputedValue;
  for (const p of form.unrented) {
    const days = Math.min(full, Math.max(0, p.days.trim() === '' ? full : number(p.days)));
    totals[p.revised ? 'revised' : 'standard'] += (number(p.value) * days) / full;
  }
  return totals;
}

export function choicesOf(form: RentaForm): Record<string, DeductionChoice> {
  return Object.fromEntries(
    Object.entries(form.choices).map(([id, c]) => [
      id,
      {
        on: c.on,
        amount: number(c.amount),
        units: c.units === '' ? Math.max(1, form.children.length) : number(c.units),
        advance: number(c.advance),
        ...(c.months !== undefined && c.months.trim() !== '' ? { months: number(c.months) } : {}),
        ...(c.bonusUnits ? { bonusUnits: number(c.bonusUnits) } : {}),
        ...(c.checks ? { checks: c.checks } : {}),
      },
    ])
  );
}

/** The pay of the first payer and of the others, for the obligation to file (LIRPF art. 96). */
export function obligationIncome(form: RentaForm): { mainIncome: number; otherIncome: number } {
  const gross = number(form.gross);
  const others = Math.min(gross, Math.max(0, number(form.secondPayers)));
  return { mainIncome: gross - others, otherIncome: others };
}

const tablesOf = (data: RentaData) =>
  data.activityTables === undefined
    ? { modules: modules2025, farm: farm2025 }
    : (data.activityTables ?? { modules: [], farm: [] });

/** The calculation input for what is in the form. */
export function toInput(form: RentaForm, data: RentaData): RentaInput {
  const rental = rentalOf(form, data.property, data.state.year);
  // The withholdings on the rent (box 0153) go with the rest to box 0609.
  const rentWithheld = rental?.items?.reduce((s, r) => s + r.withheld, 0) ?? 0;
  return {
    gross: number(form.gross),
    socialSecurity: socialSecurityOf(form),
    withheld: round2(number(form.withheld) + rentWithheld),
    nonSalaryIncome: number(form.nonSalary),
    retired: form.retired,
    workExpensesExtra: workExpensesOf(form, data.extras),
    geographicMobility: form.mobility,
    pensionPlan: number(form.pension),
    pensionPlanEmployer: number(form.pensionEmployer),
    pensionEmploymentOwn: number(form.pensionEmploymentOwn),
    dependencyPremiums: number(form.dependencyPremiums),
    pensionExcess: { plans: number(form.pensionExcess), dependency: number(form.dependencyExcess) },
    spousePlan: number(form.spousePlan),
    compensatoryPension: number(form.compensatory),
    childSupport: number(form.childSupport),
    pensionCapital2006: number(form.pensionCapital2006),
    rental,
    ...(form.generalCapital?.length ? { generalCapital: form.generalCapital } : {}),
    imputedValues: unrentedOf(form, data.state.year, rental),
    savings: number(form.savings),
    savingsDetail: form.savingsDetail,
    // The tables of the módulos of the year of the return (2025: Orden HAC/1347/2024); a year without
    // them gives none, and the result is not shown (rentaRules.ts, blockersOf).
    activities: form.activities?.length ? { list: form.activities, ...tablesOf(data) } : undefined,
    family: familyOf(form),
    state: data.state,
    ccaa: data.ccaa,
    extras: data.extras,
    imputationRates: {
      standard: data.property.imputation.standardRate,
      revised: data.property.imputation.revisedRate,
    },
    choices: choicesOf(form),
    ...(form.donations
      ? {
          donations: {
            general: number(form.donations.general),
            recurrent: number(form.donations.recurrent),
            priority: number(form.donations.priority),
            priorityRecurrent: number(form.donations.priorityRecurrent),
            other: number(form.donations.other),
          },
        }
      : {}),
    workReduction: data.workReduction,
  };
}
