import type { RentaProperty } from '../../domain/rentaExtras';

const M =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025';
const C4 = `${M}/c04-rendimientos-capital-inmobiliario`;
const C10 = `${M}/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias`;
const C11 = `${M}/c11-ganancias-perdidas-patrimoniales`;
const C16 = `${M}/c16-deducciones-generales-cuota`;

/** Inmuebles en la Renta 2025 (campaña 2026). Fuente: Manual práctico de Renta 2025 de la AEAT, contrastado con la Ley 35/2006 consolidada (BOE). */
export const rentaProperty: RentaProperty = {
  imputation: {
    standardRate: 2,
    revisedRate: 1.1,
    summary:
      'Un inmueble que no es tu vivienda habitual, ni está alquilado ni afecto a una actividad, imputa una renta: el 2 % de su valor catastral (1,1 % en ciertos casos). No se resta ningún gasto.',
    requirements:
      'Valor catastral del IBI 2025, por días a tu disposición. 1,1 % si el valor se revisó con efectos desde 2012, o si no tiene valor notificado (sobre el 50 % del mayor entre precio y valor comprobado). No imputan: vivienda habitual con hasta 2 garajes, suelo sin edificar, obras.',
    url: `${C10}/determinacion-importe-renta-imputable.html`,
  },
  rental: {
    amortizationRate: 3,
    amortizationNote:
      'Amortización máxima anual: el 3 % del mayor de estos dos valores, sin contar el suelo: (a) lo que pagaste por el inmueble, con notaría, registro, impuestos y mejoras (en herencias y donaciones, el valor que figura en el Impuesto de Sucesiones o Donaciones más sus gastos), o (b) el valor catastral. Si no sabes cuánto vale el suelo, se calcula repartiendo el coste según el peso del suelo en el recibo del IBI. La amortización total acumulada no puede superar el valor de adquisición sin suelo. Los muebles cedidos con la vivienda se amortizan aparte (hasta un 10 % al año según la tabla simplificada). Si el inmueble solo estuvo alquilado parte del año, se deduce la parte proporcional de los días.',
    expenses: [
      {
        id: 'intereses-financiacion',
        title: 'Intereses y gastos de financiación',
        summary:
          'Intereses del préstamo para comprar o mejorar el inmueble y demás gastos de financiación. Incluye la prima del seguro de vida si el banco exigió contratarlo para dar el préstamo.',
        limitNote:
          'Junto con reparación y conservación, hasta el importe de los ingresos del alquiler de ese inmueble. El exceso se puede deducir en los 4 años siguientes con el mismo límite. Solo cuentan los días en que estuvo alquilado.',
        url: `${C4}/gastos-deducibles/intereses-demas-gastos-financiacion-inmueble.html`,
      },
      {
        id: 'reparacion-conservacion',
        title: 'Reparación y conservación',
        summary:
          'Gastos para mantener el uso normal del inmueble (pintar, arreglar instalaciones) o sustituir elementos (calefacción, ascensor, puertas). Ampliar o mejorar no es gasto: se recupera con la amortización.',
        limitNote:
          'Comparte el límite con los intereses: entre ambos, hasta los ingresos del alquiler de ese inmueble, con arrastre del exceso 4 años. Si aún no hay alquiler en el año del gasto, se puede arrastrar 4 años.',
        url: `${C4}/gastos-deducibles/intereses-demas-gastos-financiacion-inmueble.html`,
      },
      {
        id: 'tributos-tasas',
        title: 'IBI, tasas y otros tributos',
        summary:
          'El IBI, la tasa de basuras, alumbrado y otros tributos y recargos que recaen sobre el inmueble o sobre sus rentas. No se deducen las sanciones.',
        limitNote: 'Sin límite propio. Solo la parte de los días en que estuvo alquilado.',
        url: `${C4}/gastos-deducibles/otros-gastos-necesarios-obtencion-rendimientos.html`,
      },
      {
        id: 'comunidad-servicios-personales',
        title: 'Comunidad y servicios de terceros',
        summary:
          'Cuotas de la comunidad de propietarios y lo que cobren terceros por servicios personales: administración, vigilancia, portería, jardinería.',
        limitNote: 'Sin límite propio. Solo los días de alquiler.',
        url: `${C4}/gastos-deducibles/otros-gastos-necesarios-obtencion-rendimientos.html`,
      },
      {
        id: 'seguros',
        title: 'Seguros del inmueble',
        summary:
          'Primas de seguros de responsabilidad civil, incendio, robo, rotura de cristales y otros parecidos sobre el inmueble alquilado.',
        limitNote: 'Sin límite propio. Solo los días de alquiler.',
        url: `${C4}/gastos-deducibles/otros-gastos-necesarios-obtencion-rendimientos.html`,
      },
      {
        id: 'suministros',
        title: 'Suministros (agua, luz, gas, internet)',
        summary:
          'Solo si los pagas y soportas tú como propietario. Si los paga el inquilino, no los deduces. Si se los repercutes, cuentan como ingreso tuyo y a la vez como gasto.',
        limitNote: 'Sin límite propio. Solo los días de alquiler.',
        url: `${C4}/gastos-deducibles/otros-gastos-necesarios-obtencion-rendimientos.html`,
      },
      {
        id: 'formalizacion-defensa',
        title: 'Formalizar el contrato y defensa jurídica',
        summary:
          'Gastos de formalizar el contrato de alquiler y de defender jurídicamente el inmueble o las rentas (por ejemplo, un desahucio).',
        limitNote: 'Sin límite propio.',
        url: `${C4}/gastos-deducibles/otros-gastos-necesarios-obtencion-rendimientos.html`,
      },
      {
        id: 'dudoso-cobro',
        title: 'Saldos de dudoso cobro',
        summary:
          'Rentas que has declarado como ingreso y probablemente no cobrarás. Si el inquilino está en concurso, o pasaron más de 6 meses desde el primer intento de cobro hasta fin de año, se deducen.',
        limitNote:
          'Solo si antes se incluyó la renta como ingreso. Si luego se cobra, se declara en el año del cobro.',
        url: `${C4}/gastos-deducibles/otros-gastos-necesarios-obtencion-rendimientos.html`,
      },
      {
        id: 'amortizacion',
        title: 'Amortización del inmueble y de los muebles',
        summary:
          'Desgaste del inmueble y de los bienes cedidos con él. Inmueble: hasta el 3 % anual del mayor entre el coste de adquisición y el valor catastral, sin suelo.',
        limitNote:
          'El acumulado total no puede pasar del valor de adquisición sin suelo. Muebles: tabla simplificada (hasta el 10 %). El Tribunal Supremo admite usar un porcentaje de entre el 1 % y el 3 %.',
        url: `${C4}/gastos-deducibles/cantidades-destinadas-amortizacion.html`,
      },
      {
        id: 'no-deducibles',
        title: 'Lo que no se deduce',
        summary:
          'Mejoras y ampliaciones (solo por amortización), pérdidas por siniestros, la indemnización que pagas al inquilino para que se vaya y los gastos de los días sin alquilar.',
        limitNote:
          'Un inmueble vacío a la espera de inquilino no genera gastos deducibles: imputa renta.',
        url: `${C4}/gastos-no-deducibles.html`,
      },
    ],
    reductions: [
      {
        id: 'general-50',
        percent: 50,
        title: 'Alquiler de vivienda: reducción general',
        summary:
          'Si alquilas una vivienda para que viva alguien, el 50 % del rendimiento neto positivo no tributa. Es la reducción de cualquier contrato de vivienda firmado desde el 26 de mayo de 2023 que no cumpla las de abajo.',
        requirements:
          'Vivienda para uso permanente del inquilino (no temporada ni turístico). Solo rendimiento positivo, declarado en tu autoliquidación antes de una comprobación de Hacienda. No vale si el contrato incumple el art. 17.6 de la Ley de Arrendamientos Urbanos.',
        url: `${C4}/reducciones-rendimiento-neto/arrendamiento-inmuebles-destinados-vivienda.html`,
      },
      {
        id: 'tensionada-bajada-90',
        percent: 90,
        title: 'Zona tensionada con bajada de renta',
        summary:
          'Un 90 % no tributa si firmas un nuevo contrato en zona tensionada y bajas la renta inicial más de un 5 % respecto al contrato anterior.',
        requirements:
          'Contrato desde el 26-5-2023, mismo arrendador, misma vivienda, en zona de mercado residencial tensionado. La renta inicial baja más de un 5 % respecto a la última del contrato anterior, tras la actualización anual. Se aplica mientras se cumpla.',
        url: `${C4}/reducciones-rendimiento-neto/arrendamiento-inmuebles-destinados-vivienda.html`,
      },
      {
        id: 'jovenes-70',
        percent: 70,
        title: 'Jóvenes de 18 a 35 años en zona tensionada',
        summary:
          'Un 70 % no tributa si alquilas por primera vez una vivienda en zona tensionada a una persona de 18 a 35 años. Con varios inquilinos, solo la parte de los que cumplen.',
        requirements:
          'Contrato desde el 26-5-2023. Primer alquiler de esa vivienda por ti, en zona tensionada, a persona física de 18 a 35 años. Solo si no aplica la del 90 %. Con varios inquilinos, solo la parte de los que cumplen.',
        url: `${C4}/reducciones-rendimiento-neto/arrendamiento-inmuebles-destinados-vivienda.html`,
      },
      {
        id: 'social-70',
        percent: 70,
        title: 'Alquiler a Administración o entidad sin ánimo de lucro',
        summary:
          'Un 70 % no tributa si alquilas a una Administración pública o a una entidad sin fines lucrativos que destina la vivienda a alquiler social, a personas vulnerables o a un programa público con renta limitada.',
        requirements:
          'Contrato desde el 26-5-2023. Inquilino: Administración o entidad del título II de la Ley 49/2002. Destino: alquiler social con renta inferior a la del plan estatal, personas vulnerables o vivienda con renta limitada por programa público.',
        url: `${C4}/reducciones-rendimiento-neto/arrendamiento-inmuebles-destinados-vivienda.html`,
      },
      {
        id: 'rehabilitacion-60',
        percent: 60,
        title: 'Vivienda rehabilitada hace poco',
        summary:
          'Un 60 % no tributa si la vivienda tuvo una rehabilitación terminada en los dos años anteriores a la firma del contrato (y no te vale ninguna de las anteriores).',
        requirements:
          'Contrato desde el 26 de mayo de 2023. Obra que cumple el concepto de rehabilitación del art. 41.1 del Reglamento del IRPF, terminada como máximo 2 años antes de firmar. Solo si no aplican las del 90 % ni las del 70 %.',
        url: `${C4}/reducciones-rendimiento-neto/arrendamiento-inmuebles-destinados-vivienda.html`,
      },
      {
        id: 'contratos-anteriores-60',
        percent: 60,
        title: 'Contratos de vivienda anteriores al 26 de mayo de 2023',
        summary:
          'Los contratos de vivienda firmados antes del 26 de mayo de 2023 mantienen la reducción del 60 % de la antigua ley.',
        requirements:
          'Contrato de vivienda firmado antes del 26 de mayo de 2023, con la regla vigente a 31-12-2021. Solo sobre rendimiento positivo calculado en tu autoliquidación antes de cualquier comprobación de Hacienda.',
        url: `${C4}/reducciones-rendimiento-neto/arrendamiento-inmuebles-destinados-vivienda/cuadro-reducciones-arrendamiento.html`,
      },
      {
        id: 'irregular-30',
        percent: 30,
        title: 'Rendimientos de más de 2 años o muy irregulares',
        summary:
          'Un 30 % adicional (después de la reducción de vivienda) en rendimientos generados en más de 2 años, o notoriamente irregulares, si se declaran en un solo año.',
        requirements:
          'Solo estos casos: traspaso o cesión de contrato de local de negocio, indemnizaciones del inquilino por daños, y derechos de uso vitalicios. Base máxima de 300.000 euros al año. Hay régimen transitorio para cobros fraccionados anteriores a 2015.',
        url: `${C4}/reducciones-rendimiento-neto/rendimientos-periodo-generacion-superior-dos-anos.html`,
      },
    ],
    notes:
      'Solo hay reducción si es alquiler de vivienda para uso permanente (art. 2 de la Ley de Arrendamientos Urbanos): el alquiler de temporada, por ejemplo de verano, no tiene ninguna de las reducciones, ni tampoco el de locales. El piso turístico o de temporada tributa como rendimiento del capital inmobiliario con los gastos de arriba, sin reducción, mientras solo cedas el uso del inmueble. Si prestas servicios de hostelería (limpieza, comidas, lavandería) o tienes un empleado a jornada completa para gestionarlo, pasa a actividad económica. Alquiler a un familiar hasta el 3.er grado (también por afinidad): el rendimiento no puede ser menor que la renta imputada (2 % o 1,1 % del valor catastral). Si alquilas parte del año, el resto imputa renta por días. Subarrendar es capital mobiliario. Rendimientos negativos no llevan reducción. Para 2025 se aplica solo la ley vigente a 31-12-2025.',
    url: `${C4}.html`,
  },
  notes: [
    {
      id: 'vivienda-habitual-deduccion',
      title: 'Vivienda habitual: deducción por compra (transitoria)',
      summary:
        'Se suprimió en 2013. Solo la mantienen quienes compraron antes de 2013 y ya la practicaban: 7,5 % estatal más el tramo de la comunidad (7,5 % en la mayoría), sobre hasta 9.040 euros al año.',
      requirements:
        'Compra (o pagos de construcción) antes del 1-1-2013 y deducción practicada antes, salvo que no hubo cuota o no había que declarar. Con residencia efectiva. No se traslada a otra vivienda. Obliga a presentar declaración.',
      url: `${C16}/deduccion-inversion-vivienda-habitual-regimen-transitorio/regimen-transitorio.html`,
    },
    {
      id: 'vivienda-habitual-concepto',
      title: 'Qué cuenta como vivienda habitual',
      summary:
        'Es la edificación donde resides al menos 3 años seguidos. Hay excepciones si debes mudarte antes (matrimonio, traslado, primer empleo, fallecimiento). Se debe ocupar en 12 meses desde la compra.',
      requirements:
        'Residencia efectiva y permanente. Pleno dominio durante esos 3 años. Un contribuyente solo puede tener una vivienda habitual. Para las exenciones de venta, vale haber vivido en ella hasta cualquier día de los 2 años anteriores a la venta.',
      url: `${C11}/ganancias-excluidas-gravamen-supuestos-reinversion/transmision-vivienda-habitual-reinversion-importe/requisitos-condiciones-aplicacion-exencion/concepto-vivienda-habitual.html`,
    },
    {
      id: 'alquiler-vivienda-habitual-transitorio',
      title: 'Alquiler de tu vivienda habitual (transitorio)',
      summary:
        'La deducción estatal por alquilar tu vivienda habitual se suprimió en 2015. Se mantiene con el 10,05 % de lo pagado para contratos firmados antes de 2015, si tu base imponible es inferior a 24.107,20 euros.',
      requirements:
        'Contrato firmado antes del 1-1-2015 que continúe (o su sustituto sobre la misma vivienda) y derecho anterior a 2015. Base máx. 9.040 euros (con base imponible hasta 17.707,20), bajando hasta 24.107,20. Tu comunidad puede tener otra deducción.',
      url: `${C16}/deduccion-alquiler-vivienda-habitual-regimen-transitorio.html`,
    },
    {
      id: 'eficiencia-energetica',
      title: 'Obras de eficiencia energética en viviendas',
      summary:
        'Deducción del 20 %, 40 % o 60 % según la obra, con certificado energético. Obras pagadas del 6-10-2021 al 31-12-2025 en tu vivienda habitual o alquilada (o a alquilar antes de 2028).',
      requirements:
        '20 %: bajar un 7 % la demanda (base máx. 5.000 euros). 40 %: bajar un 30 % la energía primaria o subir a A o B (7.500). 60 %: edificios (5.000 al año, 15.000 en total). Pago no en efectivo. Se descuentan ayudas. Certificado posterior a las obras antes de 2026.',
      url: `${C16}/deducciones-obras-mejora-eficiencia-energetica-viviendas/cuadro-resumen-deducciones-obras-eficiencia-viviendas.html`,
    },
    {
      id: 'obras-discapacidad',
      title: 'Obras de adecuación por discapacidad',
      summary:
        'Deducción transitoria por obras en la vivienda habitual para personas con discapacidad: 10 % estatal más el tramo autonómico (10 % en la mayoría; 15 % en Cataluña), sobre hasta 12.080 euros al año.',
      requirements:
        'Solo si pagaste antes del 1-1-2013 y las obras acabaron antes del 1-1-2017. Debe certificarlas el IMSERSO o el órgano de tu comunidad como necesarias para la accesibilidad. La persona con discapacidad es tú, tu cónyuge o un familiar hasta tercer grado que conviva contigo.',
      url: `${C16}/deduccion-inversion-vivienda-habitual-regimen-transitorio/modalidades-deduccion/obras-instalaciones-adecuacion-vivienda.html`,
    },
    {
      id: 'venta-inmueble',
      title: 'Venta de un inmueble: ganancia o pérdida',
      summary:
        'Lo que sacas al vender menos lo que te costó comprar (con gastos, impuestos y mejoras). Si es positivo, es ganancia patrimonial; si es negativo, pérdida. Va a la base del ahorro.',
      requirements:
        'Compra: precio más gastos, impuestos y mejoras (no reparaciones), menos la amortización si lo alquilaste (como mínimo, la que podías deducir, aunque no lo hicieras). Venta: precio real (no menor al de mercado) menos gastos e impuestos de la venta. Se declara en el año de la venta.',
      url: `${C11}/determinacion-importe-ganancias-perdidas-patrimon-generales/derivadas-transmisiones-onerosas-lucrativas/reglas-generales-calculo.html`,
    },
    {
      id: 'reinversion-vivienda-habitual',
      title: 'Exención por reinvertir en vivienda habitual',
      summary:
        'Si vendes tu vivienda habitual y reinviertes todo lo obtenido en otra vivienda habitual, la ganancia queda exenta. Si reinviertes solo una parte, se libra la parte proporcional.',
      requirements:
        'Reinvertir en 2 años (antes o después de la venta). Haber vivido 3 años en la vivienda vendida. Si había hipoteca, se resta el principal pendiente. Si reinviertes después, avísalo en la declaración del año de la venta.',
      url: `${C11}/ganancias-excluidas-gravamen-supuestos-reinversion/transmision-vivienda-habitual-reinversion-importe/exencion.html`,
    },
    {
      id: 'exencion-mayores-65',
      title: 'Venta de vivienda habitual por mayores de 65',
      summary:
        'La ganancia por vender tu vivienda habitual está exenta si tienes más de 65 años (o dependencia severa o gran dependencia), sin necesidad de reinvertir.',
      requirements:
        'La vivienda debe haber sido tu residencia habitual al menos 3 años seguidos y tener tú el pleno dominio durante ese tiempo. Cuenta si la vendes antes de 2 años desde que dejaste de vivir en ella. No vale con nuda propiedad o usufructo por separado.',
      url: `${C11}/ganancias-perdidas-patrimoniales-que-no-bi/ganancias-patrimoniales-exentas.html`,
    },
    {
      id: 'renta-vitalicia-mayores',
      title: 'Venta de cualquier inmueble y renta vitalicia',
      summary:
        'Si tienes más de 65 años y destinas lo cobrado por vender un bien (también un inmueble que no es vivienda habitual) a una renta vitalicia asegurada a tu favor, la ganancia queda exenta.',
      requirements:
        'Máximo 240.000 euros de reinversión en total. La renta vitalicia debe constituirse en 6 meses desde la venta. Se pierde la exención si anticipas los derechos económicos de la renta. Si lo haces en otro año, avísalo en la declaración del año de la venta.',
      url: `${C11}/ganancias-excluidas-gravamen-supuestos-reinversion/transmision-elementos-patrimoniales-contribuyentes-mayores/exencion.html`,
    },
    {
      id: 'dacion-en-pago',
      title: 'Dación en pago o ejecución hipotecaria',
      summary:
        'La ganancia queda exenta cuando entregas tu vivienda habitual al banco para cancelar la hipoteca, o te la ejecutan, si no tienes otros bienes para pagar la deuda.',
      requirements:
        'Vivienda habitual del deudor o de su garante. La entrega es por dación en pago o ejecución hipotecaria, judicial o notarial. La deuda hipotecaria es con una entidad de crédito o prestamista profesional. No debes tener otros bienes o derechos suficientes para pagar la deuda.',
      url: `${C11}/ganancias-perdidas-patrimoniales-que-no-bi/ganancias-patrimoniales-exentas.html`,
    },
    {
      id: 'coeficientes-abatimiento',
      title: 'Inmuebles comprados antes de 1995 (abatimiento)',
      summary:
        'Si compraste antes del 31-12-1994, parte de la ganancia generada hasta el 20-1-2006 se reduce con porcentajes de abatimiento. Hoy solo aplica si lo vendido con este beneficio desde 2015 no supera 400.000 euros.',
      requirements:
        'Comprado antes del 31-12-1994, no afecto a actividad. Lo vendido con este derecho desde 2015 no supera 400.000 euros. Se reduce solo la ganancia generada antes del 20-1-2006. Los coeficientes de actualización ya no se aplican.',
      url: `${C11}/determinacion-importe-ganancias-perdidas-patrimon-generales/derivadas-transmisiones-onerosas-lucrativas/regimen-transitorio-aplicable-ganancias-patrimoniales.html`,
    },
    {
      id: 'inmuebles-2012-50',
      title: 'Inmuebles urbanos comprados en 2012',
      summary:
        'La ganancia por vender un inmueble urbano comprado a título oneroso entre el 12-5-2012 y el 31-12-2012 está exenta en un 50 %.',
      requirements:
        'Que el inmueble sea urbano y se comprara de forma onerosa en esas fechas. No vale si lo compraste o vendes a tu cónyuge, a un familiar hasta segundo grado, o a una sociedad vinculada. Se puede combinar con la exención por reinversión de la vivienda habitual.',
      url: `${C11}/ganancias-perdidas-patrimoniales-que-no-bi/ganancias-patrimoniales-exentas.html`,
    },
    {
      id: 'herencias-donaciones',
      title: 'Herencias y donaciones de inmuebles',
      summary:
        'Heredar o recibir una donación no se declara en el IRPF: tributa en el Impuesto de Sucesiones y Donaciones de tu comunidad. En el IRPF importa después, al vender o alquilar, y para el donante.',
      requirements:
        'Heredar no tributa en IRPF y el causante no genera ganancia. Valor de compra: el del Impuesto de Sucesiones (desde 2022, valor de referencia), sin pasar del de mercado. El donante tributa si hay ganancia, pero no deduce pérdida. Pacto sucesorio: si vendes en 5 años, heredas su valor.',
      url: `${C11}/concepto/delimitacion-negativa/transmisiones-lucrativas-causa-muerte-contribuyente.html`,
    },
    {
      id: 'hipoteca-gastos',
      title: 'Hipoteca y gastos de la vivienda habitual',
      summary:
        'Desde 2013 no se deducen los intereses ni la cuota de la hipoteca de tu vivienda habitual, salvo en el régimen transitorio. Sí se deducen los intereses si el inmueble está alquilado.',
      requirements:
        'En vivienda habitual no se deducen intereses, cuotas ni seguro (salvo régimen transitorio anterior a 2013). Si alquilas, los intereses y gastos de financiación cuentan con el límite de los ingresos.',
      url: `${C4}/gastos-deducibles/intereses-demas-gastos-financiacion-inmueble.html`,
    },
    {
      id: 'ibi-comunidad-habitual',
      title: 'IBI y comunidad de tu vivienda habitual',
      summary:
        'El IBI, la comunidad, los seguros y los suministros de tu propia vivienda habitual no se deducen en el IRPF: solo se deducen como gasto en inmuebles que produzcan rendimientos (alquiler).',
      requirements:
        'Solo se deducen gastos de inmuebles alquilados y solo por los días alquilados. Un inmueble vacío o a tu disposición no deduce gastos: imputa renta. Para tu vivienda habitual no hay imputación de renta ni gastos deducibles.',
      url: `${C4}/gastos-deducibles/otros-gastos-necesarios-obtencion-rendimientos.html`,
    },
    {
      id: 'vehiculo-recarga',
      title: 'Coche eléctrico y punto de recarga',
      summary:
        'Deducción del 15 % por comprar un coche eléctrico nuevo (base máx. 20.000 euros) y del 15 % por instalar un punto de recarga (base máx. 4.000 euros). Solo para compras e instalaciones del 30-6-2023 al 31-12-2025.',
      requirements:
        'Coche nuevo, enchufable o de pila, matriculado antes de 2026, con precio dentro del límite MOVES III. Recarga: en inmueble tuyo, terminada antes del 31-12-2025. Pago no en efectivo. Se descuentan ayudas.',
      url: `${C16}/deducciones-adquisicion-vehiculos-electricos-puntos-recarga/cuadro-resumen-deducciones-adquisicion-vehiculos-recarga.html`,
    },
  ],
  source:
    'Manual práctico de Renta 2025 de la Agencia Tributaria (capítulos 4, 10, 11 y 16), contrastado con la Ley 35/2006 del IRPF consolidada en el BOE (arts. 22, 23, 85, 68 y 33-38) y la Ley 12/2023 por el derecho a la vivienda.',
};
