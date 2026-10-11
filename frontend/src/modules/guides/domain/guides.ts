/** Short articles that answer what people search for and lead to the calculators and the app. */
export interface GuideSection {
  heading: string;
  paragraphs: string[];
}

export interface Guide {
  slug: string;
  title: string;
  /** Meta description (search results snippet). */
  description: string;
  intro: string;
  sections: GuideSection[];
  /** Calculator that goes with the guide. */
  tool?: { to: string; label: string };
  /** Slugs of other guides worth reading next. */
  related: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'metodo-50-30-20',
    title: 'Método 50/30/20: cómo repartir tu sueldo sin complicarte',
    description:
      'Qué es la regla 50/30/20, cómo aplicarla a tu sueldo neto con un ejemplo real y cuándo conviene adaptarla.',
    intro:
      'La regla 50/30/20 es la forma más sencilla de ordenar tu dinero: la mitad para lo necesario, un 30 % para tus gustos y un 20 % para ahorrar o pagar deudas.',
    sections: [
      {
        heading: 'Cómo funciona',
        paragraphs: [
          'Parte de tu ingreso neto mensual, es decir, lo que de verdad llega a tu cuenta después de impuestos. Con 1.800 €, tocan 900 € para necesidades, 540 € para deseos y 360 € para ahorro.',
          'Las necesidades son lo que no puedes dejar de pagar: vivienda, suministros, comida del súper, transporte al trabajo, seguros y las cuotas mínimas de tus deudas.',
          'Los deseos son lo que mejora tu vida pero podrías recortar: restaurantes, ocio, suscripciones, viajes o ropa que no necesitas.',
        ],
      },
      {
        heading: 'Qué hacer si no te salen las cuentas',
        paragraphs: [
          'En ciudades con alquileres altos es habitual que las necesidades superen el 50 %. No es un fracaso: adapta la regla a 60/20/20 y revisa de dónde puedes recortar poco a poco.',
          'Lo importante es mantener el ahorro como un gasto fijo más. Si solo ahorras lo que sobra a fin de mes, casi nunca sobra.',
        ],
      },
      {
        heading: 'Cómo ponerlo en práctica',
        paragraphs: [
          'Calcula tus tres cantidades con la calculadora, crea un presupuesto por categoría para cada bloque y programa una transferencia automática al ahorro el día que cobras.',
          'En Money Manager puedes poner un presupuesto a cada categoría y la app te avisa cuando te acercas al límite.',
        ],
      },
    ],
    tool: { to: '/calculadora-50-30-20', label: 'Calculadora 50/30/20' },
    related: ['como-ahorrar-el-20-por-ciento', 'como-hacer-un-presupuesto-mensual'],
  },
  {
    slug: 'como-ahorrar-el-20-por-ciento',
    title: 'Cómo ahorrar el 20 % de tu sueldo (aunque ahora te parezca imposible)',
    description:
      'Pasos concretos para llegar a ahorrar el 20 % de tus ingresos: automatizar, recortar gastos invisibles y subir el porcentaje poco a poco.',
    intro:
      'Ahorrar un 20 % suena a mucho, pero se consigue por escalones. Estos pasos funcionan incluso si hoy no ahorras nada.',
    sections: [
      {
        heading: '1. Empieza por el 5 %',
        paragraphs: [
          'Si hoy ahorras cero, fijarte el 20 % de golpe suele acabar en abandono. Empieza con un 5 % y súbelo un punto cada mes o cada vez que te suban el sueldo.',
        ],
      },
      {
        heading: '2. Págate a ti primero',
        paragraphs: [
          'Programa una transferencia automática a una cuenta de ahorro el mismo día que cobras. Lo que no ves en tu cuenta corriente no lo gastas sin darte cuenta.',
        ],
      },
      {
        heading: '3. Recorta lo que no notas',
        paragraphs: [
          'Revisa las suscripciones que no usas, compara tu tarifa de móvil, luz o seguros y mira cuánto se te va en pequeños gastos diarios. Recortar aquí duele mucho menos que renunciar a lo que disfrutas.',
        ],
      },
      {
        heading: '4. Ponle nombre a tu ahorro',
        paragraphs: [
          'Ahorrar «por si acaso» motiva poco. Crea metas concretas, como el fondo de emergencia, un viaje o la entrada de una vivienda, con una cantidad y una fecha.',
        ],
      },
      {
        heading: '5. Mide cada mes',
        paragraphs: [
          'Mira tu tasa de ahorro, que es el porcentaje de tus ingresos que has guardado. Money Manager la calcula sola cada mes y te la enseña en el resumen.',
        ],
      },
    ],
    tool: { to: '/simulador-ahorro', label: 'Simulador de ahorro' },
    related: ['metodo-50-30-20', 'gastos-hormiga', 'fondo-de-emergencia'],
  },
  {
    slug: 'fondo-de-emergencia',
    title: 'Fondo de emergencia: cuánto necesitas y dónde guardarlo',
    description:
      'Cuántos meses de gastos debe cubrir tu fondo de emergencia, cómo construirlo paso a paso y dónde tenerlo para poder usarlo cuando haga falta.',
    intro:
      'Un fondo de emergencia es dinero reservado para imprevistos: perder el empleo, una avería o una factura médica. Evita que acabes endeudándote.',
    sections: [
      {
        heading: 'Cuánto ahorrar',
        paragraphs: [
          'La recomendación habitual es de 3 a 6 meses de gastos básicos. Si tu ingreso es variable, tienes personas a tu cargo o trabajas por cuenta propia, acércate a los 6 o más.',
          'Calcula tus gastos esenciales de un mes (vivienda, comida, suministros, transporte, seguros y deudas) y multiplícalos por los meses que quieras cubrir.',
        ],
      },
      {
        heading: 'Cómo construirlo',
        paragraphs: [
          'No hace falta llegar a la cifra completa de golpe. Marca un primer objetivo pequeño, como un mes de gastos, y ve subiendo.',
          'Una meta de ahorro con una cantidad y una fecha te ayuda a mantener el ritmo. En Money Manager puedes crearla y ver el progreso.',
        ],
      },
      {
        heading: 'Dónde guardarlo',
        paragraphs: [
          'Lo importante es que puedas usarlo en pocos días y que su valor no fluctúe. Una cuenta de ahorro separada de la corriente suele ser suficiente.',
          'Evita inversiones de riesgo para este dinero: su función es estar disponible, no ganar rentabilidad.',
        ],
      },
    ],
    tool: { to: '/simulador-ahorro', label: 'Simulador de ahorro' },
    related: ['como-ahorrar-el-20-por-ciento', 'interes-compuesto'],
  },
  {
    slug: 'interes-compuesto',
    title: 'Interés compuesto: por qué empezar pronto vale tanto',
    description:
      'Qué es el interés compuesto, con ejemplos en euros de lo que pasa si ahorras cada mes durante 10 y 20 años.',
    intro:
      'El interés compuesto significa que los intereses que ganas también generan intereses. Con tiempo, el efecto se nota mucho.',
    sections: [
      {
        heading: 'Un ejemplo sencillo',
        paragraphs: [
          'Si ahorras 100 € al mes durante 10 años con una rentabilidad del 3 % anual, aportas 12.000 € y terminas con unos 13.945 €: casi 1.945 € vienen de intereses.',
          'Si aportas 200 € al mes durante 20 años al 5 %, pones 48.000 € y acabas con unos 81.161 €: más de 33.000 € son rentabilidad.',
        ],
      },
      {
        heading: 'Qué importa más',
        paragraphs: [
          'Tres cosas mandan: cuánto aportas, durante cuánto tiempo y qué rentabilidad obtienes. De las tres, el tiempo es la que menos se puede recuperar. Empezar cinco años antes suele valer más que subir un poco la aportación.',
          'Ten en cuenta que la rentabilidad no está garantizada, que los productos con más rentabilidad suelen tener más riesgo y que la inflación reduce lo que podrás comprar con ese dinero.',
        ],
      },
      {
        heading: 'Pruébalo con tus números',
        paragraphs: [
          'En el simulador puedes poner tu aportación mensual, la rentabilidad que esperas y los años, y ver año por año cuánto es tuyo y cuánto son intereses. Es una simulación orientativa, no una promesa ni un consejo de inversión.',
        ],
      },
    ],
    tool: { to: '/simulador-ahorro', label: 'Simulador de ahorro con interés compuesto' },
    related: ['fondo-de-emergencia', 'como-ahorrar-el-20-por-ciento'],
  },
  {
    slug: 'como-hacer-un-presupuesto-mensual',
    title: 'Cómo hacer un presupuesto mensual paso a paso',
    description:
      'Guía práctica para hacer tu primer presupuesto mensual: ingresos, gastos fijos y variables, límites por categoría y revisión.',
    intro:
      'Un presupuesto no es una prohibición: es decidir de antemano a dónde va tu dinero para que no se escape sin que lo notes.',
    sections: [
      {
        heading: '1. Apunta tus ingresos reales',
        paragraphs: [
          'Suma lo que ingresas cada mes de forma estable. Si tus ingresos varían, usa la media de los últimos meses o el mes más flojo para ir seguro.',
        ],
      },
      {
        heading: '2. Lista tus gastos fijos',
        paragraphs: [
          'Alquiler o hipoteca, suministros, seguros, transporte, cuotas y suscripciones. Son gastos que se repiten, así que conviene automatizar su registro.',
        ],
      },
      {
        heading: '3. Estima los variables',
        paragraphs: [
          'Comida, ocio, ropa y caprichos. Mira lo que gastaste los últimos tres meses y fija un límite realista por categoría, sin castigarte.',
        ],
      },
      {
        heading: '4. Reserva el ahorro primero',
        paragraphs: [
          'Resta del ingreso la cantidad que quieres ahorrar antes de repartir el resto. Lo que queda es lo que puedes gastar.',
        ],
      },
      {
        heading: '5. Revisa y ajusta',
        paragraphs: [
          'A mitad de mes comprueba cómo vas. Un presupuesto que nunca se revisa se abandona. En Money Manager ves cuánto llevas gastado en cada categoría y recibes un aviso si te acercas al límite.',
        ],
      },
    ],
    tool: { to: '/calculadora-50-30-20', label: 'Calculadora 50/30/20' },
    related: ['metodo-50-30-20', 'gastos-hormiga'],
  },
  {
    slug: 'gastos-hormiga',
    title: 'Gastos hormiga: cómo detectarlos y cuánto te cuestan al año',
    description:
      'Qué son los gastos hormiga, ejemplos habituales, cuánto suman en un año y cómo reducirlos sin amargarte.',
    intro:
      'Los gastos hormiga son compras pequeñas y frecuentes que casi no notas, pero que sumadas pesan: cafés, snacks, envíos o apps.',
    sections: [
      {
        heading: 'Por qué se escapan',
        paragraphs: [
          'Cada uno parece insignificante. Un café de 1,50 € al día son unos 33 € al mes y casi 400 € al año. Con varios hábitos así, el total sorprende.',
        ],
      },
      {
        heading: 'Cómo detectarlos',
        paragraphs: [
          'Registra todo durante un mes, aunque sea poco. Al revisar por categorías verás cuáles se repiten. Los más típicos son cafés y comida fuera, pedidos a domicilio, pequeñas compras online y juegos o apps.',
        ],
      },
      {
        heading: 'Cómo reducirlos sin sufrir',
        paragraphs: [
          'No hace falta eliminarlos. Elige uno o dos que de verdad no te aportan nada y recórtalos. Pon un presupuesto mensual a esa categoría: cuando se acaba, se acaba.',
          'Anotar cada gasto en el momento, con unos pocos toques, es lo que más ayuda a ser consciente.',
        ],
      },
    ],
    related: ['como-hacer-un-presupuesto-mensual', 'suscripciones-que-no-usas'],
  },
  {
    slug: 'suscripciones-que-no-usas',
    title: 'Suscripciones que no usas: cómo encontrarlas y cancelarlas',
    description:
      'Cómo localizar las suscripciones olvidadas que te cobran cada mes, cuánto pueden costarte al año y cómo cancelarlas.',
    intro:
      'Plataformas de vídeo, música, gimnasio, apps o almacenamiento: es fácil acumular pagos recurrentes y olvidarse de la mitad.',
    sections: [
      {
        heading: 'Dónde buscarlas',
        paragraphs: [
          'Revisa los extractos de los últimos tres meses y busca cargos que se repiten con la misma cantidad. Mira también las suscripciones de tu cuenta de Google y de Apple, donde se acumulan las de apps.',
        ],
      },
      {
        heading: 'Calcula lo que cuestan al año',
        paragraphs: [
          'Multiplica por doce. Cinco suscripciones de 9,99 € al mes son casi 600 € al año. Suele ayudar a decidir qué merece la pena conservar.',
        ],
      },
      {
        heading: 'Cancela con cabeza',
        paragraphs: [
          'Pregúntate si la has usado en el último mes. Si no, cancela: casi siempre puedes volver a contratarla. Anota la fecha de renovación de las que mantengas para no llevarte sorpresas.',
          'Money Manager detecta los pagos recurrentes en tus movimientos y te muestra cuánto te cuestan al mes y al año.',
        ],
      },
    ],
    related: ['gastos-hormiga', 'como-ahorrar-el-20-por-ciento'],
  },
  {
    slug: 'como-salir-de-deudas',
    title: 'Cómo salir de deudas: método avalancha y bola de nieve',
    description:
      'Dos métodos para pagar tus deudas más rápido, la diferencia entre avalancha y bola de nieve y cómo elegir el que mejor te encaja.',
    intro:
      'Tener varias deudas a la vez abruma. Un método claro te dice a cuál dedicar cada euro extra.',
    sections: [
      {
        heading: 'Paso previo: conoce tus deudas',
        paragraphs: [
          'Haz una lista con el importe pendiente, el tipo de interés y la cuota mínima de cada una. Sin esa foto completa es imposible priorizar.',
        ],
      },
      {
        heading: 'Método avalancha',
        paragraphs: [
          'Pagas el mínimo en todas y destinas todo lo extra a la que tenga el interés más alto. Es la opción que menos intereses te cuesta en total.',
        ],
      },
      {
        heading: 'Método bola de nieve',
        paragraphs: [
          'Atacas primero la deuda más pequeña. Cuando la terminas, sumas su cuota a la siguiente. Sale algo más caro, pero ver deudas desaparecer rápido ayuda a no rendirse.',
        ],
      },
      {
        heading: 'Cómo elegir',
        paragraphs: [
          'Si te motivan los números, avalancha. Si necesitas victorias rápidas, bola de nieve. Lo mejor es el que vayas a mantener. Evita pedir nuevos créditos para pagar los anteriores y habla con tu entidad si no puedes afrontar las cuotas.',
        ],
      },
    ],
    related: ['como-hacer-un-presupuesto-mensual', 'fondo-de-emergencia'],
  },
];

export const findGuide = (slug: string | undefined): Guide | undefined =>
  GUIDES.find((g) => g.slug === slug);
