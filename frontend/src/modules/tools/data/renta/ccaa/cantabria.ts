import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-cantabria';

export const cantabria: RentaCcaa = {
  id: 'cantabria',
  name: 'Cantabria',
  regime: 'common',
  scale: [
    { from: 0, rate: 8.5 },
    { from: 13000, rate: 11 },
    { from: 21000, rate: 14.5 },
    { from: 35200, rate: 18 },
    { from: 60000, rate: 22.5 },
    { from: 90000, rate: 24.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/8-cumplimentacion-irpf/8_4-cuota-integra/8_4_3-gravamen-base-liquidable-general/8_4_3_2-cuota-integra-autonomica.html',
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/cantabria.html',
  deductions: [
    {
      id: 'cantabria-nacimiento-adopcion',
      group: 'family',
      title: 'Por nacimiento o adopción de hijos',
      summary:
        '1.400 € por cada hijo nacido o adoptado desde el 1 de enero de 2024. Se aplica el año del nacimiento o adopción y los dos siguientes.',
      kind: 'fixed',
      amount: 1400,
      unit: 'hijo nacido o adoptado',
      requirements:
        'En declaración individual se reparte a mitades entre los progenitores. Compatible con la deducción estatal por maternidad. Incompatible con la de cuidado de familiares (mismos hijos) salvo menores de 3 años con discapacidad del 65 %.',
      url: `${BASE}/nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'cantabria-cuidado-familiares',
      group: 'family',
      title: 'Por cuidado de familiares',
      summary:
        '100 € por cada descendiente menor de 3 años, ascendiente mayor de 70 o familiar (cónyuge, hermano, ascendiente o descendiente) con discapacidad del 65 % o más que conviva contigo.',
      kind: 'fixed',
      amount: 100,
      unit: 'familiar',
      requirements:
        'Convivencia más de 183 días (no se exige en menores de 3). El ascendiente o descendiente no puede tener rentas brutas de más de 6.000 € (1,5 veces el IPREM, 12.600 €, si tiene discapacidad). Incompatible con la de nacimiento durante 3 años.',
      url: `${BASE}/cuidado-familiares.html`,
    },
    {
      id: 'cantabria-acogimiento-familiar',
      group: 'family',
      title: 'Por acogimiento familiar de menores',
      summary:
        '240 € por cada menor acogido (multiplicado por el máximo de menores acogidos a la vez en el año). Máximo 1.200 €.',
      kind: 'fixed',
      amount: 240,
      unit: 'menor acogido',
      limit: 1200,
      requirements:
        'Acogimiento administrativo o judicial, con acogedores seleccionados por una entidad pública de protección de menores. Sin parentesco con el menor y sin adoptarlo ese año. En declaración individual se reparte a mitades.',
      url: `${BASE}/acogimiento-familiar-menores.html`,
    },
    {
      id: 'cantabria-familias-monoparentales',
      group: 'family',
      title: 'Para familias monoparentales',
      summary:
        '200 € al año para el padre o la madre de una familia monoparental (sin vínculo matrimonial o separado) con hijos a su cargo.',
      kind: 'fixed',
      amount: 200,
      unit: 'familia monoparental',
      requirements:
        'Hijos menores, o mayores incapacitados o con curatela representativa, que convivan contigo. Base liquidable (general más ahorro) menos el mínimo personal y familiar inferior a 31.485 €.',
      url: `${BASE}/familias-monoparentales.html`,
    },
    {
      id: 'cantabria-gastos-guarderia',
      group: 'family',
      title: 'Por gastos de guardería',
      summary:
        'El 15 % de lo pagado en guardería por hijos menores de 3 años. Máximo 300 € al año por hijo.',
      kind: 'percent',
      percent: 15,
      limit: 300,
      requirements:
        'Pago por tarjeta, transferencia o cheque (no efectivo). Solo quien figure en la factura, o a partes iguales si es matrimonio en gananciales. Incompatible con la de guardería en municipios en riesgo de despoblamiento.',
      url: `${BASE}/gastos-guarderia.html`,
    },
    {
      id: 'cantabria-gastos-guarderia-despoblamiento',
      group: 'family',
      title: 'Guardería en municipios en riesgo de despoblamiento',
      summary:
        'El 30 % de lo pagado en guardería si vives en un municipio de Cantabria en riesgo de despoblamiento. Máximo 600 € al año por hijo menor de 3 años.',
      kind: 'percent',
      percent: 30,
      limit: 600,
      requirements:
        'Residencia habitual en municipio de la lista de la Orden PRE/1/2025. Pago por medios bancarios. Sustituye a la deducción general de guardería; no se pueden aplicar las dos.',
      url: `${BASE}/gastos-guarderia-contribytes-residencia-municipios-despoblamiento.html`,
    },
    {
      id: 'cantabria-ayuda-domestica',
      group: 'family',
      title: 'Por ayuda doméstica',
      summary:
        'El 20 % de lo que pagas a la Seguridad Social por un empleado del hogar. Máximo 300 € al año.',
      kind: 'percent',
      percent: 20,
      limit: 300,
      requirements:
        'Ser el empleador y: tener hijos menores y trabajar ambos progenitores, o ser familia monoparental con ingresos de trabajo, o tener 75 años o más. El empleado trabaja en tu vivienda habitual y está afiliado en Cantabria.',
      url: `${BASE}/ayuda-domestica.html`,
    },
    {
      id: 'cantabria-gastos-educacion',
      group: 'family',
      title: 'Por gastos de educación',
      summary:
        'El 100 % de los libros de texto y el 15 % de idiomas extraescolares de tus hijos en enseñanza obligatoria. Entre las dos, máximo 200 € por unidad familiar.',
      kind: 'percent',
      percent: 100,
      limit: 200,
      requirements:
        'Pago por tarjeta, transferencia o cheque (no efectivo) con factura. En declaración individual se reparte a mitades entre los progenitores.',
      url: `${BASE}/gastos-educacion.html`,
    },
    {
      id: 'cantabria-gastos-enfermedad',
      group: 'family',
      title: 'Por gastos de enfermedad',
      summary:
        'El 10 % de los honorarios sanitarios (enfermedad, dental, embarazo, accidentes) no cubiertos por la Seguridad Social o seguro. Máximo 500 € individual o 700 € conjunta.',
      kind: 'percent',
      percent: 10,
      limit: 500,
      requirements:
        'Base liquidable menos el mínimo personal y familiar inferior a 22.946 € (individual) o 31.485 € (conjunta). Límite +100 € por cada contribuyente con discapacidad del 65 %. Pago por medios bancarios.',
      url: `${BASE}/gastos-enfermedad.html`,
    },
    {
      id: 'cantabria-gastos-traslado-estudios-despoblamiento',
      group: 'family',
      title: 'Traslado por estudios desde municipios en riesgo de despoblamiento',
      summary:
        '200 € por cada hijo menor de 25 años que estudie bachillerato, FP o universidad fuera de tu municipio en riesgo de despoblamiento.',
      kind: 'fixed',
      amount: 200,
      unit: 'hijo',
      requirements:
        'Tu residencia habitual en un municipio de la lista de la Orden PRE/1/2025. Hijo con rentas hasta 8.000 €. En declaración individual se reparte a mitades.',
      url: `${BASE}/gastos-traslado-razon-estudios-municipios-despoblamiento.html`,
    },
    {
      id: 'cantabria-alquiler-vivienda-habitual',
      group: 'housing',
      title: 'Alquiler de la vivienda habitual (jóvenes, mayores, discapacidad)',
      summary:
        'El 10 % del alquiler de tu vivienda habitual si tienes menos de 36 años, 65 o más, o discapacidad del 65 % o más. Máximo 300 € individual y 600 € conjunta.',
      kind: 'percent',
      percent: 10,
      limit: 300,
      requirements:
        'El alquiler debe superar el 10 % de tu renta. Pago por medios bancarios, no efectivo. Solo el cónyuge que firma el contrato. Incompatible con la de alquiler en municipios en riesgo de despoblamiento.',
      url: `${BASE}/arrendamiento-vivienda-habitual-jovenes-mayores-discapacidad.html`,
    },
    {
      id: 'cantabria-alquiler-despoblamiento-arrendatario',
      group: 'housing',
      title: 'Alquiler en municipios en riesgo de despoblamiento',
      summary:
        'El 20 % del alquiler de tu vivienda habitual situada en un municipio de Cantabria en riesgo de despoblamiento. Máximo 600 € individual y 1.200 € conjunta.',
      kind: 'percent',
      percent: 20,
      limit: 600,
      requirements:
        'Municipio de la lista de la Orden PRE/1/2025 y que sea tu residencia habitual. Pago por medios bancarios. Incompatible con la de alquiler para jóvenes, mayores y discapacidad por la misma vivienda.',
      url: `${BASE}/arrendamiento-viviendas-situadas-municipios-afectados-despoblamiento.html`,
    },
    {
      id: 'cantabria-obras-mejora-vivienda',
      group: 'housing',
      title: 'Obras de mejora en la vivienda',
      summary:
        'El 15 % de lo gastado en obras de rehabilitación, eficiencia energética, renovables, accesibilidad o telecomunicaciones en tu vivienda de Cantabria o su edificio. Máximo 1.000 € individual y 1.500 € conjunta.',
      kind: 'percent',
      percent: 15,
      limit: 1000,
      requirements:
        '+500 € de límite si tienes discapacidad del 65 % o más. Pago por medios bancarios. Lo no deducido por exceder el límite se aplica en los dos años siguientes. No vale vivienda afecta a actividad ni garajes o piscinas.',
      url: `${BASE}/obras-mejora.html`,
    },
    {
      id: 'cantabria-arrendamiento-viviendas-vacias',
      group: 'housing',
      title: 'Arrendar viviendas vacías',
      summary:
        '500 € por cada vivienda vacía de tu propiedad que alquiles por primera vez, en el año de firma del contrato.',
      kind: 'fixed',
      amount: 500,
      unit: 'vivienda alquilada',
      requirements:
        'Vivienda vacía al menos un año antes del contrato; contrato de al menos 3 años; renta máx. 1.000 € al mes; no alquilar a cónyuge o parientes hasta el tercer grado; titular de un máximo de 3 viviendas.',
      url: `${BASE}/arrendamiento-viviendas-vacias.html`,
    },
    {
      id: 'cantabria-residencia-despoblamiento',
      group: 'housing',
      title: 'Residir en un municipio en riesgo de despoblamiento',
      summary:
        'El 20 % de la cuota íntegra autonómica (máximo 500 €) si tienes menos de 40 años y vives todo el año en un municipio de Cantabria en riesgo de despoblamiento.',
      kind: 'percent',
      percent: 20,
      limit: 500,
      requirements:
        'Menos de 40 años a fecha de devengo y residencia habitual todo el año en un municipio de la Orden PRE/1/2025. En conjunta se aplica por cada contribuyente que cumpla.',
      url: `${BASE}/residencia-habitual-municipio-afectado-riesgo-despoblamiento.html`,
    },
    {
      id: 'cantabria-traslado-municipio-despoblamiento',
      group: 'housing',
      title: 'Traslado laboral a un municipio en riesgo de despoblamiento',
      summary:
        '500 € el año en que te mudas a un municipio de Cantabria en riesgo de despoblamiento por trabajo (ajena o propia) y 500 € el siguiente.',
      kind: 'fixed',
      amount: 500,
      unit: 'año de aplicación (2 años)',
      requirements:
        'Debes permanecer en la nueva residencia el año del traslado y los tres siguientes. Tope: parte autonómica de la cuota del trabajo y actividades económicas. Si incumples, hay que devolver lo deducido.',
      url: `${BASE}/gastos-traslado-residencia-municipio-afectado-despoblamiento.html`,
    },
    {
      id: 'cantabria-donativos-fundaciones-discapacidad',
      group: 'donations',
      title: 'Donativos a fundaciones, Cantabria Coopera y discapacidad',
      summary:
        'El 15 % de lo donado a fundaciones o asociaciones de apoyo a la discapacidad domiciliadas en Cantabria y el 12 % al Fondo Cantabria Coopera.',
      kind: 'percent',
      percent: 15,
      requirements:
        'Límite: 10 % de la base liquidable, compartido con la deducción estatal por donativos. Las fundaciones deben estar inscritas y rendir cuentas. Incompatible con la de economía social sobre las mismas cantidades.',
      url: `${BASE}/donativos-fundaciones-fondo-cantabria-coopera-disc.html`,
    },
    {
      id: 'cantabria-economia-social',
      group: 'donations',
      title: 'Inversiones o donaciones a la economía social',
      summary:
        'El 20 % de lo aportado para ser socio de una entidad de economía social y el 50 % o 25 % de lo donado (según finalidad). Máximo 3.000 € entre todas.',
      kind: 'percent',
      percent: 20,
      limit: 3000,
      requirements:
        'Entidad de economía social establecida en Cantabria. Tu participación familiar no puede superar el 40 %. Mantener 3 años (5 años la participación como socio). Donaciones irrevocables.',
      url: `${BASE}/inversiones-donaciones-entidades-economia-social.html`,
    },
    {
      id: 'cantabria-inversion-empresas-nuevas',
      group: 'other',
      title: 'Inversión en empresas nuevas o de reciente creación',
      summary:
        'El 15 % de lo invertido en acciones o participaciones de sociedades nuevas o recientes de Cantabria. Máximo 1.000 € al año.',
      kind: 'percent',
      percent: 15,
      limit: 1000,
      requirements:
        'Sociedad (SA, SL y laborales) PYME con domicilio social y fiscal en Cantabria y actividad económica. Participación familiar máx. 40 %. Mantener 3 años. Debe contratar al menos a una persona a jornada completa.',
      url: `${BASE}/inversion-adquisicion-acciones-particip-nuevas-reciente.html`,
    },
    {
      id: 'cantabria-inversiones-nuevos-contribuyentes-extranjero',
      group: 'other',
      title: 'Inversiones de nuevos residentes llegados del extranjero',
      summary:
        'El 20 % del valor de adquisición de inmuebles no residenciales, deuda o participaciones, si te mudas a Cantabria desde el extranjero y no eras residente en España en 5 años.',
      kind: 'percent',
      percent: 20,
      requirements:
        'Ser contribuyente del IRPF en Cantabria desde el 1/1/2025. Mantener la inversión 6 años. Inmuebles que no sean vivienda ni estén afectos a actividad. La página no indica un límite en euros.',
      url: `${BASE}/inversiones-nuevos-contribuyentes-procedentes-extranjero.html`,
    },
    {
      id: 'cantabria-nuevos-residentes-desplazamiento',
      group: 'other',
      title: 'Gastos de traslado de nuevos residentes en Cantabria',
      summary:
        'El 10 % de los gastos de mudanza, viaje, escolarización y alquiler por trasladar tu domicilio fiscal a Cantabria (máx. 1.000 €); el 25 % con máx. 1.500 € si es por trabajo.',
      kind: 'percent',
      percent: 10,
      limit: 1000,
      requirements:
        'Llegar desde otra comunidad (o Ceuta/Melilla), sin haber residido en Cantabria los 4 años anteriores, y mantener la residencia al menos 3 años. Gastos pagados efectivamente.',
      url: `${BASE}/compensar-gastos-desplazamiento-permanencia-nuevos-residentes.html`,
    },
  ],
};
