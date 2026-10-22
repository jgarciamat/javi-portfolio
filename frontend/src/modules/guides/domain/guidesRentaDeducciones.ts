import type { Guide } from './guides';

const CHECK =
  'Las cifras de esta guía son orientativas y corresponden al ejercicio 2025 (la campaña de la Renta de 2026), según el manual de la Agencia Tributaria y la normativa de cada comunidad. Las deducciones tienen requisitos y límites de renta que cambian cada año, así que contrástalas siempre en la sede de la AEAT o con un profesional antes de presentar tu declaración.';

/** Guides about regional and housing deductions and pension plans in the income tax return. */
export const GUIDES_RENTA_DEDUCCIONES: Guide[] = [
  {
    slug: 'deducciones-renta-castilla-y-leon',
    updated: '2026-10-15',
    title: 'Deducciones de la Renta en Castilla y León: familia y vivienda',
    description:
      'Principales deducciones autonómicas de Castilla y León en el IRPF: nacimiento, familia numerosa, guardería, alquiler joven, vivienda rural y límites.',
    intro:
      'Si vives en Castilla y León puedes aplicar deducciones propias de la comunidad, además de las estatales. Muchas no aparecen en el borrador de Hacienda, así que hay que pedirlas a mano.',
    sections: [
      {
        heading: '¿Qué escala de IRPF se aplica en Castilla y León?',
        paragraphs: [
          'La parte autonómica del impuesto tiene una escala propia: 9 % hasta 12.450 €, 12 % hasta 20.200 €, 14 % hasta 35.200 €, 18,5 % hasta 53.407,20 € y 21,5 % a partir de ahí. Los mínimos personales y familiares son los del Estado.',
          'La mayoría de las deducciones tiene un límite de renta: la base general más la del ahorro, menos el mínimo personal y familiar, no debe superar 18.900 € en declaración individual ni 31.500 € en conjunta. Algunas no tienen ese límite.',
        ],
      },
      {
        heading: '¿Qué deducciones hay por nacimiento o adopción?',
        paragraphs: [
          'Por nacimiento o adopción, 1.010 € por el primer hijo, 1.475 € por el segundo y 2.351 € por el tercero y siguientes. Si vives en un municipio de hasta 5.000 habitantes, la deducción del medio rural sube a 1.420 €, 2.070 € y 3.300 €, y sustituye a la general.',
          'Si el hijo tiene una discapacidad de al menos el 33 %, la cantidad se duplica. Hay también incrementos por partos o adopciones múltiples (el 50 % más con dos hijos y el 100 % con tres o más) y una deducción por gastos de adopción de 784 €, o de 3.625 € si es internacional. Son incompatibles con el Bono Nacimiento de la Junta por el mismo hijo.',
        ],
      },
      {
        heading: '¿Y por familia numerosa?',
        paragraphs: [
          'La deducción es de 600 € para las familias numerosas, de 1.500 € con cuatro descendientes y de 2.500 € con cinco, más 1.000 € por cada descendiente a partir del sexto. Se suman otros 600 € si el cónyuge o algún descendiente tiene una discapacidad del 65 % o más. Necesitas el título vigente de Castilla y León.',
          'Si te interesa la parte estatal, léela en la guía de [familia numerosa y modelo 143](/guias/familia-numerosa-deduccion-modelo-143).',
        ],
      },
      {
        heading: '¿Qué ayudas hay para guardería y cuidado de hijos?',
        paragraphs: [
          'Con hijos menores de 4 años, puedes deducir el 100 % de la guardería con un máximo de 1.320 € por contribuyente, o bien el 30 % de lo pagado a una empleada del hogar con un máximo de 322 €. Son alternativas. Los padres deben trabajar y se aplica el límite de renta de 18.900 € (31.500 € en conjunta).',
          'También hay una deducción del 15 % de las cuotas de Seguridad Social del empleado del hogar, con máximo de 300 € al año.',
        ],
      },
      {
        heading: '¿Qué deducciones de vivienda existen?',
        paragraphs: [
          'Para jóvenes menores de 36 años: el 20 % del alquiler de la vivienda habitual con un máximo de 459 € al año, que sube al 25 % y 612 € en los pueblos pequeños. Se restan las ayudas públicas de alquiler. Más detalles en la guía de [deducción por alquiler](/guias/deduccion-alquiler-vivienda-habitual-renta).',
          'En el medio rural, los menores de 36 años deducen el 15 % de la compra o rehabilitación de su primera vivienda, con una base máxima de 10.000 € al año (hasta 1.500 €). Para pueblos de hasta 10.000 habitantes, o de 3.000 si distan menos de 30 km de la capital. Y quien rehabilita una vivienda rural para alquilarla deduce el 15 % de la inversión, con una base máxima de 20.000 €.',
        ],
      },
      {
        heading: '¿Qué otras deducciones puedo mirar?',
        paragraphs: [
          'Para personas con discapacidad: 300 € por contribuyente con discapacidad del 65 % o más siendo menor de 65 años (o de entre el 33 % y el 64 % a partir de esa edad), o 656 € a partir de 65 años con un 65 %. También hay deducciones del 15 % por donaciones a fundaciones y patrimonio, del 15 % hasta 4.000 € por un coche eléctrico o híbrido enchufable nuevo, y del 20 % hasta 10.000 € por invertir en sociedades nuevas.',
          'Algunas comparten un tope conjunto del 10 % de la base liquidable. Los requisitos de cada una son exigentes, por eso conviene leerlos antes de marcarla.',
        ],
      },
      {
        heading: 'Cómo encontrar las tuyas con Finanverso',
        paragraphs: [
          'En la calculadora de la Renta eliges Castilla y León y ves todas sus deducciones con su requisito, su límite de renta y el enlace oficial. Marcas las que creas que te corresponden y comprobamos si tu renta lo permite. Para entender el resultado, lee [si te sale a pagar o a devolver](/guias/renta-a-pagar-o-a-devolver).',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'deducciones-renta-comunitat-valenciana',
      'deduccion-maternidad-modelo-140',
      'deduccion-alquiler-vivienda-habitual-renta',
      'como-leer-borrador-renta',
    ],
  },
  {
    slug: 'deducciones-renta-comunitat-valenciana',
    updated: '2026-10-15',
    title: 'Deducciones de la Renta en la Comunitat Valenciana: guía',
    description:
      'Deducciones autonómicas de la Comunitat Valenciana en el IRPF: nacimiento, familia numerosa, guardería, salud, alquiler y vivienda, con sus límites.',
    intro:
      'La Comunitat Valenciana tiene un amplio catálogo de deducciones propias, desde el nacimiento de un hijo hasta el dentista o el gimnasio. Para casi todas hay un límite de renta que conviene mirar primero.',
    sections: [
      {
        heading: '¿Qué límites de renta se aplican?',
        paragraphs: [
          'Para la mayoría de las deducciones familiares y de vivienda, el tope es de 30.000 € en declaración individual y de 47.000 € en conjunta. El importe es completo por debajo de 27.000 € (44.000 € en conjunta) y baja en línea recta hasta cero al llegar al tope.',
          'Las deducciones de salud, deporte y música tienen un tope más alto: 60.000 € individual y 78.000 € conjunta, con reducción gradual a partir de 54.000 € y 72.000 €. Estos topes se elevaron con efectos para 2025.',
        ],
      },
      {
        heading: '¿Qué hay por nacimiento y familia?',
        paragraphs: [
          'Por cada hijo nacido o adoptado en el año: 600 € el primero, 750 € el segundo y 900 € el tercero y siguientes. Por un parto o adopción múltiple, 246 € más. Por un hijo con discapacidad, 246 €, o 303 € en algunos casos.',
          'La familia numerosa o monoparental deduce 330 € en categoría general y 660 € en categoría especial, con topes de renta distintos según la categoría. Y la madre trabajadora deduce 460 € por cada hijo mayor de 3 años y menor de 5 por conciliación, con el límite de las cotizaciones pagadas.',
          'Conoce la parte estatal en las guías de [maternidad y modelo 140](/guias/deduccion-maternidad-modelo-140) y de [familia numerosa y modelo 143](/guias/familia-numerosa-deduccion-modelo-143).',
        ],
      },
      {
        heading: '¿Qué deducciones hay de educación y cultura?',
        paragraphs: [
          'La guardería de menores de 3 años devuelve el 15 % de lo pagado, hasta 297 € por menor. La formación y el fomento de la música devuelven el 100 % hasta 150 € al año. Hay una deducción de 110 € por material escolar sujeta a requisitos específicos, y otra del 21 % de los abonos culturales sobre un máximo de 165 €.',
        ],
      },
      {
        heading: '¿Qué gastos de salud y deporte se pueden deducir?',
        paragraphs: [
          'Esta es una de las particularidades valencianas. Se devuelve el 30 % de lo pagado, con tope por contribuyente, en estos conceptos: dentista y salud bucodental no estética (hasta 150 €), gafas y lentillas (hasta 100 €), salud mental (hasta 150 €) y deporte y actividades saludables (hasta 150 €).',
          'En el deporte, el porcentaje es del 50 % si tienes más de 65 años o una discapacidad del 33 %, y del 100 % si pasas de 75 años o tienes un 65 % de discapacidad. Hay otras del 100 % hasta 100 € para enfermedades crónicas complejas y raras o para daño cerebral adquirido y alzhéimer.',
          'Pide factura con el concepto, paga sin efectivo y guarda el informe médico cuando se exija. No vale lo que reembolse la Seguridad Social ni un seguro.',
        ],
      },
      {
        heading: '¿Y las deducciones de vivienda y alquiler?',
        paragraphs: [
          'Por el alquiler de la vivienda habitual se devuelve el 20 % con un máximo de 800 €, el 25 % con un máximo de 950 € si se cumple una condición (35 años o menos, discapacidad, violencia de género), y el 30 % con un máximo de 1.100 € si se cumplen dos o más. Hay otra del 10 % hasta 224 € por alquilar en otro municipio por motivos de trabajo. La guía de [deducción por alquiler](/guias/deduccion-alquiler-vivienda-habitual-renta) lo explica con más detalle.',
          'Quien compra su primera vivienda habitual con 35 años o menos deduce el 5 % de lo pagado. Las obras de mejora en la vivienda habitual dan el 20 % con base máxima de 5.500 €, y el autoconsumo y las renovables el 40 % con base máxima de 8.800 €. Los propietarios que alquilan por debajo del precio de referencia deducen el 5 % de los ingresos, hasta 165 €.',
        ],
      },
      {
        heading: 'Cómo aplicar bien las deducciones',
        paragraphs: [
          'Casi todas se aplican a mano en el borrador. Revisa los requisitos de cada una y guarda las facturas. Si no estás seguro de qué falta en tu declaración, la guía de [cómo leer tu borrador](/guias/como-leer-borrador-renta) te da un recorrido apartado por apartado.',
          'La calculadora de la Renta de Finanverso lista todas las deducciones valencianas con su límite de renta, y te dice si tu base te lo permite o te lo bloquea. También puedes comparar con las de [Castilla y León](/guias/deducciones-renta-castilla-y-leon).',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'deducciones-renta-castilla-y-leon',
      'deduccion-alquiler-vivienda-habitual-renta',
      'como-leer-borrador-renta',
      'renta-a-pagar-o-a-devolver',
    ],
  },
  {
    slug: 'deduccion-alquiler-vivienda-habitual-renta',
    updated: '2026-10-15',
    title: 'Deducción por alquiler de vivienda habitual en la Renta',
    description:
      'Deducción estatal por alquiler (contratos anteriores a 2015), ayudas de Castilla y León y Comunitat Valenciana y reducciones para propietarios.',
    intro:
      'Si pagas alquiler, quizá puedas recuperar una parte en la Renta. La deducción estatal solo vale para contratos antiguos, pero muchas comunidades autónomas tienen ayudas propias.',
    sections: [
      {
        heading: '¿Existe una deducción estatal por alquiler?',
        paragraphs: [
          'Sí, pero solo en régimen transitorio. Se aplica si tu contrato es anterior al 1 de enero de 2015, sigue vigente (o es continuación de aquel) y ya tenías derecho a la deducción antes de esa fecha. Para contratos firmados desde entonces no hay deducción estatal.',
          'Recuperas el 10,05 % del alquiler pagado sobre una base máxima de 9.040 € al año, es decir, hasta 908,52 €. Si tu base imponible está entre 17.707,20 € y 24.107,20 €, la base máxima baja progresivamente hasta cero. Con 24.107,20 € o más, no hay deducción.',
        ],
      },
      {
        heading: '¿Qué ayudas hay en Castilla y León?',
        paragraphs: [
          'Para menores de 36 años titulares del contrato, se deduce el 20 % del alquiler de la vivienda habitual con un máximo de 459 € al año. En pueblos pequeños es del 25 % con un máximo de 612 €. Se restan las ayudas públicas de alquiler del año, como el bono alquiler joven.',
          'Existe un límite de renta: 18.900 € en individual y 31.500 € en conjunta, medidos sobre la base general más la del ahorro menos el mínimo personal y familiar. Más información en la guía de [deducciones de Castilla y León](/guias/deducciones-renta-castilla-y-leon).',
        ],
      },
      {
        heading: '¿Qué ayudas hay en la Comunitat Valenciana?',
        paragraphs: [
          'La deducción general devuelve el 20 % con un máximo de 800 €. Sube al 25 % y 950 € si se cumple una condición (35 años o menos, discapacidad o violencia de género) y al 30 % y 1.100 € si se cumplen dos o más. Necesitas un contrato posterior al 23 de abril de 1998 y de al menos un año, no tener otra vivienda a menos de 50 km durante más de medio año y pagar sin efectivo.',
          'Hay otra del 10 % hasta 224 € al año si alquilas en otro municipio por trabajo, y es compatible con la anterior. El tope de renta es de 30.000 € en individual y 47.000 € en conjunta. Más en la guía de [deducciones de la Comunitat Valenciana](/guias/deducciones-renta-comunitat-valenciana).',
        ],
      },
      {
        heading: '¿Qué pasa en otras comunidades?',
        paragraphs: [
          'Muchas comunidades autónomas tienen su propia deducción por alquiler, cada una con sus porcentajes, edades, topes y límites de renta. Las condiciones cambian de un año a otro, así que consulta la tuya en la calculadora de la Renta, que lista las deducciones de cada comunidad de régimen común, o en la web de la Agencia Tributaria.',
        ],
      },
      {
        heading: '¿Qué documentos necesito?',
        paragraphs: [
          'Guarda el contrato, la prueba de que pagas por banco (transferencia o recibo domiciliado, no efectivo), el justificante de la fianza depositada cuando la comunidad lo pide y el NIF del arrendador. Sin esos papeles, Hacienda puede rechazar la deducción en una comprobación.',
          'Si recibes alguna ayuda pública para pagar el alquiler, hay que descontarla del importe sobre el que se calcula la deducción.',
        ],
      },
      {
        heading: 'Un ejemplo de por qué importa el tope',
        paragraphs: [
          'Con un alquiler de 600 € al mes pagas 7.200 € al año. El 20 % serían 1.440 €, pero en Castilla y León la deducción para jóvenes tiene un máximo de 459 €, así que ese es el importe que te corresponde. En la Comunitat Valenciana el máximo del 20 % es de 800 €. Conocer el tope evita ilusiones y te ayuda a decidir qué papeles merece la pena reunir.',
          'Antes de marcar la deducción, comprueba también el límite de renta de tu comunidad: si lo superas, puede reducirse o desaparecer.',
        ],
      },
      {
        heading: '¿Y si soy yo quien alquila mi piso?',
        paragraphs: [
          'Los propietarios que alquilan una vivienda para uso permanente pueden reducir el rendimiento neto positivo. La reducción general es del 50 %, con porcentajes mayores en casos concretos: 90 % en zona tensionada si bajas la renta más de un 5 %, 70 % si alquilas por primera vez en zona tensionada a una persona de 18 a 35 años, y 60 % si la vivienda se rehabilitó en los dos años anteriores. El alquiler de temporada no tiene esas reducciones.',
          'Para ver el efecto de todo esto en tu resultado, usa la calculadora de la Renta y lee [si te sale a pagar o a devolver](/guias/renta-a-pagar-o-a-devolver).',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'deducciones-renta-castilla-y-leon',
      'deducciones-renta-comunitat-valenciana',
      'como-leer-borrador-renta',
      'renta-a-pagar-o-a-devolver',
    ],
  },
  {
    slug: 'planes-de-pensiones-limite-renta',
    updated: '2026-10-15',
    title: 'Planes de pensiones y Renta: límite de aportación y ahorro',
    description:
      'Cuánto puedes aportar a un plan de pensiones con ventaja fiscal en 2026: 1.500 € de límite general, aumentos de empresa y autónomos y tope del 30 %.',
    intro:
      'Las aportaciones a un plan de pensiones reducen la base de tu declaración de la Renta, y por tanto el impuesto que pagas. Pero tienen límites, y pasarse no sirve de nada.',
    sections: [
      {
        heading: '¿Cómo reduce el plan de pensiones mi IRPF?',
        paragraphs: [
          'Lo aportado se resta de la base imponible general antes de aplicar la escala. El ahorro depende, por tanto, de tu tipo marginal: cuanto más ganas, más desgrava cada euro. A modo de ejemplo, si tu tipo marginal fuese del 30 %, aportar 1.500 € te ahorraría unos 450 € de impuesto.',
          'No es una deducción de la cuota, sino una reducción de la base. Y la base general nunca puede quedar negativa por esta causa.',
        ],
      },
      {
        heading: '¿Cuál es el límite general?',
        paragraphs: [
          'El límite conjunto de tus aportaciones propias a planes de pensiones, mutualidades de previsión social, planes de previsión asegurados, planes de previsión social empresarial y seguros de dependencia severa es de 1.500 € al año. Además, no puede superar el 30 % de la suma de tus rendimientos netos del trabajo y de actividades económicas.',
          'Es decir, tu tope real es el menor de estos dos importes. Si ganas 10.000 € netos, el 30 % son 3.000 €, así que 1.500 € es el límite. Si ganas 3.000 €, el 30 % son 900 € y ese es tu tope.',
        ],
      },
      {
        heading: '¿Cuánto más pueden aportar la empresa y los autónomos?',
        paragraphs: [
          'Si tu empresa aporta a un plan de empleo, el límite sube hasta 8.500 € más. También cuentan tus propias aportaciones al mismo plan, dentro de las reglas del art. 52 de la ley del IRPF. En total puedes llegar a 10.000 €.',
          'Los autónomos pueden sumar hasta 4.250 € por aportaciones propias a planes de empleo sectoriales o simplificados, o como promotor y partícipe. Entre este aumento y el de la empresa, el máximo adicional es de 8.500 €.',
          'Aparte, las primas que paga la empresa a seguros colectivos de dependencia tienen un límite propio de 5.000 € al año.',
        ],
      },
      {
        heading: '¿Qué ventaja tiene aportar al plan de mi cónyuge?',
        paragraphs: [
          'Puedes aportar hasta 1.000 € al año a sistemas de previsión social de tu cónyuge si este gana menos de 8.000 € netos entre trabajo y actividades económicas. Este importe va aparte de tus propios límites, siempre que no dejes tu base liquidable en negativo.',
        ],
      },
      {
        heading: '¿Y si aporto más del límite?',
        paragraphs: [
          'El exceso no se pierde del todo: si no pudiste reducirlo en el año por falta de base, puedes aplicarlo en los cinco años siguientes. Pero si aportas más que el límite legal sin estar en ese caso, ese exceso puede acarrear una sanción y no desgrava.',
        ],
      },
      {
        heading: '¿Cuándo tributa lo que rescato?',
        paragraphs: [
          'Lo que recuperes con la jubilación o con un rescate tributa como rendimiento del trabajo, en la base general. La ventaja es que ese momento suele coincidir con ingresos más bajos, pero no hay garantía. Por eso conviene comparar con otras formas de ahorro, como explica la guía de [interés compuesto](/guias/interes-compuesto), y mantener tu [fondo de emergencia](/guias/fondo-de-emergencia) aparte, porque un plan de pensiones tiene poca liquidez.',
        ],
      },
      {
        heading: 'Errores frecuentes con los planes de pensiones',
        paragraphs: [
          'Confundir la reducción de base con una deducción de la cuota, olvidar que las aportaciones de la empresa también cuentan dentro del límite, pasarte del 30 % de tus rendimientos o no guardar el certificado de aportaciones que te envía la gestora a principios de año.',
          'Antes de aportar a final de año por razones fiscales, calcula cuánto te ahorras de verdad y si puedes permitirte inmovilizar ese dinero.',
        ],
      },
      {
        heading: 'Cómo ver el efecto en tu Renta',
        paragraphs: [
          'La calculadora de la Renta tiene un campo para tu aportación propia al plan de pensiones y otro para la de la empresa o la de tu cónyuge, y aplica los límites de esta guía. Cambia la cifra y mira cómo cambia tu resultado. Para entender qué es cada línea, lee [si te sale a pagar o a devolver](/guias/renta-a-pagar-o-a-devolver).',
          CHECK,
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'renta-a-pagar-o-a-devolver',
      'como-leer-borrador-renta',
      'interes-compuesto',
      'independencia-financiera-regla-del-4',
    ],
  },
];
