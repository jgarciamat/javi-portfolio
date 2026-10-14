import type { RentaCcaa } from '../../../domain/rentaData';

const AEAT =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/';
const D = `${AEAT}comunidad-autonoma-castilla-leon/`;

// Datos del ejercicio 2025 (Renta 2026). Fuentes: Manual práctico de la AEAT (Deducciones autonómicas > Castilla y León, actualizado a marzo de 2026),
// Decreto Legislativo 1/2013 (arts. 1 a 10) y la relación de 20 deducciones del portal tributos.jcyl.es.
// Castilla y León solo tiene escala propia y deducciones: los mínimos personales y familiares son los del Estado (no se declaran `minimums`).
// El Manual no recoge deducciones de enfermedad, transporte, estudios/idiomas ni víctimas del terrorismo: no existen en la región.
// Casi todos los topes de renta se miden sobre (base general + base del ahorro) MENOS el mínimo personal y familiar. Como el comprobador
// compara la base sin restar el mínimo, esos topes se explican en `requirements` y no se declaran como `incomeLimit` (evita falsos avisos).
const RENTA =
  'Base general + ahorro menos mínimo personal y familiar: máx. 18.900 € (individual) o 31.500 € (conjunta).';
const MEDIO_RURAL = 'pueblo de hasta 10.000 hab. (3.000 si dista menos de 30 km de la capital)';
const BONO = 'Incompatible con haber cobrado el Bono Nacimiento de la Junta por ese hijo.';
const TOPE_10 =
  'Junto a las otras dos de patrimonio, fundaciones e I+D, máx. 10 % de la base liquidable.';

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
    // ---------------------------------------------------------------- FAMILIA
    {
      id: 'castilla-y-leon-familia-numerosa',
      group: 'family',
      title: 'Por familia numerosa',
      summary:
        'Da 600 euros a las familias numerosas; 1.500 con cuatro descendientes y 2.500 con cinco (más 1.000 por cada descendiente desde el sexto). Indica aquí el importe que te corresponda.',
      kind: 'special',
      requirements:
        'Título de familia numerosa de Castilla y León vigente a fecha de devengo y convivencia con el resto de la familia. Los descendientes deben dar derecho al mínimo por descendientes. Entre varios declarantes individuales se reparte por igual.',
      url: `${D}familia-numerosa.html`,
    },
    {
      id: 'castilla-y-leon-familia-numerosa-discapacidad',
      group: 'family',
      title: 'Incremento de familia numerosa por discapacidad',
      summary:
        'Suma 600 euros a la deducción por familia numerosa si el cónyuge o algún descendiente que da derecho al mínimo por descendientes tiene una discapacidad de 65 % o más.',
      kind: 'fixed',
      amount: 600,
      unit: 'familia numerosa',
      requirements:
        'Solo con la deducción por familia numerosa. Discapacidad de 65 % o más con certificado oficial (o incapacidad judicial). Se aplica una sola vez, aunque haya varios con discapacidad, y se reparte entre declarantes individuales.',
      url: `${D}familia-numerosa.html`,
    },
    {
      id: 'castilla-y-leon-nacimiento-adopcion',
      group: 'family',
      title: 'Por nacimiento o adopción de hijos',
      summary:
        'Da 1.010 euros por el primer hijo nacido o adoptado en el año, 1.475 por el segundo y 2.351 por el tercero y siguientes. Si vives en un pueblo de hasta 5.000 habitantes, usa la deducción del medio rural.',
      kind: 'fixed',
      perChild: [1010, 1475, 2351],
      requirements: `El hijo debe darte derecho al mínimo por descendientes. El orden cuenta a los hijos que conviven contigo a fecha de devengo. Entre dos progenitores en individual se reparte. ${BONO}`,
      url: `${D}nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'castilla-y-leon-nacimiento-adopcion-rural',
      group: 'family',
      title: 'Por nacimiento o adopción en el medio rural',
      summary:
        'Si resides en un municipio o entidad local menor de hasta 5.000 habitantes: 1.420 euros por el primer hijo, 2.070 por el segundo y 3.300 por el tercero y siguientes. Sustituye a la deducción general.',
      kind: 'fixed',
      perChild: [1420, 2070, 3300],
      requirements: `Residir en un municipio o entidad local menor de hasta 5.000 hab. (la Junta publica la lista de excluidos cada año). Mismos requisitos que la general. No es acumulable con ella. ${BONO}`,
      url: `${D}nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'castilla-y-leon-nacimiento-adopcion-discapacidad',
      group: 'family',
      title: 'Hijo nacido o adoptado con discapacidad',
      summary:
        'Duplica la deducción por nacimiento o adopción (general o rural) si el hijo tiene una discapacidad de 33 % o más. Indica aquí el importe extra, igual al de la deducción que uses.',
      kind: 'special',
      requirements:
        'Si la discapacidad se reconoce después del año de nacimiento pero antes de que cumpla 5 años, se aplica el año del reconocimiento con las circunstancias y cifras del año de nacimiento. Incompatible con el Bono Nacimiento por ese hijo.',
      url: `${D}nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'castilla-y-leon-partos-adopciones-multiples',
      group: 'family',
      title: 'Por partos o adopciones múltiples',
      summary:
        'Suma el 50 % de la deducción por nacimiento si son dos hijos y el 100 % si son tres o más. Vale también si hay dos nacimientos o adopciones en un plazo de 12 meses. Indica el importe que te toque.',
      kind: 'special',
      requirements: `Los hijos deben darte derecho al mínimo por descendientes. Con dos nacimientos en 12 meses (2024 y 2025) solo aplican quienes convivan con ambos. ${BONO} Se reparte entre declarantes.`,
      url: `${D}partos-adopciones-multiples.html`,
    },
    {
      id: 'castilla-y-leon-partos-multiples-adicional',
      group: 'family',
      title: 'Adicional por partos o adopciones múltiples (2023-2024)',
      summary:
        'Da 901 euros más durante los dos años siguientes al último nacimiento o adopción de un parto múltiple o adopción simultánea producido en 2023 o 2024.',
      kind: 'fixed',
      amount: 901,
      unit: 'parto o adopción múltiple',
      requirements:
        'El parto múltiple o la adopción simultánea debe haberse producido en 2023 y/o 2024. Si en 2025 nace otro hijo que forma un nuevo parto múltiple con los de 2024, no se aplica este adicional. Se reparte entre los contribuyentes con derecho.',
      url: `${D}partos-adopciones-multiples.html`,
    },
    {
      id: 'castilla-y-leon-gastos-adopcion',
      group: 'family',
      title: 'Por gastos de adopción',
      summary:
        'Da 784 euros por cada adopción realizada en el año, de hijos que den derecho al mínimo por descendientes. Si la adopción es internacional, usa la deducción de 3.625 euros.',
      kind: 'fixed',
      amount: 784,
      unit: 'adopción',
      requirements:
        'El hijo adoptado debe darte derecho al mínimo por descendientes. Se aplica el año de inscripción en el Registro Civil. Incompatible con el Bono Nacimiento. Con varios adoptantes en individual se reparte por igual. Compatible con la de nacimiento.',
      url: `${D}gastos-adopcion.html`,
    },
    {
      id: 'castilla-y-leon-gastos-adopcion-internacional',
      group: 'family',
      title: 'Por gastos de adopción internacional',
      summary:
        'Da 3.625 euros por cada adopción internacional realizada en el año, según la legislación y los tratados y convenios suscritos por España. Sustituye a la de 784 euros.',
      kind: 'fixed',
      amount: 3625,
      unit: 'adopción internacional',
      requirements:
        'El hijo adoptado debe darte derecho al mínimo por descendientes. Se aplica el año de inscripción en el Registro Civil. Incompatible con el Bono Nacimiento. Con varios adoptantes en individual se reparte por igual.',
      url: `${D}gastos-adopcion.html`,
    },
    {
      id: 'castilla-y-leon-cuidado-hijos-menores',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'family',
      title: 'Cuidado de hijos menores de 4 años: empleada del hogar',
      summary:
        'Deduces el 30 % de lo pagado a una persona empleada del hogar que cuida a tus hijos menores de 4 años, con máximo de 322 euros por contribuyente. Es alternativa a la deducción por guardería.',
      kind: 'percent',
      percent: 30,
      limit: 322,
      requirements: `Hijos menores de 4 años que den derecho al mínimo; ambos padres de alta en la Seguridad Social por trabajar; empleada de alta en el Sistema Especial. ${RENTA}`,
      url: `${D}cuidado-hijos-menores.html`,
    },
    {
      id: 'castilla-y-leon-cuidado-hijos-guarderia',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'family',
      title: 'Cuidado de hijos menores de 4 años: guardería',
      summary:
        'Deduces el 100 % de matrícula, asistencia y comida de la guardería de tus hijos menores de 4 años (meses completos), con máximo de 1.320 euros por contribuyente. Alternativa a la empleada del hogar.',
      kind: 'percent',
      percent: 100,
      limit: 1320,
      requirements: `Centro de la región inscrito en el Registro de conciliación; ambos padres trabajando. ${RENTA} Se resta el incremento estatal por maternidad y ayudas públicas.`,
      url: `${D}cuidado-hijos-menores.html`,
    },
    {
      id: 'castilla-y-leon-cuotas-seguridad-social-hogar',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'family',
      title: 'Por cuotas de Seguridad Social de empleados del hogar',
      summary:
        'Deduces el 15 % de las cuotas a la Seguridad Social que pagas por un empleado del hogar, con máximo de 300 euros al año, si tienes un hijo menor de 4 años.',
      kind: 'percent',
      percent: 15,
      limit: 300,
      requirements: `Hijo menor de 4 años que dé derecho al mínimo por descendientes. Trabajador en el Sistema Especial de Empleados del Hogar. ${RENTA} Si hay varios con derecho, se reparte.`,
      url: `${D}cuotas-seguridad-social-empleados-hogar.html`,
    },
    {
      id: 'castilla-y-leon-discapacidad-contribuyente',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'family',
      title: 'Por contribuyente con discapacidad',
      summary:
        'Da 300 euros si tienes discapacidad de 65 % o más siendo menor de 65 años, o si tienes 65 años o más y discapacidad de entre 33 % y 64 %. Con 65 años y 65 % o más, usa la de 656 euros.',
      kind: 'fixed',
      amount: 300,
      unit: 'contribuyente',
      requirements: `Certificado de discapacidad (vale pensión de incapacidad permanente para el 33 %) y no ser usuario de residencias públicas o concertadas de la región. ${RENTA}`,
      url: `${D}contribuyentes-discapacidad.html`,
    },
    {
      id: 'castilla-y-leon-discapacidad-contribuyente-mayor-65',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'family',
      title: 'Por contribuyente de 65 años o más con discapacidad de 65 %',
      summary:
        'Da 656 euros a cada contribuyente de 65 años o más con una discapacidad reconocida de 65 % o más. Sustituye a la de 300 euros.',
      kind: 'fixed',
      amount: 656,
      unit: 'contribuyente',
      requirements: `65 años a fecha de devengo, discapacidad de 65 % o más con certificado (o incapacidad judicial) y no ser usuario de residencias públicas o concertadas de la región. ${RENTA}`,
      url: `${D}contribuyentes-discapacidad.html`,
    },
    // ---------------------------------------------------------------- VIVIENDA
    {
      id: 'castilla-y-leon-vivienda-jovenes-rural',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'housing',
      title: 'Compra o rehabilitación de vivienda para jóvenes en el medio rural',
      summary:
        'Deduces el 15 % de lo pagado por comprar, construir o rehabilitar tu primera vivienda habitual en un pueblo pequeño, con base máxima de 10.000 euros al año (hasta 1.500 euros).',
      kind: 'percent',
      percent: 15,
      baseLimit: 10000,
      limit: 1500,
      requirements: `Menor de 36 años, primera vivienda nueva o rehabilitada desde 2023, valor menor de 150.000 €, en ${MEDIO_RURAL}. ${RENTA}`,
      url: `${D}adquisicion-rehabilitacion-vivienda-habitual-jovenes-rural.html`,
    },
    {
      id: 'castilla-y-leon-rehabilitacion-subvencionada',
      group: 'housing',
      title: 'Obras subvencionadas de eficiencia energética y accesibilidad',
      summary:
        'Deduces el 15 % de lo invertido en tu vivienda habitual (paneles solares, mejora térmica, ahorro de agua, accesibilidad por discapacidad) con subvención de planes de vivienda; base máxima 20.000 euros.',
      kind: 'percent',
      percent: 15,
      baseLimit: 20000,
      requirements:
        'Obra subvencionada en planes de vivienda de la Junta (convocatorias de 2021 a 2024 con pagos en 2025). Se aplica el año en que cobras la subvención. Accesibilidad: el ocupante con discapacidad es tú, tu cónyuge o un pariente hasta el 3.er grado.',
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
      requirements: `Vivienda en ${MEDIO_RURAL}, valor menor de 150.000 €, alquiler de hasta 300 €/mes a no familiares (hasta 3.er grado), alquilada u ofertada 5 años, fianza depositada. Sin tope de renta.`,
      url: `${D}rehabilitacion-viviendas-medio-rural-destinadas-alquiler.html`,
    },
    {
      id: 'castilla-y-leon-alquiler-jovenes',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'housing',
      title: 'Alquiler de vivienda habitual para jóvenes',
      summary:
        'Deduces el 20 % del alquiler de tu vivienda habitual en Castilla y León, con máximo de 459 euros al año. En pueblos pequeños, usa la deducción del 25 %.',
      kind: 'percent',
      percent: 20,
      limit: 459,
      requirements: `Menor de 36 años a fecha de devengo y titular del contrato. El máximo se reduce por ayudas públicas de alquiler del año (p. ej. bono alquiler joven). ${RENTA}`,
      url: `${D}arrendamiento-vivienda-habitual-jovenes.html`,
    },
    {
      id: 'castilla-y-leon-alquiler-jovenes-rural',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'housing',
      title: 'Alquiler de vivienda habitual para jóvenes en el medio rural',
      summary:
        'Deduces el 25 % del alquiler de tu vivienda habitual si está en un pueblo pequeño, con máximo de 612 euros al año. Sustituye a la deducción del 20 %.',
      kind: 'percent',
      percent: 25,
      limit: 612,
      requirements: `Menor de 36 años y titular del contrato. Vivienda en ${MEDIO_RURAL}. Se restan ayudas de alquiler. ${RENTA}`,
      url: `${D}arrendamiento-vivienda-habitual-jovenes.html`,
    },
    {
      id: 'castilla-y-leon-vivienda-nueva-construccion',
      group: 'housing',
      title: 'Compra de vivienda de nueva construcción (régimen transitorio)',
      summary:
        'Deduces el 7,5 % de lo pagado por tu primera vivienda habitual nueva en Castilla y León, con base máxima de 9.040 euros al año. Solo si el proyecto se visó entre septiembre de 2011 y diciembre de 2012.',
      kind: 'percent',
      percent: 7.5,
      baseLimit: 9040,
      requirements:
        'Primera vivienda con visado del proyecto entre el 1-9-2011 y el 31-12-2012. Se aplica el año del primer pago y los cuatro siguientes. Sin tope de renta. No vale para ampliación ni rehabilitación. Se reduce si ya deduciste por una vivienda anterior.',
      url: `${D}adquisicion-vivienda-nueva-construccion-residencia-habitual.html`,
    },
    // ---------------------------------------------------------------- DONATIVOS
    {
      id: 'castilla-y-leon-donaciones-fundaciones-patrimonio',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'donations',
      title: 'Donaciones a fundaciones y patrimonio histórico y natural',
      summary:
        'Deduces el 15 % de lo donado para conservar bienes de interés cultural, espacios de la Red Natura 2000 o a fundaciones culturales, asistenciales o ecológicas de Castilla y León.',
      kind: 'percent',
      percent: 15,
      requirements: `${RENTA} Justificante según el art. 24 de la Ley 49/2002. ${TOPE_10}`,
      url: `${D}cantidades-donadas-fundaciones-cyl-recuperacion-patrimonio.html`,
    },
    {
      id: 'castilla-y-leon-donaciones-investigacion',
      group: 'donations',
      title: 'Donaciones para investigación, desarrollo e innovación',
      summary:
        'Deduces el 15 % de lo donado a universidades públicas de Castilla y León o a fundaciones e instituciones de I+D+i para proyectos desarrollados en la región.',
      kind: 'percent',
      percent: 15,
      requirements: `No tiene tope de renta. ${TOPE_10} Este límite del 10 % es independiente del límite de las deducciones estatales por donativos.`,
      url: `${D}cantidades-donadas-fomento-investigacion-desarrollo-innov_.html`,
    },
    // ---------------------------------------------------------------- OTRAS
    {
      id: 'castilla-y-leon-inversion-patrimonio-historico-natural',
      incomeLimit: {
        individual: 18900,
        joint: 31500,
        afterMinimum: true,
        note: 'Base general + ahorro menos el mínimo personal y familiar, hasta 18.900 € (31.500 € en conjunta).',
      },
      group: 'other',
      title: 'Inversión en patrimonio histórico, cultural y natural',
      summary:
        'Deduces el 15 % de lo que gastas como titular en restaurar, rehabilitar o reparar inmuebles de interés cultural (BIC o inventariados) o bienes de la Red Natura 2000 en Castilla y León.',
      kind: 'percent',
      percent: 15,
      requirements: `${RENTA} Obras autorizadas por la administración competente. ${TOPE_10}`,
      url: `${D}cantidades-invertidas-recuperacion-patrimonio-historico-natural.html`,
    },
    {
      id: 'castilla-y-leon-movilidad-sostenible',
      group: 'other',
      title: 'Compra de coche eléctrico o híbrido enchufable',
      summary:
        'Deduces el 15 % de lo que pagas por un turismo nuevo eléctrico, de autonomía extendida o híbrido enchufable (más de 40 km eléctricos WLTP), con máximo de 4.000 euros por vehículo.',
      kind: 'percent',
      percent: 15,
      limit: 4000,
      requirements:
        'Valor con impuestos de hasta 40.000 €, no afecto a actividad económica, factura a tu nombre, deducción solo el año de matriculación y mantenerlo 4 años. La deducción estatal (DA 58.ª) reduce el máximo de 4.000 €. Sin tope de renta.',
      url: `${D}fomento-movilidad-sostenible.html`,
    },
    {
      id: 'castilla-y-leon-fomento-emprendimiento',
      group: 'other',
      title: 'Inversión en sociedades nuevas (emprendimiento)',
      summary:
        'Deduces el 20 % de lo invertido en acciones o participaciones al constituir o ampliar capital de sociedades con domicilio en Castilla y León, con máximo de 10.000 euros.',
      kind: 'percent',
      percent: 20,
      limit: 10000,
      requirements:
        'Sociedad anónima, limitada o laboral con domicilio social y fiscal en la región que cree empleo; tener entre 0,5 % y 45 % del capital y mantenerlo 3 años. Hace falta certificado de la sociedad. Sin tope de renta.',
      url: `${D}fomento-emprendimiento.html`,
    },
  ],
};
