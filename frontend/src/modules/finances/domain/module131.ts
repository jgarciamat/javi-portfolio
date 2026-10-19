import { figuresFor, type FiscalFigures } from './fiscalFigures';
import type { TaxBox } from './types';

/**
 * The modelo 131: the quarterly instalment of the income tax of the activities in objective estimation
 * (modules), boxes 01-15, as the instructions of the AEAT define them [I131, checked on 19 October
 * 2026: https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-131-irpf______sionales-estimacion-objetiva-fraccionado_/instrucciones.html].
 *
 * The net income of each activity (box 01) is not worked out here: it comes from the signs, indexes
 * and modules of the yearly order (the data at 1 January), which the person takes from the order or
 * from their adviser. Seasonal activities are not modelled.
 */

export interface Activity131 {
  /** Net income of the activity for the instalment (section I), from the modules of the order. */
  net: number;
  /** Units of the module «personal asalariado» at the date of the data. */
  staffUnits: number;
  /** Entitled to the deduction for income obtained in Ceuta or Melilla. */
  ceutaMelilla?: boolean;
  /**
   * The part of a whole quarter the instalment is for (1 when unset): days in the quarter of an
   * activity started or ceased during it, or the days of the season over last year's (instructions
   * 5 and 6 of the annex II of the order of modules).
   */
  share?: number;
}

export interface Input131 {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  activities: Activity131[];
  /** Section II: income of the quarter of the activities whose data cannot be set (box 03). */
  noData?: { income: number; ceutaMelilla?: boolean };
  /** Section III: income of the quarter of the farming, livestock and forestry activities (box 05). */
  agrarian?: { income: number; young?: boolean; ceutaMelilla?: boolean };
  /** Withholdings and payments on account of the quarter on these activities (box 08). */
  withheld: number;
  /** Net income of last year's activities (Renta boxes 0224, 1479, 1553, 1577); null: no activity. */
  lastYearNet: number | null;
  /** Negative results (box 15) of this year's earlier instalments not deducted yet (box 11). */
  pendingNegative: number;
  /**
   * Home bought before 2013 (DT 18.ª LIRPF): the boxes 12 of the earlier 131 of the year, and the
   * yearly income expected of section II (added to box 01) or, for farming, of section III.
   */
  home?: { usedThisYear: number; expected: number };
  /** A complementary form: what the earlier ones of this period paid (box 14). */
  complementaryOf?: number;
}

export interface Result131 {
  boxes: TaxBox[];
  due: number;
  /** pay (15 > 0), deduct (negative in quarters 1-3, carried to the next ones) or zero. */
  result: 'pay' | 'deduct' | 'zero';
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const box = (id: string, label: string, amount: number): TaxBox => ({ box: id, label, amount });

/** 2 % without employees, 3 % with up to one unit, 4 % above [I131, box 02]. */
export function staffRate(units: number, m: FiscalFigures['m131']): number {
  if (units <= 0) return m.noStaff;
  return units <= 1 ? m.upToOne : m.more;
}

/** Box 09: the reduction for last year's net income of 12,000 euros or less (none: the largest). */
export function lowIncomeCut(lastYearNet: number | null, figures: FiscalFigures): number {
  const net = lastYearNet ?? 0;
  return figures.lowIncome.find((s) => net <= s.upTo)?.amount ?? 0;
}

/** Box 12: the home deduction, within its limits and not for the cases the instructions leave out. */
function homeDeduction(
  input: Input131,
  b01: number,
  b03: number,
  b05: number,
  room: number,
  m: FiscalFigures['m131']
) {
  if (!input.home || room <= 0) return 0;
  const general = input.activities.length > 0 || b03 > 0;
  // Mixed farming and other activities do not take it; nor income at or above the ceiling.
  if (general && b05 > 0) return 0;
  const income = general ? b01 + input.home.expected : input.home.expected;
  if (income >= m.home.ceiling) return 0;
  const amount = general
    ? (b01 * m.home.rate + b03 * m.home.volumeRate) / 100
    : (b05 * m.home.agrarianRate) / 100;
  return round2(Math.max(0, Math.min(amount, room, m.home.cap - input.home.usedThisYear)));
}

/** Boxes 01-06: the instalment of each section by its percentage. */
function instalments(input: Input131, m: FiscalFigures['m131']) {
  const cm = (on: boolean | undefined) => (on ? m.ceutaMelilla : 1);
  const b01 = round2(input.activities.reduce((s, a) => s + a.net, 0));
  const b02 = round2(
    input.activities.reduce(
      (s, a) =>
        s +
        round2((a.net * (a.share ?? 1) * staffRate(a.staffUnits, m) * cm(a.ceutaMelilla)) / 100),
      0
    )
  );
  const b03 = input.noData?.income ?? 0;
  const b04 = round2((b03 * m.volume * cm(input.noData?.ceutaMelilla)) / 100);
  const b05 = input.agrarian?.income ?? 0;
  const young = input.agrarian?.young ? 1 - m.youngCut : 1;
  const b06 = round2((b05 * m.agrarian * young * cm(input.agrarian?.ceutaMelilla)) / 100);
  return { b01, b02, b03, b04, b05, b06 };
}

/** The modelo 131 of a quarter; null when the app has no figures for the year (NO CONFIRMADO). */
export function form131(input: Input131): Result131 | null {
  const figures = figuresFor(input.year);
  if (!figures) return null;
  const m = figures.m131;
  const { b01, b02, b03, b04, b05, b06 } = instalments(input, m);
  const b07 = round2(b02 + b04 + b06);
  const b08 = input.withheld;
  const b09 = lowIncomeCut(input.lastYearNet, figures);
  const b10 = round2(b07 - b08 - b09);
  const b11 = b10 > 0 ? round2(Math.min(input.pendingNegative, b10)) : 0;
  const b12 = b10 > 0 ? homeDeduction(input, b01, b03, b05, round2(b10 - b11), m) : 0;
  const b13 = round2(b10 - b11 - b12);
  const b14 = input.complementaryOf ?? 0;
  const b15 = round2(b13 - b14);
  return {
    boxes: [
      box('01', 'Rendimiento neto (actividades distintas de las agrícolas)', b01),
      box('02', 'Pago fraccionado (2, 3 o 4 % según personal asalariado)', b02),
      box('03', 'Volumen de ingresos (actividades sin datos-base)', b03),
      box('04', '2 % de la casilla 03', b04),
      box('05', 'Volumen de ingresos (actividades agrícolas, ganaderas y forestales)', b05),
      box('06', '2 % de la casilla 05', b06),
      box('07', 'Suma de pagos fraccionados (02 + 04 + 06)', b07),
      box('08', 'Retenciones e ingresos a cuenta del trimestre', b08),
      box('09', 'Minoración por rendimientos del año anterior', b09),
      box('10', 'Diferencia (07 - 08 - 09)', b10),
      box('11', 'A deducir: resultados negativos de trimestres anteriores', b11),
      box('12', 'Deducción por adquisición o rehabilitación de vivienda habitual', b12),
      box('13', 'Total (10 - 11 - 12)', b13),
      box('14', 'Resultado de anteriores declaraciones (complementaria)', b14),
      box('15', 'Resultado de la autoliquidación (13 - 14)', b15),
    ],
    due: Math.max(0, b15),
    result: b15 > 0 ? 'pay' : b15 < 0 && input.quarter < 4 ? 'deduct' : 'zero',
  };
}
