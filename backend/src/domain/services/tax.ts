import { VatRate } from '@domain/ports/repositories';
import { Cents } from '@domain/shared/money';

/** Share of the net income paid in advance each quarter (modelo 130, general case). */
export const IRPF_ADVANCE_RATE = 0.2;

export interface BusinessMovement {
  date: string;
  type: 'INCOME' | 'EXPENSE';
  /** Amount paid or received, VAT included. */
  amountCents: Cents;
  vatRate: VatRate;
  /** Share of an expense that counts for the income tax (default 1). */
  irpfShare?: number;
  /** Share of the VAT of an expense that can be deducted (default 1). */
  vatShare?: number;
}

export interface QuarterTax {
  quarter: 1 | 2 | 3 | 4;
  incomeBaseCents: Cents;
  vatCollectedCents: Cents;
  expenseBaseCents: Cents;
  vatPaidCents: Cents;
  /** VAT collected − VAT paid: positive = to pay (modelo 303), negative = to offset. */
  vatDueCents: Cents;
  netIncomeCents: Cents;
  /** Advance income-tax payment of the quarter (modelo 130), never negative. */
  irpfAdvanceCents: Cents;
}

export interface YearTax {
  year: number;
  quarters: QuarterTax[];
  totals: Omit<QuarterTax, 'quarter'>;
}

/** Splits an amount that includes VAT into its base and its VAT. */
export function splitVat(grossCents: Cents, rate: VatRate): { baseCents: Cents; vatCents: Cents } {
  const baseCents = Math.round(grossCents / (1 + rate / 100));
  return { baseCents, vatCents: grossCents - baseCents };
}

const quarterOf = (date: string): 1 | 2 | 3 | 4 =>
  (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1) as 1 | 2 | 3 | 4;

/**
 * Quarterly VAT and income-tax estimate of the professional movements of a year. It is an
 * estimate for planning (no deductions or special regimes): the tax adviser files the real one.
 */
export function yearlyTax(year: number, movements: BusinessMovement[]): YearTax {
  const quarters: QuarterTax[] = ([1, 2, 3, 4] as const).map((quarter) => ({
    quarter,
    incomeBaseCents: 0,
    vatCollectedCents: 0,
    expenseBaseCents: 0,
    vatPaidCents: 0,
    vatDueCents: 0,
    netIncomeCents: 0,
    irpfAdvanceCents: 0,
  }));
  for (const m of movements) {
    if (!m.date.startsWith(`${year}-`)) continue;
    const q = quarters[quarterOf(m.date) - 1];
    const { baseCents, vatCents } = splitVat(m.amountCents, m.vatRate);
    if (m.type === 'INCOME') {
      q.incomeBaseCents += baseCents;
      q.vatCollectedCents += vatCents;
    } else {
      q.expenseBaseCents += baseCents;
      q.vatPaidCents += vatCents;
    }
  }
  let cumulativeNet = 0;
  let advanced = 0;
  for (const q of quarters) {
    q.vatDueCents = q.vatCollectedCents - q.vatPaidCents;
    q.netIncomeCents = q.incomeBaseCents - q.expenseBaseCents;
    cumulativeNet += q.netIncomeCents;
    q.irpfAdvanceCents = Math.max(0, Math.round(cumulativeNet * IRPF_ADVANCE_RATE) - advanced);
    advanced += q.irpfAdvanceCents;
  }
  const sum = (pick: (q: QuarterTax) => number): number =>
    quarters.reduce((s, q) => s + pick(q), 0);
  return {
    year,
    quarters,
    totals: {
      incomeBaseCents: sum((q) => q.incomeBaseCents),
      vatCollectedCents: sum((q) => q.vatCollectedCents),
      expenseBaseCents: sum((q) => q.expenseBaseCents),
      vatPaidCents: sum((q) => q.vatPaidCents),
      vatDueCents: sum((q) => q.vatDueCents),
      netIncomeCents: sum((q) => q.netIncomeCents),
      irpfAdvanceCents: sum((q) => q.irpfAdvanceCents),
    },
  };
}
