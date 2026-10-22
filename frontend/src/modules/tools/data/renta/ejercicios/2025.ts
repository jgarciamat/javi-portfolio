import type { RentaRules } from '../../../domain/rentaRules';
import { farm2025, FARM_2025_SOURCE } from '../agrario-2025';
import { rentaJoint } from '../conjunta';
import { rentaWorkExtras } from '../estado-extra';
import { rentaProperty } from '../inmuebles';
import { MODULES_2025_SOURCE, modules2025 } from '../modulos-2025';
import { rentaState } from '../state';

const MANUAL =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025';

/**
 * Renta 2025 (filed in 2026): the data of state.ts, estado-extra.ts, inmuebles.ts, conjunta.ts and the
 * 17 communities, checked against the Manual práctico de Renta 2025 by the earlier agents (19-10-2026).
 */
export const rules2025: RentaRules = {
  year: 2025,
  status: 'confirmed',
  state: rentaState,
  extras: rentaWorkExtras,
  property: rentaProperty,
  joint: rentaJoint,
  activityTables: { modules: modules2025, farm: farm2025 },
  regions: 'all',
  missing: [],
  sources: [
    {
      what: 'Manual práctico de Renta 2025 (partes 1 y 2)',
      url: `${MANUAL}.html`,
      checkedOn: '2026-10-19',
    },
    {
      what: 'Deducción por rendimientos del trabajo de 340 € (DA 61.ª LIRPF, Ley 5/2025, con efectos desde el 1-1-2025)',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2025-15424',
      checkedOn: '2026-10-22',
    },
    {
      what: 'Escala del ahorro hasta el 30 % (arts. 66 y 76 LIRPF, Ley 7/2024, desde el 1-1-2025)',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2024-26694',
      checkedOn: '2026-10-22',
    },
    {
      what: 'Módulos de 2025 (Orden HAC/1347/2024)',
      url: MODULES_2025_SOURCE,
      checkedOn: '2026-10-19',
    },
    {
      what: 'Índices de rendimiento agrario de 2025',
      url: FARM_2025_SOURCE,
      checkedOn: '2026-10-19',
    },
  ],
};
