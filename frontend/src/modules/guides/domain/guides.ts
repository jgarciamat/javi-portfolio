import { GUIDES_AUTONOMOS } from './guidesAutonomos';
import { GUIDES_RENTA_DEDUCCIONES } from './guidesRentaDeducciones';
import { GUIDES_RENTA_FAMILIA } from './guidesRentaFamilia';
import { GUIDES_TRAMITES } from './guidesTramites';

/** Short articles that answer what people search for and lead to the calculators and the app. */
export interface GuideSection {
  heading: string;
  paragraphs: string[];
}

/** An official page a guide is based on. */
export interface GuideSource {
  label: string;
  url: string;
}

export interface Guide {
  slug: string;
  /** Day (YYYY-MM-DD) the text last changed in a way that matters: «Actualizado» and `dateModified`. */
  updated: string;
  title: string;
  /** Meta description (search results snippet). */
  description: string;
  intro: string;
  sections: GuideSection[];
  /** Calculator that goes with the guide. */
  tool?: { to: string; label: string };
  /** Slugs of other guides worth reading next. */
  related: string[];
  /** Official pages the guide is based on (AEAT, Seguridad Social, BOE…), with `checked`. */
  sources?: GuideSource[];
  /** Day (YYYY-MM-DD) the sources were checked. */
  checked?: string;
  /** Every section is a step: the page also gets `HowTo` structured data. */
  howTo?: boolean;
}

