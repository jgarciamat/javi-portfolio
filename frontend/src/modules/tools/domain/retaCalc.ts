import {
  RETA_BRACKETS_2026,
  RETA_FLAT_RATE,
  RETA_GENERAL_EXPENSES,
  RETA_GENERAL_EXPENSES_COMPANY,
  RETA_RATE_2026,
  SMI_2026_YEAR,
  type RetaBracket,
} from '../data/reta2026';

/** Autónomo persona física (7 % de gastos genéricos) o societario/administrador (3 %). */
export type RetaPerson = 'individual' | 'company';

export interface RetaInput {
  /** Rendimiento neto mensual: ingresos menos gastos deducibles, sin contar la propia cuota. */
  monthlyNet: number;
  person: RetaPerson;
  /** Alta nueva con la cuota reducida («tarifa plana»). */
  flatRate: boolean;
}

export interface RetaQuote {
  /** Lo que se resta por gastos genéricos (euros al mes). */
  deduction: number;
  deductionRate: number;
  /** Rendimiento que decide el tramo, después de los gastos genéricos. */
  computable: number;
  bracket: RetaBracket;
  /** Cuota con la base mínima y con la máxima del tramo (31,5 %). */
  feeMin: number;
  feeMax: number;
  /** Cuota reducida del primer año, si se pide. */
  flatFee: number | null;
  /** Con rendimientos anuales por debajo del SMI, la tarifa plana se puede pedir otros 12 meses. */
  flatRateExtension: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const finite = (n: number) => (Number.isFinite(n) ? n : 0);

/** Cuota mensual de una base de cotización (31,5 % en 2026), redondeada al céntimo. */
export const feeOf = (base: number): number => round2(base * RETA_RATE_2026);

/** Rendimiento neto mensual a partir de los ingresos y gastos del año. */
export const monthlyNetOf = (income: number, expenses: number): number =>
  round2((finite(income) - finite(expenses)) / 12);

/** El tramo de un rendimiento mensual computable. */
export function bracketFor(computable: number): RetaBracket {
  return RETA_BRACKETS_2026.find(
    (b) => b.to === null || (b.toExclusive ? computable < b.to : computable <= b.to)
  ) as RetaBracket;
}

export function retaQuote(input: RetaInput): RetaQuote {
  const deductionRate =
    input.person === 'company' ? RETA_GENERAL_EXPENSES_COMPANY : RETA_GENERAL_EXPENSES;
  const net = Math.max(0, finite(input.monthlyNet));
  const deduction = round2(net * deductionRate);
  const computable = round2(net - deduction);
  const bracket = bracketFor(computable);
  return {
    deduction,
    deductionRate,
    computable,
    bracket,
    feeMin: feeOf(bracket.baseMin),
    feeMax: feeOf(bracket.baseMax),
    flatFee: input.flatRate ? RETA_FLAT_RATE : null,
    flatRateExtension: input.flatRate && computable * 12 < SMI_2026_YEAR,
  };
}
