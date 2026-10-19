import type { ModuleActivity } from '@modules/tools/domain/rentaActivity';
import { vatModules2025, type VatModuleActivity } from './vatModules2025';
import type { TaxBox } from './types';

/**
 * The simplified regime of VAT (régimen especial simplificado) of a non-farming activity in
 * módulos: page 2 of the modelo 303 (boxes 47-58) and its result (64, 66, 69 and 71).
 *
 * Sources (read on 19-10-2026):
 * - Annex II of the Orden HAC/1347/2024 (2025) and HAC/1425/2025 (2026, the same figures):
 *   instructions for the VAT, 2.1 (cuota devengada: units by the amount of each module; «personal
 *   empleado» are the salaried and the non-salaried people, the owner included), 2.2 (the VAT paid on
 *   current purchases is deducted in the last quarter of the year only, plus 1 % of the cuota
 *   devengada as hard to justify), 2.3 (the result is the greater of that and the cuota mínima, its
 *   % of the cuota devengada), 3 (ingreso a cuenta of 1T-3T: its % of the cuota devengada with the
 *   data at 1 January), 5 and 6 (start, end and season), 10 (the 4T takes away the 1T-3T paid) and
 *   annex III.4 (intra-EU acquisitions, reverse charge and sales of fixed assets are added; the VAT of
 *   fixed assets is deducted in the quarter it is paid).
 * - Instructions of the modelo 303 of 2026 (sede of the AEAT), page 2: C, D, E, F, G, H, I, J, K, L,
 *   M and boxes 47 to 58; 64 = 46 + 58 + 76; 66 = 64 × 65 (100 %); 69 = 66 + 77 − 78 + 68 + 108;
 *   71 = 69 − 70 + 109.
 * Seasonal activities use the index of instrucción 6 (1.50, 1.35, 1.25). Reductions of the modules
 * authorised by the AEAT (D) are typed by the person as a percentage.
 */

export const VAT_TABLES: Record<number, VatModuleActivity[]> = {
  2025: vatModules2025,
  2026: vatModules2025,
};

export const vatTableOf = (year: number): VatModuleActivity[] =>
  VAT_TABLES[year] ?? VAT_TABLES[Math.max(...Object.keys(VAT_TABLES).map(Number))];

