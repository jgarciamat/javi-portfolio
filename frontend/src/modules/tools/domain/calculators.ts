/** The 50/30/20 rule: needs / wants / saving of a net monthly income. */
export function budgetRule(income: number): { needs: number; wants: number; saving: number } {
  const safe = Math.max(0, Number.isFinite(income) ? income : 0);
  const round = (n: number) => Math.round(n * 100) / 100;
  return { needs: round(safe * 0.5), wants: round(safe * 0.3), saving: round(safe * 0.2) };
}

export interface SavingsInput {
  initial: number;
  monthly: number;
  /** Effective annual return in % (what 1000 € become after a year without deposits). */
  annualRatePct: number;
  years: number;
}

export interface SavingsYear {
  year: number;
  balance: number;
  contributed: number;
}

export interface SavingsResult {
  finalBalance: number;
  contributed: number;
  interest: number;
  yearly: SavingsYear[];
}

const MAX_YEARS = 60;

/** Compound growth with a deposit at the end of every month. */
export function simulateSavings(input: SavingsInput): SavingsResult {
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const initial = clean(input.initial);
  const monthly = clean(input.monthly);
  const rate = Number.isFinite(input.annualRatePct) ? Math.max(-100, input.annualRatePct) : 0;
  const years = Math.min(MAX_YEARS, Math.max(0, Math.floor(clean(input.years))));
  const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
  const round = (n: number) => Math.round(n * 100) / 100;

  let balance = initial;
  let contributed = initial;
  const yearly: SavingsYear[] = [];
  for (let month = 1; month <= years * 12; month++) {
    balance = balance * (1 + monthlyRate) + monthly;
    contributed += monthly;
    if (month % 12 === 0) {
      yearly.push({ year: month / 12, balance: round(balance), contributed: round(contributed) });
    }
  }
  return {
    finalBalance: round(balance),
    contributed: round(contributed),
    interest: round(balance - contributed),
    yearly,
  };
}

export interface LoanResult {
  /** Monthly payment (French amortisation: fixed instalments). */
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
}

const MAX_LOAN_YEARS = 50;

/** Fixed monthly instalment of a loan or mortgage and what it costs in total. */
export function loanPayment(input: {
  principal: number;
  annualRatePct: number;
  years: number;
}): LoanResult {
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const principal = clean(input.principal);
  const years = Math.min(MAX_LOAN_YEARS, clean(input.years));
  const months = Math.round(years * 12);
  const round = (n: number) => Math.round(n * 100) / 100;
  if (principal === 0 || months === 0) return { monthlyPayment: 0, totalPaid: 0, totalInterest: 0 };
  const monthlyRate = clean(input.annualRatePct) / 100 / 12;
  const payment =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  const totalPaid = payment * months;
  return {
    monthlyPayment: round(payment),
    totalPaid: round(totalPaid),
    totalInterest: round(totalPaid - principal),
  };
}

export interface VatResult {
  base: number;
  vat: number;
  total: number;
}

/** The three amounts of an invoice, from the amount without VAT (`withVat` false) or with it. */
export function vatBreakdown(amount: number, ratePct: number, withVat: boolean): VatResult {
  const safe = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const rate = Math.max(0, Number.isFinite(ratePct) ? ratePct : 0) / 100;
  const round = (n: number) => Math.round(n * 100) / 100;
  const base = withVat ? safe / (1 + rate) : safe;
  const total = withVat ? safe : safe * (1 + rate);
  return { base: round(base), vat: round(total - base), total: round(total) };
}

export interface InflationResult {
  /** What the amount will buy, in today's euros, after the years. */
  worth: number;
  /** What it will cost then to buy what the amount buys today. */
  needed: number;
  lostPct: number;
}

/** Effect of constant yearly inflation on an amount of money. */
export function inflationEffect(
  amount: number,
  inflationPct: number,
  years: number
): InflationResult {
  const safe = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const rate = Math.max(-50, Number.isFinite(inflationPct) ? inflationPct : 0) / 100;
  const n = Math.min(100, Math.max(0, Number.isFinite(years) ? years : 0));
  const factor = Math.pow(1 + rate, n);
  const round = (x: number) => Math.round(x * 100) / 100;
  return {
    worth: round(safe / factor),
    needed: round(safe * factor),
    lostPct: Math.round((1 - 1 / factor) * 1000) / 10,
  };
}

const MAX_GOAL_MONTHS = 1200;

/** Months of saving needed to reach a target (null if it never gets there within 100 years). */
export function monthsToGoal(input: {
  target: number;
  initial: number;
  monthly: number;
  annualRatePct: number;
}): number | null {
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const target = clean(input.target);
  let balance = clean(input.initial);
  if (target === 0 || balance >= target) return 0;
  const monthly = clean(input.monthly);
  const rate = Number.isFinite(input.annualRatePct) ? Math.max(-100, input.annualRatePct) : 0;
  const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
  for (let month = 1; month <= MAX_GOAL_MONTHS; month++) {
    balance = balance * (1 + monthlyRate) + monthly;
    if (balance >= target) return month;
  }
  return null;
}

// ─── Income tax return (Renta, Spain) ─────────────────────────────────────────

export interface RentaInput {
  /** Gross yearly income from work of the main payer. */
  mainIncome: number;
  /** Gross yearly income from every other payer. */
  otherIncome: number;
}

export type RentaReason = 'overLimit' | 'twoPayers' | 'none';

export const RENTA_LIMIT_ONE_PAYER = 22_000;
// LIRPF art. 96.3 (BOE-A-2006-20764, consolidated text, checked 19-10-2026): "El límite ... será de
// 15.876 euros" with more than one payer when the second and following pay more than 1,500 €.
export const RENTA_LIMIT_SEVERAL_PAYERS = 15_876;
export const RENTA_SECOND_PAYER_MIN = 1_500;

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Whether the person has to file the return because of the income from work: more than
 * 22,000 € in total, or more than 15,876 € when the payers after the first paid more than
 * 1,500 €. Other reasons (rent, capital gains…) exist: this is only a guide.
 */
export function rentaObligation(input: RentaInput): { required: boolean; reason: RentaReason } {
  const main = positive(input.mainIncome);
  const others = positive(input.otherIncome);
  const total = main + others;
  if (total > RENTA_LIMIT_ONE_PAYER) return { required: true, reason: 'overLimit' };
  if (total > RENTA_LIMIT_SEVERAL_PAYERS && others > RENTA_SECOND_PAYER_MIN) {
    return { required: true, reason: 'twoPayers' };
  }
  return { required: false, reason: 'none' };
}

/** Tax saved by paying into a pension plan: up to 1,500 € a year lowers the taxable base. */
export function pensionSaving(contribution: number, marginalRatePct: number): number {
  const reducible = Math.min(positive(contribution), 1_500);
  return Math.round(reducible * (positive(marginalRatePct) / 100) * 100) / 100;
}

/** Deduction for donations to NGOs: 80 % of the first 250 €, 40 % of the rest. */
export function donationDeduction(amount: number): number {
  const donated = positive(amount);
  return Math.round((Math.min(donated, 250) * 0.8 + Math.max(0, donated - 250) * 0.4) * 100) / 100;
}
