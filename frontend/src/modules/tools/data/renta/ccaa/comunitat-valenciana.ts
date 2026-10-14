import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunitat-valenciana';

// Nota general: en casi todas las deducciones con límite de renta, el importe es completo por debajo de
// 27.000 € (individual) / 44.000 € (conjunta) y baja progresivamente hasta 30.000 € / 47.000 €.
// Los importes son los del régimen "resto de contribuyentes" (Ley 5/2025), no el de fallecidos antes del 1-6-2025.
const TAPER = 'Importe reducido cerca del tope.';

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
    {
      id: 'comunitat-valenciana-nacimiento-adopcion-acogimiento',
      group: 'family',
      title: 'Por nacimiento, adopción o acogimiento',
      summary:
        'Importe fijo por cada hijo nacido o adoptado en el año: 600 euros el primero, 750 el segundo y 900 el tercero y siguientes. También por acogimiento familiar de todo el año.',
      kind: 'fixed',
      perChild: [600, 750, 900],
      requirements: `Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). Se reparte entre declarantes con derecho. ${TAPER}`,
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
      requirements: `Los hijos dan derecho a mínimo por descendientes. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). Compatible con otras deducciones por nacimiento. ${TAPER}`,
      url: `${BASE}/nacimiento-adopcion-multiples.html`,
    },
    {
      id: 'comunitat-valenciana-nacimiento-hijo-discapacidad',
      group: 'family',
      title: 'Por hijo con discapacidad',
      summary:
        'Da 246 euros por el hijo o menor acogido con discapacidad nacido o adoptado en el año (65 % o más, o intelectual del 33 %); 303 euros si convives con otra persona que también da derecho.',
      kind: 'fixed',
      amount: 246,
      unit: 'hijo con discapacidad',
      requirements: `El hijo nace o se adopta en el año y da derecho a mínimo por descendientes. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). Se reparte entre progenitores. ${TAPER}`,
      url: `${BASE}/nacimiento-adopcion-acogimiento-delegacion-guarda-discapacidad.html`,
    },
    {
      id: 'comunitat-valenciana-familia-numerosa-monoparental',
      group: 'family',
      title: 'Por familia numerosa o monoparental',
      summary:
        'Da 330 euros si tu familia numerosa o monoparental es de categoría general y 660 euros si es de categoría especial.',
      kind: 'special',
      requirements:
        'Condición vigente a 31 de diciembre. Base liquidable general + ahorro de hasta 30.000 € (individual) / 47.000 € (conjunta) en general, o 35.000 € / 58.000 € en especial; el importe baja gradualmente cerca del tope.',
      url: `${BASE}/familia-numerosa-monoparental.html`,
    },
    {
      id: 'comunitat-valenciana-custodia-guarderias',
      group: 'family',
      title: 'Por guardería de menores de 3 años',
      summary:
        'Devuelve el 15 % de lo pagado por guardería o primer ciclo de infantil de hijos, acogidos o guardados con fines de adopción menores de tres años.',
      kind: 'percent',
      percent: 15,
      requirements: `Quienes convivan con el menor trabajan por cuenta propia o ajena. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). El límite se reparte si lo aplican dos contribuyentes. ${TAPER}`,
      url: `${BASE}/cantidades-destinadas-custodia-no-ocasional-guarderias.html`,
    },
    {
      id: 'comunitat-valenciana-conciliacion',
      group: 'family',
      title: 'Por conciliación con la vida familiar',
      summary:
        'Da 460 euros a la madre, acogedora o guardadora que trabaja por cada hijo de entre 3 y 5 años (no cumplidos), con límite en las cotizaciones a la Seguridad Social.',
      kind: 'fixed',
      amount: 460,
      unit: 'hijo de 3 a 5 años',
      requirements: `Hijo con derecho a mínimo por descendientes; la madre está de alta en la Seguridad Social. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). El total no puede superar las cotizaciones pagadas. ${TAPER}`,
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
      requirements: `Tener 65 años a fin de año y discapacidad del 33 % o más con certificado. No vale si cobras por ello una prestación exenta del IRPF. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta).`,
      url: `${BASE}/contribuyentes-discapacidad-grado-igual-superior.html`,
    },
    {
      id: 'comunitat-valenciana-ascendientes-mayores',
      group: 'family',
      title: 'Por ascendientes mayores de 75 o con discapacidad',
      summary:
        'Da 197 euros por cada padre, madre o abuelo mayor de 75 años (o mayor de 65 con discapacidad del 65 % o intelectual del 33 %) que viva contigo.',
      kind: 'fixed',
      amount: 197,
      unit: 'ascendiente',
      requirements: `Convivencia al menos la mitad del año. El ascendiente gana menos de 8.000 € y no declara con rentas superiores a 1.800 €. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). ${TAPER}`,
      url: `${BASE}/ascendientes-mayores-75-anos-mayores-discapacidad.html`,
    },
    {
      id: 'comunitat-valenciana-empleados-hogar-indefinido',
      group: 'family',
      title: 'Por contratar empleado de hogar indefinido',
      summary:
        'Devuelve el 50 % de las cuotas de Seguridad Social de un empleado de hogar con contrato indefinido que cuide a menores de 5 años o a mayores dependientes a tu cargo.',
      kind: 'percent',
      percent: 50,
      requirements:
        'Se cuenta por los meses en que, el último día, tienes a cargo un menor de 5 años o un ascendiente mayor de 75 (o 65 con gran discapacidad) con derecho a mínimo. Anota el NIF de la persona empleada.',
      url: `${BASE}/contratar-manera-indefinida-personas-afiliadas.html`,
    },
    {
      id: 'comunitat-valenciana-dos-o-mas-descendientes',
      group: 'family',
      title: 'Por tener dos o más descendientes',
      summary:
        'Descuenta el 10 % de tu cuota autonómica (una vez aplicadas las demás deducciones) si tienes dos o más descendientes con derecho a mínimo.',
      kind: 'special',
      requirements:
        'Descendientes con derecho a mínimo por descendientes. La suma de bases imponibles general y ahorro de todos los implicados (contribuyentes, descendientes y miembros de la unidad familiar) no debe pasar de 30.000 €.',
      url: `${BASE}/contribuyentes-dos-descendientes.html`,
    },
    {
      id: 'comunitat-valenciana-material-escolar',
      group: 'family',
      title: 'Por material escolar',
      summary:
        'Da 110 euros por cada hijo o menor acogido escolarizado en primaria, ESO o educación especial en un centro público o concertado valenciano.',
      kind: 'fixed',
      amount: 110,
      unit: 'hijo escolarizado',
      requirements: `Estar en paro e inscrito como demandante de empleo (puede cumplirlo la pareja) y que el menor dé derecho a mínimo por descendientes. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). ${TAPER}`,
      url: `${BASE}/cantidades-destinadas-adquisicion-material-escolar.html`,
    },
    {
      id: 'comunitat-valenciana-tratamientos-fertilidad',
      group: 'family',
      title: 'Por tratamientos de fertilidad',
      summary:
        'Da 100 euros a mujeres de entre 40 y 45 años que paguen tratamientos de fertilidad en clínicas o centros autorizados.',
      kind: 'fixed',
      amount: 100,
      unit: 'contribuyente',
      requirements: `Edad de 40 a 45 años (ambas incluidas) a fin de año; solo la mujer que recibe el tratamiento. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). ${TAPER}`,
      url: `${BASE}/cantidades-satisfechas-tratamientos-fertilidad.html`,
    },
    {
      id: 'comunitat-valenciana-gastos-salud',
      group: 'family',
      title: 'Por determinados gastos de salud',
      summary:
        'Devuelve gastos de salud: hasta 100 € por enfermedades crónicas, raras, alzhéimer o daño cerebral (150 € en numerosas/monoparentales); 30 % de dentista y salud mental (150 €) y de gafas y lentillas (100 €).',
      kind: 'special',
      requirements:
        'Base liquidable general + ahorro de hasta 60.000 € (individual) o 78.000 € (conjunta). Prestadores inscritos en el registro sanitario, factura, pago no en efectivo e informe médico. Vale para ti, tu cónyuge y quienes dan mínimos.',
      url: `${BASE}/cantidades-satisfechas-determinados-gastos-salud.html`,
    },
    {
      id: 'comunitat-valenciana-ayudas-erte-covid',
      group: 'family',
      title: 'Por ayudas ERTE y conciliación (Covid)',
      summary:
        'Aplica el tipo medio autonómico a las ayudas de la Generalitat de 2020 (Decreto Ley 3/2020) para trabajadores con ERTE o reducción de jornada por Covid que tributaron en la renta.',
      kind: 'special',
      requirements:
        'Haber cobrado las ayudas concedidas por la Generalitat según el Decreto ley 3/2020 y haberlas incluido en la base imponible. La deducción es el resultado de aplicar el tipo medio autonómico a esas ayudas.',
      url: `${BASE}/ayudas-publicas-erte-reduccion-jornada-covid.html`,
    },
    {
      id: 'comunitat-valenciana-practica-deporte',
      group: 'other',
      title: 'Por deporte y actividades saludables',
      summary:
        'Devuelve el 30 % de gimnasio, cuotas deportivas, entrenadores, fisioterapeutas o nutricionistas (50 % si tienes más de 65 años o discapacidad del 33 %; 100 % si más de 75 o 65 %), hasta 150 euros.',
      kind: 'percent',
      percent: 30,
      limit: 150,
      requirements:
        'Base liquidable general + ahorro de hasta 60.000 € (individual) o 78.000 € (conjunta); límite íntegro bajo 54.000 € (72.000 €). Gasto tuyo, de tu cónyuge o de personas que den mínimos, con factura y pago no en efectivo.',
      url: `${BASE}/cantidades-satisfechas-gastos-asociados-practica-saludables.html`,
    },
    {
      id: 'comunitat-valenciana-fomento-formacion-musical',
      group: 'other',
      title: 'Por formación y fomento de la música',
      summary:
        'Devuelve el 100 % de lo pagado en conservatorios, sociedades musicales, cursos de música o conciertos de esas entidades, con un máximo de 150 euros al año.',
      kind: 'percent',
      percent: 100,
      limit: 150,
      requirements:
        'Base liquidable general + ahorro de hasta 60.000 € (individual) o 78.000 € (conjunta). Gastos tuyos, de tu cónyuge o de personas que den mínimos por descendientes. Pago no en efectivo. El límite baja cerca del tope.',
      url: `${BASE}/cantidades-satisfechas-gastos-vinculados-fomento-musicales.html`,
    },
    {
      id: 'comunitat-valenciana-abonos-culturales',
      group: 'other',
      title: 'Por abonos culturales',
      summary:
        'Devuelve el 21 % de lo pagado en abonos culturales de entidades adheridas al Abono Cultural Valenciano, sobre un máximo de 165 euros al año.',
      kind: 'percent',
      percent: 21,
      baseLimit: 165,
      requirements:
        'Base liquidable general + ahorro inferior a 50.000 €. Abonos de empresas o instituciones adheridas al convenio con Culturarts Generalitat. Pago con tarjeta, transferencia, cheque o ingreso, no en efectivo.',
      url: `${BASE}/cantidades-destinadas-abonos-culturales.html`,
    },
    {
      id: 'comunitat-valenciana-vehiculos-movilidad-personal',
      group: 'other',
      title: 'Por bici o patinete eléctrico nuevos',
      summary:
        'Devuelve el 10 % de lo pagado por una bicicleta urbana, bici eléctrica, kit de electrificación o vehículo de movilidad personal nuevos, con un tope según el modelo.',
      kind: 'percent',
      percent: 10,
      requirements:
        'Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). Un solo vehículo al año, a tu nombre en la factura. Base máxima: tope subvencionable de la Orden 5/2020 más un 10 %, sin las ayudas.',
      url: `${BASE}/adquisicion-vehiculos-nuevos-pertenecientes-categorias-2020.html`,
    },
    {
      id: 'comunitat-valenciana-acciones-entidades-nuevas',
      group: 'other',
      title: 'Por invertir en empresas nuevas',
      summary:
        'Devuelve el 30 % de lo invertido en acciones o participaciones de empresas nuevas o de reciente creación valencianas, hasta 6.600 euros (límites mayores en casos especiales).',
      kind: 'percent',
      percent: 30,
      limit: 6600,
      requirements:
        'La empresa tiene sede social y fiscal en la Comunidad Valenciana 3 años, ejerce actividad económica y tiene un empleado a jornada completa. En ampliaciones, creada en los 5 años anteriores (7 si es emergente).',
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
        'La base de la deducción no supera el 30 % de tu base liquidable. La empresa debe estar domiciliada en un municipio afectado, mantener sede 3 años, tener actividad y un empleado a jornada completa.',
      url: `${BASE}/aportaciones-fondos-propios-entidades-que-economicas.html`,
    },
    {
      id: 'comunitat-valenciana-despoblamiento',
      group: 'other',
      title: 'Por vivir en un municipio en riesgo de despoblamiento',
      summary:
        'Da 330 euros a quien reside en un municipio en riesgo de despoblamiento; sube 132, 198 o 264 euros si tienes uno, dos o tres o más descendientes con mínimo.',
      kind: 'special',
      requirements:
        'Residir habitualmente en un municipio de la lista oficial. Los descendientes que cuentan son los que dan mínimo y no dan derecho a las deducciones por nacimiento. El extra se reparte entre quienes tengan derecho.',
      url: `${BASE}/residir-habitualmente-municipio-riesgo-despoblamiento.html`,
    },
    {
      id: 'comunitat-valenciana-primera-vivienda-menores-35',
      group: 'housing',
      title: 'Primera vivienda habitual (hasta 35 años)',
      summary:
        'Si tienes 35 años o menos: 5 % de lo pagado por la primera compra de tu vivienda habitual (sin contar los intereses).',
      kind: 'percent',
      percent: 5,
      requirements: `Primera vivienda habitual, con 35 años o menos a fin de año. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). Pago no en efectivo; patrimonio aumentado al menos lo invertido. ${TAPER}`,
      url: `${BASE}/primera-adquisicion-vivienda-habitual-igual-anos.html`,
    },
    {
      id: 'comunitat-valenciana-vivienda-habitual-discapacidad',
      group: 'housing',
      title: 'Compra de vivienda con discapacidad',
      summary:
        'Personas con discapacidad del 65 % o más (o intelectual del 33 %): 5 % de lo pagado por comprar su vivienda habitual, sin contar los intereses.',
      kind: 'percent',
      percent: 5,
      requirements: `Discapacidad acreditada con certificado oficial. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). Pago no en efectivo y patrimonio aumentado al menos lo invertido. ${TAPER}`,
      url: `${BASE}/adquisicion-vivienda-habitual-personas-discapacidad.html`,
    },
    {
      id: 'comunitat-valenciana-vivienda-ayudas-publicas',
      group: 'housing',
      title: 'Ayudas públicas para comprar o rehabilitar vivienda',
      summary:
        'Si destinas una subvención de la Generalitat o del Estado a comprar o rehabilitar tu vivienda habitual: 112 euros, o el tipo medio autonómico aplicado a la ayuda (a elegir).',
      kind: 'special',
      amount: 112,
      unit: 'contribuyente',
      requirements:
        'Haber destinado la ayuda en el año a adquirir o rehabilitar tu vivienda habitual. Para la opción del tipo medio, la ayuda de rehabilitación debe ser de regeneración urbana. Pago no en efectivo.',
      url: `${BASE}/cantidades-destinadas-adquisicion-rehabilitacion-vivienda.html`,
    },
    {
      id: 'comunitat-valenciana-arrendamiento-vivienda-habitual',
      group: 'housing',
      title: 'Por alquiler de vivienda habitual',
      summary:
        'Devuelve el 20 % del alquiler (hasta 800 euros); 25 % hasta 950 euros si tienes 35 años o menos, discapacidad o eres víctima de violencia de género; 30 % hasta 1.100 euros con dos de esas condiciones.',
      kind: 'special',
      limit: 800,
      requirements:
        'Contrato posterior a 23/4/1998 de al menos un año. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). No ser titular de otra vivienda cercana durante más de la mitad del año. Sin deducción por inversión en vivienda.',
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
      requirements:
        'La vivienda está a más de 50 km de la anterior, en la Comunidad Valenciana, y el empleador no paga el alquiler. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). Pago no en efectivo.',
      url: `${BASE}/arrendamiento-vivienda-distinto-municipio.html`,
    },
    {
      id: 'comunitat-valenciana-arrendador-alquiler-asequible',
      group: 'housing',
      title: 'Para propietarios con alquiler asequible',
      summary:
        'Si alquilas una vivienda por debajo del precio de referencia de la Comunitat Valenciana, deduces el 5 % de los ingresos íntegros del alquiler.',
      kind: 'percent',
      percent: 5,
      baseLimit: 3300,
      requirements:
        'Contrato de vivienda habitual del inquilino iniciado en el año (no de temporada), renta dentro del precio de referencia y fianza depositada en la Generalitat. Base máxima anual de 3.300 €. Inquilino distinto del anterior si fue menos de 3 años.',
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
        'Vivienda en la Comunidad Valenciana, también obras comunes del edificio. Instalación inscrita en el registro correspondiente. En segundas residencias, sin actividad económica. El tope de 8.800 € es por vivienda y año.',
      url: `${BASE}/cantidades-invertidas-instalaciones-autoconsumo-generacion-termica.html`,
    },
    {
      id: 'comunitat-valenciana-obras-mejora-vivienda',
      group: 'housing',
      title: 'Obras de mejora en vivienda habitual',
      summary:
        'Devuelve el 20 % de lo pagado en obras de conservación, calidad, sostenibilidad o accesibilidad de tu vivienda habitual (50 % si mejoran la accesibilidad de una persona con discapacidad).',
      kind: 'percent',
      percent: 20,
      requirements:
        'Obras desde 2017 (accesibilidad con discapacidad del 33 %, desde 2022), en vivienda de tu propiedad o en su edificio, y subvencionables por los planes estatales de rehabilitación vigentes.',
      url: `${BASE}/obras-conservacion-mejora-calidad-sostenibilidad___.html`,
    },
    {
      id: 'comunitat-valenciana-obras-mejora-vivienda-2014-2015',
      group: 'housing',
      title: 'Obras de mejora hechas en 2014 y 2015',
      summary:
        'Devuelve el 10 % (obras de 2014) o el 25 % (obras de 2015) de lo que pagues este año por obras de mejora de tu vivienda habitual.',
      kind: 'special',
      requirements:
        'Obras realizadas entre 2014 y 2015 en tu vivienda habitual o su edificio. Base liquidable general + ahorro de hasta 25.000 € (individual) o 40.000 € (conjunta). No vale para garajes, piscinas ni energías renovables.',
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
      requirements: `Préstamo para comprar, rehabilitar o adaptar por discapacidad tu vivienda habitual, sin aplicar la deducción estatal de vivienda. Base liquidable general + ahorro de hasta 30.000 € (individual) o 47.000 € (conjunta). ${TAPER}`,
      url: `${BASE}/incremento-costes-financiacion-ajena.html`,
    },
    {
      id: 'comunitat-valenciana-dana-danos-vivienda',
      group: 'housing',
      title: 'DANA: reparación de la vivienda habitual',
      summary:
        'Devuelve el 100 % de lo gastado en reparar los daños de la DANA de octubre de 2024 en tu vivienda habitual, hasta 2.000 euros.',
      kind: 'percent',
      percent: 100,
      limit: 2000,
      requirements:
        'Vivienda habitual en un municipio afectado. Base liquidable general + ahorro de hasta 45.000 € (individual) o 60.000 € (conjunta). No cuenta lo cubierto por el seguro, las ayudas ni los enseres. Pago no en efectivo.',
      url: `${BASE}/destinar-cantidades-paliar-danos-materiales-habitual.html`,
    },
    {
      id: 'comunitat-valenciana-donaciones-finalidad-ecologica',
      group: 'donations',
      title: 'Donaciones con fin ecológico',
      summary:
        'Deduces el 20 % de los primeros 250 euros donados y el 25 % del resto a entidades que defienden el medio ambiente.',
      kind: 'special',
      requirements:
        'Donación a la Generalitat, corporaciones locales, entidades públicas ambientales o fundaciones y asociaciones de utilidad pública ambientales inscritas en la Comunitat. Pago no en efectivo; la base no supera el 30 % de tu base liquidable.',
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
        'Donación pura y simple a entidades beneficiarias de la Ley 20/2018 de mecenazgo, con certificado. La base conjunta de estas donaciones no supera el 30 % de tu base liquidable.',
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
        'Donación a entidades de la Ley 20/2018 de mecenazgo cultural, con certificado y pago no en efectivo. Límite conjunto: la base no supera el 30 % de tu base liquidable general y del ahorro.',
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
        'Bien inscrito en el Inventario General del Patrimonio Cultural Valenciano. Pago no en efectivo. Límite conjunto: la base no supera el 30 % de tu base liquidable general y del ahorro.',
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
        'Donación a la Generalitat, entidades locales, universidades, centros de enseñanzas artísticas o entidades inscritas en el Censo de entidades de fomento del valenciano. Pago no en efectivo; base máxima del 30 % de tu base liquidable.',
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
        'A beneficiarios de la Ley 20/2018 de mecenazgo, con certificado. Si aplicas la deducción estatal por donativos, los primeros 250 € se deducen al 20 %. Base total de estas deducciones: máximo el 30 % de tu base liquidable.',
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
        'Donación a la Generalitat y sus entidades, entidades sin lucro cuyo fin sea la investigación en la Comunitat, universidades públicas, institutos de investigación y centros tecnológicos valencianos.',
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
        'Donaciones hechas según el artículo 4 del Decreto ley 4/2020: dinero ingresado en la cuenta del Tesoro de la Generalitat o equipamiento recibido por Sanidad.',
      url: `${BASE}/donaciones-contribuir-financiacion-gastos-covid-19.html`,
    },
  ],
};
