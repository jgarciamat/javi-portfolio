import type { RentaCcaa } from '../../domain/rentaData';
import type { RequirementOverlay } from './requisitos/types';

/** The communities of the drop-down: each one is loaded on demand (its deductions are long). */
const LOADERS: Record<string, () => Promise<RentaCcaa>> = {
  andalucia: () => import('./ccaa/andalucia').then((m) => m.andalucia),
  aragon: () => import('./ccaa/aragon').then((m) => m.aragon),
  asturias: () => import('./ccaa/asturias').then((m) => m.asturias),
  baleares: () => import('./ccaa/baleares').then((m) => m.baleares),
  canarias: () => import('./ccaa/canarias').then((m) => m.canarias),
  cantabria: () => import('./ccaa/cantabria').then((m) => m.cantabria),
  'castilla-la-mancha': () => import('./ccaa/castilla-la-mancha').then((m) => m.castillaLaMancha),
  'castilla-y-leon': () => import('./ccaa/castilla-y-leon').then((m) => m.castillaYLeon),
  cataluna: () => import('./ccaa/cataluna').then((m) => m.cataluna),
  ceuta: () => import('./ccaa/ceuta').then((m) => m.ceuta),
  extremadura: () => import('./ccaa/extremadura').then((m) => m.extremadura),
  galicia: () => import('./ccaa/galicia').then((m) => m.galicia),
  'la-rioja': () => import('./ccaa/la-rioja').then((m) => m.laRioja),
  madrid: () => import('./ccaa/madrid').then((m) => m.madrid),
  melilla: () => import('./ccaa/melilla').then((m) => m.melilla),
  murcia: () => import('./ccaa/murcia').then((m) => m.murcia),
  navarra: () => import('./ccaa/navarra').then((m) => m.navarra),
  'pais-vasco': () => import('./ccaa/pais-vasco').then((m) => m.paisVasco),
  'comunitat-valenciana': () =>
    import('./ccaa/comunitat-valenciana').then((m) => m.comunitatValenciana),
};

export const CCAA_OPTIONS: { id: string; name: string }[] = [
  { id: 'andalucia', name: 'Andalucía' },
  { id: 'aragon', name: 'Aragón' },
  { id: 'asturias', name: 'Asturias' },
  { id: 'baleares', name: 'Illes Balears' },
  { id: 'canarias', name: 'Canarias' },
  { id: 'cantabria', name: 'Cantabria' },
  { id: 'castilla-la-mancha', name: 'Castilla-La Mancha' },
  { id: 'castilla-y-leon', name: 'Castilla y León' },
  { id: 'cataluna', name: 'Cataluña' },
  { id: 'ceuta', name: 'Ceuta' },
  { id: 'comunitat-valenciana', name: 'Comunitat Valenciana' },
  { id: 'extremadura', name: 'Extremadura' },
  { id: 'galicia', name: 'Galicia' },
  { id: 'la-rioja', name: 'La Rioja' },
  { id: 'madrid', name: 'Comunidad de Madrid' },
  { id: 'melilla', name: 'Melilla' },
  { id: 'murcia', name: 'Región de Murcia' },
  { id: 'navarra', name: 'Navarra (régimen foral)' },
  { id: 'pais-vasco', name: 'País Vasco (régimen foral)' },
];

/** The requirements, box and rule of each deduction, checked community by community (requisitos/). */
const REQUIREMENTS: Record<string, () => Promise<RequirementOverlay>> = {
  andalucia: () => import('./requisitos/andalucia').then((m) => m.andaluciaRequirements),
  'castilla-y-leon': () =>
    import('./requisitos/castilla-y-leon').then((m) => m.castillaYLeonRequirements),
  'comunitat-valenciana': () =>
    import('./requisitos/comunitat-valenciana').then((m) => m.comunitatValencianaRequirements),
};

/** The community's deductions with their requirements. */
export function withRequirements(ccaa: RentaCcaa, overlay: RequirementOverlay): RentaCcaa {
  return { ...ccaa, deductions: ccaa.deductions.map((d) => ({ ...d, ...overlay[d.id] })) };
}

export function loadCcaa(id: string): Promise<RentaCcaa> {
  const load = LOADERS[id];
  if (!load) return Promise.reject(new Error(`Unknown community: ${id}`));
  const overlay = REQUIREMENTS[id];
  return overlay
    ? Promise.all([load(), overlay()]).then(([ccaa, o]) => withRequirements(ccaa, o))
    : load();
}
