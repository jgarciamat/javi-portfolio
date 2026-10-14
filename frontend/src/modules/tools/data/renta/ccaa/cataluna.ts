import type { RentaCcaa } from '../../../domain/rentaData';

const AEAT =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/';
const D = `${AEAT}comunidad-autonoma-cataluna/`;

// El mínimo personal y familiar coincide con el del Estado (no se declara `minimums`).
export const cataluna: RentaCcaa = {
  id: 'cataluna',
  name: 'Cataluña',
  regime: 'common',
  scale: [
    { from: 0, rate: 9.5 },
    { from: 12500, rate: 12.5 },
    { from: 22000, rate: 16 },
    { from: 33000, rate: 19 },
    { from: 53000, rate: 21.5 },
    { from: 90000, rate: 23.5 },
    { from: 120000, rate: 24.5 },
    { from: 175000, rate: 25.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-autonoma-cataluna.html',
  source: `${AEAT}guia-deducciones-autonomicas/cataluna.html`,
  deductions: [
    {
      id: 'cataluna-nacimiento-adopcion-acogimiento',
      group: 'family',
      title: 'Por nacimiento, adopción o acogimiento de un hijo',
      summary:
        'Da 150 euros por hijo en la declaración individual de cada progenitor, 300 euros en declaración conjunta y 300 euros a una familia monoparental.',
      kind: 'fixed',
      amount: 150,
      unit: 'hijo y progenitor (300 euros en conjunta o monoparental)',
      requirements:
        'Nacimiento, adopción o acogimiento familiar de un menor en el año. Adopción y acogimiento del mismo hijo son incompatibles. La página no indica límite de renta.',
      url: `${D}nacimiento-adopcion-hijo-hija-acogimiento-familiar.html`,
    },
    {
      id: 'cataluna-viudedad',
      group: 'family',
      title: 'Para contribuyentes que se han quedado viudos',
      summary:
        'Da 150 euros al año (300 si tienes hijos a cargo) durante el año de la viudedad y los dos siguientes. En 2025 vale para quien enviudó en 2023, 2024 o 2025.',
      kind: 'fixed',
      amount: 150,
      unit: 'contribuyente viudo (300 euros con descendientes a cargo)',
      requirements:
        'Haber enviudado en 2023, 2024 o 2025. Los 300 euros exigen descendientes que den derecho al mínimo por descendientes. Hay que indicar el año de viudedad en el Anexo B.5.',
      url: `${D}contribuyentes-que-hayan-quedado-viudos.html`,
    },
    {
      id: 'cataluna-alquiler-vivienda-habitual',
      group: 'housing',
      title: 'Alquiler de la vivienda habitual',
      summary:
        'Deduces el 10 % del alquiler: hasta 500 euros si tienes 35 años o menos, estuviste 183 días en paro, tienes discapacidad de 65 % o más o eres viudo/a de 65 o más; hasta 1.000 si eres familia numerosa o monoparental.',
      kind: 'percent',
      percent: 10,
      limit: 500,
      requirements:
        'Base general + ahorro menos mínimo personal y familiar hasta 30.000 euros (individual) o 45.000 (conjunta). Hay que poner el NIF del arrendador. Una vivienda no da más de 1.000 euros. Conjunta: tope 1.000 si uno cumple.',
      url: `${D}alquiler-vivienda-habitual.html`,
    },
    {
      id: 'cataluna-rehabilitacion-vivienda-habitual',
      group: 'housing',
      title: 'Rehabilitación de la vivienda habitual',
      summary:
        'Deduces el 1,5 % de lo pagado en el año por rehabilitar tu vivienda habitual, con base máxima de 9.040 euros.',
      kind: 'percent',
      percent: 1.5,
      baseLimit: 9040,
      requirements:
        'La obra debe ser rehabilitación de tu vivienda habitual (o la que vayas a hacer habitual) según el concepto del IRPF.',
      url: `${D}rehabilitacion-vivienda-habitual.html`,
    },
    {
      id: 'cataluna-intereses-prestamos-master-doctorado',
      group: 'other',
      title: 'Intereses de préstamos para máster y doctorado',
      summary:
        'Deduces todos los intereses que pagas en el año por préstamos de la Agencia de Gestión de Ayudas Universitarias y de Investigación (AGAUR) para estudios de máster o doctorado.',
      kind: 'percent',
      percent: 100,
      requirements:
        'El préstamo debe haberse concedido por la AGAUR. Hay que indicar el número de identificación del préstamo en la casilla 1928 del Anexo B.5 y guardar la justificación.',
      url: `${D}pago-intereses-prestamos.html`,
    },
    {
      id: 'cataluna-donativos-lengua-catalana-occitana',
      group: 'donations',
      title: 'Donativos para el catalán y el occitano',
      summary:
        'Deduces el 15 % de lo donado al Institut d’Estudis Catalans, a la Acadèmia Aranesa de l’Occitan o a entidades sin ánimo de lucro inscritas en el censo de fomento de la lengua.',
      kind: 'percent',
      percent: 15,
      requirements:
        'Límite del 10 % de la cuota íntegra autonómica. La entidad debe figurar en el censo de política lingüística y comunicar los donantes a la Agencia Tributaria de Cataluña.',
      url: `${D}donativos-entidades-que-fomentan-lengua-occitana.html`,
    },
    {
      id: 'cataluna-donativos-investigacion-innovacion',
      group: 'donations',
      title: 'Donativos para investigación e innovación',
      summary:
        'Deduces el 30 % de lo donado a universidades catalanas, institutos universitarios, centros de investigación vinculados o centros de investigación de la Generalitat.',
      kind: 'percent',
      percent: 30,
      requirements:
        'Límite del 10 % de la cuota íntegra autonómica. Sumada a la deducción estatal por donativos, no puede superar el 100 % de lo donado. La entidad comunica los donantes a la Agencia Tributaria de Cataluña.',
      url: `${D}donativos-entidades-que-fomentan-investigacion.html`,
    },
    {
      id: 'cataluna-donaciones-medio-ambiente',
      group: 'donations',
      title: 'Donaciones para medio ambiente y patrimonio natural',
      summary:
        'Deduces el 15 % de lo donado a fundaciones o asociaciones del censo de entidades ambientales de la Generalitat, con límite del 5 % de la cuota íntegra autonómica.',
      kind: 'percent',
      percent: 15,
      requirements:
        'La entidad debe figurar en el censo de entidades ambientales y enviar la lista de donantes a la Agencia Tributaria de Cataluña. Hay que conservar la justificación del donativo.',
      url: `${D}donaciones-determinadas-entidades-beneficio.html`,
    },
    {
      id: 'cataluna-angel-inversor',
      group: 'other',
      title: 'Inversión como ángel inversor',
      summary:
        'Deduces el 40 % de lo invertido en acciones o participaciones de sociedades nuevas o que amplían capital (50 % si las crea o participa una universidad o centro de investigación), con máximo de 12.000 euros.',
      kind: 'percent',
      percent: 40,
      limit: 12000,
      requirements:
        'Sociedad con sede en Cataluña, facturación de hasta 1 millón de euros y al menos un empleado a jornada completa. Tu participación no supera el 35 %, la mantienes 3 años y no ejerces funciones directivas.',
      url: `${D}inversion-angel-inversor.html`,
    },
    {
      id: 'cataluna-mas-de-un-pagador',
      group: 'other',
      title: 'Por tener que declarar al tener más de un pagador',
      summary:
        'Si estás obligado a declarar solo por tener más de un pagador, deduces la diferencia positiva entre la cuota íntegra autonómica y la estatal.',
      kind: 'special',
      requirements:
        'Rendimientos del trabajo entre 15.876 y 22.000 euros de más de un pagador (segundo y siguientes con más de 1.500 euros). Excluye pensionistas con modelo 146 y quienes tengan ciertas rentas de capital o ganancias.',
      url: `${D}presentar-declaracion-irpf-razon-tener-pagador.html`,
    },
    {
      id: 'cataluna-alquiler-victimas-violencia-machista',
      group: 'housing',
      title: 'Alquiler para víctimas de violencia machista',
      summary:
        'Deduces el 20 % del alquiler de tu vivienda habitual (máx. 1.000 euros); el 25 % y 1.200 euros si tienes discapacidad de 65 % o más o un hijo menor a cargo.',
      kind: 'percent',
      percent: 20,
      limit: 1000,
      requirements:
        'Acreditar la condición de víctima según la Ley 5/2008 y ser titular del contrato. Base general + ahorro menos mínimo personal y familiar hasta 30.000 euros. Máximo tres años consecutivos.',
      url: `${D}alquiler-vivienda-habitual-victimas-violencia-machista.html`,
    },
    {
      id: 'cataluna-cooperativas-agrarias-vivienda',
      group: 'other',
      title: 'Inversión en cooperativas agrarias y de vivienda',
      summary:
        'Deduces el 20 % de las aportaciones de capital (obligatorias o voluntarias) a cooperativas agrarias o de vivienda, con máximo de 3.000 euros al año.',
      kind: 'percent',
      percent: 20,
      limit: 3000,
      requirements:
        'Ser socio no temporal, con no más del 25 % de los votos, cooperativa inscrita en Cataluña y certificado de ella. Mantener la aportación 5 años. No vale para cooperativas de vivienda de uso turístico.',
      url: `${D}inversion-sociedades-cooperativas.html`,
    },
    {
      id: 'cataluna-tramo-autonomico-vivienda-habitual',
      group: 'housing',
      title: 'Tramo autonómico de la deducción antigua por vivienda habitual',
      summary:
        'Solo para quien conserva el régimen transitorio por inversión en vivienda: el 7,5 % en el tramo autonómico (15 % en obras de adaptación por discapacidad), o el 9 % en ciertos casos.',
      kind: 'special',
      requirements:
        'Régimen transitorio (vivienda comprada antes de 2013). El 9 % exige compra antes del 30/07/2011 y 32 años o menos, paro 183 días, discapacidad de 65 % o más o hijos, con base menos mínimo hasta 30.000 euros.',
      url: `${D}tramo-autonomico-deduccion-inversion-vivienda-habitual.html`,
    },
  ],
};
