import type { Chapter } from './types';

/**
 * The shares chapter. Educational only: companies are named as examples of each type
 * (as of writing), never as recommendations, and no price or forecast is given.
 */
export const CHAPTERS_STOCKS: Chapter[] = [
  {
    id: 'acciones',
    emoji: '🏢',
    color: '#6366f1',
    title: 'Acciones: qué son, qué tipos hay y cómo se invierte paso a paso',
    titleEn: 'Shares: what they are, which types exist and how to invest step by step',
    summary:
      'Todo sobre las acciones: por qué se mueven, tipos de empresas, cómo abrir cuenta y comprar, costes, dividendos, ratios, cotizaciones, mercados bursátiles y sus horarios (¿abierto o cerrado ahora?), riesgos e impuestos en España.',
    summaryEn:
      'Everything about shares: why they move, types of companies, how to open an account and buy, costs, dividends, ratios, quotes, stock markets and their hours (open or closed now?), risks and Spanish taxes.',
    level: 1,
    topic: 'stocks',
    blocks: [
      {
        k: 'warn',
        title: 'Esto es educación, no una lista de acciones para comprar',
        t: 'Aquí aprenderás cómo funcionan las acciones y qué mirar. No se recomienda ninguna empresa, no se dan precios objetivo ni previsiones. Las empresas que aparecen son ejemplos de cada tipo, a fecha de redacción, y pueden cambiar de categoría o de situación.',
      },
      { k: 'h', t: '1. Qué es una acción' },
      {
        k: 'p',
        t: 'Una acción es una parte del capital de una empresa. Si una compañía tiene 1.000 acciones y tú compras 10, eres dueño del 1 % de la empresa. No eres el dueño de «una silla» ni de «una fábrica»: eres copropietario del negocio entero, con sus beneficios, sus deudas y sus riesgos.',
      },
      {
        k: 'ul',
        items: [
          'Derecho económico: a cobrar dividendos cuando la junta los aprueba y a parte del valor de la empresa si se vende.',
          'Derecho de voto: en la junta de accionistas, en proporción a tus acciones.',
          'Último de la fila: si la empresa quiebra, primero cobran los trabajadores, Hacienda, los bancos y los bonistas. Al accionista, lo último, y a menudo nada.',
        ],
      },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'Comprar una acción es comprar un trozo de un negocio. A largo plazo, su valor depende de los beneficios que genere; a corto plazo, de lo que el mercado espere y sienta.',
      },
      { k: 'h', t: '2. Por qué suben y bajan los precios' },
      {
        k: 'p',
        t: 'En cada momento, el precio sale del encuentro entre quien quiere comprar y quien quiere vender (oferta y demanda). Detrás de ese encuentro hay razones que cambian las expectativas:',
      },
      {
        k: 'ul',
        items: [
          'Resultados de la empresa: ventas, beneficios, deuda y, sobre todo, lo que se espera de los próximos años.',
          'Tipos de interés: cuando suben, financiarse cuesta más y los inversores exigen más rentabilidad, y suelen bajar las valoraciones.',
          'Economía e inflación: en recesión, bajan los ingresos de muchas empresas.',
          'Noticias del sector o de la empresa: un producto nuevo, una multa, un cambio de directivos, una ley.',
          'Sentimiento: el miedo y la euforia mueven los precios a corto plazo más de lo que justificarían los fundamentos.',
        ],
      },
      { k: 'chart', id: 'volatility' },
      { k: 'h', t: '3. Tipos de acciones (con ejemplos de empresas conocidas)' },
      {
        k: 'p',
        t: 'No todas las acciones se comportan igual. Estas categorías se usan mucho; una empresa puede estar en varias a la vez. Los nombres son ejemplos didácticos a fecha de redacción: no es una recomendación.',
      },
      {
        k: 'table',
        head: ['Tipo', 'Qué es', 'Ejemplos conocidos', 'Qué tener en cuenta'],
        rows: [
          [
            'Grandes empresas (blue chips)',
            'Compañías enormes, sólidas y muy conocidas',
            'Inditex, Iberdrola, Santander; Apple, Microsoft, Nestlé',
            'Más estables, pero también caen en las crisis',
          ],
          [
            'De crecimiento',
            'Reinvierten casi todo para crecer rápido',
            'Compañías tecnológicas y de plataformas, como Amazon o Nvidia',
            'Valoraciones altas: si fallan las expectativas, caen mucho',
          ],
          [
            'De valor',
            'Cotizan baratas respecto a sus beneficios o a sus activos',
            'Bancos y petroleras, como BBVA o Repsol',
            'A veces son baratas por una buena razón («trampa de valor»)',
          ],
          [
            'De dividendo',
            'Reparten una parte alta de sus beneficios',
            'Empresas con tradición de dividendos, como Coca-Cola o Procter & Gamble',
            'Un dividendo muy alto puede avisar de problemas; no está garantizado',
          ],
          [
            'Pequeñas (small caps)',
            'Empresas de poca capitalización',
            'Muchas compañías desconocidas para el gran público',
            'Más potencial y mucho más riesgo; menos liquidez',
          ],
          [
            'Cíclicas',
            'Su negocio sube y baja con la economía',
            'Automoción, lujo, construcción: Volkswagen, LVMH, ACS',
            'En recesión sufren más; en auge, suben más',
          ],
          [
            'Defensivas',
            'Venden lo que se consume siempre',
            'Alimentación, salud, servicios básicos: Nestlé, Johnson & Johnson',
            'Caen menos en crisis y suben menos en auges',
          ],
          [
            'ADR',
            'Certificados que cotizan en EE. UU. y representan acciones de una empresa extranjera',
            'Empresas asiáticas y europeas como TSMC o Toyota cotizan así',
            'Doble divisa y condiciones distintas; mira qué compras realmente',
          ],
        ],
      },
      { k: 'h', t: '4. Cómo invertir en acciones, paso a paso' },
      {
        k: 'ul',
        items: [
          'Paso 1. Antes de nada: ten un fondo de emergencia aparte y dinero que no vayas a necesitar en 5 años o más. Las acciones pueden caer un 30-50 % en una crisis.',
          'Paso 2. Elige un bróker regulado. Comprueba que figura en los registros de la CNMV (si es español) o de la autoridad de su país (si es de la UE, que opere con pasaporte europeo). Revisa dónde custodia tus acciones y si da acceso a los mercados que quieres.',
          'Paso 3. Abre la cuenta: te pedirán DNI, datos fiscales y un test de conocimientos y experiencia (MiFID). Las acciones no son un producto garantizado.',
          'Paso 4. Transfiere dinero desde tu cuenta bancaria. Algunos brókers piden un mínimo; otros no.',
          'Paso 5. Identifica la empresa: nombre, ticker (abreviatura), ISIN (código único internacional), mercado y divisa en que cotiza. Dos acciones de la misma empresa en mercados distintos pueden tener condiciones diferentes.',
          'Paso 6. Elige el tipo de orden y la cantidad (ver más abajo).',
          'Paso 7. Después de comprar: guarda el justificante, sigue tus costes y recuerda declarar dividendos y ventas en la renta.',
        ],
      },
      {
        k: 'tip',
        title: 'Garantía del bróker',
        t: 'Si tu bróker quiebra, en España el Fondo de Garantía de Inversiones cubre hasta 100.000 euros por inversor y entidad. Protege de la insolvencia de la entidad, no de que tus acciones pierdan valor.',
      },
      { k: 'sh', t: 'Tipos de orden' },
      {
        k: 'table',
        head: ['Orden', 'Qué hace', 'Cuándo se usa'],
        rows: [
          [
            'A mercado',
            'Compra o vende ya, al mejor precio disponible',
            'Valores muy líquidos; el precio final puede diferir del que veías',
          ],
          [
            'Limitada',
            'Solo se ejecuta a tu precio o a uno mejor',
            'Controlas el precio; puede no ejecutarse',
          ],
          [
            'Stop',
            'Se activa cuando el precio toca un nivel y entonces vende',
            'Para limitar pérdidas; si hay saltos, se ejecuta peor',
          ],
          [
            'Stop limitada',
            'Combina stop y límite',
            'Más control, con el riesgo de quedar sin ejecutar',
          ],
        ],
      },
      {
        k: 'p',
        t: 'Acciones fraccionadas: algunos brókers permiten comprar una parte de una acción (por ejemplo, 0,25 acciones) para invertir una cantidad concreta. Es cómodo con acciones caras, pero revisa que se pueda vender con la misma facilidad.',
      },
      { k: 'h', t: '5. Lo que cuesta invertir en acciones' },
      {
        k: 'ul',
        items: [
          'Comisión de compra y de venta: un importe fijo o un porcentaje del importe. Con operaciones pequeñas, una comisión fija se come una parte relevante.',
          'Diferencial (spread): diferencia entre el precio de compra y el de venta; es un coste invisible, mayor en valores poco líquidos.',
          'Custodia y mantenimiento: algunos brókers cobran cuota anual o por inactividad.',
          'Cambio de divisa: si compras en dólares, el bróker cambia tus euros y suele cobrar un porcentaje. Además, el valor en euros sube o baja con el tipo de cambio.',
          'Retención de dividendos extranjeros: el país de origen retiene una parte (en EE. UU., un 15 % si has firmado el formulario W-8BEN con tu bróker; sin él, un 30 %).',
          'Impuesto sobre las Transacciones Financieras: 0,2 % en la compra de acciones de empresas españolas con capitalización superior a 1.000 millones de euros.',
        ],
      },
      { k: 'h', t: '6. Dividendos y rentabilidad por dividendo' },
      {
        k: 'p',
        t: 'El dividendo es la parte del beneficio que la empresa reparte entre sus accionistas, normalmente por acción. La rentabilidad por dividendo es el dividendo anual entre el precio de la acción: si una acción cuesta 20 € y paga 1 € al año, rinde un 5 %. Ese porcentaje cambia cada día porque cambia el precio.',
      },
      {
        k: 'ul',
        items: [
          'Payout: porcentaje del beneficio que se reparte. Un payout muy alto deja poco margen si el negocio empeora.',
          'Fecha ex-dividendo: quien compra desde ese día ya no cobra el siguiente dividendo. El precio baja aproximadamente lo que se paga: no es dinero gratis.',
          'Dividendo flexible (scrip): te dejan elegir entre cobrar en efectivo o en acciones nuevas; fiscalmente tiene sus matices.',
          'Un dividendo no está garantizado: se puede recortar o suspender.',
        ],
      },
      { k: 'h', t: '7. Ratios básicos, explicados simples' },
      {
        k: 'table',
        head: ['Ratio', 'Cómo se calcula', 'Cómo leerlo'],
        rows: [
          [
            'BPA (beneficio por acción)',
            'Beneficio neto entre número de acciones',
            'Cuánto gana la empresa por cada acción',
          ],
          [
            'PER',
            'Precio de la acción entre BPA',
            'Años de beneficio actual que pagas. Un PER de 15 significa 15 € por cada euro de beneficio anual',
          ],
          [
            'Rentabilidad por dividendo',
            'Dividendo anual entre precio',
            'Qué porcentaje del precio recibes en dividendos',
          ],
          ['Payout', 'Dividendo entre BPA', 'Qué parte del beneficio se reparte'],
          ['Capitalización', 'Precio por número de acciones', 'Lo que vale la empresa en bolsa'],
          [
            'Deuda sobre beneficio operativo',
            'Deuda neta entre EBITDA',
            'Cuántos años de beneficio operativo harían falta para pagar la deuda',
          ],
          [
            'ROE',
            'Beneficio neto entre fondos propios',
            'Cuánto rinde el dinero de los accionistas',
          ],
        ],
      },
      {
        k: 'warn',
        title: 'Un ratio no dice «barato» o «caro» por sí solo',
        t: 'Un PER bajo puede indicar una empresa en declive, y uno alto, una empresa que crece. Se compara con empresas del mismo sector y con su propia historia, y nunca se usa un único ratio.',
      },
      { k: 'h', t: '8. Cómo leer una cotización' },
      {
        k: 'p',
        t: 'Este es un ejemplo inventado de la ficha de una acción. Los números no corresponden a ninguna empresa real.',
      },
      {
        k: 'table',
        head: ['Dato (ejemplo: «ACME S. A.»)', 'Qué significa'],
        rows: [
          ['Último: 20,10 €', 'Precio de la última operación'],
          ['Variación: +0,50 € (+2,5 %)', 'Cambio frente al cierre del día anterior'],
          [
            'Compra (bid) 20,09 / Venta (ask) 20,11',
            'Lo máximo que pagan los compradores y lo mínimo que piden los vendedores; la diferencia es el diferencial',
          ],
          ['Apertura 19,70 / Cierre anterior 19,60', 'Precio al abrir hoy y precio al cerrar ayer'],
          ['Máx. / Mín. del día: 20,25 / 19,65', 'Rango de precios de hoy'],
          ['Máx. / Mín. 52 semanas: 24,00 / 15,50', 'Rango del último año'],
          ['Volumen: 3,2 M', 'Acciones negociadas hoy; más volumen, más liquidez'],
          ['Capitalización: 4.000 M€', 'Valor de la empresa en bolsa'],
          ['PER: 14 · Dividendo: 4,5 %', 'Ratios básicos descritos arriba'],
        ],
      },
      { k: 'h', t: '9. Índices frente a acciones sueltas' },
      {
        k: 'p',
        t: 'Un índice como el IBEX 35 o el S&P 500 es una cesta de muchas empresas. Una acción suelta se mueve por lo que le ocurre a esa empresa, además de por el mercado. Por eso, de media, una acción tiene más sacudidas y caídas más profundas que el índice del que forma parte.',
      },
      { k: 'chart', id: 'stockVsIndex' },
      { k: 'h', t: '10. Mercados bursátiles: horarios, apertura y cierre' },
      {
        k: 'p',
        t: 'El dinero no duerme, pero las bolsas sí. Cada una abre y cierra a su hora local, y por eso a lo largo del día "pasa el testigo" del este al oeste: primero Tokio y Shanghái, luego Europa, y por último Nueva York.',
      },
      { k: 'markets' },
      { k: 'sh', t: 'Qué significan apertura y cierre' },
      {
        k: 'ul',
        items: [
          'Preapertura: antes de abrir, muchos mercados admiten órdenes que no se ejecutan hasta la subasta de apertura.',
          'Subasta de apertura: se calcula un único precio que empareja el máximo de órdenes; es el precio de apertura.',
          'Sesión continua: las órdenes se ejecutan al instante a medida que coinciden compradores y vendedores.',
          'Subasta de cierre: al final del día se vuelve a calcular un único precio, el precio de cierre. Es la referencia que usan los fondos para valorar su cartera.',
          'Pausa de mediodía: en Asia (Tokio, Shanghái, Hong Kong), el mercado se detiene a mediodía.',
        ],
      },
      { k: 'sh', t: 'Horario extendido: antes y después del mercado' },
      {
        k: 'p',
        t: 'En EE. UU. hay sesión previa (pre-market) y posterior (after-hours) en la que se puede operar, aunque con mucha menos liquidez: pocas órdenes, diferenciales más amplios y movimientos bruscos con las noticias de resultados. Muchos brókers europeos solo permiten operar en horario regular.',
      },
      {
        k: 'tip',
        title: 'El truco de la hora española',
        t: 'Nueva York abre a las 15:30 de España casi todo el año. EE. UU. y Europa cambian de hora en fechas distintas (unas semanas en marzo y entre finales de octubre y principios de noviembre), y entonces la diferencia es de 5 horas en lugar de 6: abre a las 14:30. La tabla se ajusta sola a la fecha de hoy.',
      },
      { k: 'sh', t: 'Festivos y cierres especiales' },
      {
        k: 'p',
        t: 'Cada bolsa tiene su propio calendario de festivos (Navidad, Año Nuevo, Día de Acción de Gracias en EE. UU., Año Nuevo Lunar en Asia...). Algunos días se cierra antes. El indicador de «abierto o cerrado» de esta sección se calcula solo con el horario habitual y el día de la semana: no incluye festivos, así que consulta el calendario oficial del mercado antes de operar.',
      },
      { k: 'sh', t: 'Los índices más conocidos' },
      {
        k: 'table',
        head: ['Índice', 'Qué mide', 'Dónde cotizan sus valores'],
        rows: [
          ['S&P 500', '500 grandes empresas de EE. UU.', 'NYSE y Nasdaq'],
          [
            'Dow Jones Industrial',
            '30 grandes empresas de EE. UU. (ponderado por precio)',
            'NYSE y Nasdaq',
          ],
          ['Nasdaq 100', '100 empresas no financieras del Nasdaq, muy tecnológico', 'Nasdaq'],
          ['IBEX 35', '35 empresas más líquidas de España', 'Bolsa de Madrid'],
          ['DAX 40', '40 grandes empresas alemanas', 'Fráncfort'],
          ['CAC 40', '40 grandes empresas francesas', 'París'],
          ['FTSE 100', '100 mayores empresas del Reino Unido', 'Londres'],
          ['Nikkei 225', '225 empresas japonesas (ponderado por precio)', 'Tokio'],
          ['Hang Seng', 'Grandes empresas de Hong Kong', 'Hong Kong'],
          [
            'SSE Composite / CSI 300',
            'Empresas cotizadas en Shanghái (y Shenzhen en el CSI 300)',
            'Shanghái y Shenzhen',
          ],
        ],
      },
      {
        k: 'key',
        title: 'El mercado cripto no cierra',
        t: 'Las criptomonedas cotizan las 24 horas, todos los días del año. No hay apertura ni cierre: eso también significa que un fin de semana puede haber movimientos bruscos sin que ninguna bolsa tradicional esté abierta.',
      },
      { k: 'h', t: '11. Diversificación y riesgo' },
      {
        k: 'ul',
        items: [
          'Riesgo de empresa: una empresa puede perderlo casi todo o quebrar. Los accionistas de Banco Popular perdieron toda su inversión en 2017 cuando la entidad fue resuelta, y los de Wirecard en 2020 tras descubrirse un fraude contable.',
          'Concentración: tener casi todo tu dinero en una o dos empresas (o en la de tu trabajo) multiplica el riesgo.',
          'Riesgo de sector y de país: todo el sector bancario o todo un país pueden caer a la vez.',
          'Riesgo de divisa: si cotiza en otra moneda, el tipo de cambio cuenta.',
          'Riesgo de comportamiento: comprar por una moda de redes sociales o vender en pánico.',
          'Diversificar significa repartir entre muchas empresas, sectores y países. Los fondos indexados y los ETF lo hacen en un solo producto.',
        ],
      },
      { k: 'h', t: '12. Impuestos en España' },
      {
        k: 'ul',
        items: [
          'Dividendos: rendimiento del capital mobiliario. Van a la base del ahorro, con la misma escala que usa la app en la renta (19 % hasta 6.000 €, 21 % hasta 50.000 €, 23 % hasta 200.000 €, 27 % hasta 300.000 € y 30 % por encima, según los datos de la app). Las empresas españolas retienen un 19 % al pagarlos.',
          'Ganancia al vender: ganancia patrimonial, también en la base del ahorro. El bróker español no retiene: tributas al hacer la renta.',
          'Pérdidas: compensan las ganancias del mismo año y el sobrante se arrastra durante 4 años. Un saldo negativo de las ventas puede compensar hasta el 25 % de los dividendos y viceversa.',
          'Regla de los dos meses: si vendes con pérdida y recompras la misma acción cotizada en los dos meses anteriores o posteriores, la pérdida no cuenta hasta que vendas lo recomprado.',
          'Método FIFO: se vende primero lo más antiguo.',
          'Dividendos extranjeros: la retención del país de origen se puede deducir de tu impuesto español, con un límite (deducción por doble imposición internacional).',
          'Bróker extranjero: no retiene nada y tú declaras (modelo 100); si tus valores fuera superan 50.000 € a 31 de diciembre, hay que presentar el modelo 720.',
        ],
      },
      { k: 'calc', id: 'stock' },
      { k: 'h', t: '13. Empresas conocidas por sector, solo como ilustración' },
      {
        k: 'p',
        t: 'Para reconocer cómo se agrupan las empresas en bolsa. Es una lista de ejemplos de cada sector a fecha de redacción: no son recomendaciones, no están ordenadas por calidad ni por atractivo, y no incluyen precios ni previsiones.',
      },
      {
        k: 'table',
        head: ['Sector', 'Empresas conocidas (ejemplos)'],
        rows: [
          ['Banca', 'Santander, BBVA, CaixaBank; JPMorgan, HSBC'],
          ['Energía y petróleo', 'Iberdrola, Repsol, Endesa; Exxon Mobil, Shell'],
          ['Moda y consumo', 'Inditex; LVMH, Nike'],
          ['Tecnología', 'Apple, Microsoft, SAP, ASML'],
          ['Salud y farma', 'Grifols; Novartis, Johnson & Johnson'],
          ['Telecomunicaciones', 'Telefónica; Deutsche Telekom, Vodafone'],
          ['Infraestructuras', 'ACS, Ferrovial, Acciona'],
          ['Alimentación y bebidas', 'Nestlé, Coca-Cola, Danone'],
        ],
      },
      { k: 'h', t: '14. Errores frecuentes' },
      {
        k: 'ul',
        items: [
          'Comprar porque «está barato» solo por haber caído mucho en precio.',
          'Seguir consejos de redes sociales o grupos de «señales».',
          'Poner en una sola empresa dinero que no puedes perder.',
          'Vender en pánico en una caída y entrar tarde tras una subida.',
          'Operar muy a menudo: cada operación suma comisión, diferencial e impuestos.',
          'Ignorar costes de divisa, retenciones y fiscalidad.',
          'Endeudarse o usar apalancamiento para comprar acciones.',
        ],
      },
      {
        k: 'tip',
        title: 'Lista de comprobación antes de comprar',
        t: '¿Entiendo cómo gana dinero la empresa? ¿Es dinero que no necesitaré pronto? ¿Cuánto del total de mis inversiones representa? ¿Cuáles son las comisiones y la divisa? ¿Qué haré si cae un 30 %? Si dudas, un fondo indexado reparte el riesgo entre cientos de empresas.',
      },
      {
        k: 'key',
        title: 'Recuerda',
        t: 'Contenido educativo, sin recomendaciones ni previsiones. Consulta con un asesor financiero independiente antes de decidir, y con un profesional para tus impuestos.',
      },
    ],
    glossary: [
      {
        term: 'Subasta',
        def: 'Mecanismo que fija un único precio que empareja el mayor volumen posible de órdenes.',
      },
      {
        term: 'Pre-market / after-hours',
        def: 'Sesiones fuera del horario regular de un mercado, con menos liquidez.',
      },
      {
        term: 'Hora local',
        def: 'Hora en la ciudad de la bolsa; para ti, hay que convertirla a la hora de España.',
      },
      { term: 'Liquidez', def: 'Facilidad para comprar o vender sin mover el precio.' },
      {
        term: 'Horario de verano',
        def: 'Cambio de hora que hace que la diferencia entre ciudades varíe unas semanas al año.',
      },
      { term: 'Acción', def: 'Título que representa una parte del capital de una empresa.' },
      {
        term: 'Dividendo',
        def: 'Parte de los beneficios que la empresa reparte entre sus accionistas.',
      },
      {
        term: 'Capitalización',
        def: 'Valor total de la empresa en bolsa (precio × número de acciones).',
      },
      { term: 'Ticker', def: 'Abreviatura con la que se identifica una acción en un mercado.' },
      {
        term: 'ISIN',
        def: 'Código internacional único de 12 caracteres que identifica cada valor.',
      },
      {
        term: 'PER',
        def: 'Precio de la acción entre el beneficio por acción: veces el beneficio anual que pagas.',
      },
      { term: 'BPA', def: 'Beneficio por acción: beneficio neto entre el número de acciones.' },
      { term: 'Payout', def: 'Porcentaje del beneficio que la empresa reparte como dividendo.' },
      {
        term: 'Rentabilidad por dividendo',
        def: 'Dividendo anual dividido por el precio de la acción.',
      },
      { term: 'Blue chip', def: 'Gran empresa, sólida y muy conocida.' },
      { term: 'Small cap', def: 'Empresa de pequeña capitalización bursátil.' },
      {
        term: 'ADR',
        def: 'Certificado que cotiza en EE. UU. y representa acciones de una empresa extranjera.',
      },
      {
        term: 'Bid / Ask',
        def: 'Mejor precio de compra (bid) y de venta (ask) disponibles en un momento dado.',
      },
      { term: 'Orden limitada', def: 'Orden que solo se ejecuta al precio fijado o a uno mejor.' },
      {
        term: 'Orden stop',
        def: 'Orden que se activa al tocar un nivel de precio, normalmente para limitar pérdidas.',
      },
      {
        term: 'Libro de órdenes',
        def: 'Lista de órdenes de compra y de venta pendientes, con su precio y cantidad.',
      },
      {
        term: 'Fecha ex-dividendo',
        def: 'Día desde el que quien compra la acción ya no cobra el siguiente dividendo.',
      },
      {
        term: 'Índice bursátil',
        def: 'Indicador que resume el comportamiento de un conjunto de acciones.',
      },
      {
        term: 'Fondo de Garantía de Inversiones',
        def: 'Cubre hasta 100.000 € por inversor si quiebra el bróker; no cubre pérdidas de mercado.',
      },
    ],
  },
];
