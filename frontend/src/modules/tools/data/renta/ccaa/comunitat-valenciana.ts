import type { IncomeLimit, RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunitat-valenciana';

// Datos del ejercicio 2025 (Renta 2026). Fuentes: Ley 13/1997 (art. 4 y disposiciones adicionales), modificada por la
// Ley 5/2025 y, con efectos retroactivos desde el 1-1-2025, por el Decreto-ley 1/2026 (DOGV 10314, 3-3-2026), que
// sube los topes de renta de las deducciones de salud y de deporte a 60.000 € / 78.000 €. Cruzado con el Manual de la AEAT.
// Los importes son los del régimen "resto de contribuyentes" (Ley 5/2025), no el de fallecidos antes del 1-6-2025.

/** Tope habitual: no se puede aplicar por encima de 30.000 € (47.000 € conjunta); baja en línea recta desde 27.000 € (44.000 €). */
const LIMIT_30K: IncomeLimit = {
  individual: 30000,
  joint: 47000,
  phaseOutFrom: 27000,
  phaseOutTo: 30000,
  note: 'Importe completo por debajo de 27.000 € (44.000 € en conjunta); baja en línea recta hasta cero en 30.000 € (47.000 € en conjunta).',
};

/** Tope de salud, deporte y música: hasta 60.000 € (78.000 € conjunta); los límites bajan desde 54.000 € (72.000 €). */
const LIMIT_60K: IncomeLimit = {
  individual: 60000,
  joint: 78000,
  phaseOutFrom: 54000,
  phaseOutTo: 60000,
  note: 'Límites completos por debajo de 54.000 € (72.000 € en conjunta); entre 54.000 y 60.000 € (72.000 y 78.000 €) bajan en línea recta hasta cero. Subido por el Decreto-ley 1/2026, con efectos desde 2025.',
};

const HEALTH_PROOF =
  'Gasto tuyo, de tu cónyuge o de quien te da mínimo familiar. Factura con concepto, pago no en efectivo, centro sanitario registrado e informe médico. Sin seguros ni lo que reembolse la Seguridad Social.';

export const comunitatValenciana: RentaCcaa = {
  id: 'comunitat-valenciana',
  name: 'Comunitat Valenciana',
  regime: 'common',
  scale: [
    { from: 0, rate: 9 },
    { from: 12000, rate: 12 },
    { from: 22000, rate: 15 },
    { from: 32000, rate: 17.5 },
    { from: 42000, rate: 20 },
    { from: 52000, rate: 22.5 },
    { from: 62000, rate: 25 },
    { from: 72000, rate: 26.5 },
    { from: 100000, rate: 27.5 },
    { from: 150000, rate: 28.5 },
    { from: 200000, rate: 29.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunitat-valenciana.html',
  minimums: {
    personal: 6105,
    over65: 1265,
    over75: 1540,
    descendants: [2640, 2970, 4400, 4950],
    under3: 3080,
    ascendants: 1265,
    ascendantsOver75: 1540,
    disability33: 3300,
    disability65: 9900,
    assistance: 3300,
  },
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/comunitat-valenciana.html',
  deductions: [
    // ---------------------------------------------------------------- FAMILIA
    {
      id: 'comunitat-valenciana-nacimiento-adopcion-acogimiento',
      group: 'family',
      title: 'Por nacimiento, adopción o acogimiento',
      summary:
        'Importe fijo por cada hijo nacido o adoptado en el año: 600 euros el primero, 750 el segundo y 900 el tercero y siguientes. También por acogimiento o guarda con fines de adopción de todo el año.',
      kind: 'fixed',
      perChild: [600, 750, 900],
      incomeLimit: LIMIT_30K,
      requirements:
        'El hijo da derecho a mínimo por descendientes. Cuenta el orden de nacimiento. En acogimiento, del segundo en adelante hace falta más de 183 días. Se reparte entre declarantes. Incompatible con el extra por despoblamiento. Duda: hijos nacidos antes de 2025 podrían seguir en 300 €.',
      url: `${BASE}/nacimiento-adopcion-delegacion-guarda-acogimiento-familiar.html`,
    },
    {
      id: 'comunitat-valenciana-nacimiento-adopcion-multiples',
      group: 'family',
      title: 'Por parto o adopción múltiples',
      summary:
        'Da 246 euros si en el año nacen varios hijos en el mismo parto o se adoptan dos o más a la vez.',
      kind: 'fixed',
      amount: 246,
      unit: 'parto o adopción múltiple',
      incomeLimit: LIMIT_30K,
      requirements:
        'Los hijos dan derecho a mínimo por descendientes. Se reparte a partes iguales si hay más de un declarante con derecho. Compatible con las deducciones de nacimiento, discapacidad y familia numerosa; incompatible con el extra por despoblamiento del mismo hijo.',
      url: `${BASE}/nacimiento-adopcion-multiples.html`,
    },
    {
      id: 'comunitat-valenciana-nacimiento-hijo-discapacidad',
      group: 'family',
      title: 'Por hijo con discapacidad',
      summary:
        'Da 246 euros por el hijo o menor acogido con discapacidad (65 % o más, o intelectual del 33 %) nacido o adoptado en el año; 303 euros si convives con otra persona que también da derecho.',
      kind: 'fixed',
      amount: 246,
      unit: 'hijo con discapacidad',
      incomeLimit: LIMIT_30K,
      requirements:
        'Nacimiento, adopción o acogimiento en el año y derecho a mínimo por descendientes. Discapacidad con certificado oficial. 303 € si convive con otra persona que da derecho; 246 € si la otra persona con discapacidad no da derecho. Se reparte entre progenitores.',
      url: `${BASE}/nacimiento-adopcion-acogimiento-delegacion-guarda-discapacidad.html`,
    },
    {
      id: 'comunitat-valenciana-familia-numerosa-monoparental',
      group: 'family',
      title: 'Por familia numerosa o monoparental',
      summary:
        'Da 330 euros si tu familia numerosa o monoparental es de categoría general y 660 euros si es de categoría especial.',
      kind: 'special',
      incomeLimit: {
        individual: 35000,
        joint: 58000,
        note: 'Depende de la categoría. General: tope 30.000 € (47.000 € conjunta), importe completo bajo 27.000 € (44.000 €). Especial: tope 35.000 € (58.000 €), importe completo bajo 31.000 € (54.000 €). En ambos baja en línea recta hasta cero.',
      },
      requirements:
        'Condición vigente a 31 de diciembre. Lo aplica quien convive con el resto de la familia; si conviven con varios declarantes, se reparte a partes iguales. Compatible con las deducciones por nacimiento, adopción, partos múltiples y discapacidad.',
      url: `${BASE}/familia-numerosa-monoparental.html`,
    },
    {
      id: 'comunitat-valenciana-conciliacion',
      group: 'family',
      title: 'Por conciliación con la vida familiar',
      summary:
        'Da 460 euros a la madre, acogedora o guardadora que trabaja por cada hijo mayor de 3 y menor de 5 años, con límite en las cotizaciones a la Seguridad Social pagadas.',
      kind: 'fixed',
      amount: 460,
      unit: 'hijo de 3 a 5 años',
      incomeLimit: LIMIT_30K,
      requirements:
        'Solo la madre (o el padre si ella falleció) de alta en Seguridad Social por trabajo; se cuenta por meses. El hijo da derecho a mínimo por descendientes. Total limitado a las cotizaciones del periodo. Incompatible con empleado de hogar y con guardería.',
      url: `${BASE}/conciliacion-trabajo-vida-familiar.html`,
    },
    {
      id: 'comunitat-valenciana-contribuyentes-discapacidad-65',
      group: 'family',
      title: 'Por ser mayor de 65 con discapacidad',
      summary:
        'Da 197 euros a cada contribuyente de 65 años o más con una discapacidad reconocida del 33 % o más.',
      kind: 'fixed',
      amount: 197,
      unit: 'contribuyente',
      incomeLimit: LIMIT_30K,
      requirements:
        'Tener 65 años a 31 de diciembre y discapacidad del 33 % o más con certificado oficial. No vale si la discapacidad da derecho a una prestación exenta del IRPF.',
      url: `${BASE}/contribuyentes-discapacidad-grado-igual-superior.html`,
    },
    {
      id: 'comunitat-valenciana-ascendientes-mayores',
      group: 'family',
      title: 'Por ascendientes mayores de 75 o con discapacidad',
      summary:
        'Da 197 euros por cada padre, madre o abuelo que viva contigo y tenga más de 75 años, o más de 65 con discapacidad del 65 % (o intelectual del 33 %).',
      kind: 'fixed',
      amount: 197,
      unit: 'ascendiente',
      incomeLimit: LIMIT_30K,
      requirements:
        'Convivencia al menos medio año. El ascendiente gana hasta 8.000 € al año y no declara rentas superiores a 1.800 €. Con varios con derecho, se reparte, salvo que el más cercano supere 8.000 €. Incompatible con empleado de hogar indefinido.',
      url: `${BASE}/ascendientes-mayores-75-anos-mayores-discapacidad.html`,
    },
    {
      id: 'comunitat-valenciana-empleados-hogar-indefinido',
      group: 'family',
      title: 'Por contratar empleado de hogar indefinido',
      summary:
        'Devuelve el 50 % de las cuotas de Seguridad Social de un empleado de hogar con contrato indefinido que cuide de menores de 5 años o de ascendientes mayores que dependen de ti.',
      kind: 'percent',
      percent: 50,
      incomeLimit: LIMIT_30K,
      requirements:
        'Tope anual: 660 € con un menor de 5 años, 1.100 € con dos o más o familia monoparental; 330 € con un ascendiente, 550 € con dos o más (se suman). Hay que tener rentas del trabajo o de actividad. Incompatible con guardería, conciliación y ascendientes.',
      url: `${BASE}/contratar-manera-indefinida-personas-afiliadas.html`,
    },
    {
      id: 'comunitat-valenciana-dos-o-mas-descendientes',
      group: 'family',
      title: 'Por tener dos o más descendientes',
      summary:
        'Descuenta el 10 % de tu cuota autonómica (tras restar las demás deducciones) si tienes dos o más descendientes con derecho a mínimo por descendientes.',
      kind: 'special',
      incomeLimit: {
        individual: 30000,
        note: 'Se mide con las bases imponibles (general + ahorro), sumando las de los contribuyentes con derecho, los descendientes y los demás miembros de la unidad familiar. No hay tramo de reducción ni tope distinto en conjunta.',
      },
      requirements:
        'Los descendientes dan derecho a mínimo por descendientes. La suma de bases imponibles general y del ahorro de todos los implicados no puede pasar de 30.000 €. Es el 10 % de la cuota íntegra autonómica menos el resto de deducciones.',
      url: `${BASE}/contribuyentes-dos-descendientes.html`,
    },
    // ------------------------------------------------------------- EDUCACIÓN
    {
      id: 'comunitat-valenciana-custodia-guarderias',
      group: 'education',
      title: 'Por guardería de menores de 3 años',
      summary:
        'Devuelve el 15 % de lo pagado por guardería o primer ciclo de infantil de hijos, acogidos o guardados con fines de adopción menores de tres años, hasta 297 euros por menor.',
      kind: 'percent',
      percent: 15,
      limit: 297,
      incomeLimit: LIMIT_30K,
      requirements:
        'Los progenitores que conviven con el menor trabajan por cuenta propia o ajena. Pago no en efectivo. El tope (297 € por menor, reducido por días si no tiene tres años todo el año) baja con la renta y se reparte entre declarantes. Incompatible con empleado de hogar.',
      url: `${BASE}/cantidades-destinadas-custodia-no-ocasional-guarderias.html`,
    },
    {
      id: 'comunitat-valenciana-material-escolar',
      group: 'education',
      title: 'Por material escolar',
      summary:
        'Da 110 euros por cada hijo o menor acogido escolarizado a 31 de diciembre en primaria, ESO o educación especial en un centro público o concertado valenciano.',
      kind: 'fixed',
      amount: 110,
      unit: 'hijo escolarizado',
      incomeLimit: LIMIT_30K,
      requirements:
        'Estar en paro e inscrito como demandante de empleo (basta que lo cumpla tu pareja si convivís); se prorratea por días de paro. El menor da derecho a mínimo por descendientes. Hace falta pagar por banco, no en efectivo. Dos declarantes se reparten el importe.',
      url: `${BASE}/cantidades-destinadas-adquisicion-material-escolar.html`,
    },
    {
      id: 'comunitat-valenciana-fomento-formacion-musical',
      group: 'education',
      title: 'Por formación y fomento de la música',
      summary:
        'Devuelve el 100 % de lo pagado en conservatorios, sociedades musicales, cursos de música, instrumentos y conciertos de esas entidades, con un máximo de 150 euros al año.',
      kind: 'percent',
      percent: 100,
      limit: 150,
      incomeLimit: LIMIT_60K,
      requirements:
        'Gasto tuyo, de tu cónyuge o de quien te da mínimo por descendientes. Escuelas inscritas en el registro valenciano de centros, sociedades de la Federación de Sociedades Musicales y cursos oficiales. No vale la parte subvencionada. Pago no en efectivo.',
      url: `${BASE}/cantidades-satisfechas-gastos-vinculados-fomento-musicales.html`,
    },
    // ---------------------------------------------------------------- SALUD
    {
      id: 'comunitat-valenciana-salud-bucodental',
      group: 'health',
      title: 'Dentista y salud bucodental',
      summary:
        'Devuelve el 30 % de lo pagado en salud bucodental no estética (dentista, tratamientos, productos), hasta 150 euros por contribuyente. Vale para ti, tu cónyuge y quienes te dan mínimos.',
      kind: 'percent',
      percent: 30,
      limit: 150,
      incomeLimit: LIMIT_60K,
      requirements: `No cubre tratamientos estéticos. ${HEALTH_PROOF}`,
      url: `${BASE}/cantidades-satisfechas-determinados-gastos-salud.html`,
    },
    {
      id: 'comunitat-valenciana-salud-optica',
      group: 'health',
      title: 'Gafas y lentillas',
      summary:
        'Devuelve el 30 % de lo pagado en lentes graduadas (con montura no premontada), lentes de contacto y líquidos de mantenimiento, hasta 100 euros por contribuyente.',
      kind: 'percent',
      percent: 30,
      limit: 100,
      incomeLimit: LIMIT_60K,
      requirements: `Lentes graduadas, lentillas y líquidos. ${HEALTH_PROOF}`,
      url: `${BASE}/cantidades-satisfechas-determinados-gastos-salud.html`,
    },
    {
      id: 'comunitat-valenciana-salud-mental',
      group: 'health',
      title: 'Salud mental',
      summary:
        'Devuelve el 30 % de lo pagado en la atención de cualquier patología de salud mental (psicólogo, psiquiatra...), hasta 150 euros por contribuyente.',
      kind: 'percent',
      percent: 30,
      limit: 150,
      incomeLimit: LIMIT_60K,
      requirements: `Cualquier patología de salud mental. ${HEALTH_PROOF}`,
      url: `${BASE}/cantidades-satisfechas-determinados-gastos-salud.html`,
    },
    {
      id: 'comunitat-valenciana-salud-cronicas-raras',
      group: 'health',
      title: 'Enfermedades crónicas complejas y raras',
      summary:
        'Devuelve lo pagado en el tratamiento y cuidado de personas con enfermedades crónicas de alta complejidad o raras, hasta 100 euros (150 en familia numerosa o monoparental).',
      kind: 'percent',
      percent: 100,
      limit: 100,
      incomeLimit: LIMIT_60K,
      requirements: `Tope 150 € si familia numerosa o monoparental (aquí 100 €). ${HEALTH_PROOF}`,
      url: `${BASE}/cantidades-satisfechas-determinados-gastos-salud.html`,
    },
    {
      id: 'comunitat-valenciana-salud-dano-cerebral-alzheimer',
      group: 'health',
      title: 'Daño cerebral adquirido y alzhéimer',
      summary:
        'Devuelve lo pagado en el tratamiento y cuidado de personas con daño cerebral adquirido o alzhéimer, hasta 100 euros (150 en familia numerosa o monoparental).',
      kind: 'percent',
      percent: 100,
      limit: 100,
      incomeLimit: LIMIT_60K,
      requirements: `Tope 150 € si familia numerosa o monoparental (aquí 100 €). ${HEALTH_PROOF}`,
      url: `${BASE}/cantidades-satisfechas-determinados-gastos-salud.html`,
    },
    {
      id: 'comunitat-valenciana-tratamientos-fertilidad',
      group: 'health',
      title: 'Por tratamientos de fertilidad',
      summary:
        'Da 100 euros a mujeres de entre 40 y 45 años (inclusive) que hayan pagado tratamientos de fertilidad en clínicas o centros autorizados.',
      kind: 'fixed',
      amount: 100,
      unit: 'contribuyente',
      incomeLimit: LIMIT_30K,
      requirements:
        'Mujer de 40 a 45 años a 31 de diciembre y que recibe el tratamiento. Hay que haber pagado el tratamiento en el año, en un centro autorizado. El importe es fijo (100 €), no un porcentaje del gasto.',
      url: `${BASE}/cantidades-satisfechas-tratamientos-fertilidad.html`,
    },
    {
      id: 'comunitat-valenciana-practica-deporte',
      group: 'health',
      title: 'Por deporte y actividades saludables',
      summary:
        'Devuelve el 30 % del gimnasio, clubes, equipación federada, entrenadores y fisio o nutricionista, hasta 150 euros. Con más de 65 años o discapacidad del 33 %: 50 %; con más de 75 o 65 %: 100 %.',
      kind: 'percent',
      percent: 30,
      limit: 150,
      incomeLimit: LIMIT_60K,
      requirements:
        'Cuotas de gimnasios y clubes, equipamiento obligatorio de deporte federado, entrenadores, traumatólogos, dietistas, fisioterapeutas y podólogos. Gasto tuyo, del cónyuge o de quien te da mínimo familiar. Factura y pago no en efectivo.',
      url: `${BASE}/cantidades-satisfechas-gastos-asociados-practica-saludables.html`,
    },
    // ----------------------------------------------------------------- OTRAS
    {
      id: 'comunitat-valenciana-ayudas-erte-covid',
      group: 'other',
      title: 'Por ayudas ERTE y conciliación (Covid)',
      summary:
        'Aplica el tipo medio autonómico a las ayudas de la Generalitat de 2020 (Decreto ley 3/2020) para trabajadores con ERTE o reducción de jornada por Covid que tributaron en la renta.',
      kind: 'special',
      requirements:
        'Haber cobrado las ayudas concedidas por la Generalitat según el Decreto ley 3/2020 y haberlas incluido en la base imponible. La deducción es el resultado de aplicar el tipo medio autonómico a esas ayudas. La AEAT no da más cifras.',
      url: `${BASE}/ayudas-publicas-erte-reduccion-jornada-covid.html`,
    },
    {
      id: 'comunitat-valenciana-abonos-culturales',
      group: 'other',
      title: 'Por abonos culturales',
      summary:
        'Devuelve el 21 % de lo pagado en abonos culturales de entidades adheridas al Abono Cultural Valenciano, sobre un máximo de 165 euros al año (34,65 euros).',
      kind: 'percent',
      percent: 21,
      baseLimit: 165,
      incomeLimit: {
        individual: 50000,
        note: 'La AEAT habla de rentas inferiores a 50.000 € (base liquidable general + ahorro) y no distingue conjunta; no hay reducción gradual.',
      },
      requirements:
        'Base liquidable general + ahorro inferior a 50.000 €. Abonos de empresas o instituciones adheridas al convenio con Culturarts Generalitat. Pago con tarjeta, transferencia, cheque o ingreso, no en efectivo.',
      url: `${BASE}/cantidades-destinadas-abonos-culturales.html`,
    },
    {
      id: 'comunitat-valenciana-vehiculos-movilidad-personal',
      group: 'other',
      title: 'Por bici o patinete eléctrico nuevos',
      summary:
        'Devuelve el 10 % de lo pagado por una bici urbana, bici eléctrica, kit de electrificación o patinete (VMP) nuevos, sobre un máximo según el vehículo.',
      kind: 'percent',
      percent: 10,
      incomeLimit: LIMIT_30K,
      requirements:
        'Un solo vehículo al año, con tu nombre en la factura. Base máxima: bici urbana 550 € (770 € con carga infantil), eléctrica 1.540 €, kit 660 €, patinete 495 €, menos las ayudas públicas. Pago no en efectivo.',
      url: `${BASE}/adquisicion-vehiculos-nuevos-pertenecientes-categorias-2020.html`,
    },
    {
      id: 'comunitat-valenciana-acciones-entidades-nuevas',
      group: 'other',
      title: 'Por invertir en empresas nuevas',
      summary:
        'Devuelve el 30 % de lo invertido en acciones o participaciones de empresas nuevas o de reciente creación valencianas, hasta 6.600 euros (con un 15 % extra en casos especiales).',
      kind: 'percent',
      percent: 30,
      limit: 6600,
      requirements:
        'Empresa con sede social y fiscal valenciana 3 años, con actividad y un empleado a jornada completa. Mantén las participaciones 3 años; escritura pública. Extra del 15 % (tope 15.000 €) si es pyme innovadora, emergente o de municipio despoblado.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones-entidades.html`,
    },
    {
      id: 'comunitat-valenciana-dana-aportaciones-fondos-propios',
      group: 'other',
      title: 'DANA: aportaciones a empresas afectadas',
      summary:
        'Devuelve el 45 % de lo invertido en acciones o participaciones de empresas de la zona afectada por la DANA de octubre de 2024, hasta 9.900 euros por contribuyente.',
      kind: 'percent',
      percent: 45,
      limit: 9900,
      requirements:
        'La base no puede superar el 30 % de tu base liquidable. Inversiones entre el 13-11-2024 y el 31-12-2025, empresa de la zona con sede 3 años, actividad y un empleado a jornada completa. Incompatible con la de empresas nuevas en la misma empresa.',
      url: `${BASE}/dirigidas-personas-afectadas-dana/aportaciones-fondos-propios-entidades-que-economicas.html`,
    },
    {
      id: 'comunitat-valenciana-despoblamiento',
      group: 'other',
      title: 'Por vivir en un municipio en riesgo de despoblamiento',
      summary:
        'Da 330 euros a quien reside en un municipio en riesgo de despoblamiento; sube 132, 198 o 264 euros si tienes uno, dos o tres o más descendientes con mínimo.',
      kind: 'special',
      requirements:
        'Residir habitualmente en un municipio de la lista oficial (Fondo de lucha contra el despoblamiento). El extra se reparte entre quienes den derecho al mínimo. Incompatible, para el mismo hijo, con las deducciones de nacimiento, partos múltiples y discapacidad.',
      url: `${BASE}/residir-habitualmente-municipio-riesgo-despoblamiento.html`,
    },
    // --------------------------------------------------------------- VIVIENDA
    {
      id: 'comunitat-valenciana-primera-vivienda-menores-35',
      group: 'housing',
      title: 'Primera vivienda habitual (hasta 35 años)',
      summary:
        'Si tienes 35 años o menos: 5 % de lo pagado por la primera compra de tu vivienda habitual (sin contar los intereses).',
      kind: 'percent',
      percent: 5,
      incomeLimit: LIMIT_30K,
      requirements:
        'Primera vivienda habitual, con 35 años o menos a fin de año. Pago no en efectivo; patrimonio aumentado al menos lo invertido. Compatible con la de discapacidad y la del arrendador. Incompatible, por lo mismo, con la de ayudas públicas.',
      url: `${BASE}/primera-adquisicion-vivienda-habitual-igual-anos.html`,
    },
    {
      id: 'comunitat-valenciana-vivienda-habitual-discapacidad',
      group: 'housing',
      title: 'Compra de vivienda con discapacidad',
      summary:
        'Personas con discapacidad del 65 % o más (o intelectual permanente del 33 %): 5 % de lo pagado por comprar su vivienda habitual, sin contar los intereses.',
      kind: 'percent',
      percent: 5,
      incomeLimit: LIMIT_30K,
      requirements:
        'Discapacidad con certificado oficial. Pago no en efectivo y patrimonio aumentado al menos lo invertido. Compatible con la de menores de 36 años y la del arrendador; incompatible, por lo mismo, con la de ayudas públicas.',
      url: `${BASE}/adquisicion-vivienda-habitual-personas-discapacidad.html`,
    },
    {
      id: 'comunitat-valenciana-vivienda-ayudas-publicas',
      group: 'housing',
      title: 'Ayudas públicas para comprar o rehabilitar vivienda',
      summary:
        'Si destinas una ayuda de la Generalitat (o del Estado a su cargo) a comprar o rehabilitar tu vivienda habitual: 112 euros, o el tipo medio autonómico aplicado a la ayuda (a elegir).',
      kind: 'special',
      amount: 112,
      unit: 'contribuyente',
      requirements:
        'Haber destinado la ayuda en el año a tu vivienda habitual. Para la opción del tipo medio, la rehabilitación debe ser de regeneración urbana. Pago no en efectivo. Incompatible, por las mismas cantidades, con las de primera vivienda y discapacidad. Sin límite de renta.',
      url: `${BASE}/cantidades-destinadas-adquisicion-rehabilitacion-vivienda.html`,
    },
    {
      id: 'comunitat-valenciana-arrendamiento-vivienda-habitual',
      group: 'housing',
      title: 'Por alquiler de vivienda habitual',
      summary:
        'Devuelve el 20 % del alquiler (hasta 800 euros); 25 % hasta 950 euros con una condición (35 años o menos, discapacidad, violencia de género); 30 % hasta 1.100 euros con dos o más.',
      kind: 'special',
      limit: 800,
      incomeLimit: LIMIT_30K,
      requirements:
        'Contrato posterior al 23-4-1998 y de al menos un año. Sin otra vivienda a menos de 50 km durante más de medio año. Sin deducción estatal por vivienda. Pago no en efectivo. Compatible con la de alquiler por trabajo en otro municipio.',
      url: `${BASE}/arrendamiento-pago-cesion-uso-vivienda-habitual.html`,
    },
    {
      id: 'comunitat-valenciana-arrendamiento-distinto-municipio',
      group: 'housing',
      title: 'Alquiler por trabajo en otro municipio',
      summary:
        'Devuelve el 10 % del alquiler de una vivienda en otro municipio por motivos de trabajo, con un máximo de 224 euros al año.',
      kind: 'percent',
      percent: 10,
      limit: 224,
      incomeLimit: LIMIT_30K,
      requirements:
        'La vivienda está en la Comunitat Valenciana, a más de 50 km de la anterior, y el empleador no paga el alquiler. Eres titular del contrato y resides por tu actividad. Pago no en efectivo. Compatible con la de alquiler de vivienda habitual.',
      url: `${BASE}/arrendamiento-vivienda-distinto-municipio.html`,
    },
    {
      id: 'comunitat-valenciana-arrendador-alquiler-asequible',
      group: 'housing',
      title: 'Para propietarios con alquiler asequible',
      summary:
        'Si alquilas una vivienda por debajo del precio de referencia de la Comunitat Valenciana, deduces el 5 % de los ingresos íntegros del alquiler, hasta 165 euros (base máxima 3.300 €).',
      kind: 'percent',
      percent: 5,
      baseLimit: 3300,
      requirements:
        'Contrato de vivienda habitual del inquilino iniciado en el año (no de temporada), renta dentro del precio de referencia y fianza depositada en la Generalitat. Si estuvo alquilada menos de 3 años, el inquilino debe ser distinto. Sin límite de renta.',
      url: `${BASE}/obtencion-rentas-derivadas-arrendamientos-vivienda.html`,
    },
    {
      id: 'comunitat-valenciana-autoconsumo-energia-renovable',
      group: 'housing',
      title: 'Por autoconsumo y energías renovables',
      summary:
        'Devuelve el 40 % de lo invertido en instalaciones de autoconsumo o renovables en tu vivienda habitual (20 % en segundas residencias), sobre un máximo de 8.800 euros por vivienda.',
      kind: 'percent',
      percent: 40,
      baseLimit: 8800,
      requirements:
        'Vivienda en la Comunitat Valenciana, también obras comunes del edificio. Instalación inscrita en el registro. Segundas residencias sin actividad económica. Se resta lo subvencionado. Lo no deducido por falta de cuota pasa a 4 años. Sin límite de renta.',
      url: `${BASE}/cantidades-invertidas-instalaciones-autoconsumo-generacion-termica.html`,
    },
    {
      id: 'comunitat-valenciana-obras-mejora-vivienda',
      group: 'housing',
      title: 'Obras de mejora en vivienda habitual',
      summary:
        'Devuelve el 20 % de lo pagado en obras de conservación, calidad, sostenibilidad o accesibilidad de tu vivienda habitual (50 % si mejoran la accesibilidad de una persona con discapacidad), con base máxima de 5.500 euros.',
      kind: 'percent',
      percent: 20,
      baseLimit: 5500,
      incomeLimit: LIMIT_30K,
      requirements:
        'Obras desde 2017 (accesibilidad con discapacidad del 33 %, desde 2022), subvencionables por los planes estatales, con NIF de quien las ejecuta y pago no en efectivo. No vale garaje, piscina ni renovables. Se resta lo subvencionado.',
      url: `${BASE}/obras-conservacion-mejora-calidad-sostenibilidad___.html`,
    },
    {
      id: 'comunitat-valenciana-obras-mejora-vivienda-2014-2015',
      group: 'housing',
      title: 'Obras de mejora hechas en 2014 y 2015',
      summary:
        'Devuelve el 10 % (obras de 2014) o el 25 % (obras de 2015) de lo que pagues este año por obras de mejora de tu vivienda habitual, con base máxima anual de 4.500 euros.',
      kind: 'special',
      baseLimit: 4500,
      incomeLimit: {
        individual: 25000,
        joint: 40000,
        phaseOutFrom: 23000,
        phaseOutTo: 25000,
        note: 'La base de 4.500 € baja en línea recta de 23.000 a 25.000 € en individual; en conjunta, de 37.000 a 40.000 €. Base acumulada máxima de 5.000 € por vivienda.',
      },
      requirements:
        'Obras ejecutadas en 2014 o 2015 en tu vivienda habitual o su edificio, con NIF de quien las hizo y pago no en efectivo. Base acumulada máxima 5.000 € por vivienda. No vale garaje, piscina ni renovables.',
      url: `${BASE}/obras-conservacion-mejora-calidad-2014-2015.html`,
    },
    {
      id: 'comunitat-valenciana-incremento-costes-financiacion',
      group: 'housing',
      title: 'Por subida del coste de la hipoteca',
      summary:
        'Devuelve el 50 % del aumento de lo pagado en la hipoteca de tu vivienda habitual respecto al año anterior, con un máximo de 100 euros.',
      kind: 'percent',
      percent: 50,
      limit: 100,
      incomeLimit: LIMIT_30K,
      requirements:
        'Préstamo para comprar, rehabilitar o adaptar por discapacidad tu vivienda habitual, sin aplicar la deducción estatal de vivienda. Se compara lo pagado este año con el anterior. El máximo de 100 € baja con la renta.',
      url: `${BASE}/incremento-costes-financiacion-ajena.html`,
    },
    {
      id: 'comunitat-valenciana-dana-danos-vivienda',
      group: 'housing',
      title: 'DANA: reparación de la vivienda habitual',
      summary:
        'Devuelve el 100 % de lo gastado en reparar los daños de la DANA de octubre de 2024 en tu vivienda habitual, hasta 2.000 euros (solo ejercicios 2024 y 2025).',
      kind: 'percent',
      percent: 100,
      limit: 2000,
      incomeLimit: {
        individual: 45000,
        joint: 60000,
        phaseOutFrom: 40000,
        phaseOutTo: 45000,
        note: 'Tope completo por debajo de 40.000 € (55.000 € en conjunta); baja en línea recta hasta cero en 45.000 € (60.000 € en conjunta).',
      },
      requirements:
        'Vivienda habitual en un municipio afectado. No cuenta lo cubierto por seguros ni ayudas públicas, ni los enseres. Pago no en efectivo. Lo que no quepa por falta de cuota se arrastra 4 años. Dos declarantes se reparten los 2.000 €.',
      url: `${BASE}/dirigidas-personas-afectadas-dana/destinar-cantidades-paliar-danos-materiales-habitual.html`,
    },
    // -------------------------------------------------------------- DONACIONES
    {
      id: 'comunitat-valenciana-donaciones-finalidad-ecologica',
      group: 'donations',
      title: 'Donaciones con fin ecológico',
      summary:
        'Deduces el 20 % de los primeros 250 euros donados y el 25 % del resto a entidades que defienden el medio ambiente.',
      kind: 'special',
      requirements:
        'Donación a la Generalitat, corporaciones locales, entidades públicas ambientales o fundaciones y asociaciones de utilidad pública ambientales inscritas en la Comunitat. Pago no en efectivo (tarjeta, transferencia, cheque o ingreso).',
      url: `${BASE}/donaciones-finalidad-ecologica.html`,
    },
    {
      id: 'comunitat-valenciana-donaciones-patrimonio-cultural',
      group: 'donations',
      title: 'Donación de bienes del Patrimonio Cultural',
      summary:
        'Deduces el 20 % de los primeros 250 euros y el 25 % del resto del valor de bienes del Inventario del Patrimonio Cultural Valenciano que dones.',
      kind: 'special',
      requirements:
        'Donación pura y simple a entidades beneficiarias de la Ley 20/2018 de mecenazgo (Generalitat, entidades locales, universidades, fundaciones culturales...). El bien debe estar en el Inventario General. Pago no en efectivo.',
      url: `${BASE}/donaciones-bienes-integrantes-patrimonio-cultural-valenciano.html`,
    },
    {
      id: 'comunitat-valenciana-donativos-conservacion-bienes',
      group: 'donations',
      title: 'Donativos para conservar el Patrimonio Cultural',
      summary:
        'Deduces el 20 % de los primeros 250 euros y el 25 % del resto de lo donado en dinero para conservar y restaurar bienes del Patrimonio Cultural Valenciano.',
      kind: 'special',
      requirements:
        'Donación a entidades de la Ley 20/2018 de mecenazgo, con pago no en efectivo. Límite conjunto con otras donaciones culturales, del valenciano y de otros fines: la base no supera el 30 % de tu base liquidable (general + ahorro).',
      url: `${BASE}/donativos-conservacion-reparacion-restauracion-bienes.html`,
    },
    {
      id: 'comunitat-valenciana-titulares-conservacion-bienes',
      group: 'donations',
      title: 'Conservar bienes propios del Patrimonio Cultural',
      summary:
        'Si eres titular de un bien del Inventario del Patrimonio Cultural Valenciano, deduces el 20 % de los primeros 250 euros y el 25 % del resto de lo gastado en conservarlo.',
      kind: 'special',
      requirements:
        'Bien inscrito en el Inventario General del Patrimonio Cultural Valenciano. Pago no en efectivo. Límite conjunto con las demás donaciones culturales, del valenciano y de otros fines: la base no supera el 30 % de tu base liquidable.',
      url: `${BASE}/cantidades-destinadas-titulares-conservacion___.html`,
    },
    {
      id: 'comunitat-valenciana-donaciones-lengua-valenciana',
      group: 'donations',
      title: 'Donaciones para el fomento del valenciano',
      summary:
        'Deduces el 20 % de los primeros 250 euros y el 25 % del resto de lo donado en dinero para fomentar la lengua valenciana.',
      kind: 'special',
      requirements:
        'Donación a la Generalitat, entidades locales, universidades, centros de enseñanzas artísticas o entidades del Censo de fomento del valenciano. Pago no en efectivo. Límite conjunto: la base no supera el 30 % de tu base liquidable.',
      url: `${BASE}/donaciones-destinadas-fomento-lengua-valenciana.html`,
    },
    {
      id: 'comunitat-valenciana-donaciones-otros-fines-culturales',
      group: 'donations',
      title: 'Donaciones culturales, científicas o deportivas',
      summary:
        'Deduces el 25 % de donaciones o cesiones de uso a proyectos culturales, científicos o deportivos no profesionales declarados de interés social.',
      kind: 'percent',
      percent: 25,
      requirements:
        'A beneficiarios de la Ley 20/2018 de mecenazgo. Si aplicas también la deducción estatal por donativos, los primeros 250 € se deducen al 20 %. Pago no en efectivo. Límite conjunto: la base no supera el 30 % de tu base liquidable.',
      url: `${BASE}/donaciones-cesiones-uso-comodatos-otros-fines.html`,
    },
    {
      id: 'comunitat-valenciana-donaciones-investigacion-covid',
      group: 'donations',
      title: 'Donaciones a investigación sobre Covid-19',
      summary:
        'Deduces el 20 % de los primeros 150 euros y el 25 % del resto de donaciones en dinero a programas de investigación sobre el tratamiento y prevención del Covid-19.',
      kind: 'special',
      requirements:
        'Donación a la Generalitat y sus entidades, entidades sin lucro cuyo fin sea la investigación en la Comunitat, universidades públicas, institutos de investigación y centros tecnológicos valencianos. La AEAT no fija un tope.',
      url: `${BASE}/donaciones-programas-id-cientifico-tecnologico-19.html`,
    },
    {
      id: 'comunitat-valenciana-donaciones-gastos-covid',
      group: 'donations',
      title: 'Donaciones para gastos de la crisis Covid-19',
      summary:
        'Deduces el 20 % de los primeros 150 euros y el 25 % del resto de donaciones (en dinero o en especie) para financiar los gastos de la crisis sanitaria del Covid-19.',
      kind: 'special',
      requirements:
        'Donaciones hechas según el artículo 4 del Decreto ley 4/2020: dinero ingresado en la cuenta del Tesoro de la Generalitat o equipamiento recibido por Sanidad. La AEAT no fija un tope.',
      url: `${BASE}/donaciones-contribuir-financiacion-gastos-covid-19.html`,
    },
  ],
};
