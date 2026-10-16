import type { Chapter } from './types';

/** Main coins and the risks around crypto. Descriptions are factual and dated; no price views. */
export const CHAPTERS_CRYPTO_B: Chapter[] = [
  {
    id: 'cripto-monedas-y-proyectos',
    emoji: '🧩',
    color: '#d97706',
    title: 'Las monedas principales y los proyectos que hay detrás',
    titleEn: 'The main coins and the projects behind them',
    summary:
      'Bitcoin, Ethereum, BNB, Solana, XRP, Cardano y las stablecoins USDT y USDC: qué hace cada proyecto y qué riesgos tiene.',
    summaryEn:
      'Bitcoin, Ethereum, BNB, Solana, XRP, Cardano and the USDT and USDC stablecoins: what each project does and its risks.',
    level: 2,
    topic: 'crypto',
    blocks: [
      {
        k: 'warn',
        title: 'Texto de fecha fija',
        t: 'Estas descripciones recogen lo que se sabe a fecha de redacción (2026). Los proyectos cambian, las normas también, y la clasificación por tamaño varía. Antes de decidir nada, consulta la web oficial de cada proyecto. Aquí no se hace ninguna previsión de precios ni recomendación.',
      },
      { k: 'h', t: 'Bitcoin (BTC): la primera' },
      {
        k: 'p',
        t: 'Descrita en 2008 en un documento firmado por el seudónimo Satoshi Nakamoto, cuya identidad real no se conoce; la red echó a andar en enero de 2009. Funciona con prueba de trabajo, tiene un máximo de 21 millones de unidades y un «halving» (la recompensa de los mineros se reduce a la mitad) aproximadamente cada cuatro años. Se ve sobre todo como una reserva de valor digital y pago entre particulares; no admite contratos complejos. Riesgos: volatilidad, consumo energético y regulación cambiante.',
      },
      { k: 'h', t: 'Ethereum (ETH): la plataforma de contratos inteligentes' },
      {
        k: 'p',
        t: 'Propuesta por Vitalik Buterin y otros cofundadores, y lanzada en 2015. Permite ejecutar programas (contratos inteligentes) en su cadena, y sobre ella se han construido DeFi, NFT y gran parte de las stablecoins. En septiembre de 2022 pasó de prueba de trabajo a prueba de participación («The Merge»). Para abaratar y acelerar las transacciones se usan redes de «capa 2». Riesgos: comisiones altas en momentos de congestión, fallos en contratos de terceros y competencia de otras plataformas.',
      },
      { k: 'h', t: 'BNB: el token del ecosistema Binance' },
      {
        k: 'p',
        t: 'Nació en 2017 como token del exchange Binance y hoy es la moneda de BNB Chain, una cadena compatible con Ethereum. Sirve para pagar comisiones y tiene usos dentro del ecosistema de Binance. Riesgos: depende mucho de una empresa concreta y de su situación regulatoria, lo que lo hace menos descentralizado que Bitcoin.',
      },
      { k: 'h', t: 'Solana (SOL): velocidad y comisiones bajas' },
      {
        k: 'p',
        t: 'Creada por Anatoly Yakovenko y lanzada en 2020. Combina prueba de participación con un sistema de marcas de tiempo (Proof of History) para procesar muchas transacciones por segundo con comisiones muy bajas. Es popular para aplicaciones, pagos y memecoins. Riesgos: ha sufrido interrupciones de la red en el pasado y cuenta con menos validadores independientes que otras redes.',
      },
      { k: 'h', t: 'XRP: pagos entre bancos' },
      {
        k: 'p',
        t: 'XRP es la moneda del XRP Ledger, creado en 2012 y vinculado a la empresa Ripple, que desarrolla servicios de pagos transfronterizos. A diferencia de Bitcoin, no se mina: toda la oferta (100.000 millones de unidades) se creó al principio y una parte importante la controla Ripple. Tuvo un largo litigio con la SEC de EE. UU. sobre su clasificación legal; consulta cómo está hoy. Riesgos: concentración, dependencia de una empresa y de decisiones regulatorias.',
      },
      { k: 'h', t: 'Cardano (ADA): enfoque académico' },
      {
        k: 'p',
        t: 'Fundada por Charles Hoskinson (uno de los cofundadores de Ethereum) y lanzada en 2017. Usa prueba de participación (protocolo Ouroboros) y se desarrolla por fases, con revisión académica de sus diseños. Admite contratos inteligentes desde 2021. Riesgos: desarrollo lento y menor adopción que sus competidoras.',
      },
      { k: 'h', t: 'USDT y USDC: las stablecoins más usadas' },
      {
        k: 'p',
        t: 'Son monedas diseñadas para valer 1 dólar. USDT la emite la empresa Tether y USDC, la empresa estadounidense Circle. Mantienen reservas (efectivo y deuda a corto plazo) que respaldan, en teoría, cada unidad. Se usan para mover dinero entre exchanges y para operar sin salir de cripto. Son emisores privados: si las reservas no son suficientes o hay un pánico, el precio puede desviarse.',
      },
      {
        k: 'table',
        head: ['Moneda', 'Tecnología / mecanismo', 'Para qué se usa', 'Riesgo destacado'],
        rows: [
          [
            'Bitcoin',
            'Prueba de trabajo, 21 M máx.',
            'Reserva de valor, pagos',
            'Volatilidad, regulación',
          ],
          [
            'Ethereum',
            'Prueba de participación',
            'Contratos inteligentes, DeFi, NFT',
            'Comisiones, fallos de contratos',
          ],
          [
            'BNB',
            'BNB Chain (compatible con Ethereum)',
            'Comisiones y servicios de Binance',
            'Dependencia de una empresa',
          ],
          [
            'Solana',
            'PoS + Proof of History',
            'Aplicaciones rápidas y baratas',
            'Caídas de red en el pasado',
          ],
          [
            'XRP',
            'XRP Ledger (consenso propio)',
            'Pagos transfronterizos',
            'Concentración, litigios',
          ],
          ['Cardano', 'PoS (Ouroboros)', 'Contratos inteligentes', 'Adopción lenta'],
          [
            'USDT / USDC',
            'Stablecoin ligada al dólar',
            'Mover dinero, operar en exchanges',
            'Reservas, desanclaje',
          ],
        ],
      },
      { k: 'h', t: 'Altcoins: todo lo que no es Bitcoin' },
      {
        k: 'p',
        t: 'Altcoin significa «alternativa a Bitcoin». Hay miles. Algunas tienen un proyecto técnico real (infraestructura, oráculos como Chainlink, redes como Avalanche o Polkadot); otras son memecoins sin más valor que la moda, como Dogecoin, nacida como broma en 2013. Cuanto más pequeña es una moneda, más difícil es venderla sin hundir el precio, y más fácil es manipularla. Muchas pierden casi todo su valor o desaparecen.',
      },
      { k: 'h', t: 'Stablecoins: tipos y riesgos' },
      {
        k: 'ul',
        items: [
          'Respaldadas por dinero (USDT, USDC): reservas en efectivo y deuda a corto plazo. Riesgo: la calidad y transparencia de las reservas. En marzo de 2023, USDC se desvió temporalmente por debajo de 1 dólar cuando una parte de sus reservas quedó atrapada en el Silicon Valley Bank.',
          'Respaldadas por criptoactivos (como DAI/USDS): garantizadas con más cripto del que se emite. Riesgo: las caídas bruscas y los fallos del contrato.',
          'Algorítmicas: pretenden mantener el precio con código y sin reservas suficientes. En mayo de 2022 colapsó TerraUSD (UST) y arrastró a su moneda LUNA, con miles de millones de pérdidas.',
          'Ligadas a otros activos (como el oro): su precio depende de ese activo.',
          'En la UE, MiCA regula a los emisores de las stablecoins (ver el capítulo de riesgos y regulación).',
        ],
      },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'Que una moneda sea famosa no la hace segura. Entre las diez primeras de hace unos años, varias han cambiado o desaparecido del listado. Entender el proyecto, quién lo controla y qué problema resuelve es lo mínimo antes de plantearse tocarla.',
      },
    ],
    glossary: [
      { term: 'Altcoin', def: 'Cualquier criptomoneda distinta de Bitcoin.' },
      {
        term: 'Memecoin',
        def: 'Criptomoneda creada como broma o por una moda de internet, sin utilidad clara.',
      },
      {
        term: 'Stablecoin',
        def: 'Criptomoneda diseñada para mantener un precio estable, normalmente 1 dólar o 1 euro.',
      },
      { term: 'Desanclaje (depeg)', def: 'Cuando una stablecoin se aleja de su precio objetivo.' },
      {
        term: 'Halving',
        def: 'Reducción a la mitad de la recompensa de los mineros de Bitcoin, aproximadamente cada cuatro años.',
      },
      {
        term: 'Capa 2',
        def: 'Red construida sobre otra (por ejemplo, sobre Ethereum) para hacerla más rápida y barata.',
      },
      {
        term: 'Contrato inteligente',
        def: 'Programa que se ejecuta solo en una blockchain cuando se cumplen unas condiciones.',
      },
      { term: 'NFT', def: 'Token único que representa la propiedad de un objeto digital.' },
    ],
  },
  {
    id: 'cripto-riesgos-estafas-mica',
    emoji: '🛡️',
    color: '#be123c',
    title: 'Riesgos, estafas comunes y regulación (MiCA)',
    titleEn: 'Risks, common scams and regulation (MiCA)',
    summary:
      'Las trampas más frecuentes, cómo reconocerlas, cómo comprobar una plataforma y qué cambia con el reglamento europeo MiCA.',
    summaryEn:
      'The most common traps, how to spot them, how to check a platform and what the EU’s MiCA regulation changes.',
    level: 2,
    topic: 'crypto',
    blocks: [
      {
        k: 'p',
        t: 'En cripto no hay botón de deshacer. Si envías monedas a una dirección equivocada o a un estafador, no existe un banco al que reclamar. Por eso lo primero es saber qué trampas existen.',
      },
      { k: 'h', t: 'Los riesgos propios del activo' },
      {
        k: 'ul',
        items: [
          'Precio: caídas del 50-80 % son parte de su historia.',
          'Custodia: perder la clave privada o la frase semilla supone perder el acceso para siempre.',
          'Contrapartida: un exchange puede quebrar o ser hackeado. Casos como Mt. Gox (2014) o FTX (2022) dejaron a miles de clientes sin acceso a su dinero.',
          'Contratos inteligentes: un fallo de programación puede vaciar un protocolo DeFi.',
          'Regulación y fiscalidad: las normas cambian y Hacienda recibe información de las plataformas.',
          'Liquidez: en monedas pequeñas puede ser imposible vender al precio que ves.',
        ],
      },
      { k: 'h', t: 'Estafas comunes' },
      {
        k: 'table',
        head: ['Estafa', 'Cómo funciona', 'Señal de alarma'],
        rows: [
          [
            'Rentabilidad garantizada / pirámide',
            'Prometen intereses fijos altos y pagan con el dinero de nuevos clientes',
            'Cualquier «garantía» de rentabilidad',
          ],
          [
            'Estafa romántica o «del cerdo»',
            'Alguien que conoces por redes te gana la confianza y te lleva a una plataforma falsa',
            'Un desconocido que habla de inversión y no quiere videollamada',
          ],
          [
            'Influencers y anuncios falsos',
            'Vídeos, a veces con inteligencia artificial, de famosos que «recomiendan» una plataforma',
            'Famosos que prometen hacerte rico',
          ],
          [
            'Pump & dump',
            'Un grupo infla una moneda pequeña y vende cuando entran los demás',
            'Grupos de Telegram con «señales» y cuenta atrás',
          ],
          [
            'Rug pull',
            'Los creadores de un token se llevan el dinero y desaparecen',
            'Proyecto anónimo, sin auditoría, con liquidez bloqueada por ellos mismos',
          ],
          [
            'Phishing y wallets falsas',
            'Webs o apps falsas copian a las reales y roban tus claves o te hacen firmar permisos',
            'Enlaces recibidos por mensaje, errores en la dirección, peticiones de la frase semilla',
          ],
          [
            '«Recuperación de fondos»',
            'Te ofrecen recuperar lo perdido a cambio de una comisión previa',
            'Te contactan sin que hayas pedido nada',
          ],
          [
            'Sorteos falsos',
            'Te piden enviar monedas para recibir el doble',
            'Nadie devuelve el doble',
          ],
        ],
      },
      {
        k: 'tip',
        title: 'Lista de comprobación antes de usar una plataforma',
        t: '1) ¿Está autorizada? Busca su nombre en los registros de la CNMV y del Banco de España, y en el registro europeo de ESMA. 2) ¿Aparece en la lista de advertencias de la CNMV sobre chiringuitos? 3) ¿Promete rentabilidades fijas o te mete prisa? Desconfía. 4) ¿Puedes retirar tus fondos sin problemas con una cantidad pequeña? 5) ¿Tiene doble verificación (2FA)? Actívala.',
      },
      {
        k: 'warn',
        title: 'Si crees que te han estafado',
        t: 'No pagues «comisiones para desbloquear» tus fondos. Guarda capturas y hashes de transacciones, y denuncia en la Policía Nacional o la Guardia Civil. Si la plataforma opera como entidad regulada, informa también a la CNMV.',
      },
      { k: 'h', t: 'MiCA: el reglamento europeo, a grandes rasgos' },
      {
        k: 'p',
        t: 'MiCA (Markets in Crypto-Assets, Reglamento (UE) 2023/1114) es la primera norma europea que regula los criptoactivos. Las reglas sobre stablecoins se aplican desde el 30 de junio de 2024 y el resto, incluidas las de las plataformas, desde el 30 de diciembre de 2024, con periodos transitorios para quienes ya operaban. Resumido:',
      },
      {
        k: 'ul',
        items: [
          'Los proveedores de servicios cripto (CASP): exchanges, custodios, asesores, deben estar autorizados por un supervisor nacional (en España, la CNMV) y pueden operar en toda la UE con ese permiso.',
          'Deben separar los fondos de los clientes de los propios, tener reglas de conducta, gestionar conflictos de interés y prevenir el abuso de mercado.',
          'Las stablecoins se regulan en dos tipos: tokens de dinero electrónico (ligados a una moneda) y tokens referenciados a activos, con obligación de mantener reservas.',
          'Los emisores de otros criptoactivos deben publicar un documento informativo (white paper).',
          'Quedan fuera los servicios totalmente descentralizados sin intermediario y los NFT únicos.',
        ],
      },
      {
        k: 'key',
        title: 'Lo que MiCA no hace',
        t: 'MiCA no elimina el riesgo ni garantiza el valor de ninguna moneda. Aumenta la protección frente a plataformas fraudulentas, pero un criptoactivo regulado puede seguir perdiendo un 80 % de su valor, y los criptoactivos no están cubiertos por el Fondo de Garantía de Depósitos.',
      },
      {
        k: 'p',
        t: 'Además, la directiva DAC8 obliga desde 2026 a las plataformas a comunicar a las haciendas europeas los datos de sus clientes, y en España existe el modelo 721 para criptomonedas guardadas en el extranjero. Todo ello está explicado en la clase «Criptomonedas» del mapa de la inversión.',
      },
    ],
    glossary: [
      { term: 'MiCA', def: 'Reglamento europeo de mercados de criptoactivos.' },
      { term: 'CASP', def: 'Proveedor de servicios de criptoactivos: exchanges, custodios, etc.' },
      {
        term: 'White paper',
        def: 'Documento informativo con el que se presenta un proyecto cripto.',
      },
      {
        term: 'Rug pull',
        def: 'Estafa en la que los creadores de un proyecto se llevan el dinero y lo abandonan.',
      },
      {
        term: '2FA',
        def: 'Verificación en dos pasos: una segunda comprobación además de la contraseña.',
      },
      {
        term: 'DAC8',
        def: 'Directiva europea de cooperación administrativa que obliga a informar de las operaciones con criptoactivos.',
      },
    ],
  },
];
