import type { Guide } from './guides';

/** Official pages the government debt guides are based on (checked on `CHECKED`). */
const CHECKED = '2026-10-20';
const TESORO = 'https://www.tesoro.es/deuda-publica';
const SOURCES = {
  letras: {
    label: 'Tesoro Público: Letras del Tesoro',
    url: `${TESORO}/los-valores-del-tesoro/letras-del-tesoro`,
  },
  bonos: {
    label: 'Tesoro Público: Bonos y Obligaciones del Estado',
    url: `${TESORO}/los-valores-del-tesoro/bonos-y-obligaciones-del-estado`,
  },
  calendario: {
    label: 'Tesoro Público: calendario de subastas 2026',
    url: `${TESORO}/subastas/calendario`,
  },
  faq: { label: 'Tesoro Público: preguntas frecuentes', url: `${TESORO}/preguntas-frecuentes` },
  compra: {
    label: 'Sede del Tesoro: Servicio de Compra y Venta de Valores',
    url: 'https://www.tesoro.es/web/sedetesoro/w/servicios/compra-y-venta-de-valores',
  },
  fiscalLetras: {
    label: 'Tesoro Público: tributación de las Letras del Tesoro',
    url: `${TESORO}/los-valores-del-tesoro/fiscalidad/residentes/impuesto-sobre-la-renta-de-las-personas-fisicas/tributacion-de-las-letras-del-tesoro`,
  },
  cnmv: {
    label: 'CNMV: productos de renta fija pública',
    url: 'https://www.cnmv.es/portal/inversor/rentafija-publica',
  },
  boe: {
    label: 'BOE: subastas de Letras del Tesoro en 2026 (BOE-A-2026-830)',
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-830',
  },
};

