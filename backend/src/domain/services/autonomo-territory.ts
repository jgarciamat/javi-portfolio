import { AGRARIAN_ADVANCE, HARD_TO_JUSTIFY_RATE, IRPF_ADVANCE } from './autonomo-data';

/**
 * Where the activity is carried out, for the instalments of the modelo 130 (sources checked on
 * 2026-10-25 in the consolidated texts of the BOE):
 *
 * - Art. 110.2 RIRPF (BOE-A-2007-6820, wording of RD 1003/2014, BOE-A-2014-12730, since 1-1-2015):
 *   the rates of art. 110.1 are cut by 60 % for activities with the deduction of art. 68.4 LIRPF
 *   (Ceuta and Melilla): 20 % → 8 % (direct estimation), 2 % → 0.8 % (farming, section II).
 * - DA 57.ª LIRPF (BOE-A-2006-20764): residents of La Palma take the same deduction. 2022-2023 in
 *   full (Ley 31/2022, BOE-A-2022-22128, in force 1-1-2023); in 2024, 2025 and 2026 only for the
 *   instalments whose filing window had not started when RDL 4/2024 (in force 28-6-2024), RDL
 *   13/2025 (27-11-2025) and RDL 23/2026 (BOE-A-2026-18828, 10-9-2026) came in: from the 2T of
 *   2024, the 4T of 2025 and the 3T of 2026. The instructions of the 130 (AEAT) say the same for
 *   2026: «excepcionalmente … del 3er y del 4º trimestres de 2026 en la Isla de la Palma».
 * - DA 64.ª LIRPF (RDL 22/2026, BOE-A-2026-18429, in force 3-9-2026): activities in Ceuta in the
 *   simplified modality take 10 % of hard-to-justify expenses in 2026, in the instalments whose
 *   window starts a month after that (after 3-10-2026): only the 4T. The 2,000 € cap stays.
 */
export const ACTIVITY_TERRITORIES = ['general', 'ceuta', 'melilla', 'laPalma'] as const;
export type ActivityTerritory = (typeof ACTIVITY_TERRITORIES)[number];

/** Rates of art. 110.1 RIRPF cut by 60 % (art. 110.2), written out to avoid 0.2 × 0.4 drift. */
const REDUCED_ADVANCE = 0.08;
const REDUCED_AGRARIAN_ADVANCE = 0.008;
const CEUTA_HARD_TO_JUSTIFY_2026 = 0.1;

/** Quarters of La Palma with the reduced rate, by year (DA 57.ª LIRPF). */
const LA_PALMA_QUARTERS: Record<number, number[]> = {
  2023: [1, 2, 3, 4],
  2024: [2, 3, 4],
  2025: [4],
  2026: [3, 4],
};

/** Whether the instalment of a quarter takes the reduced rate of art. 110.2 RIRPF. */
export function reducedInstalment(
  territory: ActivityTerritory | undefined,
  year: number,
  quarter: number
): boolean {
  if (territory === 'ceuta' || territory === 'melilla') return true;
  return territory === 'laPalma' && (LA_PALMA_QUARTERS[year] ?? []).includes(quarter);
}

/** Box 04 (direct estimation) and box 09 (farming) rates of a quarter. */
export function instalmentRates(
  territory: ActivityTerritory | undefined,
  year: number,
  quarter: number
): { direct: number; agrarian: number } {
  return reducedInstalment(territory, year, quarter)
    ? { direct: REDUCED_ADVANCE, agrarian: REDUCED_AGRARIAN_ADVANCE }
    : { direct: IRPF_ADVANCE, agrarian: AGRARIAN_ADVANCE };
}

/** The hard-to-justify rate of the instalment of a quarter (simplified modality). */
export const hardToJustifyRate = (
  territory: ActivityTerritory | undefined,
  year: number,
  quarter: number
): number =>
  territory === 'ceuta' && year === 2026 && quarter === 4
    ? CEUTA_HARD_TO_JUSTIFY_2026
    : HARD_TO_JUSTIFY_RATE;

/** «8 %», «0,8 %»: a rate as the labels of the boxes write it. */
export const percentLabel = (rate: number): string =>
  `${String(Math.round(rate * 1000) / 10).replace('.', ',')} %`;
