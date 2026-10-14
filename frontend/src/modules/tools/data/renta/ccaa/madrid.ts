import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-madrid';

export const madrid: RentaCcaa = {
  id: 'madrid',
  name: 'Comunidad de Madrid',
  regime: 'common',
  scale: [
    { from: 0, rate: 8.5 },
    { from: 13362.22, rate: 10.7 },
    { from: 19004.63, rate: 12.8 },
    { from: 35425.68, rate: 17.4 },
    { from: 57320.4, rate: 20.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-madrid.html',
  minimums: {
    personal: 5956.65,
    over65: 1234.26,
    over75: 1502.58,
    descendants: [2575.85, 2897.83, 4400, 4950],
    under3: 3005.16,
    ascendants: 1234.26,
    ascendantsOver75: 1502.58,
    disability33: 3219.81,
    disability65: 9659.44,
    assistance: 3219.81,
  },
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/comunidad-madrid.html',
  deductions: [
    {
      id: 'madrid-nacimiento-adopcion-hijos',
      group: 'family',
      title: 'Por nacimiento o adopción de hijos',
      summary:
        'Da 721,70 euros por cada hijo nacido o adoptado, y se aplica el año del nacimiento y los dos siguientes. En partos o adopciones múltiples se suman 721,70 euros más por hijo el primer año.',
      kind: 'fixed',
      amount: 721.7,
      unit: 'hijo',
      requirements:
        'Bases imponibles (general + ahorro) hasta 30.930 euros (individual) o 37.322,20 (conjunta), y hasta 61.860 euros sumando toda la unidad familiar.',
      url: `${BASE}/nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'madrid-adopcion-internacional',
      group: 'family',
      title: 'Por adopción internacional de niños',
      summary:
        'Da 721,70 euros por cada hijo adoptado en el año mediante adopción internacional (un 50 % más si conviven con ambos padres adoptivos, repartido entre ellos).',
      kind: 'fixed',
      amount: 721.7,
      unit: 'hijo adoptado',
      requirements:
        'La adopción debe ser internacional según las normas y convenios aplicables. Es compatible con la deducción por nacimiento o adopción de hijos.',
      url: `${BASE}/adopcion-internacional-ninos.html`,
    },
    {
      id: 'madrid-acogimiento-familiar-menores',
      group: 'family',
      title: 'Por acogimiento familiar de menores',
      summary:
        'Da 618,60 euros por el primer menor acogido, 773,25 por el segundo y 927,90 por el tercero y siguientes.',
      kind: 'fixed',
      perChild: [618.6, 773.25, 927.9],
      requirements:
        'Solo cuentan menores acogidos más de 183 días del año. Bases imponibles hasta 26.414,22 euros (individual) o 37.322,20 (conjunta). Certificado de la Consejería si te lo piden.',
      url: `${BASE}/acogimiento-familiar-menores.html`,
    },
    {
      id: 'madrid-acogimiento-no-remunerado-mayores',
      group: 'family',
      title: 'Acogimiento sin pago de mayores de 65 o con discapacidad',
      summary:
        'Da 1.546,50 euros por cada persona mayor de 65 años o con discapacidad del 33 % o más que viva contigo más de 183 días al año sin contraprestación.',
      kind: 'fixed',
      amount: 1546.5,
      unit: 'persona acogida',
      requirements:
        'Sin ayudas de la Comunidad de Madrid por el acogimiento. El mayor de 65 no puede ser pariente hasta el 4º grado. Bases hasta 26.414,22 euros (individual) o 37.322,20 (conjunta).',
      url: `${BASE}/acogimiento-no-remunerado-mayores-65-anos.html`,
    },
    {
      id: 'madrid-cuidado-ascendientes',
      group: 'family',
      title: 'Por cuidado de ascendientes',
      summary:
        'Da 515,50 euros por cada ascendiente mayor de 65 años o con discapacidad del 33 % o más por el que te corresponda el mínimo por ascendientes.',
      kind: 'fixed',
      amount: 515.5,
      unit: 'ascendiente',
      requirements:
        'Ascendiente que dé derecho al mínimo por ascendientes. Si varios contribuyentes tienen derecho por el mismo ascendiente y declaran por separado, se reparte a partes iguales.',
      url: `${BASE}/cuidado-ascendientes.html`,
    },
    {
      id: 'madrid-cuidado-hijos-dependientes-discapacidad',
      group: 'family',
      title: 'Cuidado de menores de 3 años, dependientes o discapacitados',
      summary:
        'Devuelve el 25 % de las cuotas a la Seguridad Social de tu empleada del hogar (40 % en familia numerosa). Máximo 463,95 euros, o 618,60 en familia numerosa.',
      kind: 'percent',
      percent: 25,
      limit: 463.95,
      requirements:
        'Hijo menor de 3 años, o familiar mayor de 65 con dependencia reconocida o con discapacidad del 33 % o más, conviviendo contigo. Debes estar dado de alta como empleador del hogar en la Seguridad Social.',
      url: `${BASE}/cuidado-hijos-menores-mayores-discapacitados.html`,
    },
    {
      id: 'madrid-familias-dos-descendientes-ingresos-reducidos',
      group: 'family',
      title: 'Familias con dos o más hijos e ingresos reducidos',
      summary:
        'Descuenta el 10 % de la cuota autonómica que te quede tras el resto de deducciones, si tienes dos o más descendientes que dan derecho al mínimo por descendientes.',
      kind: 'special',
      percent: 10,
      requirements:
        'Dos o más descendientes con derecho al mínimo por descendientes y bases imponibles (general + ahorro) de 24.744 euros o menos.',
      url: `${BASE}/familias-dos-descendientes-ingresos-reducidos.html`,
    },
    {
      id: 'madrid-obtencion-familia-numerosa',
      group: 'family',
      title: 'Por obtener el título de familia numerosa',
      summary:
        'Descuenta el 50 % de la cuota autonómica si obtienes familia numerosa general (máx. 6.186 euros) o el 100 % si es especial (máx. 12.372 euros); el doble en conjunta.',
      kind: 'special',
      requirements:
        'Obtener la condición de titular de familia numerosa. Bases imponibles de toda la unidad familiar hasta 30.930 euros por miembro. En categoría especial, el 100 % se aplica el año del reconocimiento y los dos siguientes.',
      url: `${BASE}/obtencion-condicion-familia-numerosa.html`,
    },
    {
      id: 'madrid-arrendamiento-vivienda-habitual',
      group: 'housing',
      title: 'Por alquiler de la vivienda habitual',
      summary:
        'Devuelve el 30 % del alquiler de tu vivienda habitual a menores de 40 años. Máximo 1.237,20 euros al año, en individual o conjunta.',
      kind: 'percent',
      percent: 30,
      limit: 1237.2,
      requirements:
        'Menor de 40 años. Bases imponibles hasta 26.414,22 euros (individual) o 37.322,20 (conjunta), y hasta 61.860 euros sumando toda la unidad familiar. Solo vale si el contrato está a tu nombre.',
      url: `${BASE}/arrendamiento-vivienda-habitual.html`,
    },
    {
      id: 'madrid-gastos-arrendamiento-viviendas',
      group: 'housing',
      title: 'Gastos de tener viviendas alquiladas',
      summary:
        'Devuelve el 10 % de ciertos gastos de tus inmuebles alquilados como vivienda (como seguros de daños e impagos). Máximo 154,65 euros al año.',
      kind: 'percent',
      percent: 10,
      limit: 154.65,
      requirements:
        'Gastos ligados a inmuebles arrendados como vivienda, como primas de seguros por daños e impagos. El límite se aplica con independencia del número de inmuebles. Consulta la AEAT para el listado completo.',
      url: `${BASE}/gastos-derivados-arrendamiento-viviendas.html`,
    },
    {
      id: 'madrid-arrendamiento-viviendas-vacias',
      group: 'housing',
      title: 'Por alquilar viviendas vacías',
      summary:
        'Da 1.000 euros por cada vivienda vacía que alquiles, el año en que firmas el contrato.',
      kind: 'fixed',
      amount: 1000,
      unit: 'vivienda alquilada',
      requirements:
        'Vivienda vacía al menos un año antes, contrato de al menos tres años, inquilino que no sea cónyuge ni pariente hasta el 3er grado, máximo cinco viviendas en propiedad y fianza depositada en la Agencia de Vivienda Social.',
      url: `${BASE}/arrendamiento-viviendas-vacias.html`,
    },
    {
      id: 'madrid-donativos-fundaciones-clubes',
      group: 'donations',
      title: 'Donativos a fundaciones y clubes deportivos',
      summary:
        'Devuelve el 15 % de lo que donas a fundaciones madrileñas (fines culturales, asistenciales, educativos, sanitarios...) y a clubes deportivos elementales y básicos de Madrid.',
      kind: 'percent',
      percent: 15,
      requirements:
        'La base de la deducción no puede superar el 10 % de tu base liquidable (general + ahorro). Fundaciones sujetas a la Ley 1/1998 de Fundaciones de la Comunidad de Madrid.',
      url: `${BASE}/donativos-fundaciones-clubes-deportivos.html`,
    },
    {
      id: 'madrid-incremento-costes-financiacion',
      group: 'housing',
      title: 'Subida de intereses de la hipoteca',
      summary:
        'Devuelve el 25 % del exceso de intereses que pagas por la subida de los tipos de interés en la hipoteca de tu vivienda habitual. Máximo 300 euros al año.',
      kind: 'percent',
      percent: 25,
      limit: 300,
      requirements:
        'Vivienda de precio igual o inferior a 390.000 euros y bases de toda la unidad familiar hasta 30.930 euros por miembro. Incompatible con la deducción de intereses para menores de 30 años.',
      url: `${BASE}/incremento-costes-financiacion-ajena___.html`,
    },
    {
      id: 'madrid-cambio-residencia-despoblacion',
      group: 'housing',
      title: 'Cambiar de residencia a un municipio en riesgo de despoblación',
      summary:
        'Da 1.000 euros el año en que te trasladas y otros 1.000 el siguiente, si te mudas a un municipio madrileño de menos de 2.500 habitantes.',
      kind: 'fixed',
      amount: 1000,
      unit: 'contribuyente y año (2 años)',
      requirements:
        'Menor de 35 años, compra o alquiler de tu vivienda habitual en el municipio y residir allí el año del traslado y los tres siguientes. Bases de la unidad familiar hasta 30.930 euros por miembro.',
      url: `${BASE}/cambio-residencia-municipio-riesgo-despoblacion.html`,
    },
    {
      id: 'madrid-adquisicion-vivienda-despoblacion',
      group: 'housing',
      title: 'Comprar vivienda en un municipio en riesgo de despoblación',
      summary:
        'Devuelve el 10 % del precio de compra de tu vivienda habitual en un municipio madrileño de menos de 2.500 habitantes, repartido en diez años. Máximo 1.546,50 euros al año.',
      kind: 'percent',
      percent: 10,
      limit: 1546.5,
      requirements:
        'Menor de 35 años en el año de la compra, que debe ser a partir del 1 de enero de 2024. Se aplica por décimas partes el año de la compra y los nueve siguientes.',
      url: `${BASE}/adquisicion-vivienda-habitual-municipios-riesgo-despoblacion.html`,
    },
    {
      id: 'madrid-vivienda-nacimiento-adopcion',
      group: 'housing',
      title: 'Comprar vivienda habitual por nacimiento o adopción de un hijo',
      summary:
        'Devuelve el 10 % del precio de la vivienda habitual que compras por el nacimiento o adopción de un hijo, repartido en diez años. Máximo 1.546,50 euros al año.',
      kind: 'percent',
      percent: 10,
      limit: 1546.5,
      requirements:
        'Compra a partir del 1 de enero de 2023 de tu vivienda habitual. Bases de toda la unidad familiar hasta 30.930 euros por miembro. Se aplica el año de la compra y los nueve siguientes.',
      url: `${BASE}/adquisicion-vivienda-habitual-nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'madrid-intereses-vivienda-jovenes',
      group: 'housing',
      title: 'Intereses de la hipoteca de menores de 30 años',
      summary:
        'Devuelve el 25 % de los intereses de la hipoteca de tu vivienda habitual si tienes menos de 30 años. Máximo 1.031 euros al año.',
      kind: 'percent',
      percent: 25,
      limit: 1031,
      requirements:
        'Menor de 30 años; solo cuentan los intereses pagados hasta el mes anterior a cumplirlos. Si solo uno de los copropietarios cumple la edad, solo él la aplica.',
      url: `${BASE}/pago-intereses-prestamos-adquisicion-vivienda-jovenes.html`,
    },
    {
      id: 'madrid-gastos-educativos',
      group: 'family',
      title: 'Por gastos educativos',
      summary:
        'Devuelve el 15 % de la escolaridad y de la enseñanza de idiomas y el 5 % del vestuario escolar de tus hijos. Máximos por hijo: 927,90 euros (escolaridad) o 412,40 (idiomas y vestuario).',
      kind: 'special',
      requirements:
        'Hijos en 2º ciclo de Infantil, enseñanza obligatoria o FP Básica en España. Bases de la unidad familiar hasta 30.930 euros por miembro. No cuentan comedor, transporte ni libros de texto.',
      url: `${BASE}/gastos-educativos.html`,
    },
    {
      id: 'madrid-intereses-prestamos-estudios',
      group: 'family',
      title: 'Intereses de préstamos para estudios universitarios',
      summary:
        'Permite deducir los intereses de préstamos para cursar Grado, Máster o Doctorado (o másteres propios de universidades) del propio contribuyente, su cónyuge o sus descendientes.',
      kind: 'special',
      requirements:
        'Préstamo concedido por una entidad de crédito para estudios del contribuyente, su cónyuge o descendientes con derecho a mínimo. La página de la AEAT no detalla porcentaje ni tope aquí; consúltala.',
      url: `${BASE}/pago-intereses-prestamos-estudios.html`,
    },
    {
      id: 'madrid-inversion-acciones-nuevas-entidades',
      group: 'other',
      title: 'Invertir en empresas nuevas o de reciente creación',
      summary:
        'Devuelve el 40 % de lo que inviertas al crear una sociedad o ampliar su capital (máx. 9.279 euros). Sube al 50 % (máx. 12.372) en sociedades laborales, cooperativas o de universidades.',
      kind: 'percent',
      percent: 40,
      limit: 9279,
      requirements:
        'Mantener la participación al menos tres años; con familiares, no superar el límite de capital de la norma. La empresa debe cumplir requisitos de sede, actividad y empleo; consulta la AEAT.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones-sociales.html`,
    },
    {
      id: 'madrid-fomento-autoempleo-jovenes',
      group: 'other',
      title: 'Autoempleo de jóvenes menores de 35 años',
      summary:
        'Da 1.031 euros si tienes menos de 35 años y te das de alta por primera vez como autónomo o profesional en el Censo de Empresarios, el año del alta.',
      kind: 'fixed',
      amount: 1031,
      unit: 'contribuyente',
      requirements:
        'Actividad desarrollada principalmente en la Comunidad de Madrid y mantenerte en el censo al menos un año desde el alta.',
      url: `${BASE}/fomento-autoempleo-jovenes-menores-35-anos.html`,
    },
    {
      id: 'madrid-inversion-mercado-alternativo-bursatil',
      group: 'other',
      title: 'Acciones del mercado alternativo bursátil',
      summary:
        'Devuelve el 20 % de lo que inviertas en ampliaciones de capital u ofertas de empresas en expansión del Mercado Alternativo Bursátil. Máximo 10.310 euros.',
      kind: 'percent',
      percent: 20,
      limit: 10310,
      requirements:
        'Mantener las acciones al menos dos años y no superar el 10 % del capital. La sociedad debe tener domicilio social y fiscal en la Comunidad de Madrid durante los dos años siguientes.',
      url: `${BASE}/inversiones-realizadas-entidades-cotizadas.html`,
    },
    {
      id: 'madrid-inversion-nuevos-contribuyentes-extranjero',
      group: 'other',
      title: 'Inversiones de nuevos residentes llegados del extranjero',
      summary:
        'Devuelve el 20 % del valor de compra de determinados valores y participaciones si te trasladas a Madrid desde el extranjero y pasas a tributar por IRPF.',
      kind: 'percent',
      percent: 20,
      requirements:
        'No haber sido residente en España en los cinco años anteriores y pasar a ser contribuyente del IRPF desde 2024. Mantener la inversión seis años. Consulta la AEAT los elementos admitidos y condiciones.',
      url: `${BASE}/inversiones-nuevos-contribuyentes-procedentes-extranjero.html`,
    },
  ],
};
