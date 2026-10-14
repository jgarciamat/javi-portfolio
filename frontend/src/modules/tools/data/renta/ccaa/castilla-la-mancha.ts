import type { RentaCcaa } from '../../../domain/rentaData';

const AEAT =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/';
const D = `${AEAT}comunidad-autonoma-castilla-mancha/`;

export const castillaLaMancha: RentaCcaa = {
  id: 'castilla-la-mancha',
  name: 'Castilla-La Mancha',
  regime: 'common',
  scale: [
    { from: 0, rate: 9.5 },
    { from: 12450, rate: 12 },
    { from: 20200, rate: 15 },
    { from: 35200, rate: 18.5 },
    { from: 60000, rate: 22.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-autonoma-castilla-mancha.html',
  source: `${AEAT}guia-deducciones-autonomicas/castilla-mancha.html`,
  deductions: [
    {
      id: 'castilla-la-mancha-nacimiento-adopcion-hijos',
      group: 'family',
      title: 'Por nacimiento o adopción de hijos',
      summary:
        'Por cada parto o adopción en el año: 100 euros si es de un hijo, 500 euros si son dos y 900 euros si son tres o más.',
      kind: 'special',
      requirements:
        'Suma de base imponible general y del ahorro de hasta 27.000 euros (individual) o 36.000 (conjunta). El hijo debe darte derecho al mínimo por descendientes.',
      url: `${D}nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'castilla-la-mancha-familia-numerosa',
      group: 'family',
      title: 'Por familia numerosa',
      summary:
        'Familia numerosa general: 200 euros; especial: 400. Si hay cónyuge o hijo con discapacidad de 65 % o más: 300 euros (general) o 900 (especial).',
      kind: 'special',
      requirements:
        'Título de familia numerosa vigente a fecha de devengo. Base imponible general + ahorro de hasta 27.000 euros (individual) o 36.000 (conjunta). Incompatible con el alquiler por familia numerosa.',
      url: `${D}familia-numerosa.html`,
    },
    {
      id: 'castilla-la-mancha-familia-monoparental',
      group: 'family',
      title: 'Por familia monoparental',
      summary: 'Da 200 euros al año al padre o la madre que forma una familia monoparental.',
      kind: 'fixed',
      amount: 200,
      unit: 'familia monoparental',
      requirements:
        'Padre o madre separado o sin vínculo matrimonial con hijos que dependen solo de él o ella y sin pensión de alimentos. Base general + ahorro hasta 27.000 euros (individual) o 36.000 (conjunta).',
      url: `${D}familia-monoparental.html`,
    },
    {
      id: 'castilla-la-mancha-libros-texto-idiomas-educacion',
      group: 'family',
      title: 'Libros de texto, idiomas y otros gastos de educación',
      summary:
        'Devuelve el 100 % del gasto en libros de texto y el 15 % de idiomas extraescolares, refuerzo, internet y estudios fuera de la localidad, con límite por hijo según tu renta.',
      kind: 'special',
      requirements:
        'Hijos escolarizados que den derecho al mínimo por descendientes. Límite por hijo de 50 a 300 euros según la renta (menos mínimo por descendientes) y si es familia numerosa. Se restan becas.',
      url: `${D}gastos-adquisicion-libros-texto-ensenanza-idiomas.html`,
    },
    {
      id: 'castilla-la-mancha-guarderia',
      group: 'family',
      title: 'Por gastos de guardería',
      summary:
        'Deduces el 30 % de lo pagado por guardería o centro infantil de hijos menores de 3 años, con un máximo de 500 euros por hijo.',
      kind: 'percent',
      percent: 30,
      limit: 500,
      requirements:
        'Centro autorizado, gastos de meses completos. Límite de 250 euros el año en que el hijo cumple 3. Base general + ahorro hasta 27.000 euros (individual) o 36.000 (conjunta). Se restan becas.',
      url: `${D}gastos-guarderia.html`,
    },
    {
      id: 'castilla-la-mancha-discapacidad-contribuyente',
      group: 'family',
      title: 'Por discapacidad del contribuyente',
      summary: 'Da 300 euros a cada contribuyente con discapacidad reconocida de 65 % o más.',
      kind: 'fixed',
      amount: 300,
      unit: 'contribuyente',
      requirements:
        'Grado de discapacidad de 65 % o más y derecho al mínimo por discapacidad. Base general + ahorro hasta 27.000 euros (individual) o 36.000 (conjunta). Incompatible con la de mayores de 75 años.',
      url: `${D}discapacidad-contribuyente.html`,
    },
    {
      id: 'castilla-la-mancha-discapacidad-ascendientes-descendientes',
      group: 'family',
      title: 'Por discapacidad de ascendientes o descendientes',
      summary:
        'Da 300 euros por cada padre, madre, hijo u otro familiar a tu cargo con discapacidad de 65 % o más.',
      kind: 'fixed',
      amount: 300,
      unit: 'ascendiente o descendiente',
      requirements:
        'La persona debe darte derecho al mínimo por discapacidad. Base general + ahorro hasta 27.000 euros (individual) o 36.000 (conjunta). Incompatible con la de discapacidad del contribuyente para la misma persona.',
      url: `${D}discapacidad-ascendientes-descendientes.html`,
    },
    {
      id: 'castilla-la-mancha-mayores-75',
      group: 'family',
      title: 'Contribuyentes mayores de 75 años',
      summary: 'Da 150 euros a los contribuyentes de más de 75 años.',
      kind: 'fixed',
      amount: 150,
      unit: 'contribuyente',
      requirements:
        'No vale si pasas más de 30 días en residencias de la Junta o plazas concertadas. Base general + ahorro hasta 27.000 euros (individual) o 36.000 (conjunta). Incompatible con la de discapacidad.',
      url: `${D}contribuyentes-mayores-75-anos.html`,
    },
    {
      id: 'castilla-la-mancha-cuidado-ascendientes-75',
      group: 'family',
      title: 'Cuidado de ascendientes mayores de 75 años',
      summary:
        'Da 150 euros por cada padre, madre u otro ascendiente de más de 75 años que cuidas y te da derecho al mínimo por ascendientes.',
      kind: 'fixed',
      amount: 150,
      unit: 'ascendiente',
      requirements:
        'No vale si el ascendiente pasa más de 30 días en residencias de la Junta o plazas concertadas. Base general + ahorro hasta 27.000 euros (individual) o 36.000 (conjunta).',
      url: `${D}cuidado-ascendientes-mayores-75-anos.html`,
    },
    {
      id: 'castilla-la-mancha-acogimiento-menores',
      group: 'family',
      title: 'Por acogimiento familiar no remunerado de menores',
      summary:
        'Da 500 euros por el primer menor acogido y 600 euros por el segundo y siguientes, si conviven contigo más de 183 días.',
      kind: 'fixed',
      perChild: [500, 600],
      requirements:
        'Acogimiento acreditado por la Consejería y sin ayudas de la Junta por ello. Base general + ahorro hasta 12.500 euros (individual) o 25.000 (conjunta).',
      url: `${D}acogimiento-familiar-no-remunerado-menores.html`,
    },
    {
      id: 'castilla-la-mancha-acogimiento-mayores-discapacidad',
      group: 'family',
      title: 'Acogimiento de mayores de 65 o personas con discapacidad',
      summary:
        'Da 600 euros por cada persona mayor de 65 años o con discapacidad de 33 % o más que acoges en tu casa más de 183 días sin cobrar.',
      kind: 'fixed',
      amount: 600,
      unit: 'persona acogida',
      requirements:
        'Sin ayudas de la Junta por el acogimiento. Para mayores de 65 no puede ser familiar hasta el 4.º grado. Base general + ahorro hasta 12.500 euros (individual) o 25.000 (conjunta).',
      url: `${D}acogimiento-no-remunerado-mayores-65-discapacidad.html`,
    },
    {
      id: 'castilla-la-mancha-alquiler-menores-36',
      group: 'housing',
      title: 'Alquiler de vivienda habitual para menores de 36 años',
      summary:
        'Deduces el 15 % del alquiler de tu vivienda habitual (máx. 500 euros). En pueblos pequeños, el 20 % con máximo de 612 euros.',
      kind: 'percent',
      percent: 15,
      limit: 500,
      requirements:
        'Menor de 36 años y residente en la región. Base general + ahorro menos mínimo por descendientes hasta 12.500 euros (individual) o 25.000 (conjunta). Hay que poner el NIF del arrendador.',
      url: `${D}arrendamiento-vivienda-habitual-menores-36-anos.html`,
    },
    {
      id: 'castilla-la-mancha-alquiler-dacion-en-pago',
      group: 'housing',
      title: 'Alquiler tras entregar tu casa en dación en pago',
      summary:
        'Deduces el 15 % del alquiler de tu vivienda habitual (máx. 500 euros) si alquilas la casa que entregaste al banco para saldar la hipoteca.',
      kind: 'percent',
      percent: 15,
      limit: 500,
      requirements:
        'Contrato vinculado a la adjudicación de tu vivienda habitual por toda la deuda hipotecaria. Base general + ahorro menos mínimo por descendientes hasta 12.500 euros (individual) o 25.000 (conjunta).',
      url: `${D}arrendamiento-vivienda-habitual-vinculado-dacion-pago.html`,
    },
    {
      id: 'castilla-la-mancha-alquiler-familias-numerosas',
      group: 'housing',
      title: 'Alquiler de vivienda habitual para familias numerosas',
      summary:
        'Deduces el 15 % del alquiler de tu vivienda habitual, hasta 500 euros al año, si eres familia numerosa.',
      kind: 'percent',
      percent: 15,
      limit: 500,
      requirements:
        'Título de familia numerosa vigente. Base general + ahorro menos mínimo por descendientes hasta 12.500 euros (individual) o 25.000 (conjunta). Incompatible con la deducción por familia numerosa.',
      url: `${D}arrendamiento-vivienda-habitual-familias-numerosas.html`,
    },
    {
      id: 'castilla-la-mancha-alquiler-familias-monoparentales',
      group: 'housing',
      title: 'Alquiler de vivienda habitual para familias monoparentales',
      summary:
        'Deduces el 15 % del alquiler de tu vivienda habitual, hasta 500 euros al año, si eres padre o madre de una familia monoparental.',
      kind: 'percent',
      percent: 15,
      limit: 500,
      requirements:
        'Familia monoparental según la ley regional. Base general + ahorro menos mínimo por descendientes hasta 12.500 euros (individual) o 25.000 (conjunta). Incompatible con la deducción por familia monoparental.',
      url: `${D}arrendamiento-vivienda-habitual-familias-monoparentales.html`,
    },
    {
      id: 'castilla-la-mancha-alquiler-discapacidad',
      group: 'housing',
      title: 'Alquiler de vivienda habitual para personas con discapacidad',
      summary:
        'Deduces el 15 % del alquiler de tu vivienda habitual, hasta 500 euros al año, si tienes una discapacidad de 65 % o más.',
      kind: 'percent',
      percent: 15,
      limit: 500,
      requirements:
        'Discapacidad de 65 % o más con derecho al mínimo por discapacidad. Base general + ahorro menos mínimo por descendientes hasta 12.500 euros (individual) o 25.000 (conjunta). Incompatible con la de discapacidad del contribuyente.',
      url: `${D}arrendamiento-vivienda-habitual-personas-discapacidad.html`,
    },
    {
      id: 'castilla-la-mancha-donaciones-cooperacion-pobreza',
      group: 'donations',
      title: 'Donaciones a cooperación, lucha contra la pobreza y discapacidad',
      summary:
        'Deduces el 15 % de lo donado en dinero a ONG y entidades sin fines de lucro dedicadas a cooperación al desarrollo, pobreza, exclusión o ayuda a personas con discapacidad.',
      kind: 'percent',
      percent: 15,
      requirements:
        'La base de la deducción no puede superar el 10 % de tu base liquidable. La entidad debe estar inscrita en los registros de Castilla-La Mancha y certificar la donación.',
      url: `${D}cantidades-donadas-cooperacion-internacional-desarrollo.html`,
    },
    {
      id: 'castilla-la-mancha-donaciones-investigacion',
      group: 'donations',
      title: 'Donaciones para investigación e innovación',
      summary:
        'Deduces el 15 % de lo donado en dinero a la Junta o a entidades sin fines de lucro dedicadas a investigación, desarrollo científico e innovación empresarial.',
      kind: 'percent',
      percent: 15,
      requirements:
        'La deducción no puede superar el 10 % de la cuota íntegra autonómica. La entidad debe estar inscrita en los registros de la región y certificar la aportación.',
      url: `${D}donaciones-finalidad-investigacion-desarrollo-cientifico.html`,
    },
    {
      id: 'castilla-la-mancha-donaciones-patrimonio-cultural',
      group: 'donations',
      title: 'Donaciones y gastos en patrimonio cultural',
      summary:
        'Deduces el 15 % de las donaciones de bienes culturales, de lo gastado en conservar o restaurar patrimonio cultural regional y de lo donado según el plan de mecenazgo cultural.',
      kind: 'percent',
      percent: 15,
      requirements:
        'Bienes inscritos en el Inventario del Patrimonio Cultural de Castilla-La Mancha y entidades receptoras de la región. Incompatible con el crédito fiscal de la Ley de Mecenazgo Cultural.',
      url: `${D}donaciones-conservacion-restauracion-patrimonio-cultural.html`,
    },
    {
      id: 'castilla-la-mancha-intereses-primera-vivienda-menores-40',
      group: 'housing',
      title: 'Intereses de la primera vivienda para menores de 40 años',
      summary:
        'Deduces el 100 % de los intereses del préstamo de tu primera vivienda habitual, con tope de 150 o 100 euros por persona según tu renta.',
      kind: 'special',
      requirements:
        'Menor de 40 años, préstamo a interés variable y base general + ahorro hasta 27.000 euros (individual) o 36.000 (conjunta). Tope de 150 euros hasta 12.500 (25.000 conjunta) y de 100 por encima.',
      url: `${D}gastos-intereses-financiacion-ajena.html`,
    },
    {
      id: 'castilla-la-mancha-residencia-zonas-rurales',
      group: 'housing',
      title: 'Por residir en zonas rurales despobladas',
      summary:
        'Rebaja entre el 10 % y el 25 % de tu cuota íntegra autonómica si vives en un municipio de menos de 5.000 habitantes de zona con despoblación; el porcentaje depende del tipo de zona.',
      kind: 'special',
      requirements:
        'Residencia habitual y estancia efectiva en un municipio incluido en las zonas de la Ley 2/2021. Los porcentajes más altos son para municipios de menos de 2.000 habitantes y zonas de extrema despoblación.',
      url: `${D}residencia-habitual-zonas-rurales.html`,
    },
    {
      id: 'castilla-la-mancha-compra-rehabilitacion-vivienda-rural',
      group: 'housing',
      title: 'Compra o rehabilitación de vivienda habitual en zona rural',
      summary:
        'Deduces el 15 % de lo pagado por comprar o rehabilitar tu vivienda habitual en un municipio pequeño de zona despoblada, con base máxima de 12.000 euros al año.',
      kind: 'percent',
      percent: 15,
      baseLimit: 12000,
      requirements:
        'Municipio de menos de 5.000 habitantes en zona escasamente poblada y compra o rehabilitación desde el 1 de enero de 2021. Base total máxima de 180.000 euros por vivienda.',
      url: `${D}adquisicion-rehabilitacion-vivienda-habitual-zonas-rurales.html`,
    },
    {
      id: 'castilla-la-mancha-traslado-vivienda-habitual',
      group: 'other',
      title: 'Por traslado de vivienda habitual a zona despoblada',
      summary:
        'Da 500 euros por los gastos de trasladar tu residencia habitual por trabajo a un municipio de zona escasamente poblada, el año del traslado y el siguiente.',
      kind: 'fixed',
      amount: 500,
      unit: 'contribuyente que se traslada',
      requirements:
        'Traslado por motivos laborales y permanecer en la nueva residencia el año del traslado y los tres siguientes. Base liquidable por debajo de 22.946 euros (individual) o 31.485 (conjunta).',
      url: `${D}traslado-vivienda-habitual.html`,
    },
    {
      id: 'castilla-la-mancha-inversion-acciones-nuevas-sociedades',
      group: 'other',
      title: 'Inversión en acciones de sociedades nuevas',
      summary:
        'Deduces el 20 % de lo invertido en acciones o participaciones de sociedades nuevas o que amplían capital, con tope de 4.000 euros al año.',
      kind: 'percent',
      percent: 20,
      limit: 4000,
      requirements:
        'Sociedad con domicilio social y fiscal en Castilla-La Mancha y actividad económica. Tu participación no puede pasar del 40 %, debes mantenerla 3 años y no ejercer funciones directivas.',
      url: `${D}inversion-adquisicion-acciones-participaciones.html`,
    },
    {
      id: 'castilla-la-mancha-inversion-economia-social',
      group: 'other',
      title: 'Inversión en entidades de la economía social',
      summary:
        'Deduces el 20 % de lo aportado para ser socio de una entidad de la economía social, con tope de 4.000 euros al año.',
      kind: 'percent',
      percent: 20,
      limit: 4000,
      requirements:
        'Entidad con domicilio social y fiscal en la región y al menos un empleado a jornada completa. Participación máxima del 40 % y mantenerla 5 años. Incompatible con la inversión en acciones para la misma inversión.',
      url: `${D}inversion-entidades-economia-social.html`,
    },
    {
      id: 'castilla-la-mancha-ahorro-primera-vivienda',
      group: 'housing',
      title: 'Ahorro para comprar o construir la primera vivienda',
      summary:
        'Deduces el 15 % de lo que ingreses en una cuenta vivienda para comprar o construir tu primera vivienda habitual en la región, con máximo de 750 euros al año (3.000 en total).',
      kind: 'percent',
      percent: 15,
      limit: 750,
      requirements:
        'Menor de 36 años y base general + ahorro hasta 27.000 euros (individual) o 36.000 (conjunta). Hay que destinar el dinero a la vivienda en menos de 6 años. Solo una cuenta por persona.',
      url: `${D}ahorro-inversion-adquisicion-vivienda-habitual.html`,
    },
    {
      id: 'castilla-la-mancha-perros-asistencia',
      group: 'other',
      title: 'Gastos veterinarios de perros de asistencia',
      summary:
        'Deduces el 30 % de los gastos veterinarios y de vacunación de tu perro de asistencia, con máximo de 100 euros al año.',
      kind: 'percent',
      percent: 30,
      limit: 100,
      requirements:
        'Vinculación con el perro reconocida por la Consejería de bienestar social, facturas de veterinario y gastos no subvencionados. Base general + ahorro hasta 27.000 euros (individual) o 36.000 (conjunta).',
      url: `${D}gastos-derivados-controles-veterinarios-vacunacion.html`,
    },
  ],
};
