import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-extremadura';

export const extremadura: RentaCcaa = {
  id: 'extremadura',
  name: 'Extremadura',
  regime: 'common',
  scale: [
    { from: 0, rate: 8 },
    { from: 12450, rate: 10 },
    { from: 20200, rate: 16 },
    { from: 24200, rate: 17.5 },
    { from: 35200, rate: 21 },
    { from: 60000, rate: 23.5 },
    { from: 80200, rate: 24 },
    { from: 99200, rate: 24.5 },
    { from: 120200, rate: 25 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-autonoma-extremadura.html',
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/extremadura.html',
  deductions: [
    {
      id: 'extremadura-acogimiento-menores',
      group: 'family',
      title: 'Por acogimiento de menores',
      summary:
        'Da 250 euros por cada menor acogido en familia (temporal, permanente o de urgencia) si convives con él 183 días o más; 125 euros si fueron entre 91 y 182 días.',
      kind: 'fixed',
      amount: 250,
      unit: 'menor acogido',
      requirements:
        'Convivencia con el menor más de 90 días al año (250 euros desde 183 días). Si acoge un matrimonio o pareja de hecho y declaran por separado, el importe se reparte a partes iguales.',
      url: `${BASE}/acogimiento-menores.html`,
    },
    {
      id: 'extremadura-partos-multiples',
      group: 'family',
      title: 'Por partos múltiples',
      summary:
        'Da 300 euros por cada hijo nacido en un parto múltiple durante el año, siempre que viva contigo el 31 de diciembre.',
      kind: 'fixed',
      amount: 300,
      unit: 'hijo nacido en parto múltiple',
      requirements:
        'Bases imponibles (general + ahorro) hasta 19.000 euros (individual) o 24.000 (conjunta); 28.000 y 45.000 si vives en un municipio de menos de 3.000 habitantes. Sin tope en familia numerosa. Se reparte entre los padres.',
      url: `${BASE}/partos-multiples.html`,
    },
    {
      id: 'extremadura-cuidado-familiares-discapacidad',
      group: 'family',
      title: 'Por cuidado de familiares con discapacidad',
      summary:
        'Da 150 euros por cada ascendiente o descendiente con discapacidad del 65 % o más que viva contigo; 220 euros si tiene reconocida la ayuda a la dependencia pero aún no la cobra.',
      kind: 'fixed',
      amount: 150,
      unit: 'familiar con discapacidad',
      requirements:
        'El familiar convive contigo al menos medio año (lo acreditan los servicios sociales) y sus rentas no superan 16.800 euros. Tus bases hasta 19.000 euros (individual) o 24.000 (conjunta); más en municipios pequeños.',
      url: `${BASE}/cuidado-familiares-discapacidad.html`,
    },
    {
      id: 'extremadura-cuidado-hijos-hasta-14',
      group: 'family',
      title: 'Por cuidado de hijos de hasta 14 años',
      summary:
        'Devuelve el 10 % de lo que pagas por cuidar a tus hijos de hasta 14 años mientras trabajas (empleada del hogar, guardería, campamentos urbanos, ludotecas...). Máximo 400 euros por familia.',
      kind: 'percent',
      percent: 10,
      limit: 400,
      requirements:
        'Ambos padres deben trabajar y estar dados de alta en la Seguridad Social. Bases imponibles hasta 28.000 euros (individual) o 45.000 (conjunta). Hace falta factura o empleada del hogar dada de alta.',
      url: `${BASE}/cuidado-hijos-menores-hasta-14-inclusive.html`,
    },
    {
      id: 'extremadura-contribuyentes-viudos',
      group: 'family',
      title: 'Para contribuyentes viudos',
      summary:
        'Da 100 euros si eres viudo o viuda, y 200 euros si además tienes a tu cargo hijos u otros descendientes que dan derecho al mínimo por descendientes.',
      kind: 'fixed',
      amount: 100,
      unit: 'contribuyente viudo (200 euros con descendientes a cargo)',
      requirements:
        'Bases imponibles hasta 19.000 euros (individual) o 24.000 (conjunta); 28.000 y 45.000 en municipios de menos de 3.000 habitantes. Excluidos los condenados por violencia de género contra el cónyuge fallecido.',
      url: `${BASE}/contribuyentes-viudos.html`,
    },
    {
      id: 'extremadura-ayudas-ela',
      group: 'other',
      title: 'Por ayudas de Extremadura a personas con ELA',
      summary:
        'Si has tributado por una ayuda o subvención de la Junta de Extremadura a enfermos de ELA, te devuelven el impuesto autonómico que corresponde a esa ayuda (tipo medio de gravamen).',
      kind: 'special',
      requirements:
        'Haber incluido en la base imponible general una ayuda pública concedida por la Junta de Extremadura a personas con esclerosis lateral amiotrófica.',
      url: `${BASE}/obtencion-ayudas-subvenciones-personas-enfermedad-amiotrofica.html`,
    },
    {
      id: 'extremadura-enfermos-ela-familiares',
      group: 'family',
      title: 'Para enfermos de ELA y sus familiares',
      summary:
        'Da 2.000 euros al año al contribuyente diagnosticado de ELA, y otros 2.000 a su cónyuge o a un descendiente o ascendiente a cargo con la enfermedad (se reparte si son varios).',
      kind: 'fixed',
      amount: 2000,
      unit: 'contribuyente',
      requirements:
        'El enfermo cobra siempre sin reparto. Los familiares (cónyuge que conviva o esté a cargo, descendiente o ascendiente que dé derecho a mínimo) se reparten el importe a partes iguales si hay varios.',
      url: `${BASE}/destinada-enfermos-esclerosis-lateral-amiotrofica-familiares.html`,
    },
    {
      id: 'extremadura-vivienda-jovenes-victimas-terrorismo',
      group: 'housing',
      title: 'Compra o rehabilitación de vivienda para jóvenes',
      summary:
        'Devuelve el 3 % de lo que pagas por comprar o rehabilitar tu primera vivienda habitual nueva (5 % en municipios de menos de 3.000 habitantes). También para víctimas del terrorismo.',
      kind: 'percent',
      percent: 3,
      baseLimit: 9040,
      requirements:
        'Menor de 36 años y residente en Extremadura (sin límite de edad para víctimas del terrorismo); vivienda nueva protegida. Bases hasta 19.000 euros (individual) o 24.000 (conjunta), más en municipios pequeños.',
      url: `${BASE}/adquisicion-rehabilitacion-vivienda-habitual-jovenes.html`,
    },
    {
      id: 'extremadura-alquiler-vivienda-habitual',
      group: 'housing',
      title: 'Por alquiler de vivienda habitual',
      summary:
        'Devuelve el 30 % del alquiler de tu vivienda habitual, hasta 1.000 euros al año (1.500 si está en un municipio de menos de 3.000 habitantes).',
      kind: 'percent',
      percent: 30,
      limit: 1000,
      requirements:
        'Menor de 36 años, familia numerosa, ascendiente con dos hijos sin pensión de alimentos o discapacidad del 65 % o más. Bases hasta 28.000 euros (individual) o 45.000 (conjunta); sin otra vivienda a menos de 75 km.',
      url: `${BASE}/arrendamiento-vivienda-habitual.html`,
    },
    {
      id: 'extremadura-vivienda-zonas-rurales',
      group: 'housing',
      title: 'Compra o rehabilitación de vivienda en zonas rurales',
      summary:
        'Devuelve el 10 % de lo que pagas por comprar o rehabilitar tu vivienda habitual en un municipio extremeño de menos de 3.000 habitantes (base máxima 9.040 euros al año).',
      kind: 'percent',
      percent: 10,
      baseLimit: 9040,
      requirements:
        'Compra o rehabilitación a partir del 1 de enero de 2022 de la vivienda habitual en municipio o entidad local menor de menos de 3.000 habitantes. Incompatible con las deducciones para jóvenes de vivienda.',
      url: `${BASE}/adquisicion-rehabilitacion-vivienda-zonas-rurales.html`,
    },
    {
      id: 'extremadura-residir-municipios-pequenos',
      group: 'other',
      title: 'Por residir en municipios de menos de 3.000 habitantes',
      summary:
        'Descuenta el 15 % de tu cuota íntegra autonómica si vives habitualmente en un municipio o entidad local menor de Extremadura con menos de 3.000 habitantes.',
      kind: 'special',
      percent: 15,
      requirements:
        'Bases imponibles (general + ahorro) hasta 28.000 euros (individual) o 45.000 (conjunta). En matrimonio basta con que uno de los cónyuges resida en un municipio pequeño.',
      url: `${BASE}/residir-habitualmente-municipios-menos-3000-habitantes.html`,
    },
    {
      id: 'extremadura-intereses-vivienda-jovenes',
      group: 'housing',
      title: 'Por intereses de la hipoteca de jóvenes',
      summary:
        'Devuelve el 25 % de los intereses de la hipoteca de tu primera vivienda habitual, con una base máxima de 1.000 euros de intereses al año.',
      kind: 'percent',
      percent: 25,
      baseLimit: 1000,
      requirements:
        'Menor de 36 años, residente en Extremadura y primera vivienda. Bases imponibles hasta 28.000 euros (individual) o 45.000 (conjunta). Incompatible con la deducción de vivienda en zonas rurales.',
      url: `${BASE}/intereses-financiacion-ajena.html`,
    },
    {
      id: 'extremadura-traslado-residencia',
      group: 'other',
      title: 'Por trasladar tu residencia a Extremadura',
      summary:
        'Descuenta el 50 % de la cuota íntegra autonómica (75 % si tienes menos de 36 años) el año del traslado y los dos siguientes.',
      kind: 'special',
      percent: 50,
      requirements:
        'Trasladar la residencia habitual a Extremadura a partir del 1 de enero de 2025 y mantenerla al menos tres años seguidos. El 75 % exige menos de 36 años en cada ejercicio.',
      url: `${BASE}/contribuyentes-que-trasladen-residencia-habitual-extremadura.html`,
    },
    {
      id: 'extremadura-donaciones-cultura-deportistas',
      group: 'donations',
      title: 'Donaciones a entidades culturales y deportistas',
      summary:
        'Devuelve el 20 % de lo que donas en dinero a entidades extremeñas de cultura y artes o para patrocinar a deportistas extremeños. Máximo 500 euros al año.',
      kind: 'percent',
      percent: 20,
      limit: 500,
      requirements:
        'Residir en Extremadura y que la entidad o el deportista tenga domicilio fiscal en Extremadura; actividades culturales o artísticas del listado de la norma. El límite de 500 euros es conjunto.',
      url: `${BASE}/donaciones-dinero-entidades-culturales-artisticas-deportistas.html`,
    },
    {
      id: 'extremadura-trabajo-dependiente',
      group: 'other',
      title: 'Por rendimientos del trabajo bajos',
      summary:
        'Da 75 euros a quien cobra un sueldo bajo (hasta 12.000 euros brutos al año) y casi no tiene otras rentas.',
      kind: 'fixed',
      amount: 75,
      unit: 'contribuyente',
      requirements:
        'Rendimientos íntegros del trabajo hasta 12.000 euros y el resto de rendimientos netos y ganancias no superan 300 euros. Incompatible con la deducción de viudos (se elige la mayor).',
      url: `${BASE}/trabajo-dependiente.html`,
    },
    {
      id: 'extremadura-material-escolar',
      group: 'family',
      title: 'Por compra de material escolar',
      summary:
        'Da 15 euros por cada hijo o descendiente en edad escolar obligatoria (6 a 15 años) que viva contigo.',
      kind: 'fixed',
      amount: 15,
      unit: 'hijo en edad escolar',
      requirements:
        'Hijos de 6 a 15 años por los que tengas mínimo por descendientes. Bases hasta 19.000 euros (individual) o 24.000 (conjunta); 28.000 y 45.000 en municipios pequeños. Sin límite en familia numerosa.',
      url: `${BASE}/compra-material-escolar.html`,
    },
    {
      id: 'extremadura-inversion-acciones-participaciones',
      group: 'other',
      title: 'Por invertir en empresas extremeñas nuevas',
      summary:
        'Devuelve el 20 % de lo que inviertas al crear una sociedad o ampliar su capital (SA, SL, laboral o cooperativa) con sede en Extremadura. Máximo 4.000 euros al año.',
      kind: 'percent',
      percent: 20,
      limit: 4000,
      requirements:
        'Participación, junto con familiares, que no supere el 40 % del capital; mantenerla al menos tres años; no ejercer funciones ejecutivas. La empresa debe tener sede social y fiscal en Extremadura y actividad económica.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones-sociales.html`,
    },
    {
      id: 'extremadura-arrendadores-viviendas-vacias',
      group: 'housing',
      title: 'Para arrendadores de viviendas vacías',
      summary:
        'Descuenta el 100 % del rendimiento neto reducido que obtienes por alquilar una vivienda que estaba vacía. Máximo 1.200 euros por contribuyente.',
      kind: 'percent',
      percent: 100,
      limit: 1200,
      requirements:
        'Vivienda en Extremadura vacía al menos un año antes del contrato y destinada a vivienda habitual del inquilino, con contrato de al menos tres años.',
      url: `${BASE}/arrendadores-viviendas-vacias.html`,
    },
    {
      id: 'extremadura-rehabilitacion-rural-alquiler',
      group: 'housing',
      title: 'Rehabilitar viviendas rurales para alquilarlas',
      summary:
        'Devuelve el 15 % de lo que inviertas en rehabilitar viviendas en zonas rurales para destinarlas a alquiler. Base máxima de 9.040 euros al año.',
      kind: 'percent',
      percent: 15,
      baseLimit: 9040,
      requirements:
        'Obras de rehabilitación en el sentido de la ley del IVA. Base máxima total de 180.000 euros por vivienda y contribuyente. Se descuentan las subvenciones recibidas. Consulta en la AEAT los demás requisitos.',
      url: `${BASE}/inversiones-rehabilitacion-viviendas-zonas-rurales-alquiler.html`,
    },
  ],
};
