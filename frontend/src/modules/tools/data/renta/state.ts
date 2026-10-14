import type { Deduction, RentaState, TaxBracket } from '../../domain/rentaData';

/** Manual práctico de Renta 2025 (AEAT): https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/100.html */
const MANUAL =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025';
const C16 = `${MANUAL}/c16-deducciones-generales-cuota`;
const C18 = `${MANUAL}/c18-cuota-liquida-resultante-autoliquidacion`;
const MATERNIDAD = `${C18}/resultado-declaracion/deduccion-maternidad-incremento-adicional-gastos-custodia`;
const FAMILIA = `${C18}/resultado-declaracion/deducciones-familia-numerosa-personas-discapacidad-cargo`;
const DONATIVOS = `${C16}/deducciones-donativos-otras-aportaciones`;
const EFICIENCIA = `${C16}/deducciones-obras-mejora-eficiencia-energetica-viviendas`;
const VEHICULOS = `${C16}/deducciones-adquisicion-vehiculos-electricos-puntos-recarga`;

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
  {
    id: 'estado-maternidad',
    group: 'family',
    title: 'Por maternidad (hijos menores de 3 años)',
    summary:
      'Hasta 1.200 euros al año por cada hijo menor de 3 años (100 euros por mes). Se puede cobrar por adelantado cada mes.',
    kind: 'fixed',
    amount: 1200,
    unit: 'hijo menor de 3 años',
    limit: 1200,
    requirements:
      'Para la madre con hijo menor de 3 años que da derecho al mínimo por descendientes, que cobre paro o esté de alta en la Seguridad Social (mínimo 30 días cotizados). No se aplica los meses en que se cobre el complemento de ayuda a la infancia.',
    url: `${MATERNIDAD}/deduccion-maternidad/cuantia-limite-deduccion.html`,
  },
  {
    id: 'estado-guarderia',
    group: 'family',
    title: 'Gastos de guardería (suma a la de maternidad)',
    summary:
      'Hasta 1.000 euros al año por hijo menor de 3 años (83,33 euros por mes) si pagas guardería o centro de educación infantil autorizado.',
    kind: 'special',
    amount: 1000,
    unit: 'hijo menor de 3 años',
    limit: 1000,
    requirements:
      'Tienes que tener derecho a la deducción por maternidad. No puede superar lo que realmente pagas, sin subvención, por ese hijo. Solo cuentan los meses pagados completos.',
    url: `${MATERNIDAD}/incremento-adicional-gastos-custodia-guarderias/limites-deduccion.html`,
  },
  {
    id: 'estado-descendiente-discapacidad',
    group: 'family',
    title: 'Por hijo con discapacidad a cargo',
    summary:
      'Hasta 1.200 euros al año por cada descendiente con discapacidad que te da derecho al mínimo por descendientes.',
    kind: 'fixed',
    amount: 1200,
    unit: 'descendiente con discapacidad',
    limit: 1200,
    requirements:
      'Discapacidad de al menos el 33 %. Tú debes trabajar (de alta en la Seguridad Social) o cobrar paro o una pensión pública. No valen las prestaciones de dependencia.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-ascendiente-discapacidad',
    group: 'family',
    title: 'Por padre o madre con discapacidad a cargo',
    summary:
      'Hasta 1.200 euros al año por cada ascendiente con discapacidad que te da derecho al mínimo por ascendientes.',
    kind: 'fixed',
    amount: 1200,
    unit: 'ascendiente con discapacidad',
    limit: 1200,
    requirements:
      'Discapacidad de al menos el 33 % y convivencia contigo. Tú debes trabajar (de alta en la Seguridad Social) o cobrar paro o una pensión pública.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-conyuge-discapacidad',
    group: 'family',
    title: 'Por cónyuge con discapacidad a cargo',
    summary: 'Hasta 1.200 euros al año por tu cónyuge no separado legalmente con discapacidad.',
    kind: 'fixed',
    amount: 1200,
    unit: 'cónyuge con discapacidad',
    limit: 1200,
    requirements:
      'Que no gane más de 8.000 euros al año (sin contar rentas exentas) y que no te dé ya derecho a la deducción por hijo o padre con discapacidad. Tú debes trabajar o cobrar paro o pensión.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-familia-numerosa',
    group: 'family',
    title: 'Por familia numerosa',
    summary:
      'Hasta 1.200 euros al año si eres padre, madre o hermano huérfano de una familia numerosa general, y hasta 2.400 si es especial. Suma 600 por cada hijo más del mínimo.',
    kind: 'special',
    amount: 1200,
    unit: 'familia numerosa',
    limit: 2400,
    requirements:
      'Tener título de familia numerosa (general o especial). Tú debes trabajar (de alta en la Seguridad Social) o cobrar paro o pensión. Se reparte entre quienes la apliquen.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-ascendiente-separado-dos-hijos',
    group: 'family',
    title: 'Por separado o sin matrimonio con dos hijos',
    summary:
      'Hasta 1.200 euros al año si eres madre o padre separado legalmente, o sin vínculo matrimonial, con dos hijos que no cobran pensión de alimentos.',
    kind: 'fixed',
    amount: 1200,
    unit: 'contribuyente',
    limit: 1200,
    requirements:
      'Tener derecho a todo el mínimo por descendientes de esos dos hijos y que no cobren anualidades por alimentos. Tú debes trabajar (de alta en la Seguridad Social) o cobrar paro o pensión.',
    url: `${FAMILIA}/cuantia-maxima-deducciones.html`,
  },
  {
    id: 'estado-donativos-ley-49-2002',
    group: 'donations',
    title: 'Donativos a ONG y entidades acogidas al mecenazgo',
    summary:
      'Recuperas el 80 % de los primeros 250 euros donados y el 40 % del resto. Sube al 45 % si donas a la misma entidad 3 años seguidos por importes iguales o mayores.',
    kind: 'special',
    percent: 80,
    baseLimit: 250,
    requirements:
      'La entidad debe estar acogida a la Ley 49/2002 y tienes que tener el certificado del donativo. Lo donado no puede pasar del 10 % de tu base liquidable.',
    url: `${DONATIVOS}/donativos-realizados-entidades-incluidas/general-donativos-donaciones-entidades-beneficiarias-mecenazgo/porcentajes-deduccion.html`,
  },
  {
    id: 'estado-donativos-actividades-prioritarias',
    group: 'donations',
    title: 'Donativos a actividades prioritarias de mecenazgo',
    summary:
      'Cinco puntos más que los donativos normales: 85 % de los primeros 250 euros, 45 % del resto y 50 % si repites con la misma entidad.',
    kind: 'special',
    percent: 85,
    baseLimit: 250,
    requirements:
      'El dinero debe ir a programas declarados prioritarios de mecenazgo. Lo donado no puede pasar del 15 % de tu base liquidable.',
    url: `${DONATIVOS}/donativos-realizados-entidades-incluidas/donativos-actividades-prioritarias-mecenazgo/porcentajes-aplicable.html`,
  },
  {
    id: 'estado-donativos-otras-entidades',
    group: 'donations',
    title: 'Donativos a fundaciones y asociaciones no acogidas al mecenazgo',
    summary:
      'Recuperas el 10 % de lo donado a fundaciones que rinden cuentas al protectorado y a asociaciones declaradas de utilidad pública.',
    kind: 'percent',
    percent: 10,
    requirements:
      'Las entidades no están dentro de la Ley 49/2002. Necesitas justificante del donativo. Lo donado no puede pasar del 10 % de tu base liquidable.',
    url: `${DONATIVOS}/donativos-realizados-entidades-no-incluidas.html`,
  },
  {
    id: 'estado-partidos-politicos',
    group: 'donations',
    title: 'Cuotas y aportaciones a partidos políticos',
    summary:
      'Recuperas el 20 % de las cuotas de afiliación y aportaciones a partidos, federaciones, coaliciones o agrupaciones de electores, hasta 600 euros al año.',
    kind: 'percent',
    percent: 20,
    baseLimit: 600,
    limit: 120,
    requirements:
      'Aportaciones dentro de lo que permite la ley de financiación de partidos y con justificante. Lo donado no puede pasar del 10 % de tu base liquidable. Los sindicatos no tienen esta deducción.',
    url: `${DONATIVOS}/aportaciones-partidos-politicos.html`,
  },
  {
    id: 'estado-empresas-nueva-creacion',
    group: 'other',
    title: 'Inversión en empresas de nueva o reciente creación',
    summary:
      'Recuperas el 50 % de lo que inviertas comprando acciones o participaciones de una empresa nueva, con un máximo de 100.000 euros de inversión al año.',
    kind: 'percent',
    percent: 50,
    baseLimit: 100000,
    limit: 50000,
    requirements:
      'Empresa no cotizada de menos de 5 años (7 si es emergente) y con menos de 400.000 euros de fondos propios. Mantienes las acciones entre 3 y 12 años. Solo reduce la parte estatal.',
    url: `${C16}/deduccion-inversion-empresas-nueva-reciente-creacion/objeto-base-maxima-porcentaje-deduccion.html`,
  },
  {
    id: 'estado-patrimonio-historico',
    group: 'other',
    title: 'Protección del patrimonio histórico y Patrimonio Mundial',
    summary:
      'Recuperas el 15 % de lo que inviertas en conservar bienes de interés cultural o rehabilitar edificios en conjuntos históricos o Patrimonio Mundial.',
    kind: 'percent',
    percent: 15,
    requirements:
      'Bienes de tu propiedad declarados de interés cultural o edificios en entornos protegidos. La base no puede pasar del 10 % de tu base liquidable. Guarda las facturas.',
    url: `${C16}/deduccion-actuaciones-proteccion-difusion-patrimonio.html`,
  },
  {
    id: 'estado-vivienda-habitual-transitorio',
    group: 'housing',
    title: 'Vivienda habitual comprada antes de 2013 (régimen transitorio)',
    summary:
      'Parte estatal: 7,5 % de lo que pagues al año por tu vivienda (hipoteca), con un máximo de 9.040 euros de base. Sale hasta 678 euros.',
    kind: 'percent',
    percent: 7.5,
    baseLimit: 9040,
    limit: 678,
    requirements:
      'Solo si compraste la vivienda antes del 1-1-2013 (o empezaste a pagarla antes) y ya te deducías por ella. Tu comunidad añade su propia parte. No se puede empezar a aplicar hoy en una vivienda nueva.',
    url: `${C16}/deduccion-inversion-vivienda-habitual-regimen-transitorio/regimen-transitorio.html`,
  },
  {
    id: 'estado-alquiler-transitorio',
    group: 'housing',
    title: 'Alquiler de vivienda habitual con contrato anterior a 2015',
    summary:
      'Recuperas el 10,05 % del alquiler pagado, con una base máxima de 9.040 euros al año (hasta unos 908 euros).',
    kind: 'percent',
    percent: 10.05,
    baseLimit: 9040,
    limit: 908.52,
    requirements:
      'Contrato firmado antes del 1-1-2015 y que te deducías ya. Tu base imponible debe ser menor de 24.107,20 euros; la base máxima baja a partir de 17.707,20 euros.',
    url: `${C16}/deduccion-alquiler-vivienda-habitual-regimen-transitorio.html`,
  },
  {
    id: 'estado-eficiencia-calefaccion-refrigeracion',
    group: 'housing',
    title: 'Obras que reducen la calefacción y la refrigeración',
    summary:
      'Recuperas el 20 % de lo pagado en obras que bajen al menos un 7 % la demanda de calefacción y refrigeración de la vivienda, con base máxima de 5.000 euros.',
    kind: 'percent',
    percent: 20,
    baseLimit: 5000,
    limit: 1000,
    requirements:
      'Obras hechas y pagadas entre el 6-10-2021 y el 31-12-2025, con certificado de eficiencia energética posterior a las obras emitido antes de 2026. Vivienda habitual o alquilada. Se restan las subvenciones.',
    url: `${EFICIENCIA}/cuadro-resumen-deducciones-obras-eficiencia-viviendas.html`,
  },
  {
    id: 'estado-eficiencia-energia-primaria',
    group: 'housing',
    title: 'Obras que reducen el consumo de energía no renovable',
    summary:
      'Recuperas el 40 % de lo pagado en obras que reduzcan al menos un 30 % el consumo de energía no renovable o logren la letra A o B, con base máxima de 7.500 euros.',
    kind: 'percent',
    percent: 40,
    baseLimit: 7500,
    limit: 3000,
    requirements:
      'Obras hechas y pagadas entre el 6-10-2021 y el 31-12-2025, con certificado energético posterior emitido antes de 2026. Vivienda habitual o alquilada. Se restan las subvenciones.',
    url: `${EFICIENCIA}/cuadro-resumen-deducciones-obras-eficiencia-viviendas.html`,
  },
  {
    id: 'estado-eficiencia-rehabilitacion-edificios',
    group: 'housing',
    title: 'Rehabilitación energética de edificios residenciales',
    summary:
      'Recuperas el 60 % de lo pagado (también a través de tu comunidad de vecinos) en obras de rehabilitación energética del edificio, con base de 5.000 euros al año y 15.000 en total.',
    kind: 'percent',
    percent: 60,
    baseLimit: 5000,
    limit: 3000,
    requirements:
      'Obras entre el 6-10-2021 y el 31-12-2025 con certificado energético que mejore un 30 % o dé letra A o B. Lo no deducido por pasar de 5.000 euros se aplaza hasta 4 años, con 15.000 euros en total.',
    url: `${EFICIENCIA}/cuadro-resumen-deducciones-obras-eficiencia-viviendas.html`,
  },
  {
    id: 'estado-vehiculo-electrico',
    group: 'other',
    title: 'Compra de un vehículo eléctrico enchufable o de pila de combustible',
    summary:
      'Recuperas el 15 % del valor de un vehículo eléctrico nuevo, con una base máxima de 20.000 euros (hasta 3.000 euros).',
    kind: 'percent',
    percent: 15,
    baseLimit: 20000,
    limit: 3000,
    requirements:
      'Un solo vehículo nuevo, sin uso profesional, comprado o con primer pago entre el 30-6-2023 y el 31-12-2025 y que cumpla los precios máximos del programa MOVES III. Se descuentan las ayudas recibidas.',
    url: `${VEHICULOS}/cuadro-resumen-deducciones-adquisicion-vehiculos-recarga.html`,
  },
  {
    id: 'estado-punto-recarga',
    group: 'other',
    title: 'Instalación de un punto de recarga de coche eléctrico',
    summary:
      'Recuperas el 15 % de lo que pagues por instalar un punto de recarga, con una base máxima de 4.000 euros (hasta 600 euros).',
    kind: 'percent',
    percent: 15,
    baseLimit: 4000,
    limit: 600,
    requirements:
      'Instalación en un inmueble tuyo, sin uso profesional, terminada antes del 31-12-2025 y pagada con medios que dejen rastro (no en efectivo). Se descuentan las ayudas recibidas.',
    url: `${VEHICULOS}/cuadro-resumen-deducciones-adquisicion-vehiculos-recarga.html`,
  },
  {
    id: 'estado-ceuta-melilla',
    group: 'other',
    title: 'Rentas obtenidas en Ceuta o Melilla',
    summary:
      'Descuentas el 60 % de la cuota que corresponda a las rentas obtenidas en Ceuta o Melilla. Los residentes con 3 o más años pueden aplicarla también a rentas de fuera.',
    kind: 'special',
    percent: 60,
    requirements:
      'Residentes: residencia habitual y efectiva en Ceuta o Melilla. Para rentas de fuera hace falta al menos un tercio del patrimonio allí. No residentes: se excluyen el trabajo y algunas rentas financieras.',
    url: `${C16}/deduccion-rentas-obtenidas-ceuta-melilla/modalidades.html`,
  },
  {
    id: 'estado-la-palma',
    group: 'other',
    title: 'Residentes en la isla de La Palma',
    summary:
      'Descuentas el 60 % de la cuota que corresponda a las rentas obtenidas en La Palma (prorrogada para 2025).',
    kind: 'special',
    percent: 60,
    requirements:
      'Residencia habitual y efectiva en La Palma. Con 3 o más años de residencia y un tercio del patrimonio en la isla, también se aplica a rentas de fuera. No vale para no residentes.',
    url: `${C16}/deduccion-rentas-obtenidas-isla-palma/ambito-subjetivo-modalidades.html`,
  },
  {
    id: 'estado-rendimientos-trabajo-bajos',
    group: 'other',
    title: 'Deducción por rendimientos del trabajo bajos (novedad 2025)',
    summary:
      'Hasta 340 euros de descuento en la cuota si cobras menos de 18.276 euros brutos del trabajo (340 euros hasta 16.576 euros, y baja después).',
    kind: 'special',
    amount: 340,
    unit: 'contribuyente',
    limit: 340,
    requirements:
      'Trabajo por cuenta ajena o funcionario con menos de 18.276 euros brutos y otras rentas de hasta 6.500 euros. Entre 16.576 y 18.276 euros: 340 menos 0,2 por lo que pases de 16.576.',
    url: `${C18}/deducciones-cuota-liquida-total/deduccion-obtencion-rendimientos-trabajo.html`,
  },
  {
    id: 'estado-actividades-economicas',
    group: 'other',
    title: 'Incentivos a la inversión en actividades económicas',
    summary:
      'Autónomos en estimación directa pueden aplicar las deducciones del Impuesto de Sociedades (I+D+i, cine, etc.) con los mismos porcentajes y límites.',
    kind: 'special',
    requirements:
      'Solo para autónomos en estimación directa (normal o simplificada) que cumplan los requisitos de cada incentivo. Conviene revisarlo con el manual o un asesor.',
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
      'Entre 14.852 y 17.673,52 euros de rendimiento neto la reducción es 7.302 - 1,75 x (rendimiento - 14.852); entre 17.673,52 y 19.747,5 euros es 2.364,34 - 1,14 x (rendimiento - 17.673,52). Solo si tus otras rentas no superan 6.500 euros.',
  },
  baseReductions: {
    pensionPlanLimit: 1500,
    pensionPlanEmployerLimit: 8500,
    notes:
      'Aportaciones a planes de pensiones y similares: 1.500 euros al año, más hasta 8.500 euros si vienen de contribuciones de la empresa (o iguales aportaciones tuyas al mismo plan), hasta 10.000 euros en total. Además, no puede pasar del 30 % de tus rendimientos netos del trabajo y de actividades. Los autónomos tienen un incremento propio de hasta 4.250 euros dentro del tope de 8.500.',
  },
  deductions,
  source: 'https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/100.html',
};
