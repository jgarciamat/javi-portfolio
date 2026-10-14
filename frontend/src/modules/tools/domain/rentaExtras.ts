import type { TaxBracket } from './rentaData';

/** An expense that lowers the net income from work, beyond the general 2,000 euros. */
export interface WorkExpense {
  id: string;
  title: string;
  /** Plain explanation (max 220 characters). */
  summary: string;
  /** Maximum per year in euros, when there is one. */
  max?: number;
  url: string;
}

/** Contributions that lower the tax base (pension plans and similar). */
export interface BaseReduction {
  id: string;
  title: string;
  summary: string;
  /** Maximum per year in euros, when there is one. */
  max?: number;
  url: string;
}

/** Extra rules of the State for income from work, the tax base and savings (Renta 2025). */
export interface RentaWorkExtras {
  /** Expenses of income from work: union fees, professional association, legal defence... */
  workExpenses: WorkExpense[];
  /** Extra expense for a change of residence for work reasons (euros per year). */
  geographicMobilityExtra: number;
  /** Reductions of the general tax base beyond the pension plan limits already in the State data. */
  baseReductions: BaseReduction[];
  /** Scales of the savings tax base (interest, dividends, capital gains): the State's and the region's half. */
  savingsScale: { state: TaxBracket[]; regional: TaxBracket[]; notes: string; url: string };
  /** Anything else the calculation needs and the agent found (plain Spanish). */
  notes: string[];
  source: string;
}

export interface PropertyExpense {
  id: string;
  title: string;
  summary: string;
  /** Limit of the expense in plain words (e.g. "junto con las reparaciones, hasta el importe de los ingresos"). */
  limitNote?: string;
  url: string;
}

/** A reduction of the net rent of a rented property (Renta 2025 rules). */
export interface RentalReduction {
  id: string;
  /** Percentage of the net rent that is not taxed. */
  percent: number;
  title: string;
  summary: string;
  requirements: string;
  url: string;
}

/** Other things that matter for property: sales, exemptions and the main home. */
export interface PropertyNote {
  id: string;
  title: string;
  summary: string;
  requirements: string;
  url: string;
}

export interface RentaProperty {
  /** Properties the person owns but does not rent or live in are taxed on a share of their cadastral value. */
  imputation: {
    /** % of the cadastral value (not revised in the last 10 years) and (revised). */
    standardRate: number;
    revisedRate: number;
    summary: string;
    requirements: string;
    url: string;
  };
  rental: {
    /** Yearly depreciation of a rented building, as a % of its construction cost or cadastral value. */
    amortizationRate: number;
    amortizationNote: string;
    expenses: PropertyExpense[];
    reductions: RentalReduction[];
    notes: string;
    url: string;
  };
  /** Sale of a property, exemptions, main-home rules... Information cards. */
  notes: PropertyNote[];
  source: string;
}
