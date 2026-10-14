import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-andalucia';

export const andalucia: RentaCcaa = {
  id: 'andalucia',
  name: 'Andalucía',
  regime: 'common',
  scale: [
    { from: 0, rate: 9.5 },
    { from: 13000, rate: 12 },
    { from: 21100, rate: 15 },
    { from: 35200, rate: 18.5 },
    { from: 60000, rate: 22.5 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-autonoma-andalucia.html',
  minimums: {
    personal: 5790,
    descendants: [2510, 2820, 4170, 4700],
    under3: 2920,
    ascendants: 1200,
    ascendantsOver75: 1460,
    over65: 1200,
    over75: 1460,
    disability33: 3130,
    disability65: 9390,
    assistance: 3130,
  },
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/andalucia.html',
  deductions: [
    {
      id: 'andalucia-nacimiento-adopcion-acogimiento',
      group: 'family',
      title: 'Por nacimiento, adopción o acogimiento de hijos',
      summary:
        '200 euros por cada hijo nacido, adoptado o menor acogido en el año (400 si vives en un municipio de menos de 3.000 habitantes). Suma 200 euros más por cada hijo en partos múltiples.',
      kind: 'fixed',
      amount: 200,
      unit: 'hijo',
      requirements:
        'Acogimiento: convivir al menos 90 días y no cobrar ayudas andaluzas por ello. Si son dos contribuyentes, se reparte a partes iguales. Incompatible con la de adopción internacional y la de familia numerosa para los mismos hijos.',
      url: `${BASE}/nacimiento-adopcion-acogimiento.html`,
    },
    {
      id: 'andalucia-adopcion-internacional',
      group: 'family',
      title: 'Por adopción internacional de hijos',
      summary:
        '600 euros por cada hijo adoptado en el extranjero, en el año en que se inscribe la adopción en el Registro Civil.',
      kind: 'fixed',
      amount: 600,
      unit: 'hijo adoptado',
      requirements:
        'Suma de bases imponibles general y del ahorro de hasta 80.000 euros (individual) o 100.000 (conjunta). Si son dos adoptantes se reparte por mitades. Incompatible con la de nacimiento o adopción.',
      url: `${BASE}/adopcion-hijos-ambito-internacional.html`,
    },
    {
      id: 'andalucia-familia-monoparental',
      group: 'family',
      title: 'Para familias monoparentales',
      summary:
        '100 euros para el padre o la madre de familia monoparental, más 100 euros por cada ascendiente mayor de 75 años que conviva con la familia.',
      kind: 'fixed',
      amount: 100,
      unit: 'contribuyente',
      requirements:
        'Bases imponibles (general más ahorro) de hasta 80.000 euros en individual o 100.000 en conjunta. El ascendiente debe dar derecho al mínimo por ascendientes mayores de 75 años.',
      url: `${BASE}/padre-madre-familia-monoparental-ascendientes-anos.html`,
    },
    {
      id: 'andalucia-familia-numerosa',
      group: 'family',
      title: 'Para familias numerosas',
      summary:
        '200 euros si la familia numerosa es de categoría general y 400 euros si es de categoría especial.',
      kind: 'fixed',
      amount: 200,
      unit: 'contribuyente (400 en categoría especial)',
      requirements:
        'Tener el título de familia numerosa a fin de año. Bases imponibles de hasta 25.000 euros (individual) o 30.000 (conjunta). Se reparte entre quienes tengan derecho. Incompatible con la de nacimiento o adopción.',
      url: `${BASE}/familia-numerosa.html`,
    },
    {
      id: 'andalucia-gastos-educativos',
      group: 'family',
      title: 'Por gastos de idiomas e informática de los hijos',
      summary:
        'El 15 % de lo pagado en enseñanza escolar o extraescolar de idiomas y/o informática de tus descendientes, con un máximo de 150 euros por hijo.',
      kind: 'percent',
      percent: 15,
      limit: 150,
      requirements:
        'Descendientes que den derecho al mínimo por descendientes. Bases imponibles de hasta 80.000 euros (individual) o 100.000 (conjunta). Hay que guardar facturas o recibos.',
      url: `${BASE}/gastos-educativos.html`,
    },
    {
      id: 'andalucia-contribuyente-discapacidad',
      group: 'family',
      title: 'Para contribuyentes con discapacidad',
      summary:
        '150 euros por cada contribuyente con un grado de discapacidad reconocido del 33 % o más.',
      kind: 'fixed',
      amount: 150,
      unit: 'contribuyente',
      requirements:
        'Bases imponibles de hasta 25.000 euros (individual) o 30.000 (conjunta). En conjunta, para un hijo con discapacidad solo se aplica la de asistencia a personas con discapacidad, no esta.',
      url: `${BASE}/contribuyentes-discapacidad.html`,
    },
    {
      id: 'andalucia-conyuge-discapacidad',
      group: 'family',
      title: 'Por cónyuge o pareja con discapacidad',
      summary:
        '100 euros si tu cónyuge o pareja de hecho tiene una discapacidad del 65 % o más y no presenta declaración individual.',
      kind: 'fixed',
      amount: 100,
      unit: 'cónyuge o pareja',
      requirements:
        'Bases imponibles de hasta 25.000 euros (individual) o 30.000 (conjunta). Pareja de hecho inscrita. No se aplica si el cónyuge ya usó la deducción por discapacidad del contribuyente.',
      url: `${BASE}/contribuyentes-conyuges-parejas-hecho-discapacidad.html`,
    },
    {
      id: 'andalucia-asistencia-discapacidad',
      group: 'family',
      title: 'Por asistencia a personas con discapacidad',
      summary:
        '100 euros por cada familiar con discapacidad que dé derecho al mínimo por discapacidad. Además, el 20 % de la cuota de la Seguridad Social del empleado del hogar que lo atiende (máx. 500 euros).',
      kind: 'special',
      amount: 100,
      unit: 'persona con discapacidad',
      requirements:
        'Bases imponibles de hasta 80.000 euros (individual) o 100.000 (conjunta). El extra de 500 euros exige que la persona necesite ayuda de terceros y que seas titular del hogar en la Seguridad Social. Incompatible con ayuda doméstica por el mismo empleado.',
      url: `${BASE}/asistencia-personas-discapacidad.html`,
    },
    {
      id: 'andalucia-ayuda-domestica',
      group: 'family',
      title: 'Por ayuda doméstica',
      summary:
        'El 20 % de la cuota de la Seguridad Social que pagas como empleador por un empleado del hogar, con un máximo de 500 euros.',
      kind: 'percent',
      percent: 20,
      limit: 500,
      requirements:
        'Tener hijos que den derecho al mínimo por descendientes, trabajar ambos cónyuges (o la pareja) y ser el titular del hogar en la Seguridad Social. Lo cumple también quien tenga 75 años o más. Incompatible con la de asistencia por el mismo empleado.',
      url: `${BASE}/ayuda-domestica.html`,
    },
    {
      id: 'andalucia-vivienda-protegida-jovenes',
      group: 'housing',
      title: 'Por vivienda habitual protegida o de jóvenes',
      summary:
        'El 6 % de lo pagado por comprar o rehabilitar tu vivienda habitual si es protegida o si eres menor de 35 años.',
      kind: 'percent',
      percent: 6,
      baseLimit: 9040,
      requirements:
        'Vivienda protegida o comprador menor de 35 años. Bases imponibles de hasta 25.000 euros (individual) o 30.000 (conjunta). Régimen transitorio de la normativa de 2012: base máxima de 9.040 euros.',
      url: `${BASE}/inversion-vivienda-habitual-protegida-personas-jovenes.html`,
    },
    {
      id: 'andalucia-alquiler-vivienda-habitual',
      group: 'housing',
      title: 'Por alquiler de la vivienda habitual',
      summary:
        'El 15 % del alquiler pagado, hasta 1.200 euros al año (1.500 si tienes discapacidad). Para menores de 35, mayores de 65, personas con discapacidad o víctimas de violencia o terrorismo.',
      kind: 'percent',
      percent: 15,
      limit: 1200,
      requirements:
        'Cumplir uno de esos perfiles. Bases imponibles de hasta 25.000 euros (individual) o 30.000 (conjunta). Hay que indicar el NIF del arrendador y ser titular del contrato.',
      url: `${BASE}/cantidades-invertidas-alquiler-vivienda-habitual.html`,
    },
    {
      id: 'andalucia-donativos-ecologicos',
      group: 'donations',
      title: 'Por donativos con finalidad ecológica',
      summary:
        'El 10 % de lo donado a entidades andaluzas de defensa del medio ambiente, con un máximo de 150 euros.',
      kind: 'percent',
      percent: 10,
      limit: 150,
      requirements:
        'La entidad debe ser pública andaluza o una entidad sin fines lucrativos inscrita en Andalucía cuyo fin exclusivo sea el medio ambiente. Necesitas el certificado de la donación.',
      url: `${BASE}/donativos-finalidad-ecologica.html`,
    },
    {
      id: 'andalucia-acciones-participaciones',
      group: 'other',
      title: 'Por invertir en sociedades nuevas',
      summary:
        'El 20 % de lo invertido en acciones o participaciones de sociedades andaluzas nuevas (máx. 4.000 euros); el 50 % si son sociedades de universidades o centros de investigación (máx. 12.000).',
      kind: 'special',
      percent: 20,
      limit: 4000,
      requirements:
        'No superar el 40 % del capital (con familiares), mantener la inversión 3 años, no ser directivo ni empleado, formalizarlo en escritura pública y que la sociedad tenga sede en Andalucía y cree empleo.',
      url: `${BASE}/inversion-adquisicion-acciones-participaciones-sociales.html`,
    },
    {
      id: 'andalucia-defensa-juridica-laboral',
      group: 'other',
      title: 'Por defensa jurídica de la relación laboral',
      summary:
        'Lo pagado en gastos de defensa jurídica en juicios por despido, extinción de contrato o reclamación de cantidades, hasta 200 euros.',
      kind: 'percent',
      percent: 100,
      limit: 200,
      requirements:
        'Procedimientos judiciales laborales (despido, extinción de contrato, reclamación de cantidades). Límite de 200 euros, tanto en individual como en conjunta. Conserva los justificantes.',
      url: `${BASE}/gastos-defensa-juridica-relacion-laboral.html`,
    },
    {
      id: 'andalucia-ejercicio-fisico-deporte',
      group: 'other',
      title: 'Por fomentar el ejercicio físico y el deporte',
      summary:
        'El 15 % de las cuotas de gimnasios, clubes, centros deportivos o federaciones para ti, tu pareja y tus familiares a cargo, con un máximo de 100 euros por contribuyente.',
      kind: 'percent',
      percent: 15,
      limit: 100,
      requirements:
        'Haber pagado tú las cuotas. Aplica a ti, tu cónyuge o pareja inscrita y quienes den derecho a mínimos por descendientes o ascendientes. Conserva los justificantes.',
      url: `${BASE}/fomentar-ejercicio-fisico-practica-deportiva.html`,
    },
    {
      id: 'andalucia-gastos-veterinarios',
      group: 'other',
      title: 'Por gastos veterinarios de mascotas y perros de asistencia',
      summary:
        'El 30 % de vacunas, desparasitación, tratamientos obligatorios y esterilización preceptiva de tu animal de compañía o perro de asistencia, con un máximo de 100 euros.',
      kind: 'percent',
      percent: 30,
      limit: 100,
      requirements:
        'Gastos pagados desde el 1 de enero de 2025. Solo el año siguiente a la compra (tres años si adoptas; toda la vida del perro de asistencia). Bases imponibles de hasta 80.000 euros (individual) o 100.000 (conjunta).',
      url: `${BASE}/gastos-veterinarios-derivados-adquisicion-animales-compania.html`,
    },
    {
      id: 'andalucia-enfermedad-celiaca',
      group: 'family',
      title: 'Para familias con enfermedad celíaca',
      summary:
        '100 euros por cada persona de tu núcleo familiar con enfermedad celíaca diagnosticada (tú, tu pareja y quienes te dan derecho a mínimos familiares).',
      kind: 'fixed',
      amount: 100,
      unit: 'persona con celiaquía',
      requirements:
        'Diagnóstico definitivo acreditado con informe médico oficial de la sanidad pública o de la aseguradora privada. Si varios contribuyentes tienen derecho por la misma persona, se reparte a partes iguales.',
      url: `${BASE}/familias-enfermedad-celiaca-diagnosticada.html`,
    },
  ],
};
