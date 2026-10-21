/**
 * Capital mobiliario of the general base: LIRPF art. 26.2 (30 % for income generated in more than
 * two years, on at most 300,000 € a year) and art. 46.a (the interest of what is lent to a related
 * company over three times its own funds, in the taxpayer's share). Consolidated text,
 * https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764, checked 22-10-2026.
 */
export const rentaCapitalGeneral = {
  irregularPercent: 30,
  irregularCap: 300000,
  relatedTimes: 3,
  /** «En los supuestos en los que la vinculación no se defina en función de la relación socios». */
  relatedDefaultShare: 25,
} as const;
