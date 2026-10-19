import { parseDecimal } from '@shared/utils/numbers';
import type {
  Ascendant,
  Child,
  DeductionChoice,
  Disability,
  Family,
  JointMember,
  RentaInput,
} from './rentaCalc';
import type { RentaCcaa, RentaState } from './rentaData';
import type { RentaProperty, RentaWorkExtras } from './rentaExtras';
import type { SavingsDetail } from './rentaGains';
import type { ActivityInput } from './rentaActivity';
import { farm2025 } from '../data/renta/agrario-2025';
import { modules2025 } from '../data/renta/modulos-2025';

export interface ChildForm {
  age: string;
  disability: Disability;
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

/** Whether the person can file with a family unit: '' not answered yet. */
export type JointChoice = '' | 'none' | 'couple' | 'single';

export interface Choice {
  on: boolean;
  amount: string;
  units: string;
  /** Collected in advance in the year with the modelo 140 or 143 (refundable deductions only). */
  advance?: string;
}

/** Everything the person types, as text, in the order of the steps. */
export interface RentaForm {
  ccaaId: string;
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
  spousePlan: string;
  compensatory: string;
  /** Maintenance paid to the children by a court decision (they do not live with the person). */
  childSupport?: string;
  /** Pension plan collected as a lump sum, the part from contributions up to 2006 (DT 12.ª). */
  pensionCapital2006?: string;
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

/** Rent expenses that cannot together pass the rent: interest, financing and repairs. */
const CAPPED_EXPENSE = /interes|financiaci|reparaci|conservaci/;

export interface RentaData {
  state: RentaState;
  ccaa: RentaCcaa;
  extras: RentaWorkExtras;
  property: RentaProperty;
  workReduction: (netIncome: number) => number;
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

/**
 * The rental figures: the expenses with interest and repairs held to the rent, and the depreciation.
 * LIRPF art. 23.1.a.1.º (BOE-A-2006-20764, checked 19-10-2026): interest and repairs together "no
 * podrá exceder ... de la cuantía de los rendimientos íntegros"; "el exceso podrá deducirse en los
 * cuatro años siguientes". Modelo 100 of 2025 (BOE-A-2026-7041, page 7): what is pending from
 * 2021-2024 goes first (0103-0104), then this year's (0107), with [0104] + [0107] up to [0102];
 * the rest of this year's is box 0108.
 */
export function rentalOf(form: RentaForm, property: RentaProperty): RentaInput['rental'] {
  if (!form.rentalOn) return null;
  const income = number(form.rentalIncome);
  let capped = 0;
  let free = 0;
  for (const item of property.rental.expenses) {
    const amount = number(form.rentalExpenses[item.id]);
    if (CAPPED_EXPENSE.test(item.id)) capped += amount;
    else free += amount;
  }
  const reduction = property.rental.reductions.find((r) => r.id === form.rentalReduction);
  const room = Math.max(0, income);
  const pendingApplied = Math.min(Math.max(0, number(form.rentalPendingExcess)), room);
  const current = Math.min(capped, room - pendingApplied);
  return {
    income,
    expenses: free + pendingApplied + current,
    amortization: (number(form.construction) * property.rental.amortizationRate) / 100,
    reductionPercent: reduction?.percent ?? 0,
    pendingApplied,
    excessCarry: capped - current,
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
export function unrentedOf(form: RentaForm, year: number): { standard: number; revised: number } {
  const totals = { standard: 0, revised: 0 };
  const full = daysInYear(year);
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

/** The calculation input for what is in the form. */
export function toInput(form: RentaForm, data: RentaData): RentaInput {
  return {
    gross: number(form.gross),
    socialSecurity: socialSecurityOf(form),
    withheld: number(form.withheld),
    nonSalaryIncome: number(form.nonSalary),
    retired: form.retired,
    workExpensesExtra: workExpensesOf(form, data.extras),
    geographicMobility: form.mobility,
    pensionPlan: number(form.pension),
    pensionPlanEmployer: number(form.pensionEmployer),
    spousePlan: number(form.spousePlan),
    compensatoryPension: number(form.compensatory),
    childSupport: number(form.childSupport),
    pensionCapital2006: number(form.pensionCapital2006),
    rental: rentalOf(form, data.property),
    imputedValues: unrentedOf(form, data.state.year),
    savings: number(form.savings),
    savingsDetail: form.savingsDetail,
    // The tables of the módulos of 2025 (Orden HAC/1347/2024): the year of the return.
    activities: form.activities?.length
      ? { list: form.activities, modules: modules2025, farm: farm2025 }
      : undefined,
    family: familyOf(form),
    state: data.state,
    ccaa: data.ccaa,
    extras: data.extras,
    imputationRates: {
      standard: data.property.imputation.standardRate,
      revised: data.property.imputation.revisedRate,
    },
    choices: choicesOf(form),
    workReduction: data.workReduction,
  };
}
