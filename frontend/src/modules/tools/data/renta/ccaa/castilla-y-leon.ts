import type { RentaCcaa } from '../../../domain/rentaData';

const AEAT =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/';
const D = `${AEAT}comunidad-autonoma-castilla-leon/`;
const RENTA =
  'Base general + ahorro menos mínimo personal y familiar hasta 18.900 euros (individual) o 31.500 (conjunta).';

// Los mínimos personales y familiares coinciden con los del Estado (no se declaran `minimums`).
export const castillaYLeon: RentaCcaa = {
  id: 'castilla-y-leon',
  name: 'Castilla y León',
  regime: 'common',
  scale: [
    { from: 0, rate: 9 },
    { from: 12450, rate: 12 },
    { from: 20200, rate: 14 },
    { from: 35200, rate: 18.5 },
    { from: 53407.2, rate: 21.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-castilla-leon.html',
  source: `${AEAT}guia-deducciones-autonomicas/castilla-leon.html`,
  deductions: [
    {
      id: 'castilla-y-leon-familia-numerosa',
      group: 'family',
      title: 'Por familia numerosa',
      summary:
        'Da 600 euros a las familias numerosas; 1.500 con cuatro hijos y 2.500 con cinco (más 1.000 por cada hijo desde el sexto). Se suman 600 euros si hay discapacidad de 65 % o más.',
      kind: 'special',
      requirements:
        'Título de familia numerosa de Castilla y León vigente a fecha de devengo y convivencia con el resto de la familia. Si conviven con varios contribuyentes, se reparte a partes iguales en declaraciones individuales.',
      url: `${D}familia-numerosa.html`,
    },
    {
      id: 'castilla-y-leon-nacimiento-adopcion',
      group: 'family',
      title: 'Por nacimiento o adopción de hijos',
      summary:
        'Da 1.010 euros por el primer hijo, 1.475 por el segundo y 2.351 por el tercero y siguientes. En municipios de hasta 5.000 habitantes son 1.420, 2.070 y 3.300; se duplica si el hijo tiene discapacidad.',
      kind: 'fixed',
      perChild: [1010, 1475, 2351],
      requirements:
        'El hijo debe darte derecho al mínimo por descendientes. Se duplica con discapacidad de 33 % o más. Incompatible con cobrar el Bono Nacimiento de la Junta. Entre dos progenitores en individual se reparte.',
      url: `${D}nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'castilla-y-leon-partos-adopciones-multiples',
      group: 'family',
      title: 'Por partos o adopciones múltiples',
      summary:
        'Suma el 50 % de la deducción por nacimiento si son dos hijos y el 100 % si son tres o más (también hijos nacidos con menos de 12 meses de diferencia). Hay extra de 901 euros si fue en 2023 o 2024.',
      kind: 'special',
      requirements:
        'Los hijos deben darte derecho al mínimo por descendientes. Incompatible con cobrar el Bono Nacimiento de la Junta. En declaraciones individuales de ambos progenitores se reparte a partes iguales.',
      url: `${D}partos-adopciones-multiples.html`,
    },
    {
      id: 'castilla-y-leon-gastos-adopcion',
      group: 'family',
      title: 'Por gastos de adopción',
      summary:
        'Da 784 euros por cada adopción realizada en el año, o 3.625 euros si la adopción es internacional.',
      kind: 'fixed',
      amount: 784,
      unit: 'adopción (3.625 euros si es internacional)',
      requirements:
        'El hijo adoptado debe darte derecho al mínimo por descendientes. Se aplica el año de inscripción en el Registro Civil. Incompatible con cobrar el Bono Nacimiento. Con varios adoptantes, se reparte.',
      url: `${D}gastos-adopcion.html`,
    },
    {
      id: 'castilla-y-leon-cuidado-hijos-menores',
      group: 'family',
      title: 'Por cuidado de hijos menores',
      summary:
        'A elegir: el 30 % de lo pagado a una empleada del hogar (máx. 322 euros) o el 100 % del gasto de guardería en centros de Castilla y León (máx. 1.320 euros), para hijos menores de 4 años.',
      kind: 'special',
      requirements: `Hijos menores de 4 años y ambos padres trabajando y dados de alta en Seguridad Social. ${RENTA}`,
      url: `${D}cuidado-hijos-menores.html`,
    },
    {
      id: 'castilla-y-leon-cuotas-seguridad-social-hogar',
      group: 'family',
      title: 'Por cuotas de Seguridad Social de empleados del hogar',
      summary:
        'Deduces el 15 % de las cuotas a la Seguridad Social que pagas por un empleado del hogar, con máximo de 300 euros al año.',
      kind: 'percent',
      percent: 15,
      limit: 300,
      requirements: `Tener un hijo menor de 4 años que dé derecho al mínimo por descendientes. ${RENTA}`,
      url: `${D}cuotas-seguridad-social-empleados-hogar.html`,
    },
    {
      id: 'castilla-y-leon-discapacidad-contribuyente',
      group: 'family',
      title: 'Por contribuyentes con discapacidad',
      summary:
        'Da 300 euros si tienes discapacidad de 65 % o más (o de 33 % o más con 65 años cumplidos), y 656 euros si tienes 65 años o más y discapacidad de 65 % o más.',
      kind: 'special',
      requirements: `Certificado de discapacidad y no ser usuario de residencias públicas o concertadas de Castilla y León. ${RENTA}`,
      url: `${D}contribuyentes-discapacidad.html`,
    },
    {
      id: 'castilla-y-leon-vivienda-jovenes-rural',
      group: 'housing',
      title: 'Compra o rehabilitación de vivienda para jóvenes en el medio rural',
      summary:
        'Deduces el 15 % de lo pagado por comprar o rehabilitar tu primera vivienda habitual en un pueblo pequeño, con base máxima de 10.000 euros al año.',
      kind: 'percent',
      percent: 15,
      baseLimit: 10000,
      requirements: `Menor de 36 años, vivienda nueva o rehabilitada (desde 2023) de menos de 150.000 euros, en municipio de hasta 10.000 hab. (3.000 si está a menos de 30 km de la capital). ${RENTA}`,
      url: `${D}adquisicion-rehabilitacion-vivienda-habitual-jovenes-rural.html`,
    },
    {
      id: 'castilla-y-leon-rehabilitacion-subvencionada',
      group: 'housing',
      title: 'Obras subvencionadas de eficiencia energética y accesibilidad',
      summary:
        'Deduces el 15 % de lo invertido en obras de tu vivienda habitual (paneles solares, ahorro de agua, mejora térmica, accesibilidad) subvencionadas por planes de vivienda, con base máxima de 20.000 euros.',
      kind: 'percent',
      percent: 15,
      baseLimit: 20000,
      requirements:
        'La obra debe tener subvención de los planes de vivienda gestionados por la Junta y se aplica el año en que cobras la subvención. Vivienda habitual en Castilla y León.',
      url: `${D}actuaciones-rehabilitacion-subvencionadas.html`,
    },
    {
      id: 'castilla-y-leon-rehabilitacion-rural-alquiler',
      group: 'housing',
      title: 'Rehabilitar vivienda rural para alquilarla',
      summary:
        'Deduces el 15 % de lo invertido en rehabilitar una vivienda en un pueblo pequeño para alquilarla, con base máxima de 20.000 euros.',
      kind: 'percent',
      percent: 15,
      baseLimit: 20000,
      requirements:
        'Municipio de hasta 10.000 hab. (3.000 si está a menos de 30 km de la capital), valor menor de 150.000 euros, alquiler mensual de hasta 300 euros y mantenerla alquilada u ofertada 5 años a no familiares.',
      url: `${D}rehabilitacion-viviendas-medio-rural-destinadas-alquiler.html`,
    },
    {
      id: 'castilla-y-leon-alquiler-jovenes',
      group: 'housing',
      title: 'Alquiler de vivienda habitual para jóvenes',
      summary:
        'Deduces el 20 % del alquiler de tu vivienda habitual, máximo 459 euros. En municipios pequeños el 25 % con máximo de 612 euros.',
      kind: 'percent',
      percent: 20,
      limit: 459,
      requirements: `Menor de 36 años y titular del contrato. Se restan las ayudas públicas de alquiler. Pueblos pequeños: hasta 10.000 hab. (3.000 si está a menos de 30 km de la capital). ${RENTA}`,
      url: `${D}arrendamiento-vivienda-habitual-jovenes.html`,
    },
    {
      id: 'castilla-y-leon-vivienda-nueva-construccion',
      group: 'housing',
      title: 'Compra de vivienda de nueva construcción',
      summary:
        'Deduces el 7,5 % de lo pagado por comprar tu primera vivienda habitual de nueva construcción en Castilla y León, con base máxima de 9.040 euros al año.',
      kind: 'percent',
      percent: 7.5,
      baseLimit: 9040,
      requirements:
        'Primera vivienda, nueva construcción con visado de proyecto entre el 1 de septiembre de 2011 y la fecha que fija la norma. Se puede aplicar el año del primer pago y los cuatro siguientes.',
      url: `${D}adquisicion-vivienda-nueva-construccion-residencia-habitual.html`,
    },
    {
      id: 'castilla-y-leon-donaciones-fundaciones-patrimonio',
      group: 'donations',
      title: 'Donaciones a fundaciones y patrimonio histórico y natural',
      summary:
        'Deduces el 15 % de lo donado para conservar patrimonio histórico, espacios naturales de la Red Natura 2000 o a fundaciones culturales, asistenciales o ecológicas de la región.',
      kind: 'percent',
      percent: 15,
      requirements: `${RENTA} Junto con otras dos deducciones similares no puede pasar del 10 % de la base liquidable. Hay que tener justificante de la donación.`,
      url: `${D}cantidades-donadas-fundaciones-cyl-recuperacion-patrimonio.html`,
    },
    {
      id: 'castilla-y-leon-donaciones-investigacion',
      group: 'donations',
      title: 'Donaciones para investigación, desarrollo e innovación',
      summary:
        'Deduces el 15 % de lo donado a universidades públicas de Castilla y León o a fundaciones de investigación e innovación para proyectos en la región.',
      kind: 'percent',
      percent: 15,
      requirements:
        'La suma de la base de esta deducción y de otras dos de patrimonio y donaciones no puede pasar del 10 % de la base liquidable general y del ahorro.',
      url: `${D}cantidades-donadas-fomento-investigacion-desarrollo-innov_.html`,
    },
    {
      id: 'castilla-y-leon-inversion-patrimonio-historico-natural',
      group: 'other',
      title: 'Inversión en patrimonio histórico, cultural y natural',
      summary:
        'Deduces el 15 % de lo que gastas como propietario en restaurar o rehabilitar inmuebles protegidos (BIC o inventariados) o bienes naturales de la Red Natura 2000.',
      kind: 'percent',
      percent: 15,
      requirements: `${RENTA} Obras autorizadas por la administración competente. Junto con otras dos deducciones similares no puede pasar del 10 % de la base liquidable.`,
      url: `${D}cantidades-invertidas-recuperacion-patrimonio-historico-natural.html`,
    },
    {
      id: 'castilla-y-leon-movilidad-sostenible',
      group: 'other',
      title: 'Compra de coche eléctrico o híbrido enchufable',
      summary:
        'Deduces el 15 % de lo que pagas por un turismo nuevo eléctrico, de autonomía extendida o híbrido enchufable (más de 40 km eléctricos), con máximo de 4.000 euros por vehículo.',
      kind: 'percent',
      percent: 15,
      limit: 4000,
      requirements:
        'Precio con impuestos de hasta 40.000 euros, no afecto a actividad económica, matriculado en el año y mantenido 4 años. La deducción estatal por vehículos eléctricos reduce el máximo.',
      url: `${D}fomento-movilidad-sostenible.html`,
    },
    {
      id: 'castilla-y-leon-fomento-emprendimiento',
      group: 'other',
      title: 'Inversión en sociedades nuevas (emprendimiento)',
      summary:
        'Deduces el 20 % de lo invertido en acciones o participaciones de sociedades que se crean o amplían capital en Castilla y León, con máximo de 10.000 euros.',
      kind: 'percent',
      percent: 20,
      limit: 10000,
      requirements:
        'Sociedad con domicilio social y fiscal en la región que cree empleo. Debes tener entre el 0,5 % y el 45 % del capital y mantenerlo 3 años. Hace falta certificado de la sociedad.',
      url: `${D}fomento-emprendimiento.html`,
    },
  ],
};
