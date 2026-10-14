import type { RentaCcaa } from '../../../domain/rentaData';

const BASE =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-rioja';

export const laRioja: RentaCcaa = {
  id: 'la-rioja',
  name: 'La Rioja',
  regime: 'common',
  scale: [
    { from: 0, rate: 8 },
    { from: 12450, rate: 10.6 },
    { from: 20200, rate: 13.6 },
    { from: 35200, rate: 17.8 },
    { from: 40000, rate: 18.3 },
    { from: 50000, rate: 19 },
    { from: 60000, rate: 24.5 },
    { from: 120000, rate: 27 },
  ],
  scaleSource:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/comunidad-autonoma-rioja.html',
  // La Rioja solo fija el mínimo por discapacidad de DESCENDIENTES (no el del contribuyente ni el de ascendientes).
  // El extra de asistencia no cambia: 3.000 euros, el del Estado.
  minimums: {
    descendantDisability33: 3300,
    descendantDisability65: 9900,
  },
  source:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/guia-deducciones-autonomicas/rioja.html',
  deductions: [
    {
      id: 'la-rioja-nacimiento-adopcion',
      group: 'family',
      title: 'Por nacimiento o adopción de hijos',
      summary:
        'Importe fijo por hijo nacido o adoptado en el año: 600 euros el primero, 750 el segundo y 900 el tercero y siguientes; 60 euros más por hijo en partos o adopciones múltiples.',
      kind: 'fixed',
      perChild: [600, 750, 900],
      requirements:
        'El hijo convive contigo a 31 de diciembre. Si hay dos progenitores en declaraciones separadas, se reparte al 50 %; en conjunta se aplica entero. El orden cuenta todos tus hijos, vivan o no contigo.',
      url: `${BASE}/nacimiento-adopcion-hijos.html`,
    },
    {
      id: 'la-rioja-gastos-escuelas-infantiles-pequenos-municipios',
      group: 'family',
      title: 'Escuela infantil 0-3 años en pequeño municipio',
      summary:
        'Devuelve el 30 % de lo pagado en escuela infantil o cuidador de hijos de 0 a 3 años si vives en un municipio pequeño de La Rioja, hasta 600 euros por menor.',
      kind: 'percent',
      percent: 30,
      limit: 600,
      requirements:
        'Fijar la residencia en un pequeño municipio de la lista oficial y vivir allí a fin de año, convivir con el menor y tener derecho al mínimo por descendientes. El límite se reparte entre progenitores.',
      url: `${BASE}/gastos-escuelas-infantiles-centros-infantiles-contratado.html`,
    },
    {
      id: 'la-rioja-acogimiento-menores',
      group: 'family',
      title: 'Por acoger a un menor',
      summary:
        'Da 300 euros por cada menor en acogimiento familiar o guarda con fines de adopción que conviva contigo 183 días o más; 150 euros si convive entre 90 y 183 días.',
      kind: 'fixed',
      amount: 300,
      unit: 'menor acogido',
      requirements:
        'Acogimiento formalizado por el órgano competente de La Rioja. Con declaraciones individuales, cada uno aplica el 50 %. Se suman las estancias cortas de varios menores.',
      url: `${BASE}/menor-regimen-acogimiento-familiar-urgencia.html`,
    },
    {
      id: 'la-rioja-hijo-0-3-residentes-pequenos-municipios',
      group: 'family',
      title: 'Hijos de 0-3 años en pequeño municipio',
      summary:
        'Da 100 euros al mes por cada hijo de 0 a 3 años si vives o te trasladas a un pequeño municipio riojano y te quedas allí al menos tres años.',
      kind: 'fixed',
      amount: 100,
      unit: 'mes y hijo de 0 a 3 años',
      requirements:
        'Cada fin de mes debes residir en un pequeño municipio de la lista y tener un hijo de 0 a 3 años con derecho a mínimo por descendientes. Mantener la residencia 3 años; si no, hay que devolverla.',
      url: `${BASE}/hijo-0-3-anos-residentes-municipios.html`,
    },
    {
      id: 'la-rioja-hijo-0-3-escuelas-infantiles',
      group: 'family',
      title: 'Escuela infantil 0-3 años (toda La Rioja)',
      summary:
        'Devuelve el 20 % de los gastos de escolarización no subvencionados de cada hijo de 0 a 3 años, hasta 600 euros por hijo, en cualquier municipio de La Rioja.',
      kind: 'percent',
      percent: 20,
      limit: 600,
      requirements:
        'Hijo matriculado en una escuela infantil riojana, conviviendo contigo y con derecho a mínimo por descendientes. Base liquidable general de hasta 18.030 € (individual) o 30.050 € (conjunta) y ahorro hasta 1.800 €.',
      url: `${BASE}/hijo-0-3-anos-escuelas-inf.html`,
    },
    {
      id: 'la-rioja-enfermos-ela',
      group: 'family',
      title: 'Por gastos de ELA',
      summary:
        'Devuelve el 50 % de los gastos de diagnóstico y tratamiento de la esclerosis lateral amiotrófica, con un máximo de 2.000 euros al año.',
      kind: 'percent',
      percent: 50,
      limit: 2000,
      requirements:
        'Servicios y tratamientos de profesionales sanitarios o para paliar síntomas, del contribuyente, su cónyuge o personas que den derecho a mínimos. Factura completa u ordinaria (no simplificada).',
      url: `${BASE}/destinada-enfermos-ela.html`,
    },
    {
      id: 'la-rioja-enfermedad-celiaca',
      group: 'family',
      title: 'Por enfermedad celíaca',
      summary:
        'Da 250 euros por cada persona de tu núcleo familiar (tú, tu cónyuge y quienes te dan derecho a mínimos) con enfermedad celíaca diagnosticada.',
      kind: 'fixed',
      amount: 250,
      unit: 'persona celíaca',
      requirements:
        'Certificado médico con diagnóstico definitivo de un médico en activo con número de colegiado. Si dos contribuyentes tienen derecho por la misma persona, se reparte a partes iguales.',
      url: `${BASE}/enfermedad-celiaca-diagnosticada.html`,
    },
    {
      id: 'la-rioja-fomento-ejercicio-fisico',
      group: 'other',
      title: 'Por deporte y ejercicio físico',
      summary:
        'Devuelve el 30 % de lo gastado en gimnasios, instalaciones, clases deportivas o licencias federativas riojanas (100 % si eres mayor de 65 o tienes discapacidad), hasta 300 euros.',
      kind: 'percent',
      percent: 30,
      limit: 300,
      requirements:
        'Servicios prestados en La Rioja a ti, tu cónyuge o personas que den derecho a mínimos. Factura completa u ordinaria (no simplificada). Con varios contribuyentes, gasto y límite se reparten.',
      url: `${BASE}/fomentar-ejercicio-fisico-practica-deportiva.html`,
    },
    {
      id: 'la-rioja-acceso-internet-jovenes',
      group: 'other',
      title: 'Internet para jóvenes emancipados',
      summary:
        'Menores de 36 años: 30 % del gasto anual en Internet de su vivienda habitual (40 % si son familia monoparental o viven en pequeños municipios).',
      kind: 'percent',
      percent: 30,
      requirements:
        'Contrato nuevo de alta de Internet a tu nombre, firmado al menos 6 meses antes de fin de año y mantenido. Vivienda habitual en propiedad o alquiler, sin actividad económica. Una vez por vivienda y contribuyente.',
      url: `${BASE}/acceso-internet-jovenes-emancipados.html`,
    },
    {
      id: 'la-rioja-suministro-luz-gas-jovenes',
      group: 'other',
      title: 'Luz y gas para jóvenes emancipados',
      summary:
        'Menores de 36 años: 15 % del gasto anual en luz o gas de su vivienda habitual (20 % en pequeños municipios; 25 % si son familia monoparental).',
      kind: 'percent',
      percent: 15,
      requirements:
        'Contrato de suministro a tu nombre para tu vivienda habitual, en propiedad o alquiler. Se aplica una vez por vivienda y contribuyente. En pequeños municipios, indicar el código del municipio.',
      url: `${BASE}/suministro-luz-gas-uso-domestico-emancipados.html`,
    },
    {
      id: 'la-rioja-fijacion-poblacion-medio-rural',
      group: 'other',
      title: 'Por iniciar actividad agraria en el medio rural',
      summary:
        'Da 1.000 euros a quien empiece una actividad agraria por cuenta propia en 2025 o después y viva en La Rioja; se aplica el año de alta y los dos siguientes.',
      kind: 'fixed',
      amount: 1000,
      unit: 'contribuyente y año',
      requirements:
        'Alta como autónomo agrario desde el 1 de enero de 2025. No vale para autónomos colaboradores ni socios de sociedades de capital, ni si cesaste otra actividad agraria en los 2 años anteriores. Mantener residencia y actividad.',
      url: `${BASE}/fomentar-fijacion-poblacion-ocupada-medio-rural.html`,
    },
    {
      id: 'la-rioja-cuotas-organizaciones-agrarias',
      group: 'other',
      title: 'Cuotas de organizaciones agrarias',
      summary:
        'Devuelve el 100 % de las cuotas pagadas a organizaciones profesionales agrarias, con un máximo de 100 euros al año por contribuyente.',
      kind: 'percent',
      percent: 100,
      limit: 100,
      requirements:
        'Organización constituida al amparo de la Ley 19/1977. Se justifica con certificado de la organización de las cuotas del año.',
      url: `${BASE}/cuotas-satisfechas-organizaciones-profesionales-agrarias.html`,
    },
    {
      id: 'la-rioja-vehiculos-electricos-nuevos',
      group: 'other',
      title: 'Por comprar un vehículo eléctrico nuevo',
      summary:
        'Devuelve el 15 % del precio de un vehículo eléctrico nuevo (furgoneta ligera, ciclomotor, triciclo o bicicleta eléctrica), una sola vez por persona.',
      kind: 'percent',
      percent: 15,
      requirements:
        'Precio de compra de hasta 50.000 €, sin uso profesional ni empresarial. Solo el comprador que figure en la factura, en el año de matriculación. Un vehículo por persona.',
      url: `${BASE}/adquisicion-vehiculos-electricos-nuevos.html`,
    },
    {
      id: 'la-rioja-bicicletas-pedaleo-no-asistido',
      group: 'other',
      title: 'Por comprar una bicicleta',
      summary:
        'Devuelve el 15 % del precio de una bicicleta de pedaleo no asistido, hasta 50 euros por bici y un máximo de 2 por unidad familiar.',
      kind: 'percent',
      percent: 15,
      limit: 50,
      requirements:
        'Solo la aplica quien figure en la factura. Si hay varios titulares, el gasto y el límite se reparten. En gananciales con declaración individual, se atribuye al 50 %.',
      url: `${BASE}/adquisicion-bicicletas-pedaleo-no-asistido.html`,
    },
    {
      id: 'la-rioja-inversion-vivienda-jovenes',
      group: 'housing',
      title: 'Por vivienda habitual (menores de 36 años)',
      summary:
        'Menores de 36 años: 15 % de lo pagado por comprar, construir, ampliar o rehabilitar su vivienda habitual en La Rioja, sobre un máximo de 9.000 euros al año.',
      kind: 'percent',
      percent: 15,
      baseLimit: 9000,
      requirements:
        'Menor de 36 años a fin de año. Vivienda adquirida o rehabilitación iniciada desde el 1 de enero de 2013. Base liquidable general de hasta 18.030 € (individual) o 30.050 € (conjunta) y ahorro hasta 1.800 €.',
      url: `${BASE}/inversion-vivienda-habitual-jovenes-menores-anos.html`,
    },
    {
      id: 'la-rioja-arrendamiento-menores-36',
      group: 'housing',
      title: 'Alquiler de vivienda habitual (menores de 36)',
      summary:
        'Menores de 36 años: 10 % del alquiler de su vivienda habitual, hasta 300 euros por contrato; 20 % y hasta 400 euros si vive en un pequeño municipio.',
      kind: 'percent',
      percent: 10,
      limit: 300,
      requirements:
        'Menor de 36 años a fin de año (uno de los cónyuges en conjunta). Contrato con el impuesto de transmisiones presentado y vivienda en La Rioja. Sin deducción por inversión en vivienda. Base liquidable general de hasta 18.030 € / 30.050 €.',
      url: `${BASE}/arrendamiento-vivienda-habitual-menores-36-anos.html`,
    },
    {
      id: 'la-rioja-vivienda-pequenos-municipios',
      group: 'housing',
      title: 'Vivienda habitual en pequeño municipio',
      summary:
        'Devuelve el 5 % de lo pagado por comprar, construir o rehabilitar tu vivienda habitual en un pequeño municipio riojano, hasta 452 euros por declaración.',
      kind: 'percent',
      percent: 5,
      baseLimit: 9040,
      limit: 452,
      requirements:
        'Residir en La Rioja y haber comprado, rehabilitado o iniciado la obra desde el 1 de enero de 2017. Vivienda en un municipio de la lista oficial. Hace falta que tu patrimonio aumente al menos lo invertido.',
      url: `${BASE}/adquisicion-construccion-rehabilitacion-vivienda-habitual.html`,
    },
    {
      id: 'la-rioja-segunda-vivienda-medio-rural',
      group: 'housing',
      title: 'Segunda vivienda en el medio rural',
      summary:
        'Devuelve el 8 % de lo invertido en una segunda vivienda rural en otro municipio distinto del de tu vivienda habitual, hasta 450,76 euros al año.',
      kind: 'percent',
      percent: 8,
      limit: 450.76,
      baseLimit: 9040,
      requirements:
        'Solo para quien compró antes del 1 de enero de 2013, o pagó obras antes de esa fecha terminadas antes de 2017. Municipio incluido en la lista oficial. Una única segunda vivienda; sigue las reglas estatales de 2012.',
      url: `${BASE}/adquisicion-rehabilitacion-segunda-vivienda-medio-rural.html`,
    },
    {
      id: 'la-rioja-intereses-prestamos-vivienda',
      group: 'housing',
      title: 'Por subida de intereses de la hipoteca',
      summary:
        'Devuelve el 15 % de los intereses de la hipoteca de tu vivienda habitual, sobre un máximo de 5.000 euros al año por vivienda. Aplicable en 2023, 2024 y 2025.',
      kind: 'percent',
      percent: 15,
      baseLimit: 5000,
      requirements:
        'Vivienda en La Rioja adquirida desde el 1 de enero de 2013. Incompatible con las deducciones riojanas de pequeños municipios y de jóvenes por vivienda, y con la estatal por inversión en vivienda habitual.',
      url: `${BASE}/paliar-subida-intereses-prestamos-destinados-habitual.html`,
    },
    {
      id: 'la-rioja-adquisicion-vivienda-jovenes',
      group: 'housing',
      title: 'Compra de vivienda (jóvenes, régimen antiguo)',
      summary:
        'Menores de 36 años que ya compraron antes de 2013: 3 % de lo pagado, o 5 % si la base liquidable general es baja (hasta 18.030 € individual, 30.050 € conjunta).',
      kind: 'special',
      requirements:
        'Solo quien compró antes del 1 de enero de 2013 o pagó entonces la construcción (obras terminadas en 4 años). Ahorro hasta 1.800 € para el 5 %. Sigue los criterios del régimen transitorio estatal.',
      url: `${BASE}/cantidades-invertidas-adquisicion-construccion___.html`,
    },
    {
      id: 'la-rioja-obras-rehabilitacion-vivienda',
      group: 'housing',
      title: 'Obras de rehabilitación de vivienda habitual',
      summary:
        'Menores de 36 años: 5 % (7 % con base baja) de lo pagado en rehabilitar la vivienda habitual; 2 % para el resto. Solo obras pagadas antes de 2013.',
      kind: 'special',
      requirements:
        'Haber pagado la rehabilitación antes del 1 de enero de 2013 y terminarla antes de 2017, y haber practicado la deducción antes de 2013. El 7 % exige base general hasta 18.030 € (30.050 € conjunta) y ahorro hasta 1.800 €.',
      url: `${BASE}/cantidades-invertidas-obras-rehabilitacion.html`,
    },
    {
      id: 'la-rioja-obras-adecuacion-discapacidad',
      group: 'housing',
      title: 'Obras de adecuación por discapacidad',
      summary:
        'Devuelve el 15 % de lo pagado en adaptar la vivienda habitual de una persona con discapacidad, dentro de un tope común con la rehabilitación de 9.040 euros.',
      kind: 'percent',
      percent: 15,
      baseLimit: 9040,
      requirements:
        'Solo obras pagadas antes de 2013 y terminadas antes de 2017, por quien ya aplicó la deducción de vivienda antes de 2013. Vivienda en La Rioja e informe técnico que certifique las obras.',
      url: `${BASE}/obras-adecuacion-vivienda-habitual-discapacidad.html`,
    },
    {
      id: 'la-rioja-donaciones-fomento-mecenazgo',
      group: 'donations',
      title: 'Donaciones de mecenazgo (actividades de interés)',
      summary:
        'Devuelve el 15 % de lo donado a actividades culturales, científicas, deportivas o de interés general de la Ley de Mecenazgo riojana, hasta 500 euros al año.',
      kind: 'percent',
      percent: 15,
      limit: 500,
      requirements:
        'Límite de 500 € compartido con la deducción de bienes de interés cultural; el conjunto de mecenazgo no supera el 30 % de la cuota autonómica. Incompatible con el crédito fiscal de mecenazgo.',
      url: `${BASE}/donaciones-promocion-estimulo-activs-fomento-mecenazgo.html`,
    },
    {
      id: 'la-rioja-donaciones-bienes-interes-cultural',
      group: 'donations',
      title: 'Donaciones a bienes de interés cultural',
      summary:
        'Devuelve el 15 % de lo donado para investigar, conservar, restaurar o adquirir bienes de interés cultural del patrimonio histórico de La Rioja, hasta 500 euros.',
      kind: 'percent',
      percent: 15,
      limit: 500,
      requirements:
        'Bienes en La Rioja de la Administración regional o declarados de interés cultural. Límite de 500 € conjunto con la de fomento del mecenazgo. Incompatible con las deducciones de empresas culturales y de autores.',
      url: `${BASE}/donaciones-invest-conserv-restaur-adq-rioja.html`,
    },
    {
      id: 'la-rioja-donaciones-empresas-culturales',
      group: 'donations',
      title: 'Donaciones a empresas culturales',
      summary:
        'Devuelve el 20 % de lo donado a pequeñas empresas culturales riojanas (cine, música, artes, libro, folclore, artesanía...), hasta 500 euros al año.',
      kind: 'percent',
      percent: 20,
      limit: 500,
      requirements:
        'Empresa con domicilio fiscal en La Rioja y fondos propios inferiores a 300.000 €. Incompatible con las deducciones de fomento del mecenazgo y de bienes de interés cultural.',
      url: `${BASE}/donaciones-empresas-culturales.html`,
    },
    {
      id: 'la-rioja-donacion-bienes-culturales-autores',
      group: 'donations',
      title: 'Donación de obras por sus autores',
      summary:
        'Si eres autor o heredero y donas bienes culturales a instituciones riojanas, deduces el 20 % de su valoración, con un máximo de 500 euros al año.',
      kind: 'percent',
      percent: 20,
      limit: 500,
      requirements:
        'Bienes culturales de calidad garantizada aceptados por la Consejería de Cultura. Vale también usufructo o depósito temporal gratuito. Incompatible con las otras dos deducciones de mecenazgo cultural.',
      url: `${BASE}/donacion-bienes-culturales-x-autores-herederos.html`,
    },
    {
      id: 'la-rioja-patrimonio-historico-titulares',
      group: 'donations',
      title: 'Conservar bienes del patrimonio histórico',
      summary:
        'Devuelve el 15 % de lo que gastes en investigar, conservar o restaurar bienes tuyos del patrimonio histórico de La Rioja, hasta 500 euros al año.',
      kind: 'percent',
      percent: 15,
      limit: 500,
      requirements:
        'Bienes de tu propiedad o usufructo inscritos en el Registro del Patrimonio Cultural de La Rioja. No vale para inversiones empresariales. La cuota autonómica no puede quedar negativa.',
      url: `${BASE}/cantidades-invest-conserv-restaur-rehab-historico.html`,
    },
  ],
};