/** Government debt (Letras, Bonos and Obligaciones): how to buy it and how it is taxed. */
export const GUIDES_DEUDA_PUBLICA: Guide[] = [
  {
    slug: 'como-comprar-letras-del-tesoro',
    updated: CHECKED,
    title: 'Cómo comprar Letras del Tesoro paso a paso en 2026',
    description:
      'Comprar Letras del Tesoro sin banco en la web del Tesoro: requisitos, plazos de petición, subasta no competitiva, comisiones y qué pasa al vencimiento.',
    intro:
      'Las Letras del Tesoro se pueden comprar directamente al Estado, desde 1.000 €, sin comisión de compra ni de custodia. Te contamos los pasos en la web del Tesoro, qué fechas mirar y qué alternativas tienes. Información educativa, no asesoramiento.',
    howTo: true,
    sections: [
      {
        heading: 'Comprueba que puedes usar la web del Tesoro',
        paragraphs: [
          'El Servicio de Compra y Venta de Valores del Tesoro (lo que muchos siguen llamando «Tesoro Directo») es para personas físicas mayores de edad y residentes en España. Necesitas DNI electrónico, certificado digital de la FNMT o Cl@ve, y el programa AutoFirma para firmar.',
          'También necesitas una cuenta bancaria a tu nombre, donde te ingresarán el dinero al vencimiento. Si no cumples estos requisitos, puedes pedir cita en una sucursal del Banco de España o comprar a través de un banco o bróker.',
        ],
      },
      {
        heading: 'Abre tu cuenta directa',
        paragraphs: [
          'La primera vez que entras das de alta una cuenta directa: una cuenta de valores a tu nombre en el Banco de España donde quedarán anotadas tus Letras. Puede ser individual o conjunta (hasta cuatro titulares), y la cuenta bancaria de cobro debe tener los mismos titulares.',
          'Abrir y mantener la cuenta directa no tiene comisión, y tampoco la compra ni la custodia de los valores.',
        ],
      },
      {
        heading: 'Elige el plazo y la subasta en el calendario',
        paragraphs: [
          'El Tesoro emite en 2026 Letras a 3, 6, 9 y 12 meses, una subasta al mes para cada plazo, normalmente en martes: primero las de 6 y 12 meses y, una semana después, las de 3 y 9 meses. Por ejemplo, el calendario oficial fija subastas de Letras a 6 y 12 meses el 3 de noviembre de 2026 y a 3 y 9 meses el 10 de noviembre.',
          'Lo importante es la fecha límite de petición por internet, que suele ser unos 7 días naturales antes de la subasta. Consulta siempre el calendario vigente del Tesoro, porque los festivos pueden mover las fechas.',
        ],
      },
      {
        heading: 'Haz la petición no competitiva',
        paragraphs: [
          'Indica el nominal que quieres: mínimo 1.000 € y siempre en múltiplos de 1.000 € (cada Letra vale 1.000 € al vencimiento). Lo habitual para un particular es la petición no competitiva: no fijas precio y te adjudican al precio medio ponderado de la subasta.',
          'Firma la petición y haz una transferencia desde tu banco por el importe del depósito previo, que en las Letras es de 1.000 € por cada Letra. El dinero debe estar en el Banco de España al menos dos días hábiles antes de la subasta: si llega tarde, la petición se anula y te lo devuelven sin coste.',
        ],
      },
      {
        heading: 'Consulta el resultado y recibe la diferencia',
        paragraphs: [
          'Tras la subasta, el resultado aparece en tesoro.es y en la opción «Posición Integral» del servicio. Como el precio de la Letra es inferior a 1.000 €, el Banco de España te devuelve la diferencia entre el depósito y el precio en pocos días.',
          'Ejemplo con cifras redondas: si la subasta de Letras a 12 meses (364 días) sale a un tipo medio del 3 %, el precio es de unos 97,056 € por cada 100; por 10.000 € de nominal pagas unos 9.705,60 € y te devuelven unos 294,40 €. El tipo real es el de cada subasta.',
        ],
      },
      {
        heading: 'Al vencimiento: cobra, reinvierte o vende antes',
        paragraphs: [
          'El día del vencimiento, el Banco de España te ingresa el nominal en tu cuenta bancaria. Por esa transferencia cobra una comisión de 1,5 por mil, con un mínimo de 0,90 € y un máximo de 200 €, según el Tesoro.',
          'Si quieres reinvertir en la siguiente subasta, prográmalo en el servicio antes de que cierre el plazo, siete días antes de la subasta. Si necesitas el dinero antes, puedes vender la Letra en el mercado secundario, al precio de ese día y con comisión de venta.',
          'El rendimiento tributa en la base del ahorro sin retención, en la Renta del año en que vence; lo explicamos en [cómo tributan las Letras del Tesoro](/guias/letras-del-tesoro-renta).',
        ],
      },
    ],
    related: ['letras-del-tesoro-renta', 'fondo-de-emergencia', 'inflacion-y-ahorro'],
    sources: [SOURCES.compra, SOURCES.faq, SOURCES.calendario, SOURCES.letras, SOURCES.boe],
    checked: CHECKED,
  },
  {
    slug: 'letras-del-tesoro-renta',
    updated: CHECKED,
    title: 'Cómo tributan las Letras y los Bonos del Estado en la Renta',
    description:
      'Letras del Tesoro, cupones y venta de Bonos del Estado en el IRPF: rendimiento del capital mobiliario, retenciones, casillas 0027, 0030 y 0031 y pérdidas.',
    intro:
      'Lo que ganas con deuda pública española tributa en la base del ahorro, pero no igual que la venta de acciones o fondos. Aquí tienes cómo se calcula, qué lleva retención y dónde va en la Renta. Cifras orientativas: confirma tu caso en tus datos fiscales.',
    sections: [
      {
        heading: '¿Qué tipo de renta es?',
        paragraphs: [
          'El rendimiento de una Letra del Tesoro (lo que cobras al vencimiento o al vender menos lo que pagaste), los cupones de los Bonos y Obligaciones y lo que obtienes al vender o amortizar estos son rendimientos del capital mobiliario (artículo 25.2 de la Ley del IRPF). No son ganancias patrimoniales.',
          'Todos van a la base imponible del ahorro, que en la Renta 2025 tributa al 19 % hasta 6.000 €, 21 % hasta 50.000 €, 23 % hasta 200.000 €, 27 % hasta 300.000 € y 30 % por encima. Navarra y el País Vasco tienen normas propias.',
        ],
      },
      {
        heading: '¿Las Letras del Tesoro tienen retención?',
        paragraphs: [
          'No. El Reglamento del IRPF (artículo 75.3 b) las excluye de retención: el Tesoro te devuelve los 1.000 € de cada Letra enteros y el impuesto lo pagas al hacer la Renta. Los cupones de Bonos y Obligaciones sí llevan una retención del 19 %, que descuentas en la declaración.',
        ],
      },
      {
        heading: '¿En qué casilla se declaran?',
        paragraphs: [
          'En la Renta 2025, dentro de los rendimientos del capital mobiliario de la base del ahorro: la casilla 0030 es para las Letras del Tesoro, la 0031 para la venta o amortización de otros activos financieros como los Bonos y Obligaciones, y la 0027 para los intereses, incluidos los cupones.',
          'El Banco de España y las entidades financieras informan a Hacienda, así que suelen aparecer en tus datos fiscales. Revisa el valor de compra, el de cobro y las comisiones antes de confirmar el borrador.',
        ],
      },
      {
        heading: '¿En qué año se declara una Letra?',
        paragraphs: [
          'En el año en que vence o la vendes, no en el que la compras. Una Letra a 12 meses comprada en noviembre de 2026 que vence en noviembre de 2027 va en la Renta 2027, que se presenta en 2028.',
        ],
      },
      {
        heading: '¿Se pueden restar las comisiones?',
        paragraphs: [
          'Sí, los gastos de compra y venta que puedas justificar se restan del rendimiento. Ejemplo: compras 10.000 € de nominal por 9.705,60 € y el Banco de España te cobra 15 € al transferirte el dinero; tu rendimiento es de 279,40 € y, con el 19 %, pagarías unos 53,09 €.',
        ],
      },
      {
        heading: '¿Qué pasa si vendo con pérdida?',
        paragraphs: [
          'Tienes un rendimiento negativo del capital mobiliario. Se resta primero de tus intereses, cupones y dividendos del año; si aún queda negativo, compensa hasta el 25 % de tus ganancias por ventas de acciones o fondos, y el resto se arrastra cuatro años (artículo 49 de la Ley del IRPF).',
          'Atención a la regla de los dos meses: si recompras la misma referencia en los dos meses anteriores o posteriores a la venta con pérdida, no puedes restarla hasta que vendas esos valores.',
          'Si estás pensando en comprar, consulta [cómo comprar Letras del Tesoro paso a paso](/guias/como-comprar-letras-del-tesoro) y compara con otras formas de ahorro en [inflación y ahorro](/guias/inflacion-y-ahorro).',
        ],
      },
    ],
    related: ['como-comprar-letras-del-tesoro', 'inflacion-y-ahorro', 'interes-compuesto'],
    sources: [SOURCES.fiscalLetras, SOURCES.letras, SOURCES.bonos, SOURCES.cnmv],
    checked: CHECKED,
  },
];
