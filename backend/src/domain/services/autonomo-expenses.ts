import { VatRate } from '@domain/ports/repositories';
import type { VatMovement } from './autonomo-vat';
import type { DeductionUse, PurchaseOp, QuarterVat } from './autonomo-vat-data';
import { splitVat } from './tax';

/** Expense kinds the person can enter by hand, each with its own rule for what can be deducted. */
export const EXPENSE_KINDS = [
  'quota',
  'supplies',
  'vehicle',
  'meals',
  'clients',
  'health',
  'staff',
  'training',
  'management',
  'software',
  'rent',
  'advertising',
  'material',
  'other',
  'fines',
] as const;
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

/** Daily limit of the meals of the owner: eating out in Spain without staying overnight (art. 9 RIRPF). */
export const MEALS_DAILY_LIMIT = 26.67;
/** Health insurance of the owner, the spouse and the children living at home: per person and year. */
export const HEALTH_PER_PERSON = 500;
/** Share of the home that is used for work counts at 30 % of that proportion (art. 30 LIRPF). */
export const SUPPLIES_RATE = 0.3;

export interface ManualExpense {
  kind: ExpenseKind;
  /**
   * Amount paid, VAT included; for a purchase whose invoice carries no Spanish VAT (intra-EU,
   * reverse charge, import), its base, and `vatRate` is the rate of the VAT self-assessed or paid
   * at customs.
   */
  amount: number;
  vatRate: VatRate;
  /** Meals: days eating out that the amount covers. */
  days?: number;
  /** What the purchase is for VAT (domestic when absent). */
  op?: PurchaseOp;
  /** An investment good (art. 108 LIVA). */
  investment?: boolean;
  /** For the special prorrata: used in taxed operations only, in exempt ones only, or in both. */
  use?: DeductionUse;
}

/** Sales without VAT on the invoice, by the box of the 303 they go to (bases, euros). */
export interface ManualSales {
  intraEU?: number;
  exports?: number;
  notSubject?: number;
  oss?: number;
  ossSubject?: number;
  reverse?: number;
  exempt?: number;
  exemptOccasional?: number;
  /** Not subject by art. 7 LIVA: income of the 130 only. */
  nonVat?: number;
}

export interface ManualQuarter {
  /** Income without VAT, by VAT rate. */
  income: { r21: number; r10: number; r4: number; r0: number };
  expenses: ManualExpense[];
  /** The rest of what the VAT of the quarter needs (older data has none). */
  vat?: (QuarterVat & { sales?: ManualSales | null }) | null;
}

/** Things that stay the same through the year and decide how some expenses are deducted. */
export interface ManualProfile {
  /** Square metres of the home used for work, and the total of the home. */
  workArea: number;
  homeArea: number;
  /** The car is used only for the activity (transport, sales representatives...). */
  vehicleExclusive: boolean;
  /** People covered by the health insurance (owner, spouse, children under 25 at home). */
  healthPeople: number;
  /** The health insurance covers somebody with a disability (1,500 euros each instead of 500). */
  healthDisability: boolean;
}

export interface ManualData {
  quarters: [ManualQuarter, ManualQuarter, ManualQuarter, ManualQuarter];
  profile: ManualProfile;
}

