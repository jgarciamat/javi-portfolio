import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-principado-asturias';

export const asturias: RentaCcaa = {
  id: 'asturias',
  name: 'Principado de Asturias',
  regime: 'common',
  scale: [
    { from: 0, rate: 9 },
    { from: 12450, rate: 12 },
    { from: 17707.2, rate: 14 },
    { from: 33007.2, rate: 19.2 },
    { from: 53407.2, rate: 21.5 },
    { from: 70000, rate: 22.5 },
    { from: 90000, rate: 25 },
    { from: 175000, rate: 26 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-autonoma-principado-asturias.html',
  minimums: {
    personal: 6105,
    descendants: [2640, 2970, 4400, 4950],
    under3: 3080,
    ascendants: 1265,
    ascendantsOver75: 1540,
    over65: 1265,
    over75: 1540,
    disability33: 3300,
    disability65: 9900,
    assistance: 3300,
  },
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/principado-asturias.html',
  deductions: [
    {
      id: 'asturias-acogimiento-mayores-65',
      group: 'family',
      title: 'Por acoger sin remuneración a mayores de 65 años',
      summary:
        '500 euros por cada persona mayor de 65 años que conviva contigo más de 183 días al año en acogimiento sin contraprestación.',
      kind: 'fixed',
      amount: 500,
      unit: 'persona acogida',
      requirements:
        'Sin ayudas del Principado por el acogimiento, sin parentesco hasta el 3.er grado y con documento de la Consejería de servicios sociales. Bases imponibles de hasta 26.000 euros (individual) o 37.000 (conjunta).',
      url: `${BASE}/acogimiento-no-remunerado-mayores-65-anos.html`,
    },
    {
      id: 'asturias-adopcion-internacional',
      group: 'family',
      title: 'Por adopción internacional de menores',
      summary:
        '1.500 euros por cada hijo adoptado en el extranjero en el año, siempre que el menor conviva contigo.',
      kind: 'fixed',
      amount: 1500,
      unit: 'hijo adoptado',
      requirements:
        'Adopción internacional según la Ley 54/2007; cuenta el año de inscripción en el Registro Civil. Si hay varios contribuyentes con declaración individual, se reparte a partes iguales.',
      url: `${BASE}/adopcion-internacional-menores.html`,
    },
    {
      id: 'asturias-partos-multiples',
      group: 'family',
      title: 'Por partos múltiples o adopciones múltiples',
      summary:
        '1.000 euros por cada hijo nacido o adoptado en el año en partos múltiples o dos o más adopciones constituidas en la misma fecha.',
      kind: 'fixed',
      amount: 1000,
      unit: 'hijo',
      requirements:
        'El menor debe convivir contigo a fin de año. Si hay matrimonio o pareja con declaraciones individuales, se prorratea por partes iguales.',
      url: `${BASE}/partos-multiples-dos-adopciones-constituidas-fecha.html`,
    },
    {
      id: 'asturias-familia-numerosa',
      group: 'family',
      title: 'Para familias numerosas',
      summary:
        '1.000 euros si la familia numerosa es de categoría general y 2.000 si es especial. Se equipara a general la de uno o dos ascendientes con dos hijos.',
      kind: 'fixed',
      amount: 1000,
      unit: 'familia (2.000 en categoría especial)',
      requirements:
        'Título de familia numerosa y convivencia a fin de año. Para la familia equiparada (ascendientes con dos hijos), base de hasta 35.000 euros (individual) o 45.000 (conjunta). Se prorratea entre contribuyentes con derecho.',
      url: `${BASE}/familias-numerosas.html`,
    },
    {
      id: 'asturias-familia-monoparental',
      group: 'family',
      title: 'Para familias monoparentales',
      summary:
        '500 euros si tienes hijos a tu cargo y no convives con ninguna otra persona (salvo ascendientes que den derecho al mínimo).',
      kind: 'fixed',
      amount: 500,
      unit: 'contribuyente',
      requirements:
        'Hijos menores o mayores con discapacidad que convivan contigo y ganen menos de 8.000 euros al año. Base (más alimentos exentos) de hasta 45.000 euros. No aplica en custodia compartida. Se exigen 183 días de convivencia.',
      url: `${BASE}/familias-monoparentales.html`,
    },
    {
      id: 'asturias-acogimiento-familiar-menores',
      group: 'family',
      title: 'Por acogimiento familiar de menores',
      summary:
        '500 euros por cada menor en acogimiento familiar si convives con él 183 días en el año; 250 euros si la convivencia es de entre 90 y 183 días.',
      kind: 'fixed',
      amount: 500,
      unit: 'menor acogido',
      requirements:
        'Acogimiento de urgencia, temporal o permanente (no preadoptivo). Con varios contribuyentes en declaración individual, se reparte a partes iguales.',
      url: `${BASE}/acogimiento-familiar-menores.html`,
    },
    {
      id: 'asturias-gastos-centros-0-3',
      group: 'family',
      title: 'Por gastos en centros de 0 a 3 años',
      summary:
        'El 15 % de lo pagado en guarderías y centros de 0 a 3 años, hasta 500 euros por hijo. En concejos en riesgo de despoblamiento, el 30 % y hasta 1.000 euros.',
      kind: 'percent',
      percent: 15,
      limit: 500,
      requirements:
        'Bases imponibles de hasta 26.000 euros (individual) o 37.000 (conjunta). Se resta lo cobrado en ayudas del Principado para conciliación. Incompatible, por contribuyente y mismo hijo, con la de cuidado de descendientes hasta 25 años.',
      url: `${BASE}/gastos-descendientes-centros-cero-tres-anos.html`,
    },
    {
      id: 'asturias-nacimiento-segundo-hijo-despoblamiento',
      group: 'family',
      title: 'Por segundo hijo y siguientes en concejos en riesgo demográfico',
      summary:
        '300 euros por cada segundo hijo o posterior nacido o adoptado en el año si resides en un concejo en riesgo de despoblamiento o en crisis demográfica.',
      kind: 'fixed',
      amount: 300,
      unit: 'hijo',
      requirements:
        'El menor debe convivir contigo a fin de año y debes vivir en uno de esos concejos (Decreto 83/2025). Se prorratea entre quienes tengan derecho; hay un tope de base imponible (35.000 euros según la AEAT) que no pude verificar del todo.',
      url: `${BASE}/nacimiento-adopcion-segundo-sucesivos-hijos-demografica.html`,
    },
    {
      id: 'asturias-cuidado-descendientes-25',
      group: 'family',
      title: 'Por cuidado de hijos y descendientes hasta 25 años',
      summary:
        '600 euros por cada descendiente de hasta 25 años que te dé derecho al mínimo por descendientes (hasta que cumpla 26, de forma proporcional).',
      kind: 'fixed',
      amount: 600,
      unit: 'descendiente',
      requirements:
        'Bases imponibles de hasta 35.000 euros (individual) o 45.000 (conjunta). Convivencia con el descendiente a fin de año. Incompatible con la de gastos en centros de 0 a 3 años para el mismo hijo.',
      url: `${BASE}/cuidado-descendientes-adoptados-hasta-25-edad.html`,
    },
    {
      id: 'asturias-ayudas-ela',
      group: 'family',
      title: 'Por ayudas del Principado a enfermos de ELA',
      summary:
        'Si has declarado una ayuda o subvención del Principado a enfermos de Esclerosis Lateral Amiotrófica, deduces el resultado de aplicarle tu tipo medio de gravamen.',
      kind: 'special',
      requirements:
        'Haber integrado en la base imponible general una ayuda o subvención pública del Principado de Asturias concedida a enfermos de ELA.',
      url: `${BASE}/obtencion-ayudas-subvenciones-otorgadas-enfermos.html`,
    },
    {
      id: 'asturias-hijos-fallecimiento-accidente-laboral',
      group: 'family',
      title: 'Por hijos tras la muerte de un progenitor en accidente laboral',
      summary:
        '1.000 euros al año por cada descendiente que te dé derecho al mínimo por descendientes, si el otro progenitor murió en un accidente laboral.',
      kind: 'fixed',
      amount: 1000,
      unit: 'descendiente',
      requirements:
        'Solo cuentan los descendientes comunes con el progenitor fallecido. Vale para casados, parejas de hecho y otras situaciones. Dura mientras el descendiente dé derecho al mínimo por descendientes.',
      url: `${BASE}/descendientes-caso-fallecimiento-progenitor-consecuencia-laborales.html`,
    },
    {
      id: 'asturias-enfermedad-celiaca',
      group: 'family',
      title: 'Por gastos de enfermedad celíaca',
      summary:
        '100 euros por cada persona de tu núcleo familiar con enfermedad celíaca diagnosticada, por los gastos asociados.',
      kind: 'fixed',
      amount: 100,
      unit: 'persona con celiaquía',
      requirements:
        'Pagar tú los gastos y acreditar el diagnóstico con informe médico oficial. Bases imponibles de hasta 35.000 euros (individual) o 45.000 (conjunta). Si hay varios con derecho, se reparte por igual.',
      url: `${BASE}/gastos-derivados-enfermedad-celiaca-diagnosticada.html`,
    },
    {
      id: 'asturias-vivienda-discapacidad',
      group: 'housing',
      title: 'Compra o adecuación de vivienda por discapacidad',
      summary:
        'El 3 % de lo pagado por comprar o adaptar tu vivienda habitual en Asturias si tú o tu familia tenéis una discapacidad del 65 % o más (base máxima 15.000 euros).',
      kind: 'percent',
      percent: 3,
      baseLimit: 15000,
      limit: 450,
      requirements:
        'Cónyuge, ascendientes o descendientes con discapacidad que convivan más de 183 días y ganen hasta 35.000 euros. La obra o compra debe ser necesaria para la accesibilidad, con certificado de la Consejería.',
      url: `${BASE}/adquisicion-adecuacion-vivienda-habitual-contribuyentes-discapacidad.html`,
    },
    {
      id: 'asturias-vivienda-protegida',
      group: 'housing',
      title: 'Por vivienda habitual protegida',
      summary:
        'El 100 % del gasto en comprar o rehabilitar una vivienda habitual protegida, con un máximo de 5.000 euros el año de la compra o rehabilitación y 1.000 euros en los siguientes.',
      kind: 'percent',
      percent: 100,
      limit: 5000,
      requirements:
        'Vivienda protegida según normativa estatal o autonómica. Con préstamo, se deduce según se amortiza. El importe no deducido por falta de cuota puede aplicarse en los tres años siguientes. Justificación con factura.',
      url: `${BASE}/inversion-vivienda-habitual-que-tenga-protegida.html`,
    },
    {
      id: 'asturias-alquiler-vivienda-habitual',
      group: 'housing',
      title: 'Por alquiler de la vivienda habitual',
      summary:
        'El 10 % del alquiler (máx. 500 euros); el 30 % (máx. 1.500) para jóvenes hasta 35 años, familias numerosas o monoparentales y víctimas de violencia de género, o residentes en concejos en riesgo.',
      kind: 'percent',
      percent: 10,
      limit: 500,
      requirements:
        'Bases imponibles de hasta 35.000 euros (individual) o 45.000 (conjunta). Lo aplica el titular del contrato. En concejos en riesgo de despoblamiento, 30 % con límite de 1.500 euros. Se prorratea entre titulares.',
      url: `${BASE}/arrendamiento-vivienda-habitual.html`,
    },
    {
      id: 'asturias-vivienda-colectivos-despoblamiento',
      group: 'housing',
      title: 'Compra o rehabilitación de vivienda en concejos en riesgo',
      summary:
        'El 5 % de lo pagado por comprar o rehabilitar tu vivienda habitual en un concejo en riesgo de despoblamiento; 10 % si tienes hasta 35 años o eres de familia numerosa o monoparental.',
      kind: 'percent',
      percent: 5,
      requirements:
        'La vivienda será tu residencia habitual y mantendrás domicilio fiscal en ese concejo al menos tres años. Concejos según el Decreto 83/2025. No pude verificar otros límites de base de la página.',
      url: `${BASE}/adqu-rehabilit-vivienda-habitual-determinados-colectivos.html`,
    },
    {
      id: 'asturias-gastos-arrendamiento-viviendas',
      group: 'housing',
      title: 'Gastos de propietarios que alquilan a precio asequible',
      summary:
        'Gastos de reparación, formalización de contratos, seguros de impago y certificado energético de viviendas que alquilas a precios con sostenibilidad social, hasta 500 euros al año.',
      kind: 'percent',
      percent: 100,
      limit: 500,
      requirements:
        'Obtener rendimientos del capital inmobiliario por alquilar vivienda habitual del inquilino, con renta que no supere el rango superior del índice estatal de referencia del alquiler. El límite es global, no por inmueble.',
      url: `${BASE}/gastos-derivados-arrendamiento-viviendas.html`,
    },
    {
      id: 'asturias-gestion-forestal-sostenible',
      group: 'other',
      title: 'Por certificación de gestión forestal sostenible',
      summary:
        'El 30 % de lo invertido en obtener la certificación de gestión forestal sostenible de tus montes, con un máximo de 1.000 euros.',
      kind: 'percent',
      percent: 30,
      limit: 1000,
      requirements:
        'Ser propietario de montes en Asturias y haber obtenido la certificación en el año. Se excluyen las subvenciones recibidas. Si el monte es de varios dueños, se reparte por igual.',
      url: `${BASE}/certificacion-gestion-forestal-sostenible.html`,
    },
    {
      id: 'asturias-libros-texto-material-escolar',
      group: 'family',
      title: 'Por libros de texto y material escolar',
      summary:
        'El 100 % de lo gastado en libros y material escolar de Primaria o ESO de tus hijos, con tope por hijo según tu renta (de 25 a 100 euros; 75 o 150 si eres familia numerosa).',
      kind: 'special',
      percent: 100,
      limit: 100,
      requirements:
        'Base de hasta 26.000 euros (individual) o 37.000 (conjunta). Tope por hijo: individual 50/37,5/25 euros; conjunta 100/75/50 euros según tramos de renta. Se descuentan becas y ayudas recibidas.',
      url: `${BASE}/adquisicion-libros-texto-material-escolar.html`,
    },
    {
      id: 'asturias-autonomos-despoblamiento',
      group: 'other',
      title: 'Para quien se hace autónomo en concejos en riesgo',
      summary:
        '1.000 euros por contribuyente que empiece actividad como autónomo y resida en un concejo en riesgo de despoblamiento o crisis demográfica.',
      kind: 'fixed',
      amount: 1000,
      unit: 'contribuyente',
      requirements:
        'Alta en el año y mantenida al menos un año; no haber cesado en la misma actividad los 6 meses previos. Bases de hasta 35.000 euros (individual) o 45.000 (conjunta). No valen autónomos colaboradores ni socios de sociedades de capital.',
      url: `${BASE}/contribuyentes-que-se-establezcan-autonomos-despoblamiento.html`,
    },
    {
      id: 'asturias-transporte-publico-despoblamiento',
      group: 'other',
      title: 'Por abonos de transporte público en concejos en riesgo',
      summary:
        'El 100 % del coste de abonos de transporte público nominales, hasta 100 euros por persona, más el 10 % por abonos de hijos que estudian fuera del concejo (máx. 300 euros por hijo).',
      kind: 'percent',
      percent: 100,
      limit: 100,
      requirements:
        'Residir en un concejo en riesgo de despoblamiento o crisis demográfica. Bases de hasta 35.000 euros (individual) o 45.000 (conjunta). El extra por hijo exige estudios de bachillerato, FP o universidad fuera del concejo.',
      url: `${BASE}/gastos-transporte-publico-residentes-concejos-despoblamiento.html`,
    },
    {
      id: 'asturias-formacion-id-cientifica',
      group: 'other',
      title: 'Gastos de formación de investigadores y técnicos',
      summary:
        'El 100 % de los gastos de formación de quien empieza un trabajo muy cualificado en I+D, científico o técnico, con un máximo de 2.000 euros, aplicable una sola vez.',
      kind: 'percent',
      percent: 100,
      limit: 2000,
      requirements:
        'No más de tres años desde que acabaste la formación, residir en Asturias al menos tres años y tener contrato de trabajo (o alta como autónomo un año). Puesto del Grupo de Cotización 1 de actividades de I+D.',
      url: `${BASE}/gastos-formacion-trabajos-id-cientificas-tecnicas.html`,
    },
    {
      id: 'asturias-traslado-domicilio-laboral',
      group: 'other',
      title: 'Por trasladar tu domicilio fiscal a Asturias por trabajo',
      summary:
        'El 15 % de los gastos del traslado a Asturias por motivos laborales, hasta 1.000 euros (2.000 en trabajos cualificados de I+D), el año del traslado y los tres siguientes.',
      kind: 'percent',
      percent: 15,
      limit: 1000,
      requirements:
        'No haber residido en Asturias los 4 años anteriores y mantener la residencia al menos 3 años más. Debe haber contrato de trabajo o alta como autónomo. Cuentan gastos de mudanza, escolarización y vivienda.',
      url: `${BASE}/contbuytes-trasladen-domlio-fiscal-motivos-laborales.html`,
    },
    {
      id: 'asturias-vehiculos-electricos',
      group: 'other',
      title: 'Por comprar un vehículo eléctrico',
      summary:
        'El 15 % de lo pagado por un vehículo eléctrico enchufable o de pila de combustible nuevo o de kilómetro cero, uno por contribuyente.',
      kind: 'percent',
      percent: 15,
      requirements:
        'Vehículo no afecto a una actividad económica, con contrato de compraventa a tu nombre y de las categorías del programa MOVES III. Prorrogada para 2024 y 2025. No pude verificar un límite de importe en la página.',
      url: `${BASE}/adquisicion-vehiculos-electricos.html`,
    },
    {
      id: 'asturias-emancipacion-jovenes',
      group: 'other',
      title: 'Por emancipación de jóvenes hasta 35 años',
      summary:
        'El 100 % de los gastos de emanciparte (mobiliario, mudanza, alquiler o compra), con un máximo de 1.000 euros por contribuyente.',
      kind: 'percent',
      percent: 100,
      limit: 1000,
      requirements:
        'Menor de 36 años, dejar de convivir con tus ascendientes y trasladarte a una vivienda habitual en Asturias. Se pierde si vuelves al hogar familiar antes de 3 años. Bases de hasta 35.000 euros (individual) o 45.000 (conjunta).',
      url: `${BASE}/emancipacion-jovenes-hasta-35-anos-edad.html`,
    },
    {
      id: 'asturias-gastos-vitales-jovenes',
      group: 'other',
      title: 'Gastos vitales de jóvenes hasta 35 años',
      summary:
        'Gastos de vivienda, suministros, educación, transporte, tecnología, deporte y cultura, con un máximo de 2.000 euros hasta 25 años, 1.500 de 26 a 30 y 1.000 de 31 a 35.',
      kind: 'percent',
      percent: 100,
      limit: 2000,
      requirements:
        'Tener hasta 35 años y una suma de bases imponibles general y del ahorro de hasta 28.000 euros. Cualquier gasto asociado a esas categorías vale, con factura. En conjunta, el límite se aplica a cada miembro que cumpla.',
      url: `${BASE}/gastos-vitales-que-incurran-contribuyentes-anos.html`,
    },
    {
      id: 'asturias-acciones-entidades-nuevas',
      group: 'other',
      title: 'Inversión en sociedades nuevas o de reciente creación',
      summary:
        'El 30 % de lo invertido en acciones o participaciones de microempresas y pymes asturianas nuevas, con un máximo de 6.000 euros al año.',
      kind: 'percent',
      percent: 30,
      limit: 6000,
      requirements:
        'No superar el 40 % del capital (con familiares) y mantener la participación 3 años. Sociedad con domicilio social y fiscal en Asturias, actividad económica y creación de empleo. En conjunta, el límite aplica a cada miembro que invierta.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones-sociales-creacion.html`,
    },
  ],
};
