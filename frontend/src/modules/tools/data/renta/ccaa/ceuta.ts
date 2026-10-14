import type { RentaCcaa } from '../../../domain/rentaData';
import { rentaState } from '../state';

export const ceuta: RentaCcaa = {
  id: 'ceuta',
  name: 'Ceuta',
  regime: 'common',
  scale: rentaState.defaultRegionalScale,
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/especialidad-escala-autonomica-contribuyentes.html',
  // Su deducción del 60 % por rentas obtenidas allí es estatal y está en state.ts.
  deductions: [],
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota/deduccion-rentas-obtenidas-ceuta-melilla.html',
};
