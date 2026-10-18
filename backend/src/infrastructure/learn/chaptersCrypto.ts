import type { CourseChapter } from '@domain/model/Course';

/** Crypto basics and leverage. Educational, with no price predictions. */
export const CHAPTERS_CRYPTO_A: CourseChapter[] = [
  {
    id: 'cripto-y-blockchain',
    emoji: '⛓️',
    color: '#f59e0b',
    title: 'Criptomonedas y blockchain: qué son y cómo funcionan',
    titleEn: 'Crypto and blockchain: what they are and how they work',
    summary:
      'Bloques, nodos, minería, prueba de trabajo y de participación, wallets y claves, explicado desde cero.',
    summaryEn:
      'Blocks, nodes, mining, proof of work and proof of stake, wallets and keys, explained from scratch.',
    level: 2,
    topic: 'crypto',
    blocks: [
      {
        k: 'p',
        t: 'Una criptomoneda es un activo digital cuyo registro no lo lleva un banco, sino una red de ordenadores repartidos por el mundo. Esa red mantiene un libro de cuentas compartido —la blockchain o cadena de bloques— que nadie puede modificar por su cuenta.',
      },
      { k: 'h', t: 'Bloques, cadena y nodos' },
      {
        k: 'ul',
        items: [
          'Bloque: un paquete de transacciones validadas en un mismo momento.',
          'Cadena: cada bloque incluye la «huella» (hash) del anterior, de modo que cambiar un dato antiguo obligaría a rehacer todos los bloques posteriores. Eso hace que el historial sea prácticamente inalterable.',
          'Nodo: cada ordenador que guarda una copia del libro y comprueba que las reglas se cumplen. Cuantos más nodos independientes, más difícil es manipular la red.',
        ],
      },
      { k: 'h', t: 'Cómo se acuerda quién tiene qué: el consenso' },
      {
        k: 'p',
        t: 'En una red sin jefe, hay que decidir qué bloque es el siguiente. Existen varios mecanismos de consenso; los dos principales son estos:',
      },
      {
        k: 'table',
        head: ['', 'Prueba de trabajo (PoW)', 'Prueba de participación (PoS)'],
        rows: [
          [
            'Quién valida',
            'Mineros, que compiten resolviendo un problema matemático',
            'Validadores, que bloquean (stakean) monedas como garantía',
          ],
          ['Qué cuesta', 'Hardware y mucha electricidad', 'Capital inmovilizado'],
          [
            'Cómo se castiga la trampa',
            'Se pierde la inversión en energía',
            'Se pierden parte de las monedas bloqueadas (slashing)',
          ],
          [
            'Consumo energético',
            'Alto',
            'Muy inferior (se reduce más de un 99 % según estimaciones tras el cambio de Ethereum)',
          ],
          ['Ejemplos', 'Bitcoin', 'Ethereum (desde 2022), Solana, Cardano'],
        ],
      },
      {
        k: 'key',
        title: 'Minería, en una frase',
        t: 'Minar es usar ordenadores para validar transacciones y proponer bloques; el sistema recompensa al ganador con monedas nuevas y comisiones. No tiene nada que ver con los ordenadores «descubriendo» monedas: es un mecanismo de seguridad.',
      },
      { k: 'h', t: 'Wallets, claves y custodia' },
      {
        k: 'p',
        t: 'Tus criptomonedas no están «dentro» de tu móvil: están en la blockchain. Lo que tienes es una clave privada que demuestra que eres su dueño y permite firmar transacciones. La wallet o monedero es la herramienta que guarda esas claves.',
      },
      {
        k: 'ul',
        items: [
          'Clave pública / dirección: es como tu número de cuenta; puedes darla para recibir.',
          'Clave privada y frase semilla (12 o 24 palabras): da control total. Quien la tenga, tiene el dinero. Si la pierdes, no hay recuperación.',
          'Wallet de software («caliente»): app o extensión conectada a internet; cómoda, más expuesta.',
          'Wallet de hardware («fría»): dispositivo físico que guarda las claves sin conexión; más segura para cantidades grandes.',
          'Custodia en un exchange: la plataforma guarda tus claves por ti. Más fácil, pero dependes de ella: «Not your keys, not your coins» (si no controlas las claves, no controlas las monedas).',
        ],
      },
      {
        k: 'warn',
        title: 'Nadie te va a pedir tu frase semilla',
        t: 'Ninguna empresa seria, soporte técnico ni «asesor» te necesita. Quien pregunte por tu frase semilla o tu clave privada intenta robarte. No la fotografíes ni la guardes en la nube.',
      },
      { k: 'h', t: 'Para qué sirve (y para qué no)' },
      {
        k: 'ul',
        items: [
          'Reserva de valor digital (Bitcoin): oferta limitada a 21 millones de unidades.',
          'Plataformas de contratos inteligentes (Ethereum y similares): programas que se ejecutan solos en la cadena y permiten finanzas descentralizadas (DeFi), NFT, tokenización...',
          'Pagos y transferencias internacionales rápidas.',
          'Stablecoins: dinero digital que intenta mantener un precio fijo.',
          'No es dinero respaldado por el Estado ni está cubierto por el Fondo de Garantía de Depósitos.',
        ],
      },
    ],
    glossary: [
      {
        term: 'Blockchain',
        def: 'Libro de cuentas compartido, formado por bloques encadenados, mantenido por una red de nodos.',
      },
      {
        term: 'Hash',
        def: 'Huella digital de un conjunto de datos: cambiar un dato cambia por completo su hash.',
      },
      {
        term: 'Nodo',
        def: 'Ordenador de la red que guarda una copia de la blockchain y verifica las reglas.',
      },
      {
        term: 'Minería',
        def: 'Proceso de validar transacciones y crear bloques en las cadenas de prueba de trabajo.',
      },
      {
        term: 'Staking',
        def: 'Bloquear monedas para participar en la validación de una red de prueba de participación y recibir una recompensa.',
      },
      { term: 'Clave privada', def: 'Código secreto que da control sobre tus monedas.' },
      {
        term: 'Frase semilla',
        def: 'Lista de palabras que permite regenerar tus claves si pierdes el dispositivo.',
      },
      {
        term: 'DeFi',
        def: 'Finanzas descentralizadas: servicios financieros (préstamos, intercambios) basados en contratos inteligentes.',
      },
      {
        term: 'Gas / comisión de red',
        def: 'Coste de procesar una transacción en una blockchain.',
      },
    ],
  },
  {
    id: 'cripto-volatilidad-apalancamiento',
    emoji: '🎰',
    color: '#ef4444',
    title: 'Volatilidad y apalancamiento: por qué se pierde dinero tan rápido',
    titleEn: 'Volatility and leverage: why money is lost so fast',
    summary:
      'Cómo se mueven las criptomonedas, qué es el margen, la liquidación y ejemplos numéricos de apalancamiento.',
    summaryEn:
      'How crypto prices swing, what margin and liquidation are, with worked leverage examples.',
    level: 3,
    topic: 'crypto',
    blocks: [
      {
        k: 'p',
        t: 'Las criptomonedas son uno de los activos más volátiles que existen. En su historia, el precio de Bitcoin ha caído más de un 70 % varias veces desde sus máximos (por ejemplo, en 2018 y en 2022) y las altcoins más pequeñas han caído todavía más. También ha habido subidas enormes, que atrajeron a mucha gente al mercado.',
      },
      { k: 'chart', id: 'volatility' },
      {
        k: 'warn',
        title: 'Simulación ilustrativa',
        t: 'El gráfico es un camino aleatorio inventado: sirve para ver cómo es un activo «tipo cripto» frente a otro «tipo renta fija». No es la evolución real de ninguna moneda.',
      },
      { k: 'h', t: 'Qué es el apalancamiento' },
      {
        k: 'p',
        t: 'Apalancarse es operar con una cantidad mayor que la que pones tú. Depositas un margen (tu garantía) y la plataforma te presta el resto. Con apalancamiento 10x y 1.000 € de margen controlas una posición de 10.000 €. Es como multiplicar la rentabilidad de un movimiento… y también la pérdida.',
      },
      {
        k: 'table',
        head: ['Apalancamiento', 'Precio +5 %', 'Precio −5 %', 'Liquida si cae'],
        rows: [
          ['1x (sin apalancar)', '+5 %', '−5 %', 'No hay liquidación'],
          ['2x', '+10 %', '−10 %', '−50 %'],
          ['5x', '+25 %', '−25 %', '−20 %'],
          ['10x', '+50 %', '−50 %', '−10 %'],
          ['20x', '+100 %', '−100 % (liquidada)', '−5 %'],
          ['50x', '+250 %', 'Liquidada', '−2 %'],
        ],
      },
      { k: 'chart', id: 'leverage' },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'La distancia a la liquidación es, aproximadamente, 100 dividido entre el apalancamiento: con 10x, un 10 %; con 20x, un 5 %. Cuanto más apalancas, menos margen de error tienes, y una caída corta pero brusca puede liquidarte aunque el precio luego se recupere.',
      },
      { k: 'h', t: 'Margen, liquidación y precio de liquidación' },
      {
        k: 'ul',
        items: [
          'Margen inicial: el dinero propio que bloqueas.',
          'Margen de mantenimiento: el mínimo que la plataforma exige mantener. Si tu pérdida lo supera, cierra la posición por ti (liquidación).',
          'Precio de liquidación: el precio al que ocurre. En una posición larga está por debajo de tu entrada; en una corta (apostar a la baja), por encima.',
          'Posición larga: ganas si el precio sube. Posición corta: ganas si baja, pero el riesgo de pérdida es, en teoría, ilimitado, porque el precio no tiene techo.',
          'Costes continuos: comisiones de entrada y salida y, en perpetuos, la «tasa de financiación» que se paga o se cobra cada pocas horas. Con apalancamiento elevado, estos costes se comen una parte importante del margen.',
        ],
      },
      {
        k: 'ex',
        title: 'Ejemplo numérico',
        t: 'Margen 1.000 €, largo 10x en una moneda a 100 €: posición de 10.000 € (100 unidades). Si el precio sube a 105 €, ganas 500 € brutos (+50 % sobre el margen). Si baja a 90,5 € ya estás cerca de la liquidación y pierdes todo el margen: una caída del 9,5 % elimina el 100 % de tu dinero. Con el mismo capital sin apalancar, esa caída habría sido de 95 €.',
      },
      {
        k: 'warn',
        title: 'El apalancamiento no crea rentabilidad, crea riesgo',
        t: 'En los mercados cripto, una caída del 10 % en minutos es normal. A apalancamiento alto, una mecha de precio puede liquidarte aunque el precio se recupere después. Muchos operadores minoristas pierden todo su capital.',
      },
      { k: 'calc', id: 'crypto' },
      { k: 'h', t: 'Compra periódica (DCA)' },
      {
        k: 'p',
        t: 'La compra periódica, o dollar-cost averaging, consiste en invertir una cantidad fija cada cierto tiempo, sin intentar acertar el mejor momento. Cuando el precio baja compras más unidades; cuando sube, menos. No garantiza ganancias ni evita pérdidas, pero reduce el riesgo de entrar todo el dinero justo en un máximo y quita la presión de adivinar. La calculadora de arriba incluye un simulador que compara DCA con invertir todo de una vez en un camino de precios ilustrativo o en uno que introduzcas tú.',
      },
      {
        k: 'tip',
        title: 'Normas de la UE para minoristas',
        t: 'En la UE, los CFD sobre criptomonedas para minoristas tienen un apalancamiento máximo de 2:1, protección de saldo negativo y cierre automático al 50 % del margen (a fecha de redacción). Si una plataforma te ofrece 50x o 100x con criptomonedas, mira dónde está regulada.',
      },
    ],
    glossary: [
      {
        term: 'Apalancamiento',
        def: 'Operar con una posición mayor que tu capital, tomando el resto prestado.',
      },
      {
        term: 'Margen',
        def: 'Dinero propio que depositas como garantía de una posición apalancada.',
      },
      {
        term: 'Liquidación',
        def: 'Cierre forzoso de tu posición cuando tu margen cae por debajo del mínimo exigido.',
      },
      {
        term: 'Posición larga / corta',
        def: 'Larga: apuestas a que el precio sube. Corta: apuestas a que baja.',
      },
      {
        term: 'Perpetuo',
        def: 'Contrato de futuros sin vencimiento que se usa mucho en cripto, con tasas de financiación periódicas.',
      },
      {
        term: 'Funding rate',
        def: 'Pago periódico entre largos y cortos que mantiene el precio del perpetuo cerca del precio real.',
      },
      {
        term: 'DCA',
        def: 'Dollar-cost averaging: comprar una cantidad fija a intervalos regulares.',
      },
      {
        term: 'Mecha (wick)',
        def: 'Movimiento brusco y breve del precio que deja una línea fina en el gráfico de velas.',
      },
    ],
  },
];
