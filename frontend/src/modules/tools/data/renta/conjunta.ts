/**
 * Joint return (tributación conjunta) for Renta 2025. Checked on 19-10-2026 against:
 * - Ley 35/2006 del IRPF, arts. 82 (family units), 83 (option) and 84 (rules), BOE-A-2006-20764,
 *   texto consolidado: https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764
 * - AEAT, Manual práctico de Renta 2025, c13 "Reducción por tributación conjunta" (page of 17-03-2026).
 * - AEAT, Manual de ayuda de Renta 2025, 3.2.3 "Normas aplicables en la tributación conjunta".
 */
const MANUAL =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025';

export const rentaJoint = {
  year: 2025,
  /** Spouses not legally separated and, if any, their minor children (art. 84.2.4.º a). */
  coupleReduction: 3400,
  /**
   * One parent with all the children who live with them (art. 84.2.4.º b); none when the parent lives
   * with the father or mother of any of the children.
   */
  singleParentReduction: 2150,
  /** Children under 18 are part of the unit (art. 82.1): an older child does not make a single-parent unit. */
  minorUntil: 18,
  source: `${MANUAL}/c13-determinacion-renta-contribuyente-sujeta-gravamen/reducciones-base-imponible-general/reduccion-tributacion-conjunta.html`,
  rules:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/3-cuestiones-generales/3_2-tributacion-individual-conjunta/3_2_3-normas-aplicables-tributacion-conjunta.html',
};