export const GUIDES: Guide[] = [
  {
    slug: 'metodo-50-30-20',
    updated: '2026-10-11',
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
          'En Finanverso puedes poner un presupuesto a cada categoría y la app te avisa cuando te acercas al límite.',
        ],
      },
    ],
    tool: { to: '/calculadora-50-30-20', label: 'Calculadora 50/30/20' },
    related: ['como-ahorrar-el-20-por-ciento', 'como-hacer-un-presupuesto-mensual'],
  },
  {
    slug: 'como-ahorrar-el-20-por-ciento',
    updated: '2026-10-11',
    title: 'Cómo ahorrar el 20 % de tu sueldo (aunque parezca imposible)',
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
          'Mira tu tasa de ahorro, que es el porcentaje de tus ingresos que has guardado. Finanverso la calcula sola cada mes y te la enseña en el resumen.',
        ],
      },
    ],
    tool: { to: '/simulador-ahorro', label: 'Simulador de ahorro' },
    related: ['metodo-50-30-20', 'gastos-hormiga', 'fondo-de-emergencia'],
  },
  {
    slug: 'fondo-de-emergencia',
    updated: '2026-10-11',
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
          'Una meta de ahorro con una cantidad y una fecha te ayuda a mantener el ritmo. En Finanverso puedes crearla y ver el progreso.',
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
    updated: '2026-10-11',
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
    updated: '2026-10-11',
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
          'A mitad de mes comprueba cómo vas. Un presupuesto que nunca se revisa se abandona. En Finanverso ves cuánto llevas gastado en cada categoría y recibes un aviso si te acercas al límite.',
        ],
      },
    ],
    tool: { to: '/calculadora-50-30-20', label: 'Calculadora 50/30/20' },
    related: ['metodo-50-30-20', 'gastos-hormiga'],
  },
  {
    slug: 'gastos-hormiga',
    updated: '2026-10-11',
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
    updated: '2026-10-11',
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
          'Finanverso detecta los pagos recurrentes en tus movimientos y te muestra cuánto te cuestan al mes y al año.',
        ],
      },
    ],
    related: ['gastos-hormiga', 'como-ahorrar-el-20-por-ciento'],
  },
  {
    slug: 'como-salir-de-deudas',
    updated: '2026-10-11',
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
  {
    slug: 'como-calcular-la-cuota-de-una-hipoteca',
    updated: '2026-10-13',
    title: 'Cómo calcular la cuota de una hipoteca y sus intereses',
    description:
      'Qué influye en la cuota de una hipoteca o un préstamo, cómo se calcula con cuota fija y por qué el plazo cambia tanto el total que pagas.',
    intro:
      'Antes de firmar una hipoteca o un préstamo conviene saber cuánto pagarás cada mes y, sobre todo, cuánto de ese dinero son intereses.',
    sections: [
      {
        heading: 'De qué depende la cuota',
        paragraphs: [
          'Tres datos mandan: el importe que pides, el tipo de interés y el plazo. Con cuota fija, cada mes pagas lo mismo; al principio la mayor parte son intereses y con el tiempo va pesando más el capital.',
        ],
      },
      {
        heading: 'Un ejemplo con números',
        paragraphs: [
          'Para 150.000 € al 3 % durante 25 años, la cuota ronda los 711 € al mes. En total pagarías unos 213.000 €: más de 63.000 € serían intereses.',
          'Con el mismo importe e interés a 15 años, la cuota sube a unos 1.036 € al mes, pero los intereses totales bajan a unos 36.000 €. Cuanto más largo el plazo, más baja la cuota y más caro sale el préstamo.',
        ],
      },
      {
        heading: 'Qué más mirar',
        paragraphs: [
          'La cuota no incluye comisiones, seguros vinculados ni el impuesto de la operación. Compara siempre la TAE, que recoge más costes que el tipo nominal, y pide la oferta vinculante (FEIN) a cada banco.',
          'Como regla prudente, muchos expertos recomiendan que las deudas no superen un tercio de tus ingresos netos mensuales.',
        ],
      },
    ],
    tool: { to: '/calculadora-hipoteca', label: 'Calculadora de hipoteca y préstamo' },
    related: ['como-salir-de-deudas', 'como-hacer-un-presupuesto-mensual'],
  },
  {
    slug: 'inflacion-y-ahorro',
    updated: '2026-10-13',
    title: 'Inflación y ahorro: por qué el dinero parado pierde valor',
    description:
      'Qué es la inflación, cuánto poder adquisitivo pierde tu dinero con los años con ejemplos y qué opciones existen para protegerlo.',
    intro:
      'Con una inflación del 3 % anual, 10.000 € parados en una cuenta sin rentabilidad compran un 26 % menos al cabo de diez años. Sigue siendo la misma cantidad, pero vale menos.',
    sections: [
      {
        heading: 'Cómo funciona',
        paragraphs: [
          'La inflación es la subida generalizada de los precios. Si todo cuesta un 3 % más cada año, lo que hoy compras con 100 € dentro de un año costará 103 €.',
          'Con ese ritmo, 10.000 € de hoy equivalen a unos 7.441 € dentro de diez años, o al revés: necesitarás unos 13.439 € para comprar lo mismo.',
        ],
      },
      {
        heading: 'Qué puedes hacer',
        paragraphs: [
          'Primero, separar el fondo de emergencia (que debe estar disponible y seguro) del dinero que no vas a necesitar en años.',
          'Para ese segundo bloque existen opciones con rentabilidades que intentan compensar la inflación, pero casi todas implican algún riesgo o falta de liquidez. Infórmate bien y, si hace falta, consulta a un asesor independiente.',
        ],
      },
      {
        heading: 'Calcula tu caso',
        paragraphs: [
          'Con la calculadora puedes probar tu cantidad, la inflación que supones y los años. Es una estimación con inflación constante, solo para entender el efecto.',
        ],
      },
    ],
    tool: { to: '/calculadora-inflacion', label: 'Calculadora de inflación' },
    related: ['interes-compuesto', 'fondo-de-emergencia'],
  },
  {
    slug: 'iva-para-autonomos-modelo-303',
    updated: '2026-10-13',
    title: 'IVA para autónomos: cómo se calcula y el modelo 303 trimestral',
    description:
      'Qué es el IVA repercutido y soportado, cómo desglosar una factura, cuándo se presenta el modelo 303 y el pago fraccionado del IRPF (modelo 130).',
    intro:
      'Si eres autónomo cobras IVA en tus facturas, pagas IVA en tus gastos y cada trimestre liquidas la diferencia con Hacienda. Entenderlo evita sustos.',
    sections: [
      {
        heading: 'IVA repercutido y soportado',
        paragraphs: [
          'El IVA repercutido es el que cobras a tus clientes. El soportado es el que pagas en gastos de tu actividad. Cada trimestre la diferencia es lo que ingresas (o compensas si sale a tu favor).',
          'Para desglosar una factura: una base de 100 € más un 21 % de IVA es un total de 121 €. Si solo tienes el total, la base es 121 / 1,21 = 100 €.',
        ],
      },
      {
        heading: 'Cuándo se presenta',
        paragraphs: [
          'El modelo 303 es trimestral y se presenta, en general, en los primeros 20 días de abril, julio y octubre; el del último trimestre, hasta el 30 de enero. El pago fraccionado del IRPF (modelo 130) sigue un calendario parecido.',
          'En el modelo 130, el caso general es adelantar el 20 % del rendimiento neto acumulado del año, descontando lo ya pagado en trimestres anteriores.',
        ],
      },
      {
        heading: 'Cómo ayuda Finanverso',
        paragraphs: [
          'En la sección Autónomos marcas qué categorías son de tu actividad y su tipo de IVA, y ves una estimación por trimestre. Es solo orientativa: no incluye deducciones ni regímenes especiales, así que contrástala con tu gestor.',
        ],
      },
    ],
    tool: { to: '/calculadora-iva', label: 'Calculadora de IVA' },
    related: [
      'modelo-130-paso-a-paso',
      'gastos-deducibles-autonomo',
      'como-hacer-un-presupuesto-mensual',
      'metodo-50-30-20',
      'modelo-303-casillas',
    ],
  },
  {
    slug: 'presupuesto-en-pareja',
    updated: '2026-10-13',
    title: 'Cómo llevar el dinero en pareja sin discutir',
    description:
      'Tres formas de organizar las finanzas de una pareja (todo junto, separado o proporcional), cómo repartir gastos y consejos para hablar de dinero.',
    intro:
      'Hablar de dinero en pareja es incómodo, pero acordar un sistema evita muchas discusiones. No hay uno perfecto: depende de vuestros ingresos y de cómo os sentís cómodos.',
    sections: [
      {
        heading: 'Tres sistemas habituales',
        paragraphs: [
          'Todo en común: un solo fondo del que salen todos los gastos. Es sencillo y transparente, y funciona mejor con ingresos parecidos.',
          'Cada uno lo suyo: cada persona paga sus gastos y se reparten los comunes a partes iguales. Da independencia, pero puede resultar injusto si los ingresos son muy distintos.',
          'Proporcional: los gastos comunes se reparten según lo que gana cada uno. Si una persona gana el doble que la otra, paga el doble de la cuenta común.',
        ],
      },
      {
        heading: 'Pasos para acordarlo',
        paragraphs: [
          'Listad juntos los gastos comunes del mes, decidid el sistema y fijad una aportación mensual a una cuenta compartida. Reservad también una cantidad personal para cada uno, sin tener que dar explicaciones.',
          'Revisad el acuerdo una vez al año o cuando cambie algo importante, como un sueldo o un hijo.',
        ],
      },
      {
        heading: 'Herramientas',
        paragraphs: [
          'En Finanverso puedes compartir tus movimientos, presupuestos y metas con tu pareja, y repartir gastos con amigos en «Gastos compartidos», donde se calcula quién debe a quién.',
        ],
      },
    ],
    related: ['metodo-50-30-20', 'como-hacer-un-presupuesto-mensual'],
  },
  {
    slug: 'como-ahorrar-para-un-viaje',
    updated: '2026-10-13',
    title: 'Cómo ahorrar para un viaje: plan paso a paso',
    description:
      'Calcula cuánto cuesta tu viaje, en cuántos meses puedes reunirlo y cómo automatizar el ahorro para llegar a la fecha sin agobios.',
    intro:
      'Un viaje es una de las mejores metas de ahorro porque tiene fecha y cantidad. Con un plan sencillo llegarás sin tirar de tarjeta.',
    sections: [
      {
        heading: '1. Ponle cifra y fecha',
        paragraphs: [
          'Suma vuelos, alojamiento, comidas, transporte local y un colchón del 10-15 % para imprevistos. Ese es tu objetivo, y la fecha de salida marca cuánto tiempo tienes.',
        ],
      },
      {
        heading: '2. Calcula la aportación mensual',
        paragraphs: [
          'Divide el objetivo entre los meses que faltan. Para reunir 3.000 € en 20 meses necesitas apartar 150 € al mes. Si no te cuadra, alarga la fecha o recorta el presupuesto del viaje.',
        ],
      },
      {
        heading: '3. Automatízalo',
        paragraphs: [
          'Programa una transferencia mensual a una cuenta aparte el día que cobras. Crea una meta en Finanverso con la cantidad y la fecha: verás el progreso y cuánto necesitas ahorrar cada mes.',
        ],
      },
      {
        heading: '4. Reserva con cabeza',
        paragraphs: [
          'Comparar fechas y reservar con antelación suele abaratar vuelos y alojamiento. Mantén el fondo de emergencia aparte: el viaje no debe vaciarlo.',
        ],
      },
    ],
    tool: { to: '/calculadora-objetivo-ahorro', label: 'Calculadora de objetivo de ahorro' },
    related: ['como-ahorrar-el-20-por-ciento', 'fondo-de-emergencia'],
  },
  {
    slug: 'independencia-financiera-regla-del-4',
    updated: '2026-10-13',
    title: 'Independencia financiera y la regla del 4 %: qué es y sus límites',
    description:
      'Qué significa la independencia financiera, cómo se calcula el capital necesario con la regla del 4 % y por qué hay que tomarla solo como una referencia.',
    intro:
      'La independencia financiera consiste en tener un patrimonio que cubra tus gastos sin depender de un sueldo. La regla del 4 % es una referencia muy citada para estimarlo.',
    sections: [
      {
        heading: 'La idea de la regla del 4 %',
        paragraphs: [
          'Propone que, retirando cada año alrededor del 4 % de un capital invertido, este ha podido durar décadas en el pasado. Dicho al revés: necesitas unas 25 veces tus gastos anuales.',
          'Si gastas 24.000 € al año, la cifra de referencia son unos 600.000 €. Con gastos de 12.000 €, serían 300.000 €.',
        ],
      },
      {
        heading: 'Sus límites',
        paragraphs: [
          'Nació de datos históricos de un mercado concreto y no garantiza nada. Cambian la rentabilidad futura, la inflación, los impuestos y los años que quieras que dure. Úsala como orden de magnitud, no como promesa.',
        ],
      },
      {
        heading: 'Qué puedes hacer ya',
        paragraphs: [
          'Conocer tus gastos reales, subir tu tasa de ahorro y revisar cuánto pesan las suscripciones y los gastos hormiga es el primer paso, tengas o no esta meta. Con el simulador puedes ver cuánto tardarías en llegar a un capital con tus aportaciones.',
        ],
      },
    ],
    tool: { to: '/simulador-ahorro', label: 'Simulador de ahorro' },
    related: ['interes-compuesto', 'inflacion-y-ahorro'],
  },
  ...GUIDES_AUTONOMOS,
  ...GUIDES_RENTA_FAMILIA,
  ...GUIDES_RENTA_DEDUCCIONES,
  ...GUIDES_TRAMITES,
];

export const findGuide = (slug: string | undefined): Guide | undefined =>
  GUIDES.find((g) => g.slug === slug);

/** A piece of paragraph text: plain text or an internal link written as `[label](/path)`. */
export type InlinePart = string | { label: string; to: string };

const INLINE_LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

/** Splits a paragraph into text and internal links. */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_LINK)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ label: m[1], to: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** «18 de octubre de 2026» for a day written `2026-10-18`. */
export const longDate = (day: string): string =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** Reminder shown under the sources of a guide. */
export const GUIDE_NOTICE =
  'Contenido orientativo: las normas y los plazos cambian y tu caso puede tener excepciones. No sustituye a la información oficial ni al consejo de un asesor; contrástalo siempre en la fuente antes de actuar.';
