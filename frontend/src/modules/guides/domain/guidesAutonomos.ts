import type { Guide } from './guides';

const CHECK =
  'Las cifras de esta guía son orientativas y corresponden a las reglas vigentes en 2026 según la información pública de la Agencia Tributaria y la Seguridad Social. Pueden cambiar o tener excepciones según tu caso, así que contrástalas siempre en la sede de la AEAT o con tu gestor antes de presentar nada.';

/** Guides for the self-employed: quarterly tax drafts, contributions and deductible expenses. */
export const GUIDES_AUTONOMOS: Guide[] = [
  {
    slug: 'modelo-130-paso-a-paso',
    updated: '2026-10-15',
    title: 'Modelo 130 paso a paso: cálculo del pago fraccionado del IRPF',
    description:
      'Quién debe presentar el modelo 130, qué casillas rellenar, cómo se calcula el 20 % del rendimiento neto y qué pasa si el resultado sale negativo.',
    intro:
      'Si eres autónomo en estimación directa, cada trimestre adelantas a Hacienda una parte del IRPF de tu actividad con el modelo 130. No es un impuesto nuevo: es un anticipo de la Renta que presentarás al año siguiente.',
    sections: [
      {
        heading: '¿Qué es el modelo 130 y quién lo presenta?',
        paragraphs: [
          'El modelo 130 es el pago fraccionado del IRPF para empresarios y profesionales que tributan en estimación directa, ya sea normal o simplificada. Los que están en estimación objetiva (módulos) usan en su lugar el modelo 131.',
          'Hay una excepción importante: no tienes que presentarlo si, en el año anterior, al menos el 70 % de tus ingresos de la actividad llevó retención o ingreso a cuenta. Es lo habitual en profesionales que facturan sobre todo a empresas con retención del 7 % o del 15 %. Si no estás seguro, comprueba tus facturas del último año y consulta con tu gestor.',
          'El modelo se presenta aunque no hayas ganado dinero en el trimestre; en ese caso el resultado simplemente será cero o negativo.',
        ],
      },
      {
        heading: '¿Cómo se calcula el importe?',
        paragraphs: [
          'La clave es que las cifras son acumuladas desde el 1 de enero, no solo del trimestre. En cada presentación sumas los ingresos y los gastos del año hasta ese momento, calculas el rendimiento neto y le aplicas el 20 %. Después restas lo que ya pagaste en los trimestres anteriores y las retenciones que te hayan practicado.',
          'Las casillas principales son estas: la 01 recoge los ingresos íntegros acumulados, la 02 los gastos fiscalmente deducibles, la 03 es la diferencia (rendimiento neto), la 04 es el 20 % de esa diferencia, la 05 los pagos de trimestres anteriores, la 06 las retenciones soportadas y la 07 el resultado de restar a la 04 las dos anteriores.',
          'Un ejemplo con números redondos: si en el primer trimestre ingresas 12.000 € y gastas 4.000 €, el rendimiento neto es de 8.000 € y el 20 % son 1.600 €. En el segundo trimestre llevas 24.000 € de ingresos y 9.000 € de gastos acumulados: el neto es de 15.000 €, el 20 % son 3.000 € y, como ya pagaste 1.600 €, ingresas 1.400 €.',
        ],
      },
      {
        heading: '¿Qué gastos puedo restar?',
        paragraphs: [
          'Solo los gastos deducibles de tu actividad: la cuota de autónomos, el alquiler del local, el material, la gestoría, el software, la publicidad o la parte que corresponda de los suministros. Si quieres el detalle, lo tienes en la guía de [gastos deducibles de un autónomo](/guias/gastos-deducibles-autonomo).',
          'En estimación directa simplificada puedes añadir además los gastos de difícil justificación: un 5 % del rendimiento neto, con un máximo de 2.000 € al año. Es una forma de cubrir pequeños gastos que no puedes acreditar con factura, y se aplica de forma automática en el cálculo.',
        ],
      },
      {
        heading: '¿Qué es la minoración por rentas bajas?',
        paragraphs: [
          'La casilla 13 permite reducir el importe a ingresar si tu rendimiento neto del ejercicio anterior fue bajo y cumples el resto de requisitos. Los tramos habituales son: hasta 9.000 € de neto, una minoración de 100 €; hasta 10.000 €, 75 €; hasta 11.000 €, 50 €; y hasta 12.000 €, 25 €. La minoración nunca puede convertir el resultado en negativo.',
        ],
      },
      {
        heading: '¿Qué pasa si el resultado sale negativo?',
        paragraphs: [
          'Si la casilla 07 es negativa, no pagas nada ese trimestre y tampoco te devuelven dinero: el modelo se presenta igualmente con resultado a cero. Un resultado negativo se tiene en cuenta en los trimestres siguientes del mismo año, donde puede compensar importes positivos (casilla 15).',
        ],
      },
      {
        heading: '¿Cuándo se presenta?',
        paragraphs: [
          'El modelo 130 se presenta junto con el 303 de IVA: del 1 al 20 de abril, julio y octubre, y del 1 al 30 de enero para el cuarto trimestre. Si el último día cae en fin de semana o festivo, pasa al siguiente día hábil. Encontrarás todas las fechas en la guía de [fechas de los modelos trimestrales de 2026](/guias/fechas-modelos-trimestrales-autonomos-2026).',
          'Para entender cómo se relaciona con el IVA, repasa la guía del [modelo 303 y el IVA para autónomos](/guias/iva-para-autonomos-modelo-303).',
        ],
      },
      {
        heading: 'Cómo preparar el borrador con Finanverso',
        paragraphs: [
          'En la sección Autónomos de Finanverso marcas qué categorías son de tu actividad y la app te prepara un borrador del 130 y del 303 de cada trimestre, con las casillas ya calculadas a partir de tus movimientos. Te sirve para saber cuánto vas a pagar antes de que llegue la fecha, no para presentarlo: el borrador es orientativo.',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-iva', label: 'Calculadora de IVA' },
    related: [
      'iva-para-autonomos-modelo-303',
      'gastos-deducibles-autonomo',
      'fechas-modelos-trimestrales-autonomos-2026',
      'cuota-autonomos-2026-por-tramos',
    ],
  },
  {
    slug: 'cuota-autonomos-2026-por-tramos',
    updated: '2026-10-15',
    title: 'Cuota de autónomos 2026 por tramos: tabla y cómo elegir base',
    description:
      'Los 15 tramos de cotización de autónomos en 2026 según tus rendimientos netos, el tipo del 31,5 %, la cuota mínima y máxima de cada tramo y un ejemplo.',
    intro:
      'Desde 2023 los autónomos cotizan según sus rendimientos netos reales. En 2026 hay 15 tramos y un tipo total del 31,5 %. Esta guía te explica cómo saber en cuál estás y cuánto pagarás.',
    sections: [
      {
        heading: '¿Cómo funciona la cotización por ingresos reales?',
        paragraphs: [
          'Ya no se elige la base libremente entre dos extremos: tu tramo depende de lo que ganas. Se calcula el rendimiento neto mensual, es decir, ingresos menos gastos deducibles dividido entre doce, y se le aplica una deducción del 7 % por gastos generales. El resultado indica el tramo y, dentro de él, una base mínima y una máxima entre las que puedes elegir.',
          'La cuota se obtiene multiplicando la base elegida por el tipo total de 2026, que es el 31,5 %. Ese porcentaje reúne las contingencias comunes (28,30 %), las profesionales (1,30 %), el cese de actividad (0,90 %), la formación (0,10 %) y el Mecanismo de Equidad Intergeneracional (0,90 %).',
        ],
      },
      {
        heading: '¿Cuáles son los tramos de 2026?',
        paragraphs: [
          'Hay tres tramos reducidos y doce generales. Las cuotas siguientes resultan de aplicar el 31,5 % a la base mínima y a la máxima de cada tramo; los rendimientos netos son mensuales, tras la deducción del 7 %.',
          'Tramos reducidos. R1: hasta 670 €, base de 653,59 € a 718,94 €, cuota de 205,88 € a 226,47 €. R2: de 670 € a 900 €, base de 718,95 € a 900 €, cuota de 226,47 € a 283,50 €. R3: de 900 € a 1.166,70 €, base de 849,67 € a 1.166,70 €, cuota de 267,65 € a 367,51 €.',
          'Tramos generales (I). G1: de 1.166,70 € a 1.300 €, base de 950,98 € a 1.300 €, cuota de 299,56 € a 409,50 €. G2: de 1.300 € a 1.500 €, base de 960,78 € a 1.500 €, cuota de 302,65 € a 472,50 €. G3: de 1.500 € a 1.700 €, base de 960,78 € a 1.700 €, cuota de 302,65 € a 535,50 €. G4: de 1.700 € a 1.850 €, base de 1.143,79 € a 1.850 €, cuota de 360,29 € a 582,75 €. G5: de 1.850 € a 2.030 €, base de 1.209,15 € a 2.030 €, cuota de 380,88 € a 639,45 €.',
          'Tramos generales (II). G6: de 2.030 € a 2.330 €, base de 1.274,51 € a 2.330 €, cuota de 401,47 € a 733,95 €. G7: de 2.330 € a 2.760 €, base de 1.356,21 € a 2.760 €, cuota de 427,21 € a 869,40 €. G8: de 2.760 € a 3.190 €, base de 1.437,91 € a 3.190 €, cuota de 452,94 € a 1.004,85 €. G9: de 3.190 € a 3.620 €, base de 1.519,61 € a 3.620 €, cuota de 478,68 € a 1.140,30 €. G10: de 3.620 € a 4.050 €, base de 1.601,31 € a 4.050 €, cuota de 504,41 € a 1.275,75 €.',
          'Tramos más altos. G11: de 4.050 € a 6.000 €, base de 1.732,03 € a 5.101,20 €, cuota de 545,59 € a 1.606,88 €. G12: más de 6.000 €, base de 1.928,10 € a 5.101,20 €, cuota de 607,35 € a 1.606,88 €.',
        ],
      },
      {
        heading: 'Un ejemplo para saber en qué tramo estás',
        paragraphs: [
          'Imagina que facturas 36.000 € al año y tienes 12.000 € de gastos deducibles. Tu rendimiento neto anual es de 24.000 €, es decir, 2.000 € al mes. Con la deducción del 7 % queda en 1.860 €, lo que te sitúa en el tramo G5. Podrías elegir una base entre 1.209,15 € y 2.030 €, y tu cuota estaría entre 380,88 € y 639,45 € al mes.',
          'Con un neto de 9.000 € al año, o 750 € al mes, y después del 7 % unos 697,50 €, estarías en el tramo R2, con una cuota de entre 226,47 € y 283,50 €.',
        ],
      },
      {
        heading: '¿Puedo cambiar de base durante el año?',
        paragraphs: [
          'Sí. Como tus ingresos varían, el sistema permite ajustar la base de cotización varias veces al año para acercarla a tus rendimientos reales. Al terminar el ejercicio, la Seguridad Social compara lo que has cotizado con los datos que recibe de la Agencia Tributaria y regulariza: si cotizaste de más te devuelve la diferencia y si fue de menos te reclama el resto.',
          'Por eso conviene hacer una previsión realista desde enero. Subestimar tus ingresos puede darte una cuota baja ahora y una sorpresa después.',
        ],
      },
      {
        heading: '¿Y la tarifa plana?',
        paragraphs: [
          'Quien se da de alta por primera vez puede acogerse a una cuota reducida durante el primer año, de 80 € al mes, con posibilidad de ampliarla en algunos supuestos. Las condiciones exactas cambian, así que verifícalas en la web de la Seguridad Social antes de contar con ella.',
        ],
      },
      {
        heading: 'La cuota también es un gasto',
        paragraphs: [
          'La cuota de autónomos es un gasto deducible en el modelo 130 y en la declaración de la Renta, por lo que reduce lo que pagas a Hacienda. Está explicado en la guía de [modelo 130 paso a paso](/guias/modelo-130-paso-a-paso) y en la de [gastos deducibles de un autónomo](/guias/gastos-deducibles-autonomo).',
          'En la sección Autónomos de Finanverso verás una estimación del tramo que te correspondería con tus ingresos y gastos del año, para anticiparte a la regularización.',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-iva', label: 'Calculadora de IVA' },
    related: [
      'modelo-130-paso-a-paso',
      'gastos-deducibles-autonomo',
      'iva-para-autonomos-modelo-303',
      'fondo-de-emergencia',
      'tarifa-plana-autonomos-2026',
      'alta-autonomo-paso-a-paso',
    ],
  },
  {
    slug: 'gastos-deducibles-autonomo',
    updated: '2026-10-15',
    title: 'Gastos deducibles de un autónomo: qué restar y con qué límites',
    description:
      'Suministros al 30 %, vehículo, comidas con límite de 26,67 € al día, seguro de salud y otros gastos que un autónomo puede deducir, y cuáles no.',
    intro:
      'Deducir bien tus gastos reduce el IVA y el IRPF que pagas, pero hacerlo mal puede costarte una sanción. Estas son las reglas más importantes y sus límites.',
    sections: [
      {
        heading: '¿Qué condiciones debe cumplir un gasto para ser deducible?',
        paragraphs: [
          'En general, el gasto debe estar relacionado con tu actividad, justificado con una factura completa a tu nombre o NIF, anotado en tu contabilidad o libros de registro y correspondiente al periodo que declaras. Los tickets simplificados no suelen servir para deducir el IVA, salvo en los casos que prevé la normativa.',
          'Además, paga siempre con medios que dejen rastro, como tarjeta o transferencia. Es más fácil de justificar si Hacienda pregunta.',
        ],
      },
      {
        heading: '¿Cuánto puedo deducir de los suministros de casa?',
        paragraphs: [
          'Si trabajas desde casa, puedes deducir una parte de la luz, el agua, el gas, internet y el teléfono. La regla es: se calcula la proporción de metros cuadrados de la vivienda que dedicas a la actividad y se aplica el 30 % a esa proporción.',
          'Ejemplo: si tu casa tiene 100 m² y destinas 20 m² a trabajar, la proporción es del 20 %. El 30 % de ese 20 % es un 6 %, así que podrías deducir un 6 % de las facturas de suministros. La parte de la vivienda debe estar afecta de forma exclusiva a la actividad y es conveniente que figure en tu declaración de alta.',
        ],
      },
      {
        heading: '¿Puedo deducir el coche?',
        paragraphs: [
          'Es una de las deducciones más vigiladas. Para el IRPF, el vehículo solo es deducible cuando se usa de forma exclusiva en la actividad, como ocurre con los transportistas, los agentes comerciales o las autoescuelas. En un coche de uso mixto, personal y profesional, Hacienda normalmente no admite el gasto.',
          'En el IVA, cuando no hay exclusividad se presume una afectación del 50 %, de modo que puedes deducir la mitad del IVA soportado en compra, combustible y mantenimiento. Guarda siempre una prueba del uso profesional, como una agenda de visitas.',
        ],
      },
      {
        heading: '¿Qué límite tienen las comidas?',
        paragraphs: [
          'Los gastos de manutención del propio autónomo son deducibles hasta 26,67 € al día si comes en España en un restaurante o bar sin pernoctar (el límite sube a 53,34 € con pernoctación). Debes pagar con tarjeta u otro medio electrónico, tener factura completa y que el gasto se produzca en el ejercicio de la actividad.',
          'Las comidas con clientes o proveedores entran en otra categoría: son atenciones a clientes, deducibles en el IRPF con justificación, pero normalmente no dan derecho a deducir el IVA.',
        ],
      },
      {
        heading: '¿El seguro de salud es deducible?',
        paragraphs: [
          'Sí, hasta 500 € al año por persona para ti, tu cónyuge y los hijos menores de 25 años que convivan contigo. Si alguno tiene una discapacidad, el límite sube a 1.500 € por esa persona. Lo que pase del límite no es deducible.',
        ],
      },
      {
        heading: '¿Qué otros gastos son deducibles al cien por cien?',
        paragraphs: [
          'La cuota de autónomos, el alquiler del local, los sueldos y la Seguridad Social de los empleados, la formación relacionada con tu actividad, la gestoría, el software y las suscripciones profesionales, la publicidad y el material de trabajo. Todos ellos exigen factura y relación directa con tu negocio.',
          'Hay además los gastos de difícil justificación de la estimación simplificada: un 5 % del rendimiento neto con un máximo de 2.000 € anuales.',
        ],
      },
      {
        heading: '¿Qué no puedes deducir?',
        paragraphs: [
          'Las multas y sanciones no son deducibles en ningún caso. Tampoco lo son los gastos personales, las facturas sin justificar ni las compras que no tengan relación con tu actividad.',
          'Para saber cómo afecta cada gasto a tus trimestres, lee las guías del [modelo 130](/guias/modelo-130-paso-a-paso) y del [IVA y el modelo 303](/guias/iva-para-autonomos-modelo-303).',
        ],
      },
      {
        heading: '¿Qué errores son más frecuentes?',
        paragraphs: [
          'Deducir al cien por cien el móvil, internet o el coche sin una proporción razonable, no guardar las facturas o mezclar gastos personales y profesionales en la misma cuenta. Lo más sencillo es separar una cuenta para la actividad y pagar desde ella todo lo deducible.',
          'Ante una duda, es mejor no deducir ese gasto o consultarlo antes con tu gestor: una deducción rechazada supone pagar la diferencia más recargos.',
        ],
      },
      {
        heading: 'Cómo llevarlo al día con Finanverso',
        paragraphs: [
          'En la sección Autónomos puedes marcar qué categorías son de tu actividad, indicar el tipo de IVA y los metros que dedicas al trabajo. La app aplica los límites de esta guía y te enseña cuánto de cada gasto cuenta para el IRPF y cuánto para el IVA.',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-iva', label: 'Calculadora de IVA' },
    related: [
      'modelo-130-paso-a-paso',
      'cuota-autonomos-2026-por-tramos',
      'iva-para-autonomos-modelo-303',
      'fechas-modelos-trimestrales-autonomos-2026',
    ],
  },
  {
    slug: 'fechas-modelos-trimestrales-autonomos-2026',
    updated: '2026-10-15',
    title: 'Calendario fiscal de autónomos 2026: fechas de los modelos',
    description:
      'Fechas de los modelos 303, 130, 111 y 115 en 2026, de los resúmenes 390, 190 y 347 y qué hacer si el plazo cae en fin de semana.',
    intro:
      'Presentar a tiempo evita recargos y sanciones. Este es el calendario de 2026 para los modelos trimestrales de un autónomo y los resúmenes anuales que llegan después.',
    sections: [
      {
        heading: '¿Cuándo se presentan el modelo 303 y el modelo 130?',
        paragraphs: [
          'Ambos modelos son trimestrales y comparten plazo. Se presentan del 1 al 20 de abril (primer trimestre), del 1 al 20 de julio (segundo) y del 1 al 20 de octubre (tercero). El cuarto trimestre se presenta del 1 al 30 de enero del año siguiente.',
          'En 2026 el último día de cada plazo es el lunes 20 de abril, el lunes 20 de julio y el martes 20 de octubre. El del cuarto trimestre de 2026 llega el 30 de enero de 2027, que es sábado, así que pasa al lunes 1 de febrero.',
        ],
      },
      {
        heading: '¿Y las retenciones de los modelos 111 y 115?',
        paragraphs: [
          'Si has pagado a trabajadores o a profesionales con retención de IRPF, presentas el modelo 111 con el mismo ritmo trimestral: hasta el 20 de abril, julio y octubre, y hasta el 20 de enero para el último trimestre. Si alquilas un local de negocio y retienes al arrendador, el modelo 115 sigue el mismo calendario.',
          'Solo se presentan en los trimestres en que hayas practicado retenciones.',
        ],
      },
      {
        heading: '¿Qué resúmenes anuales hay que presentar?',
        paragraphs: [
          'Al cerrar el año hay tres declaraciones informativas. El modelo 390 es el resumen anual del IVA y se presenta hasta el 30 de enero. El modelo 190 resume las retenciones del año y vence el 31 de enero. El modelo 347 informa de las operaciones con terceros superiores a 3.005,06 € y se presenta en febrero, hasta el último día del mes.',
          'Si alguno de estos días cae en fin de semana, el plazo se traslada al siguiente día hábil. Así, para el ejercicio 2026, los plazos de enero y febrero de 2027 se desplazan al 1 de febrero (390 y 190) y al 1 de marzo (347).',
        ],
      },
      {
        heading: '¿Qué pasa si el plazo cae en fin de semana o festivo?',
        paragraphs: [
          'El último día se traslada al siguiente día hábil. Tenlo en cuenta también para la domiciliación del pago: el plazo para domiciliar termina unos días antes que el de presentación, así que si quieres que te lo cobren en cuenta, anticípate y consulta el calendario oficial.',
        ],
      },
      {
        heading: '¿Y la declaración de la Renta?',
        paragraphs: [
          'La declaración anual del IRPF no forma parte de los trimestres. La campaña de la Renta suele abrir en abril y cerrar a finales de junio. Los pagos fraccionados que hiciste con el modelo 130 se descuentan en ella. Si quieres anticipar el resultado, prueba la [calculadora de la Renta](/calculadora-renta) y lee la guía de [si te sale a pagar o a devolver](/guias/renta-a-pagar-o-a-devolver).',
        ],
      },
      {
        heading: '¿Qué pasa si me retraso?',
        paragraphs: [
          'Presentar fuera de plazo tiene un coste. Si lo haces por tu cuenta y sin requerimiento previo de Hacienda, se aplican recargos que aumentan cuanto más tarde presentes, y si no pagas a tiempo se suman además intereses de demora. Si Hacienda te lo reclama antes, las sanciones son mayores.',
          'Por eso, si ves que no vas a llegar, es mejor presentar cuanto antes que esperar. Si no puedes pagar el importe de golpe, consulta con la Agencia Tributaria las opciones de aplazamiento antes de que acabe el plazo.',
        ],
      },
      {
        heading: '¿Tengo que presentar si no he tenido ingresos?',
        paragraphs: [
          'Mientras sigas dado de alta en el censo de empresarios, lo normal es presentar igualmente el modelo 303 aunque no hayas facturado, con resultado cero. El modelo 130 también se presenta con resultado cero o negativo, salvo que estés en el supuesto de exención. Si dejas la actividad, la baja en Hacienda es lo que te libera de seguir presentando.',
        ],
      },
      {
        heading: 'Consejos para no olvidarte de ninguna fecha',
        paragraphs: [
          'Apunta los vencimientos en tu calendario con un aviso una semana antes, aparta cada mes una parte de lo que facturas para los impuestos y revisa tus facturas antes de presentar. Si dudas de cómo se calcula cada modelo, empieza por [el modelo 303](/guias/iva-para-autonomos-modelo-303) y por [el modelo 130](/guias/modelo-130-paso-a-paso).',
          'En la sección Autónomos de Finanverso ves las fechas límite del trimestre en curso junto al borrador de cada modelo, así que sabes cuánto debes apartar y para cuándo.',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-iva', label: 'Calculadora de IVA' },
    related: [
      'modelo-130-paso-a-paso',
      'iva-para-autonomos-modelo-303',
      'gastos-deducibles-autonomo',
      'cuota-autonomos-2026-por-tramos',
    ],
  },
];
