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
