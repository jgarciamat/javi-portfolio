import type { Guide } from './guides';

const CHECK =
  'Las cifras de esta guía son orientativas y corresponden al ejercicio 2025 (la campaña de la Renta de 2026), según los datos publicados por la Agencia Tributaria. Pueden tener excepciones según tu caso, así que contrástalas siempre en la sede de la AEAT o con tu gestor antes de presentar tu declaración.';

/** Guides about the income tax return for families: child deductions, reading the draft and the result. */
export const GUIDES_RENTA_FAMILIA: Guide[] = [
  {
    slug: 'deduccion-maternidad-modelo-140',
    title: 'Deducción por maternidad y modelo 140: cuánto es y cómo cobrarla cada mes',
    description:
      'Cuánto se deduce por cada hijo menor de 3 años, quién tiene derecho, cómo se suma la ayuda de guardería y cómo pedir el abono mensual con el modelo 140.',
    intro:
      'La deducción por maternidad es una de las ayudas fiscales más conocidas para madres con hijos pequeños. Además, puedes cobrarla mes a mes sin esperar a la declaración de la Renta.',
    sections: [
      {
        heading: '¿Cuánto es la deducción por maternidad?',
        paragraphs: [
          'Puedes deducir hasta 1.200 € al año por cada hijo menor de 3 años, que equivalen a 100 € por cada mes en que se cumplen los requisitos. En el mes en que se cumplen 30 días cotizados tras el parto el cómputo se amplía en 150 €, por lo que el máximo en ese caso es de 1.350 €.',
          'Es una deducción abonable: si tu cuota de IRPF es menor que la deducción, Hacienda te abona la diferencia. No necesitas tener un impuesto que pagar para beneficiarte.',
        ],
      },
      {
        heading: '¿Quién tiene derecho?',
        paragraphs: [
          'Debe ser la madre, con derecho al mínimo por descendientes de ese hijo, y en alguna de estas situaciones: cobrar una prestación por desempleo, o estar dada de alta en la Seguridad Social o en una mutualidad alternativa en el momento del nacimiento. También puede reclamarla después, cuando acumula 30 días cotizados.',
          'No cuentan los meses en que se cobra el complemento de ayuda para la infancia. Solo el padre puede aplicarla si la madre fallece o si la custodia le corresponde en exclusiva.',
        ],
      },
      {
        heading: '¿Qué ayuda adicional hay por la guardería?',
        paragraphs: [
          'Si tienes derecho a la deducción por maternidad y pagas guardería o un centro de educación infantil autorizado, puedes sumar hasta 1.000 € al año por hijo menor de 3 años, que son 83,33 € por cada mes completo pagado. También es abonable.',
          'El tope es lo que realmente has pagado por matrícula, asistencia y comida, una vez restadas las subvenciones y lo que la empresa haya pagado como retribución exenta. Se aplica hasta el mes anterior a que el niño empiece el segundo ciclo de infantil.',
        ],
      },
      {
        heading: '¿Qué es el modelo 140 y cómo se pide?',
        paragraphs: [
          'El modelo 140 es la solicitud del abono anticipado de la deducción por maternidad. En lugar de esperar a la declaración, Hacienda ingresa 100 € cada mes en tu cuenta bancaria, y la guardería se solicita aparte.',
          'Se tramita en la sede electrónica de la Agencia Tributaria con certificado, Cl@ve o los medios que ofrezca ese año. Los pagos cobrados se regularizan después en la declaración: si cobraste de más, devuelves la diferencia; si cobraste de menos, la recuperas en la Renta.',
        ],
      },
      {
        heading: '¿Qué otras ayudas puedo sumar?',
        paragraphs: [
          'Por tener un hijo menor de 3 años, el mínimo por descendientes se incrementa en 2.800 €, lo que reduce todavía más lo que tributas. Y en muchas comunidades hay deducciones propias por nacimiento. En Castilla y León, por ejemplo, son de 1.010 € por el primer hijo, 1.475 € por el segundo y 2.351 € por el tercero y siguientes; en la Comunitat Valenciana, de 600 €, 750 € y 900 €.',
          'Si tienes una familia numerosa, mira también la guía de [familia numerosa y modelo 143](/guias/familia-numerosa-deduccion-modelo-143). Las deducciones de cada región están explicadas en las guías de [Castilla y León](/guias/deducciones-renta-castilla-y-leon) y de la [Comunitat Valenciana](/guias/deducciones-renta-comunitat-valenciana).',
        ],
      },
      {
        heading: 'Un ejemplo con números',
        paragraphs: [
          'Una madre trabajadora de alta en la Seguridad Social tiene un hijo de 2 años durante todo el año. Cumple los requisitos los doce meses, así que la deducción es de 100 € por mes, 1.200 € en total. Si además paga la guardería del niño los 12 meses completos, puede sumar hasta 1.000 € más, siempre que no supere lo realmente pagado. Si la cuota de su IRPF es de 700 €, la deducción cubre la cuota y Hacienda le abona la diferencia.',
        ],
      },
      {
        heading: 'Errores frecuentes',
        paragraphs: [
          'Olvidar restar las subvenciones de la guardería, contar meses en los que cobras el complemento de ayuda para la infancia o pagar la guardería en efectivo y sin factura. Conviene guardar los recibos mensuales con el nombre del centro, su autorización y el del niño.',
        ],
      },
      {
        heading: 'Cómo comprobar tu caso con Money Manager',
        paragraphs: [
          'En la calculadora de la Renta puedes añadir a tus hijos, elegir tu comunidad y marcar las deducciones. Para cada una te explica los requisitos y, cuando se puede cobrar por adelantado, te enseña el enlace para pedir el modelo que corresponda. Si quieres entender el resultado final, lee [si te sale a pagar o a devolver](/guias/renta-a-pagar-o-a-devolver).',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'familia-numerosa-deduccion-modelo-143',
      'renta-a-pagar-o-a-devolver',
      'deducciones-renta-castilla-y-leon',
      'deducciones-renta-comunitat-valenciana',
    ],
  },
  {
    slug: 'familia-numerosa-deduccion-modelo-143',
    title: 'Familia numerosa en la Renta: deducción y modelo 143 para cobrarla por adelantado',
    description:
      'Cuánto se deduce por familia numerosa general y especial, el incremento por cada hijo de más, otras deducciones del modelo 143 y ayudas de comunidades.',
    intro:
      'Si tienes título de familia numerosa, la Renta te reconoce una deducción que también puedes cobrar mes a mes. El trámite es el modelo 143 y sirve para más situaciones familiares de las que parece.',
    sections: [
      {
        heading: '¿Cuánto se deduce por familia numerosa?',
        paragraphs: [
          'Con categoría general, hasta 1.200 € al año. Con categoría especial, hasta 2.400 €, es decir, el doble. No se suman: eliges la que corresponde a tu título.',
          'A cualquiera de las dos se añade un incremento de hasta 600 € al año por cada hijo que supere el número mínimo exigido para tu categoría. Es decir, si tu familia tiene más hijos de los necesarios para ser numerosa, cada uno de más suma esa cantidad.',
        ],
      },
      {
        heading: '¿Quién puede aplicarla?',
        paragraphs: [
          'Los ascendientes (o hermanos huérfanos) de la familia numerosa, con el título vigente o prueba equivalente según la Ley 40/2003. Además, debes estar de alta en la Seguridad Social o mutualidad, o cobrar una prestación por desempleo o una pensión contributiva o asistencial.',
          'Si trabajas, el importe de la deducción tiene como tope las cotizaciones a la Seguridad Social que hayas pagado en el año. En la categoría especial, ese tope solo afecta a los primeros 1.200 €, y en el incremento por hijos de más no se aplica.',
          'Si la piden los dos progenitores, se reparte entre ellos. Se cuenta mes a mes, y el número de hijos se mira el último día de cada mes.',
        ],
      },
      {
        heading: '¿Qué otras deducciones incluye el modelo 143?',
        paragraphs: [
          'El mismo trámite sirve para otras tres deducciones de hasta 1.200 € al año, también abonables: por hijo con discapacidad a cargo, por ascendiente con discapacidad a cargo y por cónyuge con discapacidad a cargo. Se exige una discapacidad de al menos el 33 % y que la persona dependa de ti según las reglas de cada caso.',
          'También cubre la deducción de hasta 1.200 € para madres y padres separados legalmente, o sin vínculo matrimonial, con dos hijos y sin derecho a alimentos. Es incompatible con la de familia numerosa.',
        ],
      },
      {
        heading: '¿Cómo funciona el modelo 143?',
        paragraphs: [
          'Es la solicitud del abono anticipado: Hacienda ingresa mensualmente la parte que corresponde a cada deducción, en doce pagos, en lugar de esperar al resultado de la declaración. También permite, en algunos casos, ceder el derecho a otro miembro de la familia.',
          'Se pide en la sede electrónica de la Agencia Tributaria. Si tus circunstancias cambian durante el año, hay que comunicarlo, y todo se regulariza en la declaración anual.',
        ],
      },
      {
        heading: '¿Y las ayudas de mi comunidad?',
        paragraphs: [
          'Muchas comunidades añaden deducciones propias. En Castilla y León, la deducción por familia numerosa es de 600 €, con importes de 1.500 € con cuatro descendientes y de 2.500 € con cinco, y 1.000 € más por cada uno desde el sexto. En la Comunitat Valenciana, la de familia numerosa o monoparental es de 330 € en categoría general y de 660 € en especial, con límites de renta.',
          'Detalles en las guías de [Castilla y León](/guias/deducciones-renta-castilla-y-leon) y de la [Comunitat Valenciana](/guias/deducciones-renta-comunitat-valenciana). Y si además tienes hijos pequeños, revisa la [deducción por maternidad y el modelo 140](/guias/deduccion-maternidad-modelo-140).',
        ],
      },
      {
        heading: 'Un ejemplo con números',
        paragraphs: [
          'Imagina una familia numerosa de categoría general con cuatro hijos, en la que el mínimo exigido para esa categoría es de tres. La deducción base es de 1.200 € y hay un hijo por encima del mínimo, que añade 600 €: en total, 1.800 € al año. Si la piden los dos progenitores, ese importe se reparte entre ellos, por ejemplo mitad y mitad.',
          'Con título de categoría especial, la base pasaría a ser de 2.400 € y se sumarían 600 € por cada hijo por encima del mínimo de esa categoría.',
        ],
      },
      {
        heading: 'Errores frecuentes',
        paragraphs: [
          'Aplicar la deducción con el título caducado, pedirla los dos progenitores por el importe completo, o mezclarla con la de ascendiente separado con dos hijos, que es incompatible. Renueva el título antes de que venza para no perder meses.',
        ],
      },
      {
        heading: 'Cómo calcularlo con Money Manager',
        paragraphs: [
          'La calculadora de la Renta incluye estas deducciones, te enseña el requisito de cada una y, si se puede cobrar por adelantado, te lleva al trámite del modelo 143. Así ves el efecto de todas las ayudas por hijos en un resumen único antes de presentar.',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'deduccion-maternidad-modelo-140',
      'renta-a-pagar-o-a-devolver',
      'deducciones-renta-castilla-y-leon',
      'deducciones-renta-comunitat-valenciana',
    ],
  },
  {
    slug: 'como-leer-borrador-renta',
    title: 'Cómo leer tu borrador de la Renta: qué mirar antes de confirmarlo',
    description:
      'Guía para revisar el borrador del IRPF apartado por apartado: datos personales, rendimientos, mínimos familiares, deducciones y resultado final.',
    intro:
      'El borrador de la Renta es una propuesta que prepara Hacienda con los datos que tiene de ti. Puede estar incompleto o equivocado, y confirmarlo sin mirarlo puede costarte dinero.',
    sections: [
      {
        heading: '¿Dónde consigo el borrador?',
        paragraphs: [
          'Se obtiene en la sede electrónica de la Agencia Tributaria o en su app, a través de Renta WEB, identificándote con Cl@ve, certificado electrónico o el sistema que esté habilitado en la campaña. Puedes descargarlo en PDF y también consultar tus datos fiscales por separado.',
          'Recuerda que es un borrador, no la declaración presentada: hasta que lo confirmes o lo modifiques y lo presentes, no ha pasado nada.',
        ],
      },
      {
        heading: '¿Qué datos personales y familiares debo comprobar?',
        paragraphs: [
          'Empieza por lo más sencillo: tu domicilio, tu estado civil, tu comunidad autónoma de residencia y, sobre todo, los hijos y familiares que figuran. Los hijos son importantes porque determinan el mínimo por descendientes y buena parte de las deducciones.',
          'Comprueba la fecha de nacimiento de cada uno, si convivís y si has indicado correctamente una discapacidad. Un hijo que falta en el borrador es dinero que dejas de ahorrar.',
        ],
      },
      {
        heading: '¿Cómo se leen los rendimientos del trabajo?',
        paragraphs: [
          'Mira los ingresos íntegros, las cotizaciones a la Seguridad Social, las retenciones y los gastos deducibles. Hacienda aplica de forma automática 2.000 € de otros gastos, y puedes sumar cuotas sindicales o de colegios profesionales, entre otros, con sus límites. Si has tenido más de un pagador, comprueba que aparecen todos.',
          'Contrasta estas cifras con tu certificado de retenciones, que te da cada empresa, o con las nóminas de diciembre.',
        ],
      },
      {
        heading: '¿Y alquileres, inmuebles y ahorro?',
        paragraphs: [
          'Los intereses, los dividendos y las ventas de inversiones tributan aparte, en la base del ahorro. Comprueba que están todos y que cada importe coincide con lo que te informó tu banco o tu bróker. Si tienes una segunda vivienda no alquilada, el borrador puede imputarte una renta por ella: revisa el valor catastral y los meses que te corresponden.',
        ],
      },
      {
        heading: '¿Qué deducciones suelen faltar?',
        paragraphs: [
          'Las que Hacienda no puede conocer: las de tu comunidad autónoma, los donativos que no le constan, el alquiler de la vivienda habitual, las aportaciones a planes de pensiones que no se hayan comunicado, o la deducción por hijos y familia numerosa si no la pediste por adelantado. Muchas deducciones autonómicas hay que añadirlas a mano.',
          'Conoce las más habituales en las guías de [Castilla y León](/guias/deducciones-renta-castilla-y-leon) y de la [Comunitat Valenciana](/guias/deducciones-renta-comunitat-valenciana), en la de [alquiler](/guias/deduccion-alquiler-vivienda-habitual-renta) y en la de [planes de pensiones](/guias/planes-de-pensiones-limite-renta).',
        ],
      },
      {
        heading: '¿Cómo interpreto el resultado?',
        paragraphs: [
          'Al final del borrador verás la cuota resultante, lo ya retenido y el resultado: a ingresar, a devolver o cero. Si el resultado no te cuadra, mira primero las retenciones y luego los mínimos familiares. Para entender qué hay detrás, lee [si te sale a pagar o a devolver](/guias/renta-a-pagar-o-a-devolver).',
        ],
      },
      {
        heading: '¿Qué hago si el borrador no es correcto?',
        paragraphs: [
          'Puedes modificarlo directamente en Renta WEB: añadir un hijo que falta, corregir una discapacidad, incluir una deducción o completar rendimientos que no figuran. Al presentar, tu declaración sustituye al borrador, y Hacienda podrá comprobar los datos que hayas cambiado, así que guarda los justificantes.',
          'Si crees que un dato fiscal que aparece en el borrador es erróneo, por ejemplo unas retenciones o unos intereses, pide al pagador que lo rectifique. Los datos fiscales no se corrigen desde tu declaración, solo se complementan.',
        ],
      },
      {
        heading: 'Lista rápida antes de confirmar',
        paragraphs: [
          'Comprueba que están todos tus pagadores, que los hijos y familiares son los correctos, que has añadido tus deducciones autonómicas, que las retenciones coinciden con tus certificados y que la cuenta bancaria para la devolución o el pago es la tuya.',
        ],
      },
      {
        heading: 'Cómo ayuda Money Manager',
        paragraphs: [
          'En la calculadora de la Renta puedes subir el PDF del borrador. Se lee en tu propio dispositivo, sin enviarlo a ningún servidor, rellena tus datos y te pregunta por las deducciones de tu comunidad y del Estado que no has marcado y podrías pedir. Es una función exclusiva de Premium o del pase de la Renta, así que consulta en la app qué incluye tu plan.',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'renta-a-pagar-o-a-devolver',
      'deduccion-alquiler-vivienda-habitual-renta',
      'planes-de-pensiones-limite-renta',
      'deduccion-maternidad-modelo-140',
    ],
  },
  {
    slug: 'renta-a-pagar-o-a-devolver',
    title: '¿Me sale a pagar o a devolver en la Renta? Cómo saberlo antes de presentar',
    description:
      'Cómo se calcula el resultado del IRPF: base, mínimo personal y familiar, escala, deducciones y retenciones. Por qué unos pagan y otros reciben una devolución.',
    intro:
      'El resultado de la Renta es una resta: lo que debes de impuesto menos lo que ya te retuvieron durante el año. Si lo retenido supera el impuesto, te devuelven la diferencia; si no, pagas el resto.',
    sections: [
      {
        heading: '¿Cómo se calcula el resultado?',
        paragraphs: [
          'Hay tres pasos. Primero, la base: tus ingresos menos los gastos deducibles y las reducciones, como las aportaciones a planes de pensiones. Segundo, la cuota: se aplica la escala de gravamen, se restan los mínimos personales y familiares y se descuentan las deducciones. Tercero, el resultado: cuota final menos las retenciones y pagos a cuenta del año.',
          'Si la cuota es menor que lo retenido, sale a devolver. Si es mayor, sale a pagar. Un ejemplo ilustrativo: con una cuota de 2.600 € y 3.000 € retenidos, te devuelven 400 €; con 2.200 € retenidos, pagas 400 €.',
        ],
      },
      {
        heading: '¿Qué es el mínimo personal y familiar?',
        paragraphs: [
          'Es la parte de tus ingresos que no paga impuesto, porque se considera necesaria para vivir. En la parte estatal del ejercicio 2025 es de 5.550 € para el contribuyente, con 1.150 € más a partir de 65 años y 1.400 € más a partir de 75.',
          'Por hijos se suman 2.400 € por el primero, 2.700 € por el segundo, 4.000 € por el tercero y 4.500 € por el cuarto y siguientes, y 2.800 € más por cada menor de 3 años. Algunas comunidades, como la Comunitat Valenciana, tienen cuantías propias.',
        ],
      },
      {
        heading: '¿Qué escala se aplica?',
        paragraphs: [
          'La parte estatal de la base general tributa por tramos: 9,5 % hasta 12.450 €, 12 % hasta 20.200 €, 15 % hasta 35.200 €, 18,5 % hasta 60.000 €, 22,5 % hasta 300.000 € y 24,5 % por encima. A esto se suma la escala de tu comunidad autónoma, que es distinta en cada región.',
          'Para quien cobra un sueldo, la base también baja con 2.000 € de otros gastos y, si el sueldo es bajo, con una reducción por rendimientos del trabajo que llega a 7.302 € para ingresos netos de hasta 14.852 € y desaparece a partir de 19.747,50 €.',
        ],
      },
      {
        heading: '¿Por qué unos pagan y otros reciben dinero?',
        paragraphs: [
          'Las retenciones de la nómina son una estimación. Se devuelve dinero cuando se retuvo más de lo necesario: hijos, deducciones, aportaciones a un plan de pensiones, cambios de situación durante el año. Se paga cuando se retuvo menos: tener dos pagadores, rendimientos sin retención como alquileres o ganancias, o haber cambiado a un trabajo mejor pagado.',
          'Por eso, a quien tiene dos pagadores le sale a pagar con frecuencia, ya que cada uno aplica la retención como si fuera el único.',
        ],
      },
      {
        heading: '¿Estoy obligado a presentar la declaración?',
        paragraphs: [
          'En general, sí, si cobras más de 22.000 € brutos al año de un solo pagador. El límite baja a 15.000 € cuando hay más de un pagador y el segundo y siguientes suman más de 1.500 €. Existen otros supuestos, como rentas del capital o ganancias, así que consulta las reglas completas.',
          'Aunque no estés obligado, suele convenir presentarla si te retuvieron de más o si tienes deducciones a las que tienes derecho.',
        ],
      },
      {
        heading: '¿Cuándo cobro la devolución y cómo se paga?',
        paragraphs: [
          'Hacienda dispone en general de un plazo de seis meses para ingresarte la devolución, contados desde el final del plazo de presentación o desde que presentas, si lo haces más tarde. Si pasa ese tiempo sin que te la abone, tienes derecho a intereses de demora.',
          'Si te sale a pagar, puedes hacerlo en un solo pago o fraccionarlo: el 60 % al presentar y el 40 % restante en noviembre, sin intereses, si lo solicitas al presentar. Comprueba las condiciones de cada campaña en la sede de la Agencia Tributaria.',
        ],
      },
      {
        heading: 'Cómo adelantar tu resultado',
        paragraphs: [
          'La calculadora de la Renta te muestra el resultado en cuatro pasos y detalla cada línea: cuánto de tu sueldo paga impuesto, cuánto te ahorra tu situación familiar, qué suman las deducciones y cuánto te han retenido. Si ya tienes el borrador, [aprende a leerlo](/guias/como-leer-borrador-renta) y revisa las [ayudas por hijos](/guias/deduccion-maternidad-modelo-140).',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'como-leer-borrador-renta',
      'planes-de-pensiones-limite-renta',
      'familia-numerosa-deduccion-modelo-143',
      'deduccion-alquiler-vivienda-habitual-renta',
    ],
  },
];
