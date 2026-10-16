import type { AssetClass } from './types';

/** Asset classes 05-06: property and commodities. */
export const ASSET_CLASSES_B: AssetClass[] = [
  {
    id: 'inmuebles',
    num: '05',
    emoji: '🏠',
    color: '#ef4444',
    name: 'Inmuebles',
    nameEn: 'Real estate',
    tagline: 'Ladrillo directo o a través de empresas y fondos que lo poseen.',
    what: 'Invertir en inmuebles es comprar viviendas, locales, terrenos o garajes para alquilarlos o revenderlos. También se puede invertir sin comprar nada físico, con REIT (fondos de inversión inmobiliaria cotizados, sobre todo en EE. UU.) y SOCIMI (su equivalente español).',
    earns:
      'Por el alquiler (rentas periódicas) y por la revalorización del inmueble. Las SOCIMI y los REIT reparten gran parte de sus beneficios en dividendos.',
    risk: 4,
    liquidity: 1,
    liquidityNote:
      'Vender una vivienda puede llevar meses y cuesta dinero; las SOCIMI y los REIT cotizan y se venden en el día.',
    horizon: 'Largo plazo: 10 años o más (por los costes de entrar y salir).',
    subtypes: [
      'Viviendas (residencial)',
      'Locales comerciales y oficinas',
      'Terrenos (urbanos y rústicos)',
      'Garajes y trasteros',
      'REIT y SOCIMI cotizadas',
    ],
    pros: [
      'Activo tangible y fácil de entender.',
      'Rentas recurrentes y posible protección frente a la inflación.',
      'Permite apalancarse con una hipoteca (con riesgo).',
    ],
    cons: [
      'Mucho dinero concentrado en un solo activo y en una sola zona.',
      'Costes altos al comprar (impuestos, notaría, registro) y al vender (plusvalías, comisiones).',
      'Impagos, okupación, obras e IBI: la rentabilidad real es menor que la bruta.',
      'Poca liquidez: no se puede vender "un 10 %" para un imprevisto.',
    ],
    example:
      'Compras un piso de segunda mano por 150.000 € en una comunidad con ITP del 7 %: pagas 10.500 € de impuesto más notaría y registro. Si lo alquilas por 700 € al mes (8.400 € al año), el alquiler bruto es del 5,6 %, pero tras IBI, comunidad, seguro, mantenimiento e impagos, la rentabilidad neta puede quedar en torno al 3-4 % antes de IRPF.',
    taxKind: 'mixed',
    taxShort: 'IVA o ITP/AJD al comprar; alquiler en base general',
    tax: [
      'Compra de vivienda nueva (primera transmisión): IVA del 10 % más Actos Jurídicos Documentados (AJD), cuyo tipo fija cada comunidad (suele estar entre el 0,5 % y el 1,5 %). Garajes y trasteros comprados junto a la vivienda (hasta 2) tienen el mismo 10 %.',
      'Compra de locales, oficinas y garajes sueltos nuevos: IVA del 21 %. Los terrenos edificables o urbanizados tributan al 21 % de IVA; los rústicos no edificables suelen ir sujetos a ITP.',
      'Compra de segunda mano: no hay IVA, sino Impuesto de Transmisiones Patrimoniales (ITP) que paga el comprador, con tipo fijado por la comunidad autónoma (en general entre el 6 % y el 10 %, con tipos reducidos para jóvenes o familias numerosas en algunas).',
      'Alquiler: rentas de alquiler son rendimientos del capital inmobiliario, que van a la base general del IRPF (escala del 19 % al 47 %, según la comunidad), no a la del ahorro. Se pueden restar gastos (intereses de la hipoteca, IBI, comunidad, seguros, reparaciones, amortización del 3 % del valor de construcción). En vivienda habitual del inquilino puede aplicarse una reducción cuyo porcentaje y requisitos han cambiado varias veces: consúltalo con tu gestor.',
      'IVA en el alquiler: el alquiler de vivienda para residir está exento; el de locales y oficinas lleva un 21 %; el de apartamentos turísticos con servicios propios de hostelería, un 10 %.',
      'Venta: la ganancia patrimonial (precio de venta menos precio de compra con gastos y mejoras, con la parte proporcional de la amortización) va a la base del ahorro (19-30 %). Hay exención si es tu vivienda habitual y reinviertes el dinero en otra vivienda habitual o tienes más de 65 años. También se paga la plusvalía municipal (impuesto sobre el incremento de valor de los terrenos), calculada por el ayuntamiento.',
      'Cada año: IBI (ayuntamiento) y, para patrimonios altos, el Impuesto sobre el Patrimonio y el Impuesto Temporal de Solidaridad de las Grandes Fortunas.',
      'SOCIMI: pagan un 0 % en el impuesto de sociedades y reparten dividendos que tributan como cualquier dividendo (base del ahorro). Vender sus acciones tributa como ganancia patrimonial. En REIT extranjeros hay retención en origen (en EE. UU., un 15 %-30 % según el formulario W-8BEN).',
    ],
    lesson: {
      title: 'REIT y SOCIMI: ladrillo sin escritura',
      text: 'Son empresas cotizadas que poseen inmuebles de alquiler (oficinas, centros comerciales, residencias, logística…) y están obligadas a repartir buena parte del beneficio como dividendo. Permiten invertir desde muy poco dinero y vender en el día, pero su precio sube y baja como una acción: no son tan estables como parecen y son sensibles a los tipos de interés.',
    },
  },
  {
    id: 'materias-primas',
    num: '06',
    emoji: '🛢️',
    color: '#a16207',
    name: 'Materias primas',
    nameEn: 'Commodities',
    tagline: 'Oro, petróleo, gas, cobre, trigo… lo que el mundo consume y guarda.',
    what: 'Las materias primas (commodities) son bienes básicos que se compran y venden en mercados organizados: metales (oro, plata, cobre), energía (petróleo, gas) y productos agrícolas (trigo, café, maíz).',
    earns:
      'Solo por la variación del precio: no pagan intereses ni dividendos. El oro se usa como refugio en épocas de incertidumbre; el petróleo y el cobre dependen del ciclo económico; los agrícolas, de las cosechas y del clima.',
    risk: 5,
    liquidity: 4,
    liquidityNote:
      'Con ETC, ETF o futuros se compra y vende en el día; el oro físico exige vender a un tratante con descuento.',
    horizon: 'Medio-largo plazo; los precios pueden pasar años sin moverse.',
    subtypes: [
      'Oro y plata (físicos, ETC o ETF)',
      'Cobre, platino y otros metales industriales',
      'Petróleo y gas natural',
      'Agrícolas: trigo, maíz, café, cacao…',
    ],
    pros: [
      'Protección parcial frente a la inflación y la incertidumbre (sobre todo el oro).',
      'Baja relación con la bolsa en algunos periodos.',
      'Oro físico: sin riesgo de contrapartida si lo tienes en casa o en un cofre.',
    ],
    cons: [
      'No generan rentas: solo ganas si el precio sube.',
      'Precios muy volátiles (el petróleo llegó a cotizar en negativo en abril de 2020 en algunos contratos de futuros).',
      'Invertir con futuros tiene costes de renovación (contango) y riesgo de apalancamiento.',
      'Guardar oro físico cuesta (seguro, cofre) y hay un diferencial entre compra y venta.',
    ],
    example:
      'Compras 1.000 € de oro en un ETC y sube un 10 % en un año: ganas 100 €, sin intereses ni dividendos. Si baja un 10 %, pierdes 100 €. En cambio, 1.000 € en un bono público al 3 % te habrían dado 30 € seguros si lo mantienes.',
    taxKind: 'mixed',
    taxShort: 'Oro de inversión exento de IVA; ganancia en base del ahorro',
    tax: [
      'Oro de inversión: el oro en lingotes o láminas de pureza igual o superior a 995 milésimas y las monedas de oro de al menos 900 milésimas que cumplen los requisitos europeos están exentos de IVA. El oro de joyería sí lleva IVA (21 %).',
      'Plata, cobre y platino: llevan IVA del 21 % al comprarlos en físico. Las monedas de plata de coleccionista se tratan como bienes normales.',
      'IRPF: al vender oro o plata físicos, o un ETC/ETF de materias primas, la diferencia con el precio de compra es ganancia patrimonial en la base del ahorro (19-30 %). Los intereses o dividendos no existen, así que no hay retención.',
      'Petróleo, gas y agrícolas: casi siempre se invierte vía ETC, ETF o futuros. Un ETF/ETC tributa como cualquier ETF; los futuros, como derivados (ganancia o pérdida patrimonial en la base del ahorro).',
      'Oro físico y Patrimonio: cuenta como patrimonio por su valor de mercado en el Impuesto sobre el Patrimonio.',
      'Si compras ETC o ETF de materias primas con un bróker extranjero, esos valores cuentan para el modelo 720 cuando el conjunto supera 50.000 € a 31 de diciembre.',
    ],
    lesson: {
      title: 'El oro: refugio, no inversión productiva',
      text: 'El oro no produce nada: ni dividendos, ni intereses. Su papel es el de seguro cuando los inversores pierden confianza en otros activos. Hay décadas en las que sube mucho y otras en las que se queda en el mismo sitio: su comportamiento a largo plazo depende de la inflación, de los tipos de interés reales y del dólar.',
    },
  },
];
