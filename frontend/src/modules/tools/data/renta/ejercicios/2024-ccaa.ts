import type { IncomeLimit } from '../../../domain/rentaData';
import type { RegionYear } from './regions';

/**
 * The 15 communities of the common regime in the Renta 2024, built from their data of 2025. Each
 * page of the Manual práctico de Renta 2024 (tomo 2, deducciones autonómicas; c14, mínimos; c15,
 * escalas) was compared with its page of 2025 on 22-10-2026: same text and figures except what is
 * here. Deductions of 2025 with no page in 2024 are `absent`; those of 2024 with no page in 2025
 * are in `notInApp`. The boxes of annex B are the same in 2024 (same element of the XSD).
 */
const AEAT =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/';
const SCALE = `${AEAT}irpf-2024/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/`;
const PAGES = `${AEAT}irpf-2024-deducciones-autonomicas/`;

/** The question of a birth or adoption of the year, asked in many communities. */
const BORN: [string, string] = [
  '¿El hijo nació o lo adoptaste en 2025 (o lo acogiste ese año)?',
  '¿El hijo nació o lo adoptaste en 2024 (o lo acogiste ese año)?',
];

/** Comunitat Valenciana, health and sport in 2024: before the Decreto-ley 1/2026 raised them. */
const CV_HEALTH_2024: IncomeLimit = {
  individual: 32000,
  joint: 48000,
  phaseOutFrom: 29000,
  phaseOutTo: 32000,
  phaseOutOf: 'limit',
  note: 'Límites completos por debajo de 29.000 € (45.000 € en conjunta); entre 29.000 y 32.000 € (45.000 y 48.000 €) bajan en línea recta hasta cero.',
};

const ASTURIAS_TOWNS =
  'concejo en riesgo de despoblación (hasta 20.000 habitantes y con al menos un 10 % menos de población que en 2000)';

