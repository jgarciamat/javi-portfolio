/**
 * Where the activity is carried out, for the instalments of the modelos 130 and 131: the same rules
 * as backend/src/domain/services/autonomo-territory.ts (sources there, checked 2026-10-25).
 *
 * - Art. 110.2 RIRPF: the rates are cut by 60 % for activities with the deduction of art. 68.4 LIRPF
 *   (Ceuta and Melilla): 20 % → 8 % in the 130.
 * - DA 57.ª LIRPF: La Palma, the whole of 2023, from the 2T of 2024, the 4T of 2025 and the 3T and 4T
 *   of 2026 (the instalments whose window had not started when each extension came in).
 * - DA 64.ª LIRPF (RDL 22/2026): Ceuta, 10 % of hard-to-justify expenses in the 4T of 2026.
 */
export const ACTIVITY_TERRITORIES = ['general', 'ceuta', 'melilla', 'laPalma'] as const;
export type ActivityTerritory = (typeof ACTIVITY_TERRITORIES)[number];

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

/** Box 04 of the 130 (direct estimation) and box 09 (farming) of a quarter. */
export const instalmentRates = (
  territory: ActivityTerritory | undefined,
  year: number,
  quarter: number
): { direct: number; agrarian: number } =>
  reducedInstalment(territory, year, quarter)
    ? { direct: 0.08, agrarian: 0.008 }
    : { direct: 0.2, agrarian: 0.02 };

/**
 * Hard-to-justify expenses of the 130 in the simplified modality: 7 % in 2023 (DA 56.ª LIRPF, Ley
 * 31/2022, BOE-A-2022-22128), 10 % in the 4T of 2026 in Ceuta (DA 64.ª), 5 % otherwise (art. 30.2.ª
 * RIRPF); 2,000 € a year at most (art. 30.2.4.ª LIRPF). The same as the server (autonomo-territory.ts).
 */
export function hardToJustifyRate(
  territory: ActivityTerritory | undefined,
  year: number,
  quarter: number
): number {
  if (territory === 'ceuta' && year === 2026 && quarter === 4) return 0.1;
  return year === 2023 ? 0.07 : 0.05;
}
