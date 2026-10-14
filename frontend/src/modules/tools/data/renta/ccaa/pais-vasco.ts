import type { RentaCcaa } from '../../../domain/rentaData';

export const paisVasco: RentaCcaa = {
  id: 'pais-vasco',
  name: 'País Vasco',
  regime: 'foral',
  deductions: [],
  // Tributa en la Hacienda Foral de su territorio, no en la AEAT: Gipuzkoa (aquí), Bizkaia https://www.bizkaia.eus/ogasuna o Álava https://web.araba.eus/es/hacienda.
  source: 'https://www.gipuzkoa.eus/es/web/ogasuna',
};
