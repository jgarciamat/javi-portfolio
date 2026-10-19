import type { CourseChapter } from '@domain/model/Course';

/**
 * Chapters about Spanish government debt (Letras, Bonos and Obligaciones del Estado): what they
 * are, how they are bought and how they are taxed (Premium). Educational, not advice.
 *
 * Sources, checked in October 2026 (full list in docs/inversiones/deuda-publica.md): tesoro.es
 * (Letras, Bonos y Obligaciones, calendario de subastas 2026, preguntas frecuentes, fiscalidad),
 * Orden ECM/2/2026 (BOE-A-2026-678), Resolución de 13 de enero de 2026 (BOE-A-2026-830), CNMV
 * (renta fija pública), LIRPF arts. 25.2, 46, 49 y 66/76, RIRPF art. 75.3 b) y e), and the
 * official Renta 2025 schema (boxes 0027, 0030, 0031).
 */
export const CHAPTERS_TREASURY: CourseChapter[] = [
  {
    id: 'letras-del-tesoro',
    emoji: '💶',
    color: '#0369a1',
    title: 'Letras del Tesoro: qué son y cómo funcionan',
    titleEn: 'Spanish Treasury bills (Letras): what they are and how they work',
    summary:
      'Deuda del Estado a 3, 6, 9 y 12 meses: compras por menos de 1.000 € y te devuelven 1.000 €. Cómo se calcula su rentabilidad, con calculadora.',
    summaryEn:
      'Spanish government debt at 3, 6, 9 and 12 months: you pay less than €1,000 and get €1,000 back. How the yield is worked out, with a calculator.',
    level: 1,
    topic: 'bonds',
    blocks: [
      {
        k: 'p',
        t: 'Una Letra del Tesoro es un préstamo a corto plazo que haces al Estado español. Cada Letra tiene un valor nominal de 1.000 €: es lo que el Tesoro te devuelve el día del vencimiento. No paga intereses por el camino (no tiene cupón): la compras por menos de 1.000 € y tu rendimiento es la diferencia. Por eso se dice que se emite «al descuento».',
      },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'Pagas hoy un precio inferior a 1.000 € por cada Letra y, al vencimiento, el Tesoro te ingresa 1.000 €. La diferencia es tu rendimiento. Cuanto más alto es el tipo de interés de la subasta, más barata la compras y más ganas.',
      },
      { k: 'h', t: '1. Plazos e importes' },
      {
        k: 'ul',
        items: [
          'Plazos que emite el Tesoro en 2026: 3, 6, 9 y 12 meses. No se emiten Letras a 18 meses (Resolución de 13 de enero de 2026, BOE-A-2026-830).',
          'Importe mínimo: 1.000 € de nominal por petición; por encima, en múltiplos de 1.000 € (no puedes pedir 1.500 €).',
          'Se emiten solo en subasta, una vez al mes para cada plazo, y quedan registradas a tu nombre como anotaciones en cuenta (no hay papel).',
          'Lo que pagas no es exactamente 1.000 € por Letra: al presentar la petición el Banco de España te pide un depósito de 1.000 € por Letra y, cuando se resuelve la subasta, te devuelve la diferencia con el precio final.',
        ],
      },
      { k: 'h', t: '2. Cómo se calcula el precio y la rentabilidad' },
      {
        k: 'p',
        t: 'El Tesoro publica el resultado de cada subasta como un tipo de interés anual y su precio equivalente en porcentaje del nominal. Para Letras a un año o menos se usa interés simple con la convención ACTUAL/360: precio = 100 / (1 + tipo × días / 360). Los días son los que faltan desde la emisión hasta el vencimiento (una Letra «a 12 meses» suele tener unos 364 días).',
      },
      {
        k: 'table',
        head: [
          'Tipo de la subasta (ejemplo)',
          'Días',
          'Precio por cada 100',
          'Pagas por 10 Letras',
          'Ganas al vencimiento',
        ],
        rows: [
          ['2,000 %', '364', '≈ 98,018', '≈ 9.801,79 €', '≈ 198,21 €'],
          ['3,000 %', '364', '≈ 97,056', '≈ 9.705,60 €', '≈ 294,40 €'],
          ['3,000 %', '182', '≈ 98,506', '≈ 9.850,60 €', '≈ 149,40 €'],
        ],
      },
      {
        k: 'ex',
        title: 'Ejemplo con cifras redondas',
        t: 'Pides 10 Letras a 12 meses (10.000 € de nominal) y la subasta sale a un tipo medio del 3,000 % con 364 días. El precio es 100 / (1 + 0,03 × 364 / 360) ≈ 97,056 %: pagas unos 9.705,60 € y al vencimiento cobras 10.000 €. Ganas unos 294,40 € brutos. El tipo es un ejemplo: el real es el de cada subasta.',
      },
      { k: 'calc', id: 'letra' },
      { k: 'h', t: '3. Dónde mirar el tipo de verdad' },
      {
        k: 'p',
        t: 'Los tipos cambian en cada subasta, así que no te fíes de una cifra que leas en una noticia antigua. Los datos oficiales están en tesoro.es (Deuda Pública → Subastas → Resultado últimas subastas) y en las resoluciones de resultados que publica el BOE. Las fechas de todas las subastas del año están en el calendario oficial del Tesoro.',
      },
      {
        k: 'ul',
        items: [
          'Letras a 6 y 12 meses: se subastan en martes, la semana en que vencen las Letras del mes.',
          'Letras a 3 y 9 meses: el martes siguiente.',
          'Ejemplo del calendario 2026: Letras a 6 y 12 meses el 3 de noviembre y a 3 y 9 meses el 10 de noviembre de 2026. Comprueba siempre el calendario vigente.',
        ],
      },
      { k: 'h', t: '4. Qué riesgos tiene' },
      {
        k: 'ul',
        items: [
          'Riesgo de crédito: muy bajo, porque paga el Reino de España, pero no es cero. La deuda pública no está cubierta por el Fondo de Garantía de Depósitos.',
          'Riesgo de reinversión: cuando vence la Letra, los tipos pueden haber bajado y la siguiente renta menos.',
          'Riesgo de inflación: si los precios suben más que el tipo de la Letra, pierdes poder de compra.',
          'Liquidez: puedes venderla antes del vencimiento en el mercado secundario, pero al precio de ese día y con comisiones. Si los tipos han subido, recibirás algo menos.',
        ],
      },
      {
        k: 'warn',
        title: 'Información educativa, no asesoramiento',
        t: 'Este capítulo explica cómo funcionan las Letras; no te dice si te convienen. Antes de invertir, piensa cuándo vas a necesitar el dinero y compara con otras opciones. Las rentabilidades pasadas o de ejemplo no garantizan las futuras.',
      },
      {
        k: 'tip',
        title: 'Fiscalidad en una línea',
        t: 'El rendimiento de una Letra tributa en la base del ahorro (del 19 % al 30 % en 2025) en el año en que vence o la vendes, y no lleva retención: lo pagas al hacer la Renta (casilla 0030). Lo explicamos paso a paso en el capítulo «Deuda pública y Renta».',
      },
    ],
    glossary: [
      {
        term: 'Letra del Tesoro',
        def: 'Deuda del Estado a un año o menos, de 1.000 € de nominal, que se compra al descuento y no paga cupón.',
      },
      {
        term: 'Emisión al descuento',
        def: 'Se paga menos que el nominal y se cobra el nominal al vencimiento: el rendimiento es la diferencia.',
      },
      {
        term: 'Tipo medio ponderado',
        def: 'Tipo de interés medio de las peticiones aceptadas en una subasta; es el que se aplica a las peticiones no competitivas.',
      },
      {
        term: 'ACTUAL/360',
        def: 'Convención que cuenta los días reales del plazo y los divide entre 360 para calcular el interés de una Letra.',
      },
      {
        term: 'Anotación en cuenta',
        def: 'Registro electrónico de quién es el titular de un valor; sustituye a los títulos en papel.',
      },
    ],
  },
  {
    id: 'bonos-obligaciones-estado',
    emoji: '📜',
    color: '#1d4ed8',
    title: 'Bonos y Obligaciones del Estado: cupones, precio y vencimiento',
    titleEn: 'Spanish government bonds (Bonos and Obligaciones): coupons, price and maturity',
    summary:
      'Deuda del Estado a 3, 5, 10, 15, 30 y 50 años que paga un cupón cada año. Qué cobras, por qué cambia su precio y qué son los bonos indexados y los verdes.',
    summaryEn:
      'Spanish government debt at 3, 5, 10, 15, 30 and 50 years paying a yearly coupon. What you get, why the price moves, and what inflation-linked and green bonds are.',
    level: 2,
    topic: 'bonds',
    blocks: [
      {
        k: 'p',
        t: 'Los Bonos y las Obligaciones del Estado son préstamos a largo plazo al Estado. Son iguales en todo salvo el plazo: los Bonos van de 2 a 5 años y las Obligaciones superan los 5 años. A diferencia de las Letras, pagan un interés fijo cada año, el cupón, y al vencimiento te devuelven el nominal.',
      },
      {
        k: 'table',
        head: ['Producto', 'Plazos que emite el Tesoro', 'Cómo pagan', 'Mínimo'],
        rows: [
          [
            'Letras del Tesoro',
            '3, 6, 9 y 12 meses',
            'Al descuento, sin cupón',
            '1.000 € y múltiplos',
          ],
          ['Bonos del Estado', '3 y 5 años', 'Cupón anual fijo', '1.000 € y múltiplos'],
          [
            'Obligaciones del Estado',
            '10, 15, 30 y 50 años',
            'Cupón anual fijo',
            '1.000 € y múltiplos',
          ],
          [
            'Bonos y Obligaciones indexados',
            'Según emisión',
            'Cupón y nominal ligados a la inflación europea',
            '1.000 € y múltiplos',
          ],
        ],
      },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'Si compras un Bono u Obligación y lo mantienes hasta el vencimiento, cobras el cupón cada año y recuperas el nominal. Lo que no sabes es cuánto valdrá si lo vendes antes: su precio sube cuando bajan los tipos de interés y baja cuando suben.',
      },
      { k: 'h', t: '1. El cupón: lo que cobras cada año' },
      {
        k: 'p',
        t: 'El cupón es un porcentaje fijo del nominal. Una Obligación de 1.000 € con un cupón del 3 % paga 30 € brutos al año en la misma fecha. Sobre cada cupón se retiene el 19 % a cuenta del IRPF, así que te llegan unos 24,30 € y el resto lo descuentas en la Renta.',
      },
      {
        k: 'ex',
        title: 'Ejemplo',
        t: 'Tienes 10.000 € de nominal en una Obligación a 10 años con cupón del 3 %. Cada año cobras 300 € brutos; te retienen 57 € y te ingresan 243 € (menos la pequeña comisión de transferencia si la tienes en el Banco de España). Al cabo de 10 años recuperas los 10.000 €. En total, 3.000 € brutos de cupones si el Estado paga.',
      },
      { k: 'h', t: '2. Precio en la subasta: por qué no pagas siempre 100' },
      {
        k: 'p',
        t: 'Cuando el Tesoro reabre una referencia que ya existe, el cupón está fijado de antes, pero la rentabilidad que pide el mercado ha cambiado. Por eso el precio sale por encima o por debajo de 100. Si compras por debajo de 100, ganas además la diferencia hasta el nominal; si compras por encima, la pierdes. La rentabilidad total si lo mantienes hasta el final es la TIR.',
      },
      {
        k: 'ul',
        items: [
          'Las peticiones de Bonos y Obligaciones se expresan en precio «ex cupón», sin el cupón corrido. Si compras entre dos pagos de cupón, además pagas el cupón corrido: la parte del próximo cupón que ya se ha devengado.',
          'Las subastas de Bonos y Obligaciones suelen ser el primer y el tercer jueves de cada mes. El Tesoro anuncia las referencias (cupón, vencimiento y depósito previo) el viernes anterior.',
          'El depósito previo de Bonos y Obligaciones lo fija el Banco de España antes de cada subasta; luego te devuelven lo que sobre o te piden lo que falte.',
        ],
      },
      { k: 'chart', id: 'bondCurve' },
      { k: 'h', t: '3. Vender antes del vencimiento' },
      {
        k: 'p',
        t: 'Puedes vender en el mercado secundario en cualquier momento. Si los tipos han subido desde que compraste, el precio habrá bajado y venderás con pérdida; si han bajado, con ganancia. Cuanto más largo es el plazo, más se mueve el precio: una Obligación a 30 años puede variar mucho más que un Bono a 3 años con el mismo cambio de tipos.',
      },
      { k: 'calc', id: 'bond' },
      { k: 'h', t: '4. Indexados a la inflación y bonos verdes' },
      {
        k: 'ul',
        items: [
          'Bonos y Obligaciones indexados: su nominal se actualiza con la inflación de la zona euro (el índice IPCA sin tabaco) y el cupón se calcula sobre ese nominal actualizado. Protegen frente a la inflación, pero su rentabilidad se expresa en términos reales y es más baja.',
          'Bonos verdes: el Tesoro emite Obligaciones verdes desde 2021 cuyo dinero se asigna a gastos medioambientales según su marco de bonos verdes. Para ti funcionan como una Obligación normal: mismo emisor, cupón y riesgo.',
          'Strips: los cupones y el principal de algunas referencias se pueden separar y negociar por separado; es un producto para inversores avanzados.',
        ],
      },
      { k: 'h', t: '5. Riesgos' },
      {
        k: 'ul',
        items: [
          'Riesgo de tipos de interés: si suben, el precio de tu bono baja. Solo importa si vendes antes del vencimiento.',
          'Riesgo de inflación: un cupón fijo pierde valor real si la inflación es más alta.',
          'Riesgo de reinversión: los cupones y el nominal que cobras tendrás que invertirlos a los tipos de ese momento.',
          'Riesgo país (de crédito): depende de la solvencia del Estado; se refleja en su calificación y en la prima de riesgo frente al bono alemán.',
          'Liquidez: la deuda del Estado se negocia mucho, pero un particular vende con comisiones y con un pequeño diferencial entre precio de compra y de venta.',
        ],
      },
      {
        k: 'warn',
        title: 'No es un depósito',
        t: 'La deuda pública no está cubierta por el Fondo de Garantía de Depósitos: la respalda el propio Estado. Y su precio puede bajar antes del vencimiento. Información educativa, no asesoramiento: decide según tu plazo y tu situación.',
      },
    ],
    glossary: [
      {
        term: 'Bono del Estado',
        def: 'Deuda del Estado a entre 2 y 5 años con cupón anual fijo; el Tesoro emite hoy a 3 y 5 años.',
      },
      {
        term: 'Obligación del Estado',
        def: 'Deuda del Estado a más de 5 años con cupón anual; el Tesoro emite a 10, 15, 30 y 50 años.',
      },
      {
        term: 'Precio ex cupón',
        def: 'Precio de un bono sin el cupón corrido, que es como se cotiza y se puja en las subastas.',
      },
      {
        term: 'Bono indexado',
        def: 'Bono cuyo nominal se actualiza con la inflación, de forma que el cupón y la devolución suben con los precios.',
      },
      {
        term: 'Bono verde',
        def: 'Bono cuyo dinero se asigna a gastos con beneficio medioambiental, con el mismo riesgo que el resto de la deuda del emisor.',
      },
      {
        term: 'Referencia',
        def: 'Cada emisión concreta de deuda, con su cupón y su fecha de vencimiento; el Tesoro la reabre en varias subastas.',
      },
    ],
  },
  {
    id: 'comprar-deuda-publica',
    emoji: '🛒',
    color: '#0891b2',
    title: 'Cómo comprar deuda pública paso a paso: Tesoro, banco y mercado secundario',
    titleEn: 'How to buy Spanish government debt step by step: Treasury, bank and secondary market',
    summary:
      'Los tres caminos para comprar Letras, Bonos y Obligaciones: la web del Tesoro, el Banco de España y tu banco o bróker, con plazos, comisiones y cómo vender o reinvertir.',
    summaryEn:
      'The three ways to buy Spanish bills and bonds: the Treasury website, the Bank of Spain and your bank or broker, with deadlines, fees and how to sell or roll over.',
    level: 1,
    topic: 'bonds',
    blocks: [
      {
        k: 'p',
        t: 'Hay dos momentos para comprar deuda pública: en la subasta, cuando el Tesoro la emite (mercado primario), o después, a otro inversor que la vende (mercado secundario). Y hay tres canales: la web del Tesoro, una sucursal del Banco de España o una entidad financiera (banco, sociedad o agencia de valores).',
      },
      {
        k: 'table',
        head: [
          'Canal',
          'Qué necesitas',
          'Comisiones (según el Tesoro, octubre 2026)',
          'Para quién',
        ],
        rows: [
          [
            'Web del Tesoro (Servicio de Compra y Venta de Valores, antes «Tesoro Directo»)',
            'Ser persona física residente en España, mayor de edad, con DNIe, certificado digital o Cl@ve y una cuenta bancaria a tu nombre',
            'Sin comisión por comprar, custodiar, abrir ni mantener la cuenta directa; 1,5 por mil al transferirte amortizaciones y cupones (mín. 0,90 €, máx. 200 €)',
            'Quien quiere comprar en subasta sin intermediarios',
          ],
          [
            'Sucursal del Banco de España',
            'Cita previa; abres allí la cuenta directa',
            'Las mismas que la web',
            'Quien prefiere hacerlo en persona',
          ],
          [
            'Banco, sociedad o agencia de valores',
            'Una cuenta de valores en esa entidad',
            'Las de su folleto de tarifas (custodia, compra, venta)',
            'Quien ya invierte allí, no residentes o quien compra en el secundario',
          ],
        ],
      },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'En la web del Tesoro compras en la subasta, pagas el precio medio y no pagas comisión por comprar ni por la custodia. En un banco o bróker puedes comprar en subasta o en el secundario cualquier día, pero con sus comisiones. Compara siempre la rentabilidad después de comisiones.',
      },
      { k: 'h', t: '1. Paso a paso en la web del Tesoro' },
      {
        k: 'ul',
        items: [
          '1. Prepara tu identificación: DNI electrónico, certificado digital de la FNMT o Cl@ve. Instala AutoFirma para firmar las operaciones.',
          '2. Entra en tesoro.es → «Compra y Venta de Valores» → «Acceso al Servicio». La primera vez das de alta tu cuenta directa en el Banco de España (individual o conjunta, hasta cuatro titulares) y la cuenta bancaria donde cobrarás. Esa cuenta tiene que tener los mismos titulares.',
          '3. Elige el valor y la subasta en el calendario. Para Letras, la petición online se cierra unos 7 días naturales antes de la subasta; para Bonos y Obligaciones, unos 2 días antes. Mira las fechas exactas en el calendario oficial.',
          '4. Indica el nominal (mínimo 1.000 € y múltiplos de 1.000 €) y el tipo de petición. Lo normal para un particular es la no competitiva: no fijas precio y te adjudican al precio medio ponderado.',
          '5. Firma la petición y haz la transferencia del depósito previo desde tu banco. El dinero tiene que estar en el Banco de España al menos dos días hábiles antes de la subasta; si llega tarde, la petición se anula y te devuelven el dinero sin coste.',
          '6. Tras la subasta, consulta el resultado en «Posición Integral». Si pagaste de más, te devuelven la diferencia en pocos días. Las Letras se ponen en circulación a tu nombre unos días después.',
          '7. Al vencimiento, el Banco de España te ingresa el nominal en tu cuenta bancaria. Si quieres reinvertir, programa la reinversión antes: el plazo cierra siete días antes de la subasta.',
        ],
      },
      {
        k: 'warn',
        title: 'Errores típicos',
        t: 'Pedir importes que no son múltiplos de 1.000 €, transferir el dinero demasiado tarde, olvidar la reinversión o pedir una cuenta de cobro que no está a tu nombre. Revisa también que la página es la oficial (tesoro.es o tesoropublico.gob.es): nadie del Tesoro te llamará para venderte deuda.',
      },
      { k: 'h', t: '2. Competitiva o no competitiva' },
      {
        k: 'ul',
        items: [
          'No competitiva: no indicas precio ni tipo y te adjudican al precio medio ponderado. Se acepta entera si la subasta adjudica algo y el tipo medio no es negativo. Hasta 5 millones de euros por persona y valor.',
          'Competitiva: indicas el tipo (Letras) o el precio (Bonos y Obligaciones) que aceptas. Si pides un tipo más alto que el que acepta el Tesoro, te quedas fuera. Es lo que hacen los bancos y los inversores profesionales.',
        ],
      },
      { k: 'h', t: '3. En un banco, bróker o en el mercado secundario' },
      {
        k: 'p',
        t: 'Las entidades pueden presentar tu petición en la subasta o comprarte deuda ya emitida en el mercado secundario. La deuda del Estado se negocia en el Mercado de Deuda Pública en Anotaciones, que supervisa el Banco de España, y se admite a negociación en AIAF Mercado de Renta Fija; los particulares suelen operar a través de su entidad o de la plataforma de BME para minoristas (SEND). En el secundario el precio es el de ese día y, si es un Bono u Obligación, pagas además el cupón corrido.',
      },
      {
        k: 'table',
        head: ['', 'Suscribir en subasta', 'Comprar en el secundario'],
        rows: [
          ['Cuándo', 'Solo en las fechas del calendario', 'Cualquier día hábil'],
          [
            'Precio',
            'El de la subasta (medio, si es no competitiva)',
            'El del mercado ese día, más el cupón corrido',
          ],
          [
            'Qué puedes elegir',
            'Las referencias que se subastan ese mes',
            'Cualquier referencia en circulación y su plazo exacto',
          ],
          [
            'Costes',
            'Sin comisión de compra en el Tesoro; en un banco, la suya',
            'Comisión de la entidad y diferencial de precio',
          ],
        ],
      },
      { k: 'h', t: '4. Vender antes, mantener o reinvertir' },
      {
        k: 'ul',
        items: [
          'Mantener hasta el vencimiento: cobras el nominal (y los cupones, si los hay). Es lo más sencillo y lo que da la rentabilidad que conocías al comprar.',
          'Vender antes: desde la web del Tesoro (menú de operaciones → vender) o desde tu entidad. Se vende al precio de mercado de ese día, con comisión de venta. Consulta la tarifa vigente antes de hacerlo.',
          'Reinvertir: al vencer, puedes pedir que el nominal se use en la siguiente subasta del mismo tipo, total o parcialmente, en múltiplos de 1.000 €.',
          'Traspasar: puedes mover tus valores de la cuenta directa a otra entidad o al revés; revisa las comisiones de cada una.',
        ],
      },
      {
        k: 'tip',
        title: 'Antes de pedir, comprueba',
        t: '1) La fecha límite de petición y de pago en el calendario del Tesoro. 2) Que no necesitarás ese dinero antes del vencimiento. 3) El tipo de las últimas subastas en tesoro.es, para saber qué esperar. 4) Las comisiones de tu canal. Información educativa, no asesoramiento.',
      },
    ],
    glossary: [
      {
        term: 'Cuenta directa',
        def: 'Cuenta de valores a tu nombre en el Banco de España donde quedan anotadas las Letras, Bonos y Obligaciones que compras sin intermediario.',
      },
      {
        term: 'Petición no competitiva',
        def: 'Petición en subasta sin precio; se adjudica al precio medio ponderado de las peticiones aceptadas.',
      },
      {
        term: 'Petición competitiva',
        def: 'Petición en subasta que fija el tipo o el precio máximo que aceptas; puede quedarse fuera.',
      },
      {
        term: 'Mercado primario',
        def: 'Donde el emisor vende los valores por primera vez, aquí en las subastas del Tesoro.',
      },
      {
        term: 'Mercado secundario',
        def: 'Donde se compran y venden valores ya emitidos entre inversores, a precio de mercado.',
      },
      {
        term: 'Depósito previo',
        def: 'Dinero que ingresas antes de la subasta para que tu petición sea válida; luego se ajusta al precio final.',
      },
    ],
  },
  {
    id: 'deuda-publica-renta',
    emoji: '📑',
    color: '#475569',
    title: 'Deuda pública y Renta: cómo tributa y cómo se declara',
    titleEn: 'Government debt and your tax return: how it is taxed and declared',
    summary:
      'Letras, cupones y ventas: qué es rendimiento del capital mobiliario, qué lleva retención, en qué casillas va y cómo se compensan las pérdidas.',
    summaryEn:
      'Bills, coupons and sales: what counts as investment income, what has withholding, which boxes they go in and how losses offset.',
    level: 2,
    topic: 'bonds',
    blocks: [
      {
        k: 'p',
        t: 'Todo lo que ganas con deuda pública (Letras, cupones y lo que obtienes al vender o al vencer un Bono u Obligación) es rendimiento del capital mobiliario y tributa en la base imponible del ahorro (artículos 25.2 y 46 de la Ley del IRPF). No es una ganancia patrimonial como la venta de acciones o de fondos, y eso cambia las casillas y cómo se compensan las pérdidas.',
      },
      {
        k: 'table',
        head: ['Qué cobras', 'Cómo tributa', 'Retención', 'Casilla en la Renta 2025'],
        rows: [
          [
            'Letra que vence o vendes',
            'Rendimiento: lo que cobras menos lo que pagaste (menos comisiones justificadas)',
            'No (art. 75.3 b del Reglamento del IRPF)',
            '0030',
          ],
          [
            'Cupón de un Bono u Obligación',
            'Rendimiento: el cupón bruto del año en que lo cobras',
            'Sí, 19 %',
            '0027 (retención en el apartado de retenciones del capital mobiliario)',
          ],
          [
            'Venta o amortización de un Bono u Obligación',
            'Rendimiento: valor de venta o amortización menos valor de compra, con gastos',
            'No, en general (art. 75.3 e del Reglamento)',
            '0031',
          ],
        ],
      },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'Las Letras no llevan retención: el Tesoro te devuelve el nominal entero y el impuesto lo pagas al hacer la Renta del año en que vence o la vendes. Los cupones sí llevan una retención del 19 %, que es un pago a cuenta y descuentas en la Renta.',
      },
      { k: 'h', t: '1. Cuánto se paga: la escala del ahorro' },
      {
        k: 'p',
        t: 'Estos rendimientos se suman a tus intereses, dividendos y ganancias del año en la base del ahorro, que en la Renta 2025 tributa así (Estado más comunidad autónoma): 19 % hasta 6.000 €, 21 % de 6.000 a 50.000 €, 23 % de 50.000 a 200.000 €, 27 % de 200.000 a 300.000 € y 30 % a partir de 300.000 €. Navarra y el País Vasco tienen normas propias.',
      },
      { k: 'calc', id: 'tax' },
      {
        k: 'ex',
        title: 'Ejemplo: una Letra a 12 meses',
        t: 'Compras 10.000 € de nominal por 9.705,60 € y al vencimiento, en 2026, el Banco de España te transfiere 10.000 € menos una comisión de 15 € (1,5 por mil). Rendimiento: 10.000 − 15 − 9.705,60 = 279,40 €, que va en la casilla 0030 de la Renta 2026. Si no tienes otras rentas del ahorro, pagas el 19 %: unos 53,09 €.',
      },
      { k: 'h', t: '2. En qué año se declara' },
      {
        k: 'ul',
        items: [
          'Letras: en el año en que vencen o las vendes, no en el que las compras. Una Letra a 12 meses comprada en noviembre de 2026 que vence en noviembre de 2027 va en la Renta 2027.',
          'Cupones: en el año en que se cobran.',
          'Bonos y Obligaciones vendidos o amortizados: en el año de la venta o del vencimiento.',
        ],
      },
      { k: 'h', t: '3. Cómo se refleja en los datos fiscales y en Renta WEB' },
      {
        k: 'ul',
        items: [
          'El Banco de España (si compraste en el Tesoro) y las entidades financieras informan a Hacienda, así que estos importes suelen aparecer en tus datos fiscales. Aun así, revísalos: comprueba el importe de compra, el de cobro y las comisiones.',
          'En Renta WEB, en «Rendimientos del capital mobiliario a integrar en la base imponible del ahorro», la casilla 0030 recoge las Letras, la 0031 las ventas y amortizaciones de otros activos financieros (Bonos y Obligaciones) y la 0027 los cupones.',
          'Las comisiones de compra y de cobro que puedas justificar se restan del rendimiento (art. 25.2 b de la Ley). Guarda los justificantes de la web del Tesoro o de tu banco.',
          'Si tu cuenta es conjunta, el rendimiento se reparte entre los titulares según su parte.',
        ],
      },
      { k: 'h', t: '4. Si vendes con pérdida: cómo se compensa' },
      {
        k: 'p',
        t: 'Si vendes un Bono o una Letra por menos de lo que te costó, tienes un rendimiento negativo del capital mobiliario. Se compensa primero con tus otros rendimientos del capital mobiliario del año (intereses, cupones, dividendos). Si aún queda saldo negativo, compensa hasta el 25 % del saldo positivo de ganancias patrimoniales (ventas de acciones o fondos) y lo que sobre se arrastra a los cuatro años siguientes (art. 49 de la Ley del IRPF).',
      },
      {
        k: 'warn',
        title: 'La regla de los dos meses también existe aquí',
        t: 'Si vendes con pérdida y compras valores homogéneos (la misma referencia) en los dos meses anteriores o posteriores, ese rendimiento negativo no se integra hasta que vendas los que te quedan (art. 25.2 b de la Ley del IRPF). Información orientativa: tu caso puede tener particularidades.',
      },
      {
        k: 'tip',
        title: 'Con Finanverso',
        t: 'Si importas tus operaciones en «Mis inversiones», la guía «Copiar a Renta WEB paso a paso» te dice qué importe va en cada casilla de rendimientos del capital mobiliario. Revisa siempre el resultado con tus datos fiscales.',
      },
    ],
    glossary: [
      {
        term: 'Rendimiento del capital mobiliario',
        def: 'Lo que obtienes por prestar tu dinero o por tus participaciones: intereses, cupones, Letras y dividendos.',
      },
      {
        term: 'Base imponible del ahorro',
        def: 'Parte de la Renta donde se suman intereses, dividendos y ganancias por ventas, con su propia escala del 19 % al 30 %.',
      },
      {
        term: 'Retención a cuenta',
        def: 'Parte del cobro que se ingresa a Hacienda por adelantado y se descuenta del impuesto final en la Renta.',
      },
      {
        term: 'Activos financieros homogéneos',
        def: 'Valores del mismo emisor con las mismas características; a efectos de la regla de los dos meses, la misma referencia.',
      },
      {
        term: 'Compensación de rentas',
        def: 'Restar las pérdidas de las ganancias o rendimientos del mismo año, con los límites de la ley.',
      },
    ],
  },
  {
    id: 'letras-depositos-monetarios',
    emoji: '🆚',
    color: '#0d9488',
    title: 'Letras, depósitos y fondos monetarios: diferencias para elegir',
    titleEn: 'Treasury bills, deposits and money market funds: the differences',
    summary:
      'Tres formas de rentabilizar el dinero a corto plazo. Quién te lo garantiza, cuándo puedes sacarlo, qué cuesta y cómo tributa cada una.',
    summaryEn:
      'Three ways to earn on short-term cash: who backs it, when you can take it out, what it costs and how each one is taxed.',
    level: 1,
    topic: 'bonds',
    blocks: [
      {
        k: 'p',
        t: 'Si tienes dinero que no vas a necesitar en unos meses, puedes dejarlo en una cuenta remunerada o en un depósito, comprar Letras del Tesoro o invertir en un fondo monetario. Las tres opciones buscan poco riesgo, pero no funcionan igual. Lo importante es comparar la rentabilidad después de comisiones e impuestos, y cuándo podrás disponer del dinero.',
      },
      {
        k: 'table',
        head: ['', 'Cuenta o depósito', 'Letras del Tesoro', 'Fondo monetario'],
        rows: [
          [
            'Quién responde',
            'El banco; el FGD cubre hasta 100.000 € por titular y entidad',
            'El Estado español',
            'Los activos del fondo (deuda a muy corto plazo); sin garantía',
          ],
          [
            'Rentabilidad',
            'La TAE pactada (en el depósito, fija hasta el vencimiento)',
            'La de la subasta, fija si mantienes hasta el vencimiento',
            'Variable, sigue a los tipos del BCE; menos comisiones',
          ],
          [
            'Disponer antes',
            'Cuenta: cuando quieras. Depósito: con penalización o sin opción',
            'Vendiendo en el secundario, al precio del día y con comisión',
            'Reembolso en 1-3 días hábiles',
          ],
          [
            'Mínimo',
            'El de la entidad',
            '1.000 € y múltiplos',
            'El del fondo (a veces 1 participación)',
          ],
          [
            'Impuestos',
            'Intereses: capital mobiliario, retención 19 %',
            'Capital mobiliario, sin retención',
            'Ganancia patrimonial al reembolsar; traspaso entre fondos sin tributar',
          ],
        ],
      },
      {
        k: 'key',
        title: 'Idea clave',
        t: 'Ninguna es mejor siempre. El depósito tiene la garantía del FGD; la Letra, la del Estado y sin retención; el fondo monetario, liquidez y la posibilidad de traspasar sin pagar impuestos. Compara con cifras del mismo día y tu plazo.',
      },
      { k: 'h', t: '1. Cómo comparar bien' },
      {
        k: 'ul',
        items: [
          'Usa la misma medida: los bancos dan la TAE (con capitalización y base 365) y el Tesoro el tipo de la Letra en base 360. La calculadora de abajo te da la TAE equivalente de la Letra.',
          'Resta comisiones: custodia o comisiones de tu banco o bróker en la Letra; comisión de gestión (TER) en el fondo.',
          'Piensa en el plazo: una Letra a 12 meses fija el tipo un año; una cuenta remunerada puede bajarlo cuando quiera el banco.',
          'Mira las fuentes: el tipo de las últimas subastas en tesoro.es, las condiciones del depósito en su documento de información, y los datos del fondo en su ficha (DFI) registrada en la CNMV.',
        ],
      },
      { k: 'calc', id: 'letra' },
      {
        k: 'ex',
        title: 'Ejemplo con cifras redondas',
        t: 'Con 10.000 € a un año: una Letra al 3,000 % (base 360) equivale a una TAE de algo más del 3,04 %; un depósito al 3 % TAE da 300 € de intereses brutos. Son cifras de ejemplo: compáralas con las ofertas reales del momento y recuerda que el depósito te retiene el 19 % al cobrar y la Letra no, aunque al final ambos tributan igual en la Renta.',
      },
      { k: 'h', t: '2. Cuándo puede encajar cada una' },
      {
        k: 'ul',
        items: [
          'Fondo de emergencia: lo habitual es una cuenta remunerada o un fondo monetario, porque necesitas el dinero sin esperar.',
          'Dinero con fecha (una entrada, un pago dentro de 6 o 12 meses): un depósito o una Letra con ese plazo te dan un tipo fijo hasta entonces.',
          'Parte segura de una cartera a largo plazo: la renta fija a corto plazo amortigua las caídas de la bolsa, pero a largo plazo rinde menos que la renta variable.',
        ],
      },
      {
        k: 'warn',
        title: 'Información educativa, no asesoramiento',
        t: 'No te recomendamos un producto concreto. Antes de decidir, piensa en tu plazo, en tu colchón de seguridad y en la garantía de cada opción. Las rentabilidades de ejemplo no son ofertas reales.',
      },
    ],
    glossary: [
      {
        term: 'Fondo de Garantía de Depósitos',
        def: 'Garantiza los depósitos de dinero hasta 100.000 € por titular y entidad si el banco quiebra; no cubre deuda pública ni fondos.',
      },
      {
        term: 'TAE',
        def: 'Tasa anual equivalente: rentabilidad anual con capitalización y comisiones, para comparar productos.',
      },
      {
        term: 'Fondo monetario',
        def: 'Fondo de inversión que invierte en deuda a muy corto plazo y depósitos; busca estabilidad y liquidez.',
      },
      {
        term: 'Cuenta remunerada',
        def: 'Cuenta bancaria que paga intereses y permite sacar el dinero cuando quieras; el tipo puede cambiar.',
      },
      {
        term: 'Traspaso de fondos',
        def: 'Mover el dinero de un fondo a otro sin tributar hasta el reembolso final (art. 94 de la Ley del IRPF).',
      },
    ],
  },
];
