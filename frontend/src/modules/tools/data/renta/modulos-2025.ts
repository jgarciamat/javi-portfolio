/**
 * Signos, índices o módulos del método de estimación objetiva del IRPF para 2025 (anexo II de la
 * Orden HAC/1347/2024, de 28 de noviembre, BOE-A-2024-24949, BOE de 30-11-2024; descargado y leído
 * el 19-10-2026). Generado a partir del texto del BOE: cada actividad con su epígrafe del IAE, sus
 * módulos («rendimiento anual por unidad antes de amortización») y, si lo tiene, el importe a partir
 * del cual se aplica el índice corrector de exceso (instrucción 2.3.b.3). Epígrafe 651.3 y 5: el BOE
 * imprime «11.998.85» para el personal no asalariado; se lee 11.998,85 €.
 */

import type { ModuleActivity } from '../../domain/rentaActivity';

export const MODULES_2025_SOURCE =
  'https://www.boe.es/boe/dias/2024/11/30/pdfs/BOE-A-2024-24949.pdf';

export const modules2025: ModuleActivity[] = [
  {
    id: 'm01',
    epigrafe: '419.1',
    activity: 'Industrias del pan y de la bollería',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 6248.22 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 14530.89 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 49.13 },
      { label: 'Superficie del horno', unit: '100 Decímetros cuadrados', amount: 629.86 },
    ],
    excess: 41602.3,
  },
  {
    id: 'm02',
    epigrafe: '419.2',
    activity: 'Industrias de la bollería, pastelería y galletas',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 6657.63 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13485.32 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 45.35 },
      { label: 'Superficie del horno', unit: '100 decímetros cuadrados', amount: 541.68 },
    ],
    excess: 33760.53,
  },
  {
    id: 'm03',
    epigrafe: '419.3',
    activity: 'Industrias de elaboración de masas fritas',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4238.96 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 12301.18 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 25.82 },
    ],
    excess: 19670.55,
  },
  {
    id: 'm04',
    epigrafe: '423.9',
    activity: 'Elaboración de patatas fritas, palomitas de maíz y similares',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4390.12 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 12723.18 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 26.45 },
    ],
    excess: 19670.55,
  },
  {
    id: 'm05',
    epigrafe: '641',
    activity: 'Comercio al por menor de frutas, verduras, hortalizas y tubérculos',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2387.18 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10581.66 },
      { label: 'Superficie del local independiente', unit: 'Metro cuadrado', amount: 57.94 },
      { label: 'Superficie local no independiente', unit: 'Metro cuadrado', amount: 88.18 },
      { label: 'Carga elementos de transporte', unit: 'Kilogramo', amount: 1.01 },
    ],
    excess: 16867.67,
  },
  {
    id: 'm06',
    epigrafe: '642.1, 2, 3 y 4',
    activity:
      'Comercio al por menor de carne y despojos; de productos y derivados cárnicos elaborados',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2355.68 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10991.07 },
      { label: 'Superficie del local independiente', unit: 'Metro cuadrado', amount: 35.9 },
      { label: 'Superficie del local no independiente', unit: 'Metro cuadrado', amount: 81.88 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 39.05 },
    ],
    excess: 21635.71,
  },
  {
    id: 'm07',
    epigrafe: '642.5',
    activity:
      'Comercio al por menor de huevos, aves, conejos de granja, caza; y de productos derivados de los mismos',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3382.36 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 11337.49 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 25.19 },
      { label: 'Superficie del local independiente', unit: 'Metro cuadrado', amount: 27.08 },
      { label: 'Superficie del local no independiente', unit: 'Metro cuadrado', amount: 58.57 },
    ],
    excess: 20136.65,
  },
  {
    id: 'm08',
    epigrafe: '642.6',
    activity:
      'Comercio al por menor, en casquerías, de vísceras y despojos procedentes de animales de abasto, frescos y congelados',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2254.9 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 11098.14 },
      { label: 'Superficie del local independiente', unit: 'Metro cuadrado', amount: 27.71 },
      { label: 'Superficie local no independiente', unit: 'Metro cuadrado', amount: 69.28 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 35.9 },
    ],
    excess: 16237.81,
  },
  {
    id: 'm09',
    epigrafe: '643.1 y 2',
    activity:
      'Comercio al por menor de pescados y otros productos de la pesca y de la acuicultura y de caracoles',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3823.25 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13296.36 },
      { label: 'Superficie del local independiente', unit: 'Metro cuadrado', amount: 36.53 },
      { label: 'Superficie del local no independiente', unit: 'Metro cuadrado', amount: 113.37 },
      { label: 'Consumo de energía eléctrica', unit: '100 Kwh', amount: 28.98 },
    ],
    excess: 24551.97,
  },
  {
    id: 'm10',
    epigrafe: '644.1',
    activity:
      'Comercio al por menor de pan, pastelería, confitería y similares y de leche y productos lácteos',
    modules: [
      { label: 'Personal asalariado de fabricación', unit: 'Persona', amount: 6248.22 },
      { label: 'Resto personal asalariado', unit: 'Persona', amount: 1058.17 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 14530.89 },
      { label: 'Superficie del local de fabricación', unit: 'Metro cuadrado', amount: 49.13 },
      { label: 'Resto superficie local independiente', unit: 'Metro cuadrado', amount: 34.01 },
      { label: 'Resto superficie local no independiente', unit: 'Metro cuadrado', amount: 125.97 },
      { label: 'Superficie del horno', unit: '100 decímetros cuadrados', amount: 629.86 },
    ],
    excess: 43605.26,
  },
  {
    id: 'm11',
    epigrafe: '644.2',
    activity: 'Despachos de pan, panes especiales y bollería',
    modules: [
      { label: 'Personal asalariado de fabricación', unit: 'Persona', amount: 6134.85 },
      { label: 'Resto personal asalariado', unit: 'Persona', amount: 1039.27 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 14266.34 },
      { label: 'Superficie del local de fabricación', unit: 'Metro cuadrado', amount: 48.5 },
      { label: 'Resto superficie local independiente', unit: 'Metro cuadrado', amount: 33.38 },
      { label: 'Resto superficie local no independiente', unit: 'Metro cuadrado', amount: 125.97 },
      { label: 'Superficie del horno', unit: '100 decímetros cuadrados', amount: 629.86 },
    ],
    excess: 42925.01,
  },
  {
    id: 'm12',
    epigrafe: '644.3',
    activity: 'Comercio al por menor de productos de pastelería, bollería y confitería',
    modules: [
      { label: 'Personal asalariado de fabricación', unit: 'Persona', amount: 6367.89 },
      { label: 'Resto personal asalariado', unit: 'Persona', amount: 1014.08 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 12912.15 },
      { label: 'Superficie del local de fabricación', unit: 'Metro cuadrado', amount: 43.46 },
      { label: 'Resto superficie local independiente', unit: 'Metro cuadrado', amount: 34.01 },
      { label: 'Resto superficie local no independiente', unit: 'Metro cuadrado', amount: 113.37 },
      { label: 'Superficie del horno', unit: '100 decímetros cuadrados', amount: 522.78 },
    ],
    excess: 33760.53,
  },
  {
    id: 'm13',
    epigrafe: '644.6',
    activity:
      'Comercio al por menor de masas fritas, con o sin coberturas o rellenos, patatas fritas, productos de aperitivos, frutos secos, golosinas, preparados de chocolate y bebidas refrescantes',
    modules: [
      { label: 'Personal asalariado de fabricación', unit: 'Persona', amount: 6852.88 },
      { label: 'Resto personal asalariado', unit: 'Persona', amount: 2254.9 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13214.47 },
      { label: 'Superficie del local de fabricación', unit: 'Metro cuadrado', amount: 27.71 },
      { label: 'Resto superficie local independiente', unit: 'Metro cuadrado', amount: 21.41 },
      { label: 'Resto superficie local no independiente', unit: 'Metro cuadrado', amount: 36.53 },
    ],
    excess: 19670.55,
  },
  {
    id: 'm14',
    epigrafe: '647.1',
    activity:
      'Comercio al por menor de cualquier clase de productos alimenticios y de bebidas en establecimientos con vendedor',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1026.67 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10839.9 },
      { label: 'Superficie del local independiente', unit: 'Metro cuadrado', amount: 20.15 },
      { label: 'Superficie del local no independiente', unit: 'Metro cuadrado', amount: 68.65 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 8.81 },
    ],
    excess: 15822.1,
  },
  {
    id: 'm15',
    epigrafe: '647.2 y 3',
    activity:
      'Comercio al por menor de cualquier clase de productos alimenticios y de bebidas en régimen de autoservicio o mixto en establecimientos cuya sala de ventas tenga una superficie inferior a 400 metros cuadrados',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1788.8 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10827.31 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 23.31 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 32.75 },
    ],
    excess: 25219.62,
  },
  {
    id: 'm16',
    epigrafe: '651.1',
    activity:
      'Comercio al por menor de productos textiles, confecciones para el hogar, alfombras y similares y artículos de tapicería',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3010.74 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13812.85 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 38.42 },
      { label: 'Superficie del local independiente', unit: 'Metro cuadrado', amount: 35.28 },
      { label: 'Superficie del local no independiente', unit: 'Metro cuadrado', amount: 107.07 },
    ],
    excess: 23638.67,
  },
  {
    id: 'm17',
    epigrafe: '651.2',
    activity: 'Comercio al por menor de toda clase de prendas para el vestido y tocado',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2569.83 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13995.51 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 49.13 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 56.69 },
    ],
    excess: 24848.0,
  },
  {
    id: 'm18',
    epigrafe: '651.3 y 5',
    activity: 'Comercio al por menor de lencería, corsetería y prendas especiales',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2198.21 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 11998.85 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 47.87 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 75.58 },
    ],
    excess: 19626.46,
  },
  {
    id: 'm19',
    epigrafe: '651.4',
    activity: 'Comercio al por menor de artículos de mercería y paquetería',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1902.18 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10291.93 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 28.98 },
      { label: 'Consumo de energía eléctrica', unit: '100kWh', amount: 58.57 },
    ],
    excess: 14862.05,
  },
  {
    id: 'm20',
    epigrafe: '651.6',
    activity:
      'Comercio al por menor de calzado, artículos de piel e imitación o productos sustitutivos, cinturones, carteras, bolsos, maletas y artículos de viaje en general',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3130.41 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13453.83 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 27.71 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 52.27 },
    ],
    excess: 24306.32,
  },
  {
    id: 'm21',
    epigrafe: '652.2 y 3',
    activity:
      'Comercio al por menor de productos de droguería, perfumería y cosmética, limpieza, pinturas, barnices, disolventes, papeles y otros productos para la decoración y de productos químicos, y de artículos para la higiene y el aseo personal',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3722.48 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 12786.18 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 31.49 },
      { label: 'Superficie del local independiente', unit: 'Metro cuadrado', amount: 18.27 },
      { label: 'Superficie del local no independiente', unit: 'Metro cuadrado', amount: 55.43 },
    ],
    excess: 25333.0,
  },
  {
    id: 'm22',
    epigrafe: '653.1',
    activity: 'Comercio al por menor de muebles',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4075.2 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 16200.02 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 50.39 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 16.38 },
    ],
    excess: 30718.31,
  },
  {
    id: 'm23',
    epigrafe: '653.2',
    activity:
      'Comercio al por menor de material y aparatos eléctricos, electrónicos, electrodomésticos y otros aparatos de uso doméstico accionados por otro tipo de energía distinta de la eléctrica, así como muebles de cocina',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2884.77 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 14656.86 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 100.78 },
      { label: 'Superficie del local independiente', unit: 'Metro cuadrado', amount: 36.53 },
      { label: 'Superficie local no independiente', unit: 'Metro cuadrado', amount: 113.37 },
    ],
    excess: 26189.61,
  },
  {
    id: 'm24',
    epigrafe: '653.3',
    activity:
      'Comercio al por menor de artículos de menaje, ferretería, adorno, regalo, o reclamo (incluyendo bisutería y pequeños electrodomésticos)',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3709.88 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 15116.66 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 51.02 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 21.41 },
    ],
    excess: 24470.09,
  },
  {
    id: 'm25',
    epigrafe: '653.4 y 5',
    activity:
      'Comercio al por menor de materiales de construcción, artículos y mobiliario de saneamiento, puertas, ventanas, persianas, etc.',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3061.12 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 16527.55 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 94.48 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 8.81 },
    ],
    excess: 26454.15,
  },
  {
    id: 'm26',
    epigrafe: '653.9',
    activity: 'Comercio al por menor de otros artículos para el equipamiento del hogar n.c.o.p.',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4950.71 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 20061.07 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 81.88 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 39.68 },
    ],
    excess: 32765.35,
  },
  {
    id: 'm27',
    epigrafe: '654.2',
    activity: 'Comercio al por menor de accesorios y piezas de recambio para vehículos terrestres',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3098.92 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 17018.84 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 201.55 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 617.26 },
    ],
    excess: 32815.74,
  },
  {
    id: 'm28',
    epigrafe: '654.5',
    activity:
      'Comercio al por menor de toda clase de maquinaria (excepto aparatos del hogar, de oficina, médicos, ortopédicos, ópticos y fotográficos)',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 9422.71 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 18858.03 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 39.05 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 132.27 },
    ],
    excess: 31367.06,
  },
  {
    id: 'm29',
    epigrafe: '654.6',
    activity:
      'Comercio al por menor de cubiertas, bandas o bandajes y cámaras de aire para toda clase de vehículos, excepto las actividades de comercio al por mayor de los artículos citados',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2746.19 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 14222.25 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 119.67 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 377.92 },
    ],
    excess: 26970.63,
  },
  {
    id: 'm30',
    epigrafe: '659.2',
    activity: 'Comercio al por menor de muebles de oficina y de máquinas y equipos de oficina',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4157.08 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 16521.25 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 56.69 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 17.01 },
    ],
    excess: 30718.31,
  },
  {
    id: 'm31',
    epigrafe: '659.3',
    activity:
      'Comercio al por menor de aparatos e instrumentos médicos, ortopédicos, ópticos y fotográficos',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 7174.12 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 19273.74 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 119.67 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 1070.76 },
    ],
    excess: 35524.14,
  },
  {
    id: 'm32',
    epigrafe: '659.4',
    activity:
      'Comercio al por menor de libros, periódicos, artículos de papelería y escritorio y artículos de dibujo y bellas artes, excepto en quioscos situados en la vía pública',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4648.37 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 17176.3 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 57.94 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 30.86 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 535.38 },
    ],
    excess: 25207.02,
  },
  {
    id: 'm33',
    epigrafe: '659.4',
    activity:
      'Comercio al por menor de prensa, revistas y libros en quioscos situados en la vía pública',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3476.83 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 17220.39 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 403.11 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 844.02 },
    ],
    excess: 28860.22,
  },
  {
    id: 'm34',
    epigrafe: '659.6',
    activity:
      'Comercio al por menor de juguetes, artículos de deporte, prendas deportivas de vestido, calzado y tocado, armas, cartuchería y artículos de pirotecnia',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2916.26 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13258.56 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 138.57 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 32.75 },
    ],
    excess: 24948.78,
  },
  {
    id: 'm35',
    epigrafe: '659.7',
    activity: 'Comercio al por menor de semillas, abonos, flores y plantas y pequeños animales',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4988.5 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 16124.43 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 258.24 },
    ],
    excess: 23978.8,
  },
  {
    id: 'm36',
    epigrafe: '662.2',
    activity:
      'Comercio al por menor de toda clase de artículos, incluyendo alimentación y bebidas, en establecimientos distintos de los especificados en el Grupo 661 y en el epígrafe 662.1',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4868.82 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 9429.01 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 28.98 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 37.79 },
    ],
    excess: 16395.27,
  },
  {
    id: 'm37',
    epigrafe: '663.1',
    activity:
      'Comercio al por menor fuera de un establecimiento comercial permanente de productos alimenticios, incluso bebidas y helados',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1398.29 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13989.21 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 113.37 },
    ],
    excess: 14379.72,
  },
  {
    id: 'm38',
    epigrafe: '663.2',
    activity:
      'Comercio al por menor fuera de un establecimiento comercial permanente de artículos textiles y de confección',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2991.84 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13982.91 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 239.34 },
    ],
    excess: 19059.58,
  },
  {
    id: 'm39',
    epigrafe: '663.3',
    activity:
      'Comercio al por menor fuera de un establecimiento comercial permanente de calzado, pieles y artículos de cuero',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2613.92 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 11186.32 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 151.16 },
    ],
    excess: 17081.82,
  },
  {
    id: 'm40',
    epigrafe: '663.4',
    activity:
      'Comercio al por menor fuera de un establecimiento comercial permanente de artículos de droguería y cosméticos y de productos químicos en general',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3678.39 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 12641.3 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 113.37 },
    ],
    excess: 16886.56,
  },
  {
    id: 'm41',
    epigrafe: '663.9',
    activity:
      'Comercio al por menor fuera de un establecimiento comercial permanente de otras clases de mercancías n.c.o.p.',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 5448.29 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10537.57 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 283.44 },
    ],
    excess: 18354.14,
  },
  {
    id: 'm42',
    epigrafe: '671.4',
    activity: 'Restaurantes de dos tenedores',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3709.88 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 17434.55 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 201.55 },
      { label: 'Mesas', unit: 'Mesa', amount: 585.77 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 1077.06 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 3810.65 },
    ],
    excess: 51617.08,
  },
  {
    id: 'm43',
    epigrafe: '671.5',
    activity: 'Restaurantes de un tenedor',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3602.8 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 16174.82 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 125.97 },
      { label: 'Mesas', unit: 'Mesa', amount: 220.45 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 1077.06 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 3810.65 },
    ],
    excess: 38081.38,
  },
  {
    id: 'm44',
    epigrafe: '672.1, 2 y 3',
    activity: 'Cafeterías',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1448.68 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 13743.56 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 478.69 },
      { label: 'Mesas', unit: 'Mesa', amount: 377.92 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 957.39 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 3747.67 },
    ],
    excess: 39070.26,
  },
  {
    id: 'm45',
    epigrafe: '673.1',
    activity: 'Cafés y bares de categoría especial',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4056.3 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 15538.66 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 321.23 },
      { label: 'Mesas', unit: 'Mesa', amount: 233.04 },
      { label: 'Longitud de barra', unit: 'Metro', amount: 371.62 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 957.39 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 2903.66 },
    ],
    excess: 30586.03,
  },
  {
    id: 'm46',
    epigrafe: '673.2',
    activity: 'Otros cafés y bares',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1643.93 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 11413.08 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 94.48 },
      { label: 'Mesas', unit: 'Mesa', amount: 119.67 },
      { label: 'Longitud de barra', unit: 'Metro', amount: 163.76 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 806.23 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 2947.75 },
    ],
    excess: 19084.78,
  },
  {
    id: 'm47',
    epigrafe: '675',
    activity: 'Servicios en quioscos, cajones, barracas u otros locales análogos',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2802.88 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 14461.6 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 107.07 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 26.45 },
    ],
    excess: 16596.83,
  },
  {
    id: 'm48',
    epigrafe: '676',
    activity: 'Servicios en chocolaterías, heladerías y horchaterías',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2418.67 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 20016.97 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 541.68 },
      { label: 'Mesas', unit: 'Mesa', amount: 220.45 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 806.23 },
    ],
    excess: 25528.25,
  },
  {
    id: 'm49',
    epigrafe: '681',
    activity: 'Servicio de hospedaje en hoteles y moteles de una o dos estrellas',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 6223.02 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 20438.98 },
      { label: 'Número de plazas', unit: 'Plaza', amount: 371.62 },
    ],
    excess: 61512.19,
  },
  {
    id: 'm50',
    epigrafe: '682',
    activity: 'Servicio de hospedaje en hostales y pensiones',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 5145.96 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 17541.62 },
      { label: 'Número de plazas', unit: 'Plaza', amount: 270.85 },
    ],
    excess: 32840.94,
  },
  {
    id: 'm51',
    epigrafe: '683',
    activity: 'Servicio de hospedaje en fondas y casas de huéspedes',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4478.31 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 14587.57 },
      { label: 'Número de plazas', unit: 'Plaza', amount: 132.27 },
    ],
    excess: 16256.7,
  },
  {
    id: 'm52',
    epigrafe: '691.1',
    activity: 'Reparación de artículos eléctricos para el hogar',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4314.54 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 15538.66 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 17.01 },
    ],
    excess: 21585.33,
  },
  {
    id: 'm53',
    epigrafe: '691.2',
    activity: 'Reparación de vehículos automóviles, bicicletas y otros vehículos',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4157.08 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 17094.42 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 27.08 },
    ],
    excess: 33729.04,
  },
  {
    id: 'm54',
    epigrafe: '691.9',
    activity: 'Reparación de calzado',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1845.5 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10014.78 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 125.97 },
    ],
    excess: 16552.74,
  },
  {
    id: 'm55',
    epigrafe: '691.9',
    activity:
      'Reparación de otros bienes de consumo n.c.o.p. (excepto reparación de calzado, restauración de obras de arte, muebles, antigüedades e instrumentos musicales)',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4094.1 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 16187.42 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 45.35 },
    ],
    excess: 24803.91,
  },
  {
    id: 'm56',
    epigrafe: '692',
    activity: 'Reparación de maquinaria industrial',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4409.02 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 18146.29 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 94.48 },
    ],
    excess: 30352.99,
  },
  {
    id: 'm57',
    epigrafe: '699',
    activity: 'Otras reparaciones n.c.o.p.',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3703.58 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 15230.03 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 88.18 },
    ],
    excess: 23607.18,
  },
  {
    id: 'm58',
    epigrafe: '721.1 y 3',
    activity: 'Transporte urbano colectivo y de viajeros por carretera',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2981.02 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 16016.97 },
      { label: 'Número de asientos', unit: 'Asiento', amount: 121.4 },
    ],
    excess: 35196.62,
  },
  {
    id: 'm59',
    epigrafe: '721.2',
    activity: 'Transporte por autotaxis',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1346.27 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 7656.89 },
      { label: 'Distancia recorrida', unit: '1.000 kilómetros', amount: 45.08 },
    ],
  },
  {
    id: 'm60',
    epigrafe: '722',
    activity: 'Transporte de mercancías por carretera',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2728.59 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10090.99 },
      { label: 'Carga vehículos', unit: 'Tonelada', amount: 126.21 },
    ],
    excess: 33640.86,
  },
  {
    id: 'm61',
    epigrafe: '751.5',
    activity: 'Engrase y lavado de vehículos',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4667.27 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 19191.86 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 30.23 },
    ],
    excess: 28280.74,
  },
  {
    id: 'm62',
    epigrafe: '757',
    activity: 'Servicios de mudanzas',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2566.32 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10175.13 },
      { label: 'Carga vehículos', unit: 'Tonelada', amount: 48.08 },
    ],
    excess: 33640.86,
  },
  {
    id: 'm63',
    epigrafe: '849.5',
    activity:
      'Transporte de mensajería y recadería, cuando la actividad se realice exclusivamente con medios de transporte propios',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 2728.59 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 10090.99 },
      { label: 'Carga vehículos', unit: 'Tonelada', amount: 126.21 },
    ],
    excess: 33640.86,
  },
  {
    id: 'm64',
    epigrafe: '933.1',
    activity: 'Enseñanza de conducción de vehículos terrestres, acuáticos, aeronáuticos, etc.',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3067.42 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 20596.45 },
      { label: 'Número de vehículos', unit: 'Vehículo', amount: 774.72 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 258.24 },
    ],
    excess: 47233.25,
  },
  {
    id: 'm65',
    epigrafe: '933.9',
    activity:
      'Otras actividades de enseñanza, tales como idiomas corte y confección, mecanografía, taquigrafía, preparación de exámenes y oposiciones y similares n.c.o.p.',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1253.49 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 15727.62 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 62.36 },
    ],
    excess: 33697.55,
  },
  {
    id: 'm66',
    epigrafe: '967.2',
    activity: 'Escuelas y servicios de perfeccionamiento del deporte',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 7035.55 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 14215.95 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 34.01 },
    ],
    excess: 37067.3,
  },
  {
    id: 'm67',
    epigrafe: '971.1',
    activity:
      'Tinte, limpieza en seco, lavado y planchado de ropas hechas y de prendas y artículos del hogar usados',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4553.9 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 16773.19 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 45.98 },
    ],
    excess: 37224.77,
  },
  {
    id: 'm68',
    epigrafe: '972.1',
    activity: 'Servicios de peluquería de señora y caballero',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 3161.9 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 9649.47 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 94.48 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 81.88 },
    ],
    excess: 18051.81,
  },
  {
    id: 'm69',
    epigrafe: '972.2',
    activity: 'Salones e institutos de belleza',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 1788.8 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 14896.21 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 88.18 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 55.43 },
    ],
    excess: 26945.44,
  },
  {
    id: 'm70',
    epigrafe: '973.3',
    activity: 'Servicios de copias de documentos con máquinas fotocopiadoras',
    modules: [
      { label: 'Personal asalariado', unit: 'Persona', amount: 4125.59 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 17044.03 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 541.68 },
    ],
    excess: 24192.95,
  },
];
