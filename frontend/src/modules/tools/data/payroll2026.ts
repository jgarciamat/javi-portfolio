import type { TaxBracket } from '../domain/rentaData';

/**
 * Lo que se descuenta de una nómina en 2026 (régimen general de la Seguridad Social y retención del
 * IRPF por el procedimiento general de la AEAT). Fuentes consultadas el 18 de octubre de 2026:
 *
 * - Orden PJC/297/2026, de 30 de marzo (BOE-A-2026-7296), art. 33 (tipos), base máxima de
 *   5.101,20 € al mes y cotización adicional de solidaridad.
 *   https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296
 * - AEAT, «Algoritmo de cálculo del tipo de retención» 2026 (versión desde el 10 de septiembre; la
 *   anterior solo cambia en La Palma). Tablas 1 (límites excluyentes, art. 81 RIRPF) y 2 (escala,
 *   art. 101 LIRPF), reducción del art. 20 LIRPF, mínimos y límite del 43 % del art. 85.3 RIRPF.
 *   https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/Algoritmo%20Retenciones-2026_10sept.pdf
 * - Real Decreto-ley 5/2026, art. 28 (D.A. 61.ª LIRPF): deducción por obtención de rendimientos del
 *   trabajo de 2026, que se aplica en la Renta, no en la nómina.
 * - Real Decreto 126/2026: SMI de 2026, 1.221 € × 14 = 17.094 € al año.
 */

export const PAYROLL_SOURCE_DATE = '2026-10-18';
export const PAYROLL_ORDER_URL = 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296';
export const WITHHOLDING_ALGORITHM_URL =
  'https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/Algoritmo%20Retenciones-2026_10sept.pdf';
export const SMI_DEDUCTION_URL =
  'https://sede.agenciatributaria.gob.es/static_files/Sede/Actualidad/Novedades/2026/BOLINFORM%20_RDL_5_2026.pdf';

/** Lo que paga la persona trabajadora sobre su base (en %): Orden PJC/297/2026, art. 33. */
export const EMPLOYEE_RATES_2026 = {
  /** Contingencias comunes (28,30 % en total, 23,60 % la empresa). */
  common: 4.7,
  /** Desempleo: contrato indefinido (7,05 % en total) o de duración determinada (8,30 %). */
  unemploymentIndefinite: 1.55,
  unemploymentTemporary: 1.6,
  /** Formación profesional (0,70 % en total). */
  training: 0.1,
  /** Mecanismo de Equidad Intergeneracional (0,90 % en total, 0,75 % la empresa). */
  mei: 0.15,
} as const;

/** Base máxima mensual de 2026 (todas las contingencias). */
export const MAX_BASE_2026 = 5101.2;
/** Base mínima mensual de 2026 de los grupos 4 a 7 (jornada completa). */
export const MIN_BASE_2026 = 1424.4;

/**
 * Cotización adicional de solidaridad: sobre lo que el salario mensual pasa de la base máxima. Parte
 * de la persona trabajadora: 0,19 % hasta 5.611,32 €, 0,21 % hasta 7.651,80 € y 0,24 % por encima.
 */
export const SOLIDARITY_2026: { upTo: number | null; rate: number }[] = [
  { upTo: 5611.32, rate: 0.19 },
  { upTo: 7651.8, rate: 0.21 },
  { upTo: null, rate: 0.24 },
];

/** Escala de retención (tabla 2 del algoritmo, art. 101 LIRPF): estatal y autonómica juntas. */
export const WITHHOLDING_SCALE: TaxBracket[] = [
  { from: 0, rate: 19 },
  { from: 12450, rate: 24 },
  { from: 20200, rate: 30 },
  { from: 35200, rate: 37 },
  { from: 60000, rate: 45 },
  { from: 300000, rate: 47 },
];

/**
 * Situación familiar del modelo 145:
 * 1: soltero, viudo, divorciado o separado con hijos que viven solo con él;
 * 2: casado con un cónyuge que no gana más de 1.500 € al año;
 * 3: cualquier otra (también sin declarar la situación).
 */
export type FamilySituation = 1 | 2 | 3;

/**
 * Límites excluyentes de retención (tabla 1, art. 81 RIRPF según el RD 142/2024): con unas
 * retribuciones iguales o menores no se retiene nada. Por número de hijos: 0, 1, 2 o más.
 */
export const WITHHOLDING_EXEMPT: Record<FamilySituation, [number | null, number, number]> = {
  1: [null, 17644, 18694],
  2: [17197, 18130, 19262],
  3: [15876, 16342, 16867],
};

/** La cuota de retención no puede pasar del 43 % de lo que exceda el límite (art. 85.3 RIRPF)… */
export const WITHHOLDING_CAP_RATE = 0.43;
/** …cuando las retribuciones no pasan de 35.200 €. */
export const WITHHOLDING_CAP_UNTIL = 35200;
/** Tipo mínimo para contratos de duración inferior a un año (art. 86.2 RIRPF). */
export const SHORT_CONTRACT_MIN_RATE = 2;
/** Reducción de la base de retención con más de dos hijos (art. 83.3.d RIRPF). */
export const MANY_CHILDREN_REDUCTION = 600;

/** Deducción por obtención de rendimientos del trabajo de 2026 (RDL 5/2026). */
export const SMI_DEDUCTION_2026 = {
  amount: 590.89,
  fullUntil: 17094,
  zeroFrom: 20048.45,
  slope: 0.2,
};
