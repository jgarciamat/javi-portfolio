import type { RentaCcaa } from '../../../domain/rentaData';

export const navarra: RentaCcaa = {
  id: 'navarra',
  name: 'Navarra',
  regime: 'foral',
  deductions: [],
  // Tributa en la Hacienda Foral de Navarra, no en la AEAT.
  source: 'https://www.navarra.es/es/hacienda',
};
