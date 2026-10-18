/**
 * Cotización de los autónomos (RETA) en 2026: la misma tabla que usa el borrador trimestral del
 * servidor (`backend/src/domain/services/autonomo-data.ts`, la fuente de verdad). El frontend no
 * puede importar el código del servidor (cada uno se construye por separado), así que la tabla se
 * repite aquí y el test `retaCalc.test.ts` comprueba, leyendo ese archivo, que las dos son iguales.
 *
 * Fuentes (consultadas el 18 de octubre de 2026):
 * - Orden PJC/297/2026, de 30 de marzo (BOE-A-2026-7296, BOE de 31 de marzo de 2026), art. 15 y
 *   37: tablas reducida y general de bases por rendimientos y tipos de 2026.
 *   https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296
 * - Ley General de la Seguridad Social, art. 308.1.c: deducción del 7 % por gastos genéricos (3 %
 *   para los autónomos societarios del art. 305.2.b y e).
 * - Ley 20/2007 del Trabajo Autónomo, art. 38 ter, y disposición transitoria 5.ª del Real
 *   Decreto-ley 13/2022: cuota reducida («tarifa plana») de 80 € al mes en 2023-2025. Desde 2026
 *   la cuantía la fija la Ley de Presupuestos; no hay Presupuestos de 2026, así que se usa la última
 *   cifra oficial (80 €) y la página lo dice.
 */

export const RETA_SOURCE_DATE = '2026-10-18';
export const RETA_ORDER_URL = 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296';
export const RETA_LAW_URL = 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-13409';
export const LGSS_URL = 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724';

/**
 * Tipo total de 2026 sobre la base: 28,30 contingencias comunes + 1,30 profesionales + 0,90 cese
 * de actividad + 0,10 formación profesional + 0,90 MEI = 31,50 % (Orden PJC/297/2026, art. 37).
 */
export const RETA_RATE_PARTS_2026 = {
  common: 28.3,
  professional: 1.3,
  cessation: 0.9,
  training: 0.1,
  mei: 0.9,
} as const;
export const RETA_RATE_2026 = 0.315;

/** Gastos genéricos que se restan del rendimiento neto: 7 %, o 3 % para los societarios. */
export const RETA_GENERAL_EXPENSES = 0.07;
export const RETA_GENERAL_EXPENSES_COMPANY = 0.03;

/** Cuota reducida de los nuevos autónomos (euros al mes, 12 meses; última cifra oficial). */
export const RETA_FLAT_RATE = 80;
/** SMI anual de 2026 (1.221 € × 14, Real Decreto 126/2026): con menos, la tarifa plana se prorroga. */
export const SMI_2026_YEAR = 17094;

export interface RetaBracket {
  id: string;
  /** Rendimiento neto mensual en que empieza (exclusivo, salvo el primero). */
  from: number;
  /** Rendimiento neto mensual en que acaba (inclusivo, salvo `toExclusive`); null = sin límite. */
  to: number | null;
  /** El tramo 3 de la tabla reducida acaba en «menos de 1.166,70 €» y el G1 empieza en 1.166,70. */
  toExclusive?: boolean;
  baseMin: number;
  baseMax: number;
}

/** Los 15 tramos de 2026: 3 de la tabla reducida y 12 de la general (euros al mes). */
export const RETA_BRACKETS_2026: RetaBracket[] = [
  { id: 'R1', from: 0, to: 670, baseMin: 653.59, baseMax: 718.94 },
  { id: 'R2', from: 670, to: 900, baseMin: 718.95, baseMax: 900 },
  { id: 'R3', from: 900, to: 1166.7, toExclusive: true, baseMin: 849.67, baseMax: 1166.7 },
  { id: 'G1', from: 1166.7, to: 1300, baseMin: 950.98, baseMax: 1300 },
  { id: 'G2', from: 1300, to: 1500, baseMin: 960.78, baseMax: 1500 },
  { id: 'G3', from: 1500, to: 1700, baseMin: 960.78, baseMax: 1700 },
  { id: 'G4', from: 1700, to: 1850, baseMin: 1143.79, baseMax: 1850 },
  { id: 'G5', from: 1850, to: 2030, baseMin: 1209.15, baseMax: 2030 },
  { id: 'G6', from: 2030, to: 2330, baseMin: 1274.51, baseMax: 2330 },
  { id: 'G7', from: 2330, to: 2760, baseMin: 1356.21, baseMax: 2760 },
  { id: 'G8', from: 2760, to: 3190, baseMin: 1437.91, baseMax: 3190 },
  { id: 'G9', from: 3190, to: 3620, baseMin: 1519.61, baseMax: 3620 },
  { id: 'G10', from: 3620, to: 4050, baseMin: 1601.31, baseMax: 4050 },
  { id: 'G11', from: 4050, to: 6000, baseMin: 1732.03, baseMax: 5101.2 },
  { id: 'G12', from: 6000, to: null, baseMin: 1928.1, baseMax: 5101.2 },
];
