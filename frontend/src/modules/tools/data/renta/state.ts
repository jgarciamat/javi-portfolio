import type { Deduction, RentaState, TaxBracket } from '../../domain/rentaData';

/**
 * Manual práctico de Renta 2025 (AEAT), parte 1: https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/100.html
 * Cifras contrastadas línea a línea con ese manual y con la Ley 35/2006 (BOE, texto consolidado).
 */
const MANUAL =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025';
const C16 = `${MANUAL}/c16-deducciones-generales-cuota`;
const C18 = `${MANUAL}/c18-cuota-liquida-resultante-autoliquidacion`;
const MATERNIDAD = `${C18}/resultado-declaracion/deduccion-maternidad-incremento-adicional-gastos-custodia`;
const FAMILIA = `${C18}/resultado-declaracion/deducciones-familia-numerosa-personas-discapacidad-cargo`;
/** Advance payment (monthly) of maternity: model 140. Large family, disability and separated ascendant: model 143. */
const ADVANCE_MATERNITY = {
  model: '140',
  url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ25.shtml',
};
const ADVANCE_FAMILY = {
  model: '143',
  url: 'https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-familia-numerosa/solicitud-cesion-abono-anticipado.html',
};
const DONATIVOS = `${C16}/deducciones-donativos-otras-aportaciones`;
const EFICIENCIA = `${C16}/deducciones-obras-mejora-eficiencia-energetica-viviendas`;
const VEHICULOS = `${C16}/deducciones-adquisicion-vehiculos-electricos-puntos-recarga`;
const VIVIENDA = `${C16}/deduccion-inversion-vivienda-habitual-regimen-transitorio`;

/** Escala estatal de la base liquidable general (art. 63 Ley IRPF). */
const scale: TaxBracket[] = [
  { from: 0, rate: 9.5 },
  { from: 12450, rate: 12 },
  { from: 20200, rate: 15 },
  { from: 35200, rate: 18.5 },
  { from: 60000, rate: 22.5 },
  { from: 300000, rate: 24.5 },
];

/**
 * Escala que se aplica a la parte autonómica cuando no hay una propia: la del art. 65 de la Ley del IRPF,
 * que es la que usan Ceuta y Melilla (disposición adicional 32.ª).
 */
const defaultRegionalScale: TaxBracket[] = [
  { from: 0, rate: 9.5 },
  { from: 12450, rate: 12 },
  { from: 20200, rate: 15 },
  { from: 35200, rate: 18.5 },
  { from: 60000, rate: 22.5 },
];

