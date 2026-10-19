/**
 * Índices de rendimiento neto de las actividades agrícolas, ganaderas y forestales en módulos para
 * 2025: anexo I de la Orden HAC/1347/2024, de 28 de noviembre (BOE-A-2024-24949), con los de su
 * disposición adicional segunda (uva de mesa, flores y plantas ornamentales y tabaco), que sustituyen
 * a los del anexo. Leído en el BOE el 19-10-2026.
 */
import type { FarmIndex } from '../../domain/rentaActivity';

export const FARM_2025_SOURCE = 'https://www.boe.es/boe/dias/2024/11/30/pdfs/BOE-A-2024-24949.pdf';

export interface FarmGroup extends FarmIndex {
  title: string;
}

export const farm2025: FarmGroup[] = [
  {
    id: 'meat',
    title:
      'Remolacha azucarera; porcino, bovino, ovino y caprino de carne; avicultura y cunicultura',
    index: 0.13,
    transformed: 0.23,
  },
  {
    id: 'forestLong',
    title: 'Forestal con período medio de corta de más de 30 años',
    index: 0.13,
    transformed: 0.23,
  },
  { id: 'milk', title: 'Ganado bovino de leche', index: 0.2, transformed: 0.3 },
  {
    id: 'crops',
    title:
      'Cereales, cítricos, frutos secos, horticultura, patata, leguminosas, uva para vino sin denominación de origen, olivo y hongos; porcino y bovino de cría, ovino y caprino de leche y apicultura',
    index: 0.26,
    transformed: 0.36,
  },
  {
    id: 'forestShort',
    title: 'Forestal con período medio de corta de 30 años o menos',
    index: 0.26,
    transformed: 0.36,
  },
  {
    id: 'rice',
    title: 'Arroz, uva para vino con denominación de origen, oleaginosas, otras ganaderas y resina',
    index: 0.32,
    transformed: 0.42,
  },
  {
    id: 'fodder',
    title:
      'Raíces, tubérculos, forrajes, algodón, frutos no cítricos, otros productos agrícolas y servicios de cría, guarda y engorde de ganado',
    index: 0.37,
    transformed: 0.47,
  },
  {
    id: 'textile',
    title: 'Plantas textiles y actividades accesorias (agroturismo, artesanía…)',
    index: 0.42,
    transformed: 0.52,
  },
  {
    id: 'services',
    title: 'Otros trabajos y servicios accesorios y producción de mejillón en batea',
    index: 0.56,
  },
  { id: 'tableGrapes', title: 'Uva de mesa (disposición adicional segunda)', index: 0.32 },
  {
    id: 'flowers',
    title: 'Flores y plantas ornamentales (disposición adicional segunda)',
    index: 0.32,
  },
  { id: 'tobacco', title: 'Tabaco (disposición adicional segunda)', index: 0.26 },
  {
    id: 'cap',
    title: 'Ayudas directas desacopladas de la PAC con menos del 25 % de otros ingresos',
    index: 0.56,
  },
];
