/**
 * Índices y módulos del régimen especial simplificado del IVA (anexo II de la Orden HAC/1347/2024,
 * BOE-A-2024-24949, para 2025; descargado y leído el 19-10-2026). La Orden HAC/1425/2025
 * (BOE-A-2025-25272, para 2026) repite el anexo II cifra por cifra: comparados todos los importes y
 * porcentajes de los dos textos el 19-10-2026, la única diferencia es la fecha de inicio del índice
 * por nuevas actividades del IRPF. Cada actividad con sus módulos («cuota devengada anual por
 * unidad»), el porcentaje de la cuota mínima y el del ingreso a cuenta de los tres primeros
 * trimestres (instrucción 3 del IVA; null: actividad accesoria de comisiones, instrucción 7), y las
 * actividades del IRPF (modulos-2025.ts) que la llevan como actividad principal. Las demás
 * actividades del IRPF son comercio minorista en recargo de equivalencia (sin módulos del IVA).
 * Epígrafes 681, 722 (salvo residuos) y 933.9: el BOE no separa con punto el módulo de su unidad.
 * Epígrafe 972.2: el BOE imprime «100 Wh»; se lee 100 kWh, como en el resto de actividades.
 */

export interface VatModuleActivity {
  id: string;
  epigrafe: string;
  activity: string;
  modules: { label: string; unit: string; amount: number }[];
  /** Cuota mínima: this % of the cuota devengada por operaciones corrientes. */
  minimum: number;
  /** Ingreso a cuenta of the first three quarters: % of the cuota devengada (null: commissions). */
  quarterly: number | null;
  /** The activities of the income tax (modulos-2025.ts) that have it as their main one. */
  irpf: string[];
}

export const VAT_MODULES_SOURCE =
  'https://www.boe.es/boe/dias/2024/11/30/pdfs/BOE-A-2024-24949.pdf';