const deductions: Deduction[] = [
  // ---------------------------------------------------------------- Familia (abonables)
  {
    id: 'estado-maternidad',
    advance: ADVANCE_MATERNITY,
    group: 'family',
    title: 'Por maternidad (hijos menores de 3 años)',
    summary:
      'Hasta 1.200 euros al año por hijo menor de 3 años (100 euros por mes). Sube 150 euros el mes en que cumples 30 días cotizados tras el parto. Es abonable: se cobra aunque no haya cuota.',
    kind: 'fixed',
    amount: 1200,
    unit: 'hijo menor de 3 años',
    limit: 1350,
    requirements:
      'Madre con derecho al mínimo por descendientes que cobre paro o esté de alta en la Seguridad Social al nacer el hijo, o después con 30 días cotizados. No cuentan los meses con complemento de ayuda a la infancia. Solo la madre (salvo fallecimiento o custodia del padre).',
    url: `${MATERNIDAD}/deduccion-maternidad/cuantia-limite-deduccion.html`,
  },
  {
    id: 'estado-guarderia',
    group: 'family',
    title: 'Gastos de guardería (suma a la de maternidad)',
    summary:
      'Hasta 1.000 euros al año por hijo menor de 3 años (83,33 euros por mes completo pagado) si pagas guardería o centro de educación infantil autorizado. Es abonable. Tope: lo pagado sin subvención.',
    kind: 'special',
    amount: 1000,
    unit: 'hijo menor de 3 años',
    limit: 1000,
    requirements:
      'Tener derecho a la deducción por maternidad. Cuentan matrícula, asistencia y comida, solo en meses pagados completos y hasta el mes previo al 2.º ciclo infantil. Se resta lo subvencionado y lo pagado por la empresa como retribución exenta. Cuenta lo pagado por ambos padres.',
    url: `${MATERNIDAD}/incremento-adicional-gastos-custodia-guarderias/limites-deduccion.html`,
  },
  {
    id: 'estado-descendiente-discapacidad',
    advance: ADVANCE_FAMILY,
    group: 'family',
    title: 'Por hijo con discapacidad a cargo',
    summary:
      'Hasta 1.200 euros al año por cada descendiente con discapacidad que te da derecho al mínimo por descendientes (100 euros por mes). Es abonable: se cobra aunque no haya cuota.',
    kind: 'fixed',
    amount: 1200,
    unit: 'descendiente con discapacidad',
    limit: 1200,
    requirements:
      'Discapacidad de al menos el 33 %. Tú debes estar de alta en la Seguridad Social o cobrar paro o una pensión (no cuenta la dependencia ni un plan de pensiones). Si trabajas, tope: lo cotizado a la Seguridad Social. Se reparte entre quienes tengan derecho.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-ascendiente-discapacidad',
    advance: ADVANCE_FAMILY,
    group: 'family',
    title: 'Por padre o madre con discapacidad a cargo',
    summary:
      'Hasta 1.200 euros al año por cada ascendiente con discapacidad que te da derecho al mínimo por ascendientes (100 euros por mes). Es abonable: se cobra aunque no haya cuota.',
    kind: 'fixed',
    amount: 1200,
    unit: 'ascendiente con discapacidad',
    limit: 1200,
    requirements:
      'Discapacidad de al menos el 33 %, convivencia contigo la mitad del año y rentas del ascendiente de 8.000 euros o menos. Tú debes estar de alta en la Seguridad Social o cobrar paro o pensión. Si trabajas, tope: lo cotizado a la Seguridad Social.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-conyuge-discapacidad',
    advance: ADVANCE_FAMILY,
    group: 'family',
    title: 'Por cónyuge con discapacidad a cargo',
    summary:
      'Hasta 1.200 euros al año por tu cónyuge no separado legalmente con discapacidad (100 euros por mes). Es abonable: se cobra aunque no haya cuota.',
    kind: 'fixed',
    amount: 1200,
    unit: 'cónyuge con discapacidad',
    limit: 1200,
    requirements:
      'Discapacidad de al menos el 33 %. Que no gane más de 8.000 euros al año (sin rentas exentas) y que no te dé ya derecho a la deducción por hijo o padre con discapacidad. Tú debes estar de alta en la Seguridad Social o cobrar paro o pensión.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-familia-numerosa',
    advance: ADVANCE_FAMILY,
    group: 'family',
    title: 'Por familia numerosa de categoría general',
    summary:
      'Hasta 1.200 euros al año si eres ascendiente (o hermano huérfano) de una familia numerosa general. Suma el incremento por hijo de más (entrada aparte). Es abonable: se cobra aunque no haya cuota.',
    kind: 'fixed',
    amount: 1200,
    unit: 'familia numerosa general',
    limit: 1200,
    requirements:
      'Cumplir los requisitos de la Ley 40/2003 (título o prueba equivalente). Debes estar de alta en la Seguridad Social o cobrar paro o pensión. Si trabajas, tope: lo cotizado. Si lo piden los dos padres, se reparte. Incompatible con la de ascendiente separado con dos hijos.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-familia-numerosa-especial',
    advance: ADVANCE_FAMILY,
    group: 'family',
    title: 'Por familia numerosa de categoría especial',
    summary:
      'Hasta 2.400 euros al año (el doble que la general) si eres ascendiente de una familia numerosa especial. No se suma a la general: elige una. Es abonable. El incremento por hijo de más va aparte.',
    kind: 'fixed',
    amount: 2400,
    unit: 'familia numerosa especial',
    limit: 2400,
    requirements:
      'Título (o prueba) de familia numerosa especial. Alta en la Seguridad Social o cobro de paro o pensión. El tope por cotizaciones solo cuenta para los primeros 1.200 euros; el otro 100 % no lo tiene. Se reparte entre quienes la piden.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-familia-numerosa-hijo-adicional',
    advance: ADVANCE_FAMILY,
    group: 'family',
    title: 'Incremento de familia numerosa por cada hijo de más',
    summary:
      'Hasta 600 euros al año por cada hijo que supere el número mínimo de hijos exigido para tu categoría de familia numerosa (general o especial). Se suma a la deducción general o a la especial.',
    kind: 'fixed',
    amount: 600,
    unit: 'hijo por encima del mínimo de la categoría',
    limit: 600,
    requirements:
      'Solo si aplicas la deducción por familia numerosa. No cuenta para el tope de cotizaciones a la Seguridad Social. El número de hijos se mira el último día de cada mes. Se reparte por meses y entre quienes la apliquen.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-ascendiente-separado-dos-hijos',
    advance: ADVANCE_FAMILY,
    group: 'family',
    title: 'Por separado o sin matrimonio con dos hijos',
    summary:
      'Hasta 1.200 euros al año si eres madre o padre separado legalmente, o sin vínculo matrimonial, con dos hijos y sin derecho a cobrar alimentos. Es abonable: se cobra aunque no haya cuota.',
    kind: 'fixed',
    amount: 1200,
    unit: 'contribuyente',
    limit: 1200,
    requirements:
      'Derecho a todo el mínimo por descendientes de los dos hijos (custodia exclusiva, sin convivir con el otro progenitor). Alta en la Seguridad Social o cobro de paro o pensión. Incompatible con la de familia numerosa. Si trabajas, tope: lo cotizado.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-unidades-familiares-ue',
    group: 'family',
    title: 'Familia con algún miembro residente en la UE o el EEE',
    summary:
      'Iguala tu cuota a la que pagarías si toda la familia fuera residente en España y declarara en conjunto, cuando un miembro vive en otro país de la UE o del EEE y no puede declarar con vosotros.',
    kind: 'special',
    requirements:
      'Unidad familiar de la Ley (cónyuges, o padre o madre con hijos) con algún miembro residente en la UE o el EEE con intercambio de información. No vale con régimen de desplazados. Se calcula comparando cuotas; conviene usar el programa de la AEAT.',
    url: `${C16}/deduccion-aplicable-unidades-familiares-formadas/delimitacion-condiciones-aplicacion.html`,
  },

  // ---------------------------------------------------------------- Donativos
  {
    id: 'estado-donativos-ley-49-2002',
    group: 'donations',
    title: 'Donativos a ONG y entidades acogidas al mecenazgo',
    summary:
      'Recuperas el 80 % de los primeros 250 euros donados y el 40 % del resto. Ese 40 % pasa a 45 % si donas a la misma entidad 3 años seguidos por importes iguales o mayores.',
    kind: 'special',
    percent: 80,
    baseLimit: 250,
    requirements:
      'La entidad debe estar acogida a la Ley 49/2002 y debes tener justificante o certificado. Lo donado no puede pasar del 10 % de tu base liquidable. Los 250 euros se cuentan sobre el conjunto de donativos del año.',
    url: `${DONATIVOS}/donativos-realizados-entidades-incluidas/general-donativos-donaciones-entidades-beneficiarias-mecenazgo/porcentajes-deduccion.html`,
  },
  {
    id: 'estado-donativos-actividades-prioritarias',
    group: 'donations',
    title: 'Donativos a actividades prioritarias de mecenazgo',
    summary:
      'Cinco puntos más que los donativos normales: 85 % de los primeros 250 euros, 45 % del resto y 50 % del resto si repites con la misma entidad 3 años seguidos.',
    kind: 'special',
    percent: 85,
    baseLimit: 250,
    requirements:
      'El dinero debe ir a programas declarados prioritarios de mecenazgo (en 2025 siguen los de 2023 por prórroga presupuestaria). Lo donado no puede pasar del 15 % de tu base liquidable. Necesitas certificado de la entidad.',
    url: `${DONATIVOS}/donativos-realizados-entidades-incluidas/donativos-actividades-prioritarias-mecenazgo/porcentajes-aplicable.html`,
  },
  {
    id: 'estado-donativos-otras-entidades',
    group: 'donations',
    title: 'Donativos a fundaciones y asociaciones no acogidas al mecenazgo',
    summary:
      'Recuperas el 10 % de lo donado a fundaciones que rinden cuentas al protectorado y a asociaciones declaradas de utilidad pública que no están en la Ley 49/2002.',
    kind: 'percent',
    percent: 10,
    requirements:
      'Entidades fuera de la Ley 49/2002. Necesitas justificante del donativo. Lo donado, sumado al resto de donativos, no puede pasar del 10 % de tu base liquidable.',
    url: `${DONATIVOS}/donativos-realizados-entidades-no-incluidas.html`,
  },
  {
    id: 'estado-partidos-politicos',
    group: 'donations',
    title: 'Cuotas y aportaciones a partidos políticos',
    summary:
      'Recuperas el 20 % de las cuotas de afiliación y aportaciones a partidos, federaciones, coaliciones o agrupaciones de electores, sobre un máximo de 600 euros al año (hasta 120 euros).',
    kind: 'percent',
    percent: 20,
    baseLimit: 600,
    limit: 120,
    requirements:
      'Aportaciones dentro de lo que permite la ley de financiación de partidos  y con justificante. Cuenta dentro del tope del 10 % de la base liquidable. Los sindicatos no tienen esta deducción.',
    url: `${DONATIVOS}/aportaciones-partidos-politicos.html`,
  },

  // ---------------------------------------------------------------- Otras
  {
    id: 'estado-empresas-nueva-creacion',
    group: 'other',
    title: 'Inversión en empresas de nueva o reciente creación',
    summary:
      'Recuperas el 50 % de lo que inviertas en acciones o participaciones de una empresa nueva, con una base máxima de 100.000 euros al año (hasta 50.000 euros). Solo reduce la parte estatal.',
    kind: 'percent',
    percent: 50,
    baseLimit: 100000,
    limit: 50000,
    requirements:
      'SA o SL no cotizada, con menos de 5 años (7 si es emergente) y menos de 400.000 euros de fondos propios. Mantienes las acciones más de 3 y menos de 12 años. Tu patrimonio debe crecer al menos lo invertido. Lo que pase de 100.000 no se arrastra.',
    url: `${C16}/deduccion-inversion-empresas-nueva-reciente-creacion/objeto-base-maxima-porcentaje-deduccion.html`,
  },
  {
    id: 'estado-patrimonio-historico',
    group: 'other',
    title: 'Protección del patrimonio histórico y Patrimonio Mundial',
    summary:
      'Recuperas el 15 % de lo que inviertas en conservar bienes de interés cultural o rehabilitar edificios en conjuntos históricos o de Patrimonio Mundial. Sin tope en euros, solo el de la base.',
    kind: 'percent',
    percent: 15,
    requirements:
      'Bienes de tu propiedad declarados de interés cultural o edificios en entornos protegidos. La base no puede pasar del 10 % de tu base liquidable. Guarda las facturas y cumple los deberes de visita y exposición.',
    url: `${C16}/deduccion-actuaciones-proteccion-difusion-patrimonio.html`,
  },

  // ---------------------------------------------------------------- Vivienda
  {
    id: 'estado-vivienda-habitual-transitorio',
    group: 'housing',
    title: 'Vivienda habitual comprada antes de 2013 (régimen transitorio)',
    summary:
      'Parte estatal: 7,5 % de lo que pagues al año por tu vivienda (capital, intereses y gastos), con una base máxima de 9.040 euros. Sale hasta 678 euros. Tu comunidad añade su propia parte.',
    kind: 'percent',
    percent: 7.5,
    baseLimit: 9040,
    limit: 678,
    requirements:
      'Solo si compraste (o empezaste a pagar) antes del 1-1-2013 y ya te deducías por ella. No se puede empezar hoy. Tu patrimonio debe subir al menos lo invertido y debes presentar declaración. El exceso sobre 9.040 no se traslada.',
    url: `${VIVIENDA}/regimen-transitorio.html`,
  },
  {
    id: 'estado-vivienda-adecuacion-discapacidad',
    group: 'housing',
    title: 'Obras de adaptación de la vivienda por discapacidad (antes de 2013)',
    summary:
      'Parte estatal: 10 % de lo pagado por obras de adaptación por discapacidad, con una base máxima de 12.080 euros al año (hasta 1.208 euros). Límite aparte del de 9.040 euros de la vivienda.',
    kind: 'percent',
    percent: 10,
    baseLimit: 12080,
    limit: 1208,
    requirements:
      'Solo si pagaste obras antes del 1-1-2013 y terminaron antes del 1-1-2017. Discapacidad (33 % o más) tuya, de tu cónyuge o de un pariente que convive contigo, con certificado del IMSERSO o la comunidad. Tu comunidad añade su parte.',
    url: `${VIVIENDA}/modalidades-deduccion/obras-instalaciones-adecuacion-vivienda.html`,
  },
  {
    id: 'estado-alquiler-transitorio',
    group: 'housing',
    title: 'Alquiler de vivienda habitual con contrato anterior a 2015',
    summary:
      'Recuperas el 10,05 % del alquiler pagado, con una base máxima de 9.040 euros al año (hasta 908,52 euros). Con base imponible de 17.707,20 a 24.107,20 euros la base máxima baja hasta cero.',
    kind: 'percent',
    percent: 10.05,
    baseLimit: 9040,
    limit: 908.52,
    incomeLimit: {
      individual: 24107.2,
      joint: 24107.2,
      phaseOutFrom: 17707.2,
      phaseOutTo: 24107.2,
      note: 'Base imponible (general + ahorro). Hasta 17.707,20 euros la base máxima es 9.040. Entre 17.707,20 y 24.107,20 es 9.040 - 1,4125 x (base imponible - 17.707,20). Con 24.107,20 o más, no hay deducción. Se rebaja la base máxima, no el porcentaje.',
    },
    requirements:
      'Contrato firmado antes del 1-1-2015 que sigue vigente (o su continuación) y con derecho a la deducción antes de esa fecha. Cuenta la base imponible total, individual o conjunta. Se incluyen IBI y comunidad si te los repercuten.',
    url: `${C16}/deduccion-alquiler-vivienda-habitual-regimen-transitorio.html`,
  },
  {
    id: 'estado-eficiencia-calefaccion-refrigeracion',
    group: 'housing',
    title: 'Obras que reducen la calefacción y la refrigeración',
    summary:
      'Recuperas el 20 % de lo pagado en obras que bajen al menos un 7 % la demanda de calefacción y refrigeración de la vivienda, con base máxima de 5.000 euros (hasta 1.000 euros).',
    kind: 'percent',
    percent: 20,
    baseLimit: 5000,
    limit: 1000,
    requirements:
      'Obras pagadas del 6-10-2021 al 31-12-2025, con certificado energético posterior emitido en 2025 (se deduce en el año del certificado, con todo lo pagado desde 2021). Vivienda habitual o alquilada. Se restan subvenciones. Hace falta cuota estatal: no se arrastra.',
    url: `${EFICIENCIA}/cuadro-resumen-deducciones-obras-eficiencia-viviendas.html`,
  },
  {
    id: 'estado-eficiencia-energia-primaria',
    group: 'housing',
    title: 'Obras que reducen el consumo de energía no renovable',
    summary:
      'Recuperas el 40 % de lo pagado en obras que reduzcan al menos un 30 % el consumo de energía no renovable o logren la letra A o B, con base máxima de 7.500 euros (hasta 3.000 euros).',
    kind: 'percent',
    percent: 40,
    baseLimit: 7500,
    limit: 3000,
    requirements:
      'Obras pagadas del 6-10-2021 al 31-12-2025, con certificado energético posterior emitido en 2025. Vivienda habitual o alquilada (o a alquilar antes de 2028). Se restan subvenciones y no cuentan calderas de combustible fósil. Hace falta cuota estatal.',
    url: `${EFICIENCIA}/cuadro-resumen-deducciones-obras-eficiencia-viviendas.html`,
  },
  {
    id: 'estado-eficiencia-rehabilitacion-edificios',
    group: 'housing',
    title: 'Rehabilitación energética de edificios residenciales',
    summary:
      'Recuperas el 60 % de lo pagado (también por tu comunidad de vecinos) en rehabilitar energéticamente el edificio: base de 5.000 euros al año (hasta 3.000 euros) y 15.000 euros en total.',
    kind: 'percent',
    percent: 60,
    baseLimit: 5000,
    limit: 3000,
    requirements:
      'Obras pagadas del 6-10-2021 al 31-12-2025 con certificado que mejore un 30 % o dé letra A o B. Lo no deducido por pasar de 5.000 euros se aplaza hasta 4 años, con 15.000 euros de base en total. Se resta lo subvencionado.',
    url: `${EFICIENCIA}/cuadro-resumen-deducciones-obras-eficiencia-viviendas.html`,
  },
  {
    id: 'estado-vehiculo-electrico',
    group: 'other',
    title: 'Compra de un vehículo eléctrico enchufable o de pila de combustible',
    summary:
      'Recuperas el 15 % del valor de un vehículo eléctrico nuevo, con una base máxima de 20.000 euros (hasta 3.000 euros). Solo reduce la parte estatal y necesita cuota.',
    kind: 'percent',
    percent: 15,
    baseLimit: 20000,
    limit: 3000,
    requirements:
      'Un solo vehículo nuevo, sin uso profesional, comprado entre el 30-6-2023 y el 31-12-2025 (o con un primer pago de al menos el 25 %), matriculado a tu nombre y dentro de los precios máximos MOVES III. Se descuentan las ayudas.',
    url: `${VEHICULOS}/cuadro-resumen-deducciones-adquisicion-vehiculos-recarga.html`,
  },
  {
    id: 'estado-punto-recarga',
    group: 'other',
    title: 'Instalación de un punto de recarga de coche eléctrico',
    summary:
      'Recuperas el 15 % de lo que pagues por instalar un punto de recarga, con una base máxima de 4.000 euros (hasta 600 euros). Solo reduce la parte estatal y necesita cuota.',
    kind: 'percent',
    percent: 15,
    baseLimit: 4000,
    limit: 600,
    requirements:
      'Instalación en un inmueble tuyo, sin uso profesional, terminada antes del 31-12-2025 y pagada sin dinero en efectivo. Se aplica el año en que acaba la instalación, con lo pagado desde 30-6-2023. Se descuentan las ayudas.',
    url: `${VEHICULOS}/cuadro-resumen-deducciones-adquisicion-vehiculos-recarga.html`,
  },
  {
    id: 'estado-ceuta-melilla',
    group: 'other',
    title: 'Rentas obtenidas en Ceuta o Melilla',
    summary:
      'Descuentas el 60 % de la cuota (estatal más autonómica) que corresponda a las rentas obtenidas en Ceuta o Melilla. Con 3 o más años de residencia también vale para rentas de fuera, con límite.',
    kind: 'special',
    percent: 60,
    requirements:
      'Residentes: residencia habitual y efectiva. Para rentas de fuera, 3 años de residencia y un tercio del patrimonio allí. No residentes: no vale el trabajo, ni cuentas bancarias, ni fondos de inversión (salvo todo invertido allí), ni bienes muebles.',
    url: `${C16}/deduccion-rentas-obtenidas-ceuta-melilla/modalidades.html`,
  },
  {
    id: 'estado-la-palma',
    group: 'other',
    title: 'Residentes en la isla de La Palma',
    summary:
      'Descuentas el 60 % de la cuota (estatal más autonómica) que corresponda a las rentas obtenidas en La Palma. Prorrogada para 2025 por el Real Decreto-ley 13/2025.',
    kind: 'special',
    percent: 60,
    requirements:
      'Solo con residencia habitual y efectiva en La Palma. Con 3 o más años de residencia y un tercio del patrimonio en la isla, también se aplica a rentas de fuera, hasta el neto de lo obtenido allí. No vale para no residentes.',
    url: `${C16}/deduccion-rentas-obtenidas-isla-palma/ambito-subjetivo-modalidades.html`,
  },
  {
    id: 'estado-doble-imposicion-internacional',
    group: 'other',
    title: 'Doble imposición internacional (impuesto pagado fuera)',
    summary:
      'Deduces el menor de estos importes: lo pagado fuera por un impuesto parecido al IRPF, o el tipo medio de gravamen por la parte de tu base liquidable obtenida y gravada en el extranjero.',
    kind: 'special',
    requirements:
      'Rentas obtenidas y gravadas en el extranjero. El tipo medio es cuota líquida total entre base liquidable, con dos decimales y separando renta general y del ahorro. No es abonable.',
    url: `${C18}/deducciones-cuota-liquida-total/deduccion-doble-imposicion-internacional.html`,
  },
  {
    id: 'estado-actividades-economicas',
    group: 'other',
    title: 'Incentivos a la inversión en actividades económicas',
    summary:
      'Autónomos en estimación directa pueden aplicar las deducciones del Impuesto de Sociedades (I+D+i, cine, etc.) con los mismos porcentajes y límites. En estimación objetiva (módulos) no hay ninguna en 2025.',
    kind: 'special',
    requirements:
      'Solo estimación directa (normal o simplificada) y según cada incentivo. Excepciones: sin descuento del 20 % ni abono para I+D+i y cine extranjero. Las empresas de reducida dimensión añaden la deducción por inversión en inmovilizado nuevo.',
    url: `${C16}/deducciones-incentivos-estimulos-estimacion-directa.html`,
  },
];