export interface ExpenseLine {
  quarter: number;
  kind: ExpenseKind;
  amount: number;
  /** What counts for the income tax. */
  deductible: number;
  /** VAT that can be deducted. */
  vatDeductible: number;
  /** Why the rest is not deductible, in short. */
  note: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

interface Shares {
  irpf: number;
  vat: number;
  note: string;
}

/** What share of an expense counts for the income tax and for the VAT. */
export function sharesOf(e: ManualExpense, profile: ManualProfile): Shares {
  const base = e.amount / (1 + e.vatRate / 100);
  switch (e.kind) {
    case 'supplies': {
      const share =
        profile.homeArea > 0 ? Math.min(1, profile.workArea / profile.homeArea) * SUPPLIES_RATE : 0;
      return { irpf: share, vat: share, note: 'supplies' };
    }
    case 'vehicle':
      return e.amount <= 0 || profile.vehicleExclusive
        ? { irpf: 1, vat: 1, note: '' }
        : { irpf: 0, vat: 0.5, note: 'vehicle' };
    case 'meals': {
      const limit = (e.days ?? 0) * MEALS_DAILY_LIMIT;
      const share = base > 0 ? Math.min(1, limit / e.amount) : 0;
      return { irpf: share, vat: share, note: share < 1 ? 'meals' : '' };
    }
    case 'clients':
      return { irpf: 1, vat: 0, note: 'clients' };
    case 'health': {
      const limit = profile.healthPeople * (profile.healthDisability ? 1500 : HEALTH_PER_PERSON);
      return { irpf: e.amount > 0 ? Math.min(1, limit / e.amount) : 0, vat: 0, note: 'health' };
    }
    case 'fines':
      return { irpf: 0, vat: 0, note: 'fines' };
    default:
      return { irpf: 1, vat: 1, note: '' };
  }
}

const SALES: [keyof ManualSales, NonNullable<VatMovement['op']>][] = [
  ['intraEU', 'intraEU'],
  ['exports', 'export'],
  ['notSubject', 'notSubject'],
  ['oss', 'oss'],
  ['ossSubject', 'ossSubject'],
  ['reverse', 'reverse'],
  ['exempt', 'exempt'],
  ['exemptOccasional', 'exemptOccasional'],
  ['nonVat', 'nonVat'],
];

/** The manual data as movements of the quarters (the middle month), with their deduction shares. */
export function manualMovements(
  year: number,
  data: ManualData
): { movements: VatMovement[]; lines: ExpenseLine[] } {
  const movements: VatMovement[] = [];
  const lines: ExpenseLine[] = [];
  data.quarters.forEach((quarter, index) => {
    const date = `${year}-${String(index * 3 + 2).padStart(2, '0')}-15`;
    const income: [VatRate, number][] = [
      [21, quarter.income.r21],
      [10, quarter.income.r10],
      [4, quarter.income.r4],
      [0, quarter.income.r0],
    ];
    for (const [vatRate, base] of income) {
      if (base > 0) {
        movements.push({
          date,
          type: 'INCOME',
          vatRate,
          amountCents: Math.round(base * (1 + vatRate / 100) * 100),
        });
      }
    }
    // Sales without VAT: income of the 130 too, each in its box of the 303.
    const sales = quarter.vat?.sales ?? {};
    for (const [key, op] of SALES) {
      const base = sales[key] ?? 0;
      if (base > 0) {
        movements.push({
          date,
          type: 'INCOME',
          vatRate: 0,
          amountCents: Math.round(base * 100),
          op,
        });
      }
    }
    for (const e of quarter.expenses) {
      // An investment good is depreciated for the income tax, not deducted at once (art. 30 RIRPF):
      // the 130 leaves it out and says so.
      const shares = e.investment
        ? { ...sharesOf(e, data.profile), irpf: 0, note: 'investment' }
        : sharesOf(e, data.profile);
      const amountCents = Math.round(e.amount * 100);
      const op = e.op ?? 'domestic';
      movements.push({
        date,
        type: 'EXPENSE',
        vatRate: e.vatRate,
        amountCents,
        irpfShare: shares.irpf,
        vatShare: shares.vat,
        ...(op !== 'domestic' ? { op } : {}),
        ...(e.investment ? { investment: true } : {}),
        ...(e.use && e.use !== 'common' ? { use: e.use } : {}),
      });
      // Without Spanish VAT on the invoice, the amount is the base and the VAT is self-assessed.
      const { baseCents, vatCents } =
        op === 'domestic'
          ? splitVat(amountCents, e.vatRate)
          : { baseCents: amountCents, vatCents: Math.round((amountCents * e.vatRate) / 100) };
      const vatDeductible = vatCents * shares.vat;
      const deductible = baseCents * shares.irpf + vatCents * Math.max(0, shares.irpf - shares.vat);
      lines.push({
        quarter: index + 1,
        kind: e.kind,
        amount: round2(e.amount),
        deductible: round2(deductible / 100),
        vatDeductible: round2(vatDeductible / 100),
        note: shares.note,
      });
    }
  });
  return { movements, lines };
}
