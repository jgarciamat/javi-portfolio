import type { CourseChapter } from '@domain/model/Course';

/** Chapters about index funds, ETFs and compound growth. Educational, not advice. */
export const CHAPTERS_FUNDS: CourseChapter[] = [
  {
    id: 'fondos-indexados',
    emoji: '🧺',
    color: '#10b981',
    title: 'Fondos indexados: qué son y por qué los eligen tantos inversores',
    titleEn: 'Index funds: what they are and why so many investors choose them',
    summary:
      'Una cesta que copia un índice completo, con comisiones bajas y diversificación automática. Con sus ventajas y sus riesgos.',
    summaryEn:
      'A basket that copies a whole index, with low fees and automatic diversification. With its pros and its risks.',
    level: 1,
    topic: 'funds',
    blocks: [
      {
        k: 'p',
        t: 'Imagina que, en vez de elegir una acción, pudieras comprar un trocito de las 500 mayores empresas de Estados Unidos con una sola operación. Eso es, en esencia, un fondo indexado: un fondo de inversión cuyo único objetivo es parecerse lo máximo posible a un índice de mercado, sin intentar superarlo.',
      },
      { k: 'h', t: 'Qué es un índice' },
      {
        k: 'p',
        t: 'Un índice es una lista de empresas con una regla para calcular un número que resume su comportamiento. El S&P 500 reúne 500 grandes empresas de EE. UU.; el IBEX 35, 35 empresas españolas; el MSCI World, unas 1.400 compañías de países desarrollados (la cifra varía con el tiempo). Casi todos los índices se ponderan por capitalización: cuanto más vale una empresa en bolsa, más pesa en el índice.',
      },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'Un fondo indexado no intenta adivinar qué empresa subirá. Compra todas las del índice en la misma proporción y se conforma con la rentabilidad del mercado, menos una comisión pequeña.',
      },
      { k: 'h', t: 'Cómo se replica un índice' },
      {
        k: 'ul',
        items: [
          'Replicación física completa: el fondo compra todas las acciones del índice en su misma proporción. Es la más sencilla y transparente.',
          'Replicación física por muestreo: compra una selección representativa de las empresas, útil cuando el índice tiene miles de valores pequeños.',
          'Replicación sintética: el fondo no compra los valores, sino un contrato (swap) con un banco que le promete la rentabilidad del índice. Añade riesgo de contrapartida, aunque la normativa europea lo limita.',
        ],
      },
      {
        k: 'p',
        t: 'Ningún fondo copia el índice a la perfección. La diferencia entre la rentabilidad del fondo y la del índice se llama tracking difference, y viene sobre todo de las comisiones y de pequeños costes de operar.',
      },
      { k: 'h', t: 'Las comisiones: el factor que sí puedes controlar' },
      {
        k: 'p',
        t: 'Nadie controla lo que hará el mercado, pero sí cuánto pagas por invertir. La comisión anual (TER, ratio de gastos totales) se descuenta cada día del valor del fondo sin que la veas. Un fondo indexado suele cobrar entre el 0,05 % y el 0,3 % anual; un fondo de gestión activa, entre el 1 % y el 2,5 %.',
      },
      {
        k: 'table',
        head: ['Comisión anual', 'Aportando 200 €/mes durante 30 años al 7 % bruto'],
        rows: [
          ['0,2 % (indexado típico)', 'Unos 224.900 €'],
          ['1,5 % (activo típico)', 'Unos 175.200 €'],
          ['Diferencia', 'Unos 49.600 € menos, por pagar 1,3 puntos más de comisión'],
        ],
      },
      {
        k: 'ex',
        title: 'Ejemplo ilustrativo',
        t: 'Cifras de una simulación con una rentabilidad bruta supuesta del 7 % anual constante, que no está garantizada. La calculadora de interés compuesto de esta pestaña te permite probar tus propios números.',
      },
      { k: 'h', t: 'Por qué muchos inversores los eligen' },
      {
        k: 'ul',
        items: [
          'Diversificación inmediata: cientos o miles de empresas en un solo producto reducen el riesgo de que una sola quiebra te arruine.',
          'Costes bajos: cada euro que no se queda el gestor sigue trabajando para ti por interés compuesto.',
          'Sencillez: no hay que elegir acciones ni momentos de compra.',
          'Evidencia histórica: informes como el SPIVA de S&P Dow Jones Indices muestran que, a 10 o 15 años, la mayoría de los fondos de gestión activa no supera a su índice de referencia una vez descontadas las comisiones.',
          'Ventaja fiscal en España: los fondos (no los ETF) permiten traspasar a otro fondo sin pagar impuestos hasta que retiras el dinero.',
        ],
      },
      { k: 'h', t: 'Los riesgos y límites, sin maquillaje' },
      {
        k: 'warn',
        title: 'Un fondo indexado de bolsa también pierde dinero',
        t: 'Si el mercado cae un 40 %, tu fondo cae un 40 %. Diversificar reduce el riesgo de una empresa, no el riesgo de que todo el mercado baje. En 2008 y en 2020 hubo caídas de ese tamaño; algunas tardaron años en recuperarse.',
      },
      {
        k: 'ul',
        items: [
          'Riesgo de mercado: el valor sube y baja con la bolsa. Necesitas un plazo largo (5-10 años o más) y no depender de ese dinero.',
          'Concentración: muchos índices globales tienen más del 60 % en empresas de EE. UU. y muchas tecnológicas grandes. Está diversificado, pero no uniformemente.',
          'Riesgo de divisa: si el fondo invierte en dólares y tú ahorras en euros, las fluctuaciones del tipo de cambio cuentan.',
          'Décadas perdidas: el Nikkei japonés tardó 34 años en recuperar su máximo de 1989 (lo hizo en 2024) y el S&P 500 terminó la década de 2000 a 2009 con una rentabilidad total ligeramente negativa. El pasado no garantiza el futuro.',
          'Riesgo de comportamiento: el mayor error es vender en pánico en una caída. Un fondo bueno gestionado por un inversor nervioso da malos resultados.',
        ],
      },
      { k: 'chart', id: 'horizon' },
      { k: 'calc', id: 'compound' },
      {
        k: 'tip',
        title: 'Antes de elegir un fondo, mira estas cinco cosas',
        t: '1) El índice que replica y qué contiene. 2) El TER y la comisión de custodia o de la plataforma. 3) Si es de acumulación o reparto. 4) La divisa y si cubre el riesgo de cambio. 5) El tamaño del fondo y su tracking difference histórico. Todo está en el documento de datos fundamentales (DFI/KID) que cada fondo debe publicar.',
      },
      {
        k: 'key',
        title: 'Recuerda',
        t: 'Esto es educación financiera, no una recomendación. Qué te conviene depende de tu situación, tu plazo y tu tolerancia al riesgo; consulta con un asesor financiero independiente.',
      },
    ],
    glossary: [
      {
        term: 'Índice',
        def: 'Lista de empresas con una fórmula que resume cómo se mueve un mercado o una parte de él.',
      },
      {
        term: 'TER',
        def: 'Total Expense Ratio: porcentaje anual que cobra el fondo por gestión, custodia y otros gastos.',
      },
      {
        term: 'Tracking difference',
        def: 'Diferencia entre la rentabilidad del fondo y la del índice que replica.',
      },
      {
        term: 'Capitalización',
        def: 'Valor total en bolsa de una empresa: precio de la acción por número de acciones.',
      },
      {
        term: 'Diversificación',
        def: 'Repartir el dinero entre muchos activos para que el fallo de uno no arruine el conjunto.',
      },
      {
        term: 'DFI / KID',
        def: 'Documento de datos fundamentales: ficha oficial de pocas páginas con costes, riesgo (escala 1-7) y escenarios.',
      },
    ],
  },
  {
    id: 'etf-vs-fondos',
    emoji: '⚖️',
    color: '#06b6d4',
    title: 'ETF frente a fondos de inversión: qué cambia de verdad',
    titleEn: 'ETFs vs mutual funds: what really changes',
    summary:
      'Dos formas de comprar la misma cesta. Cómo se compran, qué cuestan y cómo tributan en España.',
    summaryEn:
      'Two ways of buying the same basket: how they trade, what they cost and how they are taxed in Spain.',
    level: 2,
    topic: 'funds',
    blocks: [
      {
        k: 'p',
        t: 'Un ETF (Exchange Traded Fund) es un fondo que cotiza en bolsa. Muchos ETF y fondos indexados replican exactamente el mismo índice, así que la rentabilidad bruta es casi idéntica. Las diferencias están en cómo los compras, cuánto cuestan y cómo tributan.',
      },
      {
        k: 'table',
        head: ['', 'Fondo indexado', 'ETF'],
        rows: [
          ['Dónde se compra', 'Banco, gestora o plataforma de fondos', 'En bolsa, con un bróker'],
          ['Precio', 'Un precio al día (valor liquidativo)', 'Cambia en tiempo real'],
          [
            'Cuándo se ejecuta',
            'Al cierre del día; el dinero llega en 2-4 días',
            'Al momento en horario de mercado',
          ],
          [
            'Importe',
            'Pueden admitir cualquier importe o participaciones fraccionadas',
            'Normalmente participaciones enteras (algunos brókers fraccionan)',
          ],
          [
            'Comisión',
            'TER del fondo; algunas plataformas cobran custodia',
            'TER del ETF más comisión de compraventa y diferencial',
          ],
          ['Aportaciones periódicas', 'Muy fáciles de automatizar', 'Según el bróker'],
          ['Traspaso sin tributar (España)', 'Sí', 'No'],
          [
            'Retención al vender (España)',
            '19 % sobre la ganancia (fondo español)',
            'Ninguna: lo declaras tú',
          ],
        ],
      },
      { k: 'h', t: 'Lo que hay que mirar antes de comprar un ETF' },
      {
        k: 'ul',
        items: [
          'Que sea UCITS (la normativa europea de fondos). Los ETF estadounidenses no se pueden contratar por minoristas europeos por la normativa PRIIPs.',
          'Acumulación o distribución: los de acumulación reinvierten los dividendos y no generan ingreso tributable hasta la venta; los de distribución pagan dividendos, que tributan cada año.',
          'Liquidez: elige ETF grandes (con mucho volumen) para que el diferencial entre compra y venta sea mínimo.',
          'Domicilio: muchos ETF UCITS se registran en Irlanda o Luxemburgo por razones fiscales con EE. UU. Es normal.',
        ],
      },
      { k: 'h', t: 'Fiscalidad en España, la diferencia más grande' },
      {
        k: 'p',
        t: 'En un fondo de inversión, puedes mover tu dinero de un fondo a otro mediante un traspaso: no se considera que hayas vendido, así que no tributas. Pagas impuestos solo cuando finalmente retiras dinero y solo por la ganancia contenida. Es un diferimiento fiscal que sigue aumentando tu capital invertido.',
      },
      {
        k: 'p',
        t: 'Con los ETF no existe esa figura: si vendes un ETF para comprar otro (incluso con el mismo índice), se declara una transmisión y tributas la ganancia en ese momento, en la base del ahorro (19-30 %, según los datos de la app). Eso no significa que sean peores: en un plan de largo plazo en que no se cambia de producto, la diferencia fiscal es nula.',
      },
      {
        k: 'warn',
        title: 'Brókers extranjeros',
        t: 'Si compras ETF a través de un bróker que no es español, normalmente no hay retención: tienes que declarar tú las ganancias y los dividendos, y si superas 50.000 € de valores en el extranjero a 31 de diciembre debes presentar el modelo 720.',
      },
      { k: 'calc', id: 'compound' },
      {
        k: 'key',
        title: 'En una frase',
        t: 'Fondo indexado y ETF persiguen lo mismo. El fondo gana en comodidad y en fiscalidad si piensas cambiar de producto; el ETF, en flexibilidad y en variedad de índices.',
      },
    ],
    glossary: [
      {
        term: 'UCITS',
        def: 'Directiva europea que regula los fondos armonizados y les da su protección.',
      },
      {
        term: 'Valor liquidativo',
        def: 'Precio de una participación de un fondo, calculado una vez al día.',
      },
      {
        term: 'Acumulación',
        def: 'Los dividendos se reinvierten dentro del fondo y suben su valor.',
      },
      {
        term: 'Diferencial (spread)',
        def: 'Diferencia entre el precio de compra y el de venta de un ETF en un momento dado.',
      },
      {
        term: 'Traspaso',
        def: 'Mover dinero de un fondo a otro sin pasar por tu cuenta; en España no tributa.',
      },
    ],
  },
  {
    id: 'interes-compuesto-fondos',
    emoji: '❄️',
    color: '#8b5cf6',
    title: 'Interés compuesto con fondos indexados: el tiempo trabaja para ti',
    titleEn: 'Compound growth with index funds: time works for you',
    summary:
      'Por qué empezar pronto pesa más que aportar mucho, qué hacen las comisiones y la inflación, y una calculadora para probarlo.',
    summaryEn:
      'Why starting early beats saving more, what fees and inflation do, with a calculator to try it.',
    level: 1,
    topic: 'funds',
    blocks: [
      {
        k: 'p',
        t: 'El interés compuesto significa ganar intereses sobre los intereses. Si inviertes 1.000 € y ganan un 7 % el primer año, el segundo año ganas el 7 % de 1.070 €, no de 1.000 €. Parece poco, pero con los años la curva se dobla hacia arriba.',
      },
      {
        k: 'table',
        head: ['Años', '1.000 € al 7 % anual (sin comisiones)'],
        rows: [
          ['1', '1.070 €'],
          ['5', '1.403 €'],
          ['10', '1.967 €'],
          ['20', '3.870 €'],
          ['30', '7.612 €'],
        ],
      },
      {
        k: 'key',
        title: 'Regla del 72',
        t: 'Divide 72 entre la rentabilidad anual y obtienes cuántos años tarda en duplicarse el dinero: al 7 % anual, unos 10 años; al 3 %, unos 24.',
      },
      { k: 'h', t: 'Empezar pronto pesa más que aportar mucho' },
      {
        k: 'p',
        t: 'El factor más potente es el tiempo. Los últimos años de un plan largo suman más ganancia que los primeros. Por eso 100 € al mes desde los 25 años suelen superar a 200 € al mes desde los 40, aunque en el segundo caso hayas puesto más dinero.',
      },
      { k: 'h', t: 'Los tres enemigos del interés compuesto' },
      {
        k: 'ul',
        items: [
          'Comisiones: una diferencia de 1,3 puntos al año puede costar más de una quinta parte del capital final a 30 años.',
          'Inflación: 100.000 € dentro de 30 años no compran lo mismo que hoy. Con una inflación media del 2 %, equivalen a unos 55.000 € de hoy.',
          'Impuestos: en España la ganancia tributa al retirar, en la base del ahorro (19-30 %). Un fondo permite diferirlos con traspasos.',
        ],
      },
      { k: 'calc', id: 'compound' },
      {
        k: 'warn',
        title: 'La rentabilidad no es una línea recta',
        t: 'La calculadora usa un rendimiento constante porque es la forma más sencilla de explicar el efecto del tiempo. Los mercados reales suben y bajan, con años negativos incluidos; por eso se muestra una banda pesimista y optimista. Un 7 % medio no significa un 7 % cada año.',
      },
      { k: 'chart', id: 'volatility' },
      { k: 'chart', id: 'horizon' },
      {
        k: 'tip',
        title: 'Tres hábitos que ayudan a que funcione',
        t: 'Automatizar una aportación mensual. No mirar el valor cada día. Mantener un fondo de emergencia en una cuenta remunerada para no tener que vender en una caída.',
      },
    ],
    glossary: [
      {
        term: 'Interés compuesto',
        def: 'Los intereses ganados se suman al capital y generan, a su vez, más intereses.',
      },
      {
        term: 'Inflación',
        def: 'Subida general de precios: con el tiempo, el mismo dinero compra menos.',
      },
      { term: 'Rentabilidad real', def: 'Rentabilidad una vez descontada la inflación.' },
      { term: 'Aportación periódica', def: 'Cantidad fija que se invierte cada mes o trimestre.' },
      {
        term: 'TAE',
        def: 'Tasa anual equivalente: la rentabilidad de un año incluyendo el efecto de la capitalización.',
      },
    ],
  },
];
