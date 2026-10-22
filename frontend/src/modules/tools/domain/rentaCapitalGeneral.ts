import { rentaCapitalGeneral as rules } from '../data/renta/capital-general';
import { round2 } from './round';

/**
 * Capital mobiliario of the general base (modelo 100 of 2025, apartado B, boxes 0046-0060; Orden
 * HAC/277/2026, BOE-A-2026-7041, page 5): leases of movable goods, businesses or mines (0046),
 * technical assistance (0047), intellectual property of someone who is not the author (0048),
 * industrial property not used in an activity (0050) and the rest (0051). Rules: LIRPF arts. 25.4,
 * 26.1.b (the expenses needed to obtain them), 26.2 (30 % for income of more than two years, on at
 * most 300,000 €) and 46.a (BOE-A-2006-20764, checked 22-10-2026).
 */

export type GeneralCapitalBox = '0046' | '0047' | '0048' | '0050' | '0051';

/** A loan to a related company: art. 46.a sends the interest of the excess to the general base. */
export interface RelatedLoan {
  /** Interest of the year. */
  interest: number;
  /** Capital lent, and the company's own funds in the last balance closed before 31 December. */
  loan: number;
  ownFunds: number;
  /** The taxpayer's share in the company (%); empty: 25, when the link is not by shares. */
  share?: number;
}

export interface GeneralCapitalItem {
  box: GeneralCapitalBox;
  /** A short name of one's own («Cafetería»): never the real address. */
  label: string;
  income: number;
  /** Expenses needed to obtain it and the depreciation of the goods (art. 26.1.b). */
  expenses: number;
  /** Generated in more than two years or notoriously irregular (art. 26.2): 30 % less. */
  irregular?: boolean;
  /** Box 0051 with the interest of a loan to a related company: only its excess comes here. */
  related?: RelatedLoan;
}

export interface GeneralCapitalResult {
  items: {
    label: string;
    box: GeneralCapitalBox;
    income: number;
    expenses: number;
    /** 0054, 0055 and 0056. */
    net: number;
    reduction: number;
    reduced: number;
    /** A related loan: the part of the interest that stays in the savings base. */
    savings: number;
  }[];
  /** Box 0060: what goes to the general base. */
  total: number;
}

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Art. 46.a: the interest of the part of the loan over three times the own funds, in the share of
 * the taxpayer. Manual práctico de Renta 2025, c05, example of «cesión a terceros de capitales
 * propios»: 5,000 × (70,000 − 3 × 50,000 × 40 %) / 70,000 = 714.29 to the general base.
 */
export function relatedLoanSplit(l: RelatedLoan): { general: number; savings: number } {
  const interest = positive(l.interest);
  const loan = positive(l.loan);
  const limit =
    rules.relatedTimes *
    positive(l.ownFunds) *
    (Math.min(100, positive(l.share ?? rules.relatedDefaultShare)) / 100);
  const general = loan > 0 ? round2((interest * Math.max(0, loan - limit)) / loan) : 0;
  return { general, savings: round2(interest - general) };
}

/** The items of the general base, box by box, and their sum (0060). */
export function generalCapitalOf(list: GeneralCapitalItem[]): GeneralCapitalResult {
  const items = list.map((item) => {
    const split = item.related ? relatedLoanSplit(item.related) : null;
    const income = round2(split ? split.general : positive(item.income));
    const expenses = round2(split ? 0 : positive(item.expenses));
    const net = round2(income - expenses);
    const reduction =
      item.irregular && net > 0
        ? round2((Math.min(net, rules.irregularCap) * rules.irregularPercent) / 100)
        : 0;
    return {
      label: item.label,
      box: split ? ('0051' as const) : item.box,
      income,
      expenses,
      net,
      reduction,
      reduced: round2(net - reduction),
      savings: split ? split.savings : 0,
    };
  });
  return { items, total: round2(items.reduce((sum, i) => sum + i.reduced, 0)) };
}
