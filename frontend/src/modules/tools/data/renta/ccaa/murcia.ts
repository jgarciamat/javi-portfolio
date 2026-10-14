import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-region-murcia';

export const murcia: RentaCcaa = {
  id: 'murcia',
  name: 'Región de Murcia',
  regime: 'common',
  scale: [
    { from: 0, rate: 9.5 },
    { from: 12450, rate: 11.2 },
    { from: 20200, rate: 13.3 },
    { from: 34000, rate: 17.9 },
    { from: 60000, rate: 22.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-autonoma-region-murcia.html',
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/region-murcia.html',
  deductions: [
    {
      id: 'murcia-gastos-guarderia',
      group: 'family',
      title: 'Por gastos de guardería',
      summary:
        'Devuelve el 20 % de lo pagado por la escuela infantil (0 a 3 años) de tus hijos, con un máximo de 1.000 euros por hijo.',
      kind: 'percent',
      percent: 20,
      limit: 1000,
      requirements:
        'Centro de primer ciclo de infantil autorizado. Base general + ahorro de hasta 30.000 € (individual) o 50.000 € (conjunta). Debes convivir con el hijo a fin de año. Si lo declaran ambos padres, el límite se reparte.',
      url: `${BASE}/gastos-guarderia.html`,
    },
    {
      id: 'murcia-nacimiento-adopcion',
      group: 'family',
      title: 'Por nacimiento o adopción',
      summary:
        'Importe fijo por cada hijo nacido o adoptado en el año: 100 euros el primero, 200 el segundo y 300 el tercero y siguientes.',
      kind: 'fixed',
      perChild: [100, 200, 300],
      requirements:
        'Base general + ahorro de hasta 30.000 € (individual) o 50.000 € (conjunta). Si conviven con ambos progenitores y declaran por separado, se reparte al 50 %.',
      url: `${BASE}/nacimiento-adopcion.html`,
    },
    {
      id: 'murcia-contribuyentes-discapacidad',
      group: 'family',
      title: 'Para contribuyentes con discapacidad',
      summary: 'Da 150 euros a cada contribuyente con una discapacidad reconocida del 33 % o más.',
      kind: 'fixed',
      amount: 150,
      unit: 'contribuyente con discapacidad',
      requirements:
        'Grado de discapacidad acreditado igual o superior al 33 %. Base general + ahorro de hasta 40.000 €, tanto en declaración individual como conjunta.',
      url: `${BASE}/contribuyentes-discapacidad.html`,
    },
    {
      id: 'murcia-conciliacion',
      group: 'family',
      title: 'Por conciliación (empleados de hogar)',
      summary:
        'Devuelve el 20 % de las cuotas de Seguridad Social de una empleada de hogar que cuide a hijos menores de 12 años o a mayores de 65, hasta 400 euros (800 si son los dos casos).',
      kind: 'percent',
      percent: 20,
      limit: 400,
      requirements:
        'Eres empleador de hogar dado de alta en la Seguridad Social. Base general + ahorro de la unidad familiar de hasta 34.000 €. Titular y pareja deben tener rentas del trabajo o de actividad económica.',
      url: `${BASE}/conciliacion.html`,
    },
    {
      id: 'murcia-acogimiento-no-remunerado',
      group: 'family',
      title: 'Por acoger a mayores de 65 o personas con discapacidad',
      summary:
        'Da 600 euros por cada persona mayor de 65 años o con discapacidad del 33 % o más que viva contigo en acogimiento sin remuneración.',
      kind: 'fixed',
      amount: 600,
      unit: 'persona acogida',
      requirements:
        'Convivencia más de 183 días al año, sin ayudas autonómicas por ese acogimiento. En mayores de 65 no vale si son parientes hasta el cuarto grado. Hace falta certificado oficial y empadronamiento.',
      url: `${BASE}/acogimiento-no-remunerado-mayores-65-discapac.html`,
    },
    {
      id: 'murcia-familia-monoparental',
      group: 'family',
      title: 'Por familia monoparental',
      summary:
        'Da 303 euros al contribuyente que tiene hijos a su cargo y no convive con otra persona adulta ajena a ellos.',
      kind: 'fixed',
      amount: 303,
      unit: 'contribuyente',
      requirements:
        'Hijos menores (o mayores con discapacidad) que convivan contigo y ganen menos de 8.000 € al año. Base general + ahorro (más pensiones por alimentos exentas) de hasta 35.240 €.',
      url: `${BASE}/familia-monoparental.html`,
    },
    {
      id: 'murcia-enfermedades-raras',
      group: 'family',
      title: 'Por gastos de enfermedades raras',
      summary:
        'Devuelve el 100 % de lo gastado en el tratamiento y cuidado de personas con enfermedades raras, con un máximo de 300 euros por declaración.',
      kind: 'percent',
      percent: 100,
      limit: 300,
      requirements:
        'Gastos del contribuyente, su cónyuge o personas que den derecho a mínimo por descendientes o ascendientes. Se justifica con factura.',
      url: `${BASE}/gastos-asociados-enfermedades-raras.html`,
    },
    {
      id: 'murcia-material-escolar',
      group: 'family',
      title: 'Por material escolar y libros de texto',
      summary:
        'Da 120 euros por cada hijo escolarizado en infantil (2.º ciclo), primaria o ESO, por material escolar y libros de texto.',
      kind: 'fixed',
      amount: 120,
      unit: 'hijo',
      requirements:
        'Base general + ahorro de hasta 20.000 € (individual) o 40.000 € (conjunta); con familia numerosa, 33.000 € o 53.000 €. Se resta lo recibido en becas. Se reparte entre quienes tengan derecho.',
      url: `${BASE}/gastos-adquisicion-material-escolar-libros-texto.html`,
    },
    {
      id: 'murcia-mujeres-trabajadoras',
      group: 'family',
      title: 'Para mujeres trabajadoras',
      summary:
        'Para mujeres que trabajan: 300, 350 y 400 euros por el primer, segundo y tercer hijo menor de 18 años; 400 euros por cada persona dependiente a cargo.',
      kind: 'fixed',
      perChild: [300, 350, 400],
      requirements:
        'Alta en la Seguridad Social por trabajo propio o ajeno. Base general + ahorro de hasta 20.000 € (individual) o 40.000 € (conjunta). Se calcula según los días trabajados. Dependiente: 400 € y convivencia.',
      url: `${BASE}/mujeres-trabajadoras.html`,
    },
    {
      id: 'murcia-idiomas',
      group: 'family',
      title: 'Por clases extraescolares de idiomas',
      summary:
        'Devuelve el 15 % de lo pagado por clases extraescolares de idiomas de tus hijos, con un máximo de 300 euros por hijo.',
      kind: 'percent',
      percent: 15,
      limit: 300,
      requirements:
        'Hijos en infantil (2.º ciclo), primaria, ESO, bachillerato o FP que den derecho a mínimo por descendientes. Base general + ahorro de hasta 25.000 € (individual) o 40.000 € (conjunta).',
      url: `${BASE}/gastos-ensenanza-idiomas.html`,
    },
    {
      id: 'murcia-internet',
      group: 'other',
      title: 'Por conexión a Internet de alta velocidad',
      summary:
        'Devuelve el 30 % de la alta y las cuotas de un nuevo contrato de Internet de alta velocidad en tu vivienda habitual, hasta 300 euros.',
      kind: 'percent',
      percent: 30,
      limit: 300,
      requirements:
        'Vives en un municipio murciano de menos de 15.000 habitantes. Solo en el año en que contratas la línea, sin actividad profesional ni simple cambio de compañía. El límite se reparte si hay varios titulares.',
      url: `${BASE}/gastos-acceso-internet.html`,
    },
    {
      id: 'murcia-cristales-lentes',
      group: 'other',
      title: 'Por gafas y lentillas de menores',
      summary:
        'Devuelve el 30 % de lo gastado en cristales graduados, lentes de contacto y líquidos para menores de 12 años a tu cargo, hasta 100 euros por declaración.',
      kind: 'percent',
      percent: 30,
      limit: 100,
      requirements:
        'Menores de 12 años por los que apliques el mínimo por descendientes (edad en el momento del pago). En gananciales el gasto se reparte al 50 %.',
      url: `${BASE}/cristales-graduados-lentes-contacto-soluciones-limpieza.html`,
    },
    {
      id: 'murcia-deporte',
      group: 'other',
      title: 'Por deporte y actividades saludables',
      summary:
        'Devuelve el 30 % de lo pagado en gimnasio, federaciones, entrenadores, pilates o yoga (100 % si eres mayor de 65), hasta 150 euros al año.',
      kind: 'percent',
      percent: 30,
      limit: 150,
      requirements:
        'Gastos tuyos, de tu cónyuge o de personas que den derecho a mínimos familiares. Base general + ahorro de hasta 25.000 € (individual) o 40.000 € (conjunta). Con factura. No valen cuotas de clubes sociales.',
      url: `${BASE}/gastos-asociados-practica-deporte-actividades-saludables.html`,
    },
    {
      id: 'murcia-veterinarios',
      group: 'other',
      title: 'Por gastos veterinarios',
      summary:
        'Devuelve el 30 % de lo pagado en veterinario por tus animales domésticos, con un máximo de 100 euros al año por declaración.',
      kind: 'percent',
      percent: 30,
      limit: 100,
      requirements:
        'Base general + ahorro de hasta 25.000 € (individual) o 40.000 € (conjunta). Hay que tener factura de los servicios veterinarios.',
      url: `${BASE}/gastos-veterinarios.html`,
    },
    {
      id: 'murcia-vehiculos-electricos',
      group: 'other',
      title: 'Por comprar un vehículo eléctrico',
      summary:
        'Devuelve entre el 15 % y el 30 % del precio de un turismo, moto o ciclomotor eléctrico o híbrido enchufable según tu renta, hasta 7.000 euros por vehículo.',
      kind: 'special',
      baseLimit: 45000,
      limit: 7000,
      requirements:
        '30 % hasta 35.000 € de base (individual; 50.000 € conjunta), 22,5 % hasta 45.000 € (75.000 €), 15 % hasta 60.000 € (95.000 €); más, sin derecho. Un solo vehículo al año y domicilio fiscal en Murcia.',
      url: `${BASE}/gastos-adquisicion-vehiculos-electricos.html`,
    },
    {
      id: 'murcia-recarga-vehiculos-electricos',
      group: 'other',
      title: 'Por punto de recarga de vehículo eléctrico',
      summary:
        'Devuelve el 100 % de lo que pagues por instalar un punto de recarga para tu vehículo eléctrico, hasta 4.000 euros.',
      kind: 'percent',
      percent: 100,
      limit: 4000,
      requirements:
        'Instalación en una finca de tu propiedad o garaje comunitario, para uso particular. Se mantiene dos años. No vale para usufructuarios ni inquilinos. Una sola instalación al año y con factura.',
      url: `${BASE}/gastos-instalacion-infraestructuras-recarga-vehiculos-electricos.html`,
    },
    {
      id: 'murcia-acciones-entidades-nuevas',
      group: 'other',
      title: 'Por invertir en empresas nuevas',
      summary:
        'Devuelve el 20 % de lo invertido en acciones o participaciones de empresas nuevas o de reciente creación de Murcia, hasta 4.000 euros.',
      kind: 'percent',
      percent: 20,
      limit: 4000,
      requirements:
        'Tu participación (con familiares hasta tercer grado) no supera el 40 %. La empresa tiene sede en Murcia y al menos un empleado a jornada completa. Mantener las acciones y sin cargo ejecutivo o laboral diez años.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones-sociales.html`,
    },
    {
      id: 'murcia-acciones-mab',
      group: 'other',
      title: 'Por invertir en empresas del segmento MAB',
      summary:
        'Devuelve el 20 % de lo invertido en ampliaciones de capital de empresas del segmento de expansión del Mercado Alternativo Bursátil, hasta 10.000 euros.',
      kind: 'percent',
      percent: 20,
      limit: 10000,
      requirements:
        'Participación de hasta el 10 % del capital. Mantener las acciones al menos dos años. La empresa tiene domicilio social y fiscal en Murcia y no se dedica a gestionar patrimonio.',
      url: `${BASE}/inversion-acciones-entidades-que-cotizan-segmento___.html`,
    },
    {
      id: 'murcia-economia-social',
      group: 'other',
      title: 'Por invertir en economía social',
      summary:
        'Devuelve el 20 % de las aportaciones para ser socio de entidades de economía social de Murcia, con un máximo de 4.000 euros.',
      kind: 'percent',
      percent: 20,
      limit: 4000,
      requirements:
        'Participación (con familiares hasta tercer grado) de como mucho el 40 %. La entidad tiene sede en Murcia y un empleado a jornada completa. Mantener la aportación al menos cinco años.',
      url: `${BASE}/inversion-entidades-economia-social.html`,
    },
    {
      id: 'murcia-vivienda-jovenes',
      group: 'housing',
      title: 'Por comprar vivienda habitual (jóvenes)',
      summary:
        'Jóvenes de hasta 40 años: 5 % de lo pagado por comprar, construir, ampliar o rehabilitar su vivienda habitual, con un máximo de 300 euros al año.',
      kind: 'percent',
      percent: 5,
      limit: 300,
      requirements:
        'Residir en Murcia, tener 40 años o menos a fin de año y base general + ahorro inferior a 40.000 € (ahorro hasta 1.800 €). Debe ser vivienda de nueva construcción, o rehabilitación protegida.',
      url: `${BASE}/inversion-vivienda-habitual-jovenes-edad-anos.html`,
    },
    {
      id: 'murcia-ahorro-agua',
      group: 'housing',
      title: 'Por dispositivos de ahorro de agua',
      summary:
        'Devuelve el 20 % de lo invertido en dispositivos domésticos de ahorro de agua en tu vivienda habitual, hasta 60 euros al año.',
      kind: 'percent',
      percent: 20,
      baseLimit: 300,
      limit: 60,
      requirements:
        'Vivienda habitual del contribuyente. Hace falta reconocimiento previo de la Administración regional sobre la procedencia de la deducción.',
      url: `${BASE}/inversiones-dispositivos-domesticos-ahorro-agua.html`,
    },
    {
      id: 'murcia-energias-renovables',
      group: 'housing',
      title: 'Por instalar energías renovables en casa',
      summary:
        'Devuelve entre el 25 % y el 50 % de lo pagado por instalar renovables de autoconsumo en tu vivienda habitual o alquilada, según tu renta, hasta 7.000 euros.',
      kind: 'special',
      limit: 7000,
      requirements:
        '50 % hasta 35.000 € de base (individual; 50.000 € conjunta), 37,5 % hasta 45.000 € (75.000 €), 25 % hasta 60.000 € (95.000 €); más, sin derecho. Vivienda en Murcia, factura de instalador y pago no en efectivo.',
      url: `${BASE}/inversion-instalaciones-recursos-energeticos-renovables.html`,
    },
    {
      id: 'murcia-arrendamiento-vivienda-habitual',
      group: 'housing',
      title: 'Por alquiler de vivienda habitual',
      summary:
        'Devuelve el 10 % del alquiler pagado por tu vivienda habitual, hasta 300 euros por contrato, si eres joven, familia numerosa o tienes discapacidad.',
      kind: 'percent',
      percent: 10,
      limit: 300,
      requirements:
        'Tener 40 años o menos, o familia numerosa, o discapacidad del 65 % o más. Base general menos mínimo personal y familiar inferior a 40.000 € (ahorro hasta 1.800 €). Contrato con ITP presentado; no en efectivo.',
      url: `${BASE}/arrendamiento-vivienda-habitual.html`,
    },
    {
      id: 'murcia-vivienda-familias-numerosas',
      group: 'housing',
      title: 'Por comprar vivienda (familias numerosas)',
      summary:
        'Familias numerosas: 10 % (general) o 15 % (especial) de lo pagado por una nueva vivienda habitual o su ampliación, sobre un máximo de 5.000 euros.',
      kind: 'special',
      baseLimit: 5000,
      requirements:
        'Familia numerosa con residencia en Murcia. Compra dentro de 5 años desde que es numerosa o del nacimiento de un hijo; vender la anterior en 5 años. La nueva vivienda debe ser un 10 % más grande.',
      url: `${BASE}/adquisicion-ampliacion-vivienda-habitual-familias-numerosas.html`,
    },
    {
      id: 'murcia-regimen-transitorio-vivienda',
      group: 'housing',
      title: 'Régimen transitorio de vivienda habitual',
      summary:
        'Para quien aplicó deducciones autonómicas por vivienda en 1998-2000: 2 % de lo pagado (3 % con renta baja) si la vivienda era de nueva construcción.',
      kind: 'special',
      requirements:
        'Haber aplicado la deducción por esa vivienda en 1998-2000. El 3 % exige base general menos mínimo personal y familiar inferior a 24.200 € y ahorro de hasta 1.800 €. Quien aplicó en 2001-2012 pasa a la de jóvenes.',
      url: `${BASE}/regimen-transitorio-deduccion-inversion-vivienda-habitual.html`,
    },
    {
      id: 'murcia-donativos-cultura-y-sociales',
      group: 'donations',
      title: 'Donativos a proyectos de mecenazgo',
      summary:
        'Devuelve el 50 % de lo donado en dinero para patrimonio cultural de Murcia o actividades culturales, sociales, científicas o medioambientales.',
      kind: 'percent',
      percent: 50,
      requirements:
        'Donación pura y simple a los titulares de proyectos de la Ley de mecenazgo regional, con certificado. Se resta lo ya deducido en la deducción estatal. Incompatible con el crédito fiscal de la Ley 4/2022.',
      url: `${BASE}/donativos-proteccion-patrimonio-cultural-activ-sociales.html`,
    },
    {
      id: 'murcia-donativos-investigacion-biosanitaria',
      group: 'donations',
      title: 'Donativos para investigación biosanitaria',
      summary:
        'Devuelve el 50 % de lo donado en dinero a la investigación biosanitaria de la Región de Murcia.',
      kind: 'percent',
      percent: 50,
      requirements:
        'Donación a la Comunidad, universidades públicas o entidades sin lucro inscritas con certificado y transferencia bancaria. Se resta lo ya deducido a nivel estatal. Incompatible con el crédito fiscal de mecenazgo.',
      url: `${BASE}/donativos-investigacion-biosanitaria.html`,
    },
    {
      id: 'murcia-donaciones-bienes-patrimonio-cultural',
      group: 'donations',
      title: 'Donación de bienes del patrimonio cultural',
      summary:
        'Devuelve el 15 % del valor de bienes del Inventario del Patrimonio Cultural de Murcia que dones a la Administración, universidades o entidades culturales.',
      kind: 'percent',
      percent: 15,
      requirements:
        'Donación pura y simple con certificado de la entidad. Se valora por el valor contable del bien (con tope en el valor de mercado). Incompatible con el crédito fiscal de la Ley de mecenazgo regional.',
      url: `${BASE}/donaciones-bienes-inscritos-inventario-patrimonio-cultural.html`,
    },
  ],
};
