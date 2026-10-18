import { parseDecimal } from '@shared/utils/numbers';
import type {
  Ascendant,
  Child,
  DeductionChoice,
  Disability,
  Family,
  RentaInput,
} from './rentaCalc';
import type { RentaCcaa, RentaState } from './rentaData';
import type { RentaProperty, RentaWorkExtras } from './rentaExtras';

export interface ChildForm {
  age: string;
  disability: Disability;
}

export interface AscendantForm {
  over75: boolean;
  disability: Disability;
}

/** A property that is not rented: its cadastral value and the months it was available. */
export interface UnrentedForm {
  value: string;
  revised: boolean;
  months: string;
}

export interface Choice {
  on: boolean;
  amount: string;
  units: string;
}

/** Everything the person types, as text, in the order of the steps. */
export interface RentaForm {
  ccaaId: string;
  age: string;
  disability: Disability;
  children: ChildForm[];
  ascendants: AscendantForm[];
  shared: boolean;
  gross: string;
  socialSecurity: string;
  withheld: string;
  /** Pensions and benefits inside the gross: they are not pay from a job. */
  nonSalary: string;
  /** The income is a pension: no extra expenses for a disability. */
  retired: boolean;
  /** Amount per work expense (union fees, legal defence...), by id. */
  workExpenses: Record<string, string>;
  mobility: boolean;
  pension: string;
  pensionEmployer: string;
  spousePlan: string;
  compensatory: string;
  rentalOn: boolean;
  rentalIncome: string;
  /** Amount per deductible rental expense, by id. */
  rentalExpenses: Record<string, string>;
  /** Cost of building the rented property, without the land (it depreciates 3 % a year). */
  construction: string;
  /** The reduction chosen for the rent ('' = none). */
  rentalReduction: string;
  unrented: UnrentedForm[];
  savings: string;
  choices: Record<string, Choice>;
}

export const SOCIAL_SECURITY_RATE = 0.065;

/** Social security has its own field, so it is not asked again among the other work expenses. */
export const SOCIAL_SECURITY_EXPENSE = 'cotizaciones-seguridad-social';

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

/** Union fees, professional association and legal defence, each within its own limit. */
export function workExpensesOf(form: RentaForm, extras: RentaWorkExtras): number {
  return extras.workExpenses.reduce((sum, item) => {
    if (item.id === SOCIAL_SECURITY_EXPENSE) return sum;
    const amount = number(form.workExpenses[item.id]);
    return sum + (item.max === undefined ? amount : Math.min(amount, item.max));
  }, 0);
}

/** The rental figures: the expenses with interest and repairs held to the rent, and the depreciation. */
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
  return {
    income,
    expenses: free + Math.min(capped, income),
    amortization: (number(form.construction) * property.rental.amortizationRate) / 100,
    reductionPercent: reduction?.percent ?? 0,
  };
}

/** Cadastral values of the properties that are not rented, by how they were valued, for the months owned. */
export function unrentedOf(form: RentaForm): { standard: number; revised: number } {
  const totals = { standard: 0, revised: 0 };
  for (const p of form.unrented) {
    const months = Math.min(12, Math.max(0, p.months.trim() === '' ? 12 : number(p.months)));
    totals[p.revised ? 'revised' : 'standard'] += (number(p.value) * months) / 12;
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
      },
    ])
  );
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
    rental: rentalOf(form, data.property),
    imputedValues: unrentedOf(form),
    savings: number(form.savings),
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
