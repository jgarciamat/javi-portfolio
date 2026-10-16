import type { AssetClass } from './types';

/** Asset classes 09-12: derivatives, currencies, interest-bearing savings, pensions and insurance. */
export const ASSET_CLASSES_C: AssetClass[] = [
  {
    id: 'derivados',
    num: '09',
    emoji: '⚡',
    color: '#dc2626',
    name: 'Derivados y trading',
    nameEn: 'Derivatives and trading',
    tagline: 'Apuestas sobre el precio de otro activo, normalmente con apalancamiento.',
    what: 'Un derivado es un contrato cuyo valor depende de otro activo (una acción, un índice, una divisa, una criptomoneda). Las opciones, los futuros, los CFD, los swaps y los productos apalancados se usan para cubrirse o para especular.',
    earns:
      'Por la diferencia entre el precio de entrada y el de salida, normalmente multiplicada por el apalancamiento. Con la misma subida, ganas más; con la misma bajada, pierdes más, y puedes perder todo el dinero depositado e incluso más en algunos productos.',
    risk: 7,
    liquidity: 5,
    liquidityNote:
      'Se abre y cierra en segundos, pero un movimiento rápido puede cerrarte la posición a la fuerza (liquidación).',
    horizon: 'Corto plazo (minutos, días). No es una inversión: es trading.',
    subtypes: [
      'Opciones (calls y puts)',
      'Futuros',
      'CFD (contratos por diferencias)',
      'Swaps',
      'ETF y productos apalancados e inversos',
    ],
    pros: [
      'Permiten cubrir una cartera frente a caídas (uso profesional prudente).',
      'Pueden ganar también cuando el mercado baja (posición corta).',
      'Se opera con poco capital inicial.',
    ],
    cons: [
      'La mayoría de los inversores minoristas pierde dinero con CFD: los propios brokers deben advertirlo (entre el 70 % y el 80 % de las cuentas, según los avisos de riesgo que publican los propios brokers).',
      'El apalancamiento multiplica las pérdidas, no solo las ganancias.',
      'Costes de financiación diaria, comisiones y diferenciales.',
      'Productos complejos: es fácil no entender del todo qué se ha contratado.',
    ],
    example:
      'Con 1.000 € de margen y apalancamiento 10x controlas 10.000 €. Si el activo sube un 5 %, ganas 500 € (50 % sobre tu margen). Si baja un 10 %, pierdes los 1.000 € y la posición se cierra: una caída que en una inversión normal sería una pérdida del 10 % se convierte en el 100 %.',
    taxKind: 'savings',
    taxShort: 'Ganancia patrimonial, base del ahorro',
    tax: [
      'Opciones, futuros, CFD y warrants: los resultados son ganancias o pérdidas patrimoniales y van a la base del ahorro (19-30 %). No suele haber retención: declaras tú en la renta (modelo 100).',
      'Pérdidas: se compensan con las ganancias patrimoniales de ese año; si sobran, se arrastran 4 años. Con un saldo neto negativo se puede compensar además hasta el 25 % de los dividendos e intereses del año.',
      'Brokers extranjeros: el beneficio sigue tributando en España. Si los valores que mantienes en el extranjero superan 50.000 € a 31 de diciembre, hay que presentar el modelo 720.',
      'Costes financieros (swaps, intereses de financiación del CFD) y comisiones: se pueden restar como gastos de la operación.',
      'Operar de forma muy frecuente y organizada no cambia la tributación del particular, pero algunas actividades de trading profesional pueden considerarse actividad económica. Consulta a un asesor.',
      'IVA: los servicios financieros están exentos.',
      'Regulación: en Europa, ESMA y la CNMV limitan el apalancamiento a minoristas en CFD (a fecha de redacción: 30:1 en las divisas principales; 20:1 en otras divisas, oro e índices principales; 10:1 en otras materias primas e índices; 5:1 en acciones; 2:1 en criptomonedas), exigen cierre automático al 50 % del margen y protegen de saldos negativos.',
    ],
    lesson: {
      title: 'Cómo funciona el margen',
      text: 'Depositas una garantía (margen). El broker te presta el resto de la posición. Si el precio va en tu contra y tu margen cae por debajo del mínimo exigido, el broker cierra tu posición automáticamente (liquidación). Con apalancamiento 10x, una caída de aproximadamente el 10 % ya liquida la posición. Más apalancamiento significa una liquidación más cercana.',
    },
  },
  {
    id: 'divisas',
    num: '10',
    emoji: '💱',
    color: '#0891b2',
    name: 'Divisas',
    nameEn: 'Currencies',
    tagline: 'Comprar una moneda vendiendo otra: euro frente a dólar, yen, libra…',
    what: 'El mercado de divisas (Forex) es donde se cambian monedas. También puedes tener depósitos en moneda extranjera, que ganan los intereses de esa moneda pero se convierten a euros con el tipo de cambio del día.',
    earns:
      'Por la variación del tipo de cambio y, en depósitos, por el diferencial de intereses entre las dos monedas. Las divisas no tienen valor "intrínseco" de largo plazo: si una sube, otra baja.',
    risk: 6,
    liquidity: 5,
    liquidityNote:
      'Es el mercado más líquido del mundo: abierto de lunes a viernes casi las 24 horas.',
    horizon:
      'Corto plazo si es especulación; también puede ser cobertura (viajar, tener gastos en dólares).',
    subtypes: [
      'Forex (pares de divisas: EUR/USD, USD/JPY…)',
      'Depósitos y cuentas en moneda extranjera',
      'Divisas desde un ETF o ETC',
      'Cobertura de divisa en fondos',
    ],
    pros: [
      'Mercado enorme, con precios transparentes y costes bajos.',
      'Útil para cubrirse si cobras o gastas en otra moneda.',
      'Operable en ambos sentidos (subida o bajada).',
    ],
    cons: [
      'Movimientos de pocos porcentajes se amplifican con apalancamiento y generan pérdidas rápidas.',
      'Factores difíciles de prever: tipos de interés, política, geopolítica.',
      'Los bancos centrales pueden intervenir.',
      'Riesgo de cambio sobre inversiones en el extranjero: un fondo en dólares puede ganar en dólares y perder en euros.',
    ],
    example:
      'Compras 1.000 € cuando 1 € = 1,10 $ y obtienes 1.100 $. Si el euro baja a 1 € = 1,00 $ y cambias de vuelta, recibes 1.100 € (+100 €). Si sube a 1,20 $, recuperas solo 916,67 € (−83 €).',
    taxKind: 'savings',
    taxShort: 'Diferencias de cambio y intereses: base del ahorro',
    tax: [
      'Compraventa de divisas (Forex): las ganancias o pérdidas se consideran patrimoniales y van a la base del ahorro (19-30 %). Si se opera con CFD o futuros sobre divisas, igual que en derivados.',
      'Cuentas o depósitos en divisa: los intereses son rendimientos del capital mobiliario (base del ahorro, 19-30 %). Si cambias la divisa por euros con ganancia, esa diferencia de cambio también tributa como ganancia patrimonial.',
      'Retención: los depósitos en bancos españoles se retienen al 19 %; en bancos extranjeros no hay retención y debes declarar tú los rendimientos.',
      'Cuentas en el extranjero: si el saldo de tus cuentas bancarias fuera de España supera 50.000 € a 31 de diciembre, o su saldo medio del último trimestre, hay que presentar el modelo 720.',
      'IVA: los servicios de cambio de divisas están exentos.',
    ],
  },
  {
    id: 'ahorro',
    num: '11',
    emoji: '🏦',
    color: '#22c55e',
    name: 'Ahorro remunerado',
    nameEn: 'Interest-bearing savings',
    tagline: 'El colchón que gana algo: cuentas remuneradas y depósitos.',
    what: 'Son productos bancarios sencillos donde el banco te paga un interés por tener tu dinero con él. Cuentas remuneradas (disponibles en cualquier momento) y depósitos a plazo (fijas el dinero durante un tiempo y cobras un interés conocido).',
    earns:
      'Por intereses, calculados con el TAE (tasa anual equivalente). Es la rentabilidad más previsible, pero suele quedar cerca de la inflación.',
    risk: 1,
    liquidity: 4,
    liquidityNote:
      'Cuentas remuneradas, al momento; depósitos, al vencimiento (cancelar antes puede tener penalización).',
    horizon: 'Corto plazo: hasta 1-3 años. Ideal para el fondo de emergencia y metas cercanas.',
    subtypes: [
      'Cuentas remuneradas',
      'Depósitos a plazo fijo',
      'Cuentas de ahorro de neobancos',
      'Depósitos estructurados (más complejos: cuidado)',
    ],
    pros: [
      'Prácticamente sin riesgo: el Fondo de Garantía de Depósitos cubre hasta 100.000 € por titular y entidad.',
      'Rentabilidad conocida por adelantado (en depósitos).',
      'Total sencillez.',
    ],
    cons: [
      'Rentabilidad baja: si la inflación es mayor que el interés, pierdes poder de compra.',
      'Muchas ofertas son promociones temporales que luego bajan.',
      'En depósitos, el dinero no está disponible hasta el vencimiento.',
    ],
    example:
      'Con 10.000 € en una cuenta al 2,5 % TAE ganas 250 € brutos al año. Si la inflación es del 3 %, tu dinero compra un 0,5 % menos que antes, aunque en la cuenta veas más euros.',
    taxKind: 'savings',
    taxShort: 'Intereses en base del ahorro; retención 19 %',
    tax: [
      'Los intereses son rendimientos del capital mobiliario y van a la base del ahorro (19 % hasta 6.000 €, 21 % hasta 50.000 €, 23 % hasta 200.000 €, 27 % hasta 300.000 € y 30 % por encima, según los datos de la app).',
      'Retención: los bancos españoles retienen un 19 % de los intereses. Es un pago a cuenta: se descuenta del impuesto final en la renta. Lo declaras en la casilla 0027 de la renta.',
      'Bancos extranjeros o neobancos sin retención en España: debes declarar tú los intereses en la renta (modelo 100).',
      'Comisiones de mantenimiento: si el banco te las cobra, no se pueden restar.',
      'Cuentas fuera de España: modelo 720 si superas 50.000 € a 31 de diciembre.',
      'IVA: los intereses no llevan IVA. Si cobras un regalo por contratar un producto (por ejemplo, una promoción), puede considerarse rendimiento del capital mobiliario.',
    ],
  },
  {
    id: 'pensiones',
    num: '12',
    emoji: '🌅',
    color: '#ec4899',
    name: 'Planes de pensiones y seguros de inversión',
    nameEn: 'Pensions and investment insurance',
    tagline: 'Ahorro para la jubilación con ventajas fiscales... y condiciones.',
    what: 'Los planes de pensiones son productos de ahorro para la jubilación con ventajas fiscales; el dinero está invertido en fondos y solo se recupera en jubilación, invalidez, desempleo prolongado u otros supuestos. Los seguros de inversión (PIAS, unit-linked) mezclan seguro y fondos.',
    earns:
      'Por la rentabilidad de lo que invierte el plan o el seguro, menos las comisiones. La ventaja principal es fiscal: ahorras en el IRPF al aportar y, en el PIAS, puede quedar exenta la ganancia en forma de renta vitalicia.',
    risk: 4,
    liquidity: 1,
    liquidityNote:
      'Planes de pensiones: solo se rescatan en supuestos concretos o con aportaciones de más de 10 años. Los unit-linked se pueden rescatar cuando quieras (tributando).',
    horizon: 'Muy largo plazo: hasta la jubilación.',
    subtypes: [
      'Planes de pensiones individuales',
      'Planes de pensiones de empleo (de tu empresa)',
      'PIAS (Plan Individual de Ahorro Sistemático)',
      'Unit-linked (seguros ligados a fondos)',
      'Planes de empleo simplificados para autónomos',
    ],
    pros: [
      'Reducen la base imponible del IRPF en el año de la aportación (planes de pensiones).',
      'Disciplina de ahorro: dificulta gastar el dinero antes de tiempo.',
      'En unit-linked: traspaso entre fondos del seguro sin tributar.',
    ],
    cons: [
      'Poca liquidez: rescatar antes de tiempo solo está permitido en supuestos concretos.',
      'Al rescatar, todo tributa como rendimiento del trabajo en la base general (hasta el 47 %).',
      'Comisiones a veces altas, sobre todo en planes de entidades que las mantienen sin revisar.',
      'Los límites de aportación anuales son bajos.',
    ],
    example:
      'Aportas 1.500 € a un plan individual y tu tipo marginal es del 30 %: te ahorras unos 450 € en la renta del año. Al rescatar, ese capital y su rentabilidad tributan como una nómina. Es un diferimiento fiscal que compensa si en la jubilación tu tipo marginal es menor que cuando aportaste.',
    taxKind: 'general',
    taxShort: 'Aportación reduce base general; rescate tributa como trabajo',
    tax: [
      'Planes de pensiones individuales: la aportación reduce la base imponible general. El límite anual es de 1.500 € (individual) y, además, 8.500 € más si tu empresa aporta a un plan de empleo (hasta 10.000 € en total). Los autónomos pueden aportar hasta 5.750 € si usan un plan de empleo simplificado.',
      'Rescate: lo cobrado (aportaciones y rentabilidad) tributa como rendimiento del trabajo, base general (19-47 % según la comunidad), con retención.',
      'Rescate anticipado: permitido en jubilación, invalidez, dependencia, fallecimiento, desempleo de larga duración, enfermedad grave y para aportaciones con 10 años de antigüedad (desde 2025), entre otros supuestos.',
      'PIAS: seguro a largo plazo con aportaciones de hasta 8.000 € al año y 240.000 € en total. Si pasan al menos 10 años desde la primera prima y se convierte en renta vitalicia asegurada, la ganancia queda exenta de IRPF; si se rescata como capital, la ganancia tributa en la base del ahorro (19-30 %) como rendimiento del capital mobiliario.',
      'Unit-linked: puedes traspasar entre fondos del seguro sin tributar. Al rescatar, la ganancia es rendimiento del capital mobiliario (base del ahorro, 19-30 %), con retención del 19 %.',
      'SIALP (seguro individual de ahorro a largo plazo): hasta 5.000 € al año; si mantienes el seguro al menos 5 años, la ganancia queda exenta de IRPF (con condiciones: consúltalo con un asesor).',
      'Seguros de vida-ahorro: los rescates tributan por la diferencia entre lo cobrado y lo aportado.',
      'IVA: seguros y planes están exentos.',
    ],
  },
];
