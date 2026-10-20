import type { AssetClass } from './types';

/** Asset classes 01-04: shares, bonds, funds and ETFs, crypto. Figures are illustrative. */
export const ASSET_CLASSES_A: AssetClass[] = [
  {
    id: 'renta-variable',
    chapterId: 'acciones',
    num: '01',
    emoji: '📈',
    color: '#6366f1',
    name: 'Renta variable / acciones',
    nameEn: 'Equities / stocks',
    tagline: 'Comprar un trocito de una empresa y crecer con ella.',
    what: 'Una acción es una parte del capital de una empresa. Si compras acciones de una compañía te conviertes en copropietario (pequeñísimo) de su negocio y de sus beneficios futuros.',
    earns:
      'De dos maneras: la revalorización (vendes más caro de lo que compraste) y los dividendos (parte de los beneficios que la empresa reparte). Si la empresa va mal, la acción puede caer mucho e incluso quedarse en cero.',
    risk: 5,
    liquidity: 5,
    liquidityNote:
      'Se vende en segundos en horario de mercado y el dinero llega en unos 2 días hábiles.',
    horizon: 'Largo plazo: 5-10 años o más.',
    subtypes: [
      'Acciones individuales',
      'Acciones de crecimiento y de dividendo',
      'Pequeñas, medianas y grandes empresas',
      'Mercados desarrollados y emergentes',
    ],
    pros: [
      'Históricamente, la mayor rentabilidad a largo plazo de las inversiones tradicionales.',
      'Muy líquida y transparente: precio a la vista cada segundo.',
      'Protege razonablemente frente a la inflación a largo plazo.',
    ],
    cons: [
      'Puede caer un 30-50 % en una crisis y tardar años en recuperarse.',
      'Una sola empresa puede quebrar: concentrar el dinero en pocas acciones es arriesgado.',
      'Exige estómago: vender en pánico convierte una caída temporal en una pérdida real.',
    ],
    example:
      'Si compras 10 acciones a 50 € (500 €) y un año después valen 60 € y han pagado 1,5 € de dividendo por acción, tu resultado bruto es 100 € de plusvalía + 15 € de dividendos = 115 € (23 %). Si hubieran caído a 40 €, habrías perdido 100 € sobre el papel.',
    taxKind: 'savings',
    taxShort: 'Base del ahorro 19-30 %',
    tax: [
      'Dividendos: rendimientos del capital mobiliario. Van a la base del ahorro (19 % hasta 6.000 €, 21 % hasta 50.000 €, 23 % hasta 200.000 €, 27 % hasta 300.000 € y 30 % por encima, según los datos de la app). Las empresas españolas retienen un 19 % al pagarlos; lo declaras en la renta (casilla 0029).',
      'Dividendos extranjeros: suelen sufrir retención en el país de origen (en EE. UU., un 15 % si has firmado el formulario W-8BEN con tu bróker; sin él, 30 %). En la renta puedes deducir esa retención (deducción por doble imposición internacional), con un límite.',
      'Venta con ganancia o pérdida: ganancia o pérdida patrimonial por transmisión, también en la base del ahorro y con la misma escala. El bróker español no retiene al vender: tributas al presentar la renta (modelo 100).',
      'Método FIFO: si compras varias veces, se considera que vendes primero las acciones más antiguas.',
      'Pérdidas: compensan las ganancias del mismo año y, si sobran, se arrastran 4 años. Un saldo negativo de las ventas puede compensar hasta el 25 % de los dividendos e intereses (y al revés). Regla de los dos meses: si recompras el mismo valor en los dos meses anteriores o posteriores a la venta con pérdida, esa pérdida no se computa hasta que vendas lo recomprado.',
      'Impuesto sobre las Transacciones Financieras (la llamada tasa Tobin): 0,2 % sobre la compra de acciones de empresas españolas con capitalización superior a 1.000 millones de euros.',
      'IVA: los servicios financieros están exentos. Si tu bróker está fuera de España y tienes más de 50.000 € en valores a 31 de diciembre, hay que presentar el modelo 720 entre el 1 de enero y el 31 de marzo.',
    ],
  },
  {
    id: 'renta-fija',
    chapterId: 'renta-fija-bonos',
    moreChapters: [
      'letras-del-tesoro',
      'bonos-obligaciones-estado',
      'comprar-deuda-publica',
      'deuda-publica-renta',
      'letras-depositos-monetarios',
    ],
    num: '02',
    emoji: '🏛️',
    color: '#0ea5e9',
    name: 'Renta fija',
    nameEn: 'Fixed income',
    tagline: 'Prestar dinero a un Estado o a una empresa a cambio de intereses.',
    what: 'Un bono es un préstamo que tú haces a un emisor (el Estado, una empresa). El emisor se compromete a pagarte intereses periódicos (el cupón) y a devolverte el nominal al vencimiento.',
    earns:
      'Cobras cupones y, si compras por debajo del nominal (como en las Letras del Tesoro), la diferencia con lo que te devuelven. Si vendes antes del vencimiento, el precio puede ser mayor o menor al que pagaste porque depende de los tipos de interés.',
    risk: 3,
    liquidity: 4,
    liquidityNote:
      'Letras, Bonos y Obligaciones del Estado se pueden vender antes del vencimiento en el mercado secundario (desde la web del Tesoro o tu banco), al precio del día y con comisión; la deuda corporativa pequeña puede costar más de vender.',
    horizon:
      'De 3 meses (Letras) a 50 años (Obligaciones); lo que más usa un ahorrador va de 3 meses a 10 años.',
    subtypes: [
      'Letras del Tesoro (3, 6, 9 y 12 meses, al descuento)',
      'Bonos del Estado (3 y 5 años) y Obligaciones (10, 15, 30 y 50 años), con cupón anual',
      'Se compran en subasta (web del Tesoro, Banco de España o tu banco) o en el mercado secundario',
      'Deuda corporativa: grado de inversión y high yield',
      'Bonos ligados a la inflación y bonos verdes',
    ],
    pros: [
      'Ingresos previsibles si mantienes hasta el vencimiento.',
      'Menos volátil que la bolsa; sirve para amortiguar caídas de la cartera.',
      'El Tesoro español es de los emisores más sólidos de la zona euro.',
      'Puedes comprar Letras, Bonos y Obligaciones directamente al Tesoro, desde 1.000 €, sin comisión de compra ni de custodia.',
    ],
    cons: [
      'Rentabilidad menor que la renta variable a largo plazo.',
      'Si suben los tipos de interés, el precio de los bonos ya emitidos baja.',
      'La inflación puede dejar la rentabilidad real en cero o negativa.',
      'El emisor puede no pagar (riesgo de crédito), sobre todo en deuda corporativa de baja calidad.',
      'La deuda pública no está cubierta por el Fondo de Garantía de Depósitos: la respalda el Estado.',
    ],
    example:
      'Compras una Letra a 12 meses por 970 € por cada 1.000 € de nominal. Dentro de un año el Tesoro te devuelve 1.000 €: ganas 30 € (3,09 % sobre lo que pusiste). No hay cupones; todo el rendimiento es esa diferencia. Cifras de ejemplo: el tipo real es el de cada subasta (tesoro.es).',
    taxKind: 'savings',
    taxShort: 'Base del ahorro 19-30 %',
    tax: [
      'Cupones e intereses: rendimientos del capital mobiliario, base del ahorro (19-30 %).',
      'Letras del Tesoro: el rendimiento (lo que cobras menos lo que pagaste) es rendimiento del capital mobiliario sin retención (art. 75.3 b del Reglamento del IRPF): se paga al hacer la Renta, en la casilla 0030 del año en que vence o la vendes.',
      'Cupones de Bonos y Obligaciones del Estado: rendimiento del capital mobiliario con retención del 19 % (casilla 0027). Venta o amortización de Bonos y Obligaciones: casilla 0031, sin retención en general.',
      'Venta antes del vencimiento: la diferencia entre el precio de venta y el de compra también es rendimiento del capital mobiliario (el cupón corrido se trata aparte). Una pérdida se compensa con rendimientos del capital mobiliario y, con límite del 25 %, con ganancias de ventas.',
      'IVA: exento, igual que el resto de servicios financieros. Sin ITP ni AJD.',
      'Los bonos de emisores extranjeros pueden tener retención en origen y, si los custodia un bróker fuera de España, afectan al modelo 720.',
    ],
  },
  {
    id: 'fondos-etf',
    chapterId: 'fondos-indexados',
    num: '03',
    emoji: '🧺',
    color: '#10b981',
    name: 'Fondos y ETF',
    nameEn: 'Funds and ETFs',
    tagline: 'Una cesta que reúne cientos de inversiones en una sola.',
    what: 'Un fondo de inversión junta el dinero de muchos ahorradores y lo reparte entre muchos valores (acciones, bonos…). Un ETF es un fondo que cotiza en bolsa como una acción y casi siempre replica un índice.',
    earns:
      'Ganas lo que ganen los activos de la cesta menos la comisión anual (TER). En los fondos y ETF de acumulación, los dividendos se reinvierten solos y el valor de tu participación sube.',
    risk: 4,
    liquidity: 4,
    liquidityNote:
      'Los fondos tardan 2-4 días hábiles en devolverte el dinero; los ETF se venden al instante en horario de mercado.',
    horizon:
      'Largo plazo: 5-10 años o más (renta variable); 1-3 años (monetarios y renta fija corta).',
    subtypes: [
      'Fondos indexados (replican un índice, comisión muy baja)',
      'Fondos activos (un gestor elige los valores)',
      'ETF (índices, sectores, bonos, materias primas)',
      'Fondos monetarios y de renta fija a corto',
      'Fondos mixtos y perfilados (mezclan bolsa y bonos)',
    ],
    pros: [
      'Diversificación inmediata con poco dinero.',
      'Comisiones bajas en la gestión indexada (a menudo entre el 0,05 % y el 0,3 % anual).',
      'En España, los fondos permiten traspasar sin pagar impuestos (ver fiscalidad).',
    ],
    cons: [
      'Diversificar no elimina el riesgo de mercado: un fondo de bolsa también cae en una crisis.',
      'Los fondos activos suelen costar más (1-2,5 %) y la mayoría no supera a su índice a largo plazo.',
      'Algunos ETF complejos (apalancados, inversos, sintéticos) son más arriesgados de lo que parecen.',
    ],
    example:
      'Un fondo indexado a 7 % bruto anual con una comisión del 0,2 % deja un 6,8 % aproximado. Con una comisión del 1,5 %, solo un 5,5 %: tras 30 años, esa diferencia puede suponer más de 49.000 € menos con aportaciones de 200 € al mes (simulación ilustrativa de la calculadora de esta pestaña).',
    taxKind: 'savings',
    taxShort: 'Base del ahorro; traspaso sin tributar',
    tax: [
      'Ganancia al reembolsar un fondo o vender un ETF: ganancia patrimonial en la base del ahorro (19-30 %). Los fondos españoles aplican retención del 19 % sobre la ganancia en cada reembolso; los ETF y los fondos en bróker extranjero, no.',
      'Traspaso entre fondos: pasar el dinero de un fondo a otro (de gestoras distintas incluidas) no tributa. Pagas el impuesto solo cuando sacas el dinero a tu cuenta. Es una gran ventaja de planificación.',
      'ETF: no existe el traspaso. Vender un ETF para comprar otro (aunque sea del mismo índice) tributa la ganancia en ese momento.',
      'Método FIFO: se vende primero la participación más antigua. En los fondos, cada reembolso solo tributa por la parte de ganancia que contiene.',
      'Dividendos de ETF de reparto: tributan como dividendos (base del ahorro). Los ETF y fondos de acumulación no reparten, así que no tributas hasta vender.',
      'Pérdidas: compensan ganancias del mismo año (sobrante, 4 años) y están sujetas a la regla de los dos meses (un año si la participación no cotiza, como en un fondo) si recompras el mismo activo.',
      'IVA: los servicios de gestión de fondos están exentos. En bróker extranjero, si superas 50.000 € de valores a 31 de diciembre, modelo 720.',
    ],
  },
  {
    id: 'cripto',
    chapterId: 'cripto-y-blockchain',
    num: '04',
    emoji: '🪙',
    color: '#f59e0b',
    name: 'Criptomonedas y activos digitales',
    nameEn: 'Crypto and digital assets',
    tagline: 'Dinero y activos programables en una cadena de bloques. Muy volátil.',
    what: 'Una criptomoneda es un activo digital que existe en una red descentralizada (blockchain), sin banco central detrás. Bitcoin fue la primera; Ethereum añadió contratos inteligentes; las stablecoins buscan valer siempre 1 dólar o 1 euro.',
    earns:
      'Sobre todo por revalorización: compras y vendes más caro (o más barato). También hay rendimientos por staking (bloquear monedas para validar la red) o préstamo, pero implican riesgos extra. Ninguna criptomoneda genera beneficios como una empresa.',
    risk: 7,
    liquidity: 5,
    liquidityNote:
      'Mercado abierto 24 horas, 7 días; las altcoins pequeñas pueden tener muy poca liquidez.',
    horizon:
      'Solo dinero que puedas perder; si se invierte, a muy largo plazo y en pequeña proporción.',
    subtypes: [
      'Bitcoin (BTC)',
      'Ethereum (ETH) y otras plataformas',
      'Altcoins (el resto de monedas)',
      'Stablecoins (USDT, USDC, EURC…)',
      'Activos tokenizados (acciones, bonos, inmuebles en blockchain)',
    ],
    pros: [
      'Mercado abierto siempre y con acceso global.',
      'Tecnología con usos reales (pagos, contratos inteligentes, tokenización).',
      'Posible diversificación respecto a activos tradicionales (aunque en las crisis suelen caer a la vez).',
    ],
    cons: [
      'Volatilidad extrema: caídas del 70-80 % han ocurrido varias veces en la historia de Bitcoin.',
      'Estafas, hackeos y quiebras de plataformas (por ejemplo, FTX en 2022) pueden hacerte perder todo.',
      'Sin garantías: no hay Fondo de Garantía de Depósitos ni protección parecida si la plataforma quiebra.',
      'Si pierdes la clave privada de tu wallet, pierdes el dinero.',
    ],
    example:
      'Si compras 1.000 € de una criptomoneda y cae un 60 %, te quedan 400 €. Para volver a 1.000 € necesitas que suba un 150 %: las pérdidas grandes cuestan mucho de recuperar.',
    taxKind: 'savings',
    taxShort: 'Ganancia patrimonial, base del ahorro',
    tax: [
      'Vender cripto por euros, cambiarla por otra cripto (permuta) o pagar con ella: es una transmisión y genera ganancia o pérdida patrimonial en la base del ahorro (19-30 %). Comprar cripto con euros no tributa; cambiarla por otra, sí.',
      'Método FIFO: se considera que transmites primero las monedas más antiguas de cada tipo. Las comisiones de compra y venta se pueden restar.',
      'Staking, préstamos y airdrops: suelen tratarse como rendimientos (del capital mobiliario o como ganancias, según el caso y el criterio de Hacienda). Conviene guardar el historial y consultar con un gestor.',
      'Retención: normalmente no hay; el exchange no retiene, tú declaras en la renta (modelo 100).',
      'Modelo 721: obligación de informar si tienes monedas virtuales custodiadas en plataformas del extranjero por más de 50.000 € a 31 de diciembre; se presenta entre el 1 de enero y el 31 de marzo, y después solo si el saldo sube más de 20.000 €. Si además tienes cuentas, valores o inmuebles fuera, aplica el modelo 720 por separado.',
      'Desde 2026, con la directiva DAC8, los proveedores de servicios cripto comunican datos de sus clientes a las haciendas europeas: la información de tus operaciones estará en manos de Hacienda.',
      'IVA: el cambio de criptomonedas por dinero está exento de IVA. El Impuesto sobre el Patrimonio incluye las criptomonedas por su valor a 31 de diciembre.',
    ],
  },
];
