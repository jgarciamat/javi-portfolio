import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-galicia';

export const galicia: RentaCcaa = {
  id: 'galicia',
  name: 'Galicia',
  regime: 'common',
  scale: [
    { from: 0, rate: 9 },
    { from: 12985.35, rate: 11.65 },
    { from: 21068.6, rate: 14.9 },
    { from: 35200, rate: 18.4 },
    { from: 60000, rate: 22.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-autonoma-galicia.html',
  minimums: {
    personal: 5789,
    over65: 1199,
    over75: 1460,
    descendants: [2503, 2816, 4172, 4694],
    under3: 2920,
    ascendants: 1199,
    ascendantsOver75: 1460,
    disability33: 3129,
    disability65: 9387,
    assistance: 3129,
  },
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/galicia.html',
  deductions: [
    {
      id: 'galicia-nacimiento-adopcion',
      group: 'family',
      title: 'Por nacimiento o adopción de hijos',
      summary:
        'Por cada hijo nacido o adoptado en el año que viva contigo: 360 euros el 1º, 1.200 el 2º y 2.400 el 3º y siguientes (300 por hijo si superas el límite de renta). Un 20 % más en municipios de menos de 5.000 habitantes.',
      kind: 'fixed',
      perChild: [360, 1200, 2400],
      requirements:
        'Importe completo si la base imponible total menos el mínimo personal y familiar es de 22.000 euros o menos; por encima, 300 euros por hijo (360 en parto múltiple). Convivencia el 31 de diciembre.',
      url: `${BASE}/nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'galicia-familias-dos-hijos',
      group: 'family',
      title: 'Para familias con dos hijos',
      summary:
        'Da 250 euros si tienes dos hijos que dan derecho al mínimo por descendientes; 500 euros si tú o alguno de los hijos tiene una discapacidad del 65 % o más.',
      kind: 'fixed',
      amount: 250,
      unit: 'contribuyente (500 euros con discapacidad del 65 % o más)',
      requirements:
        'Dos hijos que den derecho al mínimo por descendientes el día del devengo. Incompatible con la deducción por familia numerosa. Si varios contribuyentes tienen derecho por los mismos hijos, se reparte por igual.',
      url: `${BASE}/familias-dos-hijos-hijas.html`,
    },
    {
      id: 'galicia-familia-numerosa',
      group: 'family',
      title: 'Por familia numerosa',
      summary:
        'Da 250 euros (400 si es categoría especial) en familias de hasta dos hijos, más 250 euros por cada hijo adicional. Las cuantías se duplican si hay discapacidad del 65 % o más.',
      kind: 'special',
      requirements:
        'Tener el título de familia numerosa el 31 de diciembre. Si varios contribuyentes tienen derecho por los mismos descendientes, se reparte por igual. Incompatible con la deducción para familias con dos hijos.',
      url: `${BASE}/familia-numerosa.html`,
    },
    {
      id: 'galicia-acogimiento-menores',
      group: 'family',
      title: 'Por acogimiento familiar de menores',
      summary:
        'Da 300 euros por cada menor en acogimiento familiar (temporal, permanente, urgencia o guarda con fines de adopción), formalizado por la Xunta.',
      kind: 'fixed',
      amount: 300,
      unit: 'menor acogido',
      requirements:
        'Acogimiento formalizado por la Xunta de Galicia. No vale si el menor es adoptado en el mismo año (entonces aplica la de nacimiento o adopción). Si declaran por separado, se reparte entre los acogedores.',
      url: `${BASE}/acogimiento-menores.html`,
    },
    {
      id: 'galicia-cuidado-hijos-menores',
      group: 'family',
      title: 'Por cuidado de hijos menores de 3 años',
      summary:
        'Devuelve el 30 % de lo que pagas a una empleada del hogar o a una escuela infantil de 0-3 años por cuidar a tus hijos mientras trabajas. Máximo 400 euros (600 con dos o más hijos de 3 años o menos).',
      kind: 'percent',
      percent: 30,
      limit: 400,
      requirements:
        'Hijos de 3 años o menos y ambos padres trabajando y dados de alta en la Seguridad Social. Base imponible total menos mínimo personal y familiar hasta 22.000 euros (individual) o 31.000 (conjunta).',
      url: `${BASE}/cuidado-hijos-menores.html`,
    },
    {
      id: 'galicia-discapacidad-65-ayuda-terceros',
      group: 'family',
      title: 'Mayores de 65 con discapacidad que necesitan ayuda',
      summary:
        'Devuelve el 10 % de lo que pagas a terceros si tienes 65 años o más, una discapacidad del 65 % o más y necesitas ayuda de otra persona. Máximo 600 euros.',
      kind: 'percent',
      percent: 10,
      limit: 600,
      requirements:
        'Base imponible total menos mínimo personal y familiar hasta 22.000 euros (individual) o 31.000 (conjunta). Hay que acreditar la necesidad de ayuda de terceros.',
      url: `${BASE}/contribuyentes-discapacidad-edad-igual-superior-anos.html`,
    },
    {
      id: 'galicia-ayudas-ela',
      group: 'other',
      title: 'Por ayudas y subvenciones a personas con ELA',
      summary:
        'Si has tributado por una ayuda pública destinada a personas con ELA (o sus fenotipos), te devuelven el impuesto autonómico de esa ayuda (tipo medio de gravamen).',
      kind: 'special',
      requirements:
        'Haber incluido en la base imponible general del año una subvención o ayuda pública para personas con diagnóstico de esclerosis lateral amiotrófica o sus fenotipos.',
      url: `${BASE}/ayudas-subvenciones-recibidas-personas-diagnostico-ela.html`,
    },
    {
      id: 'galicia-ayudas-talidomida',
      group: 'other',
      title: 'Por ayudas a afectados por la talidomida',
      summary:
        'Si has tributado por una ayuda pública a afectados por la talidomida (1950-1985), te devuelven el impuesto autonómico de esa ayuda (tipo medio de gravamen).',
      kind: 'special',
      requirements:
        'Aplicable a ayudas integradas en la base imponible general desde 2023. Quien no la aplicó en 2023 o 2024 puede pedir la rectificación de esas declaraciones.',
      url: `${BASE}/ayudas-recibidas-personas-afectadas-talidomida-1985.html`,
    },
    {
      id: 'galicia-alquiler-vivienda-habitual',
      group: 'housing',
      title: 'Por alquiler de la vivienda habitual',
      summary:
        'Devuelve el 10 % del alquiler de tu vivienda habitual (máximo 300 euros). Con dos o más hijos menores sube al 20 % y 600 euros; las cuantías se duplican con discapacidad del 33 % o más.',
      kind: 'percent',
      percent: 10,
      limit: 300,
      requirements:
        'Tener 35 años o menos (en conjunta, uno de los cónyuges) y bases imponibles hasta 22.000 euros. Contrato posterior a 2003 y fianza depositada en el Instituto Galego da Vivenda e Solo.',
      url: `${BASE}/alquiler-vivienda-habitual.html`,
    },
    {
      id: 'galicia-climatizacion-renovables',
      group: 'housing',
      title: 'Climatización o agua caliente con energías renovables',
      summary:
        'Devuelve el 5 % de lo que pagas por instalar en tu vivienda habitual climatización o agua caliente con energías renovables para autoconsumo. Máximo 280 euros.',
      kind: 'percent',
      percent: 5,
      limit: 280,
      requirements:
        'Instalación en la vivienda habitual y destinada exclusivamente al autoconsumo, con fuentes de energía renovable. Consulta en la AEAT los requisitos técnicos y de justificación.',
      url: `${BASE}/inversion-instalaciones-climatizacion-y_o-agua-sanitaria.html`,
    },
    {
      id: 'galicia-eficiencia-energetica',
      group: 'housing',
      title: 'Obras de eficiencia energética en viviendas',
      summary:
        'Devuelve el 15 % de lo que inviertas en obras que mejoren la eficiencia energética de tu vivienda o edificio, con base máxima de 9.000 euros por contribuyente.',
      kind: 'percent',
      percent: 15,
      baseLimit: 9000,
      requirements:
        'Obras que consigan un salto de letra en el certificado energético. Además, el 100 % de los honorarios del certificado y de su inscripción en el registro gallego, con un límite de 150 euros.',
      url: `${BASE}/obras-mejora-eficiencia-energetica-edificios-viviendas.html`,
    },
    {
      id: 'galicia-aldeas-modelo',
      group: 'housing',
      title: 'Vivienda en proyectos de aldeas modelo',
      summary:
        'Devuelve el 15 % de lo que pagas por comprar o rehabilitar una vivienda en un proyecto de aldea modelo. Base máxima 9.000 euros al año (4.500 si no es tu vivienda habitual).',
      kind: 'percent',
      percent: 15,
      baseLimit: 9000,
      requirements:
        'Vivienda adquirida o rehabilitación iniciada desde el 1 de enero de 2021, en terrenos de un proyecto de aldeas modelo, y destinada a tu residencia (habitual o esporádica).',
      url: `${BASE}/adquisicion-rehabilitacion-viviendas-proyectos-aldeas-modelo.html`,
    },
    {
      id: 'galicia-rehabilitacion-centros-historicos',
      group: 'housing',
      title: 'Rehabilitar inmuebles en centros históricos',
      summary:
        'Devuelve el 15 % de lo que inviertas en rehabilitar inmuebles tuyos situados en centros históricos de Galicia. Máximo 9.000 euros de deducción.',
      kind: 'percent',
      percent: 15,
      limit: 9000,
      requirements:
        'Obras de reconstrucción (estructuras, fachadas o cubiertas) cuyo coste supere el 25 % del valor del inmueble. En conjunta el límite es de 9.000 euros para toda la unidad familiar.',
      url: `${BASE}/rehabilitacion-bienes-inmuebles-situados-centros-historicos.html`,
    },
    {
      id: 'galicia-adecuacion-inmueble-vacio',
      group: 'housing',
      title: 'Arreglar un inmueble vacío para alquilarlo',
      summary:
        'Devuelve el 15 % de lo que gastas en obras y trámites para poner un inmueble vacío en condiciones de alquilarlo como vivienda. Base máxima 9.000 euros por vivienda.',
      kind: 'percent',
      percent: 15,
      baseLimit: 9000,
      requirements:
        'Alquiler posterior de al menos tres años, valor del inmueble hasta 250.000 euros y obras terminadas en dos años. La base anual deducible es de 3.000 euros por vivienda; el resto pasa a los años siguientes.',
      url: `${BASE}/gastos-derivados-adecuacion-inmueble-vacio-vivienda.html`,
    },
    {
      id: 'galicia-arrendamiento-viviendas-vacias',
      group: 'housing',
      title: 'Por alquilar viviendas vacías',
      summary:
        'Da 500 euros por cada inmueble que estaba vacío y alquilas como vivienda, el año en que firmas el contrato.',
      kind: 'fixed',
      amount: 500,
      unit: 'inmueble alquilado',
      requirements:
        'Inmueble en Galicia vacío al menos un año antes, contrato de al menos tres años, alquiler mensual de hasta 700 euros e inquilino que no sea tu cónyuge ni un pariente hasta el tercer grado.',
      url: `${BASE}/arrendamiento-viviendas-vacias.html`,
    },
    {
      id: 'galicia-donaciones-investigacion',
      group: 'donations',
      title: 'Donativos para investigación e innovación',
      summary:
        'Devuelve el 25 % de tus donativos en dinero a centros de investigación gallegos o entidades sin ánimo de lucro de I+D+i. Tope: el 10 % de tu cuota íntegra autonómica.',
      kind: 'percent',
      percent: 25,
      requirements:
        'Donativo monetario a centros de investigación vinculados a universidades gallegas o participados por la Xunta, o a entidades sin ánimo de lucro acogidas a la Ley 49/2002. Hay que justificarlo documentalmente.',
      url: `${BASE}/donaciones-finalidad-investigacion-desarrollo-cientifico.html`,
    },
    {
      id: 'galicia-nuevas-tecnologias-hogares',
      group: 'other',
      title: 'Por internet de alta velocidad en casa',
      summary:
        'Devuelve el 30 % de la cuota de alta y las cuotas mensuales de internet de alta velocidad en tu hogar. Máximo 100 euros al año.',
      kind: 'percent',
      percent: 30,
      limit: 100,
      requirements:
        'En matrimonios en gananciales, cada cónyuge puede deducir como máximo 50 euros aunque el contrato esté a nombre de uno solo. Consulta en la AEAT el resto de condiciones.',
      url: `${BASE}/gastos-dirigidos-uso-nuevas-tecnologias-gallegos.html`,
    },
    {
      id: 'galicia-inversion-entidades-nuevas',
      group: 'other',
      title: 'Invertir en empresas nuevas o de reciente creación',
      summary:
        'Devuelve el 30 % de lo que inviertas al constituir una sociedad o ampliar capital en empresas gallegas nuevas. Máximo 6.000 euros (hasta un 15 % adicional en ciertos casos).',
      kind: 'percent',
      percent: 30,
      limit: 6000,
      requirements:
        'Participación, con familiares, entre el 1 % y el 40 % del capital, mantenida tres años. Sociedad con domicilio social y fiscal en Galicia, actividad económica y al menos un empleado a jornada completa.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones-sociales.html`,
    },
    {
      id: 'galicia-inversion-entidades-nuevas-financiacion',
      group: 'other',
      title: 'Invertir y financiar empresas nuevas',
      summary:
        'Devuelve el 30 % de lo que inviertas en capital de empresas gallegas nuevas y de los préstamos o garantías que les des. Límite conjunto de 20.000 euros.',
      kind: 'percent',
      percent: 30,
      limit: 20000,
      requirements:
        'Sociedad nueva con domicilio social y fiscal en Galicia, actividad económica y al menos una persona contratada a jornada completa. Participación, con familiares, entre el 1 % y el 40 %.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones.html`,
    },
    {
      id: 'galicia-inversion-mercado-alternativo',
      group: 'other',
      title: 'Acciones del mercado alternativo bursátil',
      summary:
        'Devuelve el 15 % de lo que inviertas en ampliaciones de capital de empresas del segmento de empresas en expansión del Mercado Alternativo Bursátil. Máximo 4.000 euros.',
      kind: 'percent',
      percent: 15,
      limit: 4000,
      requirements:
        'Tu participación no puede superar el 10 % del capital y las acciones deben mantenerse al menos tres años.',
      url: `${BASE}/inversion-acciones-entidades-que-cotizan-segmento.html`,
    },
    {
      id: 'galicia-inversion-actividades-agrarias',
      group: 'other',
      title: 'Invertir en empresas agrarias',
      summary:
        'Devuelve el 20 % de lo que inviertas en empresas que desarrollen actividades agrarias (capital o financiación). Límite conjunto de 20.000 euros.',
      kind: 'percent',
      percent: 20,
      limit: 20000,
      requirements:
        'Mantener la inversión al menos cinco años. No puedes ejercer funciones ejecutivas ni tener relación laboral con la empresa durante diez años. Consulta en la AEAT los tipos de inversión admitidos.',
      url: `${BASE}/inversion-empresas-que-desarrollen-actividades-agrarias.html`,
    },
    {
      id: 'galicia-ayudas-deportistas-alto-nivel',
      group: 'other',
      title: 'Ayudas a deportistas de alto nivel de Galicia',
      summary:
        'Si has tributado por una ayuda pública de la Xunta para tu actividad deportiva, te devuelven el impuesto autonómico de esa ayuda (tipo medio de gravamen).',
      kind: 'special',
      requirements:
        'Ser deportista de alto nivel reconocido por la Xunta, que la actividad deportiva no genere rendimientos de actividades económicas y haber incluido la ayuda en la base imponible general.',
      url: `${BASE}/ayudas-subvenciones-recibidas-deportistas-alto-nivel.html`,
    },
    {
      id: 'galicia-inversion-proyectos-interes-publico',
      group: 'other',
      title: 'Invertir en proyectos de especial interés',
      summary:
        'Devuelve el 20 % de lo que inviertas en sociedades creadas para proyectos declarados de especial interés público, social o económico. Base máxima 10.000 euros por entidad.',
      kind: 'percent',
      percent: 20,
      baseLimit: 10000,
      requirements:
        'Entidades cuyo objeto social exclusivo sea realizar proyectos declarados de especial interés público, social o económico. La base máxima se aplica por entidad, aunque inviertas en varios años.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones-sociales-interes.html`,
    },
    {
      id: 'galicia-incendios-forestales-2025',
      group: 'other',
      title: 'Ayudas por los incendios forestales de 2025',
      summary:
        'Si has tributado por una ayuda de la Xunta por los daños de los grandes incendios forestales de Galicia de 2025, te devuelven el impuesto autonómico de esa ayuda.',
      kind: 'special',
      requirements:
        'Haber incluido en la base imponible general una ayuda de la Xunta de las previstas en el Decreto 76/2025, de 29 de agosto, por incendios con activación del PEIFOGA en Situación 2.',
      url: `${BASE}/subvenciones-ayudas-obtenidas-x-danos-forestales.html`,
    },
    {
      id: 'galicia-libros-texto-material-escolar',
      group: 'family',
      title: 'Libros de texto y material escolar',
      summary:
        'Devuelve el 15 % de lo que pagas en libros de texto y material escolar de tus hijos de Primaria, ESO o Educación Especial. Máximo 105 euros por hijo (2025: solo facturas de julio a diciembre).',
      kind: 'percent',
      percent: 15,
      limit: 105,
      requirements:
        'Renta per cápita de la unidad familiar de 30.000 euros o menos. Gasto máximo en material escolar de 300 euros (150 en ropa y calzado deportivo). Solo facturas emitidas entre el 1 de julio y el 31 de diciembre de 2025.',
      url: `${BASE}/adquisicion-libros-texto-material-escolar.html`,
    },
  ],
};