const regions: Record<string, RegionYear> = {
  andalucia: {
    scaleSource: `${SCALE}comunidad-autonoma-andalucia.html`,
    absent: [
      'andalucia-ejercicio-fisico-deporte',
      'andalucia-gastos-veterinarios',
      'andalucia-enfermedad-celiaca',
    ],
    changes: {
      'andalucia-nacimiento-adopcion-acogimiento': {
        incomeLimit: { individual: 25000, joint: 30000 },
        replace: [
          [
            'Acogimiento: convivir',
            'Bases imponibles general y del ahorro de hasta 25.000 euros (individual) o 30.000 (conjunta); si un progenitor las supera, el otro aplica el importe entero. Acogimiento: convivir',
          ],
        ],
      },
      'andalucia-vivienda-protegida-jovenes': { percent: 5, replace: [['El 6 %', 'El 5 %']] },
      'andalucia-alquiler-vivienda-habitual': {
        limit: 600,
        summary:
          'El 15 % del alquiler pagado, hasta 600 euros al año (900 si tienes discapacidad). Para menores de 35, mayores de 65 o víctimas de violencia doméstica o de terrorismo.',
        checks: [
          {
            kind: 'ask',
            id: 'perfil',
            q: '¿Tienes menos de 35 años o más de 65, o eres víctima de violencia doméstica o de terrorismo, y eres titular del contrato?',
          },
        ],
      },
      'andalucia-conyuge-discapacidad': {
        replace: [['no presenta declaración individual', 'no presenta declaración']],
      },
      'andalucia-adopcion-internacional': { shiftYears: true },
    },
    notInApp: [],
  },
  aragon: {
    scaleSource: `${SCALE}comunidad-autonoma-aragon.html`,
    absent: [],
    changes: { 'aragon-adopcion-internacional': { shiftYears: true } },
    notInApp: [
      'Por acogimiento de personas o familias ucranianas desplazadas por el conflicto armado',
      'Por ayudas de carácter humanitario al pueblo ucraniano',
    ],
  },
  asturias: {
    // Its scale changed and its own minimums started in 2025 (Manual 2025, c14 and c15).
    scale: [
      { from: 0, rate: 10 },
      { from: 12450, rate: 12 },
      { from: 17707.2, rate: 14 },
      { from: 33007.2, rate: 18.5 },
      { from: 53407.2, rate: 21.5 },
      { from: 70000, rate: 22.5 },
      { from: 90000, rate: 25 },
      { from: 175000, rate: 25.5 },
    ],
    scaleSource: `${SCALE}comunidad-autonoma-principado-asturias.html`,
    minimums: 'state',
    absent: ['asturias-enfermedad-celiaca'],
    // 2024: the towns at risk are those of up to 20,000 people that lost 10 % since 2000.
    replace: [
      [
        'concejo en riesgo de despoblamiento o en crisis demográfica (Decreto 83/2025)',
        ASTURIAS_TOWNS,
      ],
      ['concejo en riesgo de despoblamiento (Decreto 83/2025)', ASTURIAS_TOWNS],
      ['(Decreto 83/2025)', '(lista de 2024 del Principado)'],
      ['Concejos según el Decreto 83/2025.', 'Concejos de la lista de 2024 del Principado.'],
      ['riesgo de despoblamiento o en crisis demográfica', 'riesgo de despoblación'],
      ['riesgo de despoblamiento o crisis demográfica', 'riesgo de despoblación'],
      ['riesgo de despoblamiento', 'riesgo de despoblación'],
      ['concejos en riesgo demográfico', 'concejos en riesgo de despoblación'],
    ],
    changes: {
      'asturias-cuidado-descendientes-25': {
        amount: undefined,
        perChild: [500, 600],
        summary:
          '500 euros por el primer descendiente de hasta 25 años que te dé derecho al mínimo por descendientes y 600 euros por cada uno de los siguientes.',
      },
      'asturias-vivienda-protegida': {
        summary:
          'El 100 % del gasto en comprar o rehabilitar una vivienda habitual protegida, con un máximo de 5.000 euros al año.',
      },
      'asturias-nacimiento-segundo-hijo-despoblamiento': {
        url: `${PAGES}comunidad-autonoma-principado-asturias/nacimiento-adopcion-segundo-ss-hijos-riesgo.html`,
      },
      'asturias-autonomos-despoblamiento': {
        url: `${PAGES}comunidad-autonoma-principado-asturias/contribuyentes-que-se-establezcan-autonomos-riesgo.html`,
        shiftYears: true,
      },
      'asturias-transporte-publico-despoblamiento': {
        url: `${PAGES}comunidad-autonoma-principado-asturias/gastos-transporte-publico-residentes-zonas-riesgo.html`,
      },
      'asturias-adopcion-internacional': { shiftYears: true },
      'asturias-partos-multiples': { shiftYears: true },
      'asturias-gestion-forestal-sostenible': { shiftYears: true },
    },
    notInApp: [],
  },
  baleares: {
    scaleSource: `${SCALE}comunidad-autonoma-illes-balears.html`,
    absent: ['baleares-vivienda-ocupada-ilegalmente'],
    changes: {
      // The self-employed (183 days in the RETA) were added in 2025 (Manual 2025: not for those who died before 25-7-2025).
      'baleares-alquiler-vivienda-habitual': {
        replace: [
          [
            'con discapacidad, familia numerosa/monoparental o autónomo',
            'con discapacidad o familia numerosa/monoparental',
          ],
        ],
      },
      'baleares-nacimiento': { shiftYears: true },
      'baleares-adopcion': { shiftYears: true },
    },
    notInApp: [
      'Para compensar el incremento del coste de los préstamos hipotecarios a tipo de interés variable',
      'Por gastos relativos a los ascendientes mayores de 65 años',
    ],
  },
  canarias: {
    scale: [
      { from: 0, rate: 9 },
      { from: 13465, rate: 11.5 },
      { from: 19022, rate: 14 },
      { from: 35185, rate: 18.5 },
      { from: 56382, rate: 23.5 },
      { from: 91350, rate: 25 },
      { from: 121200, rate: 26 },
    ],
    scaleSource: `${SCALE}comunidad-autonoma-canarias.html`,
    absent: ['canarias-inversion-nuevas-empresas'],
    // The income limits of 2024, before they went up in 2025.
    replace: [
      [
        '46.455 € (individual) o 61.770 € (conjunta)',
        '45.500 € (individual) o 60.500 € (conjunta)',
      ],
      ['37.062 €', '36.300 €'],
      ['26.035 €', '25.500 €'],
      ['46.455 €', '45.500 €'],
      ['35.735 €', '35.000 €'],
    ],
    changes: {
      'canarias-desempleados': { replace: [['15.876 €', '11.200 €']], shiftYears: true },
      'canarias-acogimiento-menores': { shiftYears: true },
      'canarias-puesta-viviendas-alquiler': { shiftYears: true },
    },
    notInApp: [
      'Por donaciones en metálico a descendientes menores de 35 años para comprar o rehabilitar su primera vivienda habitual',
    ],
  },
  cantabria: {
    scaleSource: `${SCALE}comunidad-autonoma-cantabria.html`,
    absent: [
      'cantabria-arrendamiento-viviendas-vacias',
      'cantabria-residencia-despoblamiento',
      'cantabria-inversiones-nuevos-contribuyentes-extranjero',
      'cantabria-nuevos-residentes-desplazamiento',
    ],
    // 2024: the rural areas with a demographic challenge of the Orden HAC/11/2024.
    replace: [
      [
        'un municipio de la lista de la Orden PRE/1/2025',
        'una zona rural con reto demográfico (Orden HAC/11/2024)',
      ],
      [
        'un municipio en riesgo de despoblamiento de la Orden PRE/1/2025',
        'una zona rural con reto demográfico (Orden HAC/11/2024)',
      ],
      [
        'municipio de la lista de la Orden PRE/1/2025',
        'zona rural con reto demográfico (Orden HAC/11/2024)',
      ],
      [
        'Municipio de la lista de la Orden PRE/1/2025',
        'Zona rural con reto demográfico (Orden HAC/11/2024)',
      ],
      [
        'un municipio de Cantabria en riesgo de despoblamiento',
        'una zona rural de Cantabria con reto demográfico',
      ],
      ['tu municipio en riesgo de despoblamiento', 'tu zona rural con reto demográfico'],
      ['municipios en riesgo de despoblamiento', 'zonas rurales con reto demográfico'],
      ['un municipio en riesgo de despoblamiento', 'una zona rural con reto demográfico'],
    ],
    changes: {
      'cantabria-alquiler-despoblamiento-arrendatario': {
        url: `${PAGES}comunidad-autonoma-cantabria/arrendamiento-viviendas-situadas-zonas-cantabria-demografico.html`,
      },
      'cantabria-gastos-guarderia-despoblamiento': {
        url: `${PAGES}comunidad-autonoma-cantabria/gastos-guarderia-contribytes-residencia-zonas-riesgo.html`,
      },
      'cantabria-traslado-municipio-despoblamiento': {
        url: `${PAGES}comunidad-autonoma-cantabria/trasladar-residencia-zona-riesgo-motivos-laborales.html`,
        shiftYears: true,
      },
      'cantabria-gastos-traslado-estudios-despoblamiento': {
        url: `${PAGES}comunidad-autonoma-cantabria/gastos-traslado-razon-estudios-zonas-demografico.html`,
      },
      'cantabria-acogimiento-familiar': { shiftYears: true },
    },
    notInApp: [],
  },
  'castilla-la-mancha': {
    scaleSource: `${SCALE}comunidad-autonoma-castilla-mancha.html`,
    absent: ['castilla-la-mancha-ahorro-primera-vivienda', 'castilla-la-mancha-perros-asistencia'],
    // The rent deductions had a top of 450 € in 2024 (500 € from 2025).
    changes: Object.fromEntries(
      [
        ['castilla-la-mancha-alquiler-menores-36', 'máx.'],
        ['castilla-la-mancha-alquiler-dacion-en-pago', 'máx.'],
        ['castilla-la-mancha-alquiler-familias-numerosas', 'hasta'],
        ['castilla-la-mancha-alquiler-familias-monoparentales', 'hasta'],
        ['castilla-la-mancha-alquiler-discapacidad', 'hasta'],
      ].map(([id, word]) => [
        id,
        { limit: 450, replace: [[`${word} 500 euros`, `${word} 450 euros`]] as [string, string][] },
      ])
    ),
    notInApp: [],
  },
  'castilla-y-leon': {
    scaleSource: `${SCALE}comunidad-castilla-leon.html`,
    absent: [],
    changes: {
      'castilla-y-leon-rehabilitacion-subvencionada': {
        replace: [
          ['(convocatorias de 2021 a 2024 con pagos en 2025)', '(con pagos en 2024)'],
          ['¿Cobraste en 2025', '¿Cobraste en 2024'],
        ],
      },
      'castilla-y-leon-partos-adopciones-multiples': { shiftYears: true },
      'castilla-y-leon-partos-multiples-adicional': { shiftYears: true },
      'castilla-y-leon-gastos-adopcion': { shiftYears: true },
      'castilla-y-leon-gastos-adopcion-internacional': { shiftYears: true },
      'castilla-y-leon-movilidad-sostenible': { shiftYears: true },
    },
    notInApp: [],
  },
  cataluna: {
    // Its scale changed in 2025 (Manual 2025, c15).
    scale: [
      { from: 0, rate: 10.5 },
      { from: 12450, rate: 12 },
      { from: 17707.2, rate: 14 },
      { from: 21000, rate: 15 },
      { from: 33007.2, rate: 18.8 },
      { from: 53407.2, rate: 21.5 },
      { from: 90000, rate: 23.5 },
      { from: 120000, rate: 24.5 },
      { from: 175000, rate: 25.5 },
    ],
    scaleSource: `${SCALE}comunidad-autonoma-cataluna.html`,
    absent: [
      'cataluna-alquiler-victimas-violencia-machista',
      'cataluna-cooperativas-agrarias-vivienda',
    ],
    changes: {
      'cataluna-nacimiento-adopcion-acogimiento': {
        url: `${PAGES}comunidad-autonoma-cataluna/nacimiento-adopcion-hijo-hija.html`,
        title: 'Por nacimiento o adopción de un hijo',
        requirements:
          'Nacimiento o adopción de un hijo en el año. La página no indica límite de renta.',
        checks: [{ kind: 'ask', id: 'nacimiento', q: '¿El hijo nació o lo adoptaste en 2024?' }],
      },
      'cataluna-alquiler-vivienda-habitual': {
        limit: 300,
        summary:
          'Deduces el 10 % del alquiler: hasta 300 euros (600 en conjunta) si tienes 32 años o menos, estuviste 183 días en paro, tienes discapacidad de 65 % o más o eres viudo/a de 65 o más; hasta 600 si eres familia numerosa o monoparental.',
        requirements:
          'Base general + ahorro menos mínimo personal y familiar hasta 20.000 euros (individual) o 30.000 (conjunta), y el alquiler supera el 10 % de tus rendimientos netos. Hay que poner el NIF del arrendador. Una vivienda no da más de 600 euros.',
        checks: [
          {
            kind: 'ask',
            id: 'situacion',
            q: '¿Tienes 32 años o menos, estuviste 183 días o más en paro, tienes discapacidad del 65 % o más, eres viudo/a de 65 o más o eres familia numerosa o monoparental?',
          },
          {
            kind: 'ask',
            id: 'arrendador',
            q: '¿Conoces el NIF del arrendador para ponerlo en la declaración?',
          },
        ],
      },
      'cataluna-viudedad': { shiftYears: true },
    },
    notInApp: [],
  },
  'comunitat-valenciana': {
    scaleSource: `${SCALE}comunitat-valenciana.html`,
    absent: ['comunitat-valenciana-fomento-formacion-musical'],
    // The guard with a view to adoption was added in 2025 (Ley 5/2025).
    replace: [
      ['la madre, acogedora o guardadora que trabaja', 'la madre o acogedora que trabaja'],
      [
        'de hijos, acogidos o guardados con fines de adopción menores de tres años',
        'de hijos o acogidos permanentes menores de tres años',
      ],
    ],
    changes: {
      'comunitat-valenciana-nacimiento-adopcion-acogimiento': {
        url: `${PAGES}comunitat-valenciana/nacimiento-adopcion-acogimiento-familiar.html`,
        perChild: undefined,
        amount: 300,
        unit: 'hijo o acogido',
        summary:
          '300 euros por cada hijo nacido o adoptado en 2024 (y también en los dos años siguientes) y por cada menor en acogimiento familiar en el año.',
        requirements:
          'El hijo o acogido da derecho a mínimo por descendientes. Los hijos nacidos o adoptados en 2022 y 2023 también la dan en 2024. El acogimiento se prorratea por días. Se reparte entre declarantes.',
        checks: [
          {
            kind: 'ask',
            id: 'nacimiento',
            q: '¿El hijo nació o lo adoptaste en 2022, 2023 o 2024 (o lo acogiste en 2024)?',
          },
          {
            kind: 'ask',
            id: 'minimo',
            q: '¿Los hijos por los que la aplicas te dan derecho al mínimo por descendientes y conviven contigo?',
          },
        ],
      },
      'comunitat-valenciana-nacimiento-hijo-discapacidad': {
        url: `${PAGES}comunitat-valenciana/nacimiento-adopcion-hijos-discapacidad.html`,
        title: 'Por nacimiento o adopción de hijo con discapacidad',
        replace: [
          [
            '¿El hijo nació o lo adoptaste en 2024 (o lo acogiste ese año)?',
            '¿El hijo nació o lo adoptaste en 2024?',
          ],
        ],
        summary:
          'Da 246 euros por el hijo con discapacidad (65 % o más, o psíquica de más del 33 %) nacido o adoptado en el año; 303 euros si tiene al menos un hermano con discapacidad.',
        requirements:
          'Nacimiento o adopción en el año y derecho a mínimo por descendientes. Discapacidad con certificado oficial. Se reparte entre progenitores.',
      },
      ...Object.fromEntries(
        [
          'comunitat-valenciana-salud-bucodental',
          'comunitat-valenciana-salud-optica',
          'comunitat-valenciana-salud-mental',
          'comunitat-valenciana-salud-cronicas-raras',
          'comunitat-valenciana-salud-dano-cerebral-alzheimer',
          'comunitat-valenciana-practica-deporte',
        ].map((id) => [id, { incomeLimit: CV_HEALTH_2024 }])
      ),
      'comunitat-valenciana-vehiculos-movilidad-personal': { replace: [['770 €', '750 €']] },
      // The first 150 € of a donation at 20 % in 2024 (250 € from 2025).
      ...Object.fromEntries(
        [
          'comunitat-valenciana-donaciones-finalidad-ecologica',
          'comunitat-valenciana-donaciones-patrimonio-cultural',
          'comunitat-valenciana-donativos-conservacion-bienes',
          'comunitat-valenciana-titulares-conservacion-bienes',
          'comunitat-valenciana-donaciones-lengua-valenciana',
        ].map((id) => [
          id,
          { replace: [['primeros 250 euros', 'primeros 150 euros']] as [string, string][] },
        ])
      ),
      'comunitat-valenciana-donaciones-otros-fines-culturales': {
        replace: [['primeros 250 €', 'primeros 150 €']],
      },
      'comunitat-valenciana-nacimiento-adopcion-multiples': { shiftYears: true },
      'comunitat-valenciana-material-escolar': { shiftYears: true },
      'comunitat-valenciana-tratamientos-fertilidad': { shiftYears: true },
      'comunitat-valenciana-vivienda-ayudas-publicas': { shiftYears: true },
      'comunitat-valenciana-arrendador-alquiler-asequible': { shiftYears: true },
    },
    notInApp: [],
  },
  extremadura: {
    scaleSource: `${SCALE}comunidad-autonoma-extremadura.html`,
    absent: [
      'extremadura-ayudas-ela',
      'extremadura-enfermos-ela-familiares',
      'extremadura-traslado-residencia',
      'extremadura-donaciones-cultura-deportistas',
      // In 2024 only for taxpayers who died from 26-10 to 21-11-2024 (Decreto-ley 2/2024, repealed).
      'extremadura-arrendadores-viviendas-vacias',
      'extremadura-rehabilitacion-rural-alquiler',
    ],
    changes: { 'extremadura-partos-multiples': { shiftYears: true } },
    notInApp: [],
  },
  galicia: {
    scaleSource: `${SCALE}comunidad-autonoma-galicia.html`,
    absent: [
      'galicia-ayudas-ela',
      'galicia-ayudas-talidomida',
      'galicia-adecuacion-inmueble-vacio',
      'galicia-arrendamiento-viviendas-vacias',
      'galicia-incendios-forestales-2025',
      'galicia-libros-texto-material-escolar',
    ],
    changes: {},
    notInApp: [
      'Por las ayudas recibidas por los daños de los incendios de octubre de 2017',
      'Por los daños de la explosión de material pirotécnico de Tui de mayo de 2018',
    ],
  },
  'la-rioja': {
    scaleSource: `${SCALE}comunidad-autonoma-rioja.html`,
    absent: [
      'la-rioja-enfermedad-celiaca',
      'la-rioja-fijacion-poblacion-medio-rural',
      'la-rioja-cuotas-organizaciones-agrarias',
    ],
    changes: {
      'la-rioja-intereses-prestamos-vivienda': {
        replace: [['Aplicable en 2023, 2024 y 2025.', 'Aplicable en 2023 y 2024.']],
      },
      'la-rioja-vehiculos-electricos-nuevos': { shiftYears: true },
      'la-rioja-vivienda-pequenos-municipios': { shiftYears: true },
    },
    notInApp: [],
  },
  madrid: {
    scaleSource: `${SCALE}comunidad-madrid.html`,
    absent: [],
    changes: {
      'madrid-obtencion-familia-numerosa': {
        replace: [
          [
            'en 2025 (o en 2023-2024 si es de categoría especial)',
            'en 2024 (o en 2023 si es de categoría especial)',
          ],
        ],
      },
      'madrid-adopcion-internacional': { shiftYears: true },
    },
    notInApp: [],
  },
  murcia: {
    scaleSource: `${SCALE}comunidad-autonoma-region-murcia.html`,
    absent: [
      'murcia-enfermedades-raras',
      'murcia-cristales-lentes',
      'murcia-deporte',
      'murcia-veterinarios',
      'murcia-vehiculos-electricos',
      'murcia-recarga-vehiculos-electricos',
      'murcia-economia-social',
    ],
    changes: {
      'murcia-contribuyentes-discapacidad': {
        amount: 120,
        summary:
          'Da 120 euros a cada contribuyente con una discapacidad reconocida del 33 % o más.',
        requirements:
          'Grado de discapacidad acreditado igual o superior al 33 %. Base general + ahorro de hasta 19.000 € (individual) o 24.000 € (conjunta).',
      },
      'murcia-idiomas': { replace: [['25.000 € (individual)', '20.000 € (individual)']] },
      'murcia-arrendamiento-vivienda-habitual': {
        replace: [
          [
            'Base general menos mínimo personal y familiar inferior a 40.000 €',
            'Base general menos mínimo personal y familiar inferior a 24.380 €, o a 40.000 € si tienes menos de 40 años',
          ],
          ['Tener 40 años o menos', 'Tener menos de 40 años'],
          ['¿Tienes 40 años o menos', '¿Tienes menos de 40 años'],
        ],
      },
    },
    notInApp: [],
  },
};

/** The communities of the common regime in 2024, with the question of a birth of that year. */
export const regions2024: Record<string, RegionYear> = Object.fromEntries(
  Object.entries(regions).map(([id, r]) => [id, { ...r, replace: [BORN, ...(r.replace ?? [])] }])
);
