import {
  EMPLOYEE_RATES_2026,
  MANY_CHILDREN_REDUCTION,
  MAX_BASE_2026,
  SHORT_CONTRACT_MIN_RATE,
  SMI_DEDUCTION_2026,
  SOLIDARITY_2026,
  WITHHOLDING_CAP_RATE,
  WITHHOLDING_CAP_UNTIL,
  WITHHOLDING_EXEMPT,
  WITHHOLDING_SCALE,
  type FamilySituation,
} from '../data/payroll2026';
import { rentaState } from '../data/renta/state';
import {
  applyMinimum,
  applyScale,
  mergeMinimums,
  type Disability,
  type FullMinimums,
} from './rentaCalc';
import type { RentaCcaa, RentaState } from './rentaData';
import { workReductionOf } from './rentaWork';

/**
 * Sueldo neto de 2026: cotizaciones de la persona trabajadora a la Seguridad Social y retención del
 * IRPF según el algoritmo de la AEAT (ver `data/payroll2026.ts` para las fuentes). Es una
 * aproximación: no cuenta pagas en especie, atrasos, pensiones compensatorias ni regularizaciones.
 */

export type ContractType = 'indefinite' | 'temporary' | 'short';

export interface SalaryInput {
  /** Salario bruto anual (con las pagas extra). */
  gross: number;
  payments: 12 | 14;
  /** Edad que se cumple en 2026. */
  age: number;
  situation: FamilySituation;
  /** Hijos menores de 25 años (o con discapacidad) que viven con la persona. */
  children: number;
  /** De ellos, los menores de 3 años. */
  under3: number;
  /** Los hijos cuentan a medias con el otro progenitor. */
  sharedChildren: boolean;
  disability: Disability;
  /** Indefinido, temporal de un año o más, o temporal de menos de un año. */
  contract: ContractType;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
/** El tipo se trunca en el segundo decimal (16,4299… → 16,42), sin errores de coma flotante. */
const truncate2 = (n: number) => Math.floor(n * 100 + 1e-7) / 100;
const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const count = (n: number) => Math.min(16, Math.floor(positive(n)));

/** La entrada limpia: nada negativo, sin NaN y no más menores de 3 años que hijos. */
export function cleanSalaryInput(input: SalaryInput): SalaryInput {
  const children = count(input.children);
  return {
    ...input,
    gross: positive(input.gross),
    age: Math.min(120, Math.floor(positive(input.age))),
    children,
    under3: Math.min(children, count(input.under3)),
    // La situación 1 (familia monoparental) exige al menos un hijo.
    situation: input.situation === 1 && children === 0 ? 3 : input.situation,
  };
}

// ─── Seguridad Social ──────────────────────────────────────────────────────────

export interface SocialSecurity {
  /** Base mensual: el bruto anual entre 12 (con la prorrata de las pagas extra), hasta la máxima. */
  monthlyBase: number;
  unemploymentRate: number;
  /** Importes anuales (12 cuotas mensuales redondeadas al céntimo). */
  common: number;
  unemployment: number;
  training: number;
  mei: number;
  solidarity: number;
  total: number;
}

/** Cotización adicional de solidaridad del mes, parte del trabajador, sobre lo que pasa de la base máxima. */
export function solidarityOf(monthlyPay: number): number {
  let from = MAX_BASE_2026;
  let total = 0;
  for (const tier of SOLIDARITY_2026) {
    const to = tier.upTo ?? Infinity;
    if (monthlyPay <= from) break;
    total += (Math.min(monthlyPay, to) - from) * (tier.rate / 100);
    from = to;
  }
  return round2(total);
}

export function socialSecurity(gross: number, contract: ContractType): SocialSecurity {
  const monthlyPay = positive(gross) / 12;
  const base = Math.min(monthlyPay, MAX_BASE_2026);
  const unemploymentRate =
    contract === 'indefinite'
      ? EMPLOYEE_RATES_2026.unemploymentIndefinite
      : EMPLOYEE_RATES_2026.unemploymentTemporary;
  const yearly = (rate: number) => round2(round2(base * (rate / 100)) * 12);
  const parts = {
    common: yearly(EMPLOYEE_RATES_2026.common),
    unemployment: yearly(unemploymentRate),
    training: yearly(EMPLOYEE_RATES_2026.training),
    mei: yearly(EMPLOYEE_RATES_2026.mei),
    solidarity: round2(solidarityOf(monthlyPay) * 12),
  };
  return {
    monthlyBase: round2(base),
    unemploymentRate,
    ...parts,
    total: round2(
      parts.common + parts.unemployment + parts.training + parts.mei + parts.solidarity
    ),
  };
}

// ─── Mínimo personal y familiar ───────────────────────────────────────────────

export interface MinimumPart {
  key: 'personal' | 'age' | 'descendants' | 'disability';
  amount: number;
}

type MinimumAmounts = Pick<
  FullMinimums,
  | 'personal'
  | 'over65'
  | 'over75'
  | 'descendants'
  | 'under3'
  | 'disability33'
  | 'disability65'
  | 'assistance'
>;

/**
 * Mínimo personal y familiar como lo calcula el algoritmo de retenciones: +1.150 € desde los 65
 * años, +1.400 € más desde los 75, 2.400/2.700/4.000/4.500 € por hijo (por orden), +2.800 € por
 * cada menor de 3 años, y 3.000 € (33 %) o 9.000 € + 3.000 € de asistencia (65 %) por discapacidad.
 */
export function familyMinimum(
  input: Pick<SalaryInput, 'age' | 'children' | 'under3' | 'sharedChildren' | 'disability'>,
  m: MinimumAmounts = rentaState.minimums
): { total: number; parts: MinimumPart[] } {
  const parts: MinimumPart[] = [{ key: 'personal', amount: m.personal }];
  // Igual que la renta (rentaCalc.computeMinimum): 65 o 75 años cumplidos a 31 de diciembre
  // (LIRPF arts. 57.2 y 61; Manual práctico de Renta 2025 de la AEAT, «igual o superior a 65»).
  const age = input.age >= 75 ? m.over65 + m.over75 : input.age >= 65 ? m.over65 : 0;
  if (age > 0) parts.push({ key: 'age', amount: age });
  const share = input.sharedChildren ? 0.5 : 1;
  let descendants = input.under3 * m.under3;
  for (let i = 0; i < input.children; i++) {
    descendants += m.descendants[Math.min(i, m.descendants.length - 1)];
  }
  if (descendants > 0) parts.push({ key: 'descendants', amount: round2(descendants * share) });
  const disability =
    input.disability >= 65
      ? m.disability65 + m.assistance
      : input.disability >= 33
        ? m.disability33
        : 0;
  if (disability > 0) parts.push({ key: 'disability', amount: disability });
  return { total: round2(parts.reduce((s, p) => s + p.amount, 0)), parts };
}

// ─── Retención del IRPF ───────────────────────────────────────────────────────

export interface Withholding {
  /** Rendimiento neto: bruto menos cotizaciones. */
  netIncome: number;
  /** 2.000 € de otros gastos, más 3.500 € o 7.750 € con discapacidad. */
  otherExpenses: number;
  /** Reducción por obtención de rendimientos del trabajo (art. 20 LIRPF). */
  workReduction: number;
  /** 600 € con más de dos hijos. */
  childrenReduction: number;
  base: number;
  minimum: { total: number; parts: MinimumPart[] };
  /** Escala aplicada a la base y al mínimo. */
  quota1: number;
  quota2: number;
  quota: number;
  /** Límite por debajo del cual no se retiene (tabla 1). */
  exemptLimit: number;
  exempt: boolean;
  /** La cuota se ha quedado en el 43 % de lo que pasa del límite. */
  capped: boolean;
  /** Se ha subido al 2 % por ser un contrato de menos de un año. */
  minimumRate: boolean;
  /** Tipo de retención (%), truncado en dos decimales. */
  rate: number;
  amount: number;
}

const reductionOf = workReductionOf(rentaState);

/** Gastos del art. 19.2.f LIRPF: 2.000 €, y más para trabajadores activos con discapacidad. */
function otherExpensesOf(disability: Disability, state: RentaState): number {
  const { general, disability33, disability65 } = state.workExpenses;
  return general + (disability >= 65 ? disability65 : disability >= 33 ? disability33 : 0);
}

/** El límite de la tabla 1 por situación y número de hijos (0, 1, 2 o más). */
export function exemptLimitOf(situation: FamilySituation, children: number): number {
  const row = WITHHOLDING_EXEMPT[situation];
  const limit = row[Math.min(2, children)];
  // Situación 1 sin hijos no existe: cuenta como la 3.
  return limit ?? (WITHHOLDING_EXEMPT[3][0] as number);
}

export function withholding(raw: SalaryInput, contributions: number): Withholding {
  const input = cleanSalaryInput(raw);
  const retrib = input.gross;
  const netIncome = round2(Math.max(0, retrib - positive(contributions)));
  const otherExpenses = Math.min(otherExpensesOf(input.disability, rentaState), netIncome);
  const workReduction = reductionOf(netIncome);
  const reduced = Math.max(0, netIncome - otherExpenses - workReduction);
  const childrenReduction = input.children > 2 ? MANY_CHILDREN_REDUCTION : 0;
  const base = round2(Math.max(0, reduced - childrenReduction));
  const minimum = familyMinimum(input);
  const exemptLimit = exemptLimitOf(input.situation, input.children);
  const exempt = retrib <= exemptLimit;

  const quota1 = applyScale(WITHHOLDING_SCALE, base);
  const quota2 = applyScale(WITHHOLDING_SCALE, minimum.total);
  let quota = exempt ? 0 : Math.max(0, round2(quota1 - quota2));
  let capped = false;
  if (!exempt && retrib <= WITHHOLDING_CAP_UNTIL) {
    const cap = round2((retrib - exemptLimit) * WITHHOLDING_CAP_RATE);
    if (quota > cap) {
      quota = cap;
      capped = true;
    }
  }
  let rate = retrib > 0 ? truncate2((quota / retrib) * 100) : 0;
  const minimumRate = !exempt && input.contract === 'short' && rate < SHORT_CONTRACT_MIN_RATE;
  if (minimumRate) rate = SHORT_CONTRACT_MIN_RATE;
  return {
    netIncome,
    otherExpenses,
    workReduction,
    childrenReduction,
    base,
    minimum,
    quota1,
    quota2,
    quota,
    exemptLimit,
    exempt,
    capped,
    minimumRate,
    rate,
    amount: round2((retrib * rate) / 100),
  };
}

// ─── Sueldo neto ──────────────────────────────────────────────────────────────

export interface NetSalary {
  input: SalaryInput;
  socialSecurity: SocialSecurity;
  withholding: Withholding;
  /** Neto anual: bruto − Seguridad Social − retención. */
  yearlyNet: number;
  /** Bruto de cada paga. */
  grossPayment: number;
  /** Neto de una paga ordinaria (lleva la cotización del mes). */
  regularPayment: number;
  /** Neto de una paga extra (con 14 pagas): sin cotización, que ya va prorrateada cada mes. */
  extraPayment: number | null;
}

export function netSalary(raw: SalaryInput): NetSalary {
  const input = cleanSalaryInput(raw);
  const ss = socialSecurity(input.gross, input.contract);
  const irpf = withholding(input, ss.total);
  const grossPayment = input.gross / input.payments;
  const withheld = (grossPayment * irpf.rate) / 100;
  return {
    input,
    socialSecurity: ss,
    withholding: irpf,
    yearlyNet: round2(input.gross - ss.total - irpf.amount),
    grossPayment: round2(grossPayment),
    regularPayment: round2(grossPayment - ss.total / 12 - withheld),
    extraPayment: input.payments === 14 ? round2(grossPayment - withheld) : null,
  };
}

// ─── IRPF de la Renta, por comunidad ──────────────────────────────────────────

export interface RentaEstimate {
  /** Base liquidable general: rendimiento neto reducido del trabajo. */
  base: number;
  stateQuota: number;
  regionalQuota: number;
  /** Deducción por obtención de rendimientos del trabajo de 2026 (RDL 5/2026). */
  smiDeduction: number;
  /** Cuota estimada de la Renta, sin otras deducciones. */
  quota: number;
  /** Lo retenido menos la cuota: positivo, a devolver; negativo, a pagar. */
  difference: number;
}

/** Deducción de 2026 por rendimientos del trabajo: 590,89 € hasta el SMI, bajando hasta 20.048,45 €. */
export function smiDeduction(gross: number): number {
  const { amount, fullUntil, zeroFrom, slope } = SMI_DEDUCTION_2026;
  const pay = positive(gross);
  if (pay === 0 || pay >= zeroFrom) return 0;
  if (pay <= fullUntil) return amount;
  return round2(amount - slope * (pay - fullUntil));
}

/**
 * Lo que saldría en la Renta con solo este sueldo: escala estatal más la de la comunidad sobre la
 * misma base, cada una con su mínimo, menos la deducción de 2026 para sueldos bajos. Las escalas y
 * mínimos autonómicos son los de la calculadora de la Renta (los últimos publicados por la AEAT).
 */
export function rentaEstimate(
  salary: NetSalary,
  ccaa: RentaCcaa,
  state: RentaState = rentaState
): RentaEstimate {
  const { input, withholding: irpf } = salary;
  const base = round2(Math.max(0, irpf.netIncome - irpf.otherExpenses - irpf.workReduction));
  const stateMinimum = familyMinimum(input, state.minimums).total;
  const regionMinimum = familyMinimum(input, mergeMinimums(state.minimums, ccaa.minimums)).total;
  const stateQuota = applyMinimum(state.scale, base, stateMinimum);
  const regionalQuota = applyMinimum(ccaa.scale ?? state.defaultRegionalScale, base, regionMinimum);
  const total = round2(stateQuota + regionalQuota);
  const deduction = Math.min(total, smiDeduction(input.gross));
  const quota = round2(total - deduction);
  return {
    base,
    stateQuota,
    regionalQuota,
    smiDeduction: deduction,
    quota,
    difference: round2(irpf.amount - quota),
  };
}
