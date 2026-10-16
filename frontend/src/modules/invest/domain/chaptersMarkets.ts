import type { Chapter } from './types';

/** Chapters about risk, the stock market, world exchanges and bonds. Educational, not advice. */
export const CHAPTERS_MARKETS: Chapter[] = [
  {
    id: 'riesgo-y-volatilidad',
    emoji: '🎢',
    color: '#f43f5e',
    title: 'Riesgo, volatilidad y horizonte: por qué los precios se mueven',
    titleEn: 'Risk, volatility and time horizon: why prices move',
    summary:
      'Qué significan volatilidad y caída máxima, y cómo cambia el abanico de resultados según el plazo.',
    summaryEn:
      'What volatility and drawdown mean, and how the range of outcomes changes with your time horizon.',
    level: 1,
    topic: 'basics',
    blocks: [
      {
        k: 'p',
        t: 'Los precios de los activos no suben en línea recta. Suben y bajan por noticias, resultados de las empresas, tipos de interés, miedo y euforia. Eso es la volatilidad: cuánto se mueve el precio. Una cuenta de ahorro casi no se mueve; la bolsa se mueve bastante; las criptomonedas, muchísimo.',
      },
      { k: 'chart', id: 'volatility' },
      {
        k: 'key',
        title: 'Riesgo no es solo volatilidad',
        t: 'Riesgo es la posibilidad de perder dinero de forma permanente o de tener que vender en el peor momento. La volatilidad es solo una parte: lo que más daña es necesitar el dinero justo cuando el precio está bajo.',
      },
      { k: 'h', t: 'La caída máxima (drawdown)' },
      {
        k: 'p',
        t: 'El drawdown mide cuánto ha caído un activo desde su máximo anterior. Una caída del 50 % exige una subida del 100 % para volver al punto de partida. Cuanto más profunda es la caída, más cuesta recuperarla.',
      },
      {
        k: 'table',
        head: ['Caída', 'Subida necesaria para recuperarte'],
        rows: [
          ['−10 %', '+11 %'],
          ['−20 %', '+25 %'],
          ['−33 %', '+50 %'],
          ['−50 %', '+100 %'],
          ['−80 %', '+400 %'],
        ],
      },
      { k: 'chart', id: 'drawdown' },
      { k: 'h', t: 'El plazo cambia el abanico de resultados' },
      {
        k: 'p',
        t: 'En un año, la bolsa puede terminar muy por debajo o muy por encima de donde empezó. Con más años, las subidas y bajadas se compensan en parte y el rango de resultados se vuelve menos extremo, aunque sigue habiendo incertidumbre. Esto no es una garantía: hay periodos largos de rentabilidad pobre.',
      },
      { k: 'chart', id: 'horizon' },
      {
        k: 'warn',
        title: 'Esto es una simulación',
        t: 'Los gráficos de esta pestaña se generan con números aleatorios con una semilla fija: sirven para entender el mecanismo, no para predecir nada. No son datos reales de ningún activo.',
      },
      { k: 'h', t: 'Cómo se gestiona el riesgo, en pocas ideas' },
      {
        k: 'ul',
        items: [
          'Diversificar entre muchos activos y entre tipos de activo.',
          'Ajustar el plazo: el dinero que necesitarás en menos de 3-5 años no debería estar en activos muy volátiles.',
          'Tener un fondo de emergencia aparte (3-6 meses de gastos).',
          'Invertir de forma periódica en lugar de todo de golpe reduce el riesgo de elegir un mal momento.',
          'Conocer tu tolerancia real: ¿cómo reaccionarías si tu inversión cayera un 30 %?',
        ],
      },
    ],
    glossary: [
      {
        term: 'Volatilidad',
        def: 'Cuánto fluctúa el precio de un activo; se mide con la desviación típica de sus rentabilidades.',
      },
      { term: 'Drawdown', def: 'Caída porcentual desde el último máximo hasta el punto más bajo.' },
      {
        term: 'Horizonte temporal',
        def: 'Tiempo durante el que piensas mantener la inversión antes de necesitar el dinero.',
      },
      {
        term: 'Tolerancia al riesgo',
        def: 'Cuánta pérdida temporal puedes soportar sin tomar malas decisiones.',
      },
      {
        term: 'Simulación de Monte Carlo',
        def: 'Técnica que repite miles de escenarios aleatorios para ver el abanico de resultados posibles.',
      },
    ],
  },
  {
    id: 'renta-fija-bonos',
    emoji: '🏛️',
    color: '#0284c7',
    title: 'Renta fija y bonos: precio, rentabilidad y tipos de interés',
    titleEn: 'Fixed income and bonds: price, yield and interest rates',
    summary:
      'Por qué el precio de un bono baja cuando suben los tipos, qué es la TIR y la duración, y por qué rinde menos pero es más seguro.',
    summaryEn:
      'Why a bond price falls when rates rise, what yield and duration are, and why bonds yield less but are safer.',
    level: 2,
    topic: 'bonds',
    blocks: [
      {
        k: 'p',
        t: 'Un bono es un préstamo que haces a un Estado o a una empresa. Tiene un nominal (lo que te devuelven al final, por ejemplo 100), un cupón (el interés que te pagan cada año, por ejemplo 3 %) y un vencimiento (cuándo te devuelven el dinero). Si lo mantienes hasta el final y el emisor paga, sabes por adelantado cuánto recibirás.',
      },
      { k: 'h', t: 'Por qué el precio cambia' },
      {
        k: 'p',
        t: 'Un bono ya emitido sigue pagando su cupón fijo. Si los tipos de interés suben y los bonos nuevos pagan más, el tuyo pierde atractivo y su precio baja hasta que su rentabilidad se iguale con la de los nuevos. Si los tipos bajan, tu cupón es más valioso y su precio sube. Precio y rentabilidad se mueven en sentido contrario.',
      },
      { k: 'chart', id: 'bondCurve' },
      {
        k: 'table',
        head: ['Rentabilidad exigida (TIR)', 'Precio de un bono a 10 años con cupón del 3 %'],
        rows: [
          ['2 %', '≈ 109,0'],
          ['3 %', '100,0 (a la par)'],
          ['4 %', '≈ 91,9'],
          ['5 %', '≈ 84,6'],
        ],
      },
      { k: 'h', t: 'Cupón, rentabilidad (TIR) y precio' },
      {
        k: 'ul',
        items: [
          'Cupón: porcentaje fijo del nominal que se paga cada año. No cambia.',
          'TIR o yield (rentabilidad a vencimiento): la rentabilidad anual que obtendrás si compras al precio de hoy y lo mantienes hasta el final, cobrando todos los cupones.',
          'Si compras por debajo de 100, ganas además la diferencia al vencimiento; si compras por encima, la pierdes.',
        ],
      },
      { k: 'h', t: 'Duración: cuánto se mueve el precio' },
      {
        k: 'p',
        t: 'La duración mide la sensibilidad del precio a los tipos. Una duración modificada de 8,5 significa que, si los tipos suben un punto porcentual, el precio baja aproximadamente un 8,5 %. Los bonos a largo plazo tienen más duración, y por eso se mueven más.',
      },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'Cuando los tipos de interés suben, los bonos que ya existen valen menos; cuando bajan, valen más. Si mantienes el bono hasta el vencimiento y el emisor paga, esos vaivenes no cambian lo que cobras.',
      },
      {
        k: 'ex',
        title: 'Ejemplo',
        t: 'Un bono a 10 años con cupón del 3 % cotiza a 100. Si la TIR de mercado pasa del 3 % al 4 %, su precio cae a unos 91,9 (−8,1 %). Si baja al 2 %, sube a unos 109,0 (+9,0 %). Si lo mantienes hasta el vencimiento y el emisor paga, recibes los 100 igualmente; la caída solo se materializa si vendes antes.',
      },
      { k: 'calc', id: 'bond' },
      { k: 'h', t: 'Por qué rinde menos pero es más seguro' },
      {
        k: 'ul',
        items: [
          'El inversor acepta una rentabilidad menor a cambio de que sea más probable cobrar. Es el mismo principio de riesgo y rentabilidad: a más riesgo, se exige más rentabilidad.',
          'Los Estados con buena solvencia pagan intereses menores que los de menor solvencia o que las empresas.',
          'Prima de riesgo país: diferencia entre la rentabilidad de la deuda de un país y la del bono alemán a 10 años, que se toma como referencia de seguridad en Europa. Cuando sube, el mercado ve más riesgo.',
          'Calificación crediticia (rating): las agencias asignan notas (AAA, AA, A, BBB...); por debajo de BBB se habla de bono basura (high yield), que paga más pero tiene más riesgo de impago.',
          'Con la inflación alta, la rentabilidad real de un bono puede ser negativa.',
        ],
      },
      {
        k: 'warn',
        title: 'Seguro no significa sin riesgo',
        t: 'Un bono puede perder valor si suben los tipos (riesgo de tipos), si la inflación se dispara (riesgo de inflación) o si el emisor no paga (riesgo de crédito). Los bonos del Estado español no están garantizados como un depósito bancario.',
      },
      {
        k: 'tip',
        title: 'Letras, bonos y obligaciones',
        t: 'En España el Tesoro emite Letras (6 y 12 meses, sin cupón: compras por debajo del nominal), Bonos (3 y 5 años) y Obligaciones (10, 15 y 30 años). Las Letras se pueden comprar en subasta o en el mercado secundario con un bróker o un banco.',
      },
    ],
    glossary: [
      {
        term: 'Nominal',
        def: 'Importe que el emisor devuelve al vencimiento; el precio se expresa como porcentaje del nominal.',
      },
      {
        term: 'Cupón',
        def: 'Interés periódico que paga el bono, fijado como porcentaje del nominal.',
      },
      {
        term: 'TIR / yield',
        def: 'Tasa interna de retorno: rentabilidad anual si compras hoy y mantienes hasta el vencimiento.',
      },
      {
        term: 'Duración',
        def: 'Medida de la sensibilidad del precio del bono a los cambios en los tipos de interés, en años.',
      },
      {
        term: 'Prima de riesgo',
        def: 'Diferencia de rentabilidad que exige el mercado a un país respecto a otro de referencia.',
      },
      {
        term: 'Rating',
        def: 'Nota que una agencia da a la capacidad de un emisor de pagar su deuda.',
      },
      {
        term: 'Cupón corrido',
        def: 'Parte del cupón ya devengada desde el último pago hasta que vendes o compras el bono.',
      },
    ],
  },
  {
    id: 'cuanto-tributa',
    emoji: '🧾',
    color: '#64748b',
    title: '¿Cuánto tributa mi ganancia? La base del ahorro en España',
    titleEn: 'How much tax will my gain pay? Spain’s savings base',
    summary:
      'La escala del ahorro, qué se suma, cómo se compensan las pérdidas y una calculadora de la cuota.',
    summaryEn: 'The savings scale, what is added up, how losses offset gains and a tax calculator.',
    level: 1,
    topic: 'tax',
    blocks: [
      {
        k: 'p',
        t: 'En España, los intereses, los dividendos y las ganancias por vender inversiones tributan en la base imponible del ahorro, separada del sueldo. Se aplica una escala progresiva por tramos: solo la parte que cae en cada tramo paga su porcentaje.',
      },
      { k: 'calc', id: 'tax' },
      {
        k: 'key',
        title: 'Qué se suma en la base del ahorro',
        t: 'Intereses de cuentas y depósitos, dividendos, cupones de bonos y ganancias o pérdidas patrimoniales por vender acciones, fondos, ETF, criptomonedas, oro o derivados. No se suma el sueldo ni los alquileres: van a la base general.',
      },
      {
        k: 'ul',
        items: [
          'Pérdidas: las ventas con pérdida compensan las ganancias del mismo año. Lo que sobra se arrastra durante los 4 años siguientes.',
          'Compensación cruzada: el saldo negativo de las ganancias por ventas puede compensar hasta el 25 % de los intereses y dividendos de ese año, y viceversa.',
          'Regla de los dos meses: si vendes con pérdida y recompras el mismo valor cotizado en los dos meses anteriores o posteriores, la pérdida no cuenta hasta que vendas lo recomprado (un año para valores no cotizados y fondos).',
          'Retención: muchas rentas llevan retención del 19 %, que es un pago a cuenta; el resultado final se calcula en la renta (modelo 100).',
        ],
      },
      {
        k: 'warn',
        title: 'Varía según tu situación',
        t: 'Navarra y el País Vasco tienen régimen foral. La escala puede cambiar por ley cada año, y tu caso puede tener particularidades (herencias, no residentes, ganancias exentas por reinversión). La calculadora es orientativa; confirma con un gestor o con el programa de la Agencia Tributaria.',
      },
    ],
    glossary: [
      {
        term: 'Base del ahorro',
        def: 'Parte de la renta que incluye intereses, dividendos y ganancias patrimoniales; se grava con su propia escala.',
      },
      {
        term: 'Ganancia patrimonial',
        def: 'Diferencia positiva entre el precio de venta y el de compra de un activo.',
      },
      {
        term: 'Retención',
        def: 'Parte del pago que se queda el pagador y entrega a Hacienda a cuenta del impuesto.',
      },
      {
        term: 'FIFO',
        def: 'Primero en entrar, primero en salir: se considera que vendes antes lo más antiguo.',
      },
      { term: 'Modelo 100', def: 'Declaración anual del IRPF (la «Renta»).' },
    ],
  },
];
