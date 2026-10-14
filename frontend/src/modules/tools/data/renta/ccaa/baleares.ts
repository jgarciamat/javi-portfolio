import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-illes-balears';

export const baleares: RentaCcaa = {
  id: 'baleares',
  name: 'Illes Balears',
  regime: 'common',
  scale: [
    { from: 0, rate: 9 },
    { from: 10000, rate: 11.25 },
    { from: 18000, rate: 14.25 },
    { from: 30000, rate: 17.5 },
    { from: 48000, rate: 19 },
    { from: 70000, rate: 21.75 },
    { from: 90000, rate: 22.75 },
    { from: 120000, rate: 23.75 },
    { from: 175000, rate: 24.75 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/8-cumplimentacion-irpf/8_4-cuota-integra/8_4_3-gravamen-base-liquidable-general/8_4_3_2-cuota-integra-autonomica.html',
  minimums: {
    personal: 5550,
    descendants: [2400, 2970, 4400, 4950],
    under3: 2800,
    ascendants: 1265,
    ascendantsOver75: 1540,
    over65: 1265,
    over75: 1540,
    disability33: 3300,
    disability65: 9900,
    assistance: 3300,
  },
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/illes-balears.html',
  deductions: [
    {
      id: 'baleares-nacimiento',
      group: 'family',
      title: 'Por nacimiento de hijos',
      summary:
        'Importe fijo por cada hijo nacido en el año, según el orden de nacimiento: 800, 1.000, 1.200 y 1.400 euros (4º y siguientes). Si superas el límite de renta, recibes solo el 50 %.',
      kind: 'fixed',
      perChild: [800, 1000, 1200, 1400],
      unit: 'hijo nacido',
      requirements:
        'Residente en Baleares el año anterior. Base imponible total hasta 52.800 € (individual) o 84.480 € (conjunta); 63.360 € / 101.376 € en familia numerosa o monoparental. Por encima, el 50 %. Con dos progenitores en declaraciones separadas, se reparte a mitades.',
      url: `${BASE}/nacimiento.html`,
    },
    {
      id: 'baleares-adopcion',
      group: 'family',
      title: 'Por adopción de hijos',
      summary:
        'Importe fijo por cada hijo adoptado e inscrito en el Registro Civil ese año: 800, 1.000, 1.200 y 1.400 euros (4º y siguientes).',
      kind: 'fixed',
      perChild: [800, 1000, 1200, 1400],
      unit: 'hijo adoptado',
      requirements:
        'Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta); 39.600 € / 63.360 € en familia numerosa o monoparental. No vale adoptar al hijo del cónyuge o pareja. Incompatible con ayudas autonómicas por nacimiento.',
      url: `${BASE}/adopcion.html`,
    },
    {
      id: 'baleares-discapacidad-contribuyente-descendientes',
      group: 'family',
      title: 'Por discapacidad del declarante o de sus familiares',
      summary:
        'Por cada persona de la unidad familiar con discapacidad: 88 € (física o sensorial del 33 % al 64 %), 165 € (física o sensorial desde 65 %) y 165 € (psíquica desde 33 %).',
      kind: 'special',
      requirements:
        'Residente en Baleares. Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta). Cada cónyuge que tribute por separado y tenga derecho al mínimo por descendientes puede aplicarla entera.',
      url: `${BASE}/declarantes-discapacidad-descendientes-condicion.html`,
    },
    {
      id: 'baleares-gastos-mayores-discapacidad',
      group: 'family',
      title: 'Gastos de mayores de 65 años o personas con discapacidad',
      summary:
        'El 40 % de lo gastado en residencias, centros de día o en contratar a un cuidador para mayores de 65 o personas con discapacidad. Máximo 660 € al año por persona.',
      kind: 'percent',
      percent: 40,
      limit: 660,
      requirements:
        'Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta). Pago con tarjeta, transferencia o cheque; el cuidador debe estar dado de alta en la Seguridad Social. Incompatible con la deducción por conciliación de menores de seis años.',
      url: `${BASE}/determinados-gastos-relativos-personas-mayores-discapacidad.html`,
    },
    {
      id: 'baleares-conciliacion-menores-seis',
      group: 'family',
      title: 'Conciliación: gastos de hijos menores de 6 años',
      summary:
        'El 40 % de guardería, comedor, extraescolares o cuidador de hijos menores de 6 años (máx. 660 €). Sube al 50 % y 900 € si eres menor de 36, tienes discapacidad, familia numerosa o monoparental.',
      kind: 'percent',
      percent: 40,
      limit: 660,
      requirements:
        'Debes trabajar (por cuenta ajena o propia). Renta total hasta 33.000 € (individual) o 52.800 € (conjunta), con límites mayores en familia numerosa. Pago por medios bancarios. Incompatible con la de gastos de mayores o discapacidad.',
      url: `${BASE}/gastos-descendientes-acogidos-menores-seis-conciliacion.html`,
    },
    {
      id: 'baleares-libros-texto',
      group: 'family',
      title: 'Libros de texto',
      summary:
        'El 100 % de lo gastado en libros de texto de tus hijos (infantil, primaria, ESO, bachillerato y FP). Máximo 220 € por hijo, o 350 € en determinados casos (menores de 30, discapacidad, familia numerosa...).',
      kind: 'percent',
      percent: 100,
      limit: 220,
      requirements:
        'Solo hijos que den derecho al mínimo por descendientes. Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta); más en familia numerosa. Si hay dos progenitores en declaración individual, se reparte a mitades.',
      url: `${BASE}/gastos-adquisicion-libros-texto.html`,
    },
    {
      id: 'baleares-idiomas-extraescolar',
      group: 'family',
      title: 'Idiomas extranjeros extraescolares',
      summary:
        'El 15 % de lo gastado en clases extraescolares de idiomas de tus hijos (infantil 2º ciclo a bachillerato y FP). Máximo 110 € por hijo.',
      kind: 'percent',
      percent: 15,
      limit: 110,
      requirements:
        'Solo hijos que den derecho al mínimo por descendientes. Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta). No vale estudiar en el extranjero ni campamentos de verano.',
      url: `${BASE}/gastos-aprendizaje-extraescolar-idiomas-extranjeros.html`,
    },
    {
      id: 'baleares-estudios-superiores-fuera-isla',
      group: 'family',
      title: 'Estudios superiores fuera de tu isla',
      summary:
        '1.800 € por cada hijo dependiente que curse estudios superiores (universidad, FP superior, etc.) en otra isla distinta a la de tu residencia habitual.',
      kind: 'fixed',
      amount: 1800,
      unit: 'hijo',
      requirements:
        'Curso completo o mínimo 30 créditos. Hijo con rentas hasta 8.000 € y que dé derecho al mínimo por descendientes. Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta). Tope: 50 % de la cuota íntegra autonómica.',
      url: `${BASE}/cursar-estudios-educacion-superior-fuera-habitual.html`,
    },
    {
      id: 'baleares-ela',
      group: 'family',
      title: 'Gastos por esclerosis lateral amiotrófica (ELA)',
      summary:
        'El 100 % de los gastos derivados de la ELA de ti, tus hijos o ascendientes a tu cargo. Máximo 3.500 € (límite conjunto por persona enferma).',
      kind: 'percent',
      percent: 100,
      limit: 3500,
      requirements:
        'Descendientes y ascendientes deben dar derecho a su mínimo. Base imponible total hasta 52.800 € (individual) o 84.480 € (conjunta). No cuentan seguros de salud ni gastos ajenos a la ELA. Compatible con la de gastos de mayores/discapacidad.',
      url: `${BASE}/gastos-derivados-esclerosis-lateral-amiotrofica.html`,
    },
    {
      id: 'baleares-alquiler-vivienda-habitual',
      group: 'housing',
      title: 'Alquiler de la vivienda habitual',
      summary:
        'El 15 % del alquiler si tienes menos de 36 años o más de 65 sin trabajar (máx. 530 €). El 20 % (máx. 650 €) si eres menor de 30, con discapacidad, familia numerosa/monoparental o autónomo.',
      kind: 'special',
      percent: 15,
      limit: 530,
      requirements:
        'Contrato de al menos un año. Ni tú ni tu familia con otra vivienda a menos de 70 km (salvo otra isla o fuera de Baleares). Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta); más en familia numerosa.',
      url: `${BASE}/arrendamiento-vivienda-habitual.html`,
    },
    {
      id: 'baleares-arrendador-primas-seguros',
      group: 'housing',
      title: 'Arrendador: seguros de impago de alquiler',
      summary:
        'El 75 % de las primas de seguros que cubran el impago de rentas de viviendas que alquilas en Baleares. Máximo 440 € al año.',
      kind: 'percent',
      percent: 75,
      limit: 440,
      requirements:
        'Contrato de al menos un año, fianza depositada en el IBAVI y rentas declaradas como capital inmobiliario. Base imponible total hasta 52.800 € (individual) o 84.480 € (conjunta). Compatible con la deducción de otros gastos del arrendador.',
      url: `${BASE}/arrendamiento-bienes-inmuebles-primas-seguros.html`,
    },
    {
      id: 'baleares-arrendador-otros-gastos',
      group: 'housing',
      title: 'Arrendador: gastos de la vivienda alquilada',
      summary:
        'El 50 % de seguros de daños, reparaciones, comunidad, impuestos, contratos y certificados energéticos de la vivienda que alquilas. Máximo 1.500 € (1.800 € si la alquilas a la Administración balear).',
      kind: 'percent',
      percent: 50,
      limit: 1500,
      requirements:
        'Se aplica una sola vez, el primer año que cumplas todo. Vivienda no alquilada en los 2 años previos; contrato de 1 año o más; fianza en el IBAVI; renta máxima 15 €/m² al mes. Base imponible total hasta 52.800 € (individual) o 84.480 € (conjunta).',
      url: `${BASE}/arrendamiento-bienes-inmuebles-otros-gastos.html`,
    },
    {
      id: 'baleares-alquiler-traslado-laboral',
      group: 'housing',
      title: 'Alquiler por traslado laboral a otra isla',
      summary:
        'El 15 % del alquiler de la vivienda a la que te trasladas temporalmente a otra isla balear por trabajo. Máximo 440 € al año.',
      kind: 'percent',
      percent: 15,
      limit: 440,
      requirements:
        'Traslado dentro de la misma relación laboral por cuenta ajena y de máximo tres años. Fianza en el IBAVI y arrendador identificado. Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta).',
      url: `${BASE}/arrendamiento-illes-balears-derivado-traslado-laboral.html`,
    },
    {
      id: 'baleares-sostenibilidad-vivienda',
      group: 'housing',
      title: 'Obras de sostenibilidad en la vivienda habitual',
      summary:
        'El 50 % de lo invertido en renovables (solar, biomasa...) o ahorro de agua en tu vivienda habitual o en una vivienda que alquilas. Base máxima 10.000 € al año.',
      kind: 'percent',
      percent: 50,
      baseLimit: 10000,
      limit: 5000,
      requirements:
        'Debe mejorar al menos un nivel la calificación energética, con certificados registrados antes y después. Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta). Si alquilas, contrato de 1 año o más y sin repercutir el coste.',
      url: `${BASE}/determinadas-inversiones-mejora-sostenibilidad-vivienda-habitual.html`,
    },
    {
      id: 'baleares-vivienda-ocupada-ilegalmente',
      group: 'housing',
      title: 'Vivienda ocupada ilegalmente o con desahucio suspendido',
      summary:
        'El 40 % de IBI, basuras, suministros, comunidad, conservación y gastos judiciales de tu vivienda ocupada ilegalmente o con lanzamiento suspendido. Máximo 500 € por declaración.',
      kind: 'percent',
      percent: 40,
      limit: 500,
      requirements:
        'Debe ser una vivienda de tu propiedad. En caso de desahucio suspendido, el inquilino debe estar en vulnerabilidad y la deuda computar como saldo de dudoso cobro. Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta).',
      url: `${BASE}/compensar-gastos-derivados-vivienda-ocupada-ilegalmente.html`,
    },
    {
      id: 'baleares-plazas-dificil-cobertura',
      group: 'housing',
      title: 'Plazas de difícil cobertura (vivienda y transporte)',
      summary:
        'El 40 % de vivienda (alquiler o intereses de hipoteca) o transporte interinsular de empleados públicos baleares con plus de difícil cobertura, policías y guardias civiles destinados en Baleares.',
      kind: 'special',
      percent: 40,
      limit: 2000,
      requirements:
        'Cobrar el complemento más de la mitad del año (o destino de Policía Nacional/Guardia Civil). Máximo 2.000 € (1.000 € con renta mayor); 1.400 € en Mallorca y 2.600 € en Formentera para policías y guardias. Renta total hasta 52.800 € individual.',
      url: `${BASE}/ocupacion-plazas-declaradas-dificil-cobertura-balears.html`,
    },
    {
      id: 'baleares-donaciones-cultural',
      group: 'donations',
      title: 'Mecenazgo cultural, científico y consumo cultural',
      summary:
        'El 15 % de donaciones, cesiones de uso y convenios de colaboración de mecenazgo cultural o científico (máx. 660 €). El 25 % (máx. 1.200 €) si el destino es la Administración balear.',
      kind: 'percent',
      percent: 15,
      limit: 660,
      requirements:
        'Para el 15 %, base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta); el 25 % no tiene ese límite. Incompatible con la deducción por donaciones a la lengua catalana sobre las mismas cantidades.',
      url: `${BASE}/donaciones-cesiones-comodato-cv-colaboracion-cultural.html`,
    },
    {
      id: 'baleares-donaciones-deportivo',
      group: 'donations',
      title: 'Mecenazgo deportivo',
      summary:
        'El 15 % de donaciones, cesiones de uso y convenios de colaboración de mecenazgo deportivo. Máximo 660 € al año en total.',
      kind: 'percent',
      percent: 15,
      limit: 660,
      requirements:
        'Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta). Las cesiones de menos de un año se prorratean; si duran más de un año, no se aplica a más de tres ejercicios.',
      url: `${BASE}/donaciones-cesiones-comodato-cv-colaboracion-deportivo.html`,
    },
    {
      id: 'baleares-donaciones-investigacion',
      group: 'donations',
      title: 'Donaciones a investigación e innovación',
      summary:
        'El 25 % de las donaciones en dinero a la Administración balear, la UIB o entidades sin ánimo de lucro dedicadas a investigación e innovación en Baleares.',
      kind: 'percent',
      percent: 25,
      requirements:
        'Tope: el 15 % de la cuota íntegra autonómica. Hace falta certificado de la entidad donataria; las entidades sin lucro necesitan resolución de la Consejería. No indican límite de renta en la página.',
      url: `${BASE}/donaciones-determinadas-entidades-destinadas-investigacion.html`,
    },
    {
      id: 'baleares-donaciones-lengua-catalana',
      group: 'donations',
      title: 'Donaciones para el fomento del catalán',
      summary:
        'El 15 % de las donaciones en dinero a entidades que promueven la lengua catalana (Administración balear, UIB, fundaciones y otras entidades autorizadas).',
      kind: 'percent',
      percent: 15,
      requirements:
        'Tope: el 10 % de la cuota íntegra autonómica. Certificado de la entidad donataria. Incompatible con la de mecenazgo cultural sobre las mismas cantidades.',
      url: `${BASE}/donaciones-entidades-objeto-fomento-lengua-catalana.html`,
    },
    {
      id: 'baleares-donaciones-tercer-sector',
      group: 'donations',
      title: 'Donaciones al tercer sector de acción social',
      summary:
        'El 25 % de las donaciones en dinero a entidades del tercer sector de acción social inscritas en Baleares. La base máxima es de 165 € al año.',
      kind: 'percent',
      percent: 25,
      baseLimit: 165,
      limit: 41.25,
      requirements:
        'La entidad debe estar inscrita en el registro de la Consejería de Familias y cumplir la Ley 49/2002 o estar parcialmente exenta de Sociedades. Necesitas certificado de la entidad.',
      url: `${BASE}/donaciones-entidades-tercer-sector.html`,
    },
    {
      id: 'baleares-autoocupacion',
      group: 'other',
      title: 'Fomento de la autoocupación',
      summary:
        '1.000 € si te das de alta por primera vez en el Censo de Empresarios, Profesionales y Retenedores para una actividad principalmente en Baleares.',
      kind: 'fixed',
      amount: 1000,
      unit: 'contribuyente',
      requirements:
        'Mantener el alta al menos un año. Base imponible total hasta 33.000 € (individual) o 52.800 € (conjunta). En conjunta, cada miembro que genere el derecho la aplica entera.',
      url: `${BASE}/fomento-autoocupacion.html`,
    },
    {
      id: 'baleares-inversion-nuevas-empresas',
      group: 'other',
      title: 'Inversión en empresas nuevas',
      summary:
        'El 30 % de lo invertido en acciones o participaciones de sociedades nuevas o de reciente creación (máx. 6.000 € al año). El 50 % (máx. 12.000 €) en sociedades de universidades o centros de investigación.',
      kind: 'percent',
      percent: 30,
      limit: 6000,
      requirements:
        'Participación familiar máxima del 40 %. La empresa debe tener domicilio en Baleares, actividad económica, al menos un empleado y facturar menos de 2 M€. Mantener la inversión 4 años y formalizarla en escritura pública.',
      url: `${BASE}/inversion-adquisicion-acciones-nuevas-entidades-creacion.html`,
    },
    {
      id: 'baleares-ayudas-emergencia-proteccion-civil',
      group: 'other',
      title: 'Ayudas por zona afectada por una emergencia',
      summary:
        'Descuento equivalente al tipo medio de gravamen sobre las subvenciones o ayudas de la comunidad por daños en zona declarada gravemente afectada por una emergencia de protección civil.',
      kind: 'special',
      requirements:
        'Haber integrado en la base imponible general ayudas del Govern balear por daños de emergencias que el Consejo de Ministros declaró zona afectada gravemente.',
      url: `${BASE}/subvenciones-ayudas-declaracion-zona-afectada-emergencia.html`,
    },
  ],
};
