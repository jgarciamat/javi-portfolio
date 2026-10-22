/**
 * Abatement coefficients of the transitional regime for assets bought before 31-12-1994 (LIRPF,
 * Disposición transitoria novena, as worded by Ley 26/2014, in force since 1-1-2015). Checked on
 * 22-10-2026 against the consolidated text, https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764
 * (#dtnovena), and the AEAT Manual práctico de Renta 2025, c11, «Régimen transitorio aplicable a
 * las ganancias patrimoniales» and its examples 1 and 2 and caso práctico 2.
 *
 * They come from the law, not from a year's figures; kept as data so a change can be dated.
 */
export const rentaAbatement = {
  /** «adquiridos con anterioridad a 31 de diciembre de 1994»: the last day that qualifies. */
  acquiredUntil: '1994-12-30',
  /** The part of the gain «generada con anterioridad a 20 de enero de 2006»: up to this day, inclusive. */
  generatedUntil: '2006-01-19',
  /** The years «entre la fecha de adquisición del elemento y el 31 de diciembre de 1996, redondeado por exceso». */
  permanenceUntil: '1996-12-31',
  /** Sum of the transmission values from 1-1-2015 with the regime applied (letters b to e). */
  limit: 400000,
  limitFrom: '2015-01-01',
  /**
   * Percent per year of permanence over two (letter c): 1.º property and rights over it; 2.º shares
   * admitted to trading (not of SIM or SII); 3.º the rest (unlisted shares, fund units, other).
   */
  rates: { property: 11.11, listed: 25, other: 14.28 },
  /** Not subject (100 %) above these years of permanence: «superior a diez, cinco y ocho años». */
  wholeAbove: { property: 10, listed: 5, other: 8 },
  source: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#dtnovena',
} as const;

export type RentaAbatement = typeof rentaAbatement;
