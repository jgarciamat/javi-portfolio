import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-aragon';

export const aragon: RentaCcaa = {
  id: 'aragon',
  name: 'Aragón',
  regime: 'common',
  scale: [
    { from: 0, rate: 9.5 },
    { from: 13072.5, rate: 12 },
    { from: 21210, rate: 15 },
    { from: 36960, rate: 18.5 },
    { from: 52500, rate: 20.5 },
    { from: 60000, rate: 23 },
    { from: 80000, rate: 24 },
    { from: 90000, rate: 25 },
    { from: 130000, rate: 25.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-autonoma-aragon.html',
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/aragon.html',
  deductions: [
    {
      id: 'aragon-nacimiento-tercer-hijo',
      group: 'family',
      title: 'Por nacimiento o adopción del tercer hijo y siguientes',
      summary:
        '500 euros por cada tercer hijo o posterior nacido o adoptado en el año; 600 euros si tu renta es baja. En asentamientos rurales con riesgo de despoblación son 600 y 720 euros.',
      kind: 'special',
      amount: 500,
      unit: 'hijo',
      requirements:
        'Se aplica solo el año del nacimiento o adopción y lo aplica quien convive con el hijo. Para los 600 euros, base (general + ahorro) menos mínimos personales y por descendientes de hasta 21.000 euros (individual) o 35.000 (conjunta).',
      url: `${BASE}/nacimiento-adopcion-tercer-hijo-sucesivos.html`,
    },
    {
      id: 'aragon-nacimiento-hijo-discapacidad',
      group: 'family',
      title: 'Por nacimiento o adopción de un hijo con discapacidad',
      summary:
        '200 euros por cada hijo nacido o adoptado en el año con discapacidad del 33 % o más (240 euros en asentamientos rurales con riesgo de despoblación).',
      kind: 'fixed',
      amount: 200,
      unit: 'hijo',
      requirements:
        'Discapacidad reconocida por servicios sociales a fin de año. Compatible con la del tercer hijo y la adopción internacional; incompatible, por el mismo hijo, con la de primer y segundo hijo en pueblos pequeños.',
      url: `${BASE}/nacimiento-adopcion-atencion-grado-discapacidad-alguno.html`,
    },
    {
      id: 'aragon-adopcion-internacional',
      group: 'family',
      title: 'Por adopción internacional de niños',
      summary:
        '600 euros por cada hijo adoptado en el extranjero en el año (720 euros si resides en un asentamiento rural con riesgo de despoblación).',
      kind: 'fixed',
      amount: 600,
      unit: 'hijo adoptado',
      requirements:
        'La adopción cuenta en el año de la resolución judicial. Si el niño convive con ambos padres adoptivos, se reparte a partes iguales. Compatible con las deducciones de tercer hijo y de hijo con discapacidad.',
      url: `${BASE}/adopcion-internacional-ninos.html`,
    },
    {
      id: 'aragon-cuidado-dependientes',
      group: 'family',
      title: 'Por cuidado de personas dependientes',
      summary:
        '150 euros por cuidar en casa a un ascendiente mayor de 75 años o a un ascendiente o descendiente con discapacidad del 65 % o más (300 euros en asentamientos rurales en riesgo).',
      kind: 'fixed',
      amount: 150,
      unit: 'persona dependiente',
      requirements:
        'La persona convive contigo al menos medio año y gana menos de 8.000 euros. Base menos mínimos personal y por descendientes de hasta 21.000 (individual) o 35.000 euros (conjunta). Se reparte entre contribuyentes con derecho.',
      url: `${BASE}/cuidado-personas-dependientes.html`,
    },
    {
      id: 'aragon-mayores-70',
      group: 'family',
      title: 'Para mayores de 70 años',
      summary:
        '75 euros para contribuyentes de 70 años o más que obtengan rendimientos del trabajo o de actividades económicas.',
      kind: 'fixed',
      amount: 75,
      unit: 'contribuyente',
      requirements:
        'Tener 70 años o más y algún rendimiento del trabajo o de actividad económica (no solo del capital). Bases imponibles (general más ahorro) de hasta 23.000 euros en individual o 35.000 en conjunta.',
      url: `${BASE}/mayores-70-anos.html`,
    },
    {
      id: 'aragon-nacimiento-primer-segundo-hijo-pueblos',
      group: 'family',
      title: 'Por primer o segundo hijo en pueblos de menos de 10.000 habitantes',
      summary:
        '100 euros por el primer hijo y 150 por el segundo nacidos o adoptados en el año; 200 y 300 euros si tu renta es baja.',
      kind: 'fixed',
      perChild: [100, 150],
      requirements:
        'Haber residido el año del nacimiento y el anterior en municipios aragoneses de menos de 10.000 habitantes. Los importes de 200 y 300 euros exigen base de hasta 23.000 euros (individual) o 35.000 (conjunta). Incompatible con hijo con discapacidad.',
      url: `${BASE}/nacimiento-adopcion-primer-segundo-hijo-10_000.html`,
    },
    {
      id: 'aragon-guarderia-menores-3',
      group: 'family',
      title: 'Por gastos de guardería de hijos menores de 3 años',
      summary:
        'El 15 % de lo pagado en guarderías o centros de educación infantil autorizados, hasta 250 euros por hijo (125 el año en que cumple 3 años).',
      kind: 'percent',
      percent: 15,
      limit: 250,
      requirements:
        'Hijos que den derecho al mínimo por descendientes. Base inferior a 35.000 euros (individual) o 50.000 (conjunta) y base del ahorro de hasta 4.000 euros. Pago por banco o tarjeta. Existe una versión mejorada en asentamientos rurales en riesgo.',
      url: `${BASE}/gastos-guarderia-hijos-menores-3-anos.html`,
    },
    {
      id: 'aragon-libros-texto-material-escolar',
      group: 'family',
      title: 'Por libros de texto y material escolar',
      summary:
        'El 100 % de lo gastado en libros y material escolar de Primaria y ESO de tus hijos, con tope por hijo según tu renta (hasta 100 euros; 150 si eres familia numerosa).',
      kind: 'special',
      percent: 100,
      limit: 100,
      requirements:
        'Los topes bajan según la base: en conjunta 100/50/37,5 euros por hijo (hasta 12.000/20.000/25.000 euros de base); en individual 50/37,5/25. Familia numerosa: 150 (conjunta) o 75 (individual). Los equipos informáticos no cuentan.',
      url: `${BASE}/adquisicion-libros-texto-material-escolar.html`,
    },
    {
      id: 'aragon-clases-apoyo-refuerzo',
      group: 'family',
      title: 'Por clases de apoyo o refuerzo de los hijos',
      summary:
        'El 25 % de lo pagado en clases extraescolares de apoyo o refuerzo de tus hijos, con tope por hijo de 80 a 200 euros según renta (300 si es familia numerosa).',
      kind: 'special',
      percent: 25,
      limit: 300,
      requirements:
        'Base de hasta 12.500 euros (individual) o 25.000 (conjunta); familia numerosa hasta 30.000 o 40.000. Se descuentan las ayudas públicas recibidas. Factura y pago por banco o tarjeta.',
      url: `${BASE}/gastos-clases-apoyo-refuerzo.html`,
    },
    {
      id: 'aragon-formacion-autonomia-discapacidad',
      group: 'family',
      title: 'Por formación para la autonomía de menores con discapacidad',
      summary:
        'El 25 % de lo pagado en formación para la autonomía y la vida independiente de hijos menores con discapacidad del 65 % o más, con tope de 80 a 200 euros por hijo (300 en familia numerosa).',
      kind: 'special',
      percent: 25,
      limit: 300,
      requirements:
        'Base de hasta 12.500 euros (individual) o 25.000 (conjunta); familia numerosa hasta 30.000 o 40.000. Se descuentan las ayudas públicas recibidas. Factura y pago por banco o tarjeta.',
      url: `${BASE}/gastos-formacion-autonomia-vida-independiente.html`,
    },
    {
      id: 'aragon-vivienda-victimas-terrorismo',
      group: 'housing',
      title: 'Vivienda habitual de víctimas del terrorismo',
      summary:
        'El 3 % de lo pagado por comprar una vivienda nueva protegida en Aragón que sea tu primera residencia habitual, si eres víctima del terrorismo (o tu pareja o hijos convivientes).',
      kind: 'percent',
      percent: 3,
      requirements:
        'Vivienda nueva con protección pública, en Aragón, primera vivienda habitual. Conceptos, base y límite según la normativa estatal de deducción por vivienda vigente a 31-12-2012.',
      url: `${BASE}/adquisicion-vivienda-habitual-victimas-terrorismo.html`,
    },
    {
      id: 'aragon-vivienda-nucleos-rurales',
      group: 'housing',
      title: 'Compra o rehabilitación de vivienda en núcleos rurales',
      summary:
        'El 5 % de lo pagado por comprar o rehabilitar tu primera vivienda habitual en un pueblo pequeño si eres menor de 36 años (7,5 % en asentamientos rurales con riesgo de despoblación).',
      kind: 'percent',
      percent: 5,
      requirements:
        'Menor de 36 años, primera vivienda, en municipio de menos de 3.000 habitantes o en entidad local menor. Solo compras o rehabilitaciones desde el 1-1-2012. Para el 7,5 % hay requisitos de residencia en asentamientos rurales en riesgo.',
      url: `${BASE}/adquisicion-rehabilitacion-vivienda-habitual-nucleos-analogos.html`,
    },
    {
      id: 'aragon-alquiler-dacion-en-pago',
      group: 'housing',
      title: 'Alquiler de vivienda habitual tras una dación en pago',
      summary:
        'El 10 % del alquiler pagado (base máxima de 4.800 euros al año) si entregaste tu vivienda al banco por la deuda y la alquilas con opción de compra.',
      kind: 'percent',
      percent: 10,
      baseLimit: 4800,
      limit: 480,
      requirements:
        'Dación en pago de toda la deuda hipotecaria y contrato de alquiler con opción de compra. Base de hasta 15.000 euros (individual) o 25.000 (conjunta). Fianza depositada en el órgano de vivienda de Aragón.',
      url: `${BASE}/arrendamiento-vivienda-habitual-vinculado-operaciones-pago.html`,
    },
    {
      id: 'aragon-residencia-municipios',
      group: 'other',
      title: 'Por residir en municipios en riesgo extremo de despoblación',
      summary:
        '600 euros por residir en asentamientos rurales de riesgo extremo de despoblación (rango X); en conjunta se aplica por cada contribuyente que cumpla.',
      kind: 'fixed',
      amount: 600,
      unit: 'contribuyente',
      requirements:
        'Residencia habitual en un asentamiento de rango X el año y los cuatro siguientes. Base liquidable inferior a 35.000 euros (individual) o 50.000 (conjunta) y base imponible del ahorro de hasta 4.000 euros.',
      url: `${BASE}/residencia-determinados-municipios.html`,
    },
    {
      id: 'aragon-donaciones-ecologicas-id',
      group: 'donations',
      title: 'Donaciones ecológicas y de investigación',
      summary:
        'El 20 % de lo donado en dinero al Gobierno de Aragón o a entidades sin ánimo de lucro de medio ambiente o investigación y desarrollo inscritas en Aragón.',
      kind: 'percent',
      percent: 20,
      requirements:
        'Donaciones puras y simples en dinero. La deducción no puede superar el 10 % de la cuota íntegra autonómica. La entidad debe estar inscrita en los registros de Aragón.',
      url: `${BASE}/donaciones-finalidad-ecologica-investi-desarrollo-tecnico.html`,
    },
    {
      id: 'aragon-arrendamiento-vivienda-social',
      group: 'other',
      title: 'Para arrendadores de vivienda social',
      summary:
        'Si cedes viviendas al Gobierno de Aragón o al Plan de Vivienda Social, deduces el 30 % de la cuota autonómica que corresponda a esos alquileres.',
      kind: 'special',
      percent: 30,
      requirements:
        'Haber puesto una o más viviendas a disposición del Gobierno de Aragón o de la entidad gestora del Plan de Vivienda Social. La base es la cuota autonómica del rendimiento neto reducido de esas viviendas.',
      url: `${BASE}/arrendamiento-vivienda-social.html`,
    },
    {
      id: 'aragon-acciones-mab',
      group: 'other',
      title: 'Inversión en empresas del Mercado Alternativo Bursátil',
      summary:
        'El 20 % de lo invertido en ampliaciones de capital de empresas en expansión del Mercado Alternativo Bursátil, con un máximo de 10.000 euros.',
      kind: 'percent',
      percent: 20,
      limit: 10000,
      requirements:
        'Participación de hasta el 10 % del capital, mantener las acciones 2 años y sociedad con domicilio social y fiscal en Aragón. Incompatible, para la misma inversión, con las de entidades nuevas y economía social.',
      url: `${BASE}/inversion-acciones-entidades-cotizan-mercado-bursatil.html`,
    },
    {
      id: 'aragon-acciones-entidades-nuevas',
      group: 'other',
      title: 'Inversión en entidades nuevas o de reciente creación',
      summary:
        'El 20 % de lo invertido en acciones o participaciones de sociedades aragonesas nuevas, solo sobre lo que supere la base de la deducción estatal; máximo 4.000 euros.',
      kind: 'percent',
      percent: 20,
      limit: 4000,
      requirements:
        'Mismos requisitos que la deducción estatal, y sociedad (SA, SL, laboral) con domicilio social y fiscal en Aragón. Puedes estar en el consejo, pero sin funciones ejecutivas ni relación laboral. Incompatible con la del MAB y la de economía social.',
      url: `${BASE}/inversion-acciones-participaciones-entidades-nuevas-creacion.html`,
    },
    {
      id: 'aragon-entidades-economia-social',
      group: 'other',
      title: 'Inversión en entidades de economía social',
      summary:
        'El 20 % de las aportaciones para hacerte socio de entidades de economía social con sede en Aragón, con un máximo de 4.000 euros.',
      kind: 'percent',
      percent: 20,
      limit: 4000,
      requirements:
        'Participación de hasta el 40 % (con familiares), entidad con al menos un empleado a jornada completa, escritura pública y mantener la aportación y los requisitos 5 años. Incompatible con las de MAB y entidades nuevas.',
      url: `${BASE}/inversion-entidades-economia-social.html`,
    },
  ],
};