export const rentaState: RentaState = {
  year: 2025,
  scale,
  defaultRegionalScale,
  minimums: {
    personal: 5550,
    over65: 1150,
    over75: 1400,
    descendants: [2400, 2700, 4000, 4500],
    under3: 2800,
    ascendants: 1150,
    ascendantsOver75: 1400,
    disability33: 3000,
    disability65: 9000,
    assistance: 3000,
  },
  workExpenses: { general: 2000, disability33: 3500, disability65: 7750 },
  workReduction: {
    maxReduction: 7302,
    fullUntil: 14852,
    zeroFrom: 19747.5,
    notes:
      'Se aplica al rendimiento neto del trabajo (tras restar los gastos de las letras a a e del art. 19.2, no los 2.000 euros). Hasta 14.852 euros: 7.302. De 14.852 a 17.673,52: 7.302 - 1,75 x (rendimiento - 14.852). De 17.673,52 a 19.747,5: 2.364,34 - 1,14 x (rendimiento - 17.673,52). Desde 19.747,5: nada. Solo si las otras rentas (sin exentas) no pasan de 6.500 euros. El saldo no puede quedar negativo.',
  },
  baseReductions: {
    pensionPlanLimit: 1500,
    pensionPlanEmployerLimit: 8500,
    notes:
      'Límite conjunto por planes de pensiones, mutualidades, planes de previsión asegurados, planes de previsión social empresarial y seguros de dependencia: 1.500 euros, más hasta 8.500 si el aumento viene de contribuciones de la empresa o de aportaciones tuyas al mismo plan dentro de la tabla del art. 52. Los autónomos pueden sumar 4.250 por aportaciones propias, y entre ambos aumentos el tope es 8.500 (10.000 en total). Aparte, 5.000 por primas pagadas por la empresa a seguros colectivos de dependencia. Además no puede pasar del 30 % de los rendimientos netos del trabajo y de actividades (criterio del manual de la AEAT) ni dejar la base general negativa. Lo que sobre se puede reducir en los 5 años siguientes.',
  },
  deductions,
  source: 'https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/100.html',
};
