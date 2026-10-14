import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-canarias';

export const canarias: RentaCcaa = {
  id: 'canarias',
  name: 'Canarias',
  regime: 'common',
  scale: [
    { from: 0, rate: 9 },
    { from: 13748, rate: 11.5 },
    { from: 19422, rate: 14 },
    { from: 35924, rate: 18.5 },
    { from: 57566, rate: 23.5 },
    { from: 93268, rate: 25 },
    { from: 123745, rate: 26 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/8-cumplimentacion-irpf/8_4-cuota-integra/8_4_3-gravamen-base-liquidable-general/8_4_3_2-cuota-integra-autonomica.html',
  minimums: {
    personal: 5606,
    descendants: [2424, 2727, 4040, 4545],
    under3: 2828,
    ascendants: 1162,
    ascendantsOver75: 1414,
    over65: 1162,
    over75: 1414,
    disability33: 3030,
    disability65: 9090,
    assistance: 3030,
  },
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/canarias.html',
  deductions: [
    {
      id: 'canarias-nacimiento-adopcion',
      group: 'family',
      title: 'Por nacimiento o adopción de hijos',
      summary:
        'Por cada hijo nacido o adoptado: 265 € (1º y 2º), 530 € (3º), 796 € (4º) y 928 € (5º y siguientes). Extra de 600 € o 1.100 € si el hijo tiene discapacidad del 65 % o más.',
      kind: 'fixed',
      perChild: [265, 265, 530, 796, 928],
      unit: 'hijo nacido o adoptado',
      requirements:
        'Hijo que conviva contigo. Base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta). Con dos progenitores en declaraciones separadas se reparte a mitades. Compatible con la de familia numerosa.',
      url: `${BASE}/nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'canarias-familia-numerosa',
      group: 'family',
      title: 'Por familia numerosa',
      summary:
        '597 € si tienes título de familia numerosa general y 796 € si es especial. Si algún miembro tiene discapacidad del 65 % o más, 1.326 € y 1.459 € respectivamente.',
      kind: 'fixed',
      amount: 597,
      unit: 'familia numerosa (categoría general)',
      requirements:
        'Título en vigor a fecha de devengo, expedido por Canarias u otra comunidad. La aplica quien conviva con el resto; si conviven con varios contribuyentes se reparte a partes iguales. Compatible con la de nacimiento.',
      url: `${BASE}/familia-numerosa.html`,
    },
    {
      id: 'canarias-familias-monoparentales',
      group: 'family',
      title: 'Por familias monoparentales',
      summary:
        '133 € si tienes a tu cargo hijos y no convives con ninguna otra persona (salvo ascendientes que den derecho al mínimo por ascendientes).',
      kind: 'fixed',
      amount: 133,
      unit: 'contribuyente',
      requirements:
        'Hijos menores, o mayores con discapacidad, que convivan contigo y tengan rentas hasta 8.000 €. Base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta).',
      url: `${BASE}/familias-monoparentales.html`,
    },
    {
      id: 'canarias-acogimiento-menores',
      group: 'family',
      title: 'Por acogimiento de menores',
      summary:
        '330 € por cada menor en acogimiento familiar de urgencia, temporal o permanente que conviva contigo todo el año. Se prorratea por días si la convivencia es menor.',
      kind: 'fixed',
      amount: 330,
      unit: 'menor acogido',
      requirements:
        'No vale si adoptas al menor en el mismo año. Si hay dos contribuyentes con derecho y declaran por separado, se reparte a partes iguales.',
      url: `${BASE}/acogimiento-menores.html`,
    },
    {
      id: 'canarias-discapacidad-mayores-65',
      group: 'family',
      title: 'Contribuyentes con discapacidad y mayores de 65',
      summary:
        '400 € por cada contribuyente con discapacidad del 33 % o más y 160 € por cada contribuyente mayor de 65 años. Ambas son compatibles entre sí.',
      kind: 'fixed',
      amount: 400,
      unit: 'contribuyente con discapacidad (160 € si es mayor de 65)',
      requirements:
        'Situación a fecha de devengo (31 de diciembre). Base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta).',
      url: `${BASE}/contribuyentes-discapacidad-mayores-65-anos.html`,
    },
    {
      id: 'canarias-familiares-dependientes-discapacidad',
      group: 'family',
      title: 'Familiares dependientes con discapacidad',
      summary:
        '600 € por cada ascendiente o descendiente con discapacidad del 65 % o más que dé derecho al mínimo; y el 20 % de la cuota de Seguridad Social de un empleado del hogar que lo atienda (máx. 500 €).',
      kind: 'special',
      amount: 600,
      unit: 'familiar con discapacidad',
      requirements:
        'Para los 600 €: base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta). El 20 % exige que la persona necesite ayuda de terceros y dé derecho al mínimo por gastos de asistencia; tope 500 € al año.',
      url: `${BASE}/familiares-dependientes-discapacidad.html`,
    },
    {
      id: 'canarias-desempleados',
      group: 'family',
      title: 'Contribuyentes desempleados',
      summary:
        '120 € si cobras prestación por desempleo más de seis meses del año y tus ingresos del trabajo son bajos.',
      kind: 'fixed',
      amount: 120,
      unit: 'contribuyente',
      requirements:
        'Rendimientos íntegros del trabajo entre 15.876 € y 22.000 € (individual o conjunta). El resto de la base imponible (general y ahorro), sin contar el trabajo, no puede pasar de 1.600 €.',
      url: `${BASE}/contribuyentes-desempleados.html`,
    },
    {
      id: 'canarias-empleados-hogar',
      group: 'family',
      title: 'Cuotas de Seguridad Social de empleados del hogar',
      summary:
        'El 20 % de las cuotas a la Seguridad Social que pagas por un empleado del hogar en tu vivienda habitual. Máximo 500 € al año.',
      kind: 'percent',
      percent: 20,
      limit: 500,
      requirements:
        'Debes tener derecho al mínimo por descendientes y trabajar, o tener 75 años o más, o más de 65 con discapacidad (65 % física o 33 % cognitiva). Debes indicar el NIF del trabajador.',
      url: `${BASE}/cuotas-satisfechas-seguridad-social-contratacion-hogar.html`,
    },
    {
      id: 'canarias-gasto-enfermedad',
      group: 'family',
      title: 'Gastos de enfermedad',
      summary:
        'El 12 % de lo pagado a médicos y sanitarios (salvo farmacéuticos) y en aparatos como gafas o lentillas, tuyos o de tu familia. Máximo 500 € individual y 700 € conjunta.',
      kind: 'percent',
      percent: 12,
      limit: 500,
      requirements:
        'Con base imponible hasta 46.455 € (individual) o 61.770 € (conjunta). Por encima, el límite baja a 150 € por contribuyente. +100 € si eres mayor de 65 con discapacidad del 65 %. Necesitas factura; no cuentan seguros médicos.',
      url: `${BASE}/gasto-enfermedad.html`,
    },
    {
      id: 'canarias-guarderias',
      group: 'family',
      title: 'Gastos de custodia en guarderías',
      summary:
        'El 18 % de lo pagado en guarderías autorizadas por hijos menores de 3 años. Máximo 530 € al año por hijo.',
      kind: 'percent',
      percent: 18,
      limit: 530,
      requirements:
        'Debes ser el progenitor o tutor con quien convive el menor. Base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta). Necesitas factura con el NIF de la guardería.',
      url: `${BASE}/gastos-custodia-guarderias.html`,
    },
    {
      id: 'canarias-estudios-superiores',
      group: 'family',
      title: 'Gastos de estudios de educación superior',
      summary:
        '1.800 € por hijo que estudie fuera de tu isla (1.920 € si tu base liquidable es inferior a 37.062 €), o 900 € si estudia en tu isla pero se traslada de municipio.',
      kind: 'fixed',
      amount: 1800,
      unit: 'descendiente',
      requirements:
        'Hijo soltero, dependiente y menor de 25 años, con rentas hasta 8.000 €. Sin oferta pública presencial en tu isla (supuesto de 1.800 €). Base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta). Tope: 40 % de la cuota autonómica.',
      url: `${BASE}/gastos-estudios-educacion-superior.html`,
    },
    {
      id: 'canarias-estudios-no-superiores',
      group: 'family',
      title: 'Gastos de estudios no superiores',
      summary:
        'El 100 % de libros, material didáctico, transporte, uniforme y comedor escolar de tus hijos. Máximo 133 € por el primer hijo y 66 € más por cada uno de los demás.',
      kind: 'percent',
      percent: 100,
      limit: 133,
      requirements:
        'Hijos escolarizados en infantil, educación básica o secundaria postobligatoria que den derecho al mínimo por descendientes. Base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta). Necesitas factura.',
      url: `${BASE}/gastos-estudios-no-superiores.html`,
    },
    {
      id: 'canarias-alquiler-vivienda-habitual',
      group: 'housing',
      title: 'Alquiler de la vivienda habitual',
      summary:
        'El 24 % del alquiler de tu vivienda habitual. Máximo 740 € al año, o 760 € si tienes menos de 40 años o 75 o más.',
      kind: 'percent',
      percent: 24,
      limit: 740,
      requirements:
        'Base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta). El alquiler debe superar el 10 % de tu base imponible. Contrato de al menos un año; identifica al arrendador y la referencia catastral.',
      url: `${BASE}/alquiler-vivienda-habitual.html`,
    },
    {
      id: 'canarias-alquiler-dacion-en-pago',
      group: 'housing',
      title: 'Alquiler tras dación en pago de tu vivienda',
      summary:
        'El 25 % del alquiler de tu vivienda habitual si la cediste al banco por no poder pagar la hipoteca y sigues viviendo en ella como arrendatario. Máximo 1.200 € por contribuyente.',
      kind: 'percent',
      percent: 25,
      limit: 1200,
      requirements:
        'Contrato de alquiler con opción de compra con la entidad acreedora. Base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta).',
      url: `${BASE}/arrendamiento-vivienda-habitual-vinculado-operaciones-pago.html`,
    },
    {
      id: 'canarias-inversion-vivienda-habitual',
      group: 'housing',
      title: 'Inversión en vivienda habitual',
      summary:
        'Deduces el 5 % (5,5 % si tienes menos de 40 años) de lo pagado por tu vivienda habitual si tu base es menor de 26.035 €; entre 26.035 € y 46.455 €, el 3,5 % (4 % si eres menor de 40).',
      kind: 'percent',
      percent: 5,
      baseLimit: 6000,
      limit: 300,
      requirements:
        'Según las reglas estatales vigentes a 31/12/2012 (vivienda comprada antes de 2013 o equivalente). Base máxima 6.000 € al año. Límite conjunto con otras deducciones de vivienda: 15 % de la cuota íntegra autonómica.',
      url: `${BASE}/inversion-vivienda-habitual.html`,
    },
    {
      id: 'canarias-obras-adecuacion-discapacidad',
      group: 'housing',
      title: 'Obras de adecuación de la vivienda por discapacidad',
      summary:
        'El 14 % (18 % si además eres mayor de 65) de las obras de accesibilidad en la vivienda habitual de una persona con discapacidad del 65 % o más. Base máxima 15.000 €.',
      kind: 'percent',
      percent: 14,
      baseLimit: 15000,
      limit: 2100,
      requirements:
        'Aplica a ti o a tu cónyuge, ascendientes o descendientes convivientes con discapacidad del 65 % o más (estos con rentas hasta 35.735 €). Certificado de necesidad de la Consejería. Límite conjunto: 15 % de la cuota autonómica.',
      url: `${BASE}/obras-adecuacion-vivienda-habitual-personas-discapacidad.html`,
    },
    {
      id: 'canarias-rehabilitacion-energetica',
      group: 'housing',
      title: 'Rehabilitación energética de la vivienda habitual',
      summary:
        'El 12 % de las obras que mejoren la eficiencia energética (aislamiento, renovables, ahorro de agua) de tu vivienda habitual en propiedad. Base máxima 7.000 € al año.',
      kind: 'percent',
      percent: 12,
      baseLimit: 7000,
      limit: 840,
      requirements:
        'Pago por medios bancarios (no efectivo). Certificados de eficiencia energética registrados antes y después. Tope: 10 % de la cuota autonómica y, con otras deducciones de vivienda, 15 %.',
      url: `${BASE}/obras-rehabilitacion-energetica-vivienda-habitual.html`,
    },
    {
      id: 'canarias-restauracion-bienes-interes-cultural',
      group: 'housing',
      title: 'Restauración de inmuebles de interés cultural',
      summary:
        'El 10 % de lo que gastes en restaurar, rehabilitar o reparar inmuebles tuyos en Canarias declarados Bien de Interés Cultural.',
      kind: 'percent',
      percent: 10,
      requirements:
        'Obras autorizadas por la administración competente. Tope: 10 % de la cuota íntegra autonómica y, junto con otras deducciones de vivienda, 15 %.',
      url: `${BASE}/cantidades-restaur-rehabilitacion-rep-inmuebles-cultural.html`,
    },
    {
      id: 'canarias-puesta-viviendas-alquiler',
      group: 'housing',
      title: 'Poner viviendas en alquiler',
      summary:
        '1.000 € por cada vivienda que pongas en alquiler como vivienda habitual (máximo 5 inmuebles). Se aplica una sola vez, el primer año en que se alquila.',
      kind: 'fixed',
      amount: 1000,
      unit: 'inmueble alquilado',
      requirements:
        'Inmueble en Canarias que no se alquilaba el año anterior. Contrato de al menos 3 años. No alquilar a cónyuge o parientes hasta el tercer grado. Si incumples, hay que devolver lo deducido.',
      url: `${BASE}/puesta-viviendas-mercado-arrendamiento-viviendas-habituales.html`,
    },
    {
      id: 'canarias-adecuacion-inmueble-arrendamiento',
      group: 'housing',
      title: 'Arrendador: gastos de preparar el inmueble',
      summary:
        'El 10 % de reparaciones, formalización del contrato, seguros y certificado energético para alquilar un inmueble como vivienda habitual. Máximo 150 € por inmueble.',
      kind: 'percent',
      percent: 10,
      limit: 150,
      requirements:
        'Solo arrendamientos de vivienda de la LAU; con factura. Si hay varios propietarios se reparte según su participación. Incompatible con la deducción de seguros de crédito sobre las mismas cantidades.',
      url: `${BASE}/gastos-derivados-adecuacion-inmueble-destino-arrendamiento.html`,
    },
    {
      id: 'canarias-seguros-credito-impago',
      group: 'housing',
      title: 'Arrendador: seguros de crédito por impago',
      summary:
        'El 75 % de las primas de seguros que cubren el impago de la renta de una vivienda que alquilas en Canarias. Máximo 150 € al año.',
      kind: 'percent',
      percent: 75,
      limit: 150,
      requirements:
        'Contrato de al menos un año, fianza depositada, alquiler de hasta 800 € al mes y rentas declaradas como capital inmobiliario. Incompatible con la de adecuación del inmueble sobre las mismas cantidades.',
      url: `${BASE}/gastos-primas-seguros-credito-cubrir-impagos.html`,
    },
    {
      id: 'canarias-donaciones-entidades-sin-lucro',
      group: 'donations',
      title: 'Donaciones a entidades sin ánimo de lucro',
      summary:
        'Deducción adicional a la estatal: el 20 % de los primeros 150 € donados y el 15 % del resto (17,5 % si repites donación a la misma entidad dos años seguidos).',
      kind: 'special',
      percent: 15,
      requirements:
        'Entidades de la Ley 49/2002. La base de deducción no puede pasar del 10 % de tu base liquidable. Incompatible con las donaciones ecológicas o culturales sobre las mismas aportaciones.',
      url: `${BASE}/donaciones-entidades-sin-animo-lucro.html`,
    },
    {
      id: 'canarias-donaciones-ecologicas',
      group: 'donations',
      title: 'Donaciones con finalidad ecológica',
      summary:
        'El 10 % de las donaciones en dinero a entidades públicas canarias o sin ánimo de lucro inscritas en Canarias dedicadas a defender el medio ambiente.',
      kind: 'percent',
      percent: 10,
      limit: 150,
      requirements:
        'Máximo 150 € por contribuyente y el 10 % de la cuota íntegra autonómica. Donaciones puras y simples en dinero, con certificado de la entidad.',
      url: `${BASE}/donaciones-finalidad-ecologica.html`,
    },
    {
      id: 'canarias-donaciones-culturales-deportivas',
      group: 'donations',
      title: 'Donaciones culturales, deportivas, de investigación o docencia',
      summary:
        'El 15 % de donaciones a la Administración canaria, universidades, empresas culturales o científicas pequeñas y otras entidades. Base máxima de 3.000 € a 50.000 € según destinatario.',
      kind: 'percent',
      percent: 15,
      requirements:
        'Base máxima 50.000 € (administraciones, universidades, empresas tecnológicas) o 3.000 € (empresas culturales y científicas con fondos propios bajo 300.000 €). Tope: 5 % de la cuota íntegra autonómica.',
      url: `${BASE}/donaciones-fines-culturales-deportivos-investigacion-docencia.html`,
    },
    {
      id: 'canarias-donaciones-patrimonio-historico',
      group: 'donations',
      title: 'Donaciones para el patrimonio histórico canario',
      summary:
        'El 20 % de lo donado para rehabilitar o conservar bienes del patrimonio histórico de Canarias inscritos como Bien de Interés Cultural o en el Inventario de Bienes Muebles.',
      kind: 'percent',
      percent: 20,
      limit: 150,
      requirements:
        'Máximo 150 € por contribuyente y el 10 % de la cuota íntegra autonómica. En conjuntos históricos, la donación debe ir a administraciones, iglesias o fundaciones autorizadas.',
      url: `${BASE}/donaciones-rehabilitacion-conservacion-patrimonio-historico-canarias.html`,
    },
    {
      id: 'canarias-inversion-nuevas-empresas',
      group: 'other',
      title: 'Inversión en empresas nuevas o de reciente creación',
      summary:
        'El 20 % de lo invertido en acciones de SA o SL (máx. 4.000 €), o el 30 % en sociedades de universidades o laborales/cooperativas (máx. 6.000 €).',
      kind: 'percent',
      percent: 20,
      limit: 4000,
      requirements:
        'La empresa debe tener domicilio social y fiscal en Canarias y actividad económica. Mantener la participación 3 años y no ejercer funciones ejecutivas. Exige empleo (una persona a jornada completa) según el tipo de inversión.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones-sociales.html`,
    },
    {
      id: 'canarias-traslado-otra-isla',
      group: 'other',
      title: 'Traslado de residencia a otra isla por trabajo',
      summary:
        '300 € el año en que te trasladas a otra isla canaria por trabajo (por cuenta ajena o actividad económica) y 300 € el siguiente.',
      kind: 'fixed',
      amount: 300,
      unit: 'año de aplicación (2 años)',
      requirements:
        'Debes permanecer en la isla de destino el año del traslado y los tres siguientes. Base imponible total hasta 46.455 € (individual) o 61.770 € (conjunta). Tope: parte autonómica de la cuota del trabajo y actividades.',
      url: `${BASE}/trasladar-residencia-habitual-otra-isla-ae.html`,
    },
  ],
};