/** The VAT activity of an income tax activity in módulos (null: retail in recargo de equivalencia). */
export function vatActivityFor(
  irpfId: string,
  year: number,
  chosen?: string
): VatModuleActivity | null {
  const table = vatTableOf(year);
  return (
    (chosen ? table.find((v) => v.id === chosen) : undefined) ??
    table.find((v) => v.irpf.includes(irpfId)) ??
    null
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const positive = (n: number | null | undefined) =>
  Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0;
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
/** Commissions (loterías and the like): a module in euros of commission. */
export const isCommission = (m: { unit: string }) => norm(m.unit) === 'euro';

/**
 * The units of each VAT module from those of the income tax: «personal empleado» is the salaried
 * plus the non-salaried people (instrucción 2.1 of the VAT); a module with the same name and unit
 * takes the same units. The person's own figure wins (`typed`, null where not typed).
 */
export function vatUnitsOf(
  vat: VatModuleActivity,
  irpf: ModuleActivity | null,
  irpfUnits: number[],
  typed: (number | null)[] = []
): number[] {
  return vat.modules.map((m, i) => {
    const own = typed[i];
    if (own !== null && own !== undefined) return positive(own);
    if (!irpf) return 0;
    if (/^personal empleado$/i.test(m.label))
      return round2(
        irpf.modules.reduce(
          (s, im, j) => (/^(resto )?personal/i.test(im.label) ? s + positive(irpfUnits[j]) : s),
          0
        )
      );
    const same = irpf.modules.findIndex(
      (im) => norm(im.label) === norm(m.label) && norm(im.unit) === norm(m.unit)
    );
    return same < 0 ? 0 : positive(irpfUnits[same]);
  });
}

/** Instrucción 6 of the VAT: up to 60 days 1.50, up to 120 days 1.35, up to 180 days 1.25. */
export const seasonIndex = (days: number) =>
  days <= 0 || days > 180 ? 1 : days <= 60 ? 1.5 : days <= 120 ? 1.35 : 1.25;

export interface VatSimplifiedInput {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  activity: VatModuleActivity;
  /** Units at 1 January (1T-3T) and the average of the year (4T), in the order of the modules. */
  unitsStart: number[];
  unitsYear: number[];
  /** Reduction of the modules authorised (%), D. */
  reduction: number;
  /** Season: days of the season (0: none); the share of the whole-quarter amount (instr. 5 and 6). */
  seasonDays: number;
  shares: [number, number, number, number];
  /** 4T: VAT paid on the current purchases of the year and REAGP compensations paid (G). */
  supported: number;
  compensationsPaid: number;
  /** 4T: refunds of VAT paid abroad (K). */
  refundsAbroad: number;
  /** Boxes 51, 52 and 53 of the quarter and 55 (VAT of fixed assets) and 56 (4T). */
  intraAcquisitions: number;
  fixedAssetSales: number;
  reverseCharge: number;
  fixedAssets: number;
  investmentAdjust: number;
  /** Box 78: what is left to offset from earlier periods. */
  toOffset: number;
  /** 4T: ask for the refund of a negative result (else it is offset). */
  refund: boolean;
}

export interface VatSimplifiedResult {
  /** C, D, E, F (1T-3T) and G, H, I, J, K, L, M (4T) of the activity, as page 2 names them. */
  parts: Record<string, number>;
  boxes: TaxBox[];
  /** Box 71: positive pays, negative is offset (1T-3T) or refunded/offset (4T). */
  due: number;
  result: 'pay' | 'offset' | 'refund' | 'zero';
}

const box = (id: string, label: string, amount: number): TaxBox => ({
  box: id,
  label,
  amount: round2(amount),
});

/** C: the cuota devengada of the units; and the part of it from commissions (ITL). */
function accrued(activity: VatModuleActivity, units: number[]) {
  let total = 0;
  let commissions = 0;
  activity.modules.forEach((m, i) => {
    const amount = round2(m.amount * positive(units[i]));
    total += amount;
    if (isCommission(m)) commissions += amount;
  });
  return { c: round2(total), itl: round2(commissions) };
}

/** F of a quarter of 1T-3T: ((C − ITL − D) × E) × Z × share + ITL × share. */
function instalment(input: VatSimplifiedInput, q: number) {
  const { c, itl } = accrued(input.activity, input.unitsStart);
  const d = round2((c * positive(input.reduction)) / 100);
  const e = positive(input.activity.quarterly);
  const z = seasonIndex(input.seasonDays);
  const share = positive(input.shares[q - 1]);
  const f = round2(((c - itl - d) * e * z * share) / 100 + itl * share);
  return { c, d, e, z, f };
}

/** 1T-3T: the ingreso a cuenta of the quarter (box 47). */
function quarterPart(input: VatSimplifiedInput) {
  const r = instalment(input, input.quarter);
  return { parts: { C: r.c, D: r.d, Z: r.z, E: r.e, F: r.f }, b47: r.f, b48: 0, b49: 0 };
}

/** 4T: the cuota of the year with the average units (M, box 48) and what 1T-3T paid (box 49). */
function yearEnd(input: VatSimplifiedInput) {
  const { c } = accrued(input.activity, input.unitsYear);
  const d = round2((c * positive(input.reduction)) / 100);
  const hard = round2(c * 0.01);
  const g = round2(positive(input.supported) + positive(input.compensationsPaid) + hard);
  const h = seasonIndex(input.seasonDays);
  const i = round2((c - d - g) * h);
  const j = input.activity.minimum;
  const k = positive(input.refundsAbroad);
  const l = round2(((c - d) * j * h) / 100 + k);
  const m = Math.max(i, l);
  const b49 = round2([1, 2, 3].reduce((s, q) => s + instalment(input, q).f, 0));
  return { parts: { C: c, D: d, G: g, H: h, I: i, J: j, K: k, L: l, M: m }, b47: 0, b48: m, b49 };
}

/** Page 2 of the 303 of a quarter and its result. */
export function vatSimplified(input: VatSimplifiedInput): VatSimplifiedResult {
  const last = input.quarter === 4;
  const { parts, b47, b48, b49 } = last ? yearEnd(input) : quarterPart(input);
  const b50 = round2(b48 - b49);
  const b51 = positive(input.intraAcquisitions);
  const b52 = positive(input.fixedAssetSales);
  const b53 = positive(input.reverseCharge);
  const b54 = round2((last ? b50 : b47) + b51 + b52 + b53);
  const b55 = positive(input.fixedAssets);
  const b56 = last ? round2(input.investmentAdjust) : 0;
  const b57 = round2(b55 + b56);
  const b58 = round2(b54 - b57);
  // Only the simplified regime: 46 and 76 are 0, 65 is 100 %.
  const b64 = b58;
  const b66 = b64;
  const b78 = b66 > 0 ? Math.min(b66, positive(input.toOffset)) : 0;
  const b69 = round2(b66 - b78);
  const b71 = b69;
  return {
    parts,
    boxes: [
      ...(last
        ? [
            box('48', 'Suma de cuotas derivadas del régimen simplificado', b48),
            box('49', 'Suma de ingresos a cuenta realizados en el ejercicio', b49),
            box('50', 'Resultado (48 − 49)', b50),
          ]
        : [box('47', 'Suma de ingresos a cuenta del periodo', b47)]),
      box('51', 'Cuotas devengadas: adquisiciones intracomunitarias de bienes', b51),
      box('52', 'Cuotas devengadas: entregas de activos fijos', b52),
      box('53', 'IVA devengado por inversión del sujeto pasivo', b53),
      box('54', 'Total cuota resultante', b54),
      box('55', 'IVA deducible: adquisición o importación de activos fijos', b55),
      box('56', 'Regularización de bienes de inversión', b56),
      box('57', 'Total IVA deducible (55 + 56)', b57),
      box('58', 'Resultado del régimen simplificado (54 − 57)', b58),
      box('64', 'Suma de resultados (46 + 58 + 76)', b64),
      box('65', '% atribuible a la Administración del Estado', 100),
      box('66', 'Atribuible a la Administración del Estado', b66),
      box('78', 'Cuotas a compensar de periodos previos aplicadas', b78),
      box('69', 'Resultado', b69),
      box('71', 'Resultado de la liquidación', b71),
    ],
    due: Math.max(0, b71),
    result: resultOf(b71, last && input.refund),
  };
}

/** Pay, offset in the next periods, refund (4T, when asked) or zero. */
const resultOf = (b71: number, refund: boolean): VatSimplifiedResult['result'] =>
  b71 > 0 ? 'pay' : b71 < 0 ? (refund ? 'refund' : 'offset') : 'zero';

/** What changes from one quarter to the next: the boxes of the operations of each quarter. */
export type VatQuarterOps = Pick<
  VatSimplifiedInput,
  'intraAcquisitions' | 'fixedAssetSales' | 'reverseCharge' | 'fixedAssets'
>;

/**
 * Every quarter up to `input.quarter`, each with what the earlier ones left to offset (box 78): a
 * negative result of 1T-3T, or of the 4T when no refund is asked, is offset in the next ones.
 * `input.toOffset` is what was left at the start of the year.
 */
export function vatSimplifiedQuarters(
  input: Omit<VatSimplifiedInput, keyof VatQuarterOps>,
  ops: VatQuarterOps[]
): VatSimplifiedResult[] {
  const out: VatSimplifiedResult[] = [];
  let carry = positive(input.toOffset);
  for (let q = 1; q <= input.quarter; q++) {
    const r = vatSimplified({
      ...input,
      ...ops[q - 1],
      quarter: q as 1 | 2 | 3 | 4,
      toOffset: carry,
    });
    const at = (id: string) => r.boxes.find((b) => b.box === id)!.amount;
    carry = round2(carry - at('78') + (r.result === 'offset' ? -at('71') : 0));
    out.push(r);
  }
  return out;
}
