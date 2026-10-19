/**
 * Province codes of the informative returns, as the record designs list them (checked 19-10-2026):
 * 347.pdf (ejercicio 2025 y siguientes, «CÓDIGO PROVINCIA/PAIS»), DISENOS_LOGICOS_190_2025.pdf and
 * DR_Mod_180_2023.pdf («CÓDIGO PROVINCIA»). The 190 and the 180 add the Isla de La Palma (53).
 */
export const PROVINCES: readonly (readonly [string, string])[] = [
  ['01', 'Araba/Álava'],
  ['02', 'Albacete'],
  ['03', 'Alicante/Alacant'],
  ['04', 'Almería'],
  ['05', 'Ávila'],
  ['06', 'Badajoz'],
  ['07', 'Illes Balears'],
  ['08', 'Barcelona'],
  ['09', 'Burgos'],
  ['10', 'Cáceres'],
  ['11', 'Cádiz'],
  ['12', 'Castellón/Castelló'],
  ['13', 'Ciudad Real'],
  ['14', 'Córdoba'],
  ['15', 'A Coruña'],
  ['16', 'Cuenca'],
  ['17', 'Girona'],
  ['18', 'Granada'],
  ['19', 'Guadalajara'],
  ['20', 'Gipuzkoa'],
  ['21', 'Huelva'],
  ['22', 'Huesca'],
  ['23', 'Jaén'],
  ['24', 'León'],
  ['25', 'Lleida'],
  ['26', 'La Rioja'],
  ['27', 'Lugo'],
  ['28', 'Madrid'],
  ['29', 'Málaga'],
  ['30', 'Murcia'],
  ['31', 'Navarra'],
  ['32', 'Ourense'],
  ['33', 'Asturias'],
  ['34', 'Palencia'],
  ['35', 'Las Palmas'],
  ['36', 'Pontevedra'],
  ['37', 'Salamanca'],
  ['38', 'Santa Cruz de Tenerife'],
  ['39', 'Cantabria'],
  ['40', 'Segovia'],
  ['41', 'Sevilla'],
  ['42', 'Soria'],
  ['43', 'Tarragona'],
  ['44', 'Teruel'],
  ['45', 'Toledo'],
  ['46', 'Valencia/València'],
  ['47', 'Valladolid'],
  ['48', 'Bizkaia'],
  ['49', 'Zamora'],
  ['50', 'Zaragoza'],
  ['51', 'Ceuta'],
  ['52', 'Melilla'],
];

/** Isla de La Palma: its own code in the 190 and the 180 (Santa Cruz de Tenerife is 38 without it). */
export const LA_PALMA: readonly [string, string] = ['53', 'Isla de La Palma'];

/** The codes a model takes for the domicile of a person. */
export function provincesOf(model: '190' | '180' | '347'): readonly (readonly [string, string])[] {
  return model === '347' ? PROVINCES : [...PROVINCES, LA_PALMA];
}
