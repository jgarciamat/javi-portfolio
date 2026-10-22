import type { Guide } from './guides';

/** Day the official sources of these guides were last checked (shown as «consultado el…»). */
export const TRAMITES_CHECKED = '2026-10-18';

const AEAT = 'https://sede.agenciatributaria.gob.es';
const BOE = 'https://www.boe.es/buscar/act.php?id=';

/**
 * Guides for the procedures people search for: the Renta, the self-employed start-up and its
 * taxes, and public aids. Every figure and date comes from the official page listed in `sources`
 * (checked on `TRAMITES_CHECKED`); where the rule changes often the text sends to the official page
 * instead of repeating a number that may be out of date.
 */
export const GUIDES_TRAMITES: Guide[] = [
  {
    slug: 'como-hacer-la-renta-2025-paso-a-paso',
    updated: '2026-10-18',
    title: 'Cómo hacer la Renta 2025 paso a paso (campaña 2026)',
    description:
      'Cómo presentar la Renta 2025: quién debe hacerla, cómo identificarte, revisar el borrador en Renta WEB, presentar y guardar el justificante.',
    intro:
      'La declaración de la Renta se hace en la web de la Agencia Tributaria y, si solo tienes sueldo y pocas deducciones, suele llevar unos minutos. Estos son los pasos de la campaña de la Renta 2025, la que se presentó entre abril y junio de 2026.',
    howTo: true,
    sections: [
      {
        heading: '1. Comprueba si estás obligado a declarar',
        paragraphs: [
          'La regla general es que debes declarar si cobraste más de 22.000 € brutos al año de un único pagador. El límite baja a 15.876 € cuando hay más de un pagador y lo que cobras del segundo y de los siguientes supera 1.500 € en total, entre otros casos.',
          'También están obligados quienes estuvieron dados de alta como autónomos en algún momento del año y los titulares del Ingreso Mínimo Vital (y las personas de su hogar). Si no estás obligado, puede interesarte declarar igualmente para recuperar retenciones o aplicar deducciones. La AEAT tiene un asistente para saber si te toca.',
        ],
      },
      {
        heading: '2. Prepara cómo vas a identificarte',
        paragraphs: [
          'Para ver y presentar tu borrador necesitas Cl@ve, certificado digital o el número de referencia que pide la AEAT. Si no tienes ninguno, solicítalo con tiempo: la carta de invitación de Cl@ve llega por correo y tarda unos días. Tienes el paso a paso en [Antes de empezar: cómo identificarte en Hacienda](/hacienda-paso-a-paso/antes-de-empezar).',
        ],
      },
      {
        heading: '3. Entra en Renta WEB y revisa el borrador',
        paragraphs: [
          'En la sede de la AEAT entra en Renta WEB y abre el borrador. Comprueba con calma los datos personales y familiares, los ingresos del trabajo, los inmuebles y los datos de tu banco. Los errores más habituales están en los hijos, en el reparto de la vivienda y en los ingresos que no aparecen.',
          'Si prefieres entender cada apartado antes de confirmar, sigue la guía [La Renta en Renta WEB, paso a paso](/hacienda-paso-a-paso/renta-web) o la de [cómo leer tu borrador](/guias/como-leer-borrador-renta).',
        ],
      },
      {
        heading: '4. Añade lo que falta: deducciones y datos',
        paragraphs: [
          'El borrador no siempre incluye todo lo que te corresponde. Revisa las deducciones por hijos, familia numerosa, maternidad, alquiler y las de tu comunidad autónoma. Con la [calculadora de la Renta](/calculadora-renta) puedes estimar cuánto cambia el resultado antes de tocar nada en la web oficial.',
          'Guías útiles: [deducción por maternidad](/guias/deduccion-maternidad-modelo-140), [familia numerosa](/guias/familia-numerosa-deduccion-modelo-143) y [deducciones autonómicas](/guias/deducciones-renta-comunitat-valenciana).',
        ],
      },
      {
        heading: '5. Decide entre declaración individual o conjunta',
        paragraphs: [
          'Si tienes pareja o hijos a tu cargo, compara las dos opciones: según los ingresos de cada uno, una de ellas puede salir bastante mejor. Hacienda no elige por ti, y puedes cambiar de opción hasta que termina el plazo de presentación.',
        ],
      },
      {
        heading: '6. Presenta y paga o cobra',
        paragraphs: [
          'Antes de presentar, mira el resultado: a ingresar, a devolver o sin resultado. Si sale a pagar, puedes domiciliar el pago o dividirlo en dos plazos; los detalles y las fechas están en la guía de [plazos de la Renta 2025](/guias/plazos-renta-2025). Si sale a devolver, indica la cuenta donde quieres recibirla.',
        ],
      },
      {
        heading: '7. Guarda el justificante y corrige si hace falta',
        paragraphs: [
          'Al presentar obtienes un justificante con un código seguro de verificación: descárgalo y guárdalo. Si descubres un error después, no presentes otra declaración igual: se corrige con una declaración rectificativa desde la propia sede.',
          'La campaña siguiente suele empezar a principios de abril. La AEAT publica las fechas exactas antes, así que compruébalas en su calendario.',
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'plazos-renta-2025',
      'como-leer-borrador-renta',
      'renta-a-pagar-o-a-devolver',
      'deducciones-renta-comunitat-valenciana',
    ],
    checked: TRAMITES_CHECKED,
    sources: [
      { label: 'AEAT: Renta', url: `${AEAT}/Sede/Renta.html` },
      {
        label: 'AEAT: quién está obligado a declarar en el IRPF',
        url: `${AEAT}/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c01-campana-declaracion-renta/quienes-estan-obligados-presentar-declaracion-irpf/delimitacion-obligacion-declarar-irpf.html`,
      },
      {
        label: 'AEAT: calendario de la campaña de Renta',
        url: `${AEAT}/Sede/irpf/campana-renta/calendario-campana-renta.html`,
      },
    ],
  },
  {
    slug: 'plazos-renta-2025',
    updated: '2026-10-18',
    title: 'Plazos de la Renta 2025: fechas de la campaña 2026',
    description:
      'Fechas de la campaña de la Renta 2025: del 8 de abril al 30 de junio, domiciliación, segundo plazo del 5 de noviembre y recargos si te pasas.',
    intro:
      'Estas son las fechas de la campaña de la Renta 2025, que se presentó en 2026, y lo que ocurre si llegas tarde. La campaña ordinaria ya terminó; todavía te puede interesar el segundo plazo del pago o presentar fuera de plazo.',
    sections: [
      {
        heading: 'Fechas de la campaña',
        paragraphs: [
          'La presentación por internet empezó el 8 de abril de 2026 y el plazo general terminó el 30 de junio de 2026, tanto para declaraciones a ingresar como a devolver.',
          'La ayuda por teléfono con cita previa empezó el 6 de mayo y la atención en oficinas el 1 de junio. La cita es obligatoria en los dos casos y se pide en la sede de la AEAT.',
        ],
      },
      {
        heading: 'Si te sale a pagar',
        paragraphs: [
          'Si domicilias el pago, el plazo para presentar terminó antes: el 25 de junio de 2026, y el cargo se hizo el 30 de junio. Sin domiciliar, hasta el 30 de junio podías pagar con tarjeta, cargo en cuenta o en un banco colaborador con el documento de ingreso.',
          'También puedes dividir el pago en dos: el 60 % al presentar y el 40 % restante hasta el 5 de noviembre de 2026. Si lo elegiste, esa es la fecha que te queda por delante. Si el segundo plazo se te pasa, se aplican recargos.',
        ],
      },
      {
        heading: 'Si te sale a devolver',
        paragraphs: [
          'Cuanto antes presentes, antes puedes cobrar. La Agencia dispone de seis meses desde que termina el plazo de presentación para devolverte el importe; pasado ese tiempo, tienes derecho a intereses de demora. Puedes consultar el estado en la sede con tu identificación.',
          'En el [vídeo sobre dónde está tu devolución](/videoteca) te explicamos cómo comprobarlo.',
        ],
      },
      {
        heading: 'Qué pasa si presentas fuera de plazo',
        paragraphs: [
          'Si presentas sin que Hacienda te haya requerido antes y sale a ingresar, se añade un recargo del 1 % más un 1 % por cada mes completo de retraso. Pasados 12 meses, el recargo es del 15 % y se suman intereses de demora. Es mejor presentar tarde que no presentar.',
          'Si sale a devolver o sin resultado y presentas fuera de plazo, normalmente no hay recargo, pero tardarás más en cobrar. La guía oficial de recargos de la AEAT tiene todos los casos.',
        ],
      },
      {
        heading: 'Y la Renta de 2026 (campaña 2027)',
        paragraphs: [
          'Las fechas de la próxima campaña aún no están publicadas en la sede. Lo habitual es que empiece a principios de abril y termine a finales de junio, pero hasta que la AEAT las confirme no son oficiales. Cuando lo haga, actualizaremos esta guía.',
          'Mientras tanto, puedes ir preparándola con la [calculadora de la Renta](/calculadora-renta) y la guía de [cómo hacer la Renta paso a paso](/guias/como-hacer-la-renta-2025-paso-a-paso).',
        ],
      },
    ],
    tool: { to: '/calculadora-renta', label: 'Calculadora de la Renta' },
    related: [
      'como-hacer-la-renta-2025-paso-a-paso',
      'renta-a-pagar-o-a-devolver',
      'como-leer-borrador-renta',
    ],
    checked: TRAMITES_CHECKED,
    sources: [
      { label: 'AEAT: Renta', url: `${AEAT}/Sede/Renta.html` },
      {
        label: 'AEAT: calendario de la campaña de Renta',
        url: `${AEAT}/Sede/irpf/campana-renta/calendario-campana-renta.html`,
      },
      {
        label: 'AEAT: recargos aplicables',
        url: `${AEAT}/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion/regularizacion-situaciones-tributarias/recargos-aplicables.html`,
      },
      { label: 'BOE: Ley General Tributaria (artículo 27)', url: `${BOE}BOE-A-2003-23186` },
    ],
  },
  {
    slug: 'modelo-303-casillas',
    updated: '2026-10-18',
    title: 'Modelo 303: casillas explicadas una a una (IVA trimestral)',
    description:
      'Qué va en cada casilla del modelo 303: IVA devengado, IVA deducible, total a deducir y resultado, con un ejemplo con números y los errores más comunes.',
    intro:
      'El modelo 303 parece complicado, pero un autónomo con una actividad sencilla solo rellena unas pocas casillas: el IVA que ha cobrado a sus clientes, el IVA que ha pagado en sus gastos y la diferencia.',
    sections: [
      {
        heading: 'IVA devengado: lo que has cobrado a tus clientes',
        paragraphs: [
          'Aquí van tus facturas emitidas en el trimestre, separadas por tipo de IVA. Cada tipo ocupa tres casillas: base imponible, tipo y cuota.',
          'Las casillas 07, 08 y 09 son para lo facturado al 21 %; las 04, 05 y 06 para el 10 %; y las 01, 02 y 03 para el 4 %. La casilla 27 suma toda la cuota devengada.',
        ],
      },
      {
        heading: 'IVA deducible: lo que has pagado en tus gastos',
        paragraphs: [
          'Las casillas 28 y 29 recogen la base y el IVA de los gastos corrientes de tu actividad: servicios, material, suministros afectos. Las casillas 30 y 31 son para los bienes de inversión, como un ordenador o una máquina que uses varios años.',
          'La casilla 45 es el total a deducir. Solo cuentan las facturas completas, a tu nombre o al de tu actividad, y de gastos realmente relacionados con ella. Revisa los gastos de uso mixto, como el móvil o el coche, porque la deducción puede ser parcial.',
        ],
      },
      {
        heading: 'Resultado: cuánto pagas o cuánto compensas',
        paragraphs: [
          'La casilla 46 es la diferencia entre el IVA devengado y el deducible (27 menos 45). Si es positiva, pagas esa cantidad; si es negativa, tienes IVA a compensar en los trimestres siguientes. Las cuotas pendientes de periodos anteriores van en las casillas 110 y 78, y el resultado final de la liquidación sale en la casilla 71.',
          'Las operaciones con clientes de otros países o con exenciones van en otras casillas (por ejemplo, 59, 60 o 120). Si es tu caso, consulta las instrucciones oficiales o a un profesional.',
        ],
      },
      {
        heading: 'Un ejemplo con números',
        paragraphs: [
          'Imagina un trimestre en el que facturas 3.000 € sin IVA al 21 %. Las casillas 07, 08 y 09 llevan 3.000 €, 21 % y 630 €, y la 27 también 630 €.',
          'Ese mismo trimestre tienes gastos corrientes por 1.000 € de base con 210 € de IVA. Las casillas 28 y 29 llevan 1.000 € y 210 €, y la 45 son 210 €. El resultado de la casilla 46 es 630 − 210 = 420 €: es lo que ingresas.',
        ],
      },
      {
        heading: 'Errores habituales',
        paragraphs: [
          'Los más frecuentes son deducir IVA de facturas simplificadas sin datos suficientes, mezclar el trimestre de una factura con otro, olvidar facturas emitidas y deducir el 100 % de gastos de uso mixto.',
          'Si ya presentaste el modelo con un error, no presentes otro igual: se corrige con una autoliquidación rectificativa. Todo el proceso en la sede lo tienes en [Modelo 303 paso a paso](/hacienda-paso-a-paso/modelo-303), y la teoría del impuesto en [IVA para autónomos](/guias/iva-para-autonomos-modelo-303).',
        ],
      },
      {
        heading: 'Cuándo se presenta',
        paragraphs: [
          'El modelo 303 es trimestral. Las fechas de cada trimestre están en el [calendario fiscal de autónomos](/guias/fechas-modelos-trimestrales-autonomos-2026). Con la [calculadora de IVA](/calculadora-iva) puedes separar la base y el IVA de una factura, y el borrador de autónomos de Finanverso calcula estas casillas con tus ingresos y gastos.',
        ],
      },
    ],
    tool: { to: '/calculadora-iva', label: 'Calculadora de IVA' },
    related: [
      'iva-para-autonomos-modelo-303',
      'modelo-130-paso-a-paso',
      'fechas-modelos-trimestrales-autonomos-2026',
      'corregir-modelo-130-303',
    ],
    checked: TRAMITES_CHECKED,
    sources: [
      {
        label: 'AEAT: presentar el modelo 303',
        url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml',
      },
      {
        label: 'AEAT: instrucciones del modelo 303',
        url: 'https://www3.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G414/Inst_mod_303_2025.pdf',
      },
    ],
  },
  {
    slug: 'alta-autonomo-paso-a-paso',
    updated: '2026-10-18',
    title: 'Alta de autónomo paso a paso: Hacienda y Seguridad Social',
    description:
      'Cómo darte de alta como autónomo: alta censal en Hacienda (modelo 036), alta en el RETA, base de cotización, tarifa plana y primeras obligaciones.',
    intro:
      'Darse de alta como autónomo son dos trámites: uno en Hacienda y otro en la Seguridad Social. Aquí tienes el orden, qué decidir en cada uno y qué te toca hacer después.',
    howTo: true,
    sections: [
      {
        heading: '1. Decide tu actividad y cuándo empiezas',
        paragraphs: [
          'Antes de nada, define qué vas a hacer y bajo qué epígrafe del IAE encaja tu actividad. El alta en Hacienda debe hacerse antes de empezar la actividad, y también cuenta como inicio comprar bienes o servicios con intención de dedicarlos a ella.',
        ],
      },
      {
        heading: '2. Alta censal en Hacienda (modelo 036)',
        paragraphs: [
          'Se hace en la sede de la Agencia Tributaria con el modelo 036, con certificado digital o Cl@ve. Ahí indicas tu actividad, el régimen de IVA y de IRPF que te corresponde y si vas a emitir facturas con retención.',
          'Si ofreces servicios profesionales, puedes tener una retención reducida los primeros años de actividad; consúltalo en la AEAT. Estos son los pasos de la sede: [Hacienda paso a paso](/hacienda-paso-a-paso).',
        ],
      },
      {
        heading: '3. Alta en la Seguridad Social (RETA)',
        paragraphs: [
          'Después, o con unos días de diferencia, te das de alta en el Régimen Especial de Trabajadores Autónomos desde la sede de la Seguridad Social, con la fecha de inicio de la actividad. Allí eliges tu base de cotización, que determina tu cuota mensual.',
          'Desde 2023 la cuota depende de los rendimientos netos que prevés tener. Mira cómo se calcula en la guía de [cuota de autónomos 2026 por tramos](/guias/cuota-autonomos-2026-por-tramos).',
        ],
      },
      {
        heading: '4. Pide la tarifa plana si puedes',
        paragraphs: [
          'Si eres nuevo autónomo, hay una cuota reducida durante el primer año que debes pedir al darte de alta. Requisitos y duración, en la guía de [tarifa plana de autónomos](/guias/tarifa-plana-autonomos-2026).',
        ],
      },
      {
        heading: '5. Primeras obligaciones',
        paragraphs: [
          'Guarda todas las facturas emitidas y recibidas y emite las tuyas con los datos exigidos. Cada trimestre presentarás el [modelo 303](/hacienda-paso-a-paso/modelo-303) del IVA y, si no estás exento, el [modelo 130](/hacienda-paso-a-paso/modelo-130) del IRPF, y cada año la Renta. Aquí están las fechas: [calendario fiscal de autónomos](/guias/fechas-modelos-trimestrales-autonomos-2026).',
          'Si facturas, también te afectará VERI*FACTU: lo explicamos en la guía de [qué es VERI*FACTU](/guias/verifactu-que-es). Y los [gastos deducibles](/guias/gastos-deducibles-autonomo) te ayudarán a pagar menos impuestos legalmente.',
        ],
      },
    ],
    tool: { to: '/calculadora-cuota-autonomos', label: 'Calculadora de cuota de autónomos' },
    related: [
      'tarifa-plana-autonomos-2026',
      'cuota-autonomos-2026-por-tramos',
      'gastos-deducibles-autonomo',
      'verifactu-que-es',
    ],
    checked: TRAMITES_CHECKED,
    sources: [
      {
        label: 'AEAT: modelo 036, alta censal',
        url: `${AEAT}/Sede/procedimientoini/G322.shtml`,
      },
      {
        label: 'Seguridad Social: sede electrónica',
        url: 'https://sede.seg-social.gob.es/',
      },
      {
        label: 'Seguridad Social: nuevo sistema de cotización de autónomos',
        url: 'https://www.seg-social.es/wps/portal/wss/internet/HerramientasWeb/9d2fd4f1-ab0f-42a6-8d10-2e74b378ee24?changeLanguage=es',
      },
    ],
  },
  {
    slug: 'tarifa-plana-autonomos-2026',
    updated: '2026-10-18',
    title: 'Tarifa plana de autónomos 2026: requisitos y cómo pedirla',
    description:
      'Qué es la tarifa plana de autónomos, quién puede pedirla, cuánto dura, cómo se amplía y dónde confirmar el importe vigente en 2026.',
    intro:
      'La tarifa plana es una cuota reducida para quien se da de alta como autónomo por primera vez (o tras un tiempo sin serlo). No se aplica sola: hay que pedirla al hacer el alta.',
    sections: [
      {
        heading: 'Qué es y cuánto cuesta',
        paragraphs: [
          'La Seguridad Social la regula como una cuota reducida de 80 € mensuales durante los primeros 12 meses de actividad. Esa cifra está fijada en la norma para las altas de 2023 a 2025; para años posteriores, el importe lo marca la ley de presupuestos.',
          'Por eso, antes de dar por buena una cifra para 2026, confírmala en la sede de la Seguridad Social o con el simulador de cuotas: algunas webs hablan de importes algo distintos por cotizaciones adicionales.',
        ],
      },
      {
        heading: 'Quién puede pedirla',
        paragraphs: [
          'Puedes pedirla si causas alta inicial en el RETA o si no has estado de alta como autónomo en los dos años anteriores a la fecha de efecto del alta (tres años si ya disfrutaste de la tarifa plana antes).',
          'No se aplica a los familiares de autónomos hasta el segundo grado que se incorporen al régimen. Contratar empleados no te hace perderla.',
        ],
      },
      {
        heading: 'Cuánto dura y cómo se amplía',
        paragraphs: [
          'Dura 12 meses. Después, si prevés que tus rendimientos netos anuales serán inferiores al salario mínimo interprofesional anual, puedes pedir otros 12 meses con la cuota reducida, a través del servicio Importass de la Seguridad Social y con una declaración sobre tus rendimientos.',
          'Si pides la ampliación y al final de ese año tus rendimientos fueron iguales o superiores al SMI, la Seguridad Social reclamará las cuotas no ingresadas por ese beneficio.',
          'Las personas con discapacidad igual o superior al 33 %, las víctimas de violencia de género y las víctimas de terrorismo pueden pedir los 80 € durante 24 meses.',
        ],
      },
      {
        heading: 'Cómo pedirla y cómo renunciar',
        paragraphs: [
          'Se solicita en el momento del alta en la Seguridad Social; la guía de [alta de autónomo paso a paso](/guias/alta-autonomo-paso-a-paso) te dice cuándo. Si más adelante quieres renunciar, se hace en Importass y tiene efecto desde el día uno del mes siguiente.',
          'Quien ya tenía la antigua tarifa plana a 31 de diciembre de 2022 la mantiene hasta agotar su periodo.',
        ],
      },
      {
        heading: 'Qué pasa después',
        paragraphs: [
          'Cuando acabe la reducción pasarás a pagar según tus rendimientos netos. Consulta la tabla en [cuota de autónomos 2026 por tramos](/guias/cuota-autonomos-2026-por-tramos). Algunas comunidades autónomas añaden ayudas propias: pregunta en la tuya.',
        ],
      },
    ],
    tool: { to: '/calculadora-cuota-autonomos', label: 'Calculadora de cuota de autónomos' },
    related: [
      'alta-autonomo-paso-a-paso',
      'cuota-autonomos-2026-por-tramos',
      'gastos-deducibles-autonomo',
    ],
    checked: TRAMITES_CHECKED,
    sources: [
      {
        label: 'Seguridad Social: nuevo sistema de cotización de autónomos',
        url: 'https://www.seg-social.es/wps/portal/wss/internet/HerramientasWeb/9d2fd4f1-ab0f-42a6-8d10-2e74b378ee24?changeLanguage=es',
      },
      {
        label: 'BOE: Real Decreto-ley 13/2022 (nuevo sistema de cotización)',
        url: `${BOE}BOE-A-2022-12482`,
      },
    ],
  },
  {
    slug: 'verifactu-que-es',
    updated: '2026-10-18',
    title: 'VERI*FACTU: qué es y cuándo te afecta como autónomo',
    description:
      'Qué es VERI*FACTU, a quién afecta, qué cambia en tus facturas y por qué sus fechas se han aplazado. Dónde comprobar el calendario vigente.',
    intro:
      'VERI*FACTU forma parte de las nuevas reglas de facturación: los programas con los que emites facturas deben cumplir unos requisitos técnicos para que no puedan alterarse sin dejar rastro. Aquí lo que debes saber y por qué no conviene fiarse de una sola fecha.',
    sections: [
      {
        heading: 'Qué es',
        paragraphs: [
          'El Reglamento de los sistemas informáticos de facturación (Real Decreto 1007/2023) exige que el software de facturación garantice la integridad, conservación y trazabilidad de los registros. VERI*FACTU es la modalidad en la que cada factura se envía a la Agencia Tributaria en el momento de emitirla.',
          'No es una factura electrónica obligatoria entre empresas: es una obligación sobre el programa que usas.',
        ],
      },
      {
        heading: 'A quién afecta',
        paragraphs: [
          'Afecta a empresarios y profesionales que emiten facturas con un programa informático, también a los autónomos. Hay excepciones, como quienes ya llevan los libros del IVA con el Suministro Inmediato de Información (SII). Confirma tu caso con la AEAT.',
          'Las empresas que producen o venden programas de facturación tienen sus propias obligaciones. Si facturas con un programa de terceros, pregunta a tu proveedor si ya cumple el reglamento.',
        ],
      },
      {
        heading: 'Fechas: por qué se han movido',
        paragraphs: [
          'Las fechas se han aplazado varias veces. La última norma publicada, el Real Decreto-ley 15/2025, de 2 de diciembre, fijó el 1 de enero de 2027 para los contribuyentes del Impuesto sobre Sociedades y el 1 de julio de 2027 para el resto, entre ellos los autónomos.',
          'El 5 de octubre de 2026, el Ministerio de Hacienda comunicó que prevé ampliar de nuevo el plazo de adaptación. Cuando consultamos las fuentes, la AEAT remitía a su nota informativa para los plazos nuevos, así que antes de decidir nada comprueba allí el calendario vigente.',
        ],
      },
      {
        heading: 'Qué puedes hacer ya',
        paragraphs: [
          'Averigua qué programa usas y si cumple o cumplirá el reglamento, conserva tus facturas ordenadas y evita herramientas improvisadas. La [guía del alta de autónomo](/guias/alta-autonomo-paso-a-paso) y los [gastos deducibles](/guias/gastos-deducibles-autonomo) te ayudan a organizar tu actividad desde el principio.',
          'Finanverso no emite facturas ni es un programa de facturación: sirve para controlar tus ingresos y gastos y preparar tus borradores del [modelo 303](/hacienda-paso-a-paso/modelo-303) y del [modelo 130](/hacienda-paso-a-paso/modelo-130).',
        ],
      },
    ],
    related: [
      'alta-autonomo-paso-a-paso',
      'iva-para-autonomos-modelo-303',
      'fechas-modelos-trimestrales-autonomos-2026',
    ],
    checked: TRAMITES_CHECKED,
    sources: [
      {
        label: 'AEAT: sistemas informáticos de facturación y VERI*FACTU',
        url: `${AEAT}/Sede/iva/sistemas-informaticos-facturacion-verifactu.html`,
      },
      {
        label: 'BOE: Real Decreto 1007/2023 (Reglamento de sistemas de facturación)',
        url: `${BOE}BOE-A-2023-24840`,
      },
      {
        label: 'BOE: Real Decreto-ley 15/2025, de 2 de diciembre',
        url: `${BOE}BOE-A-2025-24446`,
      },
    ],
  },
  {
    slug: 'ingreso-minimo-vital',
    updated: '2026-10-18',
    title: 'Ingreso Mínimo Vital: requisitos y cómo pedirlo',
    description:
      'Qué es el Ingreso Mínimo Vital, quién puede pedirlo, qué se mira de tus ingresos, cómo solicitarlo en la Seguridad Social y su efecto en la Renta.',
    intro:
      'El Ingreso Mínimo Vital (IMV) es una prestación de la Seguridad Social para hogares con pocos recursos. Se pide a través de la web de la Seguridad Social o en una oficina del INSS.',
    howTo: true,
    sections: [
      {
        heading: '1. Comprueba si puedes pedirlo',
        paragraphs: [
          'La Ley 19/2021 pide, en general, una edad mínima (con excepciones), residir legalmente en España de forma continuada y estar en situación de vulnerabilidad económica: que tus ingresos y patrimonio no superen los límites que fija la norma para tu tipo de hogar.',
          'El cálculo depende de cuántas personas viven en casa y de sus ingresos y patrimonio, por lo que el simulador oficial de la Seguridad Social es la forma más fiable de saber si te corresponde.',
        ],
      },
      {
        heading: '2. Reúne la documentación',
        paragraphs: [
          'Prepara tu DNI o NIE, los datos de las personas con las que convives, el padrón y la información sobre tus ingresos y tu patrimonio. Comprueba en la web de la Seguridad Social qué formas de identificación admite el trámite.',
        ],
      },
      {
        heading: '3. Solicítalo online o en una oficina',
        paragraphs: [
          'Puedes presentar la solicitud en la web específica del IMV de la Seguridad Social o en las oficinas del INSS, con cita previa. En general, la prestación se genera desde el primer día del mes siguiente a la presentación.',
          'Si te lo conceden, lo cobrarás cada mes mientras sigas cumpliendo los requisitos. Es compatible con trabajar, y la cuantía depende de tu tipo de hogar y se actualiza cada año: consulta siempre la cifra vigente en la web de la Seguridad Social.',
        ],
      },
      {
        heading: '4. Tenlo en cuenta en la Renta',
        paragraphs: [
          'Quien cobra el IMV, y las personas de su hogar, están obligados a presentar la declaración de la Renta, aunque sus ingresos sean bajos. Si es tu caso, sigue la guía [cómo hacer la Renta paso a paso](/guias/como-hacer-la-renta-2025-paso-a-paso).',
          'Además, el IMV da acceso directo a otras ayudas, como el [bono social eléctrico](/guias/bono-social-electrico). Para organizar el mes con ingresos justos, puedes usar el [método 50/30/20](/guias/metodo-50-30-20) o el presupuesto mensual de Finanverso.',
        ],
      },
    ],
    related: ['bono-social-electrico', 'bono-alquiler-joven', 'como-hacer-un-presupuesto-mensual'],
    checked: TRAMITES_CHECKED,
    sources: [
      { label: 'Seguridad Social: Ingreso Mínimo Vital', url: 'https://imv.seg-social.es/' },
      {
        label: 'BOE: Ley 19/2021, que establece el ingreso mínimo vital',
        url: `${BOE}BOE-A-2021-21007`,
      },
      {
        label: 'AEAT: quién está obligado a declarar en el IRPF',
        url: `${AEAT}/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c01-campana-declaracion-renta/quienes-estan-obligados-presentar-declaracion-irpf/delimitacion-obligacion-declarar-irpf.html`,
      },
    ],
  },
  {
    slug: 'bono-social-electrico',
    updated: '2026-10-18',
    title: 'Bono social eléctrico: quién puede pedirlo y cómo',
    description:
      'Quién tiene derecho al bono social eléctrico, qué descuento se aplica en 2026, qué condiciones debe cumplir tu contrato de luz y cómo solicitarlo.',
    intro:
      'El bono social eléctrico es un descuento en la factura de la luz para consumidores vulnerables. Se pide a la comercializadora de referencia y se aplica sobre el precio regulado (PVPC).',
    howTo: true,
    sections: [
      {
        heading: '1. Revisa las condiciones de tu contrato',
        paragraphs: [
          'El suministro debe estar en tu vivienda habitual, a tu nombre, con el precio voluntario para el pequeño consumidor (PVPC) y una potencia contratada igual o inferior a 10 kW. El PVPC se contrata con una comercializadora de referencia.',
        ],
      },
      {
        heading: '2. Comprueba si cumples algún requisito de vulnerabilidad',
        paragraphs: [
          'Eres consumidor vulnerable si cumples alguno de estos: ingresos anuales de la unidad familiar iguales o inferiores a 1,5 veces el IPREM de 14 pagas (que el Ministerio sitúa en 8.400 € al año), con un incremento por cada adulto o menor adicional; tener el título de familia numerosa; ser pensionista con la pensión mínima; o cobrar el Ingreso Mínimo Vital.',
          'El consumidor vulnerable severo tiene umbrales de renta más bajos. Tienes el detalle y las circunstancias especiales, como discapacidad o monoparentalidad, en la web oficial del Ministerio.',
        ],
      },
      {
        heading: '3. Sabe qué descuento te corresponde',
        paragraphs: [
          'Hasta el 31 de diciembre de 2026 el descuento sobre el PVPC es del 42,5 % para el consumidor vulnerable y del 57,5 % para el vulnerable severo. A partir de entonces, según el Ministerio, bajarían al 35 % y al 50 %, salvo que se prorroguen: comprueba la cifra vigente cuando lo pidas.',
          'El descuento se aplica solo hasta un límite de energía al año que depende de cuántas personas viven en la casa; lo que lo supera se factura al precio normal del PVPC.',
        ],
      },
      {
        heading: '4. Solicítalo a tu comercializadora de referencia',
        paragraphs: [
          'La solicitud se presenta a la comercializadora de referencia, que te pedirá el formulario y la documentación que acredite tu situación (libro de familia o título de familia numerosa, certificado de pensiones, etc.). Si no estás en el PVPC, primero tendrás que pasarte a él.',
          'Si ya cobras el IMV, tienes acceso directo con los criterios de renta del consumidor vulnerable. El bono hay que renovarlo cuando caduca, así que apunta la fecha.',
        ],
      },
      {
        heading: '5. Ayudas relacionadas',
        paragraphs: [
          'Si eres beneficiario del bono social eléctrico a 31 de diciembre del año anterior, tienes también derecho al bono social térmico sin pedirlo. Lo gestionan las comunidades autónomas. Más ayudas: [Ingreso Mínimo Vital](/guias/ingreso-minimo-vital) y [Bono Alquiler Joven](/guias/bono-alquiler-joven).',
        ],
      },
    ],
    related: ['ingreso-minimo-vital', 'bono-alquiler-joven', 'como-hacer-un-presupuesto-mensual'],
    checked: TRAMITES_CHECKED,
    sources: [
      {
        label: 'Ministerio para la Transición Ecológica: requisitos del bono social',
        url: 'https://www.miteco.gob.es/es/energia/pobreza-energetica/pe-001/requisitos.html',
      },
      {
        label: 'BOE: Real Decreto 897/2017, que regula el consumidor vulnerable',
        url: `${BOE}BOE-A-2017-11505`,
      },
      {
        label: 'BOE: Real Decreto-ley 7/2026, de 20 de marzo',
        url: 'https://www.boe.es/eli/es/rdl/2026/03/20/7',
      },
    ],
  },
  {
    slug: 'bono-alquiler-joven',
    updated: '2026-10-18',
    title: 'Bono Alquiler Joven: requisitos y cómo pedirlo',
    description:
      'Qué es el Bono Alquiler Joven, quién puede pedirlo, cuánto es y por qué hay que mirar la convocatoria de tu comunidad autónoma.',
    intro:
      'El Bono Alquiler Joven es una ayuda para que las personas jóvenes paguen su alquiler. Estatal en origen, la gestionan y convocan las comunidades autónomas, así que los plazos y las condiciones cambian según donde vivas.',
    howTo: true,
    sections: [
      {
        heading: '1. Entiende qué es',
        paragraphs: [
          'Se regula en el Real Decreto 42/2022: una ayuda de 250 € al mes durante hasta dos años, sin superar el alquiler que pagas, para jóvenes de 18 a 35 años. Cada comunidad autónoma abre su convocatoria y resuelve las solicitudes.',
          'Está vinculada al Plan Estatal de Vivienda. El Real Decreto 326/2026 aprobó el Plan Estatal de Vivienda 2026-2030, así que las ayudas nuevas dependerán de lo que convoque tu comunidad: confirma allí si hay plazo abierto.',
        ],
      },
      {
        heading: '2. Comprueba los requisitos',
        paragraphs: [
          'En el real decreto de 2022: edad entre 18 y 35 años al solicitarla, ingresos de la unidad de convivencia iguales o inferiores a tres veces el IPREM, contrato de alquiler de tu vivienda habitual y una renta mensual que no supere el límite fijado (que las comunidades pueden elevar).',
          'No es compatible con otras ayudas al alquiler, salvo excepciones. Cada convocatoria concreta los límites de renta y los documentos, así que léela entera antes de pedirla.',
        ],
      },
      {
        heading: '3. Busca la convocatoria de tu comunidad',
        paragraphs: [
          'Entra en la web de vivienda de tu comunidad autónoma (o de la consejería que gestione las ayudas) y busca la convocatoria vigente, el plazo y la forma de presentación. Muchas piden certificado digital o Cl@ve.',
        ],
      },
      {
        heading: '4. Reúne los documentos y presenta',
        paragraphs: [
          'Suele pedirse el contrato de alquiler, los justificantes de pago, tus ingresos y los de las personas con las que vives, el DNI o NIE y el padrón. Presenta la solicitud en el plazo y guarda el justificante.',
        ],
      },
      {
        heading: '5. Cuenta con la ayuda en tu presupuesto',
        paragraphs: [
          'El alquiler es el gasto más grande de muchas personas jóvenes. Calcula cuánto te queda con el [método 50/30/20](/guias/metodo-50-30-20) y apunta la ayuda como un ingreso en tu presupuesto solo cuando esté concedida. Si además tienes pocos ingresos, mira el [Ingreso Mínimo Vital](/guias/ingreso-minimo-vital) y el [bono social eléctrico](/guias/bono-social-electrico). Y recuerda que en la Renta hay deducciones autonómicas por alquiler: [deducciones en la Comunitat Valenciana](/guias/deducciones-renta-comunitat-valenciana).',
        ],
      },
    ],
    related: [
      'ingreso-minimo-vital',
      'bono-social-electrico',
      'deduccion-alquiler-vivienda-habitual-renta',
    ],
    checked: TRAMITES_CHECKED,
    sources: [
      {
        label: 'BOE: Real Decreto 42/2022 (Bono Alquiler Joven)',
        url: `${BOE}BOE-A-2022-802`,
      },
      {
        label: 'BOE: Real Decreto 326/2026 (Plan Estatal de Vivienda 2026-2030)',
        url: 'https://www.boe.es/eli/es/rd/2026/04/22/326',
      },
    ],
  },
];