export const vatModules2025: VatModuleActivity[] = [
  {
    id: 'v01',
    epigrafe: '419.1',
    activity: 'Industrias del pan y de la bollería',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 1693.54 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 7.09 },
      { label: 'Superficie del horno', unit: '100 decímetros cuadrados', amount: 30.47 },
    ],
    minimum: 20,
    quarterly: 6,
    irpf: ['m01'],
  },
  {
    id: 'v02',
    epigrafe: '419.2',
    activity: 'Industrias de la bollería, pastelería y galletas',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 3064.67 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 8.86 },
      { label: 'Superficie del horno', unit: '100 decímetros cuadrados', amount: 59.34 },
    ],
    minimum: 30,
    quarterly: 9,
    irpf: ['m02'],
  },
  {
    id: 'v03',
    epigrafe: '419.3',
    activity: 'Industrias de elaboración de masas fritas',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2550.92 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 10.63 },
    ],
    minimum: 32,
    quarterly: 10,
    irpf: ['m03'],
  },
  {
    id: 'v04',
    epigrafe: '423.9',
    activity: 'Elaboración de patatas fritas, palomitas de maíz y similares',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2550.92 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 10.63 },
    ],
    minimum: 32,
    quarterly: 10,
    irpf: ['m04'],
  },
  {
    id: 'v05',
    epigrafe: '642.1, 2 y 3',
    activity: 'Elaboración de productos de charcutería por minoristas de carne',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 1753.76 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 2.21 },
    ],
    minimum: 32,
    quarterly: 10,
    irpf: [],
  },
  {
    id: 'v06',
    epigrafe: '642.5',
    activity: 'Comerciantes minoristas matriculados en el epígrafe 642.5 por el asado de pollos',
    modules: [
      { label: 'Personal empleado asado de pollos', unit: 'Persona', amount: 673.16 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 13.29 },
      { label: 'Capacidad del asador', unit: 'Pieza', amount: 62.89 },
    ],
    minimum: 32,
    quarterly: 10,
    irpf: [],
  },
  {
    id: 'v07',
    epigrafe: '644.1',
    activity:
      'Comercio al por menor de pan, pastelería, confitería y similares y de leche y productos lácteos',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2090.35 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 8.86 },
      { label: 'Superficie del horno', unit: '100 decímetros cuadrados', amount: 40.75 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 20,
    quarterly: 6,
    irpf: ['m10'],
  },
  {
    id: 'v08',
    epigrafe: '644.2',
    activity: 'Despachos de pan, panes especiales y bollería',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2090.35 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 8.86 },
      { label: 'Superficie del horno', unit: '100 decímetros cuadrados', amount: 40.75 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 20,
    quarterly: 6,
    irpf: ['m11'],
  },
  {
    id: 'v09',
    epigrafe: '644.3',
    activity: 'Comercio al por menor de productos de pastelería, bollería y confitería',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 3064.67 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 8.86 },
      { label: 'Superficie del horno', unit: '100 decímetros cuadrados', amount: 59.34 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 30,
    quarterly: 9,
    irpf: ['m12'],
  },
  {
    id: 'v10',
    epigrafe: '644.6',
    activity:
      'Comercio al por menor de masas fritas, con o sin coberturas o rellenos, patatas fritas, productos de aperitivo, frutos secos, golosinas, preparados de chocolate y bebidas refrescantes',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2550.92 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 10.63 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 32,
    quarterly: 10,
    irpf: ['m13'],
  },
  {
    id: 'v11',
    epigrafe: '653.2',
    activity:
      'Reparación de artículos de su actividad efectuadas por comerciantes minoristas matriculados en el epígrafe 653.2',
    modules: [
      { label: 'Personal empleado reparación', unit: 'Persona', amount: 5819.91 },
      { label: 'Superficie taller reparación', unit: 'Metro cuadrado', amount: 5.71 },
    ],
    minimum: 48,
    quarterly: 15,
    irpf: [],
  },
  {
    id: 'v12',
    epigrafe: '653.4 y 5',
    activity:
      'Comercio al por menor de materiales de construcción, artículos y mobiliario de saneamiento, puertas, ventanas, persianas, etc.',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 12317.71 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 239.74 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 9.1 },
    ],
    minimum: 13,
    quarterly: 4,
    irpf: ['m25'],
  },
  {
    id: 'v13',
    epigrafe: '654.2',
    activity: 'Comercio al por menor de accesorios y piezas de recambio para vehículos terrestres',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 15558.35 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 272.8 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 620.03 },
    ],
    minimum: 13,
    quarterly: 4,
    irpf: ['m27'],
  },
  {
    id: 'v14',
    epigrafe: '654.5',
    activity:
      'Comercio al por menor de toda clase de maquinaria (excepto aparatos del hogar, de oficina, médicos, ortopédicos, ópticos y fotográficos)',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 18021.89 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 74.41 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 82.66 },
    ],
    minimum: 13,
    quarterly: 4,
    irpf: ['m28'],
  },
  {
    id: 'v15',
    epigrafe: '654.6',
    activity:
      'Comercio al por menor de cubiertas, bandas o bandajes y cámaras de aire para toda clase de vehículos',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 14152.98 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 206.67 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 372.02 },
    ],
    minimum: 13,
    quarterly: 4,
    irpf: ['m29'],
  },
  {
    id: 'v16',
    epigrafe: '659.3',
    activity:
      'Comerciantes minoristas matriculados en el epígrafe 659.3 por el servicio de recogida de negativos y otro material fotográfico impresionado para su procesado en laboratorio de terceros y la entrega de las correspondientes copias y ampliaciones',
    modules: [
      {
        label: 'Personal empleado recogida material fotográfico',
        unit: 'Persona',
        amount: 14533.25,
      },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 30.59 },
    ],
    minimum: 13,
    quarterly: 4,
    irpf: [],
  },
  {
    id: 'v17',
    epigrafe: '659.4',
    activity:
      'Comerciantes minoristas matriculados en el epígrafe 659.4 por el servicio de publicidad exterior y comercialización de tarjetas para el transporte público, tarjetas de uso telefónico y otras similares, así como loterías',
    modules: [{ label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 }],
    minimum: 75,
    quarterly: null,
    irpf: [],
  },
  {
    id: 'v18',
    epigrafe: '647.1, 2 y 3, 652.2 y 3 y 662.2',
    activity:
      'Comerciantes minoristas matriculados en los epígrafes 647.1, 2 y 3, 652.2 y 3 y 662.2 por el servicio de comercialización de loterías',
    modules: [{ label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 }],
    minimum: 75,
    quarterly: null,
    irpf: [],
  },
  {
    id: 'v19',
    epigrafe: '663.1',
    activity:
      'Comercio al por menor fuera de un establecimiento comercial permanente dedicado exclusivamente a la comercialización de masas fritas, con o sin coberturas o rellenos, patatas fritas, productos de aperitivo, frutos secos, golosinas, preparación de chocolate y bebidas refrescantes y facultado para la elaboración de los productos propios de churrería y patatas fritas en la propia instalación o vehículo',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 5881.32 },
      { label: 'Potencia fiscal del vehículo', unit: 'CVF', amount: 43.4 },
    ],
    minimum: 20,
    quarterly: 6,
    irpf: ['m37'],
  },
  {
    id: 'v20',
    epigrafe: '671.4',
    activity: 'Restaurantes de dos tenedores',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2993.81 },
      { label: 'Potencia eléctrica', unit: 'Kw. Contratado', amount: 150.57 },
      { label: 'Mesas', unit: 'Mesa', amount: 168.29 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 239.15 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 841.46 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 13,
    quarterly: 4,
    irpf: ['m42'],
  },
  {
    id: 'v21',
    epigrafe: '671.5',
    activity: 'Restaurantes de un tenedor',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2400.36 },
      { label: 'Potencia eléctrica', unit: 'Kw. Contratado', amount: 70.86 },
      { label: 'Mesas', unit: 'Mesa', amount: 124 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 239.15 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 841.46 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 20,
    quarterly: 6,
    irpf: ['m43'],
  },
  {
    id: 'v22',
    epigrafe: '672.1, 2 y 3',
    activity: 'Cafeterías',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2356.07 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 124 },
      { label: 'Mesas', unit: 'Mesa', amount: 70.86 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 221.43 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 832.6 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 13,
    quarterly: 4,
    irpf: ['m44'],
  },
  {
    id: 'v23',
    epigrafe: '673.1',
    activity: 'Cafés y bares de categoría especial',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 3294.97 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 69.09 },
      { label: 'Mesas', unit: 'Mesa', amount: 60.23 },
      { label: 'Longitud de la barra', unit: 'Metro', amount: 77.95 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 221.43 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 655.45 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 6,
    quarterly: 2,
    irpf: ['m45'],
  },
  {
    id: 'v24',
    epigrafe: '673.2',
    activity: 'Otros cafés y bares',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2577.52 },
      { label: 'Potencia eléctrica', unit: 'KW Contratado', amount: 47.83 },
      { label: 'Mesas', unit: 'Mesa', amount: 56.69 },
      { label: 'Longitud de la barra', unit: 'Metro', amount: 62.89 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 177.15 },
      { label: 'Máquinas tipo «B»', unit: 'Máquina tipo «B»', amount: 655.45 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 6,
    quarterly: 2,
    irpf: ['m46'],
  },
  {
    id: 'v25',
    epigrafe: '675',
    activity: 'Servicios en quioscos, cajones, barracas u otros locales análogos',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 4357.86 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 50.48 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 4.06 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 3,
    quarterly: 1,
    irpf: ['m47'],
  },
  {
    id: 'v26',
    epigrafe: '676',
    activity: 'Servicios en chocolaterías, heladerías y horchaterías',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 3817.55 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 141.72 },
      { label: 'Mesas', unit: 'Mesa', amount: 46.05 },
      { label: 'Máquinas tipo «A»', unit: 'Máquina tipo «A»', amount: 177.15 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 20,
    quarterly: 6,
    irpf: ['m48'],
  },
  {
    id: 'v27',
    epigrafe: '681',
    activity: 'Servicio de hospedaje en hoteles y moteles de una o dos estrellas',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2604.09 },
      { label: 'Número de plazas', unit: 'Plaza', amount: 53.14 },
      { label: 'Importe total de las comisiones', unit: 'Euro', amount: 0.21 },
    ],
    minimum: 20,
    quarterly: 6,
    irpf: ['m49'],
  },
  {
    id: 'v28',
    epigrafe: '682',
    activity: 'Servicio de hospedaje en hostales y pensiones',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2533.22 },
      { label: 'Número de plazas', unit: 'Plaza', amount: 55.8 },
    ],
    minimum: 20,
    quarterly: 6,
    irpf: ['m50'],
  },
  {
    id: 'v29',
    epigrafe: '683',
    activity: 'Servicio de hospedaje en fondas y casas de huéspedes',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 1762.62 },
      { label: 'Número de plazas', unit: 'Plaza', amount: 29.22 },
    ],
    minimum: 30,
    quarterly: 9,
    irpf: ['m51'],
  },
  {
    id: 'v30',
    epigrafe: '691.1',
    activity: 'Reparación de artículos eléctricos para el hogar',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 5819.91 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 5.71 },
    ],
    minimum: 48,
    quarterly: 15,
    irpf: ['m52'],
  },
  {
    id: 'v31',
    epigrafe: '691.2',
    activity: 'Reparación de vehículos automóviles, bicicletas y otros vehículos',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 8556.27 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 16.54 },
    ],
    minimum: 30,
    quarterly: 9,
    irpf: ['m53'],
  },
  {
    id: 'v32',
    epigrafe: '691.9',
    activity: 'Reparación de calzado',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 3000.89 },
      { label: 'Consumo de energía eléctrica', unit: '100 Kwh', amount: 36.37 },
    ],
    minimum: 48,
    quarterly: 15,
    irpf: ['m54'],
  },
  {
    id: 'v33',
    epigrafe: '691.9',
    activity:
      'Reparación de otros bienes de consumo n.c.o.p. (excepto reparación de calzado, restauración de obras de arte, muebles, antigüedades e instrumentos musicales)',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 5381.76 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 13.23 },
    ],
    minimum: 48,
    quarterly: 15,
    irpf: ['m55'],
  },
  {
    id: 'v34',
    epigrafe: '692',
    activity: 'Reparación de maquinaria industrial',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 9721.9 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 53.75 },
    ],
    minimum: 30,
    quarterly: 9,
    irpf: ['m56'],
  },
  {
    id: 'v35',
    epigrafe: '699',
    activity: 'Otras reparaciones n.c.o.p.',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 7671.69 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 46.31 },
    ],
    minimum: 32,
    quarterly: 10,
    irpf: ['m57'],
  },
  {
    id: 'v36',
    epigrafe: '721.1 y 3',
    activity: 'Transporte urbano colectivo y de viajeros por carretera',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 1700.62 },
      { label: 'Número de asientos', unit: 'Asiento', amount: 79.72 },
    ],
    minimum: 1,
    quarterly: 1,
    irpf: ['m58'],
  },
  {
    id: 'v37',
    epigrafe: '721.2',
    activity: 'Transporte por autotaxis',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 903.46 },
      { label: 'Distancia recorrida', unit: '1.000 kilómetros', amount: 8.78 },
    ],
    minimum: 10,
    quarterly: 5,
    irpf: ['m59'],
  },
  {
    id: 'v38',
    epigrafe: '722',
    activity: 'Transporte de mercancías por carretera, excepto residuos',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 4149.99 },
      { label: 'Carga vehículos', unit: 'Tonelada', amount: 388.55 },
    ],
    minimum: 10,
    quarterly: 5,
    irpf: ['m60'],
  },
  {
    id: 'v39',
    epigrafe: '722',
    activity: 'Transporte de residuos por carretera',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 1948.64 },
      { label: 'Carga vehículos', unit: 'Tonelada', amount: 181.58 },
    ],
    minimum: 1,
    quarterly: 1,
    irpf: ['m60'],
  },
  {
    id: 'v40',
    epigrafe: '751.5',
    activity: 'Engrase y lavado de vehículos',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 8556.27 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 16.54 },
    ],
    minimum: 30,
    quarterly: 9,
    irpf: ['m61'],
  },
  {
    id: 'v41',
    epigrafe: '757',
    activity: 'Servicios de mudanzas',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 5712.43 },
      { label: 'Carga vehículos', unit: 'Tonelada', amount: 256.27 },
    ],
    minimum: 10,
    quarterly: 5,
    irpf: ['m62'],
  },
  {
    id: 'v42',
    epigrafe: '849.5',
    activity:
      'Transporte de mensajería y recadería, cuando la actividad se realice exclusivamente con medios de transporte propios',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 4149.99 },
      { label: 'Carga vehículos', unit: 'Tonelada', amount: 388.55 },
    ],
    minimum: 10,
    quarterly: 5,
    irpf: ['m63'],
  },
  {
    id: 'v43',
    epigrafe: '933.1',
    activity: 'Enseñanza de conducción de vehículos terrestres, acuáticos, aeronáuticos, etc.',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 3000.89 },
      { label: 'Número de vehículos', unit: 'Vehículo', amount: 256.27 },
      { label: 'Potencia fiscal vehículo', unit: 'CVF', amount: 107.47 },
    ],
    minimum: 48,
    quarterly: 15,
    irpf: ['m64'],
  },
  {
    id: 'v44',
    epigrafe: '933.9',
    activity:
      'Otras actividades de enseñanza, tales como idiomas, corte y confección, mecanografía, taquigrafía, preparación de exámenes y oposiciones y similares n.c.o.p.',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2413.95 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 2.64 },
    ],
    minimum: 48,
    quarterly: 15,
    irpf: ['m65'],
  },
  {
    id: 'v45',
    epigrafe: '967.2',
    activity: 'Escuelas y servicios de perfeccionamiento del deporte',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 3441.1 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 5.58 },
    ],
    minimum: 3,
    quarterly: 2,
    irpf: ['m66'],
  },
  {
    id: 'v46',
    epigrafe: '971.1',
    activity:
      'Tinte, limpieza en seco, lavado y planchado de ropas hechas y de prendas y artículos del hogar usados',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 3844.13 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 14.06 },
    ],
    minimum: 48,
    quarterly: 15,
    irpf: ['m67'],
  },
  {
    id: 'v47',
    epigrafe: '972.1',
    activity: 'Servicios de peluquería de señora y caballero',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2562.75 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 41.33 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 17.48 },
    ],
    minimum: 13,
    quarterly: 5,
    irpf: ['m68'],
  },
  {
    id: 'v48',
    epigrafe: '972.2',
    activity: 'Salones e institutos de belleza',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 2562.75 },
      { label: 'Superficie del local', unit: 'Metro cuadrado', amount: 41.33 },
      { label: 'Consumo de energía eléctrica', unit: '100 kWh', amount: 17.36 },
    ],
    minimum: 32,
    quarterly: 10,
    irpf: ['m69'],
  },
  {
    id: 'v49',
    epigrafe: '973.3',
    activity: 'Servicios de copias de documentos con máquinas fotocopiadoras',
    modules: [
      { label: 'Personal empleado', unit: 'Persona', amount: 13136.13 },
      { label: 'Potencia eléctrica', unit: 'KW contratado', amount: 239.74 },
    ],
    minimum: 30,
    quarterly: 9,
    irpf: ['m70'],
  },
];
