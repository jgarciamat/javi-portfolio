/**
 * Tax residence: who the Renta of the common regime (modelo 100 with the AEAT) is for. A
 * non-resident pays the Non-Residents' Income Tax (modelo 210), the special regime for workers moved
 * to Spain files the modelo 151, and the Basque Country and Navarra have their own Treasuries: for
 * them the State's calculation would mislead, so it is not given.
 *
 * Sources (checked 19-10-2026):
 * - LIRPF (BOE-A-2006-20764) art. 9.1: resident with "más de 183 días, durante el año natural, en
 *   territorio español" (sporadic absences count), or with "el núcleo principal o la base de sus
 *   actividades o intereses económicos" in Spain; presumed resident when the spouse not legally
 *   separated and the minor children depending on them live in Spain, "salvo prueba en contrario".
 * - LIRPF art. 10 (Spanish diplomats and officials abroad) and art. 93 (workers moved to Spain,
 *   modelo 151); art. 72 (the community of the most days in the year).
 * - AEAT Manual práctico de Renta 2025, c02 «Sujeción al IRPF: aspectos personales».
 * - Modelo 210 (sede, GF00) and modelo 151 (sede, G615); Ley Orgánica 2/2012 and Concierto and
 *   Convenio económicos (Basque Country, Navarra).
 */

export type YesNo = '' | 'yes' | 'no';

/** Something about the year that changes who files what. */
export type Special = '' | 'none' | 'moved' | 'displaced' | 'abroadOfficial';

/** The three Basque territories, each with its own Treasury. */
export type BasqueTerritory = '' | 'alava' | 'bizkaia' | 'gipuzkoa';

export interface ResidenceForm {
  /** More than 183 days in Spain in the year (sporadic absences count). */
  days: '' | 'more' | 'less';
  /** The main base of activities or economic interests is in Spain. */
  interests: YesNo;
  /** Spouse not separated and minor children living in Spain. */
  family: YesNo;
  special: Special;
  /** Only for the Basque Country. */
  territory: BasqueTerritory;
}

export const emptyResidence = (): ResidenceForm => ({
  days: '',
  interests: '',
  family: '',
  special: '',
  territory: '',
});

export type OutReason =
  | 'nonResident'
  | 'displaced'
  | 'abroadOfficial'
  | 'navarra'
  | 'alava'
  | 'bizkaia'
  | 'gipuzkoa'
  | 'basque';

/** Something to say about a resident's return. */
export type ResidenceNote = 'familyPresumption' | 'moved' | 'canarias' | 'ceutaMelilla';

export type ResidenceScope =
  | { kind: 'in'; notes: ResidenceNote[] }
  | { kind: 'pending'; missing: 'days' | 'interests' | 'family' | 'special' }
  | { kind: 'out'; reason: OutReason; links: string[] };

const SEDE = 'https://sede.agenciatributaria.gob.es/Sede';
const MANUAL = `${SEDE}/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c02-irpf-cuestiones-generales/sujecion-irpf-aspectos-personales`;

/** Where each case is filed: the official pages. */
export const OUT_LINKS: Record<OutReason, string[]> = {
  nonResident: [`${SEDE}/procedimientoini/GF00.shtml`, `${SEDE}/no-residentes.html`],
  displaced: [
    `${SEDE}/procedimientoini/G615.shtml`,
    `${MANUAL}/regimen-fiscal-especial-aplicable-trabajadores-desplazados.html`,
  ],
  abroadOfficial: [`${MANUAL}/residencia-habitual-extranjero.html`],
  navarra: ['https://www.navarra.es/es/hacienda'],
  alava: ['https://web.araba.eus/es/hacienda'],
  bizkaia: ['https://www.bizkaia.eus/ogasuna'],
  gipuzkoa: ['https://www.gipuzkoa.eus/ogasuna'],
  basque: [
    'https://web.araba.eus/es/hacienda',
    'https://www.bizkaia.eus/ogasuna',
    'https://www.gipuzkoa.eus/ogasuna',
  ],
};

/** The AEAT page on residence, for the help of the question. */
export const RESIDENCE_URL = `${MANUAL}/residencia-habitual-territorio-espanol.html`;

const out = (reason: OutReason): ResidenceScope => ({
  kind: 'out',
  reason,
  links: OUT_LINKS[reason],
});

/** Whether the common-regime Renta applies, from the community and the answers on residence. */
export function residenceScope(ccaaId: string, r: ResidenceForm | undefined): ResidenceScope {
  // The Basque Country and Navarra: their own Treasury, whatever else is answered.
  if (ccaaId === 'navarra') return out('navarra');
  if (ccaaId === 'pais-vasco') return out(r?.territory ? r.territory : 'basque');
  const a = r ?? emptyResidence();
  if (a.special === 'displaced') return out('displaced');
  if (a.special === 'abroadOfficial') return out('abroadOfficial');
  if (a.days === '') return { kind: 'pending', missing: 'days' };
  const notes: ResidenceNote[] = [];
  if (a.days === 'less') {
    if (a.interests === '') return { kind: 'pending', missing: 'interests' };
    if (a.interests === 'no') {
      if (a.family === '') return { kind: 'pending', missing: 'family' };
      if (a.family === 'no') return out('nonResident');
      notes.push('familyPresumption');
    }
  }
  if (a.special === '') return { kind: 'pending', missing: 'special' };
  if (a.special === 'moved') notes.push('moved');
  if (ccaaId === 'canarias') notes.push('canarias');
  if (ccaaId === 'ceuta' || ccaaId === 'melilla') notes.push('ceutaMelilla');
  return { kind: 'in', notes };
}

/** What each answer clears: what it makes no longer asked is taken out. */
export function answerResidence(
  r: ResidenceForm | undefined,
  patch: Partial<ResidenceForm>
): ResidenceForm {
  const next = { ...(r ?? emptyResidence()), ...patch };
  if (next.days !== 'less') return { ...next, interests: '', family: '' };
  if (next.interests !== 'no') return { ...next, family: '' };
  return next;
}
